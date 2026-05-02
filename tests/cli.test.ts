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

test("CLI prints JSON success report with --json", async () => {
  const cwd = join(tmpdir(), `readme-echo-cli-json-pass-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-zh.md"), "# Project\n\n## Install\n\n## Usage\n");
  await writeFile(join(cwd, "README-jp.md"), "# Project\n\n## Install\n\n## Usage\n");

  const result = await runCli(cwd, ["check", "--json"]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    source: "README.md",
    targets: ["README-jp.md", "README-zh.md"],
    summary: {
      checkedTargets: 2,
      driftReports: 0,
    },
    reports: [],
  });
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
  assert.match(result.stderr, /Usage: readme-echo check \[--json\] \[--quiet\] \[--summary\] \[--fail-fast\]/);
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
