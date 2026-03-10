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
  const RING_SIZE = 140;
  const RING_STROKE = 6;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const s = {
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-lg)",
      color: "var(--text-0)",
      overflow: "auto",
      padding: "20px 12px",
      gap: "16px"
    },
    ringContainer: {
      position: "relative",
      width: RING_SIZE,
      height: RING_SIZE
    },
    svg: {
      transform: "rotate(-90deg)"
    },
    ringBg: {
      fill: "none",
      stroke: "var(--bg-3)",
      strokeWidth: RING_STROKE
    },
    ringProgress: {
      fill: "none",
      strokeWidth: RING_STROKE,
      strokeLinecap: "round",
      transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease"
    },
    timeOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    },
    time: {
      fontSize: "28px",
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      color: "var(--text-0)",
      lineHeight: 1
    },
    phase: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      textTransform: "uppercase",
      letterSpacing: "1px",
      fontWeight: 600,
      marginTop: "4px"
    },
    controls: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      justifyContent: "center"
    },
    btn: {
      background: "var(--accent)",
      border: "none",
      borderRadius: "var(--radius)",
      color: "#fff",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-md)",
      fontWeight: 600,
      padding: "8px 18px",
      cursor: "pointer",
      minWidth: "70px"
    },
    btnSecondary: {
      background: "var(--bg-3)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      color: "var(--text-2)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-md)",
      fontWeight: 500,
      padding: "8px 14px",
      cursor: "pointer"
    },
    stats: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      marginTop: "8px"
    },
    statNumber: {
      fontSize: "24px",
      fontWeight: 700,
      color: "var(--accent)"
    },
    statLabel: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    },
    hint: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      textAlign: "center",
      lineHeight: 1.5,
      maxWidth: "200px"
    }
  };
  function formatTime$1(seconds) {
    const m = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  function phaseLabel(phase) {
    switch (phase) {
      case "work":
        return "Focus";
      case "break":
        return "Break";
      case "longBreak":
        return "Long Break";
      case "idle":
        return "Ready";
    }
  }
  function phaseColor(phase) {
    switch (phase) {
      case "work":
        return "var(--accent)";
      case "break":
        return "var(--green, #4ade80)";
      case "longBreak":
        return "var(--blue, #60a5fa)";
      case "idle":
        return "var(--text-3)";
    }
  }
  function PomodoroPanel() {
    const [state, setState] = React__namespace.useState(getState);
    React__namespace.useEffect(() => {
      return subscribe(() => setState(getState()));
    }, []);
    const progress = state.totalSeconds > 0 ? state.secondsRemaining / state.totalSeconds : 1;
    const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
    const color = phaseColor(state.phase);
    return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.ringContainer }, /* @__PURE__ */ React__namespace.createElement(
      "svg",
      {
        width: RING_SIZE,
        height: RING_SIZE,
        style: s.svg
      },
      /* @__PURE__ */ React__namespace.createElement(
        "circle",
        {
          cx: RING_SIZE / 2,
          cy: RING_SIZE / 2,
          r: RING_RADIUS,
          style: s.ringBg
        }
      ),
      /* @__PURE__ */ React__namespace.createElement(
        "circle",
        {
          cx: RING_SIZE / 2,
          cy: RING_SIZE / 2,
          r: RING_RADIUS,
          style: {
            ...s.ringProgress,
            stroke: color,
            strokeDasharray: RING_CIRCUMFERENCE,
            strokeDashoffset: dashOffset
          }
        }
      )
    ), /* @__PURE__ */ React__namespace.createElement("div", { style: s.timeOverlay }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.time }, formatTime$1(state.secondsRemaining)), /* @__PURE__ */ React__namespace.createElement("span", { style: { ...s.phase, color } }, phaseLabel(state.phase)))), /* @__PURE__ */ React__namespace.createElement("div", { style: s.controls }, state.state === "running" ? /* @__PURE__ */ React__namespace.createElement("button", { style: s.btn, onClick: pauseTimer }, "Pause") : /* @__PURE__ */ React__namespace.createElement("button", { style: s.btn, onClick: startTimer }, state.state === "paused" ? "Resume" : "Start"), state.state !== "idle" && /* @__PURE__ */ React__namespace.createElement(React__namespace.Fragment, null, /* @__PURE__ */ React__namespace.createElement("button", { style: s.btnSecondary, onClick: skipPhase }, "Skip"), /* @__PURE__ */ React__namespace.createElement("button", { style: s.btnSecondary, onClick: resetTimer }, "Reset"))), /* @__PURE__ */ React__namespace.createElement("div", { style: s.stats }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.statNumber }, state.completedPomodoros), /* @__PURE__ */ React__namespace.createElement("span", { style: s.statLabel }, "session", state.completedPomodoros !== 1 ? "s" : "", " completed")), state.state === "idle" && /* @__PURE__ */ React__namespace.createElement("div", { style: s.hint }, "Press Start to begin a ", state.phase === "break" || state.phase === "longBreak" ? state.phase === "longBreak" ? "long break" : "break" : "focus session"));
  }
  let api = null;
  let intervalId = null;
  let pomodoroState = {
    phase: "idle",
    state: "idle",
    secondsRemaining: 25 * 60,
    totalSeconds: 25 * 60,
    completedPomodoros: 0,
    sessionsUntilLongBreak: 4
  };
  let listeners = /* @__PURE__ */ new Set();
  let workDuration = 25;
  let breakDuration = 5;
  let longBreakDuration = 15;
  let autoStartBreak = true;
  let autoStartWork = false;
  let showNotifications = true;
  function getState() {
    return { ...pomodoroState };
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notifyListeners() {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
      }
    }
  }
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s2 = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}`;
  }
  function updateStatusBar() {
    if (!api) return;
    const { state, phase, secondsRemaining } = pomodoroState;
    let text;
    let tooltip;
    if (state === "idle") {
      text = formatTime(workDuration * 60);
      tooltip = "Pomodoro Timer — Click to open";
    } else {
      const phaseLabel2 = phase === "work" ? "Focus" : phase === "longBreak" ? "Long Break" : "Break";
      const stateLabel = state === "paused" ? " (paused)" : "";
      text = formatTime(secondsRemaining);
      tooltip = `${phaseLabel2}${stateLabel} — ${pomodoroState.completedPomodoros} completed`;
    }
    api.ui.updateStatusBarItem("pomodoro.status", { text, tooltip });
  }
  function tick() {
    if (pomodoroState.state !== "running") return;
    pomodoroState.secondsRemaining--;
    if (pomodoroState.secondsRemaining <= 0) {
      onTimerComplete();
      return;
    }
    updateStatusBar();
    notifyListeners();
  }
  async function onTimerComplete() {
    if (!api) return;
    stopInterval();
    if (pomodoroState.phase === "work") {
      pomodoroState.completedPomodoros++;
      pomodoroState.sessionsUntilLongBreak--;
      try {
        await api.storage.set("completedCount", String(pomodoroState.completedPomodoros));
      } catch {
      }
      const msg = `Focus session complete! (${pomodoroState.completedPomodoros} total)`;
      api.ui.showToast(msg, { type: "success", duration: 4e3 });
      if (showNotifications) {
        try {
          await api.notifications.send({ title: "Pomodoro Complete", body: "Time for a break!" });
        } catch {
        }
      }
      if (pomodoroState.sessionsUntilLongBreak <= 0) {
        pomodoroState.sessionsUntilLongBreak = 4;
        setPhase("longBreak");
      } else {
        setPhase("break");
      }
      if (autoStartBreak) {
        startTimer();
      }
    } else {
      const breakType = pomodoroState.phase === "longBreak" ? "Long break" : "Break";
      api.ui.showToast(`${breakType} is over! Time to focus.`, { type: "info", duration: 4e3 });
      if (showNotifications) {
        try {
          await api.notifications.send({ title: "Break Over", body: "Ready to focus?" });
        } catch {
        }
      }
      setPhase("work");
      if (autoStartWork) {
        startTimer();
      }
    }
    updateStatusBar();
    notifyListeners();
  }
  function setPhase(phase) {
    pomodoroState.phase = phase;
    let duration;
    switch (phase) {
      case "work":
        duration = workDuration;
        break;
      case "break":
        duration = breakDuration;
        break;
      case "longBreak":
        duration = longBreakDuration;
        break;
      default:
        duration = workDuration;
    }
    pomodoroState.totalSeconds = duration * 60;
    pomodoroState.secondsRemaining = duration * 60;
    pomodoroState.state = "idle";
  }
  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  function startTimer() {
    if (pomodoroState.phase === "idle") {
      setPhase("work");
    }
    pomodoroState.state = "running";
    stopInterval();
    intervalId = setInterval(tick, 1e3);
    updateStatusBar();
    notifyListeners();
  }
  function pauseTimer() {
    if (pomodoroState.state !== "running") return;
    pomodoroState.state = "paused";
    stopInterval();
    updateStatusBar();
    notifyListeners();
  }
  function resetTimer() {
    stopInterval();
    setPhase("work");
    pomodoroState.state = "idle";
    updateStatusBar();
    notifyListeners();
  }
  function skipPhase() {
    stopInterval();
    onTimerComplete();
  }
  async function loadSettings() {
    if (!api) return;
    try {
      const all = await api.settings.getAll();
      workDuration = parseInt(String(all.workDuration), 10) || 25;
      breakDuration = parseInt(String(all.breakDuration), 10) || 5;
      longBreakDuration = parseInt(String(all.longBreakDuration), 10) || 15;
      autoStartBreak = all.autoStartBreak !== false;
      autoStartWork = all.autoStartWork === true;
      showNotifications = all.showNotifications !== false;
    } catch {
    }
  }
  async function activate(pluginApi) {
    api = pluginApi;
    try {
      const stored = await api.storage.get("completedCount");
      if (stored) pomodoroState.completedPomodoros = parseInt(stored, 10) || 0;
    } catch {
    }
    await loadSettings();
    pomodoroState.totalSeconds = workDuration * 60;
    pomodoroState.secondsRemaining = workDuration * 60;
    api.subscriptions.push(
      api.settings.onDidChange("workDuration", (v) => {
        workDuration = parseInt(String(v), 10) || 25;
        if (pomodoroState.state === "idle" && pomodoroState.phase !== "break" && pomodoroState.phase !== "longBreak") {
          pomodoroState.totalSeconds = workDuration * 60;
          pomodoroState.secondsRemaining = workDuration * 60;
          updateStatusBar();
          notifyListeners();
        }
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("breakDuration", (v) => {
        breakDuration = parseInt(String(v), 10) || 5;
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("longBreakDuration", (v) => {
        longBreakDuration = parseInt(String(v), 10) || 15;
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("autoStartBreak", (v) => {
        autoStartBreak = v === true;
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("autoStartWork", (v) => {
        autoStartWork = v === true;
      })
    );
    api.subscriptions.push(
      api.settings.onDidChange("showNotifications", (v) => {
        showNotifications = v !== false;
      })
    );
    api.ui.registerPanel("pomodoro-panel", PomodoroPanel);
    api.subscriptions.push(
      api.commands.register("pomodoro.start", () => startTimer())
    );
    api.subscriptions.push(
      api.commands.register("pomodoro.pause", () => pauseTimer())
    );
    api.subscriptions.push(
      api.commands.register("pomodoro.reset", () => resetTimer())
    );
    api.subscriptions.push(
      api.commands.register("pomodoro.openPanel", () => {
        api.ui.showPanel("pomodoro-panel");
      })
    );
    updateStatusBar();
  }
  function deactivate() {
    stopInterval();
    api = null;
    listeners.clear();
  }
  exports.activate = activate;
  exports.deactivate = deactivate;
  exports.getState = getState;
  exports.pauseTimer = pauseTimer;
  exports.resetTimer = resetTimer;
  exports.skipPhase = skipPhase;
  exports.startTimer = startTimer;
  exports.subscribe = subscribe;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, React);
if (typeof window !== "undefined") {
  window.__hermesPlugins = window.__hermesPlugins || {};
  window.__hermesPlugins["hermes-hq.pomodoro-timer"] = { activate: __hermes_plugin__.activate, deactivate: __hermes_plugin__.deactivate };
}
