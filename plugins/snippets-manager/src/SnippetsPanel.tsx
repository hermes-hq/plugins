import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { getAPI } from "./activate";

interface Snippet {
  id: string;
  title: string;
  language: string;
  tags: string[];
  code: string;
}

const STORAGE_KEY = "snippets";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
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

const buttonStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-2)",
  borderRadius: "var(--radius-sm)",
  padding: "3px 8px",
  cursor: "pointer",
  fontSize: "var(--text-xs)",
};

export function SnippetsPanel() {
  const api = getAPI();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", language: "", tags: "", code: "" });
  const [showForm, setShowForm] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    api.storage.get(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        setSnippets(JSON.parse(raw));
      } catch {
        // Corrupt/old-format snippets — start fresh rather than crash the panel.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: Snippet[]) {
    setSnippets(next);
    await api.storage.set(STORAGE_KEY, JSON.stringify(next));
  }

  function resetForm() {
    setForm({ title: "", language: "", tags: "", code: "" });
    setEditingId(null);
    setShowForm(false);
  }

  async function saveSnippet() {
    if (!form.title.trim() || !form.code.trim()) {
      api.ui.showToast("Title and code are required", { type: "warning" });
      return;
    }
    const entry: Snippet = {
      id: editingId ?? `${Date.now()}`,
      title: form.title.trim(),
      language: form.language.trim(),
      tags: parseTags(form.tags),
      code: form.code,
    };
    const next = editingId
      ? snippets.map((s) => (s.id === editingId ? entry : s))
      : [entry, ...snippets];
    await persist(next);
    api.ui.showToast(editingId ? "Snippet updated" : "Snippet saved", { type: "success" });
    resetForm();
  }

  function editSnippet(s: Snippet) {
    setForm({ title: s.title, language: s.language, tags: s.tags.join(", "), code: s.code });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function deleteSnippet(id: string) {
    await persist(snippets.filter((s) => s.id !== id));
  }

  async function copySnippet(s: Snippet) {
    await api.clipboard.writeText(s.code);
    api.ui.showToast("Copied to clipboard — paste it into the terminal yourself", { type: "success" });
  }

  async function copyExport() {
    await api.clipboard.writeText(JSON.stringify(snippets, null, 2));
    api.ui.showToast("Exported snippets copied to clipboard", { type: "success" });
  }

  async function runImport() {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const imported: Snippet[] = parsed.map((s: Partial<Snippet>, i: number) => ({
        id: typeof s.id === "string" ? s.id : `${Date.now()}-${i}`,
        title: String(s.title ?? "Untitled"),
        language: String(s.language ?? ""),
        tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
        code: String(s.code ?? ""),
      }));
      const existingIds = new Set(snippets.map((s) => s.id));
      const merged = [...snippets, ...imported.filter((s) => !existingIds.has(s.id))];
      await persist(merged);
      api.ui.showToast(`Imported ${imported.length} snippet(s)`, { type: "success" });
      setImportText("");
      setShowImport(false);
    } catch {
      api.ui.showToast("Invalid snippet JSON", { type: "error" });
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [snippets, query]);

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
      <h3 style={{ ...labelStyle, margin: 0 }}>SNIPPETS</h3>

      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, language, or tag"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          style={{ ...buttonStyle, background: "var(--accent)", color: "var(--bg-1)", border: "none", fontWeight: 600 }}
        >
          {showForm ? "Cancel" : "+ New snippet"}
        </button>
        <button onClick={copyExport} style={buttonStyle} disabled={snippets.length === 0}>
          Export
        </button>
        <button onClick={() => setShowImport((v) => !v)} style={buttonStyle}>
          Import
        </button>
      </div>

      {showImport && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={labelStyle}>Paste exported JSON</span>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            placeholder="[{...}]"
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <button onClick={runImport} style={buttonStyle}>
            Import
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              placeholder="Language (e.g. bash)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (comma separated)"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <textarea
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            rows={6}
            placeholder="Snippet code"
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <button onClick={saveSnippet} style={{ ...buttonStyle, background: "var(--accent)", color: "var(--bg-1)", border: "none", fontWeight: 600 }}>
            {editingId ? "Update" : "Save"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-2)", fontSize: "var(--text-xs)" }}>No snippets yet.</p>
        )}
        {filtered.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "var(--text-sm)" }}>{s.title}</strong>
              {s.language && <span style={{ ...labelStyle, fontSize: "10px" }}>{s.language}</span>}
            </div>
            {s.tags.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {s.tags.map((t) => (
                  <span key={t} style={{ fontSize: "10px", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "1px 5px" }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <pre
              style={{
                margin: 0,
                padding: "6px",
                background: "var(--bg-2)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {s.code}
            </pre>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => copySnippet(s)} style={buttonStyle}>
                Copy
              </button>
              <button onClick={() => editSnippet(s)} style={buttonStyle}>
                Edit
              </button>
              <button onClick={() => deleteSnippet(s.id)} style={{ ...buttonStyle, color: "var(--red, #f85149)" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
