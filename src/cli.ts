#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { compareHeadings, formatComparisonReport } from "./compare.ts";
import { loadConfig } from "./config.ts";
import { filterIgnoredHeadings, parseHeadings } from "./markdown.ts";

async function readHeadings(cwd: string, path: string, ignoredTexts: string[]) {
  const content = await readFile(join(cwd, path), "utf8");
  return filterIgnoredHeadings(parseHeadings(content), ignoredTexts);
}

export async function run(argv: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
  const command = argv[0] ?? "check";
  if (command !== "check") {
    console.error("Usage: readme-echo check");
    return 1;
  }

  const config = await loadConfig(cwd);
  const sourceHeadings = await readHeadings(cwd, config.source, config.ignoreHeadings);
  const reports: string[] = [];
  let hasDrift = false;

  for (const target of config.targets) {
    const targetHeadings = await readHeadings(cwd, target, config.ignoreHeadings);
    const result = compareHeadings(config.source, target, sourceHeadings, targetHeadings, {
      allowLocalizedTitles: config.allowLocalizedTitles,
    });

    if (!result.ok) {
      hasDrift = true;
      reports.push(formatComparisonReport(result));
    }
  }

  if (hasDrift) {
    console.log(reports.join("\n\n"));
    return 1;
  }

  console.log("All README files are synchronized.");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
