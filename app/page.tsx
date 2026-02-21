"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrawlProgressEvent, GenerateResult } from "@/lib/types";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

type AppState = "idle" | "crawling" | "done" | "error";

type ProgressEntry =
  | { kind: "progress"; message: string; pagesFound: number }
  | { kind: "skip"; url: string; reason: string };

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const progressEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    progressEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) return;

    // Reset state
    setState("crawling");
    setProgress([]);
    setResult(null);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // NDJSON: split on newlines and parse each complete line
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // last element may be incomplete

        for (const line of lines) {
          if (!line.trim()) continue;

          const event: CrawlProgressEvent = JSON.parse(line);

          if (event.type === "progress") {
            setProgress((prev) => {
              const updated = [...prev, { kind: "progress" as const, message: event.message, pagesFound: event.pagesFound }];
              setTimeout(scrollToBottom, 50);
              return updated;
            });
          } else if (event.type === "skip") {
            setProgress((prev) => {
              const updated = [...prev, { kind: "skip" as const, url: event.url, reason: event.reason }];
              setTimeout(scrollToBottom, 50);
              return updated;
            });
          } else if (event.type === "done") {
            setResult(event.result);
            setState("done");
          } else if (event.type === "error") {
            setError(event.message);
            setState("error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const handleCopy = async () => {
    if (!result?.llmsTxt) return;
    await navigator.clipboard.writeText(result.llmsTxt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.llmsTxt) return;
    const blob = new Blob([result.llmsTxt], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleReset = () => {
    setState("idle");
    setProgress([]);
    setResult(null);
    setError(null);
    setUrl("");
  };

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">llms.txt Generator</h1>
          <p className="text-muted-foreground">
            Enter a website URL to generate an{" "}
            <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">llms.txt</code>{" "}
            file conforming to the{" "}
            <a
              href="https://llmstxt.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              llmstxt.org
            </a>{" "}
            spec.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={state === "crawling"}
            className="flex-1"
          />
          <Button type="submit" disabled={state === "crawling" || !url.trim()}>
            {state === "crawling" ? "Crawling..." : "Generate"}
          </Button>
        </form>

        {/* Progress */}
        {progress.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Crawl Progress
                {state === "crawling" && (
                  <Badge variant="secondary" className="animate-pulse">
                    Live
                  </Badge>
                )}
                {state === "done" && (
                  <Badge variant="default">
                    {[...progress].reverse().find((e) => e.kind === "progress")?.pagesFound ?? 0} pages
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 overflow-y-auto space-y-1 font-mono text-xs text-muted-foreground">
                {progress.map((entry, i) =>
                  entry.kind === "skip" ? (
                    <div key={i} className="flex gap-2">
                      <span className="text-yellow-500 shrink-0">⚠</span>
                      <span className="text-yellow-600 dark:text-yellow-400 truncate">
                        Skipped: {entry.url} — {entry.reason}
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2">
                      <span className="text-green-500 shrink-0">✓</span>
                      <span>{entry.message}</span>
                    </div>
                  )
                )}
                <div ref={progressEndRef} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {state === "error" && error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {state === "done" && result && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Generated llms.txt</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SyntaxHighlighter
                language="markdown"
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: "0 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px)",
                  fontSize: "0.75rem",
                  maxHeight: "500px",
                }}
              >
                {result.llmsTxt}
              </SyntaxHighlighter>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
