import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { run } from "../src/cli.ts";

async function runCli(cwd: string, argv: string[] = ["check"]): Promise<{ code: number; stdout: string; stderr: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = "";
  let stderr = "";

  console.log = (message?: unknown) => {
    stdout += `${String(message)}\n`;
  };
  console.error = (message?: unknown) => {
    stderr += `${String(message)}\n`;
  };

  try {
    const code = await run(argv, cwd);
    return { code, stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test("CLI stays silent for synchronized READMEs with --quiet", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-quiet-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--quiet"]);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("CLI prints text summary with --summary", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-summary-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--summary"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /All README files are synchronized\./);
  assert.match(result.stdout, /Checked 2 target README file\(s\): 0 drift report\(s\)\./);
  assert.equal(result.stderr, "");
});

test("CLI quiet summary is suppressed on success", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-summary-quiet-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--quiet", "--summary"]);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("CLI quiet summary is printed on failure", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-summary-quiet-fail-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--quiet", "--summary"]);

  assert.equal(result.code, 1);
  assert.match(result.stdout, /README-zh\.md/);
  assert.match(result.stdout, /Missing/);
  assert.match(result.stdout, /Checked 1 target README file\(s\): 1 drift report\(s\)\./);
  assert.equal(result.stderr, "");
});

test("CLI list-targets prints discovered target READMEs one per line", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n");
  await writeFile(join(cwd, "notes.md"), "# Notes\n");

  const result = await runCli(cwd, ["list-targets"]);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "README-jp.md\nREADME-zh.md\n");
  assert.equal(result.stderr, "");
});

test("CLI list-targets prints JSON source and targets", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-json-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n");

  const result = await runCli(cwd, ["list-targets", "--json"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, "{\"source\":\"README.md\",\"targets\":[\"README-jp.md\",\"README-zh.md\"]}\n");
  assert.deepEqual(JSON.parse(result.stdout), {
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
  });
});

test("CLI list-targets prints pretty JSON with --json --pretty", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-json-pretty-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n");

  const result = await runCli(cwd, ["list-targets", "--json", "--pretty"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${JSON.stringify({
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
  }, null, 2)}\n`);
});

test("CLI list-targets respects configured source and targets", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-config-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    source: "docs/README.md",
    targets: ["docs/README-zh.md", "docs/README-jp.md"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n");

  const result = await runCli(cwd, ["list-targets", "--json"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    source: "docs/README.md",
    targets: ["docs/README-zh.md", "docs/README-jp.md"],
  });
});

test("CLI list-targets rejects unknown options with usage", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["list-targets", "--quiet"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo list-targets \[--json\]/);
});

test("CLI list-targets rejects --pretty without --json", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-list-targets-pretty-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["list-targets", "--pretty"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo list-targets \[--json\] \[--pretty\]/);
});

test("CLI show-config prints effective discovered config as pretty JSON", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-show-config-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n");

  const result = await runCli(cwd, ["show-config"]);
  const expected = {
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
    ignoreHeadings: [],
    allowLocalizedTitles: false,
    failFast: false,
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${JSON.stringify(expected, null, 2)}\n`);
  assert.deepEqual(JSON.parse(result.stdout), expected);
});

test("CLI show-config includes .readme-echo.json overrides", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-show-config-overrides-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    source: "docs/README.md",
    targets: ["docs/README-zh.md"],
    ignoreHeadings: ["Changelog"],
    allowLocalizedTitles: true,
    failFast: true,
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n");

  const result = await runCli(cwd, ["show-config", "--json"]);
  const expected = {
    source: "docs/README.md",
    targets: ["docs/README-zh.md"],
    ignoreHeadings: ["Changelog"],
    allowLocalizedTitles: true,
    failFast: true,
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${JSON.stringify(expected, null, 2)}\n`);
  assert.deepEqual(JSON.parse(result.stdout), expected);
});

test("CLI show-config accepts --pretty", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-show-config-pretty-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["show-config", "--pretty"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${JSON.stringify({
    source: "README.md",
    targets: [],
    ignoreHeadings: [],
    allowLocalizedTitles: false,
    failFast: false,
  }, null, 2)}\n`);
});

test("CLI show-config rejects unknown options with usage", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-show-config-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["show-config", "--quiet"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo show-config \[--json\] \[--pretty\]/);
});

test("CLI check --target limits comparisons to the requested target README", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-target-option-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--target", "README-zh.md", "--json"]);
  const payload = JSON.parse(result.stdout) as { ok: boolean; targets: string[]; reports: Array<{ target: string }> };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.targets, ["README-zh.md"]);
  assert.deepEqual(payload.reports, []);
});

test("CLI check ignores duplicate headings unless --duplicates is present", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-default-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Install\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--json"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    source: "README.md",
    targets: ["README-zh.md"],
    summary: {
      checkedTargets: 1,
      driftReports: 0,
    },
    reports: [],
  });
});

test("CLI check --duplicates prints source and target duplicate heading reports", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-text-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Install\n\n### API\n\n### API\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Install\n\n### API\n\n### API\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--summary"]);

  assert.equal(result.code, 1);
  assert.match(result.stdout, /Duplicate headings in README\.md:/);
  assert.match(result.stdout, /- ## Install appears 2 times/);
  assert.match(result.stdout, /Duplicate headings in README-zh\.md:/);
  assert.match(result.stdout, /- ### API appears 2 times/);
  assert.match(result.stdout, /Checked 1 target README file\(s\): 0 drift report\(s\)\./);
  assert.doesNotMatch(result.stdout, /Missing/);
  assert.equal(result.stderr, "");
});

test("CLI check --duplicates prints JSON duplicate reports without counting them as drift", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-json-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--json"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    summary: {
      checkedTargets: number;
      driftReports: number;
    };
    reports: Array<{ target: string }>;
    duplicateReports: Array<{
      path: string;
      duplicates: Array<{ level: number; text: string; count: number }>;
    }>;
  };

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.summary, {
    checkedTargets: 1,
    driftReports: 1,
  });
  assert.deepEqual(payload.reports.map((report) => report.target), ["README-zh.md"]);
  assert.deepEqual(payload.duplicateReports, [
    {
      path: "README.md",
      duplicates: [{ level: 2, text: "Install", count: 2 }],
    },
    {
      path: "README-zh.md",
      duplicates: [{ level: 2, text: "Usage", count: 2 }],
    },
  ]);
});

test("CLI check --duplicates --source-only ignores target duplicate headings", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-source-only-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    allowLocalizedTitles: true,
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Setup\n\n## Setup\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--source-only", "--json"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    reports: unknown[];
    duplicateReports: unknown[];
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.reports, []);
  assert.deepEqual(payload.duplicateReports, []);
  assert.doesNotMatch(result.stdout, /README-zh\.md.*Setup/);
});

test("CLI check --source-only without --duplicates prints usage", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-source-only-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["check", "--source-only"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo check \[--json\] \[--pretty\] \[--quiet\] \[--summary\] \[--fail-fast\] \[--duplicates\] \[--source-only\] \[--target <path>\]/);
});

test("CLI check --duplicates --source-only prints only source duplicate reports", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-source-only-text-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Install\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Usage\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--source-only", "--summary"]);

  assert.equal(result.code, 1);
  assert.match(result.stdout, /Duplicate headings in README\.md:/);
  assert.match(result.stdout, /- ## Install appears 2 times/);
  assert.doesNotMatch(result.stdout, /Duplicate headings in README-zh\.md:/);
  assert.doesNotMatch(result.stdout, /- ## Usage appears 2 times/);
  assert.match(result.stdout, /Checked 1 target README file\(s\): 1 drift report\(s\)\./);
  assert.equal(result.stderr, "");
});

test("CLI check --duplicates respects ignored headings and --target", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-target-ignore-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    ignoreHeadings: ["Ignored"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Ignored\n\n## Ignored\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Ignored\n\n## Ignored\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Ignored\n\n## Usage\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--target", "README-zh.md", "--json"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    targets: string[];
    duplicateReports: unknown[];
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.targets, ["README-zh.md"]);
  assert.deepEqual(payload.duplicateReports, []);
});

test("CLI check --duplicates fail-fast reports source duplicates and first failing target", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-duplicates-fail-fast-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    targets: ["README-zh.md", "README-jp.md", "README-fr.md"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n\n## Usage\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n\n## Install\n\n## Usage\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--duplicates", "--json", "--fail-fast"]);
  const payload = JSON.parse(result.stdout) as {
    targets: string[];
    duplicateReports: Array<{ path: string }>;
  };

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.deepEqual(payload.targets, ["README-zh.md"]);
  assert.deepEqual(payload.duplicateReports.map((report) => report.path), ["README.md", "README-zh.md"]);
});

test("CLI prints JSON success report with --json", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  const expected = {
    ok: true,
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
    summary: {
      checkedTargets: 2,
      driftReports: 0,
    },
    reports: [],
  };
  assert.equal(result.stdout, `${JSON.stringify(expected)}\n`);
  assert.deepEqual(JSON.parse(result.stdout), expected);
});

test("CLI prints pretty JSON success report with --json --pretty", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-pretty-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json", "--pretty"]);
  const expected = {
    ok: true,
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
    summary: {
      checkedTargets: 2,
      driftReports: 0,
    },
    reports: [],
  };

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `${JSON.stringify(expected, null, 2)}\n`);
});

test("CLI prints JSON summary object with --json and --summary", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-summary-fail-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json", "--summary"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    summary: {
      checkedTargets: number;
      driftReports: number;
    };
    reports: Array<{ target: string }>;
  };

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.summary, {
    checkedTargets: 2,
    driftReports: 1,
  });
  assert.deepEqual(payload.reports.map((report) => report.target), ["README-zh.md"]);
});

test("CLI prints JSON drift report with --json", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-fail-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    source: string;
    targets: string[];
    reports: Array<{
      target: string;
      differences: Array<{
        type: string;
        source?: { level: number; text: string; line: number };
        target?: { level: number; text: string; line: number };
      }>;
    }>;
  };

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, false);
  assert.equal(payload.source, "README.md");
  assert.deepEqual(payload.targets, ["README-jp.md", "README-zh.md"]);
  assert.equal(payload.reports.length, 1);
  assert.equal(payload.reports[0].target, "README-zh.md");
  assert.deepEqual(payload.reports[0].differences, [
    {
      type: "missing",
      source: { level: 2, text: "Usage", line: 5 },
    },
  ]);
});

test("CLI JSON fail-fast reports only targets checked before first drift", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-fail-fast-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json", "--fail-fast"]);
  const payload = JSON.parse(result.stdout) as {
    ok: boolean;
    source: string;
    targets: string[];
    reports: Array<{ target: string }>;
  };

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(payload.ok, false);
  assert.equal(payload.source, "README.md");
  assert.deepEqual(payload.targets, ["README-jp.md", "README-zh.md"]);
  assert.deepEqual(payload.reports.map((report) => report.target), ["README-zh.md"]);
});

test("CLI JSON fail-fast from config stops before later targets", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-config-fail-fast-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    failFast: true,
    targets: ["README-zh.md", "README-jp.md", "README-fr.md"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--json"]);
  const payload = JSON.parse(result.stdout) as {
    targets: string[];
    reports: Array<{ target: string }>;
  };

  assert.equal(result.code, 1);
  assert.deepEqual(payload.targets, ["README-zh.md", "README-jp.md"]);
  assert.deepEqual(payload.reports.map((report) => report.target), ["README-jp.md"]);
});

test("CLI --fail-fast overrides config false", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-override-fail-fast-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    failFast: false,
    targets: ["README-zh.md", "README-jp.md", "README-fr.md"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--json", "--fail-fast"]);
  const payload = JSON.parse(result.stdout) as {
    targets: string[];
    reports: Array<{ target: string }>;
  };

  assert.equal(result.code, 1);
  assert.deepEqual(payload.targets, ["README-zh.md", "README-jp.md"]);
  assert.deepEqual(payload.reports.map((report) => report.target), ["README-jp.md"]);
});

test("CLI text fail-fast prints only the first drift report", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-text-fail-fast-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    targets: ["README-zh.md", "README-jp.md", "README-fr.md"],
  }));
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n");
  await writeFile(join(cwd, "README-fr.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd, ["check", "--fail-fast"]);

  assert.equal(result.code, 1);
  assert.match(result.stdout, /README-jp\.md/);
  assert.doesNotMatch(result.stdout, /README-fr\.md/);
  assert.equal(result.stderr, "");
});

test("CLI keeps usage errors human-readable when --json is present", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["check", "--json", "--unknown"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo check \[--json\] \[--pretty\] \[--quiet\] \[--summary\] \[--fail-fast\] \[--duplicates\] \[--source-only\] \[--target <path>\]/);
});

test("CLI check rejects --pretty without --json", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-pretty-usage-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const result = await runCli(cwd, ["check", "--pretty"]);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Usage: readme-echo check \[--json\] \[--pretty\] \[--quiet\] \[--summary\] \[--fail-fast\] \[--duplicates\] \[--source-only\] \[--target <path>\]/);
});

test("CLI exits 1 and prints drift when mismatch exists", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-fail-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n");

  const result = await runCli(cwd);

  assert.equal(result.code, 1);
  assert.match(result.stdout, /README-zh\.md/);
  assert.match(result.stdout, /Missing/);
  assert.equal(result.stderr, "");
});

test("CLI exits 0 when source and targets are structurally aligned", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /All README files are synchronized/);
  assert.equal(result.stderr, "");
});
