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
  const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  function randomBytes(n) {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return buf;
  }
  function formatUuid(bytes) {
    return HEX[bytes[0]] + HEX[bytes[1]] + HEX[bytes[2]] + HEX[bytes[3]] + "-" + HEX[bytes[4]] + HEX[bytes[5]] + "-" + HEX[bytes[6]] + HEX[bytes[7]] + "-" + HEX[bytes[8]] + HEX[bytes[9]] + "-" + HEX[bytes[10]] + HEX[bytes[11]] + HEX[bytes[12]] + HEX[bytes[13]] + HEX[bytes[14]] + HEX[bytes[15]];
  }
  const UUID_EPOCH_OFFSET = 122192928000000000n;
  let v1ClockSeq = (randomBytes(2)[0] << 8 | randomBytes(2)[1]) & 16383;
  let v1LastTimestamp = 0n;
  let v1Counter = 0;
  const v1Node = randomBytes(6);
  v1Node[0] = v1Node[0] | 1;
  function uuidV1() {
    let timestamp = BigInt(Date.now()) * 10000n + UUID_EPOCH_OFFSET;
    if (timestamp <= v1LastTimestamp) {
      v1Counter++;
      timestamp = v1LastTimestamp + BigInt(v1Counter);
    } else {
      v1Counter = 0;
      v1LastTimestamp = timestamp;
    }
    const timeLow = Number(timestamp & 0xffffffffn);
    const timeMid = Number(timestamp >> 32n & 0xffffn);
    const timeHi = Number(timestamp >> 48n & 0x0fffn) | 4096;
    const bytes = new Uint8Array(16);
    bytes[0] = timeLow >>> 24 & 255;
    bytes[1] = timeLow >>> 16 & 255;
    bytes[2] = timeLow >>> 8 & 255;
    bytes[3] = timeLow & 255;
    bytes[4] = timeMid >>> 8 & 255;
    bytes[5] = timeMid & 255;
    bytes[6] = timeHi >>> 8 & 255;
    bytes[7] = timeHi & 255;
    bytes[8] = v1ClockSeq >>> 8 & 63 | 128;
    bytes[9] = v1ClockSeq & 255;
    bytes.set(v1Node, 10);
    return formatUuid(bytes);
  }
  function uuidV4() {
    const bytes = randomBytes(16);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    return formatUuid(bytes);
  }
  const NAMESPACES = {
    DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
  };
  function parseUuidToBytes(uuid) {
    const hex = uuid.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  async function uuidV5(namespace, name) {
    const nsBytes = parseUuidToBytes(namespace);
    const nameBytes = new TextEncoder().encode(name);
    const data = new Uint8Array(nsBytes.length + nameBytes.length);
    data.set(nsBytes);
    data.set(nameBytes, nsBytes.length);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const bytes = new Uint8Array(hashBuffer).slice(0, 16);
    bytes[6] = bytes[6] & 15 | 80;
    bytes[8] = bytes[8] & 63 | 128;
    return formatUuid(bytes);
  }
  function uuidV7() {
    const now = BigInt(Date.now());
    const bytes = randomBytes(16);
    bytes[0] = Number(now >> 40n & 0xffn);
    bytes[1] = Number(now >> 32n & 0xffn);
    bytes[2] = Number(now >> 24n & 0xffn);
    bytes[3] = Number(now >> 16n & 0xffn);
    bytes[4] = Number(now >> 8n & 0xffn);
    bytes[5] = Number(now & 0xffn);
    bytes[6] = bytes[6] & 15 | 112;
    bytes[8] = bytes[8] & 63 | 128;
    return formatUuid(bytes);
  }
  function uuidNil() {
    return "00000000-0000-0000-0000-000000000000";
  }
  function uuidMax() {
    return "ffffffff-ffff-ffff-ffff-ffffffffffff";
  }
  async function generateUuids(opts) {
    const results = [];
    for (let i = 0; i < opts.count; i++) {
      switch (opts.version) {
        case "v1":
          results.push(uuidV1());
          break;
        case "v4":
          results.push(uuidV4());
          break;
        case "v5":
          results.push(await uuidV5(opts.namespace || NAMESPACES.DNS, opts.name || ""));
          break;
        case "v7":
          results.push(uuidV7());
          break;
        case "nil":
          results.push(uuidNil());
          break;
        case "max":
          results.push(uuidMax());
          break;
      }
    }
    return results;
  }
  const VERSIONS = [
    { value: "v4", label: "v4", desc: "Random (most common)" },
    { value: "v7", label: "v7", desc: "Unix timestamp + random (sortable)" },
    { value: "v1", label: "v1", desc: "Timestamp + node (classic)" },
    { value: "v5", label: "v5", desc: "SHA-1 namespace + name (deterministic)" },
    { value: "nil", label: "Nil", desc: "All zeros" },
    { value: "max", label: "Max", desc: "All ones" }
  ];
  const COUNTS = [1, 5, 10, 25, 50, 100];
  const NS_OPTIONS = [
    { value: NAMESPACES.DNS, label: "DNS" },
    { value: NAMESPACES.URL, label: "URL" },
    { value: NAMESPACES.OID, label: "OID" },
    { value: NAMESPACES.X500, label: "X.500" }
  ];
  const s = {
    root: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-lg)",
      color: "var(--text-0)",
      overflow: "hidden"
    },
    toolbar: {
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: "6px"
    },
    label: {
      fontSize: "var(--text-sm)",
      color: "var(--text-2)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      minWidth: "52px"
    },
    select: {
      flex: 1,
      background: "var(--bg-2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      color: "var(--text-0)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-lg)",
      padding: "5px 8px",
      outline: "none",
      cursor: "pointer"
    },
    input: {
      flex: 1,
      background: "var(--bg-2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      color: "var(--text-0)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-lg)",
      padding: "5px 8px",
      outline: "none"
    },
    btnRow: {
      display: "flex",
      gap: "6px",
      marginTop: "2px"
    },
    btn: {
      flex: 1,
      background: "var(--accent, var(--blue))",
      border: "none",
      borderRadius: "var(--radius)",
      color: "#fff",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-md)",
      fontWeight: 600,
      padding: "7px 12px",
      cursor: "pointer"
    },
    btnSecondary: {
      flex: 0,
      background: "var(--bg-3)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      color: "var(--text-2)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-md)",
      fontWeight: 500,
      padding: "7px 12px",
      cursor: "pointer",
      whiteSpace: "nowrap"
    },
    results: {
      flex: 1,
      overflow: "auto",
      padding: "8px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    },
    resultRow: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "3px 6px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      transition: "background 0.1s",
      fontSize: "var(--text-base)",
      color: "var(--text-1)",
      fontFamily: "var(--font-mono)",
      wordBreak: "break-all",
      lineHeight: "1.5"
    },
    copyHint: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      flexShrink: 0,
      opacity: 0,
      transition: "opacity 0.1s"
    },
    empty: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      color: "var(--text-3)",
      fontSize: "var(--text-md)"
    },
    counter: {
      fontSize: "var(--text-xs)",
      color: "var(--text-3)",
      textAlign: "right",
      padding: "4px 12px",
      borderTop: "1px solid var(--border)",
      flexShrink: 0
    }
  };
  function UuidPanel() {
    const [version, setVersion] = React__namespace.useState("v4");
    const [count, setCount] = React__namespace.useState(1);
    const [results, setResults] = React__namespace.useState([]);
    const [generating, setGenerating] = React__namespace.useState(false);
    const [copiedIdx, setCopiedIdx] = React__namespace.useState(null);
    const [namespace, setNamespace] = React__namespace.useState(NAMESPACES.DNS);
    const [name, setName] = React__namespace.useState("");
    const versionInfo = VERSIONS.find((v) => v.value === version);
    const handleGenerate = React__namespace.useCallback(async () => {
      setGenerating(true);
      setCopiedIdx(null);
      try {
        const uuids = await generateUuids({ version, count, namespace, name });
        setResults(uuids);
        if (uuids.length === 1) {
          try {
            const api = getAPI();
            await api.clipboard.writeText(uuids[0]);
            api.ui.showToast("UUID copied to clipboard", { type: "success", duration: 1500 });
          } catch {
          }
        }
      } catch (err) {
        try {
          getAPI().ui.showToast(`Generation failed: ${err}`, { type: "error" });
        } catch {
        }
      }
      setGenerating(false);
    }, [version, count, namespace, name]);
    const handleCopyOne = React__namespace.useCallback(async (uuid, idx) => {
      try {
        const api = getAPI();
        await api.clipboard.writeText(uuid);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1200);
      } catch {
      }
    }, []);
    const handleCopyAll = React__namespace.useCallback(async () => {
      if (results.length === 0) return;
      try {
        const api = getAPI();
        await api.clipboard.writeText(results.join("\n"));
        api.ui.showToast(`${results.length} UUIDs copied`, { type: "success", duration: 1500 });
      } catch {
      }
    }, [results]);
    return /* @__PURE__ */ React__namespace.createElement("div", { style: s.root }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.toolbar }, /* @__PURE__ */ React__namespace.createElement("div", { style: s.row }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.label }, "Version"), /* @__PURE__ */ React__namespace.createElement(
      "select",
      {
        style: s.select,
        value: version,
        onChange: (e) => setVersion(e.target.value)
      },
      VERSIONS.map((v) => /* @__PURE__ */ React__namespace.createElement("option", { key: v.value, value: v.value }, v.label, " — ", v.desc))
    )), version === "v5" && /* @__PURE__ */ React__namespace.createElement(React__namespace.Fragment, null, /* @__PURE__ */ React__namespace.createElement("div", { style: s.row }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.label }, "NS"), /* @__PURE__ */ React__namespace.createElement(
      "select",
      {
        style: s.select,
        value: namespace,
        onChange: (e) => setNamespace(e.target.value)
      },
      NS_OPTIONS.map((ns) => /* @__PURE__ */ React__namespace.createElement("option", { key: ns.value, value: ns.value }, ns.label))
    )), /* @__PURE__ */ React__namespace.createElement("div", { style: s.row }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.label }, "Name"), /* @__PURE__ */ React__namespace.createElement(
      "input",
      {
        style: s.input,
        placeholder: "e.g. example.com",
        value: name,
        onChange: (e) => setName(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") handleGenerate();
        }
      }
    ))), /* @__PURE__ */ React__namespace.createElement("div", { style: s.row }, /* @__PURE__ */ React__namespace.createElement("span", { style: s.label }, "Count"), /* @__PURE__ */ React__namespace.createElement(
      "select",
      {
        style: s.select,
        value: count,
        onChange: (e) => setCount(Number(e.target.value))
      },
      COUNTS.map((c) => /* @__PURE__ */ React__namespace.createElement("option", { key: c, value: c }, c))
    )), /* @__PURE__ */ React__namespace.createElement("div", { style: s.btnRow }, /* @__PURE__ */ React__namespace.createElement("button", { style: s.btn, onClick: handleGenerate, disabled: generating }, generating ? "Generating..." : "Generate"), results.length > 1 && /* @__PURE__ */ React__namespace.createElement("button", { style: s.btnSecondary, onClick: handleCopyAll }, "Copy All"))), /* @__PURE__ */ React__namespace.createElement("div", { style: s.results }, results.length === 0 ? /* @__PURE__ */ React__namespace.createElement("div", { style: s.empty }, versionInfo ? versionInfo.desc : "Select a version and generate") : results.map((uuid, i) => /* @__PURE__ */ React__namespace.createElement(
      "div",
      {
        key: `${uuid}-${i}`,
        style: {
          ...s.resultRow,
          background: copiedIdx === i ? "var(--accent-dim)" : "transparent"
        },
        onClick: () => handleCopyOne(uuid, i),
        onMouseEnter: (e) => {
          e.currentTarget.style.background = copiedIdx === i ? "var(--accent-dim)" : "var(--bg-hover)";
          const hint = e.currentTarget.querySelector("[data-hint]");
          if (hint) hint.style.opacity = "1";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = copiedIdx === i ? "var(--accent-dim)" : "transparent";
          const hint = e.currentTarget.querySelector("[data-hint]");
          if (hint) hint.style.opacity = "0";
        },
        title: "Click to copy"
      },
      /* @__PURE__ */ React__namespace.createElement("span", { style: { flex: 1 } }, uuid),
      /* @__PURE__ */ React__namespace.createElement("span", { "data-hint": "", style: s.copyHint }, copiedIdx === i ? "copied" : "copy")
    ))), results.length > 0 && /* @__PURE__ */ React__namespace.createElement("div", { style: s.counter }, results.length, " UUID", results.length !== 1 ? "s" : "", " generated"));
  }
  let hermesAPI = null;
  function getAPI() {
    if (!hermesAPI) throw new Error("UUID Generator plugin not activated");
    return hermesAPI;
  }
  function activate(api) {
    hermesAPI = api;
    api.ui.registerPanel("uuid-generator-panel", UuidPanel);
    api.subscriptions.push(
      api.commands.register("uuid.openPanel", () => {
        api.ui.showPanel("uuid-generator-panel");
      })
    );
    api.subscriptions.push(
      api.commands.register("uuid.generateV4", async () => {
        const uuid = uuidV4();
        await api.clipboard.writeText(uuid);
        api.ui.showToast(`UUID copied: ${uuid}`, { type: "success", duration: 2e3 });
      })
    );
    api.subscriptions.push(
      api.commands.register("uuid.generate", () => {
        api.ui.showPanel("uuid-generator-panel");
      })
    );
  }
  function deactivate() {
    hermesAPI = null;
  }
  exports.activate = activate;
  exports.deactivate = deactivate;
  exports.getAPI = getAPI;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, React);
if (typeof window !== "undefined") {
  window.__hermesPlugins = window.__hermesPlugins || {};
  window.__hermesPlugins["hermes-hq.uuid-generator"] = { activate: __hermes_plugin__.activate, deactivate: __hermes_plugin__.deactivate };
}
