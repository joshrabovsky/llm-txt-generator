---
name: crawl
description: Test crawl a URL and inspect extracted metadata output during development
disable-model-invocation: true
allowed-tools: Bash
---

Test the crawler against the provided URL and print the extracted page data.

URL to crawl: $ARGUMENTS

Steps:
1. Run the crawler directly against the URL: `npx tsx scripts/crawl.ts $ARGUMENTS`
2. Pretty-print the resulting PageData objects (title, description, URL for each page)
3. Report how many pages were found and any errors encountered
4. Flag any pages missing titles or descriptions
