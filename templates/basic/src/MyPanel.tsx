import { useState } from "react";
import { getAPI } from "./activate";

export function MyPanel() {
  const api = getAPI();
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "16px",
      gap: "12px",
      minWidth: "220px",
      maxWidth: "400px",
      borderRight: "1px solid var(--border)",
      background: "var(--bg-1)",
      color: "var(--text-1)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
    }}>
      <h3 style={{
        margin: 0,
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-2)",
        letterSpacing: "0.05em",
      }}>
        MY PLUGIN
      </h3>
      <p>Click count: {count}</p>
      <button
        onClick={() => {
          setCount(c => c + 1);
          api.ui.showToast(`Clicked ${count + 1} times!`, { type: "info" });
        }}
        style={{
          background: "var(--accent)",
          color: "var(--bg-1)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "var(--text-xs)",
        }}
      >
        Click me
      </button>
    </div>
  );
}
