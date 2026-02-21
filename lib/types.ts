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

// Named constants for event types — use these instead of raw strings
export const EventType = {
  Progress: "progress",
  Skip: "skip",
  AiToken: "ai_token",
  Done: "done",
  Error: "error",
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

// Streamed progress events sent to the client
export type CrawlProgressEvent =
  | { type: "progress"; message: string; pagesFound: number }
  | { type: "skip"; url: string; reason: string }
  | { type: "ai_token"; token: string }
  | { type: "done"; result: GenerateResult }
  | { type: "error"; message: string };
