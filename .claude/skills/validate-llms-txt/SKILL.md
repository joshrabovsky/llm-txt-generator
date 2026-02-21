---
name: validate-llms-txt
description: Validate a generated llms.txt file against the official llmstxt.org specification
disable-model-invocation: true
allowed-tools: Read
context: fork
---

Validate the provided llms.txt file or content against the official spec.

Input (file path or raw content): $ARGUMENTS

Validation checklist (per llmstxt.org spec):
1. Required H1 title is present as the first line
2. Optional blockquote summary block is valid markdown (if present)
3. Each section uses H2 heading format
4. Each link entry follows: `- [Title](url): Optional description`
5. No required fields are missing
6. File uses valid markdown throughout
7. URLs are well-formed

Output a clear pass/fail summary with specific line numbers for any violations found.

See [spec-reference.md](spec-reference.md) for the full specification details.
