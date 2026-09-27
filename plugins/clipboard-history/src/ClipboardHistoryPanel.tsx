import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAPI } from "./activate";

interface HistoryEntry {
  id: string;
  text: string;
  pinned: boolean;
  timestamp: number;
}

const HISTORY_KEY = "history";
const LIMIT_KEY = "historyLimit";
const DEFAULT_LIMIT = 50;
const POLL_INTERVAL_MS = 1500;

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  color: "var(--text-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 8px",
  fontSize: "var(--text-sm)",
  fontFamily: "var(--font-mono)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  textTransform: "uppercase",
  color: "var(--text-2)",
  letterSpacing: "0.05em",
};

const buttonStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  borderRadius: "var(--radius-sm)",
  padding: "3px 8px",
  cursor: "pointer",
  fontSize: "var(--text-xs)",
};

function trimToLimit(entries: HistoryEntry[], limit: number): HistoryEntry[] {
  const pinned = entries.filter((e) => e.pinned);
  const unpinned = entries.filter((e) => !e.pinned).slice(0, limit);
  return [...pinned, ...unpinned].sort((a, b) => b.timestamp - a.timestamp);
}

export function ClipboardHistoryPanel() {
  const api = getAPI();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [query, setQuery] = useState("");
  const lastSeenRef = useRef<string>("");
  const historyRef = useRef<HistoryEntry[]>([]);
  const limitRef = useRef(DEFAULT_LIMIT);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    (async () => {
      const [rawHistory, rawLimit] = await Promise.all([
        api.storage.get(HISTORY_KEY),
        api.storage.get(LIMIT_KEY),
      ]);
      if (rawHistory) {
        try {
          const parsed: HistoryEntry[] = JSON.parse(rawHistory);
          setHistory(parsed);
          if (parsed.length > 0) lastSeenRef.current = parsed[0].text;
        } catch {
          // Corrupt/old-format history — start fresh rather than crash the panel.
        }
      }
      if (rawLimit) {
        const n = Number(rawLimit);
        if (Number.isFinite(n) && n > 0) setLimit(n);
      }
    })();

    const interval = setInterval(async () => {
      let text: string;
      try {
        text = await api.clipboard.readText();
      } catch {
        return;
      }
      if (!text || !text.trim() || text === lastSeenRef.current) return;
      lastSeenRef.current = text;

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        text,
        pinned: false,
        timestamp: Date.now(),
      };
      const next = trimToLimit([entry, ...historyRef.current], limitRef.current);
      historyRef.current = next;
      setHistory(next);
      await api.storage.set(HISTORY_KEY, JSON.stringify(next));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: HistoryEntry[]) {
    setHistory(next);
    await api.storage.set(HISTORY_KEY, JSON.stringify(next));
  }

  async function copyBack(entry: HistoryEntry) {
    lastSeenRef.current = entry.text;
    await api.clipboard.writeText(entry.text);
    api.ui.showToast("Copied — paste it into the terminal yourself", { type: "success" });
  }

  async function togglePin(id: string) {
    const next = history.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e));
    await persist(trimToLimit(next, limit));
  }

  async function removeEntry(id: string) {
    await persist(history.filter((e) => e.id !== id));
  }

  async function clearUnpinned() {
    await persist(history.filter((e) => e.pinned));
  }

  async function updateLimit(value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setLimit(n);
    limitRef.current = n;
    await api.storage.set(LIMIT_KEY, String(n));
    await persist(trimToLimit(history, n));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter((e) => e.text.toLowerCase().includes(q));
  }, [history, query]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        gap: "12px",
        minWidth: "280px",
        maxWidth: "480px",
        overflowY: "auto",
        background: "var(--bg-1)",
        color: "var(--text-1)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
      }}
    >
      <h3 style={{ ...labelStyle, margin: 0 }}>CLIPBOARD HISTORY</h3>

      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search history"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={labelStyle}>Limit</span>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => updateLimit(e.target.value)}
            style={{ ...inputStyle, width: "60px" }}
          />
        </label>
        <button onClick={clearUnpinned} style={buttonStyle}>
          Clear unpinned
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-2)", fontSize: "var(--text-xs)" }}>
            Nothing captured yet — copy something to get started.
          </p>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: entry.pinned ? "var(--bg-2)" : "transparent",
            }}
          >
            <pre
              onClick={() => copyBack(entry)}
              title="Click to copy"
              style={{
                margin: 0,
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "80px",
                overflowY: "auto",
              }}
            >
              {entry.text}
            </pre>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button onClick={() => copyBack(entry)} style={buttonStyle}>
                Copy
              </button>
              <button onClick={() => togglePin(entry.id)} style={buttonStyle}>
                {entry.pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => removeEntry(entry.id)} style={{ ...buttonStyle, color: "var(--red, #f85149)" }}>
                Delete
              </button>
              <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-2)" }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
