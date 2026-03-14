import * as React from "react";
import {
	getState, getAPI, subscribe, setView, setSelectedFeed, setSelectedCategory,
	addFeed, removeFeed, refreshFeed, refreshAllFeeds,
	markArticleRead, markArticleUnread, markAllReadForFeed, getUnreadCount,
	exportOPML, importOPML,
} from "./activate";
import { SUGGESTED_FEEDS } from "./suggestions";
import { FeedState } from "./types";

const { useState, useEffect, useRef } = React;

// --- Styles ---

const s = {
	root: {
		display: "flex",
		flexDirection: "column" as const,
		height: "100%",
		minWidth: "240px",
		maxWidth: "420px",
		borderRight: "1px solid var(--border)",
		background: "var(--bg-1)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		overflow: "hidden",
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "12px 12px 8px",
		borderBottom: "1px solid var(--border)",
	},
	headerTitle: {
		margin: 0,
		fontSize: "var(--text-xs)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		color: "var(--text-2)",
		letterSpacing: "0.05em",
	},
	headerActions: {
		display: "flex",
		gap: "4px",
	},
	iconBtn: {
		background: "none",
		border: "none",
		color: "var(--text-2)",
		cursor: "pointer",
		padding: "4px",
		borderRadius: "var(--radius-sm)",
		fontSize: "var(--text-sm)",
		lineHeight: 1,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	body: {
		flex: 1,
		overflowY: "auto" as const,
		padding: "8px 0",
	},
	empty: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		justifyContent: "center",
		padding: "32px 16px",
		gap: "12px",
		color: "var(--text-2)",
		textAlign: "center" as const,
	},
	feedItem: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "6px 12px",
		cursor: "pointer",
		gap: "8px",
	},
	feedTitle: {
		flex: 1,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	badge: {
		background: "var(--accent)",
		color: "var(--bg-1)",
		borderRadius: "9px",
		padding: "1px 6px",
		fontSize: "var(--text-sm)",
		fontWeight: 600,
		minWidth: "18px",
		textAlign: "center" as const,
		flexShrink: 0,
	},
	categoryHeader: {
		padding: "8px 12px 4px",
		fontSize: "var(--text-sm)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		color: "var(--text-3)",
		letterSpacing: "0.05em",
	},
	articleItem: {
		display: "flex",
		flexDirection: "column" as const,
		padding: "8px 12px",
		cursor: "pointer",
		gap: "2px",
		borderBottom: "1px solid var(--border)",
	},
	articleTitle: {
		fontSize: "var(--text-xs)",
		lineHeight: 1.4,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	articleMeta: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
	},
	articleDesc: {
		fontSize: "var(--text-sm)",
		color: "var(--text-2)",
		lineHeight: 1.3,
		overflow: "hidden",
		textOverflow: "ellipsis",
		display: "-webkit-box",
		WebkitLineClamp: 2,
		WebkitBoxOrient: "vertical" as const,
	},
	input: {
		width: "100%",
		padding: "6px 8px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		outline: "none",
		boxSizing: "border-box" as const,
	},
	select: {
		width: "100%",
		padding: "6px 8px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		outline: "none",
		boxSizing: "border-box" as const,
	},
	btn: {
		background: "var(--accent)",
		color: "var(--bg-1)",
		border: "none",
		borderRadius: "var(--radius-sm)",
		padding: "6px 12px",
		cursor: "pointer",
		fontSize: "var(--text-xs)",
		fontFamily: "var(--font-mono)",
		fontWeight: 500,
	},
	btnSecondary: {
		background: "var(--bg-3)",
		color: "var(--text-1)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		padding: "6px 12px",
		cursor: "pointer",
		fontSize: "var(--text-xs)",
		fontFamily: "var(--font-mono)",
		fontWeight: 500,
	},
	form: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "10px",
		padding: "12px",
	},
	label: {
		fontSize: "var(--text-xs)",
		color: "var(--text-2)",
		marginBottom: "2px",
	},
	suggestedItem: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "6px 12px",
		gap: "8px",
	},
	suggestedInfo: {
		flex: 1,
		overflow: "hidden",
	},
	suggestedTitle: {
		fontSize: "var(--text-xs)",
		fontWeight: 500,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	suggestedDesc: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	textarea: {
		width: "100%",
		minHeight: "120px",
		padding: "8px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		outline: "none",
		resize: "vertical" as const,
		boxSizing: "border-box" as const,
	},
};

// --- Helpers ---

function timeAgo(ts: number): string {
	const seconds = Math.floor((Date.now() - ts) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

// --- Main Panel ---

export function RSSPanel() {
	const [state, setState] = useState<FeedState>(getState);

	useEffect(() => subscribe(() => setState(getState())), []);

	return (
		<div style={s.root}>
			{state.view === "feeds" && <FeedListView state={state} />}
			{state.view === "articles" && <ArticleListView state={state} />}
			{state.view === "add-feed" && <AddFeedView state={state} />}
			{state.view === "suggestions" && <SuggestionsView state={state} />}
			{state.view === "import-export" && <ImportExportView />}
		</div>
	);
}

// --- Feed List View ---

function FeedListView({ state }: { state: FeedState }) {
	const feedsByCategory = new Map<string, typeof state.feeds>();
	for (const feed of state.feeds) {
		const cat = feed.category || "Uncategorized";
		if (!feedsByCategory.has(cat)) feedsByCategory.set(cat, []);
		feedsByCategory.get(cat)!.push(feed);
	}

	const sortedCategories = [...feedsByCategory.keys()].sort();

	return (
		<>
			<div style={s.header}>
				<h3 style={s.headerTitle}>RSS Feeds</h3>
				<div style={s.headerActions}>
					<button
						style={s.iconBtn}
						title="Add feed"
						onClick={() => setView("add-feed")}
					>
						+
					</button>
					<button
						style={s.iconBtn}
						title="Suggested feeds"
						onClick={() => setView("suggestions")}
					>
						☆
					</button>
					<button
						style={s.iconBtn}
						title="Import / Export"
						onClick={() => setView("import-export")}
					>
						⇄
					</button>
					<button
						style={s.iconBtn}
						title="Refresh all"
						onClick={() => refreshAllFeeds()}
					>
						↻
					</button>
				</div>
			</div>
			<div style={s.body}>
				{state.feeds.length === 0 ? (
					<div style={s.empty}>
						<div style={{ fontSize: "24px", opacity: 0.4 }}>◉</div>
						<div>No feeds yet</div>
						<button style={s.btn} onClick={() => setView("suggestions")}>
							Browse Suggestions
						</button>
						<button style={s.btnSecondary} onClick={() => setView("add-feed")}>
							Add Feed Manually
						</button>
					</div>
				) : (
					sortedCategories.map((cat) => (
						<div key={cat}>
							<div style={s.categoryHeader}>{cat}</div>
							{feedsByCategory.get(cat)!.map((feed) => {
								const unread = getUnreadCount(feed.id);
								const isLoading = state.loading.has(feed.id);
								return (
									<div
										key={feed.id}
										style={{
											...s.feedItem,
											background: "transparent",
										}}
										onMouseEnter={(e) => {
											(e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)";
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLDivElement).style.background = "transparent";
										}}
										onClick={() => setSelectedFeed(feed.id)}
									>
										<span style={s.feedTitle}>
											{isLoading ? "⟳ " : ""}
											{feed.title}
										</span>
										{unread > 0 && (
											<span style={s.badge}>{unread}</span>
										)}
										<button
											style={{ ...s.iconBtn, fontSize: "var(--text-xs)", opacity: 0.4, flexShrink: 0 }}
											title={`Unsubscribe from ${feed.title}`}
											onClick={(e) => {
												e.stopPropagation();
												removeFeed(feed.id);
											}}
										>
											✕
										</button>
									</div>
								);
							})}
						</div>
					))
				)}
			</div>
		</>
	);
}

// --- Article List View ---

function ArticleListView({ state }: { state: FeedState }) {
	const feed = state.feeds.find((f) => f.id === state.selectedFeedId);
	if (!feed) {
		setView("feeds");
		return null;
	}

	const feedArticles = state.articles.filter((a) => a.feedId === feed.id);
	const unread = getUnreadCount(feed.id);

	return (
		<>
			<div style={s.header}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, overflow: "hidden" }}>
					<button
						style={s.iconBtn}
						title="Back to feeds"
						onClick={() => setView("feeds")}
					>
						←
					</button>
					<div style={{ overflow: "hidden", flex: 1 }}>
						<h3 style={{ ...s.headerTitle, textTransform: "none" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
							{feed.title}
						</h3>
						{(feed.siteUrl || feed.url) && (
							<div style={{ fontSize: "var(--text-sm)", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
								{feed.siteUrl || feed.url}
							</div>
						)}
					</div>
				</div>
				<div style={s.headerActions}>
					{unread > 0 && (
						<button
							style={s.iconBtn}
							title="Mark all read"
							onClick={() => markAllReadForFeed(feed.id)}
						>
							✓
						</button>
					)}
					<button
						style={s.iconBtn}
						title="Refresh"
						onClick={() => refreshFeed(feed.id)}
					>
						↻
					</button>
					<button
						style={s.iconBtn}
						title="Remove feed"
						onClick={() => {
							removeFeed(feed.id);
						}}
					>
						✕
					</button>
				</div>
			</div>
			<div style={s.body}>
				{feedArticles.length === 0 ? (
					<div style={s.empty}>
						<div>No articles yet</div>
					</div>
				) : (
					feedArticles.map((article) => (
						<div
							key={article.id}
							style={{
								...s.articleItem,
								opacity: article.read ? 0.6 : 1,
								background: "transparent",
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLDivElement).style.background = "transparent";
							}}
							onClick={() => {
								markArticleRead(article.id);
								if (article.link) {
									const api = getAPI();
									api.shell.openExternal(article.link);
								}
							}}
							onContextMenu={(e) => {
								e.preventDefault();
								if (article.read) {
									markArticleUnread(article.id);
								} else {
									markArticleRead(article.id);
								}
							}}
						>
							<div style={s.articleTitle}>
								<span style={{ marginRight: "6px", fontSize: "8px" }}>
									{article.read ? "○" : "●"}
								</span>
								{article.title}
							</div>
							{article.description && (
								<div style={s.articleDesc}>{article.description}</div>
							)}
							<div style={s.articleMeta}>
								{timeAgo(article.pubDate)}
							</div>
						</div>
					))
				)}
			</div>
		</>
	);
}

// --- Add Feed View ---

function AddFeedView({ state }: { state: FeedState }) {
	const [url, setUrl] = useState("");
	const [category, setCategory] = useState("Uncategorized");
	const [customCategory, setCustomCategory] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const categories = [...state.categories, "Uncategorized"];
	const uniqueCategories = [...new Set(categories)].sort();

	const handleSubmit = () => {
		const trimmed = url.trim();
		if (!trimmed) return;
		const cat = category === "__new__" ? customCategory.trim() || "Uncategorized" : category;
		addFeed(trimmed, cat);
		setUrl("");
	};

	return (
		<>
			<div style={s.header}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button style={s.iconBtn} onClick={() => setView("feeds")}>←</button>
					<h3 style={s.headerTitle}>Add Feed</h3>
				</div>
			</div>
			<div style={s.form}>
				<div>
					<div style={s.label}>Feed URL</div>
					<input
						ref={inputRef}
						style={s.input}
						type="url"
						placeholder="https://example.com/feed.xml"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSubmit();
						}}
					/>
				</div>
				<div>
					<div style={s.label}>Category</div>
					<select
						style={s.select}
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						{uniqueCategories.map((cat) => (
							<option key={cat} value={cat}>{cat}</option>
						))}
						<option value="__new__">+ New Category</option>
					</select>
				</div>
				{category === "__new__" && (
					<div>
						<div style={s.label}>New Category Name</div>
						<input
							style={s.input}
							type="text"
							placeholder="Category name"
							value={customCategory}
							onChange={(e) => setCustomCategory(e.target.value)}
						/>
					</div>
				)}
				<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
					<button style={s.btnSecondary} onClick={() => setView("feeds")}>
						Cancel
					</button>
					<button style={s.btn} onClick={handleSubmit} disabled={!url.trim()}>
						Add Feed
					</button>
				</div>
			</div>
		</>
	);
}

// --- Suggestions View ---

function SuggestionsView({ state }: { state: FeedState }) {
	const existingUrls = new Set(state.feeds.map((f) => f.url));
	const categories = [...new Set(SUGGESTED_FEEDS.map((f) => f.category))];

	return (
		<>
			<div style={s.header}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button style={s.iconBtn} onClick={() => setView("feeds")}>←</button>
					<h3 style={s.headerTitle}>Suggested Feeds</h3>
				</div>
			</div>
			<div style={s.body}>
				{categories.map((cat) => {
					const available = SUGGESTED_FEEDS.filter(
						(f) => f.category === cat && !existingUrls.has(f.url),
					);
					if (available.length === 0) return null;
					return (
						<div key={cat}>
							<div style={s.categoryHeader}>{cat}</div>
							{available.map((suggested) => (
								<div key={suggested.url} style={s.suggestedItem}>
									<div style={s.suggestedInfo}>
										<div style={s.suggestedTitle}>{suggested.title}</div>
										<div style={s.suggestedDesc}>{suggested.description}</div>
									</div>
									<button
										style={{ ...s.iconBtn, color: "var(--accent)", fontSize: "var(--text-sm)" }}
										title={`Add ${suggested.title}`}
										onClick={() => addFeed(suggested.url, suggested.category, suggested.title, { stayInView: true })}
									>
										+
									</button>
								</div>
							))}
						</div>
					);
				})}
				{SUGGESTED_FEEDS.every((f) => existingUrls.has(f.url)) && (
					<div style={s.empty}>
						<div>All suggested feeds have been added</div>
					</div>
				)}
			</div>
		</>
	);
}

// --- Import/Export View ---

function ImportExportView() {
	const api = getAPI();
	const [opmlText, setOpmlText] = useState("");

	return (
		<>
			<div style={s.header}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button style={s.iconBtn} onClick={() => setView("feeds")}>←</button>
					<h3 style={s.headerTitle}>Import / Export</h3>
				</div>
			</div>
			<div style={s.form}>
				<div style={s.label}>Export OPML</div>
				<p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-3)" }}>
					Copy your feed subscriptions as OPML to import into other readers.
				</p>
				<button
					style={s.btn}
					onClick={async () => {
						const opml = exportOPML();
						await api.clipboard.writeText(opml);
						api.ui.showToast("OPML copied to clipboard", { type: "success" });
					}}
				>
					Copy OPML to Clipboard
				</button>

				<div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

				<div style={s.label}>Import OPML</div>
				<p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-3)" }}>
					Paste OPML content below or import from clipboard.
				</p>
				<textarea
					style={s.textarea}
					placeholder="Paste OPML content here..."
					value={opmlText}
					onChange={(e) => setOpmlText(e.target.value)}
				/>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						style={s.btnSecondary}
						onClick={async () => {
							const text = await api.clipboard.readText();
							if (text) {
								setOpmlText(text);
								api.ui.showToast("Pasted from clipboard", { type: "info" });
							}
						}}
					>
						Paste from Clipboard
					</button>
					<button
						style={s.btn}
						onClick={() => {
							if (opmlText.trim()) {
								importOPML(opmlText);
								setOpmlText("");
								setView("feeds");
							}
						}}
						disabled={!opmlText.trim()}
					>
						Import
					</button>
				</div>
			</div>
		</>
	);
}
