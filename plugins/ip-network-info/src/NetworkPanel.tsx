import * as React from "react";
import {
	getState, subscribe, fetchPublicIp, dnsLookup, whoisLookup,
	copyToClipboard, type NetworkState,
} from "./activate";

const s = {
	root: {
		display: "flex",
		flexDirection: "column" as const,
		height: "100%",
		fontFamily: "var(--font-mono)",
		color: "var(--text-0)",
		overflow: "hidden",
	},
	tabs: {
		display: "flex",
		borderBottom: "1px solid var(--border)",
		flexShrink: 0,
	},
	tab: {
		background: "none",
		border: "none",
		borderBottom: "2px solid transparent",
		color: "var(--text-3)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "6px 12px",
		cursor: "pointer" as const,
	},
	tabActive: {
		color: "var(--accent)",
		borderBottomColor: "var(--accent)",
		fontWeight: 600,
	},
	content: {
		flex: 1,
		overflow: "auto" as const,
		padding: "12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "10px",
	},
	section: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "6px",
	},
	sectionTitle: {
		fontSize: "var(--text-xs)",
		fontWeight: 600,
		color: "var(--text-2)",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		fontSize: "var(--text-sm)",
	},
	label: {
		color: "var(--text-3)",
		flexShrink: 0,
		minWidth: "70px",
	},
	value: {
		color: "var(--text-0)",
		wordBreak: "break-all" as const,
		flex: 1,
	},
	copyBtn: {
		background: "none",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-3)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "1px 6px",
		cursor: "pointer" as const,
		flexShrink: 0,
	},
	input: {
		width: "100%",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "6px 8px",
		outline: "none",
		boxSizing: "border-box" as const,
	},
	select: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "6px 8px",
		outline: "none",
		cursor: "pointer" as const,
	},
	btn: {
		background: "var(--accent)",
		border: "none",
		borderRadius: "var(--radius-sm)",
		color: "#fff",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "5px 12px",
		cursor: "pointer" as const,
		alignSelf: "flex-start" as const,
	},
	btnSecondary: {
		background: "none",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-2)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "5px 12px",
		cursor: "pointer" as const,
		alignSelf: "flex-start" as const,
	},
	error: {
		color: "var(--red)",
		fontSize: "var(--text-xs)",
		lineHeight: 1.4,
	},
	loading: {
		color: "var(--text-3)",
		fontSize: "var(--text-xs)",
	},
	pre: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		padding: "8px",
		fontSize: "var(--text-xs)",
		color: "var(--text-1)",
		overflow: "auto" as const,
		maxHeight: "300px",
		whiteSpace: "pre-wrap" as const,
		wordBreak: "break-all" as const,
		margin: 0,
		lineHeight: 1.5,
	},
	recordRow: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		padding: "4px 8px",
		borderRadius: "var(--radius-sm)",
		fontSize: "var(--text-xs)",
		background: "var(--bg-2)",
	},
	recordType: {
		color: "var(--accent)",
		fontWeight: 600,
		flexShrink: 0,
		minWidth: "45px",
	},
	recordValue: {
		color: "var(--text-1)",
		flex: 1,
		wordBreak: "break-all" as const,
	},
	recordTtl: {
		color: "var(--text-3)",
		flexShrink: 0,
	},
	inputRow: {
		display: "flex",
		gap: "6px",
		alignItems: "center",
	},
};

type Tab = "ip" | "dns" | "whois";

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "SRV"];

export function NetworkPanel() {
	const [state, setState] = React.useState<NetworkState>(getState);
	const [tab, setTab] = React.useState<Tab>("ip");
	const [dnsQuery, setDnsQuery] = React.useState("");
	const [dnsType, setDnsType] = React.useState("A");
	const [whoisQuery, setWhoisQuery] = React.useState("");

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	const handleDnsLookup = () => {
		const q = dnsQuery.trim();
		if (q) dnsLookup(q, dnsType);
	};

	const handleWhoisLookup = () => {
		const q = whoisQuery.trim();
		if (q) whoisLookup(q);
	};

	return (
		React.createElement("div", { style: s.root },
			React.createElement("div", { style: s.tabs },
				(["ip", "dns", "whois"] as Tab[]).map((t) =>
					React.createElement("button", {
						key: t,
						style: { ...s.tab, ...(tab === t ? s.tabActive : {}) },
						onClick: () => setTab(t),
					}, t === "ip" ? "Public IP" : t.toUpperCase())
				)
			),

			React.createElement("div", { style: s.content },
				tab === "ip" && renderIpTab(state),
				tab === "dns" && renderDnsTab(state, dnsQuery, setDnsQuery, dnsType, setDnsType, handleDnsLookup),
				tab === "whois" && renderWhoisTab(state, whoisQuery, setWhoisQuery, handleWhoisLookup),
			)
		)
	);
}

function renderIpTab(state: NetworkState) {
	if (state.ipLoading) {
		return React.createElement("span", { style: s.loading }, "Fetching public IP...");
	}

	if (state.ipError) {
		return React.createElement("div", { style: s.section },
			React.createElement("span", { style: s.error }, state.ipError),
			React.createElement("button", { style: s.btnSecondary, onClick: fetchPublicIp }, "Retry")
		);
	}

	if (!state.ipInfo) {
		return React.createElement("button", { style: s.btn, onClick: fetchPublicIp }, "Fetch Public IP");
	}

	const info = state.ipInfo;
	const rows: [string, string][] = [
		["IP", info.ip],
		["City", info.city || "—"],
		["Region", info.region || "—"],
		["Country", info.country || "—"],
		["Org", info.org || "—"],
		["Timezone", info.timezone || "—"],
	];

	return React.createElement("div", { style: s.section },
		React.createElement("div", {
			style: { display: "flex", alignItems: "center", justifyContent: "space-between" },
		},
			React.createElement("span", { style: s.sectionTitle }, "Public IP Information"),
			React.createElement("button", { style: s.btnSecondary, onClick: fetchPublicIp }, "Refresh"),
		),
		...rows.map(([label, value]) =>
			React.createElement("div", { style: s.row, key: label },
				React.createElement("span", { style: s.label }, label),
				React.createElement("span", { style: s.value }, value),
				value !== "—" && React.createElement("button", {
					style: s.copyBtn,
					onClick: () => copyToClipboard(value),
					title: "Copy",
				}, "Copy"),
			)
		)
	);
}

function renderDnsTab(
	state: NetworkState,
	query: string,
	setQuery: (v: string) => void,
	type: string,
	setType: (v: string) => void,
	onLookup: () => void,
) {
	return React.createElement("div", { style: s.section },
		React.createElement("span", { style: s.sectionTitle }, "DNS Lookup"),
		React.createElement("div", { style: s.inputRow },
			React.createElement("input", {
				style: { ...s.input, flex: 1 },
				value: query,
				onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
				placeholder: "example.com",
				onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") onLookup(); },
			}),
			React.createElement("select", {
				style: s.select,
				value: type,
				onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value),
			},
				...DNS_TYPES.map((t) => React.createElement("option", { key: t, value: t }, t))
			),
			React.createElement("button", {
				style: s.btn,
				onClick: onLookup,
				disabled: !query.trim() || state.dnsLoading,
			}, state.dnsLoading ? "..." : "Lookup"),
		),

		state.dnsError && React.createElement("span", { style: s.error }, state.dnsError),

		state.dnsRecords.length > 0 && React.createElement("div", {
			style: { display: "flex", flexDirection: "column" as const, gap: "4px" },
		},
			...state.dnsRecords.map((rec, i) =>
				React.createElement("div", { style: s.recordRow, key: i },
					React.createElement("span", { style: s.recordType }, rec.type),
					React.createElement("span", { style: s.recordValue }, rec.value),
					rec.ttl != null && React.createElement("span", { style: s.recordTtl }, `${rec.ttl}s`),
					React.createElement("button", {
						style: s.copyBtn,
						onClick: () => copyToClipboard(rec.value),
						title: "Copy",
					}, "Copy"),
				)
			)
		),
	);
}

function renderWhoisTab(
	state: NetworkState,
	query: string,
	setQuery: (v: string) => void,
	onLookup: () => void,
) {
	return React.createElement("div", { style: s.section },
		React.createElement("span", { style: s.sectionTitle }, "WHOIS Lookup"),
		React.createElement("div", { style: s.inputRow },
			React.createElement("input", {
				style: { ...s.input, flex: 1 },
				value: query,
				onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
				placeholder: "example.com or 8.8.8.8",
				onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") onLookup(); },
			}),
			React.createElement("button", {
				style: s.btn,
				onClick: onLookup,
				disabled: !query.trim() || state.whoisLoading,
			}, state.whoisLoading ? "..." : "Lookup"),
		),

		state.whoisError && React.createElement("span", { style: s.error }, state.whoisError),

		state.whoisResult && React.createElement("div", { style: { position: "relative" as const } },
			React.createElement("pre", { style: s.pre }, state.whoisResult.raw),
			React.createElement("button", {
				style: { ...s.copyBtn, position: "absolute" as const, top: "4px", right: "4px" },
				onClick: () => copyToClipboard(state.whoisResult!.raw),
			}, "Copy"),
		),
	);
}
