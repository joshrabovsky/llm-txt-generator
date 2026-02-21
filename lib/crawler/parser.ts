import * as cheerio from "cheerio";
import { PageData } from "../types";

export function parsePageData(html: string, url: string): PageData {
  const $ = cheerio.load(html);

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    new URL(url).pathname;

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  return { url, title, description };
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);

      // Stay on the same origin, skip fragments and non-HTTP
      if (
        resolved.origin === base.origin &&
        (resolved.protocol === "http:" || resolved.protocol === "https:")
      ) {
        // Normalize: strip hash and trailing slash
        resolved.hash = "";
        const normalized = resolved.toString().replace(/\/$/, "");
        links.push(normalized);
      }
    } catch {
      // Invalid URL — skip
    }
  });

  return links;
}
