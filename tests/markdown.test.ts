import assert from "node:assert/strict";
import test from "node:test";

import { parseHeadings } from "../src/markdown.ts";

test("extracts ATX headings with levels and text", () => {
  const headings = parseHeadings([
    "# Readme Echo",
    "",
    "Intro text",
    "## Install",
    "### CLI Usage ###",
    "#### Deep Dive",
  ].join("\n"));

  assert.deepEqual(headings, [
    { level: 1, text: "Readme Echo", line: 1 },
    { level: 2, text: "Install", line: 4 },
    { level: 3, text: "CLI Usage", line: 5 },
    { level: 4, text: "Deep Dive", line: 6 },
  ]);
});

test("ignores ATX headings inside fenced code blocks", () => {
  const headings = parseHeadings([
    "# Visible",
    "```md",
    "## Hidden",
    "```",
    "~~~",
    "### Also hidden",
    "~~~",
    "## Visible again",
  ].join("\n"));

  assert.deepEqual(headings, [
    { level: 1, text: "Visible", line: 1 },
    { level: 2, text: "Visible again", line: 8 },
  ]);
});
