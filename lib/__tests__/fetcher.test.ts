import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHtml } from "../crawler/fetcher";

// Replace global fetch with a mock for all tests in this file
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchHtml", () => {
  it("returns html on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      text: async () => "<html><body>Hello</body></html>",
    });

    const result = await fetchHtml("https://example.com");
    expect(result.success).toBe(true);
    if (result.success) expect(result.html).toContain("Hello");
  });

  it("returns failure on non-200 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => "text/html" },
    });

    const result = await fetchHtml("https://example.com");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("HTTP 403");
  });

  it("returns failure when content-type is not html", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
    });

    const result = await fetchHtml("https://example.com");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toContain("Not HTML");
  });

  it("returns timed out on abort", async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));

    const result = await fetchHtml("https://example.com");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("Timed out");
  });

  it("returns request failed on unknown error", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));

    const result = await fetchHtml("https://example.com");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("Request failed");
  });
});
