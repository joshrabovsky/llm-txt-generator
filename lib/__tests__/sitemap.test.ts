import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSitemapUrls } from "../crawler/sitemap";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const STANDARD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
  <url><loc>https://example.com/blog</loc></url>
</urlset>`;

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/blog-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://example.com/docs-sitemap.xml</loc></sitemap>
</sitemapindex>`;

const CHILD_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/blog/post-1</loc></url>
  <url><loc>https://example.com/blog/post-2</loc></url>
  <url><loc>https://example.com/blog/post-3</loc></url>
  <url><loc>https://example.com/blog/post-4</loc></url>
  <url><loc>https://example.com/blog/post-5</loc></url>
  <url><loc>https://example.com/blog/post-6</loc></url>
</urlset>`;

const okXml = (xml: string) => ({
  ok: true,
  text: async () => xml,
});

describe("fetchSitemapUrls", () => {
  it("returns empty array when sitemap is not found", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const urls = await fetchSitemapUrls("https://example.com");
    expect(urls).toEqual([]);
  });

  it("returns page URLs from a standard sitemap", async () => {
    mockFetch.mockResolvedValue(okXml(STANDARD_SITEMAP));
    const urls = await fetchSitemapUrls("https://example.com");
    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/about");
    expect(urls).toContain("https://example.com/blog");
  });

  it("fetches child sitemaps when sitemap index is detected", async () => {
    mockFetch
      .mockResolvedValueOnce(okXml(SITEMAP_INDEX))  // main sitemap.xml
      .mockResolvedValue(okXml(CHILD_SITEMAP));      // child sitemaps

    const urls = await fetchSitemapUrls("https://example.com");
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain("https://example.com/blog/");
  });

  it("caps pages per child sitemap at 5", async () => {
    mockFetch
      .mockResolvedValueOnce(okXml(SITEMAP_INDEX))
      .mockResolvedValue(okXml(CHILD_SITEMAP)); // 6 pages in child

    const urls = await fetchSitemapUrls("https://example.com");
    // 2 child sitemaps × 5 pages each = 10 max
    expect(urls.length).toBeLessThanOrEqual(10);
  });

  it("returns empty array on network error", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));
    const urls = await fetchSitemapUrls("https://example.com");
    expect(urls).toEqual([]);
  });

  it("handles malformed XML gracefully", async () => {
    mockFetch.mockResolvedValue(okXml("<this is not valid xml>>>"));
    const urls = await fetchSitemapUrls("https://example.com");
    expect(urls).toEqual([]);
  });
});
