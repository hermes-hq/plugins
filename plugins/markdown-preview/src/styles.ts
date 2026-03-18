const CSS = `
.md-preview-content {
  line-height: 1.7;
  word-wrap: break-word;
}

.md-preview-content h1,
.md-preview-content h2,
.md-preview-content h3,
.md-preview-content h4,
.md-preview-content h5,
.md-preview-content h6 {
  color: var(--text-0);
  margin: 1.2em 0 0.5em;
  font-weight: 600;
  line-height: 1.3;
}
.md-preview-content h1 { font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.md-preview-content h2 { font-size: 1.35em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
.md-preview-content h3 { font-size: 1.15em; }
.md-preview-content h4 { font-size: 1em; }

.md-preview-content p {
  margin: 0.6em 0;
}

.md-preview-content a {
  color: var(--accent);
  text-decoration: none;
}
.md-preview-content a:hover {
  text-decoration: underline;
}

.md-preview-content ul,
.md-preview-content ol {
  padding-left: 1.8em;
  margin: 0.5em 0;
}
.md-preview-content li {
  margin: 0.2em 0;
}
.md-preview-content li input[type="checkbox"] {
  margin-right: 0.4em;
}

.md-preview-content blockquote {
  margin: 0.5em 0;
  padding: 0.4em 1em;
  border-left: 3px solid var(--accent);
  background: var(--bg-2);
  color: var(--text-2);
}
.md-preview-content blockquote p {
  margin: 0.2em 0;
}

.md-preview-content pre {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  overflow-x: auto;
  margin: 0.6em 0;
  line-height: 1.5;
}
.md-preview-content pre code {
  background: none;
  padding: 0;
  border: none;
  font-size: inherit;
}

.md-preview-content code {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.15em 0.4em;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.md-preview-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}
.md-preview-content th,
.md-preview-content td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.md-preview-content th {
  background: var(--bg-2);
  font-weight: 600;
  color: var(--text-1);
}

.md-preview-content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1em 0;
}

.md-preview-content img {
  max-width: 100%;
  border-radius: var(--radius-sm);
}

.md-preview-content del {
  color: var(--text-3);
}

.mermaid-placeholder {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin: 0.6em 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}
.mermaid-placeholder svg {
  max-width: 100%;
  height: auto;
}
`;

let injected = false;

export function injectStyles() {
  if (injected) return;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
  injected = true;
}
