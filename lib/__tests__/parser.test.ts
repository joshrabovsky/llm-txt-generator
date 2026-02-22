import { describe, it, expect } from "vitest";
import { parsePageData, extractLinks } from "../crawler/parser";

describe("parsePageData", () => {
  it("extracts title from <title> tag", () => {
    const html = "<html><head><title>My Site</title></head></html>";
    const result = parsePageData(html, "https://example.com");
    expect(result.title).toBe("My Site");
  });

  it("falls back to <h1> when no <title>", () => {
    const html = "<html><body><h1>Page Heading</h1></body></html>";
    const result = parsePageData(html, "https://example.com/about");
    expect(result.title).toBe("Page Heading");
  });

  it("falls back to URL pathname when no title or h1", () => {
    const html = "<html><body></body></html>";
    const result = parsePageData(html, "https://example.com/about");
    expect(result.title).toBe("/about");
  });

  it("extracts meta description", () => {
    const html = `<html><head><meta name="description" content="A great site"></head></html>`;
    const result = parsePageData(html, "https://example.com");
    expect(result.description).toBe("A great site");
  });

  it("falls back to og:description when no meta description", () => {
    const html = `<html><head><meta property="og:description" content="OG desc"></head></html>`;
    const result = parsePageData(html, "https://example.com");
    expect(result.description).toBe("OG desc");
  });

  it("returns empty description when none found", () => {
    const html = "<html><body></body></html>";
    const result = parsePageData(html, "https://example.com");
    expect(result.description).toBe("");
  });

  it("includes the url in the result", () => {
    const html = "<html><head><title>Test</title></head></html>";
    const result = parsePageData(html, "https://example.com/page");
    expect(result.url).toBe("https://example.com/page");
  });
});

describe("extractLinks", () => {
  it("extracts same-origin links", () => {
    const html = `<html><body><a href="/about">About</a></body></html>`;
    const links = extractLinks(html, "https://example.com");
    expect(links).toContain("https://example.com/about");
  });

  it("excludes external links", () => {
    const html = `<html><body><a href="https://other.com/page">External</a></body></html>`;
    const links = extractLinks(html, "https://example.com");
    expect(links).toHaveLength(0);
  });

  it("strips hash fragments", () => {
    const html = `<html><body><a href="/about#section">About</a></body></html>`;
    const links = extractLinks(html, "https://example.com");
    expect(links).toContain("https://example.com/about");
    expect(links.every(l => !l.includes("#"))).toBe(true);
  });

  it("strips trailing slashes", () => {
    const html = `<html><body><a href="/about/">About</a></body></html>`;
    const links = extractLinks(html, "https://example.com");
    expect(links).toContain("https://example.com/about");
  });

  it("ignores invalid hrefs", () => {
    const html = `<html><body><a href="javascript:void(0)">Click</a></body></html>`;
    const links = extractLinks(html, "https://example.com");
    expect(links).toHaveLength(0);
  });
});
