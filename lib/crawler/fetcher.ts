const DEFAULT_TIMEOUT_MS = 10_000;

type FetchResult =
  | { success: true; html: string }
  | { success: false; reason: string };

export async function fetchHtml(url: string): Promise<FetchResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "llms-txt-generator/1.0",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, reason: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { success: false, reason: `Not HTML (${contentType.split(";")[0].trim()})` };
    }

    return { success: true, html: await response.text() };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, reason: "Timed out" };
    }
    return { success: false, reason: "Request failed" };
  }
}
