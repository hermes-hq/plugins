var __hermes_plugin__ = (function(exports, react) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	react = __toESM(react);
	//#region src/GitHubPanel.tsx
	var GitHubPanel_exports = /* @__PURE__ */ __exportAll({ GitHubPanel: () => GitHubPanel });
	function timeAgo(iso) {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 6e4);
		if (mins < 1) return "just now";
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
	function repoShort(full) {
		return full.split("/").pop() ?? full;
	}
	function repoOwner(full) {
		return full.split("/")[0] ?? "";
	}
	function ConnectView() {
		return react.createElement("div", { style: S.center }, react.createElement("div", {
			style: S.connectIcon,
			dangerouslySetInnerHTML: { __html: "<svg width=\"40\" height=\"40\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z\"/></svg>" }
		}), react.createElement("div", { style: S.connectTitle }, "Connect GitHub"), react.createElement("div", { style: S.connectDesc }, "See PRs to review, your open PRs, and notifications — all in one place."), react.createElement("button", {
			style: S.connectBtn,
			onClick: startDeviceFlow
		}, "Connect with GitHub"));
	}
	function AuthorizingView({ state: s }) {
		const [copied, setCopied] = react.useState(false);
		const copyCode = () => {
			navigator.clipboard.writeText(s.deviceCode.user_code).then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2e3);
			}).catch(() => {});
		};
		if (!s.deviceCode) return react.createElement("div", { style: S.center }, react.createElement("div", { style: S.spinner }), react.createElement("div", { style: {
			marginTop: "8px",
			fontSize: "var(--text-base)",
			color: "var(--text-3)"
		} }, "Starting authorization..."));
		return react.createElement("div", { style: S.center }, react.createElement("div", { style: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)",
			textTransform: "uppercase",
			letterSpacing: "1px",
			fontWeight: 600
		} }, "Your code"), react.createElement("div", { style: {
			display: "flex",
			alignItems: "center",
			gap: "8px",
			marginTop: "6px"
		} }, react.createElement("div", { style: S.codeBox }, s.deviceCode.user_code), react.createElement("button", {
			style: S.copyBtn,
			onClick: copyCode,
			title: "Copy code"
		}, copied ? "Copied!" : "Copy")), react.createElement("div", { style: {
			fontSize: "var(--text-base)",
			color: "var(--text-2)",
			marginTop: "12px",
			textAlign: "center",
			lineHeight: 1.5
		} }, "Paste this code on GitHub to connect your account."), react.createElement("a", {
			href: s.deviceCode.verification_uri,
			target: "_blank",
			rel: "noopener noreferrer",
			style: S.ghLink
		}, "Open github.com/login/device →"), react.createElement("div", { style: {
			display: "flex",
			alignItems: "center",
			gap: "6px",
			marginTop: "20px"
		} }, react.createElement("div", { style: S.spinner }), react.createElement("span", { style: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)"
		} }, "Waiting for authorization...")), react.createElement("button", {
			style: {
				...S.btnSecondary,
				marginTop: "8px"
			},
			onClick: disconnect
		}, "Cancel"));
	}
	function RepoFilterBar({ repoFilters }) {
		const repos = getRepos();
		const [open, setOpen] = useState(false);
		const dropRef = useRef(null);
		useEffect(() => {
			if (!open) return;
			const handler = (e) => {
				if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
			};
			document.addEventListener("mousedown", handler);
			return () => document.removeEventListener("mousedown", handler);
		}, [open]);
		if (repos.length <= 1) return null;
		const active = new Set(repoFilters);
		const label = active.size === 0 ? "All repositories" : active.size === 1 ? [...active][0] : `${active.size} repositories`;
		return react.createElement("div", {
			style: S.filterBar,
			ref: dropRef
		}, react.createElement("button", {
			style: S.filterTrigger,
			onClick: () => setOpen(!open)
		}, react.createElement("span", { style: {
			flex: 1,
			textAlign: "left",
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		} }, label), react.createElement("span", { style: {
			opacity: .5,
			fontSize: "var(--text-sm)"
		} }, open ? "▲" : "▼")), open && react.createElement("div", { style: S.filterDropdown }, active.size > 0 && react.createElement("button", {
			style: S.filterClearBtn,
			onClick: () => {
				clearRepoFilters();
			}
		}, "Clear filters"), ...repos.map((repo) => react.createElement("label", {
			key: repo,
			style: S.filterOption,
			onClick: () => toggleRepoFilter(repo)
		}, react.createElement("div", { style: {
			...S.checkbox,
			...active.has(repo) ? S.checkboxChecked : {}
		} }, active.has(repo) ? "✓" : ""), react.createElement("span", { style: {
			flex: 1,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		} }, repo)))));
	}
	function PRItem({ pr, showIgnore, ignored }) {
		return react.createElement("div", { style: {
			...S.listItem,
			...ignored ? { opacity: .4 } : {}
		} }, react.createElement("a", {
			href: pr.html_url,
			target: "_blank",
			rel: "noopener noreferrer",
			style: S.prLink
		}, react.createElement("div", { style: S.prHeader }, react.createElement("span", { style: S.prRepo }, repoShort(pr.repo_full_name ?? "")), react.createElement("span", { style: S.prNumber }, `#${pr.number}`), pr.draft && react.createElement("span", { style: S.draftBadge }, "Draft"), react.createElement("span", { style: { flex: 1 } }), react.createElement("span", { style: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)"
		} }, timeAgo(pr.updated_at))), react.createElement("div", { style: S.prTitle }, pr.title), react.createElement("div", { style: S.prMeta }, react.createElement("span", null, pr.user.login), react.createElement("span", { style: { opacity: .3 } }, "·"), react.createElement("span", { style: { opacity: .6 } }, repoOwner(pr.repo_full_name ?? "")))), showIgnore && react.createElement("button", {
			style: S.ignoreBtn,
			onClick: (e) => {
				e.stopPropagation();
				ignored ? unignorePR(pr.id) : ignorePR(pr.id);
			},
			title: ignored ? "Show again" : "Hide from reviews"
		}, ignored ? "Undo" : "Hide"));
	}
	function PRList({ prs, emptyText, showIgnore, ignoredIds, hasMore, loadMoreType, repoFilters }) {
		const filterSet = new Set(repoFilters);
		const visible = prs.filter((pr) => {
			if (filterSet.size > 0 && !filterSet.has(pr.repo_full_name ?? "")) return false;
			if (showIgnore && ignoredIds?.has(pr.id)) return false;
			return true;
		});
		const ignored = showIgnore ? prs.filter((pr) => ignoredIds?.has(pr.id)) : [];
		const [showIgnored, setShowIgnored] = useState(false);
		if (visible.length === 0 && ignored.length === 0) return react.createElement("div", { style: S.empty }, emptyText);
		return react.createElement("div", { style: S.list }, ...visible.map((pr) => react.createElement(PRItem, {
			key: pr.id,
			pr,
			showIgnore
		})), hasMore && loadMoreType && react.createElement("button", {
			style: S.loadMoreBtn,
			onClick: () => loadMore(loadMoreType)
		}, "Load more"), ignored.length > 0 && react.createElement("div", { style: { marginTop: "8px" } }, react.createElement("button", {
			style: S.showIgnoredBtn,
			onClick: () => setShowIgnored(!showIgnored)
		}, `${showIgnored ? "Hide" : "Show"} ${ignored.length} hidden`), showIgnored && ignored.map((pr) => react.createElement(PRItem, {
			key: pr.id,
			pr,
			showIgnore: true,
			ignored: true
		}))));
	}
	function NotificationItem({ notif }) {
		return react.createElement("a", {
			href: notif.repository.html_url,
			target: "_blank",
			rel: "noopener noreferrer",
			style: S.listItem
		}, react.createElement("div", { style: S.prHeader }, react.createElement("span", { style: S.prRepo }, repoShort(notif.repository.full_name)), react.createElement("span", { style: {
			...S.draftBadge,
			background: "var(--accent)",
			color: "#000"
		} }, REASON_LABELS[notif.reason] ?? notif.reason), react.createElement("span", { style: { flex: 1 } }), react.createElement("span", { style: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)"
		} }, timeAgo(notif.updated_at))), react.createElement("div", { style: S.prTitle }, notif.subject.title), react.createElement("div", { style: S.prMeta }, react.createElement("span", null, notif.subject.type), notif.unread && react.createElement("span", { style: S.unreadDot })));
	}
	function NotificationList({ notifications, hasMore, repoFilters }) {
		const filterSet = new Set(repoFilters);
		const visible = filterSet.size > 0 ? notifications.filter((n) => filterSet.has(n.repository.full_name)) : notifications;
		if (visible.length === 0) return react.createElement("div", { style: S.empty }, "No notifications");
		return react.createElement("div", { style: S.list }, ...visible.map((n) => react.createElement(NotificationItem, {
			key: n.id,
			notif: n
		})), hasMore && react.createElement("button", {
			style: S.loadMoreBtn,
			onClick: () => loadMore("notifications")
		}, "Load more"));
	}
	function TabBar({ view, reviewCount, prCount, notifCount }) {
		const tab = (id, label, count) => react.createElement("button", {
			key: id,
			style: {
				...S.tab,
				...view === id ? S.tabActive : {}
			},
			onClick: () => setView(id)
		}, label, count > 0 && react.createElement("span", { style: S.tabBadge }, count));
		return react.createElement("div", { style: S.tabs }, tab("reviews", "Reviews", reviewCount), tab("my-prs", "My PRs", prCount), tab("notifications", "Notifs", notifCount));
	}
	function DisconnectButton() {
		const [confirming, setConfirming] = useState(false);
		if (confirming) return react.createElement("div", { style: S.disconnectRow }, react.createElement("span", { style: {
			fontSize: "var(--text-base)",
			color: "var(--text-2)"
		} }, "Disconnect GitHub?"), react.createElement("div", { style: {
			display: "flex",
			gap: "6px",
			marginTop: "6px",
			justifyContent: "center"
		} }, react.createElement("button", {
			style: S.disconnectConfirm,
			onClick: () => disconnect()
		}, "Yes, disconnect"), react.createElement("button", {
			style: S.disconnectCancel,
			onClick: () => setConfirming(false)
		}, "Cancel")));
		return react.createElement("div", { style: S.disconnectRow }, react.createElement("button", {
			style: S.disconnectBtn,
			onClick: () => setConfirming(true)
		}, "Disconnect GitHub"));
	}
	function GitHubPanel() {
		const [s, setS] = useState(getState());
		useEffect(() => subscribe(() => setS(getState())), []);
		if (s.view === "connect") return react.createElement("div", { style: S.root }, s.error && react.createElement("div", { style: S.error }, s.error, react.createElement("button", {
			style: S.errorDismiss,
			onClick: clearError
		}, "×")), react.createElement(ConnectView));
		if (s.view === "authorizing") return react.createElement("div", { style: S.root }, react.createElement(AuthorizingView, { state: s }));
		const unreadNotifs = s.notifications.filter((n) => n.unread).length;
		const visibleReviews = s.reviewPRs.filter((pr) => !s.ignoredPRIds.has(pr.id)).length;
		return react.createElement("div", { style: S.root }, react.createElement("div", { style: S.header }, s.user && react.createElement("div", { style: S.userInfo }, react.createElement("img", {
			src: s.user.avatar_url,
			style: S.avatar
		}), react.createElement("span", { style: {
			fontSize: "var(--text-base)",
			fontWeight: 500
		} }, s.user.login)), react.createElement("div", { style: {
			display: "flex",
			gap: "4px",
			marginLeft: "auto"
		} }, s.loading && react.createElement("div", { style: {
			...S.spinner,
			width: "12px",
			height: "12px"
		} }), react.createElement("button", {
			style: S.btnIcon,
			onClick: () => refreshData(),
			title: "Refresh",
			disabled: s.loading
		}, "↻"))), s.error && react.createElement("div", { style: S.error }, s.error, react.createElement("button", {
			style: S.errorDismiss,
			onClick: clearError
		}, "×")), react.createElement(TabBar, {
			view: s.view,
			reviewCount: visibleReviews,
			prCount: s.myPRs.length,
			notifCount: unreadNotifs
		}), react.createElement(RepoFilterBar, { repoFilters: s.repoFilters }), s.view === "reviews" && react.createElement(PRList, {
			prs: s.reviewPRs,
			emptyText: "No PRs waiting for your review",
			showIgnore: true,
			ignoredIds: s.ignoredPRIds,
			hasMore: s.hasMoreReviews,
			loadMoreType: "reviews",
			repoFilters: s.repoFilters
		}), s.view === "my-prs" && react.createElement(PRList, {
			prs: s.myPRs,
			emptyText: "No open PRs",
			hasMore: s.hasMoreMyPRs,
			loadMoreType: "my-prs",
			repoFilters: s.repoFilters
		}), s.view === "notifications" && react.createElement(NotificationList, {
			notifications: s.notifications,
			hasMore: s.hasMoreNotifs,
			repoFilters: s.repoFilters
		}), s.loadingMore && react.createElement("div", { style: {
			textAlign: "center",
			padding: "8px"
		} }, react.createElement("div", { style: S.spinner })), react.createElement(DisconnectButton));
	}
	var useState, useEffect, useRef, REASON_LABELS, S;
	var init_GitHubPanel = __esmMin((() => {
		init_activate();
		({useState, useEffect, useRef} = react);
		REASON_LABELS = {
			review_requested: "Review",
			mention: "Mentioned",
			author: "Author",
			comment: "Comment",
			assign: "Assigned",
			state_change: "State",
			ci_activity: "CI",
			subscribed: "Watching"
		};
		S = {
			root: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				fontFamily: "var(--font-mono)",
				color: "var(--text-0)",
				background: "var(--bg-1)",
				overflow: "hidden"
			},
			header: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 12px",
				borderBottom: "1px solid var(--border)",
				flexShrink: 0
			},
			userInfo: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			},
			avatar: {
				width: "22px",
				height: "22px",
				borderRadius: "50%"
			},
			tabs: {
				display: "flex",
				borderBottom: "1px solid var(--border)",
				flexShrink: 0
			},
			tab: {
				flex: 1,
				background: "none",
				border: "none",
				borderBottom: "2px solid transparent",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				padding: "10px 4px",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "5px",
				transition: "color 0.1s"
			},
			tabActive: {
				color: "var(--accent)",
				borderBottomColor: "var(--accent)",
				fontWeight: 600
			},
			tabBadge: {
				fontSize: "var(--text-sm)",
				background: "var(--accent)",
				color: "#000",
				borderRadius: "8px",
				padding: "0 5px",
				lineHeight: "16px",
				fontWeight: 700,
				minWidth: "16px",
				textAlign: "center"
			},
			filterBar: {
				position: "relative",
				padding: "8px 10px",
				borderBottom: "1px solid var(--border)",
				flexShrink: 0
			},
			filterTrigger: {
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: "8px",
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				color: "var(--text-1)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				padding: "7px 10px",
				cursor: "pointer",
				outline: "none"
			},
			filterDropdown: {
				position: "absolute",
				left: "10px",
				right: "10px",
				top: "100%",
				zIndex: 50,
				background: "var(--bg-0)",
				border: "1px solid var(--border)",
				borderRadius: "8px",
				padding: "4px",
				maxHeight: "200px",
				overflowY: "auto",
				boxShadow: "0 6px 20px rgba(0,0,0,0.4)"
			},
			filterOption: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "7px 8px",
				borderRadius: "5px",
				cursor: "pointer",
				fontSize: "var(--text-base)",
				color: "var(--text-1)",
				transition: "background 0.08s"
			},
			checkbox: {
				width: "16px",
				height: "16px",
				borderRadius: "4px",
				border: "1px solid var(--border)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "11px",
				color: "transparent",
				flexShrink: 0,
				background: "var(--bg-2)"
			},
			checkboxChecked: {
				background: "var(--accent)",
				borderColor: "var(--accent)",
				color: "#000"
			},
			filterClearBtn: {
				display: "block",
				width: "100%",
				background: "none",
				border: "none",
				color: "var(--accent)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "6px 8px",
				cursor: "pointer",
				textAlign: "left",
				borderBottom: "1px solid var(--border)",
				marginBottom: "4px"
			},
			list: {
				flex: 1,
				overflowY: "auto",
				padding: "6px"
			},
			listItem: {
				display: "flex",
				alignItems: "start",
				gap: "8px",
				padding: "10px 12px",
				borderRadius: "6px",
				cursor: "pointer",
				textDecoration: "none",
				color: "inherit",
				marginBottom: "2px",
				transition: "background 0.1s"
			},
			prLink: {
				flex: 1,
				textDecoration: "none",
				color: "inherit",
				minWidth: 0
			},
			prHeader: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				marginBottom: "4px"
			},
			prRepo: {
				fontSize: "var(--text-base)",
				color: "var(--accent)",
				fontWeight: 500
			},
			prNumber: {
				fontSize: "var(--text-base)",
				color: "var(--text-3)"
			},
			prTitle: {
				fontSize: "var(--text-base)",
				color: "var(--text-0)",
				fontWeight: 500,
				lineHeight: 1.4
			},
			prMeta: {
				display: "flex",
				alignItems: "center",
				gap: "5px",
				marginTop: "4px",
				fontSize: "var(--text-base)",
				color: "var(--text-3)"
			},
			draftBadge: {
				fontSize: "var(--text-sm)",
				fontWeight: 600,
				background: "var(--bg-3)",
				color: "var(--text-3)",
				padding: "2px 6px",
				borderRadius: "4px",
				textTransform: "uppercase",
				letterSpacing: "0.3px"
			},
			unreadDot: {
				width: "7px",
				height: "7px",
				borderRadius: "50%",
				background: "var(--accent)",
				flexShrink: 0
			},
			ignoreBtn: {
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "4px 8px",
				cursor: "pointer",
				flexShrink: 0,
				alignSelf: "center"
			},
			labels: {
				display: "flex",
				gap: "4px",
				marginTop: "4px",
				flexWrap: "wrap"
			},
			label: {
				fontSize: "8px",
				padding: "1px 5px",
				borderRadius: "3px",
				border: "1px solid"
			},
			loadMoreBtn: {
				display: "block",
				width: "100%",
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				color: "var(--text-2)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				padding: "10px",
				cursor: "pointer",
				marginTop: "4px",
				textAlign: "center"
			},
			showIgnoredBtn: {
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				cursor: "pointer",
				padding: "8px 12px",
				width: "100%",
				textAlign: "center"
			},
			empty: {
				flex: 1,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "var(--text-base)",
				color: "var(--text-3)",
				padding: "20px"
			},
			center: {
				flex: 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
				gap: "8px"
			},
			connectIcon: {
				color: "var(--text-3)",
				marginBottom: "8px"
			},
			connectTitle: {
				fontSize: "var(--text-base)",
				fontWeight: 600,
				color: "var(--text-0)"
			},
			connectDesc: {
				fontSize: "var(--text-base)",
				color: "var(--text-3)",
				textAlign: "center",
				maxWidth: "220px",
				lineHeight: 1.5
			},
			connectBtn: {
				marginTop: "12px",
				background: "var(--text-0)",
				border: "none",
				borderRadius: "6px",
				color: "var(--bg-1)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				fontWeight: 600,
				padding: "8px 20px",
				cursor: "pointer"
			},
			codeBox: {
				fontSize: "24px",
				fontWeight: 700,
				fontFamily: "var(--font-mono)",
				color: "var(--accent)",
				background: "var(--bg-2)",
				border: "2px solid var(--accent)",
				borderRadius: "8px",
				padding: "10px 20px",
				letterSpacing: "6px",
				userSelect: "all"
			},
			copyBtn: {
				background: "var(--accent)",
				border: "none",
				borderRadius: "6px",
				color: "#000",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				fontWeight: 600,
				padding: "8px 14px",
				cursor: "pointer",
				whiteSpace: "nowrap"
			},
			ghLink: {
				fontSize: "var(--text-base)",
				color: "var(--accent)",
				textDecoration: "none",
				marginTop: "6px",
				fontWeight: 500
			},
			btnIcon: {
				background: "none",
				border: "none",
				color: "var(--text-3)",
				cursor: "pointer",
				fontSize: "14px",
				padding: "2px 4px",
				lineHeight: 1
			},
			btnSecondary: {
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "4px 10px",
				cursor: "pointer"
			},
			disconnectRow: {
				padding: "12px",
				borderTop: "1px solid var(--border)",
				textAlign: "center",
				flexShrink: 0
			},
			disconnectBtn: {
				background: "none",
				border: "none",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				cursor: "pointer",
				opacity: .5,
				padding: "4px 8px"
			},
			disconnectConfirm: {
				background: "rgba(248,113,113,0.15)",
				border: "1px solid rgba(248,113,113,0.4)",
				borderRadius: "4px",
				color: "#f87171",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "4px 12px",
				cursor: "pointer"
			},
			disconnectCancel: {
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "4px 12px",
				cursor: "pointer"
			},
			error: {
				background: "rgba(248,113,113,0.1)",
				border: "1px solid rgba(248,113,113,0.3)",
				borderRadius: "4px",
				padding: "6px 10px",
				margin: "4px 8px",
				fontSize: "var(--text-sm)",
				color: "#f87171",
				display: "flex",
				alignItems: "center",
				gap: "6px"
			},
			errorDismiss: {
				background: "none",
				border: "none",
				color: "#f87171",
				cursor: "pointer",
				fontSize: "14px",
				marginLeft: "auto",
				padding: "0 2px"
			},
			spinner: {
				width: "14px",
				height: "14px",
				border: "2px solid var(--border)",
				borderTopColor: "var(--accent)",
				borderRadius: "50%",
				animation: "spin 0.6s linear infinite"
			}
		};
	}));
	//#endregion
	//#region src/activate.ts
	function getState() {
		return state;
	}
	function subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}
	function notify() {
		for (const l of listeners) try {
			l();
		} catch {}
	}
	function updateStatus() {
		if (!api) return;
		if (!state.token) {
			api.ui.updateStatusBarItem("github.status", { text: "GitHub" });
			return;
		}
		const reviewCount = state.reviewPRs.length;
		const notifCount = state.notifications.filter((n) => n.unread).length;
		const total = reviewCount + notifCount;
		api.ui.updateStatusBarItem("github.status", {
			text: total > 0 ? `GitHub (${total})` : "GitHub",
			tooltip: `${reviewCount} reviews · ${notifCount} notifications`
		});
	}
	async function ghGet(url) {
		const headers = { Accept: "application/vnd.github+json" };
		if (state.token) headers.Authorization = `Bearer ${state.token}`;
		const res = await fetch(url, { headers });
		if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		return res.text();
	}
	async function ghPost(url, body) {
		const formBody = Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
		if ((api?.network)?.postJson) return api.network.postJson(url, formBody, {
			"Content-Type": "application/x-www-form-urlencoded",
			"Accept": "application/json"
		});
		return (await fetch(url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: formBody
		})).text();
	}
	async function startDeviceFlow() {
		state = {
			...state,
			view: "authorizing",
			error: null,
			loading: true
		};
		notify();
		try {
			let text;
			try {
				text = await ghPost("https://github.com/login/device/code", {
					client_id: CLIENT_ID,
					scope: SCOPES
				});
			} catch (fetchErr) {
				throw new Error(`POST failed: ${fetchErr}`);
			}
			let data;
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
					interval: data.interval || 5
				}
			};
			notify();
			window.open(data.verification_uri, "_blank");
			startPolling(data.device_code, data.interval || 5);
		} catch (err) {
			state = {
				...state,
				loading: false,
				error: `Auth failed: ${err}`,
				view: "connect"
			};
			notify();
		}
	}
	function startPolling(deviceCode, interval) {
		if (pollTimer) clearTimeout(pollTimer);
		let currentInterval = interval;
		const poll = async () => {
			try {
				console.log("[GitHub] Polling for token (interval:", currentInterval, "s)...");
				const text = await ghPost("https://github.com/login/oauth/access_token", {
					client_id: CLIENT_ID,
					device_code: deviceCode,
					grant_type: "urn:ietf:params:oauth:grant-type:device_code"
				});
				console.log("[GitHub] Poll response:", text.substring(0, 120));
				const data = JSON.parse(text);
				if (data.access_token) {
					console.log("[GitHub] Got access token!");
					pollTimer = null;
					state = {
						...state,
						token: data.access_token,
						deviceCode: null
					};
					notify();
					if (api) await api.storage.set("github-token", data.access_token);
					await loadUser();
					await refreshData();
					state = {
						...state,
						view: "reviews"
					};
					notify();
					return;
				} else if (data.error === "slow_down") {
					currentInterval += 5;
					console.log("[GitHub] Slowing down to", currentInterval, "s");
				} else if (data.error === "expired_token") {
					pollTimer = null;
					state = {
						...state,
						error: "Authorization timed out. Try again.",
						view: "connect",
						deviceCode: null
					};
					notify();
					return;
				} else if (data.error === "access_denied") {
					pollTimer = null;
					state = {
						...state,
						error: "Authorization denied.",
						view: "connect",
						deviceCode: null
					};
					notify();
					return;
				}
			} catch (pollErr) {
				console.error("[GitHub] Poll error:", pollErr);
			}
			pollTimer = setTimeout(poll, currentInterval * 1e3);
		};
		pollTimer = setTimeout(poll, currentInterval * 1e3);
	}
	async function disconnect() {
		if (pollTimer) clearInterval(pollTimer);
		if (refreshTimer) clearInterval(refreshTimer);
		pollTimer = null;
		refreshTimer = null;
		state = {
			view: "connect",
			token: null,
			user: null,
			reviewPRs: [],
			myPRs: [],
			notifications: [],
			ignoredPRIds: /* @__PURE__ */ new Set(),
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
			repoFilters: []
		};
		if (api) {
			await api.storage.delete("github-token");
			await api.storage.delete("github-user");
			await api.storage.delete("github-ignored-prs");
		}
		notify();
		updateStatus();
	}
	async function loadUser() {
		try {
			console.log("[GitHub] Loading user with token:", state.token?.substring(0, 10) + "...");
			const text = await ghGet("https://api.github.com/user");
			console.log("[GitHub] User response:", text.substring(0, 150));
			const user = JSON.parse(text);
			if (!user.login) throw new Error("No login in response: " + text.substring(0, 100));
			state = {
				...state,
				user: {
					login: user.login,
					avatar_url: user.avatar_url,
					name: user.name
				}
			};
			if (api) await api.storage.set("github-user", JSON.stringify(state.user));
			notify();
		} catch (err) {
			console.error("[GitHub] loadUser failed:", err);
			state = {
				...state,
				error: `GitHub API error: ${err}`
			};
			notify();
		}
	}
	async function refreshData() {
		if (!state.token || !state.user) return;
		state = {
			...state,
			loading: true,
			error: null,
			reviewPage: 1,
			myPRsPage: 1,
			notifsPage: 1
		};
		notify();
		try {
			const [reviewText, myPRsText, notifsText] = await Promise.all([
				ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=1`),
				ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+author:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=1`),
				ghGet(`https://api.github.com/notifications?per_page=${PER_PAGE}&page=1`)
			]);
			let reviewData, myPRsData, notifsData;
			try {
				reviewData = JSON.parse(reviewText);
			} catch {
				reviewData = { items: [] };
			}
			try {
				myPRsData = JSON.parse(myPRsText);
			} catch {
				myPRsData = { items: [] };
			}
			try {
				notifsData = JSON.parse(notifsText);
			} catch {
				notifsData = [];
			}
			const mapPR = (pr) => ({
				...pr,
				repo_full_name: pr.repository_url?.replace("https://api.github.com/repos/", "") ?? ""
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
				hasMoreNotifs: notifs.length >= PER_PAGE
			};
		} catch (err) {
			state = {
				...state,
				loading: false,
				error: `Failed to load: ${err}`
			};
		}
		notify();
		updateStatus();
	}
	async function loadMore(type) {
		if (!state.token || !state.user || state.loadingMore) return;
		state = {
			...state,
			loadingMore: true
		};
		notify();
		try {
			const mapPR = (pr) => ({
				...pr,
				repo_full_name: pr.repository_url?.replace("https://api.github.com/repos/", "") ?? ""
			});
			if (type === "reviews") {
				const page = state.reviewPage + 1;
				const text = await ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+review-requested:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=${page}`);
				const items = (JSON.parse(text).items ?? []).map(mapPR);
				state = {
					...state,
					reviewPRs: [...state.reviewPRs, ...items],
					reviewPage: page,
					hasMoreReviews: items.length >= PER_PAGE,
					loadingMore: false
				};
			} else if (type === "my-prs") {
				const page = state.myPRsPage + 1;
				const text = await ghGet(`https://api.github.com/search/issues?q=is:pr+is:open+author:${state.user.login}&sort=updated&per_page=${PER_PAGE}&page=${page}`);
				const items = (JSON.parse(text).items ?? []).map(mapPR);
				state = {
					...state,
					myPRs: [...state.myPRs, ...items],
					myPRsPage: page,
					hasMoreMyPRs: items.length >= PER_PAGE,
					loadingMore: false
				};
			} else {
				const page = state.notifsPage + 1;
				const text = await ghGet(`https://api.github.com/notifications?per_page=${PER_PAGE}&page=${page}`);
				const items = JSON.parse(text);
				state = {
					...state,
					notifications: [...state.notifications, ...Array.isArray(items) ? items : []],
					notifsPage: page,
					hasMoreNotifs: (Array.isArray(items) ? items : []).length >= PER_PAGE,
					loadingMore: false
				};
			}
		} catch {
			state = {
				...state,
				loadingMore: false
			};
		}
		notify();
	}
	async function ignorePR(prId) {
		state = {
			...state,
			ignoredPRIds: new Set([...state.ignoredPRIds, prId])
		};
		notify();
		if (api) try {
			await api.storage.set("github-ignored-prs", JSON.stringify([...state.ignoredPRIds]));
		} catch {}
		updateStatus();
	}
	async function unignorePR(prId) {
		const next = new Set(state.ignoredPRIds);
		next.delete(prId);
		state = {
			...state,
			ignoredPRIds: next
		};
		notify();
		if (api) try {
			await api.storage.set("github-ignored-prs", JSON.stringify([...state.ignoredPRIds]));
		} catch {}
		updateStatus();
	}
	function toggleRepoFilter(repo) {
		const next = state.repoFilters.includes(repo) ? state.repoFilters.filter((r) => r !== repo) : [...state.repoFilters, repo];
		state = {
			...state,
			repoFilters: next
		};
		notify();
	}
	function clearRepoFilters() {
		state = {
			...state,
			repoFilters: []
		};
		notify();
	}
	function getRepos() {
		const repos = /* @__PURE__ */ new Set();
		for (const pr of state.reviewPRs) if (pr.repo_full_name) repos.add(pr.repo_full_name);
		for (const pr of state.myPRs) if (pr.repo_full_name) repos.add(pr.repo_full_name);
		for (const n of state.notifications) if (n.repository?.full_name) repos.add(n.repository.full_name);
		return Array.from(repos).sort();
	}
	function setView(view) {
		state = {
			...state,
			view,
			repoFilters: []
		};
		notify();
	}
	function clearError() {
		state = {
			...state,
			error: null
		};
		notify();
	}
	async function activate(pluginApi) {
		api = pluginApi;
		try {
			const ignoredJson = await api.storage.get("github-ignored-prs");
			if (ignoredJson) try {
				state.ignoredPRIds = new Set(JSON.parse(ignoredJson));
			} catch {}
		} catch {}
		try {
			const token = await api.storage.get("github-token");
			const userJson = await api.storage.get("github-user");
			if (token) {
				state.token = token;
				if (userJson) try {
					state.user = JSON.parse(userJson);
				} catch {}
				state.view = "reviews";
				notify();
				await loadUser();
				await refreshData();
				let intervalMin = 2;
				try {
					const setting = await api.storage.get("setting:refreshInterval");
					if (setting) {
						const parsed = parseInt(setting, 10);
						if (parsed >= 2) intervalMin = parsed;
					}
				} catch {}
				refreshTimer = setInterval(() => refreshData(), intervalMin * 60 * 1e3);
			}
		} catch {}
		const { GitHubPanel } = await Promise.resolve().then(() => (init_GitHubPanel(), GitHubPanel_exports));
		api.ui.registerPanel("github-panel", GitHubPanel);
		api.subscriptions.push(api.commands.register("github.open", () => {
			api.ui.showPanel("github-panel");
		}));
		updateStatus();
	}
	function deactivate() {
		if (pollTimer) clearInterval(pollTimer);
		if (refreshTimer) clearInterval(refreshTimer);
		listeners.clear();
		api = null;
	}
	var CLIENT_ID, SCOPES, state, listeners, api, pollTimer, refreshTimer, PER_PAGE;
	var init_activate = __esmMin((() => {
		CLIENT_ID = "Ov23lijqsY1fJzUeP6EN";
		SCOPES = "repo notifications read:org";
		state = {
			view: "connect",
			token: null,
			user: null,
			reviewPRs: [],
			myPRs: [],
			notifications: [],
			ignoredPRIds: /* @__PURE__ */ new Set(),
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
			repoFilters: []
		};
		listeners = /* @__PURE__ */ new Set();
		api = null;
		pollTimer = null;
		refreshTimer = null;
		PER_PAGE = 20;
	}));
	//#endregion
	init_activate();
	exports.activate = activate;
	exports.clearError = clearError;
	exports.clearRepoFilters = clearRepoFilters;
	exports.deactivate = deactivate;
	exports.disconnect = disconnect;
	exports.getRepos = getRepos;
	exports.getState = getState;
	exports.ignorePR = ignorePR;
	exports.loadMore = loadMore;
	exports.refreshData = refreshData;
	exports.setView = setView;
	exports.startDeviceFlow = startDeviceFlow;
	exports.subscribe = subscribe;
	exports.toggleRepoFilter = toggleRepoFilter;
	exports.unignorePR = unignorePR;
	return exports;
})({}, React);
if (typeof window !== "undefined") {
	window.__hermesPlugins = window.__hermesPlugins || {};
	window.__hermesPlugins["hermes-hq.github"] = {
		activate: __hermes_plugin__.activate,
		deactivate: __hermes_plugin__.deactivate
	};
}
