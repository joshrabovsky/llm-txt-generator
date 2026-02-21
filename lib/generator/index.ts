import { CrawlResult, PageData } from "../types";

export function generateLlmsTxt(result: CrawlResult): string {
  const lines: string[] = [];

  // H1: site title
  lines.push(`# ${result.siteTitle}`);
  lines.push("");

  // Blockquote: site description
  if (result.siteDescription) {
    lines.push(`> ${result.siteDescription}`);
    lines.push("");
  }

  // Group pages by path depth
  // Root page gets its own "Overview" section
  // All other pages go under "Pages"
  const rootPages = result.pages.filter((p) => {
    const pathname = new URL(p.url).pathname;
    return pathname === "/" || pathname === "";
  });

  const otherPages = result.pages.filter((p) => {
    const pathname = new URL(p.url).pathname;
    return pathname !== "/" && pathname !== "";
  });

  if (rootPages.length > 0) {
    lines.push("## Overview");
    lines.push("");
    for (const page of rootPages) {
      lines.push(formatPageEntry(page));
    }
    lines.push("");
  }

  if (otherPages.length > 0) {
    lines.push("## Pages");
    lines.push("");
    for (const page of otherPages) {
      lines.push(formatPageEntry(page));
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatPageEntry(page: PageData): string {
  const title = page.title || page.url;
  const description = page.description ? `: ${page.description}` : "";
  return `- [${title}](${page.url})${description}`;
}
