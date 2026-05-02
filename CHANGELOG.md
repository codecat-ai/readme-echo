# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- Added `readme-echo list-targets` with text and JSON output for inspecting configured README targets before checks.
- Added `readme-echo check --summary` for concise checked-target and drift-report totals in text output.
- Added JSON `summary.checkedTargets` and `summary.driftReports` fields to `readme-echo check --json` output.
- Added optional fail-fast checks through `--fail-fast` and the `failFast` config field.
- Updated JSON output so fail-fast reports include only checked targets when checking stops early.

## 0.1.0

- Initial MIT-licensed Readme Echo CLI.
- Added Markdown heading parsing, structural comparison, config loading, CLI checks, tests, documentation, and CI metadata.
