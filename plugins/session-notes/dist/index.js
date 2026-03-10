var __hermes_plugin__ = function(exports, React2) {
  "use strict";
  function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
    if (e) {
      for (const k in e) {
        if (k !== "default") {
          const d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: () => e[k]
          });
        }
      }
    }
    n.default = e;
    return Object.freeze(n);
  }
  const React__namespace = /* @__PURE__ */ _interopNamespaceDefault(React2);
  const s = {
    root: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      fontFamily: "var(--font-mono)",
      color: "var(--text-0)",
      overflow: "hidden"
    },
    header: {
      padding: "8px 12px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
      gap: "8px"
    },
    sessionLabel: {
      fontSize: "var(--text-sm)",
      color: "var(--text-2)",
      fontWeight: 600,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1
    },
    clearBtn: {
      background: "none",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      color: "var(--text-3)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      padding: "2px 8px",
      cursor: "pointer",
      flexShrink: 0,
      whiteSpace: "nowrap"
    },
    textarea: {
      flex: 1,
      background: "transparent",
      border: "none",
      color: "var(--text-0)",
      fontFamily: "var(--font-mono)",
      padding: "12px",
      outline: "none",
      resize: "none",
      lineHeight: 1.6,
      width: "100%",
      boxSizing: "border-box"
    },
    footer: {
      padding: "4px 12px",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0
    },
    footerText: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)"
    },
    empty: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      color: "var(--text-3)",
      fontSize: "var(--text-md)",
      padding: "20px",
      textAlign: "center",
      lineHeight: 1.6
    }
  };
  function NotesPanel() {
    const [state, setState] = React__namespace.useState(getState);
    const textareaRef = React__namespace.useRef(null);
    React__namespace.useEffect(() => {
      return subscribe(() => setState(getState()));
    }, []);
    React__namespace.useEffect(() => {
      if (state.sessionId && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [state.sessionId]);
    if (!state.sessionId) {
      return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.empty }, "No active session.", "\n", "Open a terminal session to start taking notes."));
    }
    const lines = state.note ? state.note.split("\n").length : 0;
    const chars = state.note.length;
    return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.header }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.sessionLabel }, state.sessionName || state.sessionId), state.note.trim() && /* @__PURE__ */ React__namespace.createElement(
      "button",
      {
        style: s.clearBtn,
        onClick: clearNote,
        title: "Clear this note"
      },
      "Clear"
    )), /* @__PURE__ */ React__namespace.createElement(
      "textarea",
      {
        ref: textareaRef,
        style: {
          ...s.textarea,
          fontSize: `${state.fontSize}px`
        },
        value: state.note,
        onChange: (e) => updateNote(e.target.value),
        placeholder: "Type your notes here...",
        spellCheck: false
      }
    ), state.showLineCount && /* @__PURE__ */ React__namespace.createElement("div", { style: s.footer }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.footerText }, lines, " line", lines !== 1 ? "s" : "", ", ", chars, " char", chars !== 1 ? "s" : ""), /* @__PURE__ */ React__namespace.createElement("span", { style: s.footerText }, "auto-saved")));
  }
  let api = null;
  let activeSessionId = null;
  let activeSessionName = "";
  let currentNote = "";
  let saveTimer = null;
  let autoSaveDelay = 500;
  let fontSize = 14;
  let showLineCount = true;
  let listeners = /* @__PURE__ */ new Set();
  function getState() {
    return {
      sessionId: activeSessionId,
      sessionName: activeSessionName,
      note: currentNote,
      fontSize,
      showLineCount
    };
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notifyListeners() {
    for (const l of listeners) {
      try {
        l();
      } catch {
      }
    }
  }
  function storageKey(sessionId) {
    return `note:${sessionId}`;
  }
  async function saveNote() {
    if (!api || !activeSessionId) return;
    try {
      if (currentNote.trim()) {
        await api.storage.set(storageKey(activeSessionId), currentNote);
      } else {
        await api.storage.delete(storageKey(activeSessionId));
      }
    } catch {
    }
  }
  function scheduleSave() {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveNote();
      saveTimer = null;
    }, autoSaveDelay);
  }
  async function loadNoteForSession(sessionId, sessionName) {
    if (activeSessionId && activeSessionId !== sessionId) {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await saveNote();
    }
    activeSessionId = sessionId;
    activeSessionName = sessionName;
    currentNote = "";
    if (api) {
      try {
        const stored = await api.storage.get(storageKey(sessionId));
        currentNote = stored ?? "";
      } catch {
      }
      updateStatusBar();
    }
    notifyListeners();
  }
  function updateStatusBar() {
    if (!api) return;
    const lines = currentNote ? currentNote.split("\n").length : 0;
    const hasContent = currentNote.trim().length > 0;
    const text = hasContent ? `Notes (${lines}L)` : "Notes";
    const tooltip = activeSessionName ? `Notes for "${activeSessionName}" — Click to open` : "Session Notes — Click to open";
    api.ui.updateStatusBarItem("notes.status", { text, tooltip });
  }
  function updateNote(text) {
    currentNote = text;
    scheduleSave();
    updateStatusBar();
    notifyListeners();
  }
  async function clearNote() {
    if (!api || !activeSessionId) return;
    currentNote = "";
    try {
      await api.storage.delete(storageKey(activeSessionId));
    } catch {
    }
    updateStatusBar();
    notifyListeners();
    api.ui.showToast("Note cleared", { type: "info", duration: 1500 });
  }
  async function activate(pluginApi) {
    api = pluginApi;
    try {
      const all = await api.settings.getAll();
      autoSaveDelay = parseInt(String(all.autoSaveDelay), 10) || 500;
      fontSize = parseInt(String(all.fontSize), 10) || 14;
      showLineCount = all.showLineCount !== false;
    } catch {
    }
    api.subscriptions.push(
      api.settings.onDidChange("autoSaveDelay", (v) => {
        autoSaveDelay = parseInt(String(v), 10) || 500;
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("fontSize", (v) => {
        fontSize = parseInt(String(v), 10) || 14;
        notifyListeners();
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("showLineCount", (v) => {
        showLineCount = v !== false;
        updateStatusBar();
        notifyListeners();
      })
    );
    try {
      const active = await api.sessions.getActive();
      if (active) {
        await loadNoteForSession(active.id, active.name);
      }
    } catch {
    }
    api.subscriptions.push(
      api.events.on("session.created", async (sessionId) => {
        try {
          const sessions = await api.sessions.list();
          const session = sessions.find((s2) => s2.id === sessionId);
          if (session) {
            await loadNoteForSession(session.id, session.name);
          }
        } catch {
        }
      })
    );
    api.subscriptions.push(
      api.events.on("session.closed", async (sessionId) => {
        if (activeSessionId === sessionId) {
          try {
            const active = await api.sessions.getActive();
            if (active) {
              await loadNoteForSession(active.id, active.name);
            } else {
              activeSessionId = null;
              activeSessionName = "";
              currentNote = "";
              updateStatusBar();
              notifyListeners();
            }
          } catch {
          }
        }
      })
    );
    api.ui.registerPanel("session-notes-panel", NotesPanel);
    api.subscriptions.push(
      api.commands.register("notes.open", () => {
        api.ui.showPanel("session-notes-panel");
      })
    );
    api.subscriptions.push(
      api.commands.register("notes.clear", () => clearNote())
    );
    updateStatusBar();
  }
  function deactivate() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveNote();
    api = null;
    listeners.clear();
  }
  exports.activate = activate;
  exports.clearNote = clearNote;
  exports.deactivate = deactivate;
  exports.getState = getState;
  exports.subscribe = subscribe;
  exports.updateNote = updateNote;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, React);
if (typeof window !== "undefined") {
  window.__hermesPlugins = window.__hermesPlugins || {};
  window.__hermesPlugins["hermes-hq.session-notes"] = { activate: __hermes_plugin__.activate, deactivate: __hermes_plugin__.deactivate };
}
