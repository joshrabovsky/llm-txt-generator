import { CrawlResult, CrawlProgressEvent, PageData } from "../types";
import { fetchHtml } from "./fetcher";
import { parsePageData, extractLinks } from "./parser";
import { fetchSitemapUrls } from "./sitemap";

const MAX_PAGES = 50;

export async function crawlWebsite(
  inputUrl: string,
  onProgress: (event: CrawlProgressEvent) => void
): Promise<CrawlResult> {
  const base = new URL(inputUrl);
  const baseUrl = `${base.protocol}//${base.host}`;

  onProgress({ type: "progress", message: "Checking for sitemap.xml...", pagesFound: 0 });

  const sitemapUrls = await fetchSitemapUrls(baseUrl);
  let urlsToVisit: string[];

  if (sitemapUrls.length > 0) {
    onProgress({
      type: "progress",
      message: `Found sitemap with ${sitemapUrls.length} URLs.`,
      pagesFound: 0,
    });
    urlsToVisit = sitemapUrls.slice(0, MAX_PAGES);
  } else {
    onProgress({
      type: "progress",
      message: "No sitemap found. Starting BFS crawl...",
      pagesFound: 0,
    });
    urlsToVisit = [baseUrl];
  }

  const visited = new Set<string>();
  const pages: PageData[] = [];
  const queue: string[] = [...urlsToVisit];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    const normalized = url.replace(/\/$/, "");

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const fetchResult = await fetchHtml(url);
    if (!fetchResult.success) {
      onProgress({ type: "skip", url, reason: fetchResult.reason });
      continue;
    }

    const pageData = parsePageData(fetchResult.html, url);
    pages.push(pageData);

    onProgress({
      type: "progress",
      message: `Crawled: ${pageData.title || url}`,
      pagesFound: pages.length,
    });

    // BFS: only follow links if we didn't have a sitemap
    if (sitemapUrls.length === 0) {
      const links = extractLinks(fetchResult.html, baseUrl);
      for (const link of links) {
        const normalizedLink = link.replace(/\/$/, "");
        if (!visited.has(normalizedLink)) {
          queue.push(link);
        }
      }
    }
  }

  // Use the root page for site-level metadata
  const rootPage = pages.find((p) => {
    const u = new URL(p.url);
    return u.pathname === "/" || u.pathname === "";
  }) ?? pages[0];

  return {
    siteTitle: rootPage?.title ?? base.host,
    siteDescription: rootPage?.description ?? "",
    baseUrl,
    pages,
  };
}
