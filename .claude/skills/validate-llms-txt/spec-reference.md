# llms.txt Specification Reference

Source: https://llmstxt.org/

## Required Structure

```
# Title

> Optional blockquote summary

Optional additional markdown details

## Section Name

- [Page Title](https://url.com): Optional description
- [Page Title](https://url.com): Optional description

## Another Section

- [Page Title](https://url.com): Optional description
```

## Rules

- **H1 title** (`# Title`) is required and must be the first element
- **Blockquote summary** (`> ...`) is optional, placed after the H1
- **Sections** are H2 headings (`## Section`) — optional but recommended for organization
- **Link entries** must be markdown list items: `- [Title](url)` with an optional `: description`
- The file should be concise — it is meant for LLM consumption, not humans
- URLs should be direct links to content, not redirects

## Common Violations

- Missing H1 title
- Using H3+ instead of H2 for sections
- Link entries not in `- [Title](url)` format
- Descriptions not preceded by `: `
- Malformed URLs
