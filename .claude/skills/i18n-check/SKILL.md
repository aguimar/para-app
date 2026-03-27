---
name: i18n-check
description: Audit React components for hardcoded strings missing from i18n dictionaries. Usage - /i18n-check [path]
---

Scan React components for hardcoded user-facing strings that should use the i18n dictionary system.

## How it works

1. Read the dictionary files in `src/dictionaries/` (pt-BR and en-US) to understand the current translation keys.
2. Scan the target path (default: `src/components/` and `src/app/`):
   - Look for hardcoded strings in JSX text content, `title` attributes, `placeholder` attributes, `aria-label`, button text, heading text, paragraph text, and error messages.
   - Ignore: className strings, import paths, console.log, variable names, numeric literals, single-character strings, CSS values.
3. For each hardcoded string found:
   - Report the file, line number, and the string.
   - Suggest which dictionary key to use (existing) or what key to create (new).
4. Output a summary table:

| File | Line | String | Suggested Key |
|------|------|--------|---------------|

## What counts as hardcoded

- JSX text: `<p>Hello world</p>`
- Attributes: `placeholder="Search..."`, `title="Delete"`
- Template literals with user-visible text in JSX

## What to ignore

- Strings inside `cn()`, `clsx()` calls (CSS classes)
- Import/require paths
- Object keys and enum values
- console.log / console.error messages
- Test files (`*.test.*`, `*.spec.*`)
- Type annotations
- URLs and file paths
- Single characters and empty strings

## Arguments

- No argument: scan all components and app pages
- Path argument: scan only the specified file or directory (relative to project root)
