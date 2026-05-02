import assert from "node:assert/strict";
import test from "node:test";

import { compareHeadings, formatComparisonReport } from "../src/compare.ts";
import type { Heading } from "../src/markdown.ts";

const source: Heading[] = [
  { level: 1, text: "Readme Echo", line: 1 },
  { level: 2, text: "Install", line: 5 },
  { level: 2, text: "Usage", line: 10 },
  { level: 2, text: "License", line: 20 },
];

test("detects missing headings", () => {
  const target = source.filter((heading) => heading.text !== "Usage");
  const result = compareHeadings("README.md", "README-zh.md", source, target, {
    allowLocalizedTitles: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.differences[0]?.type, "missing");
  assert.match(result.differences[0]?.message ?? "", /Usage/);
});

test("detects extra headings", () => {
  const target = [
    ...source,
    { level: 2, text: "Sponsors", line: 30 },
  ];
  const result = compareHeadings("README.md", "README-zh.md", source, target, {
    allowLocalizedTitles: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.differences[0]?.type, "extra");
  assert.match(result.differences[0]?.message ?? "", /Sponsors/);
});

test("detects reordered headings", () => {
  const target = [source[0], source[2], source[1], source[3]];
  const result = compareHeadings("README.md", "README-jp.md", source, target, {
    allowLocalizedTitles: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.differences[0]?.type, "reordered");
  assert.match(result.differences[0]?.message ?? "", /expected/);
});

test("supports localized-title mode by comparing heading levels and order only", () => {
  const target: Heading[] = [
    { level: 1, text: "自述 Echo", line: 1 },
    { level: 2, text: "安装", line: 5 },
    { level: 2, text: "用法", line: 10 },
    { level: 2, text: "许可证", line: 20 },
  ];
  const result = compareHeadings("README.md", "README-zh.md", source, target, {
    allowLocalizedTitles: true,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.differences, []);
});

test("formats readable reports for drift", () => {
  const target = source.filter((heading) => heading.text !== "Usage");
  const result = compareHeadings("README.md", "README-zh.md", source, target, {
    allowLocalizedTitles: false,
  });

  assert.match(formatComparisonReport(result), /README-zh\.md/);
  assert.match(formatComparisonReport(result), /Missing/);
});
