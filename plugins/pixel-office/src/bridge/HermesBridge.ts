/**
 * HermesBridge — Maps Hermes IDE session lifecycle to pixel office characters.
 *
 * Data flow:
 *   Hermes session events → HermesBridge → OfficeState → Canvas renderer
 *
 * Two sources of activity data:
 * 1. Session phase (idle/busy/needs_input) — for all agents (coarse)
 * 2. JSONL transcript watching — for Claude Code sessions (fine-grained, per-tool)
 *
 * The bridge prefers JSONL data when available, falling back to phase.
 */

import type { OfficeState } from "../engine/officeState";
import type {
  HermesPluginAPI,
  SessionInfo,
  TranscriptEvent,
} from "../activate";

interface Disposable {
  dispose(): void;
}

/**
 * Maps tool names from JSONL transcripts to Pixel Office tool categories.
 * The OfficeState uses these to pick the right animation (typing vs reading).
 */
function mapToolName(toolName: string): string | null {
  switch (toolName) {
    case "Read":
    case "Grep":
    case "Glob":
    case "WebFetch":
    case "WebSearch":
      return "Read";
    case "Write":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return "Write";
    case "Bash":
    case "Terminal":
      return "Bash";
    case "Agent":
    case "Task":
      return "Task";
    default:
      return toolName || null;
  }
}

export class HermesBridge {
  private officeState: OfficeState;
  private api: HermesPluginAPI;
  private sessionToAgentId: Map<string, number> = new Map();
  private transcriptWatchers: Map<string, Disposable> = new Map();
  private idleTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private lastToolTimestamps: Map<number, number> = new Map();
  private jsonlTracked: Set<string> = new Set(); // sessions with active JSONL watchers
  private nextAgentId = 1;
  private disposables: Disposable[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(officeState: OfficeState, api: HermesPluginAPI) {
    this.officeState = officeState;
    this.api = api;
  }

  async start() {
    // Load existing sessions
    try {
      const sessions = await this.api.sessions.list();
      for (const session of sessions) {
        this.onSessionCreated(session);
      }
    } catch {
      // API might not be ready yet
    }

    // Listen for session lifecycle events
    this.disposables.push(
      this.api.events.on("session.created", (_data: unknown) => {
        // Refresh to get the new session's full info
        this.refreshSessions();
      })
    );

    this.disposables.push(
      this.api.events.on("session.closed", (data: unknown) => {
        const sessionId =
          typeof data === "string"
            ? data
            : (data as { sessionId?: string })?.sessionId;
        if (sessionId) {
          this.onSessionDestroyed(sessionId);
        }
      })
    );

    // Listen for phase changes
    this.disposables.push(
      this.api.events.on("session.phase_changed", (data: unknown) => {
        const event = data as {
          sessionId: string;
          previousPhase?: string;
          newPhase: string;
        };
        if (event?.sessionId) {
          this.onPhaseChanged(event.sessionId, event.newPhase);
        }
      })
    );

    // Listen for focus changes
    this.disposables.push(
      this.api.events.on("session.focus_changed", (data: unknown) => {
        const event = data as { sessionId: string | null };
        if (event) {
          this.onFocusChanged(event.sessionId);
        }
      })
    );

    // Periodic session refresh (catches phase changes if events are unreliable)
    this.refreshInterval = setInterval(() => {
      if (!this.destroyed) this.refreshSessions();
    }, 1000);
  }

  private async refreshSessions() {
    try {
      const sessions = await this.api.sessions.list();
      const currentIds = new Set(this.sessionToAgentId.keys());
      const newIds = new Set(sessions.map((s) => s.id));

      // Add new sessions
      for (const session of sessions) {
        if (!currentIds.has(session.id)) {
          this.onSessionCreated(session);
        } else {
          // Always update phase and name for existing sessions
          const agentId = this.sessionToAgentId.get(session.id);
          if (agentId !== undefined) {
            this.onPhaseChanged(session.id, session.phase);
            // Update name if it changed (e.g. user renamed the session)
            const ch = this.officeState.characters.get(agentId);
            if (ch && ch.folderName !== session.name) {
              ch.folderName = session.name;
            }
          }
        }
      }

      // Remove sessions that no longer exist
      for (const sessionId of currentIds) {
        if (!newIds.has(sessionId)) {
          this.onSessionDestroyed(sessionId);
        }
      }
    } catch {
      // API error — ignore
    }
  }

  private onSessionCreated(session: SessionInfo) {
    if (this.sessionToAgentId.has(session.id)) return;

    const agentId = this.nextAgentId++;
    this.sessionToAgentId.set(session.id, agentId);

    // Add character to the office
    this.officeState.addAgent(agentId, undefined, undefined, undefined, false, session.name);

    // Start JSONL watching for Claude Code sessions
    if (
      this.api.agents?.watchTranscript &&
      (session.detected_agent === "claude" ||
        session.ai_provider === "claude")
    ) {
      this.startTranscriptWatcher(session.id, agentId);
    }
  }

  private onSessionDestroyed(sessionId: string) {
    const agentId = this.sessionToAgentId.get(sessionId);
    if (agentId === undefined) return;

    // Clean up
    this.clearIdleTimer(agentId);
    this.lastToolTimestamps.delete(agentId);
    this.jsonlTracked.delete(sessionId);

    // Stop transcript watcher
    const watcher = this.transcriptWatchers.get(sessionId);
    if (watcher) {
      watcher.dispose();
      this.transcriptWatchers.delete(sessionId);
    }

    // Remove character (triggers despawn animation in OfficeState)
    this.officeState.removeAgent(agentId);
    this.sessionToAgentId.delete(sessionId);
  }

  private onPhaseChanged(sessionId: string, newPhase: string) {
    const agentId = this.sessionToAgentId.get(sessionId);
    if (agentId === undefined) return;

    switch (newPhase) {
      case "busy":
      case "launching_agent":
        this.officeState.setAgentActive(agentId, true);
        this.officeState.setAgentTool(agentId, "Write");
        break;
      case "idle":
      case "shell_ready":
        this.officeState.setAgentActive(agentId, false);
        this.officeState.setAgentTool(agentId, null);
        break;
      case "needs_input":
        this.officeState.setAgentActive(agentId, false);
        this.officeState.setAgentTool(agentId, null);
        this.officeState.showWaitingBubble(agentId);
        break;
    }
  }

  private onFocusChanged(sessionId: string | null) {
    if (sessionId) {
      const agentId = this.sessionToAgentId.get(sessionId);
      if (agentId !== undefined) {
        this.officeState.selectedAgentId = agentId;
        this.officeState.cameraFollowId = agentId;
      }
    } else {
      this.officeState.selectedAgentId = null;
      this.officeState.cameraFollowId = null;
    }
  }

  private async startTranscriptWatcher(sessionId: string, agentId: number) {
    if (!this.api.agents?.watchTranscript) return;

    try {
      const disposable = await this.api.agents.watchTranscript(
        sessionId,
        (event: TranscriptEvent) => {
          this.onTranscriptEvent(sessionId, agentId, event);
        }
      );
      this.transcriptWatchers.set(sessionId, disposable);
      this.jsonlTracked.add(sessionId);
    } catch {
      // JSONL watching not available — fall back to phase-based tracking
    }
  }

  private onTranscriptEvent(
    _sessionId: string,
    agentId: number,
    event: TranscriptEvent
  ) {
    this.lastToolTimestamps.set(agentId, Date.now());
    this.clearIdleTimer(agentId);

    switch (event.type) {
      case "tool_start": {
        const toolName = mapToolName(event.tool_name || "");
        this.officeState.setAgentTool(agentId, toolName);
        this.officeState.setAgentActive(agentId, true);
        this.officeState.clearPermissionBubble(agentId);
        // Schedule idle fallback
        this.scheduleIdleFallback(agentId);
        break;
      }
      case "tool_end": {
        // Tool completed — schedule idle fallback if no new tool starts
        this.scheduleIdleFallback(agentId);
        break;
      }
      case "text":
      case "thinking": {
        // AI is generating text — show typing
        this.officeState.setAgentTool(agentId, "Write");
        this.officeState.setAgentActive(agentId, true);
        this.scheduleIdleFallback(agentId);
        break;
      }
      case "turn_end": {
        // Definitive turn end — agent is idle/waiting
        this.officeState.setAgentTool(agentId, null);
        this.officeState.setAgentActive(agentId, false);
        this.officeState.showWaitingBubble(agentId);
        break;
      }
    }
  }

  private scheduleIdleFallback(agentId: number) {
    this.clearIdleTimer(agentId);
    this.idleTimers.set(
      agentId,
      setTimeout(() => {
        this.idleTimers.delete(agentId);
        this.officeState.setAgentTool(agentId, null);
        this.officeState.setAgentActive(agentId, false);
      }, 5000)
    );
  }

  private clearIdleTimer(agentId: number) {
    const timer = this.idleTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(agentId);
    }
  }

  /** Focus a Hermes session when a character is clicked */
  async focusSession(agentId: number): Promise<void> {
    for (const [sessionId, aId] of this.sessionToAgentId) {
      if (aId === agentId) {
        if (this.api.sessions.focus) {
          await this.api.sessions.focus(sessionId);
        }
        break;
      }
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Clean up all timers
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();

    // Clean up transcript watchers
    for (const watcher of this.transcriptWatchers.values()) {
      watcher.dispose();
    }
    this.transcriptWatchers.clear();

    // Clean up event listeners
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];

    this.sessionToAgentId.clear();
    this.jsonlTracked.clear();
    this.lastToolTimestamps.clear();
  }
}
