import * as cheerio from "cheerio";

export async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();

  try {
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": "llms-txt-generator/1.0" },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseSitemapXml(xml);
  } catch {
    return [];
  }
}

function parseSitemapXml(xml: string): string[] {
  // cheerio can parse XML too
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];

  // Standard sitemap: <urlset><url><loc>...</loc></url></urlset>
  $("url > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) urls.push(loc);
  });

  // Sitemap index: <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
  // For simplicity, we only go one level deep
  if (urls.length === 0) {
    $("sitemap > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) urls.push(loc);
    });
  }

  return urls;
}
