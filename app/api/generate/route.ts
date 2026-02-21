import { NextRequest } from "next/server";
import { crawlWebsite } from "@/lib/crawler";
import { generateLlmsTxt } from "@/lib/generator";
import { CrawlProgressEvent, GenerateResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: "Malformed URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CrawlProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const result = await crawlWebsite(url, send);
        const llmsTxt = generateLlmsTxt(result);
        send({ type: "done", result: { ...result, llmsTxt } });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
