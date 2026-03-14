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

	// AI & Machine Learning
	{ title: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", description: "Research and product updates from OpenAI", category: "AI & ML" },
	{ title: "Anthropic Research", url: "https://www.anthropic.com/research/rss.xml", description: "AI safety and research from Anthropic", category: "AI & ML" },
	{ title: "Google AI Blog", url: "https://blog.google/technology/ai/rss", description: "AI research and applications from Google", category: "AI & ML" },
	{ title: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", description: "Open-source ML models and tools", category: "AI & ML" },
	{ title: "The Batch (deeplearning.ai)", url: "https://www.deeplearning.ai/the-batch/feed/", description: "Andrew Ng's weekly AI newsletter", category: "AI & ML" },
	{ title: "MIT Technology Review - AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", description: "AI coverage from MIT Tech Review", category: "AI & ML" },

	// DevOps / Infra
	{ title: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml", description: "Official Kubernetes blog", category: "DevOps" },
];
