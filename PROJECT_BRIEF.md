# Readme Echo Clean-Room Project Brief

## Project name

Readme Echo

## One-line value proposition

A small CLI that checks whether multilingual README files stay structurally synchronized with the main English README.

## Research observations

Open-source projects often provide localized README files, but translations drift over time. Maintainers need a lightweight CI-friendly check that flags missing sections and stale language variants without requiring a translation SaaS or executing untrusted project content.

This idea is inspired by common open-source documentation maintenance patterns, not by copying any implementation or documentation from another project.

## Target users

- Maintainers of open-source projects with `README.md`, `README-zh.md`, `README-jp.md`, or similar localized docs
- AI-assisted project maintainers that need documentation consistency checks in CI
- Small libraries and CLI tools that want a simple, dependency-light documentation quality gate

## Problem statement

When the English README changes, translated README files often miss new sections or keep outdated section ordering. Reviewers may not notice until users complain. A deterministic CLI can catch structural drift early in local development and CI.

## Non-goals

- It does not translate text.
- It does not judge translation quality.
- It does not call external AI services.
- It does not execute README content or code blocks.
- It does not enforce one fixed documentation style beyond configured heading structure.

## MVP features

1. CLI command `readme-echo check`.
2. Default source file: `README.md`.
3. Default localized targets: any top-level files matching `README-*.md`.
4. Parse Markdown ATX headings (`#`, `##`, ..., `######`) while ignoring headings inside fenced code blocks.
5. Compare heading level sequence between source and each target.
6. Report missing, extra, or reordered heading levels/titles in a readable format.
7. Allow a config file `.readme-echo.json` with:
   - `source`: string
   - `targets`: string array
   - `ignoreHeadings`: string array of exact heading texts to ignore
   - `allowLocalizedTitles`: boolean
   - `failFast`: boolean
8. If `allowLocalizedTitles` is true, compare only heading levels and count/order, not literal title text.
9. If fail-fast is enabled, stop checking targets after the first drift.
10. Exit code 0 when all targets pass; exit code 1 when drift is found.
11. Provide a GitHub Actions example in README.

## Suggested stack

Use TypeScript on Node.js for a portable developer-tool CLI.

Suggested package layout:

```text
readme-echo/
  package.json
  tsconfig.json
  src/
    cli.ts
    config.ts
    markdown.ts
    compare.ts
    index.ts
  tests/
    markdown.test.ts
    compare.test.ts
    cli.test.ts
  README.md
  README-zh.md
  README-jp.md
  LICENSE
  CHANGELOG.md
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  .github/workflows/ci.yml
  .github/ISSUE_TEMPLATE/bug_report.yml
  .github/ISSUE_TEMPLATE/feature_request.yml
  .github/pull_request_template.md
```

## Testing strategy

Use strict TDD. Write failing tests before production code.

Meaningful test cases:

- extracts ATX headings with levels and text
- ignores headings inside fenced code blocks
- detects missing headings
- detects extra headings
- detects reordered headings
- supports localized-title mode by comparing levels/order only
- loads config with sane defaults
- supports optional fail-fast behavior
- CLI exits 1 and prints drift when mismatch exists
- CLI exits 0 when source and targets are structurally aligned

Avoid shallow tests that only check imports or implementation details.

## Documentation requirements

- `README.md` in English
- `README-zh.md` in Chinese, synchronized in meaning
- `README-jp.md` in Japanese, synchronized in meaning
- Briefly mention that the project is maintained with AI assistance, but do not overemphasize it
- Include install, quick start, config, CI, development, testing, roadmap, contributing, license

## License

MIT only.

## Community tone

Friendly, direct, practical, and natural. Avoid repetitive AI disclaimers.
