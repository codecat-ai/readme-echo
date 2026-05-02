#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { compareHeadings, formatComparisonReport, type ComparisonResult } from "./compare.ts";
import { loadConfig } from "./config.ts";
import { filterIgnoredHeadings, parseHeadings } from "./markdown.ts";

async function readHeadings(cwd: string, path: string, ignoredTexts: string[]) {
  const content = await readFile(join(cwd, path), "utf8");
  return filterIgnoredHeadings(parseHeadings(content), ignoredTexts);
}

function formatSummary(checkedTargets: number, driftReports: number): string {
  return `Checked ${checkedTargets} target README file(s): ${driftReports} drift report(s).`;
}

function formatJsonReport(source: string, targets: string[], results: ComparisonResult[]) {
  return {
    ok: results.length === 0,
    source,
    targets,
    summary: {
      checkedTargets: targets.length,
      driftReports: results.length,
    },
    reports: results.map((result) => ({
      target: result.targetPath,
      differences: result.differences.map(({ type, source, target }) => ({
        type,
        ...(source ? { source } : {}),
        ...(target ? { target } : {}),
      })),
    })),
  };
}

function stringifyJson(value: unknown, pretty: boolean): string {
  return JSON.stringify(value, null, pretty ? 2 : undefined);
}

type CheckOptions = {
  json: boolean;
  pretty: boolean;
  quiet: boolean;
  summary: boolean;
  failFast: boolean;
  targets: string[];
};

const checkUsage = "Usage: readme-echo check [--json] [--pretty] [--quiet] [--summary] [--fail-fast] [--target <path>]";
const listTargetsUsage = "Usage: readme-echo list-targets [--json] [--pretty]";
const showConfigUsage = "Usage: readme-echo show-config [--json] [--pretty]";

function parseCheckOptions(options: string[]): CheckOptions | undefined {
  const parsed: CheckOptions = {
    json: false,
    pretty: false,
    quiet: false,
    summary: false,
    failFast: false,
    targets: [],
  };

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (option === "--json") {
      parsed.json = true;
    } else if (option === "--pretty") {
      parsed.pretty = true;
    } else if (option === "--quiet") {
      parsed.quiet = true;
    } else if (option === "--summary") {
      parsed.summary = true;
    } else if (option === "--fail-fast") {
      parsed.failFast = true;
    } else if (option === "--target") {
      const target = options[index + 1];
      if (!target || target.startsWith("--")) {
        return undefined;
      }
      parsed.targets.push(target);
      index += 1;
    } else {
      return undefined;
    }
  }

  if (parsed.pretty && !parsed.json) {
    return undefined;
  }

  return parsed;
}

export async function run(argv: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
  const command = argv[0] ?? "check";
  const options = argv.slice(1);
  const json = options.includes("--json");

  if (command === "list-targets") {
    const pretty = options.includes("--pretty");
    const hasUnknownOption = options.some((option) => option !== "--json" && option !== "--pretty");

    if (hasUnknownOption || (pretty && !json)) {
      console.error(listTargetsUsage);
      return 1;
    }

    const config = await loadConfig(cwd);
    if (json) {
      console.log(stringifyJson({
        source: config.source,
        targets: config.targets,
      }, pretty));
      return 0;
    }

    for (const target of config.targets) {
      console.log(target);
    }
    return 0;
  }

  if (command === "show-config") {
    const hasUnknownOption = options.some((option) => option !== "--json" && option !== "--pretty");

    if (hasUnknownOption) {
      console.error(showConfigUsage);
      return 1;
    }

    console.log(stringifyJson(await loadConfig(cwd), true));
    return 0;
  }

  const checkOptions = parseCheckOptions(options);

  if (command !== "check" || !checkOptions) {
    console.error(checkUsage);
    return 1;
  }

  const config = await loadConfig(cwd);
  const failFast = checkOptions.failFast || config.failFast;
  const targets = checkOptions.targets.length > 0 ? checkOptions.targets : config.targets;
  const sourceHeadings = await readHeadings(cwd, config.source, config.ignoreHeadings);
  const checkedTargets: string[] = [];
  const reports: string[] = [];
  const comparisonResults: ComparisonResult[] = [];
  let hasDrift = false;

  for (const target of targets) {
    checkedTargets.push(target);
    const targetHeadings = await readHeadings(cwd, target, config.ignoreHeadings);
    const result = compareHeadings(config.source, target, sourceHeadings, targetHeadings, {
      allowLocalizedTitles: config.allowLocalizedTitles,
    });

    if (!result.ok) {
      hasDrift = true;
      reports.push(formatComparisonReport(result));
      comparisonResults.push(result);

      if (failFast) {
        break;
      }
    }
  }

  if (checkOptions.json) {
    console.log(stringifyJson(formatJsonReport(config.source, checkedTargets, comparisonResults), checkOptions.pretty));
    return hasDrift ? 1 : 0;
  }

  if (hasDrift) {
    const textReport = reports.join("\n\n");
    const summaryReport = formatSummary(checkedTargets.length, comparisonResults.length);
    console.log(checkOptions.summary ? `${textReport}\n\n${summaryReport}` : textReport);
    return 1;
  }

  if (!checkOptions.quiet) {
    console.log("All README files are synchronized.");
    if (checkOptions.summary) {
      console.log(formatSummary(checkedTargets.length, comparisonResults.length));
    }
  }
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
