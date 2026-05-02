# Readme Echo

Readme Echo is a small CLI that checks whether localized README files keep the same heading structure as the main English README.

It is designed for maintainers who want a deterministic, CI-friendly documentation check without translation services, external AI calls, or execution of README content. This project is maintained with AI assistance, with tests and human-readable project files kept in English-first source control.

## Install

Use it with `npx` after publishing:

```sh
npx readme-echo check
```

For local development from this repository:

```sh
npm test
node src/cli.ts check
```

Node.js 22.18 or newer is required.

## Quick Start

Create a main `README.md` and one or more top-level localized files such as `README-zh.md` or `README-jp.md`.

Run:

```sh
readme-echo check
```

By default, Readme Echo uses `README.md` as the source and checks every top-level file matching `README-*.md`.

## Config

Add `.readme-echo.json` at the repository root when defaults are not enough:

```json
{
  "source": "README.md",
  "targets": ["README-zh.md", "README-jp.md"],
  "ignoreHeadings": ["Changelog"],
  "allowLocalizedTitles": true
}
```

Options:

- `source`: source README path.
- `targets`: localized README paths.
- `ignoreHeadings`: exact heading texts to ignore.
- `allowLocalizedTitles`: compare heading levels and order without requiring translated titles to match the English text.

## CLI Output

When files are synchronized, the command exits with code `0`.

When drift is found, it exits with code `1` and reports missing, extra, or reordered headings.

Use `readme-echo check --json` for machine-readable output. It prints a JSON object with `ok`, `source`, `targets`, and `reports`; drifting reports include the target path and structured heading differences.

Use `readme-echo check --quiet` to suppress output when files are synchronized. Drift reports are still printed.

## CI

Use this GitHub Actions job as a documentation quality gate:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
      - run: node src/cli.ts check
```

## Development

The project uses TypeScript source files and Node's built-in test runner.

```sh
npm test
```

The implementation is intentionally dependency-light and does not execute Markdown content or code blocks.

## Testing

Tests cover Markdown heading parsing, fenced code block handling, comparison behavior, config loading, and CLI results.

The project was built with a strict TDD workflow: failing tests first, minimal implementation, focused test runs, full suite, then cleanup.

## Roadmap

- Support optional fail-fast mode.
- Add more diagnostics for duplicate headings.
- Publish signed package releases.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and keep commit messages in English using Conventional Commits.

## License

Readme Echo is released under the [MIT License](LICENSE).
