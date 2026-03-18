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
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flex: 1,
      overflow: "hidden"
    },
    backBtn: {
      background: "none",
      border: "none",
      color: "var(--text-3)",
      cursor: "pointer",
      padding: "2px 4px",
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      borderRadius: "var(--radius-sm)"
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
    },
    notesList: {
      flex: 1,
      overflow: "auto",
      display: "flex",
      flexDirection: "column"
    },
    noteRow: {
      padding: "8px 12px",
      borderBottom: "1px solid var(--border)",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    },
    noteRowName: {
      fontSize: "var(--text-sm)",
      fontWeight: 600,
      color: "var(--text-1)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    noteRowActive: {
      color: "var(--accent)"
    },
    noteRowPreview: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    noteRowMeta: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      opacity: 0.6
    }
  };
  const BackArrow = () => /* @__PURE__ */ React__namespace.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React__namespace.createElement("path", { d: "M19 12H5" }), /* @__PURE__ */ React__namespace.createElement("polyline", { points: "12 19 5 12 12 5" }));
  function NotesPanel() {
    const [state, setState] = React__namespace.useState(getState);
    const [noteEntries, setNoteEntries] = React__namespace.useState([]);
    const textareaRef = React__namespace.useRef(null);
    React__namespace.useEffect(() => {
      return subscribe(() => setState(getState()));
    }, []);
    React__namespace.useEffect(() => {
      if (state.view === "list") {
        getAllNotes().then(setNoteEntries).catch(() => {
        });
      }
    }, [state.view]);
    React__namespace.useEffect(() => {
      if (state.view === "editor" && state.sessionId && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [state.view, state.sessionId]);
    if (!state.sessionId && state.view === "editor") {
      return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.empty }, "No active session.", "\n", "Open a terminal session to start taking notes."));
    }
    if (state.view === "list") {
      return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.header }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.sessionLabel }, "All Notes")), noteEntries.length > 0 ? /* @__PURE__ */ React__namespace.createElement("div", { style: s.notesList }, noteEntries.map((entry) => /* @__PURE__ */ React__namespace.createElement(
        "div",
        {
          key: entry.sessionId,
          style: s.noteRow,
          onClick: () => viewNote(entry.sessionId, entry.sessionName),
          onMouseEnter: (e) => {
            e.currentTarget.style.background = "var(--bg-2)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "transparent";
          }
        },
        /* @__PURE__ */ React__namespace.createElement("span", { style: {
          ...s.noteRowName,
          ...entry.sessionId === state.sessionId ? s.noteRowActive : {}
        } }, entry.sessionName || entry.sessionId),
        /* @__PURE__ */ React__namespace.createElement("span", { style: s.noteRowPreview }, entry.preview),
        /* @__PURE__ */ React__namespace.createElement("span", { style: s.noteRowMeta }, entry.lines, " line", entry.lines !== 1 ? "s" : "")
      ))) : /* @__PURE__ */ React__namespace.createElement("div", { style: s.empty }, "No notes yet.", "\n", "Open a session and start typing."));
    }
    const lines = state.note ? state.note.split("\n").length : 0;
    const chars = state.note.length;
    return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.header }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.headerLeft }, /* @__PURE__ */ React__namespace.createElement(
      "button",
      {
        style: s.backBtn,
        onClick: viewList,
        title: "Back to notes list"
      },
      /* @__PURE__ */ React__namespace.createElement(BackArrow, null)
    ), /* @__PURE__ */ React__namespace.createElement("span", { style: s.sessionLabel }, state.sessionName || state.sessionId)), state.note.trim() && /* @__PURE__ */ React__namespace.createElement(
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
  let currentView = "editor";
  let listeners = /* @__PURE__ */ new Set();
  function getState() {
    return {
      sessionId: activeSessionId,
      sessionName: activeSessionName,
      note: currentNote,
      fontSize,
      showLineCount,
      view: currentView
    };
  }
  function viewList() {
    currentView = "list";
    notifyListeners();
  }
  async function viewNote(sessionId, sessionName) {
    await loadNoteForSession(sessionId, sessionName);
    currentView = "editor";
    notifyListeners();
  }
  async function getAllNotes() {
    if (!api) return [];
    const entries = [];
    try {
      const sessions = await api.sessions.list();
      for (const session of sessions) {
        const stored = await api.storage.get(storageKey(session.id));
        if (stored && stored.trim()) {
          const firstLine = stored.split("\n")[0].slice(0, 80);
          entries.push({
            sessionId: session.id,
            sessionName: session.name,
            preview: firstLine,
            lines: stored.split("\n").length
          });
        }
      }
    } catch {
    }
    return entries;
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
      updateBadge();
    }
    notifyListeners();
  }
  function updateBadge() {
    if (!api) return;
    const lines = currentNote ? currentNote.split("\n").length : 0;
    const hasContent = currentNote.trim().length > 0;
    if (typeof api.ui.updateSessionActionBadge === "function") {
      api.ui.updateSessionActionBadge("session-notes-action", {
        count: hasContent ? lines : 0
      });
    }
    const text = hasContent ? `Notes (${lines}L)` : "Notes";
    const tooltip = activeSessionName ? `Notes for "${activeSessionName}" — Click to open` : "Session Notes — Click to open";
    api.ui.updateStatusBarItem("notes.status", { text, tooltip });
  }
  function updateNote(text) {
    currentNote = text;
    scheduleSave();
    updateBadge();
    notifyListeners();
  }
  async function clearNote() {
    if (!api || !activeSessionId) return;
    currentNote = "";
    try {
      await api.storage.delete(storageKey(activeSessionId));
    } catch {
    }
    updateBadge();
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
        updateBadge();
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
              updateBadge();
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
    updateBadge();
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
  exports.getAllNotes = getAllNotes;
  exports.getState = getState;
  exports.subscribe = subscribe;
  exports.updateNote = updateNote;
  exports.viewList = viewList;
  exports.viewNote = viewNote;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, React);
if (typeof window !== "undefined") {
  window.__hermesPlugins = window.__hermesPlugins || {};
  window.__hermesPlugins["hermes-hq.session-notes"] = { activate: __hermes_plugin__.activate, deactivate: __hermes_plugin__.deactivate };
}
