import * as cheerio from "cheerio";

const MAX_CHILD_SITEMAPS = 10;
const MAX_PAGES_PER_CHILD = 5;

export async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();

  try {
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": "llms-txt-generator/1.0" },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const { pageUrls, childSitemapUrls } = parseSitemapXml(xml);

    // Standard sitemap — return page URLs directly
    if (pageUrls.length > 0) return pageUrls;

    // Sitemap index — fetch child sitemaps and extract page URLs from each
    if (childSitemapUrls.length > 0) {
      const allPageUrls: string[] = [];

      for (const childUrl of childSitemapUrls.slice(0, MAX_CHILD_SITEMAPS)) {
        try {
          const childResponse = await fetch(childUrl, {
            headers: { "User-Agent": "llms-txt-generator/1.0" },
          });
          if (!childResponse.ok) continue;

          const childXml = await childResponse.text();
          const { pageUrls: childPages } = parseSitemapXml(childXml);
          allPageUrls.push(...childPages.slice(0, MAX_PAGES_PER_CHILD));
        } catch {
          continue;
        }
      }

      return allPageUrls;
    }

    return [];
  } catch {
    return [];
  }
}

function parseSitemapXml(xml: string): {
  pageUrls: string[];
  childSitemapUrls: string[];
} {
  const $ = cheerio.load(xml, { xmlMode: true });
  const pageUrls: string[] = [];
  const childSitemapUrls: string[] = [];

  // Standard sitemap: <urlset><url><loc>...</loc></url></urlset>
  $("url > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) pageUrls.push(loc);
  });

  // Sitemap index: <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
  $("sitemap > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) childSitemapUrls.push(loc);
  });

  return { pageUrls, childSitemapUrls };
}
