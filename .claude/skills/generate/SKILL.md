---
name: generate
description: Run the full llms.txt generation pipeline against a URL and print the result
disable-model-invocation: true
allowed-tools: Bash
---

Run the full llms.txt generation pipeline against the provided URL and print the output.

URL: $ARGUMENTS

Steps:
1. Crawl the provided URL via `npx tsx scripts/generate.ts $ARGUMENTS`
2. Pass results through the llms.txt formatter
3. Print the full llms.txt output to the console
4. Report any pages skipped or with missing metadata
5. Report total pages crawled and time taken
