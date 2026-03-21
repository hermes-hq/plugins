import * as React from "react";

// ─── GitHub OAuth Device Flow ─────────────────────────────

const CLIENT_ID = "Ov23lijqsY1fJzUeP6EN";
const SCOPES = "repo notifications read:org";

// ─── Types ────────────────────────────────────────────────

export interface GitHubUser {
	login: string;
	avatar_url: string;
	name: string | null;
}

export interface PullRequest {
	id: number;
	number: number;
	title: string;
	html_url: string;
	state: string;
	draft: boolean;
	created_at: string;
	updated_at: string;
	user: { login: string; avatar_url: string };
	repository_url: string;
	repo_full_name?: string;
	labels: { name: string; color: string }[];
	requested_reviewers?: { login: string }[];
}

export interface Notification {
	id: string;
	reason: string;
	unread: boolean;
	updated_at: string;
	subject: { title: string; url: string; type: string };
	repository: { full_name: string; html_url: string };
}

export type View = "connect" | "authorizing" | "reviews" | "my-prs" | "notifications";

export interface GitHubState {
	view: View;
	token: string | null;
	user: GitHubUser | null;
	reviewPRs: PullRequest[];
	myPRs: PullRequest[];
	notifications: Notification[];
	ignoredPRIds: Set<number>;
	loading: boolean;
	loadingMore: boolean;
	error: string | null;
	deviceCode: { user_code: string; verification_uri: string; device_code: string; interval: number } | null;
	// Pagination
	reviewPage: number;
	myPRsPage: number;
	notifsPage: number;
	hasMoreReviews: boolean;
	hasMoreMyPRs: boolean;
	hasMoreNotifs: boolean;
	// Filters
	repoFilters: string[];
}

// ─── Plugin API Types ─────────────────────────────────────

interface Disposable { dispose(): void; }
interface PluginPanelProps { pluginId: string; panelId: string; }

interface HermesPluginAPI {
	subscriptions: Disposable[];
	storage: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	commands: {
		register(command: string, handler: (...args: unknown[]) => void): Disposable;
	};
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
		showPanel(panelId: string): void;
		updateStatusBarItem(itemId: string, update: { text?: string; tooltip?: string; visible?: boolean }): void;
		showToast?(message: string, options?: { type?: string; duration?: number }): void;
	};
	network?: {
		fetch(url: string, options?: RequestInit): Promise<Response>;
	};
}

// ─── State Management ─────────────────────────────────────

let state: GitHubState = {
	view: "connect",
	token: null,
	user: null,
	reviewPRs: [],
	myPRs: [],
	notifications: [],
	ignoredPRIds: new Set(),
	loading: false,
	loadingMore: false,
	error: null,
	deviceCode: null,
	reviewPage: 1,
	myPRsPage: 1,
	notifsPage: 1,
	hasMoreReviews: false,
	hasMoreMyPRs: false,
	hasMoreNotifs: false,
	repoFilters: [],
};

let listeners = new Set<() => void>();
let api: HermesPluginAPI | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function getState(): GitHubState { return state; }

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notify() {
	for (const l of listeners) { try { l(); } catch { /* */ } }
}

function updateStatus() {
	if (!api) return;
	if (!state.token) {
		api.ui.updateStatusBarItem("github.status", { text: "GitHub" });
		return;
	}
	const reviewCount = state.reviewPRs.length;
	const notifCount = state.notifications.filter(n => n.unread).length;
	const total = reviewCount + notifCount;
	api.ui.updateStatusBarItem("github.status", {
		text: total > 0 ? `GitHub (${total})` : "GitHub",
		tooltip: `${reviewCount} reviews · ${notifCount} notifications`,
	});
}

async function ghGet(url: string): Promise<string> {
	// GitHub API (api.github.com) supports CORS — use direct fetch with auth headers
	const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
	if (state.token) headers.Authorization = `Bearer ${state.token}`;
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return res.text();
}

async function ghPost(url: string, body: Record<string, string>): Promise<string> {
	// GitHub auth endpoints require form-encoded data
	const formBody = Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
	if ((api?.network as any)?.postJson) {
		return (api!.network as any).postJson(url, formBody, {
			"Content-Type": "application/x-www-form-urlencoded",
			"Accept": "application/json",
		});
	}
	const res = await fetch(url, {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
		body: formBody,
	});
	return res.text();
}

// ─── Device Flow Auth ─────────────────────────────────────

export async function startDeviceFlow() {
	state = { ...state, view: "authorizing", error: null, loading: true };
	notify();

	try {
		let text: string;
		try {
			text = await ghPost("https://github.com/login/device/code", { client_id: CLIENT_ID, scope: SCOPES });
		} catch (fetchErr) {
			throw new Error(`POST failed: ${fetchErr}`);
		}
		let data: any;
		try {
			data = JSON.parse(text);
		} catch {
			throw new Error(`Invalid response: ${text.substring(0, 200)}`);
		}
		if (data.error) throw new Error(data.error_description || data.error);

		state = {
			...state,
			loading: false,
			deviceCode: {
				user_code: data.user_code,
				verification_uri: data.verification_uri,
				device_code: data.device_code,
				interval: data.interval || 5,
			},
		};
		notify();

		// Open the verification URL in the browser
		window.open(data.verification_uri, "_blank");

		// Start polling for the token
		startPolling(data.device_code, data.interval || 5);
	} catch (err) {
		state = { ...state, loading: false, error: `Auth failed: ${err}`, view: "connect" };
		notify();
	}
}

function startPolling(deviceCode: string, interval: number) {
	if (pollTimer) clearTimeout(pollTimer);
	let currentInterval = interval;

	const poll = async () => {
		try {
			console.log("[GitHub] Polling for token (interval:", currentInterval, "s)...");
			const text = await ghPost("https://github.com/login/oauth/access_token", {
				client_id: CLIENT_ID,
				device_code: deviceCode,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			});
			console.log("[GitHub] Poll response:", text.substring(0, 120));

			const data = JSON.parse(text);

			if (data.access_token) {
				console.log("[GitHub] Got access token!");
				pollTimer = null;
				state = { ...state, token: data.access_token, deviceCode: null };
				notify();

				if (api) await api.storage.set("github-token", data.access_token);

				await loadUser();
				await refreshData();
				state = { ...state, view: "reviews" };
				notify();
				return; // Stop polling
			} else if (data.error === "slow_down") {
				currentInterval += 5; // GitHub says back off
				console.log("[GitHub] Slowing down to", currentInterval, "s");
			} else if (data.error === "expired_token") {
				pollTimer = null;
				state = { ...state, error: "Authorization timed out. Try again.", view: "connect", deviceCode: null };
				notify();
				return;
			} else if (data.error === "access_denied") {
				pollTimer = null;
				state = { ...state, error: "Authorization denied.", view: "connect", deviceCode: null };
				notify();
				return;
			}
			// authorization_pending or other — keep polling
		} catch (pollErr) {
			console.error("[GitHub] Poll error:", pollErr);
		}
		// Schedule next poll
		pollTimer = setTimeout(poll, currentInterval * 1000);
	};

	pollTimer = setTimeout(poll, currentInterval * 1000);
}

export async function disconnect() {
	if (pollTimer) clearInterval(pollTimer);
	if (refreshTimer) clearInterval(refreshTimer);
	pollTimer = null;
	refreshTimer = null;
	state = {
		view: "connect", token: null, user: null,
		reviewPRs: [], myPRs: [], notifications: [],
		ignoredPRIds: new Set(), loading: false, loadingMore: false,
		error: null, deviceCode: null,
		reviewPage: 1, myPRsPage: 1, notifsPage: 1,
		hasMoreReviews: false, hasMoreMyPRs: false, hasMoreNotifs: false,
		repoFilters: [],
	};
	if (api) {
		await api.storage.delete("github-token");
		await api.storage.delete("github-user");
		await api.storage.delete("github-ignored-prs");
	}
	notify();
	updateStatus();
}

// ─── Data Loading ─────────────────────────────────────────

async function loadUser() {
	try {
		console.log("[GitHub] Loading user with token:", state.token?.substring(0, 10) + "...");
		const text = await ghGet("https://api.github.com/user");
		console.log("[GitHub] User response:", text.substring(0, 150));
		const user = JSON.parse(text);
		if (!user.login) throw new Error("No login in response: " + text.substring(0, 100));
		state = { ...state, user: { login: user.login, avatar_url: user.avatar_url, name: user.name } };
		if (api) await api.storage.set("github-user", JSON.stringify(state.user));
		notify();
	} catch (err) {
		console.error("[GitHub] loadUser failed:", err);
		state = { ...state, error: `GitHub API error: ${err}` };
		notify();
	}
}

const PER_PAGE = 20;

export async function refreshData() {
	if (!state.token || !state.user) return;
	state = { ...state, loading: true, error: null, reviewPage: 1, myPRsPage: 1, notifsPage: 1 };
	notify();

	try {
		const [reviewText, myPRsText, notifsText] = await Promise.all([
			ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=1`),
			ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+author:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=1`),
			ghGet(`https://api.github.com/notifications?per_page=${PER_PAGE}&page=1`),
		]);

		let reviewData, myPRsData, notifsData;
		try { reviewData = JSON.parse(reviewText); } catch { reviewData = { items: [] }; }
		try { myPRsData = JSON.parse(myPRsText); } catch { myPRsData = { items: [] }; }
		try { notifsData = JSON.parse(notifsText); } catch { notifsData = []; }

		// Extract repo name from repository_url for PRs
		const mapPR = (pr: PullRequest) => ({
			...pr,
			repo_full_name: pr.repository_url?.replace("https://api.github.com/repos/", "") ?? "",
		});

		const reviews = (reviewData.items ?? []).map(mapPR);
		const myPRs = (myPRsData.items ?? []).map(mapPR);
		const notifs = Array.isArray(notifsData) ? notifsData : [];

		state = {
			...state,
			reviewPRs: reviews,
			myPRs,
			notifications: notifs,
			loading: false,
			hasMoreReviews: reviews.length >= PER_PAGE,
			hasMoreMyPRs: myPRs.length >= PER_PAGE,
			hasMoreNotifs: notifs.length >= PER_PAGE,
		};
	} catch (err) {
		state = { ...state, loading: false, error: `Failed to load: ${err}` };
	}
	notify();
	updateStatus();
}

export async function loadMore(type: "reviews" | "my-prs" | "notifications") {
	if (!state.token || !state.user || state.loadingMore) return;
	state = { ...state, loadingMore: true };
	notify();

	try {
		const mapPR = (pr: PullRequest) => ({
			...pr,
			repo_full_name: pr.repository_url?.replace("https://api.github.com/repos/", "") ?? "",
		});

		if (type === "reviews") {
			const page = state.reviewPage + 1;
			const text = await ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${state.user!.login}&sort=updated&per_page=${PER_PAGE}&page=${page}`);
			const data = JSON.parse(text);
			const items = (data.items ?? []).map(mapPR);
			state = { ...state, reviewPRs: [...state.reviewPRs, ...items], reviewPage: page, hasMoreReviews: items.length >= PER_PAGE, loadingMore: false };
		} else if (type === "my-prs") {
			const page = state.myPRsPage + 1;
			const text = await ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+author:${state.user!.login}&sort=updated&per_page=${PER_PAGE}&page=${page}`);
			const data = JSON.parse(text);
			const items = (data.items ?? []).map(mapPR);
			state = { ...state, myPRs: [...state.myPRs, ...items], myPRsPage: page, hasMoreMyPRs: items.length >= PER_PAGE, loadingMore: false };
		} else {
			const page = state.notifsPage + 1;
			const text = await ghGet(`https://api.github.com/notifications?per_page=${PER_PAGE}&page=${page}`);
			const items = JSON.parse(text);
			state = { ...state, notifications: [...state.notifications, ...(Array.isArray(items) ? items : [])], notifsPage: page, hasMoreNotifs: (Array.isArray(items) ? items : []).length >= PER_PAGE, loadingMore: false };
		}
	} catch {
		state = { ...state, loadingMore: false };
	}
	notify();
}

export async function ignorePR(prId: number) {
	state = { ...state, ignoredPRIds: new Set([...state.ignoredPRIds, prId]) };
	notify();
	// Persist
	if (api) {
		try {
			await api.storage.set("github-ignored-prs", JSON.stringify([...state.ignoredPRIds]));
		} catch { /* */ }
	}
	updateStatus();
}

export async function unignorePR(prId: number) {
	const next = new Set(state.ignoredPRIds);
	next.delete(prId);
	state = { ...state, ignoredPRIds: next };
	notify();
	if (api) {
		try {
			await api.storage.set("github-ignored-prs", JSON.stringify([...state.ignoredPRIds]));
		} catch { /* */ }
	}
	updateStatus();
}

export function toggleRepoFilter(repo: string) {
	const next = state.repoFilters.includes(repo)
		? state.repoFilters.filter(r => r !== repo)
		: [...state.repoFilters, repo];
	state = { ...state, repoFilters: next };
	notify();
}

export function clearRepoFilters() {
	state = { ...state, repoFilters: [] };
	notify();
}

export function getRepos(): string[] {
	const repos = new Set<string>();
	for (const pr of state.reviewPRs) if (pr.repo_full_name) repos.add(pr.repo_full_name);
	for (const pr of state.myPRs) if (pr.repo_full_name) repos.add(pr.repo_full_name);
	for (const n of state.notifications) if (n.repository?.full_name) repos.add(n.repository.full_name);
	return Array.from(repos).sort();
}

export function setView(view: View) {
	state = { ...state, view, repoFilters: [] };
	notify();
}

export function clearError() {
	state = { ...state, error: null };
	notify();
}

// ─── Plugin Lifecycle ─────────────────────────────────────

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;

	// Load saved state
	try {
		const ignoredJson = await api.storage.get("github-ignored-prs");
		if (ignoredJson) {
			try { state.ignoredPRIds = new Set(JSON.parse(ignoredJson)); } catch { /* */ }
		}
	} catch { /* */ }

	try {
		const token = await api.storage.get("github-token");
		const userJson = await api.storage.get("github-user");
		if (token) {
			state.token = token;
			if (userJson) {
				try { state.user = JSON.parse(userJson); } catch { /* */ }
			}
			state.view = "reviews";
			notify();

			// Refresh data on startup
			await loadUser();
			await refreshData();

			// Auto-refresh (minimum 2 minutes to avoid API rate limits)
			let intervalMin = 2;
			try {
				const setting = await api.storage.get("setting:refreshInterval");
				if (setting) {
					const parsed = parseInt(setting, 10);
					if (parsed >= 2) intervalMin = parsed;
				}
			} catch { /* use default */ }
			refreshTimer = setInterval(() => refreshData(), intervalMin * 60 * 1000);
		}
	} catch { /* */ }

	const { GitHubPanel } = await import("./GitHubPanel");
	api.ui.registerPanel("github-panel", GitHubPanel);

	api.subscriptions.push(
		api.commands.register("github.open", () => {
			api!.ui.showPanel("github-panel");
		})
	);

	updateStatus();
}

export function deactivate() {
	if (pollTimer) clearInterval(pollTimer);
	if (refreshTimer) clearInterval(refreshTimer);
	listeners.clear();
	api = null;
}
