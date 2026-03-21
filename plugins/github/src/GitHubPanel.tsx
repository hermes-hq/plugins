import * as React from "react";
import {
	getState, subscribe,
	startDeviceFlow, disconnect, refreshData, loadMore,
	setView, clearError, ignorePR, unignorePR, toggleRepoFilter, clearRepoFilters, getRepos,
	type GitHubState, type View, type PullRequest, type Notification,
} from "./activate";

const { useState, useEffect, useRef } = React;

// ─── Helpers ──────────────────────────────────────────────

function timeAgo(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function repoShort(full: string): string {
	return full.split("/").pop() ?? full;
}

function repoOwner(full: string): string {
	return full.split("/")[0] ?? "";
}

const REASON_LABELS: Record<string, string> = {
	review_requested: "Review", mention: "Mentioned", author: "Author",
	comment: "Comment", assign: "Assigned", state_change: "State",
	ci_activity: "CI", subscribed: "Watching",
};

// ─── Connect Screen ───────────────────────────────────────

function ConnectView() {
	return React.createElement("div", { style: S.center },
		React.createElement("div", { style: S.connectIcon, dangerouslySetInnerHTML: { __html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>' } }),
		React.createElement("div", { style: S.connectTitle }, "Connect GitHub"),
		React.createElement("div", { style: S.connectDesc }, "See PRs to review, your open PRs, and notifications — all in one place."),
		React.createElement("button", { style: S.connectBtn, onClick: startDeviceFlow }, "Connect with GitHub"),
	);
}

// ─── Authorizing Screen ───────────────────────────────────

function AuthorizingView({ state: s }: { state: GitHubState }) {
	const [copied, setCopied] = React.useState(false);
	const copyCode = () => {
		navigator.clipboard.writeText(s.deviceCode!.user_code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}).catch(() => {});
	};

	if (!s.deviceCode) {
		return React.createElement("div", { style: S.center },
			React.createElement("div", { style: S.spinner }),
			React.createElement("div", { style: { marginTop: "8px", fontSize: "var(--text-base)", color: "var(--text-3)" } }, "Starting authorization..."),
		);
	}

	return React.createElement("div", { style: S.center },
		React.createElement("div", { style: { fontSize: "var(--text-sm)", color: "var(--text-3)", textTransform: "uppercase" as const, letterSpacing: "1px", fontWeight: 600 } }, "Your code"),
		React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" } },
			React.createElement("div", { style: S.codeBox }, s.deviceCode.user_code),
			React.createElement("button", { style: S.copyBtn, onClick: copyCode, title: "Copy code" }, copied ? "Copied!" : "Copy"),
		),
		React.createElement("div", { style: { fontSize: "var(--text-base)", color: "var(--text-2)", marginTop: "12px", textAlign: "center" as const, lineHeight: 1.5 } },
			"Paste this code on GitHub to connect your account."
		),
		React.createElement("a", { href: s.deviceCode.verification_uri, target: "_blank", rel: "noopener noreferrer", style: S.ghLink }, "Open github.com/login/device →"),
		React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginTop: "20px" } },
			React.createElement("div", { style: S.spinner }),
			React.createElement("span", { style: { fontSize: "var(--text-sm)", color: "var(--text-3)" } }, "Waiting for authorization..."),
		),
		React.createElement("button", { style: { ...S.btnSecondary, marginTop: "8px" }, onClick: disconnect }, "Cancel"),
	);
}

// ─── Repo Multiselect Dropdown ────────────────────────────

function RepoFilterBar({ repoFilters }: { repoFilters: string[] }) {
	const repos = getRepos();
	const [open, setOpen] = useState(false);
	const dropRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	if (repos.length <= 1) return null;

	const active = new Set(repoFilters);
	const label = active.size === 0
		? "All repositories"
		: active.size === 1
			? [...active][0]
			: `${active.size} repositories`;

	return React.createElement("div", { style: S.filterBar, ref: dropRef },
		React.createElement("button", {
			style: S.filterTrigger,
			onClick: () => setOpen(!open),
		},
			React.createElement("span", { style: { flex: 1, textAlign: "left" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } }, label),
			React.createElement("span", { style: { opacity: 0.5, fontSize: "var(--text-sm)" } }, open ? "▲" : "▼"),
		),
		open && React.createElement("div", { style: S.filterDropdown },
			active.size > 0 && React.createElement("button", {
				style: S.filterClearBtn,
				onClick: () => { clearRepoFilters(); },
			}, "Clear filters"),
			...repos.map(repo =>
				React.createElement("label", {
					key: repo,
					style: S.filterOption,
					onClick: () => toggleRepoFilter(repo),
				},
					React.createElement("div", {
						style: { ...S.checkbox, ...(active.has(repo) ? S.checkboxChecked : {}) },
					}, active.has(repo) ? "✓" : ""),
					React.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } }, repo),
				)
			),
		),
	);
}

// ─── PR Item ──────────────────────────────────────────────

function PRItem({ pr, showIgnore, ignored }: { pr: PullRequest; showIgnore?: boolean; ignored?: boolean }) {
	return React.createElement("div", { style: { ...S.listItem, ...(ignored ? { opacity: 0.4 } : {}) } },
		React.createElement("a", { href: pr.html_url, target: "_blank", rel: "noopener noreferrer", style: S.prLink },
			React.createElement("div", { style: S.prHeader },
				React.createElement("span", { style: S.prRepo }, repoShort(pr.repo_full_name ?? "")),
				React.createElement("span", { style: S.prNumber }, `#${pr.number}`),
				pr.draft && React.createElement("span", { style: S.draftBadge }, "Draft"),
				React.createElement("span", { style: { flex: 1 } }),
				React.createElement("span", { style: { fontSize: "var(--text-sm)", color: "var(--text-3)" } }, timeAgo(pr.updated_at)),
			),
			React.createElement("div", { style: S.prTitle }, pr.title),
			React.createElement("div", { style: S.prMeta },
				React.createElement("span", null, pr.user.login),
				React.createElement("span", { style: { opacity: 0.3 } }, "·"),
				React.createElement("span", { style: { opacity: 0.6 } }, repoOwner(pr.repo_full_name ?? "")),
			),
		),
		showIgnore && React.createElement("button", {
			style: S.ignoreBtn,
			onClick: (e: React.MouseEvent) => { e.stopPropagation(); ignored ? unignorePR(pr.id) : ignorePR(pr.id); },
			title: ignored ? "Show again" : "Hide from reviews",
		}, ignored ? "Undo" : "Hide"),
	);
}

// ─── PR List ──────────────────────────────────────────────

function PRList({ prs, emptyText, showIgnore, ignoredIds, hasMore, loadMoreType, repoFilters }: {
	prs: PullRequest[];
	emptyText: string;
	showIgnore?: boolean;
	ignoredIds?: Set<number>;
	hasMore?: boolean;
	loadMoreType?: "reviews" | "my-prs";
	repoFilters: string[];
}) {
	const filterSet = new Set(repoFilters);
	const visible = prs.filter(pr => {
		if (filterSet.size > 0 && !filterSet.has(pr.repo_full_name ?? "")) return false;
		if (showIgnore && ignoredIds?.has(pr.id)) return false;
		return true;
	});

	const ignored = showIgnore ? prs.filter(pr => ignoredIds?.has(pr.id)) : [];
	const [showIgnored, setShowIgnored] = useState(false);

	if (visible.length === 0 && ignored.length === 0) {
		return React.createElement("div", { style: S.empty }, emptyText);
	}

	return React.createElement("div", { style: S.list },
		...visible.map(pr => React.createElement(PRItem, { key: pr.id, pr, showIgnore })),
		hasMore && loadMoreType && React.createElement("button", {
			style: S.loadMoreBtn,
			onClick: () => loadMore(loadMoreType),
		}, "Load more"),
		ignored.length > 0 && React.createElement("div", { style: { marginTop: "8px" } },
			React.createElement("button", {
				style: S.showIgnoredBtn,
				onClick: () => setShowIgnored(!showIgnored),
			}, `${showIgnored ? "Hide" : "Show"} ${ignored.length} hidden`),
			showIgnored && ignored.map(pr =>
				React.createElement(PRItem, { key: pr.id, pr, showIgnore: true, ignored: true })
			),
		),
	);
}

// ─── Notification Item ────────────────────────────────────

function NotificationItem({ notif }: { notif: Notification }) {
	return React.createElement("a", {
		href: notif.repository.html_url,
		target: "_blank",
		rel: "noopener noreferrer",
		style: S.listItem,
	},
		React.createElement("div", { style: S.prHeader },
			React.createElement("span", { style: S.prRepo }, repoShort(notif.repository.full_name)),
			React.createElement("span", { style: { ...S.draftBadge, background: "var(--accent)", color: "#000" } },
				REASON_LABELS[notif.reason] ?? notif.reason
			),
			React.createElement("span", { style: { flex: 1 } }),
			React.createElement("span", { style: { fontSize: "var(--text-sm)", color: "var(--text-3)" } }, timeAgo(notif.updated_at)),
		),
		React.createElement("div", { style: S.prTitle }, notif.subject.title),
		React.createElement("div", { style: S.prMeta },
			React.createElement("span", null, notif.subject.type),
			notif.unread && React.createElement("span", { style: S.unreadDot }),
		),
	);
}

function NotificationList({ notifications, hasMore, repoFilters }: { notifications: Notification[]; hasMore: boolean; repoFilters: string[] }) {
	const filterSet = new Set(repoFilters);
	const visible = filterSet.size > 0
		? notifications.filter(n => filterSet.has(n.repository.full_name))
		: notifications;

	if (visible.length === 0) {
		return React.createElement("div", { style: S.empty }, "No notifications");
	}
	return React.createElement("div", { style: S.list },
		...visible.map(n => React.createElement(NotificationItem, { key: n.id, notif: n })),
		hasMore && React.createElement("button", {
			style: S.loadMoreBtn,
			onClick: () => loadMore("notifications"),
		}, "Load more"),
	);
}

// ─── Tab Bar ──────────────────────────────────────────────

function TabBar({ view, reviewCount, prCount, notifCount }: {
	view: View; reviewCount: number; prCount: number; notifCount: number;
}) {
	const tab = (id: View, label: string, count: number) =>
		React.createElement("button", {
			key: id,
			style: { ...S.tab, ...(view === id ? S.tabActive : {}) },
			onClick: () => setView(id),
		}, label, count > 0 && React.createElement("span", { style: S.tabBadge }, count));

	return React.createElement("div", { style: S.tabs },
		tab("reviews", "Reviews", reviewCount),
		tab("my-prs", "My PRs", prCount),
		tab("notifications", "Notifs", notifCount),
	);
}

// ─── Disconnect Button (React-based confirm, not native) ──

function DisconnectButton() {
	const [confirming, setConfirming] = useState(false);
	if (confirming) {
		return React.createElement("div", { style: S.disconnectRow },
			React.createElement("span", { style: { fontSize: "var(--text-base)", color: "var(--text-2)" } }, "Disconnect GitHub?"),
			React.createElement("div", { style: { display: "flex", gap: "6px", marginTop: "6px", justifyContent: "center" } },
				React.createElement("button", { style: S.disconnectConfirm, onClick: () => disconnect() }, "Yes, disconnect"),
				React.createElement("button", { style: S.disconnectCancel, onClick: () => setConfirming(false) }, "Cancel"),
			),
		);
	}
	return React.createElement("div", { style: S.disconnectRow },
		React.createElement("button", { style: S.disconnectBtn, onClick: () => setConfirming(true) }, "Disconnect GitHub"),
	);
}

// ─── Main Panel ───────────────────────────────────────────

export function GitHubPanel() {
	const [s, setS] = useState<GitHubState>(getState());
	useEffect(() => subscribe(() => setS(getState())), []);

	if (s.view === "connect") {
		return React.createElement("div", { style: S.root },
			s.error && React.createElement("div", { style: S.error }, s.error, React.createElement("button", { style: S.errorDismiss, onClick: clearError }, "×")),
			React.createElement(ConnectView),
		);
	}

	if (s.view === "authorizing") {
		return React.createElement("div", { style: S.root }, React.createElement(AuthorizingView, { state: s }));
	}

	const unreadNotifs = s.notifications.filter(n => n.unread).length;
	const visibleReviews = s.reviewPRs.filter(pr => !s.ignoredPRIds.has(pr.id)).length;

	return React.createElement("div", { style: S.root },
		React.createElement("div", { style: S.header },
			s.user && React.createElement("div", { style: S.userInfo },
				React.createElement("img", { src: s.user.avatar_url, style: S.avatar }),
				React.createElement("span", { style: { fontSize: "var(--text-base)", fontWeight: 500 } }, s.user.login),
			),
			React.createElement("div", { style: { display: "flex", gap: "4px", marginLeft: "auto" } },
				s.loading && React.createElement("div", { style: { ...S.spinner, width: "12px", height: "12px" } }),
				React.createElement("button", { style: S.btnIcon, onClick: () => refreshData(), title: "Refresh", disabled: s.loading }, "↻"),
			),
		),
		s.error && React.createElement("div", { style: S.error }, s.error, React.createElement("button", { style: S.errorDismiss, onClick: clearError }, "×")),
		React.createElement(TabBar, { view: s.view, reviewCount: visibleReviews, prCount: s.myPRs.length, notifCount: unreadNotifs }),
		React.createElement(RepoFilterBar, { repoFilters: s.repoFilters }),
		s.view === "reviews" && React.createElement(PRList, {
			prs: s.reviewPRs, emptyText: "No PRs waiting for your review",
			showIgnore: true, ignoredIds: s.ignoredPRIds,
			hasMore: s.hasMoreReviews, loadMoreType: "reviews",
			repoFilters: s.repoFilters,
		}),
		s.view === "my-prs" && React.createElement(PRList, {
			prs: s.myPRs, emptyText: "No open PRs",
			hasMore: s.hasMoreMyPRs, loadMoreType: "my-prs",
			repoFilters: s.repoFilters,
		}),
		s.view === "notifications" && React.createElement(NotificationList, {
			notifications: s.notifications,
			hasMore: s.hasMoreNotifs,
			repoFilters: s.repoFilters,
		}),
		s.loadingMore && React.createElement("div", { style: { textAlign: "center" as const, padding: "8px" } },
			React.createElement("div", { style: S.spinner }),
		),
		React.createElement(DisconnectButton),
	);
}

// ─── Styles ───────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
	root: { display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-mono)", color: "var(--text-0)", background: "var(--bg-1)", overflow: "hidden" },
	header: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
	userInfo: { display: "flex", alignItems: "center", gap: "8px" },
	avatar: { width: "22px", height: "22px", borderRadius: "50%" },

	tabs: { display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 },
	tab: { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "10px 4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "color 0.1s" },
	tabActive: { color: "var(--accent)", borderBottomColor: "var(--accent)", fontWeight: 600 },
	tabBadge: { fontSize: "var(--text-sm)", background: "var(--accent)", color: "#000", borderRadius: "8px", padding: "0 5px", lineHeight: "16px", fontWeight: 700, minWidth: "16px", textAlign: "center" as const },

	// Filters
	filterBar: { position: "relative" as const, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
	filterTrigger: { width: "100%", display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "7px 10px", cursor: "pointer", outline: "none" },
	filterDropdown: { position: "absolute" as const, left: "10px", right: "10px", top: "100%", zIndex: 50, background: "var(--bg-0)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px", maxHeight: "200px", overflowY: "auto" as const, boxShadow: "0 6px 20px rgba(0,0,0,0.4)" },
	filterOption: { display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "var(--text-base)", color: "var(--text-1)", transition: "background 0.08s" },
	checkbox: { width: "16px", height: "16px", borderRadius: "4px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "transparent", flexShrink: 0, background: "var(--bg-2)" },
	checkboxChecked: { background: "var(--accent)", borderColor: "var(--accent)", color: "#000" },
	filterClearBtn: { display: "block", width: "100%", background: "none", border: "none", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "6px 8px", cursor: "pointer", textAlign: "left" as const, borderBottom: "1px solid var(--border)", marginBottom: "4px" },

	// List
	list: { flex: 1, overflowY: "auto" as const, padding: "6px" },
	listItem: { display: "flex", alignItems: "start", gap: "8px", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", textDecoration: "none", color: "inherit", marginBottom: "2px", transition: "background 0.1s" },
	prLink: { flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 },
	prHeader: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" },
	prRepo: { fontSize: "var(--text-base)", color: "var(--accent)", fontWeight: 500 },
	prNumber: { fontSize: "var(--text-base)", color: "var(--text-3)" },
	prTitle: { fontSize: "var(--text-base)", color: "var(--text-0)", fontWeight: 500, lineHeight: 1.4 },
	prMeta: { display: "flex", alignItems: "center", gap: "5px", marginTop: "4px", fontSize: "var(--text-base)", color: "var(--text-3)" },
	draftBadge: { fontSize: "var(--text-sm)", fontWeight: 600, background: "var(--bg-3)", color: "var(--text-3)", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" as const, letterSpacing: "0.3px" },
	unreadDot: { width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 },
	ignoreBtn: { background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "4px 8px", cursor: "pointer", flexShrink: 0, alignSelf: "center" as const },
	labels: { display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" as const },
	label: { fontSize: "8px", padding: "1px 5px", borderRadius: "3px", border: "1px solid" },

	// Load more
	loadMoreBtn: { display: "block", width: "100%", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "10px", cursor: "pointer", marginTop: "4px", textAlign: "center" as const },
	showIgnoredBtn: { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", cursor: "pointer", padding: "8px 12px", width: "100%", textAlign: "center" as const },

	// Empty
	empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-base)", color: "var(--text-3)", padding: "20px" },

	// Connect
	center: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", gap: "8px" },
	connectIcon: { color: "var(--text-3)", marginBottom: "8px" },
	connectTitle: { fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-0)" },
	connectDesc: { fontSize: "var(--text-base)", color: "var(--text-3)", textAlign: "center" as const, maxWidth: "220px", lineHeight: 1.5 },
	connectBtn: { marginTop: "12px", background: "var(--text-0)", border: "none", borderRadius: "6px", color: "var(--bg-1)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, padding: "8px 20px", cursor: "pointer" },
	codeBox: { fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent)", background: "var(--bg-2)", border: "2px solid var(--accent)", borderRadius: "8px", padding: "10px 20px", letterSpacing: "6px", userSelect: "all" as const },
	copyBtn: { background: "var(--accent)", border: "none", borderRadius: "6px", color: "#000", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap" as const },
	ghLink: { fontSize: "var(--text-base)", color: "var(--accent)", textDecoration: "none", marginTop: "6px", fontWeight: 500 },

	// Buttons
	btnIcon: { background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "14px", padding: "2px 4px", lineHeight: 1 },
	btnSecondary: { background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "4px 10px", cursor: "pointer" },

	// Disconnect
	disconnectRow: { padding: "12px", borderTop: "1px solid var(--border)", textAlign: "center" as const, flexShrink: 0 },
	disconnectBtn: { background: "none", border: "none", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", cursor: "pointer", opacity: 0.5, padding: "4px 8px" },
	disconnectConfirm: { background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "4px", color: "#f87171", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "4px 12px", cursor: "pointer" },
	disconnectCancel: { background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "4px 12px", cursor: "pointer" },

	// Error
	error: { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "4px", padding: "6px 10px", margin: "4px 8px", fontSize: "var(--text-sm)", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" },
	errorDismiss: { background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px", marginLeft: "auto", padding: "0 2px" },

	// Spinner
	spinner: { width: "14px", height: "14px", border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
};
