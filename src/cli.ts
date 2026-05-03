#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { compareHeadings, formatComparisonReport, type ComparisonResult } from "./compare.ts";
import { loadConfig } from "./config.ts";
import { filterIgnoredHeadings, parseHeadings, type Heading } from "./markdown.ts";

async function readHeadings(cwd: string, path: string, ignoredTexts: string[], maxDepth?: number) {
  const content = await readFile(join(cwd, path), "utf8");
  const headings = filterIgnoredHeadings(parseHeadings(content), ignoredTexts);
  return maxDepth === undefined ? headings : headings.filter((heading) => heading.level <= maxDepth);
}

function formatSummary(checkedTargets: number, driftReports: number): string {
  return `Checked ${checkedTargets} target README file(s): ${driftReports} drift report(s).`;
}

function formatMissingTargetReport(targets: string[]): string {
  return targets.map((target) => `Missing target README file: ${target}`).join("\n");
}

type DuplicateHeading = {
  level: number;
  text: string;
  count: number;
};

type DuplicateReport = {
  path: string;
  duplicates: DuplicateHeading[];
};

type TargetReport = {
  target: string;
  ok: boolean;
  durationMs: number;
};

type JsonTargetReport = TargetReport | Omit<TargetReport, "durationMs">;

type JsonReportOptions = {
  duplicateReports?: DuplicateReport[];
  missingTargets?: string[];
  includeTiming?: boolean;
};

function elapsedMsSince(startTime: number): number {
  return Math.max(0, performance.now() - startTime);
}

function detectDuplicateHeadings(path: string, headings: Heading[]): DuplicateReport | undefined {
  const counts = new Map<string, DuplicateHeading>();

  for (const heading of headings) {
    const key = `${heading.level}:${heading.text}`;
    const duplicate = counts.get(key);
    if (duplicate) {
      duplicate.count += 1;
    } else {
      counts.set(key, {
        level: heading.level,
        text: heading.text,
        count: 1,
      });
    }
  }

  const duplicates = [...counts.values()].filter((heading) => heading.count > 1);
  return duplicates.length > 0 ? { path, duplicates } : undefined;
}

function formatDuplicateReport(report: DuplicateReport): string {
  return [
    `Duplicate headings in ${report.path}:`,
    ...report.duplicates.map((duplicate) => (
      `- ${"#".repeat(duplicate.level)} ${duplicate.text} appears ${duplicate.count} times`
    )),
  ].join("\n");
}

function formatJsonReport(
  source: string,
  targets: string[],
  results: ComparisonResult[],
  targetReports: TargetReport[],
  totalDurationMs: number,
  options: JsonReportOptions = {},
) {
  const {
    duplicateReports,
    missingTargets,
    includeTiming = true,
  } = options;
  const summary = {
    checkedTargets: targets.length,
    driftReports: results.length,
    ...(includeTiming ? { totalDurationMs } : {}),
  };
  const jsonTargetReports: JsonTargetReport[] = includeTiming
    ? targetReports
    : targetReports.map(({ target, ok }) => ({ target, ok }));
  const payload = {
    ok: results.length === 0 && (!duplicateReports || duplicateReports.length === 0) && (!missingTargets || missingTargets.length === 0),
    source,
    targets,
    summary,
    targetReports: jsonTargetReports,
    reports: results.map((result) => ({
      target: result.targetPath,
      differences: result.differences.map(({ type, source, target }) => ({
        type,
        ...(source ? { source } : {}),
        ...(target ? { target } : {}),
      })),
    })),
  };
  const payloadWithMissingTargets = missingTargets ? { ...payload, missingTargets } : payload;

  return duplicateReports ? { ...payloadWithMissingTargets, duplicateReports } : payloadWithMissingTargets;
}

function stringifyJson(value: unknown, pretty: boolean): string {
  return JSON.stringify(value, null, pretty ? 2 : undefined);
}

type CheckOptions = {
  json: boolean;
  pretty: boolean;
  quiet: boolean;
  summary: boolean;
  summaryOnly: boolean;
  failFast: boolean;
  duplicates: boolean;
  sourceOnly: boolean;
  strictTargets: boolean;
  ignoreCase: boolean;
  noTiming: boolean;
  targets: string[];
  ignoreHeadings: string[];
  maxDepth?: number;
};

const checkUsage = "Usage: readme-echo check [--json] [--pretty] [--no-timing] [--quiet] [--summary] [--summary-only] [--fail-fast] [--duplicates] [--source-only] [--strict-targets] [--ignore-case] [--target <path>] [--ignore-heading <text>] [--max-depth <n>]";
const listTargetsUsage = "Usage: readme-echo list-targets [--json] [--pretty]";
const showConfigUsage = "Usage: readme-echo show-config [--json] [--pretty]";
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");

async function readPackageVersion(): Promise<string> {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: unknown };
  if (typeof packageJson.version !== "string") {
    throw new Error("package.json version must be a string");
  }
  return packageJson.version;
}

function parseCheckOptions(options: string[]): CheckOptions | undefined {
  const parsed: CheckOptions = {
    json: false,
    pretty: false,
    quiet: false,
    summary: false,
    summaryOnly: false,
    failFast: false,
    duplicates: false,
    sourceOnly: false,
    strictTargets: false,
    ignoreCase: false,
    noTiming: false,
    targets: [],
    ignoreHeadings: [],
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
    } else if (option === "--summary-only") {
      parsed.summaryOnly = true;
    } else if (option === "--fail-fast") {
      parsed.failFast = true;
    } else if (option === "--duplicates") {
      parsed.duplicates = true;
    } else if (option === "--source-only") {
      parsed.sourceOnly = true;
    } else if (option === "--strict-targets") {
      parsed.strictTargets = true;
    } else if (option === "--ignore-case") {
      parsed.ignoreCase = true;
    } else if (option === "--no-timing") {
      parsed.noTiming = true;
    } else if (option === "--target") {
      const target = options[index + 1];
      if (!target || target.startsWith("--")) {
        return undefined;
      }
      parsed.targets.push(target);
      index += 1;
    } else if (option === "--ignore-heading") {
      const heading = options[index + 1];
      if (!heading || heading.startsWith("--")) {
        return undefined;
      }
      parsed.ignoreHeadings.push(heading);
      index += 1;
    } else if (option === "--max-depth") {
      const maxDepth = options[index + 1];
      if (!maxDepth || !/^[1-9]\d*$/.test(maxDepth)) {
        return undefined;
      }
      parsed.maxDepth = Number(maxDepth);
      index += 1;
    } else {
      return undefined;
    }
  }

  if (parsed.pretty && !parsed.json) {
    return undefined;
  }

  if (parsed.noTiming && !parsed.json) {
    return undefined;
  }

  if (parsed.summaryOnly && parsed.json) {
    return undefined;
  }

  if (parsed.sourceOnly && !parsed.duplicates) {
    return undefined;
  }

  return parsed;
}

async function isReadableTarget(cwd: string, target: string): Promise<boolean> {
  try {
    await access(join(cwd, target), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function findMissingTargets(cwd: string, targets: string[], failFast: boolean): Promise<string[]> {
  const missingTargets: string[] = [];

  for (const target of targets) {
    if (!await isReadableTarget(cwd, target)) {
      missingTargets.push(target);
      if (failFast) {
        break;
      }
    }
  }

  return missingTargets;
}

export async function run(argv: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> {
  const command = argv[0] ?? "check";
  const options = argv.slice(1);
  const json = options.includes("--json");

  if ((command === "version" || command === "--version") && options.length === 0) {
    console.log(await readPackageVersion());
    return 0;
  }

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
  const ignoreHeadings = [...config.ignoreHeadings, ...checkOptions.ignoreHeadings];
  const checkStartTime = performance.now();

  if (checkOptions.strictTargets) {
    const missingTargets = await findMissingTargets(cwd, targets, failFast);
    if (missingTargets.length > 0) {
      if (checkOptions.json) {
        console.log(stringifyJson(
          formatJsonReport(
            config.source,
            failFast ? missingTargets : targets,
            [],
            [],
            elapsedMsSince(checkStartTime),
            {
              duplicateReports: checkOptions.duplicates ? [] : undefined,
              missingTargets,
              includeTiming: !checkOptions.noTiming,
            },
          ),
          checkOptions.pretty,
        ));
      } else {
        console.log(formatMissingTargetReport(missingTargets));
      }
      return 1;
    }
  }

  const sourceHeadings = await readHeadings(cwd, config.source, ignoreHeadings, checkOptions.maxDepth);
  const checkedTargets: string[] = [];
  const targetReports: TargetReport[] = [];
  const reports: string[] = [];
  const comparisonResults: ComparisonResult[] = [];
  const duplicateReports: DuplicateReport[] = [];
  let hasDrift = false;

  if (checkOptions.duplicates) {
    const sourceDuplicateReport = detectDuplicateHeadings(config.source, sourceHeadings);
    if (sourceDuplicateReport) {
      duplicateReports.push(sourceDuplicateReport);
    }
  }

  for (const target of targets) {
    const targetStartTime = performance.now();
    checkedTargets.push(target);
    const targetHeadings = await readHeadings(cwd, target, ignoreHeadings, checkOptions.maxDepth);
    const targetDuplicateReport = checkOptions.duplicates && !checkOptions.sourceOnly
      ? detectDuplicateHeadings(target, targetHeadings)
      : undefined;
    const result = compareHeadings(config.source, target, sourceHeadings, targetHeadings, {
      allowLocalizedTitles: config.allowLocalizedTitles,
      ignoreCase: checkOptions.ignoreCase,
    });

    targetReports.push({
      target,
      ok: result.ok && !targetDuplicateReport,
      durationMs: elapsedMsSince(targetStartTime),
    });

    if (targetDuplicateReport) {
      duplicateReports.push(targetDuplicateReport);
    }

    if (!result.ok) {
      hasDrift = true;
      reports.push(formatComparisonReport(result));
      comparisonResults.push(result);
    }

    if (failFast && (!result.ok || targetDuplicateReport)) {
      break;
    }
  }

  if (checkOptions.json) {
    console.log(stringifyJson(
      formatJsonReport(
        config.source,
        checkedTargets,
        comparisonResults,
        targetReports,
        elapsedMsSince(checkStartTime),
        {
          duplicateReports: checkOptions.duplicates ? duplicateReports : undefined,
          includeTiming: !checkOptions.noTiming,
        },
      ),
      checkOptions.pretty,
    ));
    return hasDrift || duplicateReports.length > 0 ? 1 : 0;
  }

  if (hasDrift || duplicateReports.length > 0) {
    const summaryReport = formatSummary(checkedTargets.length, comparisonResults.length);
    if (checkOptions.summaryOnly) {
      console.log(summaryReport);
      return 1;
    }

    const textReport = [
      ...reports,
      ...duplicateReports.map((report) => formatDuplicateReport(report)),
    ].join("\n\n");
    console.log(checkOptions.summary ? `${textReport}\n\n${summaryReport}` : textReport);
    return 1;
  }

  if (checkOptions.summaryOnly) {
    console.log(formatSummary(checkedTargets.length, comparisonResults.length));
    return 0;
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
