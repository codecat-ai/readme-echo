import type { Heading } from "./markdown.ts";

export type DifferenceType = "missing" | "extra" | "reordered";

export type HeadingDifference = {
  type: DifferenceType;
  message: string;
  source?: Heading;
  target?: Heading;
};

export type CompareOptions = {
  allowLocalizedTitles: boolean;
  ignoreCase?: boolean;
};

export type ComparisonResult = {
  ok: boolean;
  sourcePath: string;
  targetPath: string;
  differences: HeadingDifference[];
};

function keyFor(heading: Heading, options: CompareOptions): string {
  if (options.allowLocalizedTitles) {
    return String(heading.level);
  }

  const text = options.ignoreCase ? heading.text.toLowerCase() : heading.text;
  return `${heading.level}:${text}`;
}

function describeHeading(heading: Heading): string {
  return `${"#".repeat(heading.level)} ${heading.text} (line ${heading.line})`;
}

function sameMultiset(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const counts = new Map<string, number>();
  for (const item of left) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  for (const item of right) {
    const count = counts.get(item) ?? 0;
    if (count === 0) {
      return false;
    }
    counts.set(item, count - 1);
  }

  return [...counts.values()].every((count) => count === 0);
}

export function compareHeadings(
  sourcePath: string,
  targetPath: string,
  sourceHeadings: Heading[],
  targetHeadings: Heading[],
  options: CompareOptions,
): ComparisonResult {
  const sourceKeys = sourceHeadings.map((heading) => keyFor(heading, options));
  const targetKeys = targetHeadings.map((heading) => keyFor(heading, options));
  const differences: HeadingDifference[] = [];

  if (
    sourceKeys.length === targetKeys.length
    && sameMultiset(sourceKeys, targetKeys)
    && sourceKeys.some((key, index) => key !== targetKeys[index])
  ) {
    differences.push({
      type: "reordered",
      message: `Reordered heading sequence: expected ${sourcePath} order in ${targetPath}.`,
    });
  } else {
    const targetCounts = new Map<string, number>();
    for (const key of targetKeys) {
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    for (const heading of sourceHeadings) {
      const key = keyFor(heading, options);
      const count = targetCounts.get(key) ?? 0;
      if (count > 0) {
        targetCounts.set(key, count - 1);
      } else {
        differences.push({
          type: "missing",
          source: heading,
          message: `Missing heading in ${targetPath}: ${describeHeading(heading)}.`,
        });
      }
    }

    const sourceCounts = new Map<string, number>();
    for (const key of sourceKeys) {
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    for (const heading of targetHeadings) {
      const key = keyFor(heading, options);
      const count = sourceCounts.get(key) ?? 0;
      if (count > 0) {
        sourceCounts.set(key, count - 1);
      } else {
        differences.push({
          type: "extra",
          target: heading,
          message: `Extra heading in ${targetPath}: ${describeHeading(heading)}.`,
        });
      }
    }
  }

  return {
    ok: differences.length === 0,
    sourcePath,
    targetPath,
    differences,
  };
}

export function formatComparisonReport(result: ComparisonResult): string {
  if (result.ok) {
    return `${result.targetPath}: synchronized with ${result.sourcePath}`;
  }

  const lines = [
    `${result.targetPath}: drift from ${result.sourcePath}`,
    ...result.differences.map((difference) => `- ${difference.message}`),
  ];
  return lines.join("\n");
}
