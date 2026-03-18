import { NetworkPanel } from "./NetworkPanel";

interface Disposable {
	dispose(): void;
}

interface PluginPanelProps {
	pluginId: string;
	panelId: string;
}

interface HermesPluginAPI {
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
		showPanel(panelId: string): void;
		hidePanel(panelId: string): void;
		togglePanel(panelId: string): void;
		showToast(message: string, options?: { type?: "info" | "success" | "warning" | "error"; duration?: number }): void;
		updateStatusBarItem(itemId: string, update: { text?: string; tooltip?: string; visible?: boolean }): void;
	};
	commands: {
		register(commandId: string, handler: () => void | Promise<void>): Disposable;
		execute(commandId: string): Promise<void>;
	};
	clipboard: {
		readText(): Promise<string>;
		writeText(text: string): Promise<void>;
	};
	network: {
		fetch(url: string): Promise<string>;
	};
	shell: {
		openExternal(url: string): Promise<void>;
	};
	subscriptions: Disposable[];
}

let api: HermesPluginAPI | null = null;
let listeners = new Set<() => void>();

export interface IpInfo {
	ip: string;
	city?: string;
	region?: string;
	country?: string;
	org?: string;
	timezone?: string;
}

export interface DnsRecord {
	type: string;
	value: string;
	ttl?: number;
}

export interface WhoisResult {
	raw: string;
}

export interface NetworkState {
	ipInfo: IpInfo | null;
	ipLoading: boolean;
	ipError: string | null;
	dnsRecords: DnsRecord[];
	dnsLoading: boolean;
	dnsError: string | null;
	whoisResult: WhoisResult | null;
	whoisLoading: boolean;
	whoisError: string | null;
}

let state: NetworkState = {
	ipInfo: null,
	ipLoading: false,
	ipError: null,
	dnsRecords: [],
	dnsLoading: false,
	dnsError: null,
	whoisResult: null,
	whoisLoading: false,
	whoisError: null,
};

export function getState(): NetworkState {
	return { ...state };
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notify() {
	for (const l of listeners) {
		try { l(); } catch { /* swallow */ }
	}
}

export function getApi(): HermesPluginAPI | null {
	return api;
}

export async function fetchPublicIp() {
	if (!api) return;
	state = { ...state, ipLoading: true, ipError: null };
	notify();
	try {
		const raw = await api.network.fetch("https://ipinfo.io/json");
		const data = JSON.parse(raw);
		state = {
			...state,
			ipInfo: {
				ip: data.ip,
				city: data.city,
				region: data.region,
				country: data.country,
				org: data.org,
				timezone: data.timezone,
			},
			ipLoading: false,
		};
		api.ui.updateStatusBarItem("ip-network-info.status", {
			text: data.ip,
			tooltip: `${data.ip} — ${data.city || ""}, ${data.country || ""}`,
		});
	} catch (err) {
		state = { ...state, ipLoading: false, ipError: String(err) };
	}
	notify();
}

export async function dnsLookup(domain: string, type: string) {
	if (!api) return;
	state = { ...state, dnsLoading: true, dnsError: null, dnsRecords: [] };
	notify();
	try {
		const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
		const raw = await api.network.fetch(url);
		const data = JSON.parse(raw);
		if (data.Status !== 0) {
			const errCodes: Record<number, string> = { 1: "Format error", 2: "Server failure", 3: "Domain not found", 5: "Refused" };
			throw new Error(errCodes[data.Status] || `DNS error (status ${data.Status})`);
		}
		const records: DnsRecord[] = (data.Answer || []).map((a: { type: number; data: string; TTL?: number }) => ({
			type: dnsTypeToString(a.type),
			value: a.data,
			ttl: a.TTL,
		}));
		state = { ...state, dnsRecords: records, dnsLoading: false };
	} catch (err) {
		state = { ...state, dnsLoading: false, dnsError: String(err) };
	}
	notify();
}

function dnsTypeToString(type: number): string {
	const map: Record<number, string> = { 1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 2: "NS", 6: "SOA", 33: "SRV" };
	return map[type] || String(type);
}

export async function whoisLookup(query: string) {
	if (!api) return;
	state = { ...state, whoisLoading: true, whoisError: null, whoisResult: null };
	notify();
	try {
		const url = `https://whois.freeaitools.dev/?domain=${encodeURIComponent(query)}`;
		const raw = await api.network.fetch(url);
		state = { ...state, whoisResult: { raw }, whoisLoading: false };
	} catch (err) {
		state = { ...state, whoisLoading: false, whoisError: String(err) };
	}
	notify();
}

export async function copyToClipboard(text: string) {
	if (!api) return;
	try {
		await api.clipboard.writeText(text);
		api.ui.showToast("Copied to clipboard", { type: "success", duration: 1500 });
	} catch {
		api.ui.showToast("Failed to copy", { type: "error" });
	}
}

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;

	api.ui.registerPanel("ip-network-info-panel", NetworkPanel);

	api.subscriptions.push(
		api.commands.register("ip-network-info.open", () => {
			api!.ui.showPanel("ip-network-info-panel");
		})
	);

	api.subscriptions.push(
		api.commands.register("ip-network-info.refresh", () => fetchPublicIp())
	);

	// Auto-fetch public IP on activation
	fetchPublicIp();
}

export function deactivate() {
	api = null;
	listeners.clear();
}
