# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Added `readme-echo version` and top-level `--version` output for printing the package version.
- Added `readme-echo show-config` for printing the effective configuration after defaults, discovery, and config-file overrides.
- Added `readme-echo list-targets` with text and JSON output for inspecting configured README targets before checks.
- Added `--pretty` for two-space formatted JSON output on `readme-echo check --json` and `readme-echo list-targets --json`.
- Added `readme-echo check --summary` for concise checked-target and drift-report totals in text output.
- Added `readme-echo check --summary-only` for text output that prints only the existing summary line and rejects `--json`.
- Added JSON `summary.checkedTargets` and `summary.driftReports` fields to `readme-echo check --json` output.
- Added optional fail-fast checks through `--fail-fast` and the `failFast` config field.
- Added `readme-echo check --duplicates` for source and checked-target duplicate heading diagnostics in text and JSON output.
- Added `readme-echo check --duplicates --source-only` for source-only duplicate heading diagnostics while still checking target drift.
- Added `readme-echo check --min-depth <n>` for runtime filtering of headings shallower than the requested level before comparison and duplicate diagnostics.
- Added `readme-echo check --max-depth <n>` for runtime heading-depth filtering before comparison and duplicate diagnostics.
- Added `readme-echo check --ignore-case` for runtime case-insensitive heading title comparison.
- Added per-target `targetReports[].durationMs` and summary-level `totalDurationMs` to `readme-echo check --json` output.
- Added `readme-echo check --json --no-timing` to omit JSON timing fields for deterministic snapshots while preserving other fields and exit codes.
- Added `readme-echo check --exit-zero` for advisory drift, duplicate heading, and strict missing target diagnostics that keep exit code `0`.
- Updated JSON output so fail-fast reports include only checked targets when checking stops early.

## 0.1.0

- Initial MIT-licensed Readme Echo CLI.
- Added Markdown heading parsing, structural comparison, config loading, CLI checks, tests, documentation, and CI metadata.
