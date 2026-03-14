import { SuggestedFeed } from "./types";

export const SUGGESTED_FEEDS: SuggestedFeed[] = [
	// General
	{ title: "Hacker News", url: "https://hnrss.org/frontpage", description: "Top stories from Hacker News", category: "General" },
	{ title: "Lobsters", url: "https://lobste.rs/rss", description: "Computing-focused link aggregation", category: "General" },
	{ title: "TLDR Newsletter", url: "https://tldr.tech/rss", description: "Daily byte-sized tech news", category: "General" },

	// Engineering Blogs
	{ title: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", description: "Scaling, resilience, microservices", category: "Engineering Blogs" },
	{ title: "Stripe Engineering", url: "https://stripe.com/blog/engineering/feed", description: "Payments, API design, infrastructure", category: "Engineering Blogs" },
	{ title: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss", description: "Networking, performance, security", category: "Engineering Blogs" },
	{ title: "Discord Engineering", url: "https://discord.com/blog/engineering/rss.xml", description: "Real-time systems, Rust", category: "Engineering Blogs" },
	{ title: "Linear Blog", url: "https://linear.app/blog/rss.xml", description: "Product engineering, startup building", category: "Engineering Blogs" },

	// Personal Blogs
	{ title: "Julia Evans", url: "https://jvns.ca/atom.xml", description: "Clear explanations of systems topics", category: "Personal Blogs" },
	{ title: "Dan Luu", url: "https://danluu.com/atom.xml", description: "Performance, hardware, contrarian takes", category: "Personal Blogs" },
	{ title: "Fasterthanli.me", url: "https://fasterthanli.me/index.xml", description: "Detailed Rust and systems posts", category: "Personal Blogs" },
	{ title: "Martin Fowler", url: "https://martinfowler.com/feed.atom", description: "Architecture and design patterns", category: "Personal Blogs" },

	// Rust
	{ title: "This Week in Rust", url: "https://this-week-in-rust.org/rss.xml", description: "Weekly Rust ecosystem updates", category: "Rust" },
	{ title: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml", description: "Official Rust language blog", category: "Rust" },

	// JavaScript / Web
	{ title: "JavaScript Weekly", url: "https://javascriptweekly.com/rss", description: "Weekly JS news and articles", category: "JavaScript" },
	{ title: "Node Weekly", url: "https://nodeweekly.com/rss", description: "Weekly Node.js roundup", category: "JavaScript" },

	// Go
	{ title: "Go Blog", url: "https://go.dev/blog/feed.atom", description: "Official Go language blog", category: "Go" },

	// Security
	{ title: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", description: "Investigative cybersecurity journalism", category: "Security" },
	{ title: "Schneier on Security", url: "https://www.schneier.com/feed/", description: "Security commentary and analysis", category: "Security" },

	// DevOps / Infra
	{ title: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml", description: "Official Kubernetes blog", category: "DevOps" },
];
