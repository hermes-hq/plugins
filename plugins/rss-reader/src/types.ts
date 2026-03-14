export interface Feed {
	id: string;
	url: string;
	title: string;
	description: string;
	siteUrl: string;
	category: string;
	addedAt: number;
}

export interface Article {
	id: string;
	feedId: string;
	title: string;
	link: string;
	description: string;
	pubDate: number;
	read: boolean;
}

export interface FeedState {
	feeds: Feed[];
	articles: Article[];
	categories: string[];
	loading: Set<string>;
	view: "feeds" | "articles" | "add-feed" | "suggestions" | "import-export";
	selectedFeedId: string | null;
	selectedCategory: string | null;
}

export interface SuggestedFeed {
	title: string;
	url: string;
	description: string;
	category: string;
}
