import * as React from "react";
import {
	getState,
	subscribe,
	startTimer,
	pauseTimer,
	resetTimer,
	skipPhase,
	type PomodoroState,
} from "./activate";

const RING_SIZE = 140;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const s = {
	root: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		height: "100%",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		color: "var(--text-0)",
		overflow: "auto" as const,
		padding: "20px 12px",
		gap: "16px",
	},
	ringContainer: {
		position: "relative" as const,
		width: RING_SIZE,
		height: RING_SIZE,
	},
	svg: {
		transform: "rotate(-90deg)",
	},
	ringBg: {
		fill: "none",
		stroke: "var(--bg-3)",
		strokeWidth: RING_STROKE,
	},
	ringProgress: {
		fill: "none",
		strokeWidth: RING_STROKE,
		strokeLinecap: "round" as const,
		transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease",
	},
	timeOverlay: {
		position: "absolute" as const,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		justifyContent: "center",
	},
	time: {
		fontSize: "28px",
		fontWeight: 700,
		fontFamily: "var(--font-mono)",
		color: "var(--text-0)",
		lineHeight: 1,
	},
	phase: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		textTransform: "uppercase" as const,
		letterSpacing: "1px",
		fontWeight: 600,
		marginTop: "4px",
	},
	controls: {
		display: "flex",
		gap: "8px",
		flexWrap: "wrap" as const,
		justifyContent: "center",
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
		cursor: "pointer" as const,
		minWidth: "70px",
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
		cursor: "pointer" as const,
	},
	stats: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		gap: "4px",
		marginTop: "8px",
	},
	statNumber: {
		fontSize: "24px",
		fontWeight: 700,
		color: "var(--accent)",
	},
	statLabel: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	},
	hint: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		textAlign: "center" as const,
		lineHeight: 1.5,
		maxWidth: "200px",
	},
};

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function phaseLabel(phase: PomodoroState["phase"]): string {
	switch (phase) {
		case "work": return "Focus";
		case "break": return "Break";
		case "longBreak": return "Long Break";
		case "idle": return "Ready";
	}
}

function phaseColor(phase: PomodoroState["phase"]): string {
	switch (phase) {
		case "work": return "var(--accent)";
		case "break": return "var(--green, #4ade80)";
		case "longBreak": return "var(--blue, #60a5fa)";
		case "idle": return "var(--text-3)";
	}
}

export function PomodoroPanel() {
	const [state, setState] = React.useState<PomodoroState>(getState);

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	const progress = state.totalSeconds > 0
		? state.secondsRemaining / state.totalSeconds
		: 1;
	const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
	const color = phaseColor(state.phase);

	return (
		<div style={s.root}>
			{/* Progress Ring */}
			<div style={s.ringContainer}>
				<svg
					width={RING_SIZE}
					height={RING_SIZE}
					style={s.svg}
				>
					<circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RING_RADIUS}
						style={s.ringBg}
					/>
					<circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RING_RADIUS}
						style={{
							...s.ringProgress,
							stroke: color,
							strokeDasharray: RING_CIRCUMFERENCE,
							strokeDashoffset: dashOffset,
						}}
					/>
				</svg>
				<div style={s.timeOverlay}>
					<span style={s.time}>{formatTime(state.secondsRemaining)}</span>
					<span style={{ ...s.phase, color }}>{phaseLabel(state.phase)}</span>
				</div>
			</div>

			{/* Controls */}
			<div style={s.controls}>
				{state.state === "running" ? (
					<button style={s.btn} onClick={pauseTimer}>Pause</button>
				) : (
					<button style={s.btn} onClick={startTimer}>
						{state.state === "paused" ? "Resume" : "Start"}
					</button>
				)}
				{state.state !== "idle" && (
					<>
						<button style={s.btnSecondary} onClick={skipPhase}>Skip</button>
						<button style={s.btnSecondary} onClick={resetTimer}>Reset</button>
					</>
				)}
			</div>

			{/* Stats */}
			<div style={s.stats}>
				<span style={s.statNumber}>{state.completedPomodoros}</span>
				<span style={s.statLabel}>
					session{state.completedPomodoros !== 1 ? "s" : ""} completed
				</span>
			</div>

			{/* Hint */}
			{state.state === "idle" && (
				<div style={s.hint}>
					Press Start to begin a {state.phase === "break" || state.phase === "longBreak"
						? (state.phase === "longBreak" ? "long break" : "break")
						: "focus session"
					}
				</div>
			)}
		</div>
	);
}
