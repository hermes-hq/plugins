import * as React from "react";
import { useEffect, useState } from "react";
import { getAPI } from "./activate";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Method = (typeof METHODS)[number];

const HAS_BODY: Record<Method, boolean> = {
  GET: false,
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: false,
};

interface HeaderRow {
  key: string;
  value: string;
}

interface HistoryEntry {
  id: string;
  method: Method;
  url: string;
  headers: HeaderRow[];
  body: string;
}

interface ResponseState {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const HISTORY_KEY = "requestHistory";
const MAX_HISTORY = 20;

function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function headersToRecord(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) out[key] = row.value;
  }
  return out;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--success, #3fb950)";
  if (status >= 400) return "var(--error, #f85149)";
  return "var(--text-2)";
}

export function HttpClientPanel() {
  const api = getAPI();

  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.storage.get(HISTORY_KEY).then((raw) => {
      if (!raw) return;
      try {
        setHistory(JSON.parse(raw));
      } catch {
        // Corrupt/old-format history — start fresh rather than crash the panel.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHeader(index: number, field: "key" | "value", value: string) {
    setHeaders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Always keep one trailing empty row so there's always room to add another.
      if (index === next.length - 1 && (next[index].key || next[index].value)) {
        next.push({ key: "", value: "" });
      }
      return next;
    });
  }

  function removeHeader(index: number) {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }

  async function send() {
    if (!url.trim()) {
      api.ui.showToast("Enter a URL first", { type: "warning" });
      return;
    }
    setSending(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.network.request(method, url.trim(), {
        headers: headersToRecord(headers),
        body: HAS_BODY[method] && body.trim() ? body : undefined,
      });
      setResponse(result);

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        method,
        url: url.trim(),
        headers,
        body,
      };
      const nextHistory = [entry, ...history.filter((h) => !(h.method === method && h.url === entry.url))].slice(0, MAX_HISTORY);
      setHistory(nextHistory);
      await api.storage.set(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (err) {
      setError(String(err));
      api.ui.showToast("Request failed", { type: "error" });
    } finally {
      setSending(false);
    }
  }

  function loadFromHistory(entry: HistoryEntry) {
    setMethod(entry.method);
    setUrl(entry.url);
    setHeaders(entry.headers.length > 0 ? [...entry.headers, { key: "", value: "" }] : [{ key: "", value: "" }]);
    setBody(entry.body);
    setResponse(null);
    setError(null);
  }

  async function copyResponseBody() {
    if (!response) return;
    await api.clipboard.writeText(response.body);
    api.ui.showToast("Response body copied", { type: "success" });
  }

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
      <h3 style={{ ...labelStyle, margin: 0 }}>HTTP CLIENT</h3>

      <div style={{ display: "flex", gap: "6px" }}>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          style={{ ...inputStyle, flex: "0 0 auto" }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/resource"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={labelStyle}>Headers</span>
        {headers.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "4px" }}>
            <input
              type="text"
              value={row.key}
              onChange={(e) => updateHeader(i, "key", e.target.value)}
              placeholder="Header"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) => updateHeader(i, "value", e.target.value)}
              placeholder="Value"
              style={{ ...inputStyle, flex: 1 }}
            />
            {i < headers.length - 1 && (
              <button
                onClick={() => removeHeader(i)}
                title="Remove header"
                style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", padding: "0 4px" }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {HAS_BODY[method] && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={labelStyle}>Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder='{"key": "value"}'
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      )}

      <button
        onClick={send}
        disabled={sending}
        style={{
          background: "var(--accent)",
          color: "var(--bg-1)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "7px 12px",
          cursor: sending ? "default" : "pointer",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          opacity: sending ? 0.6 : 1,
        }}
      >
        {sending ? "Sending…" : "Send"}
      </button>

      {error && (
        <div style={{ color: "var(--error, #f85149)", fontSize: "var(--text-xs)", whiteSpace: "pre-wrap" }}>{error}</div>
      )}

      {response && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: statusColor(response.status), fontWeight: 700 }}>{response.status}</span>
            <button
              onClick={copyResponseBody}
              style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: "var(--radius-sm)", padding: "3px 8px", cursor: "pointer", fontSize: "var(--text-xs)" }}
            >
              Copy body
            </button>
          </div>
          <details>
            <summary style={{ ...labelStyle, cursor: "pointer" }}>Response headers ({Object.keys(response.headers).length})</summary>
            <pre style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
            </pre>
          </details>
          <pre
            style={{
              margin: 0,
              padding: "8px",
              background: "var(--bg-2)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {prettyBody(response.body)}
          </pre>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={labelStyle}>History</span>
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => loadFromHistory(entry)}
              style={{
                display: "flex",
                gap: "6px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 8px",
                cursor: "pointer",
                color: "var(--text-1)",
                fontSize: "var(--text-xs)",
                textAlign: "left",
              }}
            >
              <span style={{ color: "var(--text-2)", flex: "0 0 auto" }}>{entry.method}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.url}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
