export interface PageData {
  url: string;
  title: string;
  description: string;
}

export interface CrawlResult {
  siteTitle: string;
  siteDescription: string;
  baseUrl: string;
  pages: PageData[];
}

export interface GenerateResult extends CrawlResult {
  llmsTxt: string;
}

// Streamed progress events sent to the client
export type CrawlProgressEvent =
  | { type: "progress"; message: string; pagesFound: number }
  | { type: "skip"; url: string; reason: string }
  | { type: "done"; result: GenerateResult }
  | { type: "error"; message: string };
