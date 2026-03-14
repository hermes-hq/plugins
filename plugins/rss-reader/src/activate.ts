import { Feed, Article, FeedState } from "./types";
import { parseFeed } from "./parser";
import { RSSPanel } from "./RSSPanel";

// --- API types (same pattern as other plugins) ---

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
	storage: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	settings: {
		get<T = string | number | boolean>(key: string): Promise<T>;
		update(key: string, value: string | number | boolean): Promise<void>;
		onDidChange(key: string, callback: (newValue: string | number | boolean) => void): Disposable;
		getAll(): Promise<Record<string, string | number | boolean>>;
	};
	network: {
		fetch(url: string): Promise<string>;
	};
	subscriptions: Disposable[];
}

// --- Module-level state ---

let api: HermesPluginAPI | null = null;
let feeds: Feed[] = [];
let articles: Article[] = [];
let loading: Set<string> = new Set();
let view: FeedState["view"] = "feeds";
let selectedFeedId: string | null = null;
let selectedCategory: string | null = null;
let refreshInterval = 30;
let maxArticlesPerFeed = 50;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<() => void>();

// --- Public API for components ---

export function getAPI(): HermesPluginAPI {
	if (!api) throw new Error("Plugin not activated");
	return api;
}

export function getState(): FeedState {
	const categories = [...new Set(feeds.map((f) => f.category))].sort();
	return {
		feeds: [...feeds],
		articles: [...articles],
		categories,
		loading: new Set(loading),
		view,
		selectedFeedId,
		selectedCategory,
	};
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyListeners() {
	listeners.forEach((l) => {
		try { l(); } catch {}
	});
}

// --- State actions ---

export function setView(v: FeedState["view"]) {
	view = v;
	notifyListeners();
}

export function setSelectedFeed(feedId: string | null) {
	selectedFeedId = feedId;
	if (feedId) view = "articles";
	notifyListeners();
}

export function setSelectedCategory(cat: string | null) {
	selectedCategory = cat;
	notifyListeners();
}

export async function addFeed(url: string, category: string = "Uncategorized", title?: string, opts?: { stayInView?: boolean }) {
	if (!api) return;

	const existing = feeds.find((f) => f.url === url);
	if (existing) {
		api.ui.showToast("Feed already added", { type: "warning" });
		return;
	}

	const id = "feed_" + Math.random().toString(36).slice(2, 10);
	const feed: Feed = {
		id,
		url,
		title: title || url,
		description: "",
		siteUrl: "",
		category,
		addedAt: Date.now(),
	};

	feeds.push(feed);
	loading.add(id);
	if (!opts?.stayInView) {
		view = "feeds";
	}
	notifyListeners();

	try {
		const xml = await api.network.fetch(url);
		const parsed = parseFeed(xml, id, maxArticlesPerFeed);

		feed.title = parsed.title || feed.title;
		feed.description = parsed.description;
		feed.siteUrl = parsed.siteUrl;

		const newArticles = parsed.articles.map((a) => ({
			...a,
			feedId: id,
			read: false,
		}));
		articles.push(...newArticles);
		articles.sort((a, b) => b.pubDate - a.pubDate);

		api.ui.showToast(`Added "${feed.title}"`, { type: "success" });
	} catch (e: any) {
		feeds = feeds.filter((f) => f.id !== id);
		api.ui.showToast("Failed to load feed: " + (e instanceof Error ? e.message : String(e) || "Unknown error"), { type: "error" });
	} finally {
		loading.delete(id);
		await saveState();
		updateStatusBar();
		notifyListeners();
	}
}

export async function removeFeed(feedId: string) {
	if (!api) return;

	const feed = feeds.find((f) => f.id === feedId);
	feeds = feeds.filter((f) => f.id !== feedId);
	articles = articles.filter((a) => a.feedId !== feedId);

	if (selectedFeedId === feedId) {
		selectedFeedId = null;
		view = "feeds";
	}

	await saveState();
	updateStatusBar();
	notifyListeners();

	if (feed) {
		api.ui.showToast(`Removed "${feed.title}"`, { type: "info" });
	}
}

export async function refreshFeed(feedId: string) {
	if (!api || loading.has(feedId)) return;

	const feed = feeds.find((f) => f.id === feedId);
	if (!feed) return;

	loading.add(feedId);
	notifyListeners();

	try {
		const xml = await api.network.fetch(feed.url);
		const parsed = parseFeed(xml, feedId, maxArticlesPerFeed);

		feed.title = parsed.title || feed.title;
		feed.description = parsed.description;
		feed.siteUrl = parsed.siteUrl;

		const existingIds = new Set(articles.filter((a) => a.feedId === feedId).map((a) => a.id));
		const readIds = new Set(articles.filter((a) => a.feedId === feedId && a.read).map((a) => a.id));

		// Remove old articles for this feed
		articles = articles.filter((a) => a.feedId !== feedId);

		// Add new/updated articles, preserving read state
		const newArticles = parsed.articles.map((a) => ({
			...a,
			feedId,
			read: readIds.has(a.id),
		}));
		articles.push(...newArticles);
		articles.sort((a, b) => b.pubDate - a.pubDate);
	} catch (e: any) {
		api.ui.showToast(`Failed to refresh "${feed.title}": ${e instanceof Error ? e.message : String(e) || "Unknown error"}`, { type: "error" });
	} finally {
		loading.delete(feedId);
		await saveState();
		updateStatusBar();
		notifyListeners();
	}
}

export async function refreshAllFeeds() {
	if (!api) return;
	await Promise.allSettled(feeds.map((f) => refreshFeed(f.id)));
}

export async function markArticleRead(articleId: string) {
	const article = articles.find((a) => a.id === articleId);
	if (!article || article.read) return;

	article.read = true;
	await saveState();
	updateStatusBar();
	notifyListeners();
}

export async function markArticleUnread(articleId: string) {
	const article = articles.find((a) => a.id === articleId);
	if (!article || !article.read) return;

	article.read = false;
	await saveState();
	updateStatusBar();
	notifyListeners();
}

export async function markAllReadForFeed(feedId: string) {
	let changed = false;
	for (const article of articles) {
		if (article.feedId === feedId && !article.read) {
			article.read = true;
			changed = true;
		}
	}
	if (changed) {
		await saveState();
		updateStatusBar();
		notifyListeners();
	}
}

export function getUnreadCount(feedId?: string): number {
	if (feedId) {
		return articles.filter((a) => a.feedId === feedId && !a.read).length;
	}
	return articles.filter((a) => !a.read).length;
}

// --- OPML import/export ---

export function exportOPML(): string {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<opml version="2.0">',
		"<head><title>Hermes IDE RSS Feeds</title></head>",
		"<body>",
	];

	const byCategory = new Map<string, Feed[]>();
	for (const feed of feeds) {
		const cat = feed.category || "Uncategorized";
		if (!byCategory.has(cat)) byCategory.set(cat, []);
		byCategory.get(cat)!.push(feed);
	}

	for (const [cat, catFeeds] of byCategory) {
		lines.push(`  <outline text="${escapeXml(cat)}">`);
		for (const feed of catFeeds) {
			lines.push(`    <outline type="rss" text="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.siteUrl)}" />`);
		}
		lines.push("  </outline>");
	}

	lines.push("</body>", "</opml>");
	return lines.join("\n");
}

export async function importOPML(opmlText: string) {
	if (!api) return;

	const parser = new DOMParser();
	const doc = parser.parseFromString(opmlText, "text/xml");
	const errorNode = doc.querySelector("parsererror");
	if (errorNode) {
		api.ui.showToast("Invalid OPML file", { type: "error" });
		return;
	}

	const outlines = doc.querySelectorAll("outline[xmlUrl]");
	let added = 0;

	for (const outline of Array.from(outlines)) {
		const url = outline.getAttribute("xmlUrl") || "";
		if (!url) continue;

		const existing = feeds.find((f) => f.url === url);
		if (existing) continue;

		const title = outline.getAttribute("text") || outline.getAttribute("title") || url;
		const parentOutline = outline.parentElement;
		const category = (parentOutline?.tagName === "outline" ? parentOutline.getAttribute("text") : null) || "Uncategorized";

		await addFeed(url, category, title);
		added++;
	}

	api.ui.showToast(`Imported ${added} feed${added !== 1 ? "s" : ""}`, { type: "success" });
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

// --- Persistence ---

async function saveState() {
	if (!api) return;
	try {
		await api.storage.set("feeds", JSON.stringify(feeds));
		await api.storage.set("articles", JSON.stringify(articles));
	} catch {}
}

async function loadState() {
	if (!api) return;
	try {
		const feedsJson = await api.storage.get("feeds");
		const articlesJson = await api.storage.get("articles");

		if (feedsJson) feeds = JSON.parse(feedsJson);
		if (articlesJson) articles = JSON.parse(articlesJson);

		articles.sort((a, b) => b.pubDate - a.pubDate);
	} catch {}
}

// --- Status bar ---

function updateStatusBar() {
	if (!api) return;
	const unread = getUnreadCount();
	api.ui.updateStatusBarItem("rss-reader.unread-count", {
		text: `RSS: ${unread}`,
		tooltip: `${unread} unread article${unread !== 1 ? "s" : ""}`,
		visible: true,
	});
}

// --- Auto-refresh ---

function startAutoRefresh() {
	stopAutoRefresh();
	if (refreshInterval <= 0) return;

	refreshTimer = setInterval(() => {
		refreshAllFeeds();
	}, refreshInterval * 60 * 1000);
}

function stopAutoRefresh() {
	if (refreshTimer !== null) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
}

// --- Plugin lifecycle ---

export function activate(pluginAPI: HermesPluginAPI) {
	api = pluginAPI;

	// Register panel
	api.ui.registerPanel("rss-reader-panel", RSSPanel);

	// Register commands
	api.subscriptions.push(
		api.commands.register("rss-reader.openPanel", () => {
			api!.ui.togglePanel("rss-reader-panel");
		})
	);

	api.subscriptions.push(
		api.commands.register("rss-reader.refreshAll", () => {
			refreshAllFeeds();
		})
	);

	api.subscriptions.push(
		api.commands.register("rss-reader.addFeed", () => {
			view = "add-feed";
			api!.ui.showPanel("rss-reader-panel");
			notifyListeners();
		})
	);

	// Load settings
	api.settings.getAll().then((settings) => {
		refreshInterval = parseInt(String(settings.refreshInterval ?? "30"), 10);
		maxArticlesPerFeed = parseInt(String(settings.maxArticlesPerFeed ?? "50"), 10);
		startAutoRefresh();
	});

	api.subscriptions.push(
		api.settings.onDidChange("refreshInterval", (val) => {
			refreshInterval = parseInt(String(val), 10);
			startAutoRefresh();
		})
	);

	api.subscriptions.push(
		api.settings.onDidChange("maxArticlesPerFeed", (val) => {
			maxArticlesPerFeed = parseInt(String(val), 10);
		})
	);

	// Load persisted state, then refresh
	loadState().then(() => {
		updateStatusBar();
		notifyListeners();
		// Refresh all feeds on startup
		refreshAllFeeds();
	});
}

export function deactivate() {
	stopAutoRefresh();
	api = null;
	feeds = [];
	articles = [];
	loading = new Set();
	view = "feeds";
	selectedFeedId = null;
	selectedCategory = null;
	listeners.clear();
}
