// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../RSSPanel", () => ({ RSSPanel: () => null }));

import { activate, deactivate, getState, addFeed, removeFeed, refreshFeed, refreshAllFeeds, markArticleRead, markArticleUnread, markAllReadForFeed, getUnreadCount, exportOPML, importOPML, setView } from "../activate";

function flushPromises() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function createMockAPI() {
	const storageMap = new Map<string, string>();
	const settingsCallbacks = new Map<string, (val: string | number | boolean) => void>();

	return {
		ui: {
			registerPanel: vi.fn(),
			showPanel: vi.fn(),
			hidePanel: vi.fn(),
			togglePanel: vi.fn(),
			showToast: vi.fn(),
			updateStatusBarItem: vi.fn(),
		},
		commands: {
			register: vi.fn(() => ({ dispose: vi.fn() })),
			execute: vi.fn(),
		},
		clipboard: {
			readText: vi.fn().mockResolvedValue(""),
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		storage: {
			get: vi.fn((key: string) => Promise.resolve(storageMap.get(key) ?? null)),
			set: vi.fn((key: string, value: string) => {
				storageMap.set(key, value);
				return Promise.resolve();
			}),
			delete: vi.fn((key: string) => {
				storageMap.delete(key);
				return Promise.resolve();
			}),
		},
		settings: {
			get: vi.fn().mockResolvedValue("0"),
			update: vi.fn().mockResolvedValue(undefined),
			onDidChange: vi.fn((key: string, cb: (val: string | number | boolean) => void) => {
				settingsCallbacks.set(key, cb);
				return { dispose: vi.fn() };
			}),
			getAll: vi.fn().mockResolvedValue({ refreshInterval: "0", maxArticlesPerFeed: "50" }),
		},
		network: {
			fetch: vi.fn().mockResolvedValue(""),
		},
		subscriptions: [] as { dispose(): void }[],
		__settingsCallbacks: settingsCallbacks,
		__storageMap: storageMap,
	};
}

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
	<title>Test Blog</title>
	<link>https://test.com</link>
	<description>A test blog</description>
	<item>
		<title>First Post</title>
		<link>https://test.com/first</link>
		<description>First post content</description>
		<guid>post-1</guid>
		<pubDate>Mon, 10 Mar 2025 12:00:00 GMT</pubDate>
	</item>
	<item>
		<title>Second Post</title>
		<link>https://test.com/second</link>
		<description>Second post content</description>
		<guid>post-2</guid>
		<pubDate>Tue, 11 Mar 2025 12:00:00 GMT</pubDate>
	</item>
</channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>Atom Blog</title>
	<subtitle>An atom blog</subtitle>
	<link href="https://atom.test" rel="alternate"/>
	<entry>
		<title>Atom Post</title>
		<link href="https://atom.test/post" rel="alternate"/>
		<id>atom-1</id>
		<published>2025-03-10T12:00:00Z</published>
		<summary>Atom post summary</summary>
	</entry>
</feed>`;

async function activateAndFlush(mockAPI: any) {
	activate(mockAPI);
	// Flush the settings.getAll() and loadState() promises
	await flushPromises();
	await flushPromises();
	await flushPromises();
}

describe("RSS Reader Plugin", () => {
	let mockAPI: ReturnType<typeof createMockAPI>;

	beforeEach(() => {
		mockAPI = createMockAPI();
	});

	afterEach(() => {
		deactivate();
	});

	describe("activation", () => {
		it("should register panel and commands", () => {
			activate(mockAPI as any);

			expect(mockAPI.ui.registerPanel).toHaveBeenCalledWith("rss-reader-panel", expect.any(Function));
			expect(mockAPI.commands.register).toHaveBeenCalledWith("rss-reader.openPanel", expect.any(Function));
			expect(mockAPI.commands.register).toHaveBeenCalledWith("rss-reader.refreshAll", expect.any(Function));
			expect(mockAPI.commands.register).toHaveBeenCalledWith("rss-reader.addFeed", expect.any(Function));
		});

		it("should load settings on activation", async () => {
			await activateAndFlush(mockAPI as any);

			expect(mockAPI.settings.getAll).toHaveBeenCalled();
			expect(mockAPI.settings.onDidChange).toHaveBeenCalledWith("refreshInterval", expect.any(Function));
			expect(mockAPI.settings.onDidChange).toHaveBeenCalledWith("maxArticlesPerFeed", expect.any(Function));
		});

		it("should update status bar on activation", async () => {
			await activateAndFlush(mockAPI as any);

			expect(mockAPI.ui.updateStatusBarItem).toHaveBeenCalledWith("rss-reader.unread-count", expect.objectContaining({
				text: "RSS: 0",
				visible: true,
			}));
		});
	});

	describe("deactivation", () => {
		it("should reset state on deactivate", () => {
			activate(mockAPI as any);
			deactivate();

			const state = getState();
			expect(state.feeds).toEqual([]);
			expect(state.articles).toEqual([]);
			expect(state.view).toBe("feeds");
			expect(state.selectedFeedId).toBeNull();
		});
	});

	describe("addFeed", () => {
		it("should add a feed and fetch articles", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml", "Test");

			const state = getState();
			expect(state.feeds).toHaveLength(1);
			expect(state.feeds[0].title).toBe("Test Blog");
			expect(state.feeds[0].category).toBe("Test");
			expect(state.articles).toHaveLength(2);
			expect(mockAPI.ui.showToast).toHaveBeenCalledWith(expect.stringContaining("Test Blog"), expect.objectContaining({ type: "success" }));
		});

		it("should reject duplicate feed URLs", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");
			await addFeed("https://test.com/feed.xml");

			expect(mockAPI.ui.showToast).toHaveBeenCalledWith("Feed already added", expect.objectContaining({ type: "warning" }));
			expect(getState().feeds).toHaveLength(1);
		});

		it("should handle fetch failure gracefully", async () => {
			mockAPI.network.fetch.mockRejectedValue(new Error("Network error"));
			await activateAndFlush(mockAPI as any);

			await addFeed("https://bad.url/feed.xml");

			expect(getState().feeds).toHaveLength(0);
			expect(mockAPI.ui.showToast).toHaveBeenCalledWith(expect.stringContaining("Failed to load feed"), expect.objectContaining({ type: "error" }));
		});
	});

	describe("removeFeed", () => {
		it("should remove feed and its articles", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml", "Test");

			const feedId = getState().feeds[0].id;
			await removeFeed(feedId);

			expect(getState().feeds).toHaveLength(0);
			expect(getState().articles).toHaveLength(0);
		});
	});

	describe("article read state", () => {
		it("should mark articles as read", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			const articleId = getState().articles[0].id;
			await markArticleRead(articleId);

			expect(getState().articles.find((a) => a.id === articleId)?.read).toBe(true);
		});

		it("should mark articles as unread", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			const articleId = getState().articles[0].id;
			await markArticleRead(articleId);
			await markArticleUnread(articleId);

			expect(getState().articles.find((a) => a.id === articleId)?.read).toBe(false);
		});

		it("should mark all articles read for a feed", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			const feedId = getState().feeds[0].id;
			await markAllReadForFeed(feedId);

			expect(getState().articles.every((a) => a.read)).toBe(true);
		});
	});

	describe("unread count", () => {
		it("should count unread articles", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			expect(getUnreadCount()).toBe(2);

			const articleId = getState().articles[0].id;
			await markArticleRead(articleId);

			expect(getUnreadCount()).toBe(1);
		});

		it("should update status bar when unread count changes", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			expect(mockAPI.ui.updateStatusBarItem).toHaveBeenCalledWith("rss-reader.unread-count", expect.objectContaining({
				text: "RSS: 2",
			}));
		});
	});

	describe("OPML", () => {
		it("should export feeds as OPML", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml", "Blogs");

			const opml = exportOPML();
			expect(opml).toContain("<opml");
			expect(opml).toContain("Test Blog");
			expect(opml).toContain("https://test.com/feed.xml");
			expect(opml).toContain("Blogs");
		});

		it("should import feeds from OPML", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<body>
	<outline text="Tech">
		<outline type="rss" text="Imported Blog" xmlUrl="https://imported.com/feed.xml" />
	</outline>
</body>
</opml>`;

			await importOPML(opml);

			const state = getState();
			expect(state.feeds).toHaveLength(1);
			expect(state.feeds[0].category).toBe("Tech");
		});
	});

	describe("view navigation", () => {
		it("should switch views", () => {
			activate(mockAPI as any);

			setView("suggestions");
			expect(getState().view).toBe("suggestions");

			setView("add-feed");
			expect(getState().view).toBe("add-feed");

			setView("feeds");
			expect(getState().view).toBe("feeds");
		});
	});

	describe("persistence", () => {
		it("should save state to storage after adding feed", async () => {
			mockAPI.network.fetch.mockResolvedValue(SAMPLE_RSS);
			await activateAndFlush(mockAPI as any);

			await addFeed("https://test.com/feed.xml");

			expect(mockAPI.storage.set).toHaveBeenCalledWith("feeds", expect.any(String));
			expect(mockAPI.storage.set).toHaveBeenCalledWith("articles", expect.any(String));
		});

		it("should load state from storage on activation", async () => {
			const feeds = [{ id: "f1", url: "https://test.com/feed", title: "Saved Feed", description: "", siteUrl: "", category: "Test", addedAt: Date.now() }];
			const articles = [{ id: "a1", feedId: "f1", title: "Saved Article", link: "", description: "", pubDate: Date.now(), read: false }];

			mockAPI.__storageMap.set("feeds", JSON.stringify(feeds));
			mockAPI.__storageMap.set("articles", JSON.stringify(articles));

			await activateAndFlush(mockAPI as any);

			const state = getState();
			expect(state.feeds).toHaveLength(1);
			expect(state.feeds[0].title).toBe("Saved Feed");
			expect(state.articles).toHaveLength(1);
		});
	});
});
