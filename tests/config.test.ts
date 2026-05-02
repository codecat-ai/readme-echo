import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { loadConfig } from "../src/config.ts";

test("loads config with sane defaults and discovers README-* targets", async () => {
  const cwd = join(tmpdir(), `readme-echo-config-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, "README.md"), "# Source\n");
  await writeFile(join(cwd, "README-zh.md"), "# 源\n");
  await writeFile(join(cwd, "README-jp.md"), "# ソース\n");
  await writeFile(join(cwd, "README.notes.md"), "# Notes\n");

  const config = await loadConfig(cwd);

  assert.equal(config.source, "README.md");
  assert.deepEqual(config.targets, ["README-jp.md", "README-zh.md"]);
  assert.deepEqual(config.ignoreHeadings, []);
  assert.equal(config.allowLocalizedTitles, false);
});

test("loads explicit .readme-echo.json values", async () => {
  const cwd = join(tmpdir(), `readme-echo-explicit-${Date.now()}`);
  await mkdir(cwd, { recursive: true });
  await writeFile(join(cwd, ".readme-echo.json"), JSON.stringify({
    source: "docs/README.md",
    targets: ["docs/README-zh.md"],
    ignoreHeadings: ["Changelog"],
    allowLocalizedTitles: true,
  }));

  const config = await loadConfig(cwd);

  assert.deepEqual(config, {
    source: "docs/README.md",
    targets: ["docs/README-zh.md"],
    ignoreHeadings: ["Changelog"],
    allowLocalizedTitles: true,
  });
});
