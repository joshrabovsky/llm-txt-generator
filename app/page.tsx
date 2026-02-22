"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrawlProgressEvent, CrawlResult, GenerateResult, EventType } from "@/lib/types";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppState = "idle" | "crawling" | "done" | "error";
type TabId = "deterministic" | "ai" | "existing";

type ProgressEntry =
  | { kind: "progress"; message: string; pagesFound: number }
  | { kind: "skip"; url: string; reason: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("deterministic");

  // Deterministic state
  const [appState, setAppState] = useState<AppState>("idle");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [deterministicResult, setDeterministicResult] = useState<GenerateResult | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // AI state
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiTokens, setAiTokens] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Existing llms.txt state
  const [existingStatus, setExistingStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [existingLlmsTxt, setExistingLlmsTxt] = useState<string | null>(null);

  // Copy state per tab
  const [copiedTab, setCopiedTab] = useState<TabId | null>(null);

  // Toast notification — message and visibility are decoupled so text
  // remains rendered for the full duration of the fade-out
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  }, []);

  const scrollToBottom = () => {
    progressEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Existing llms.txt check ──────────────────────────────────────────────

  const checkExistingLlmsTxt = async (targetUrl: string) => {
    setExistingStatus("loading");
    try {
      const response = await fetch(`/api/v1/llms-txt/existing?url=${encodeURIComponent(targetUrl)}`);
      const { llmsTxt } = await response.json();
      if (llmsTxt) {
        setExistingLlmsTxt(llmsTxt);
        setExistingStatus("found");
      } else {
        setExistingStatus("not-found");
      }
    } catch {
      setExistingStatus("not-found");
    }
  };

  // ─── AI generation ────────────────────────────────────────────────────────

  const runAiGeneration = async (crawlResult: CrawlResult) => {
    setAiStatus("loading");
    setAiTokens("");
    setAiError(null);

    try {
      const response = await fetch("/api/v1/llms-txt/generate-aeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crawlResult),
      });

      if (!response.ok || !response.body) throw new Error("AI request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: CrawlProgressEvent = JSON.parse(line);

          if (event.type === EventType.AiToken) {
            setAiTokens((prev) => prev + event.token);
          } else if (event.type === EventType.Done) {
            setAiStatus("done");
          } else if (event.type === EventType.Error) {
            setAiError(event.message);
            setAiStatus("error");
          }
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI generation failed");
      setAiStatus("error");
    }
  };

  // ─── Deterministic crawl ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = url.trim();
    if (!trimmed) return;

    if (trimmed.includes("://")) {
      // Protocol explicitly provided — validate it's http/https
      if (!/^https?:\/\//i.test(trimmed)) {
        showToast("Only http:// and https:// URLs are supported.");
        return;
      }
    } else {
      // No protocol — assume https
      trimmed = `https://${trimmed}`;
    }

    // Validate the full URL before hitting the API
    try {
      const parsed = new URL(trimmed);
      const hostname = parsed.hostname;
      const isLocalhost = hostname === "localhost";
      const hasValidDomain = hostname.includes(".") && hostname.split(".").every(part => part.length > 0);
      if (!isLocalhost && !hasValidDomain) {
        showToast("Please enter a valid URL.");
        return;
      }
    } catch {
      showToast("Please enter a valid URL.");
      return;
    }

    // Reset all state
    setAppState("crawling");
    setProgress([]);
    setDeterministicResult(null);
    setCrawlError(null);
    setAiStatus("idle");
    setAiTokens("");
    setAiError(null);
    setExistingStatus("idle");
    setExistingLlmsTxt(null);
    setCopiedTab(null);
    setActiveTab("deterministic");

    // Fire existing llms.txt check immediately — no need to await
    checkExistingLlmsTxt(trimmed);

    try {
      const response = await fetch("/api/v1/llms-txt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let crawlResult: CrawlResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: CrawlProgressEvent = JSON.parse(line);

          if (event.type === EventType.Progress) {
            setProgress((prev) => {
              const updated = [...prev, { kind: "progress" as const, message: event.message, pagesFound: event.pagesFound }];
              setTimeout(scrollToBottom, 50);
              return updated;
            });
          } else if (event.type === EventType.Skip) {
            setProgress((prev) => {
              const updated = [...prev, { kind: "skip" as const, url: event.url, reason: event.reason }];
              setTimeout(scrollToBottom, 50);
              return updated;
            });
          } else if (event.type === EventType.Done) {
            setDeterministicResult(event.result);
            setAppState("done");
            crawlResult = event.result;
          } else if (event.type === EventType.Error) {
            setCrawlError(event.message);
            setAppState("error");
          }
        }
      }

      // Trigger AI generation after crawl completes
      if (crawlResult) {
        await runAiGeneration(crawlResult);
      }
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : "Something went wrong");
      setAppState("error");
    }
  };

  // ─── Clipboard ────────────────────────────────────────────────────────────

  const handleCopy = async (tab: TabId) => {
    const text =
      tab === "deterministic" ? deterministicResult?.llmsTxt :
      tab === "ai" ? aiTokens :
      existingLlmsTxt;

    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownload = (tab: TabId) => {
    const text =
      tab === "deterministic" ? deterministicResult?.llmsTxt :
      tab === "ai" ? aiTokens :
      existingLlmsTxt;

    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleReset = () => {
    setAppState("idle");
    setProgress([]);
    setDeterministicResult(null);
    setCrawlError(null);
    setAiStatus("idle");
    setAiTokens("");
    setAiError(null);
    setExistingStatus("idle");
    setExistingLlmsTxt(null);
    setUrl("");
    setActiveTab("deterministic");
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const isActive = appState !== "idle";

  const tabs: { id: TabId; label: string }[] = [
    { id: "deterministic", label: "Deterministic" },
    { id: "ai", label: "AI Optimized" },
    { id: "existing", label: "Existing" },
  ];

  const getTabBadge = (tab: TabId) => {
    if (tab === "deterministic") {
      if (appState === "crawling") return <Badge variant="secondary" className="animate-pulse text-xs">Live</Badge>;
      if (appState === "done") return <Badge variant="default" className="text-xs">{[...progress].reverse().find(e => e.kind === "progress")?.pagesFound ?? 0} pages</Badge>;
    }
    if (tab === "ai") {
      if (aiStatus === "loading") return <Badge variant="secondary" className="animate-pulse text-xs">Generating</Badge>;
      if (aiStatus === "done") return <Badge variant="default" className="text-xs">Done</Badge>;
      if (aiStatus === "error") return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
    if (tab === "existing") {
      if (existingStatus === "loading") return <Badge variant="secondary" className="animate-pulse text-xs">Checking</Badge>;
      if (existingStatus === "found") return <Badge variant="default" className="text-xs">Found</Badge>;
      if (existingStatus === "not-found") return <Badge variant="outline" className="text-xs">None</Badge>;
    }
    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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
            <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors">
              llmstxt.org
            </a>{" "}
            spec.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={appState === "crawling" || aiStatus === "loading"}
            className="flex-1"
          />
          <Button type="submit" disabled={appState === "crawling" || aiStatus === "loading" || !url.trim()}>
            {appState === "crawling" ? "Crawling..." : aiStatus === "loading" ? "Generating..." : "Generate"}
          </Button>
          {isActive && (
            <Button variant="ghost" onClick={handleReset} type="button">
              Reset
            </Button>
          )}
        </form>

        {/* Crawl error */}
        {appState === "error" && crawlError && (
          <Card className="border-destructive">
            <CardContent className="py-2">
              <p className="text-sm text-destructive">{crawlError}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {isActive && (
          <div className="space-y-0">
            {/* Tab bar */}
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {getTabBadge(tab.id)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <Card className="rounded-tl-none border-t-0">

              {/* ── Deterministic tab ── */}
              {activeTab === "deterministic" && (
                <>
                  {/* Progress log */}
                  {progress.length > 0 && (
                    <CardContent className="pt-4 pb-0">
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
                  )}

                  {/* Result */}
                  {deterministicResult && (
                    <>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">Generated llms.txt</CardTitle>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopy("deterministic")}>
                              {copiedTab === "deterministic" ? "Copied!" : "Copy"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload("deterministic")}>
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <SyntaxHighlighter language="markdown" style={atomOneDark}
                          customStyle={{ margin: 0, borderRadius: "0 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px)", fontSize: "0.75rem", maxHeight: "400px" }}>
                          {deterministicResult.llmsTxt}
                        </SyntaxHighlighter>
                      </CardContent>
                    </>
                  )}
                </>
              )}

              {/* ── AI-Enhanced tab ── */}
              {activeTab === "ai" && (
                <>
                  {aiStatus === "idle" && (
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">AI generation will start after the crawl completes.</p>
                    </CardContent>
                  )}

                  {(aiStatus === "loading" || aiStatus === "done") && aiTokens && (
                    <>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">AI Optimized llms.txt</CardTitle>
                          {aiStatus === "done" && (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleCopy("ai")}>
                                {copiedTab === "ai" ? "Copied!" : "Copy"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDownload("ai")}>
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <SyntaxHighlighter language="markdown" style={atomOneDark}
                          customStyle={{ margin: 0, borderRadius: "0 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px)", fontSize: "0.75rem", maxHeight: "400px" }}>
                          {aiTokens}
                        </SyntaxHighlighter>
                      </CardContent>
                    </>
                  )}

                  {aiStatus === "error" && (
                    <CardContent className="pt-6">
                      <p className="text-sm text-destructive">{aiError}</p>
                    </CardContent>
                  )}
                </>
              )}

              {/* ── Existing tab ── */}
              {activeTab === "existing" && (
                <>
                  {existingStatus === "loading" && (
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground animate-pulse">Checking for existing llms.txt...</p>
                    </CardContent>
                  )}

                  {existingStatus === "not-found" && (
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        No <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">llms.txt</code> found at this domain.
                        This site has not yet adopted the standard.
                      </p>
                    </CardContent>
                  )}

                  {existingStatus === "found" && existingLlmsTxt && (
                    <>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">Existing llms.txt</CardTitle>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopy("existing")}>
                              {copiedTab === "existing" ? "Copied!" : "Copy"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload("existing")}>
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <SyntaxHighlighter language="markdown" style={atomOneDark}
                          customStyle={{ margin: 0, borderRadius: "0 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px)", fontSize: "0.75rem", maxHeight: "400px" }}>
                          {existingLlmsTxt}
                        </SyntaxHighlighter>
                      </CardContent>
                    </>
                  )}
                </>
              )}

            </Card>
          </div>
        )}

      </div>

      {/* Toast notification */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
        toastVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}>
        <div className="bg-red-600 text-white text-sm px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
          <span>⚠</span>
          {toastMessage}
        </div>
      </div>

    </main>
  );
}
