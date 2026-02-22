import { describe, it, expect, vi } from "vitest";
import { POST } from "../route";

// Mock crawlWebsite so no real network requests are made
vi.mock("@/lib/crawler", () => ({
  crawlWebsite: vi.fn(async (_url: string, onProgress: Function) => {
    onProgress({ type: "progress", message: "Crawled: Test Page", pagesFound: 1 });
    return {
      siteTitle: "Test Site",
      siteDescription: "A test site",
      baseUrl: "https://example.com",
      pages: [
        { url: "https://example.com/", title: "Test Site", description: "A test site" },
        { url: "https://example.com/about", title: "About", description: "About us" },
      ],
    };
  }),
}));

const makeRequest = (body: object) =>
  new Request("http://localhost/api/v1/llms-txt/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const readNdjson = async (response: Response) => {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

describe("POST /api/v1/llms-txt/generate", () => {
  it("returns 400 when url is missing", async () => {
    const response = await POST(makeRequest({}) as any);
    expect(response.status).toBe(400);
  });

  it("returns 400 when url is malformed", async () => {
    const response = await POST(makeRequest({ url: "not-a-url" }) as any);
    expect(response.status).toBe(400);
  });

  it("streams progress events followed by a done event", async () => {
    const response = await POST(makeRequest({ url: "https://example.com" }) as any);
    expect(response.status).toBe(200);

    const events = await readNdjson(response);
    const progressEvents = events.filter((e) => e.type === "progress");
    const doneEvent = events.find((e) => e.type === "done");

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(doneEvent).toBeDefined();
  });

  it("done event contains valid llms.txt output", async () => {
    const response = await POST(makeRequest({ url: "https://example.com" }) as any);
    const events = await readNdjson(response);
    const doneEvent = events.find((e) => e.type === "done");

    expect(doneEvent.result.llmsTxt).toContain("# Test Site");
    expect(doneEvent.result.llmsTxt).toContain("https://example.com");
  });

  it("response content-type is ndjson", async () => {
    const response = await POST(makeRequest({ url: "https://example.com" }) as any);
    expect(response.headers.get("content-type")).toBe("application/x-ndjson");
  });
});
