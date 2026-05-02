import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { run } from "../src/cli.ts";

async function runCli(cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
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
    const code = await run(["check"], cwd);
    return { code, stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

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
