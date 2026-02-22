import { describe, it, expect } from "vitest";
import { generateLlmsTxt } from "../generator";

const baseCrawlResult = {
  siteTitle: "Example Site",
  siteDescription: "An example website",
  baseUrl: "https://example.com",
  pages: [],
};

describe("generateLlmsTxt", () => {
  it("outputs h1 with site title", () => {
    const result = generateLlmsTxt(baseCrawlResult);
    expect(result).toContain("# Example Site");
  });

  it("outputs blockquote with site description", () => {
    const result = generateLlmsTxt(baseCrawlResult);
    expect(result).toContain("> An example website");
  });

  it("omits blockquote when description is empty", () => {
    const result = generateLlmsTxt({ ...baseCrawlResult, siteDescription: "" });
    expect(result).not.toContain(">");
  });

  it("puts root page under Overview section", () => {
    const result = generateLlmsTxt({
      ...baseCrawlResult,
      pages: [{ url: "https://example.com/", title: "Home", description: "Homepage" }],
    });
    expect(result).toContain("## Overview");
    expect(result).toContain("[Home](https://example.com/)");
  });

  it("puts non-root pages under Pages section", () => {
    const result = generateLlmsTxt({
      ...baseCrawlResult,
      pages: [{ url: "https://example.com/about", title: "About", description: "About us" }],
    });
    expect(result).toContain("## Pages");
    expect(result).toContain("[About](https://example.com/about)");
  });

  it("includes description in page entry", () => {
    const result = generateLlmsTxt({
      ...baseCrawlResult,
      pages: [{ url: "https://example.com/about", title: "About", description: "About us" }],
    });
    expect(result).toContain(": About us");
  });

  it("omits description colon when description is empty", () => {
    const result = generateLlmsTxt({
      ...baseCrawlResult,
      pages: [{ url: "https://example.com/about", title: "About", description: "" }],
    });
    expect(result).not.toContain(": ");
  });

  it("falls back to url when title is empty", () => {
    const result = generateLlmsTxt({
      ...baseCrawlResult,
      pages: [{ url: "https://example.com/about", title: "", description: "" }],
    });
    expect(result).toContain("[https://example.com/about]");
  });
});
