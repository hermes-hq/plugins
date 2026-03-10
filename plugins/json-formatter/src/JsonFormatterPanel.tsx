import { useState, useCallback, useEffect } from "react";
import { getAPI, getSettings, onSettingsChanged, formatWithSettings } from "./activate";

const styles = `.json-fmt{display:flex;flex-direction:column;height:100%;padding:12px;gap:8px;overflow-y:auto;min-width:220px;max-width:400px;border-right:1px solid var(--border);background:var(--bg-1)}.json-fmt-header{display:flex;justify-content:space-between;align-items:center}.json-fmt-title{font-size:var(--text-xs);font-weight:600;text-transform:uppercase;color:var(--text-2);letter-spacing:.05em}.json-fmt-actions{display:flex;gap:8px}.json-fmt-link-btn{background:none;border:none;color:var(--accent);font-size:var(--text-xs);cursor:pointer;padding:0}.json-fmt-link-btn:hover{text-decoration:underline}.json-fmt-input{flex:0 0 auto;min-height:100px;max-height:200px;resize:vertical;background:var(--bg-2);color:var(--text-1);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-family:var(--font-mono);font-size:var(--text-sm);outline:none}.json-fmt-input:focus{border-color:var(--accent)}.json-fmt-input::placeholder{color:var(--text-3,var(--text-2));opacity:.5}.json-fmt-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px}.json-fmt-btn-group{display:flex;gap:4px}.json-fmt-btn{background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-1);padding:4px 10px;font-size:var(--text-xs);cursor:pointer;transition:background .15s}.json-fmt-btn:hover{background:var(--bg-hover,var(--bg-2))}.json-fmt-btn-primary{background:var(--accent);color:var(--bg-1);border-color:var(--accent)}.json-fmt-btn-primary:hover{opacity:.9}.json-fmt-settings-hint{font-size:var(--text-xs);color:var(--text-3)}.json-fmt-error{color:var(--red);font-size:var(--text-xs);font-family:var(--font-mono);padding:4px 0;word-break:break-word}.json-fmt-output-wrap{position:relative;flex:1;min-height:60px}.json-fmt-output{margin:0;background:var(--bg-2);color:var(--text-1);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;font-family:var(--font-mono);font-size:var(--text-sm);overflow:auto;max-height:300px;white-space:pre-wrap;word-break:break-word}.json-fmt-copy-btn{position:absolute;top:4px;right:4px;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--accent);font-size:var(--text-xs);padding:2px 8px;cursor:pointer;opacity:.8}.json-fmt-copy-btn:hover{opacity:1}`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function JsonFormatterPanel() {
  injectStyles();
  const api = getAPI();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(getSettings);

  // Re-read settings when they change via the settings panel
  useEffect(() => {
    return onSettingsChanged(() => setSettings(getSettings()));
  }, []);

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(formatWithSettings(parsed));
      setError(null);
      api.ui.updateStatusBarItem("json-formatter.status", { text: "JSON Valid" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setOutput("");
      api.ui.updateStatusBarItem("json-formatter.status", { text: "JSON Invalid" });
    }
  }, [input, api]);

  const minify = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setOutput("");
    }
  }, [input]);

  const validate = useCallback(() => {
    try {
      JSON.parse(input);
      setError(null);
      setOutput("Valid JSON");
      api.ui.showToast("JSON is valid", { type: "success" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setOutput("");
    }
  }, [input, api]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await api.clipboard.readText();
      setInput(text);
    } catch {
      api.ui.showToast("Failed to read clipboard", { type: "error" });
    }
  }, [api]);

  const copyResult = useCallback(async () => {
    if (!output) return;
    try {
      await api.clipboard.writeText(output);
      api.ui.showToast("Copied to clipboard", { type: "success" });
    } catch {
      api.ui.showToast("Failed to copy", { type: "error" });
    }
  }, [output, api]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
    api.ui.updateStatusBarItem("json-formatter.status", { text: "JSON" });
  }, [api]);

  const settingsHints: string[] = [];
  if (settings.sortKeys) settingsHints.push("sort keys");
  if (settings.maxDepth > 0) settingsHints.push(`depth ${settings.maxDepth}`);
  settingsHints.push(`${settings.indentSize}sp`);

  return (
    <div className="json-fmt">
      <div className="json-fmt-header">
        <span className="json-fmt-title">JSON FORMATTER</span>
        <div className="json-fmt-actions">
          <button onClick={pasteFromClipboard} className="json-fmt-link-btn">Paste</button>
          <button onClick={clear} className="json-fmt-link-btn">Clear</button>
        </div>
      </div>

      <textarea
        className="json-fmt-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste or type JSON here..."
        spellCheck={false}
      />

      <div className="json-fmt-toolbar">
        <div className="json-fmt-btn-group">
          <button onClick={format} className="json-fmt-btn json-fmt-btn-primary">Format</button>
          <button onClick={minify} className="json-fmt-btn">Minify</button>
          <button onClick={validate} className="json-fmt-btn">Validate</button>
        </div>
        <span className="json-fmt-settings-hint">{settingsHints.join(" · ")}</span>
      </div>

      {error && <div className="json-fmt-error">{error}</div>}

      {output && (
        <div className="json-fmt-output-wrap">
          <pre className="json-fmt-output">{output}</pre>
          <button onClick={copyResult} className="json-fmt-copy-btn">Copy</button>
        </div>
      )}
    </div>
  );
}
