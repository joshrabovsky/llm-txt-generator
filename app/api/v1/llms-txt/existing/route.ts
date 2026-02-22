import { NextRequest } from "next/server";
import { fetchExistingLlmsTxt } from "@/lib/crawler/llmstxt";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const llmsTxt = await fetchExistingLlmsTxt(url);

  return new Response(JSON.stringify({ llmsTxt }), {
    headers: { "Content-Type": "application/json" },
  });
}
