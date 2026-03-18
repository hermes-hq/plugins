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
const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

export interface NetworkInterface {
	name: string;
	ip: string;
	type: string;
}

export interface PingResult {
	output: string;
}

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
	interfaces: NetworkInterface[];
	interfacesLoading: boolean;
	interfacesError: string | null;
	dnsRecords: DnsRecord[];
	dnsLoading: boolean;
	dnsError: string | null;
	whoisResult: WhoisResult | null;
	whoisLoading: boolean;
	whoisError: string | null;
	pingResult: PingResult | null;
	pingLoading: boolean;
	pingError: string | null;
}

let state: NetworkState = {
	ipInfo: null,
	ipLoading: false,
	ipError: null,
	interfaces: [],
	interfacesLoading: false,
	interfacesError: null,
	dnsRecords: [],
	dnsLoading: false,
	dnsError: null,
	whoisResult: null,
	whoisLoading: false,
	whoisError: null,
	pingResult: null,
	pingLoading: false,
	pingError: null,
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

export async function fetchInterfaces() {
	if (!api || typeof (api.shell as any).exec !== "function") return;
	state = { ...state, interfacesLoading: true, interfacesError: null, interfaces: [] };
	notify();
	try {
		const result = await (api.shell as any).exec("ifconfig");
		const output: string = result.stdout || "";
		const ifaces: NetworkInterface[] = [];
		const blocks = output.split(/(?=^\S)/m);
		for (const block of blocks) {
			const nameMatch = block.match(/^(\S+?)[:]/);
			if (!nameMatch) continue;
			const name = nameMatch[1];
			const inet4 = block.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
			const inet6 = block.match(/inet6\s+([0-9a-fA-F:]+)/);
			if (inet4) {
				ifaces.push({ name, ip: inet4[1], type: "IPv4" });
			}
			if (inet6) {
				ifaces.push({ name, ip: inet6[1], type: "IPv6" });
			}
		}
		state = { ...state, interfaces: ifaces, interfacesLoading: false };
	} catch (err) {
		state = { ...state, interfacesLoading: false, interfacesError: String(err) };
	}
	notify();
}

export async function runPing(host: string) {
	if (!api || typeof (api.shell as any).exec !== "function") return;
	state = { ...state, pingLoading: true, pingError: null, pingResult: null };
	notify();
	try {
		const args = isMac ? ["-c", "4", host] : ["-c", "4", host];
		const result = await (api.shell as any).exec("ping", args);
		state = { ...state, pingResult: { output: result.stdout || result.stderr }, pingLoading: false };
	} catch (err) {
		state = { ...state, pingLoading: false, pingError: String(err) };
	}
	notify();
}

export async function runTraceroute(host: string) {
	if (!api || typeof (api.shell as any).exec !== "function") return;
	state = { ...state, pingLoading: true, pingError: null, pingResult: null };
	notify();
	try {
		const cmd = isMac ? "traceroute" : "traceroute";
		const result = await (api.shell as any).exec(cmd, [host]);
		state = { ...state, pingResult: { output: result.stdout || result.stderr }, pingLoading: false };
	} catch (err) {
		state = { ...state, pingLoading: false, pingError: String(err) };
	}
	notify();
}

export function hasShellExec(): boolean {
	return api != null && typeof (api.shell as any).exec === "function";
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

	// Auto-fetch public IP and local interfaces on activation
	fetchPublicIp();
	fetchInterfaces();
}

export function deactivate() {
	api = null;
	listeners.clear();
}
