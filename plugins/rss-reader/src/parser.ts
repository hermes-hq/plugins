import { Article } from "./types";

interface ParsedFeed {
	title: string;
	description: string;
	siteUrl: string;
	articles: Omit<Article, "feedId" | "read">[];
}

export function parseFeed(xml: string, feedId: string, maxArticles: number): ParsedFeed {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, "text/xml");

	const errorNode = doc.querySelector("parsererror");
	if (errorNode) {
		throw new Error("Invalid XML: " + errorNode.textContent);
	}

	const root = doc.documentElement;

	if (root.tagName === "rss" || root.querySelector("channel")) {
		return parseRSS(doc, feedId, maxArticles);
	} else if (root.tagName === "feed" || root.namespaceURI?.includes("Atom")) {
		return parseAtom(doc, feedId, maxArticles);
	}

	throw new Error("Unrecognized feed format");
}

function parseRSS(doc: Document, feedId: string, maxArticles: number): ParsedFeed {
	const channel = doc.querySelector("channel");
	if (!channel) throw new Error("No channel element found");

	const title = getText(channel, "title") || "Untitled Feed";
	const description = getText(channel, "description") || "";
	const siteUrl = getText(channel, "link") || "";

	const items = Array.from(channel.querySelectorAll("item")).slice(0, maxArticles);
	const articles = items.map((item) => {
		const guid = getText(item, "guid") || getText(item, "link") || Math.random().toString(36);
		const pubDateStr = getText(item, "pubDate");
		const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();

		return {
			id: hashId(feedId + ":" + guid),
			title: getText(item, "title") || "Untitled",
			link: getText(item, "link") || "",
			description: stripHtml(getText(item, "description") || ""),
			pubDate: isNaN(pubDate) ? Date.now() : pubDate,
		};
	});

	return { title, description, siteUrl, articles };
}

function parseAtom(doc: Document, feedId: string, maxArticles: number): ParsedFeed {
	const feed = doc.documentElement;
	const title = getText(feed, "title") || "Untitled Feed";
	const description = getText(feed, "subtitle") || "";

	const linkEl = feed.querySelector("link[rel='alternate']") || feed.querySelector("link");
	const siteUrl = linkEl?.getAttribute("href") || "";

	const entries = Array.from(feed.querySelectorAll("entry")).slice(0, maxArticles);
	const articles = entries.map((entry) => {
		const id = getText(entry, "id") || Math.random().toString(36);
		const entryLink = entry.querySelector("link[rel='alternate']") || entry.querySelector("link");
		const link = entryLink?.getAttribute("href") || "";
		const pubDateStr = getText(entry, "published") || getText(entry, "updated");
		const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();

		let desc = getText(entry, "summary") || getText(entry, "content") || "";
		desc = stripHtml(desc);

		return {
			id: hashId(feedId + ":" + id),
			title: getText(entry, "title") || "Untitled",
			link,
			description: desc.slice(0, 300),
			pubDate: isNaN(pubDate) ? Date.now() : pubDate,
		};
	});

	return { title, description, siteUrl, articles };
}

function getText(parent: Element, tagName: string): string {
	const el = parent.querySelector(tagName);
	return el?.textContent?.trim() || "";
}

function stripHtml(html: string): string {
	const tmp = document.createElement("div");
	tmp.innerHTML = html;
	return tmp.textContent?.trim() || "";
}

function hashId(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0;
	}
	return "art_" + Math.abs(hash).toString(36);
}
