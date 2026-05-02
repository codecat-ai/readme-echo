import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type ReadmeEchoConfig = {
  source: string;
  targets: string[];
  ignoreHeadings: string[];
  allowLocalizedTitles: boolean;
};

type RawConfig = Partial<ReadmeEchoConfig>;

const defaultConfig = {
  source: "README.md",
  ignoreHeadings: [],
  allowLocalizedTitles: false,
} satisfies Omit<ReadmeEchoConfig, "targets">;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

async function discoverTargets(cwd: string): Promise<string[]> {
  const entries = await readdir(cwd, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^README-.+\.md$/.test(name))
    .sort();
}

function normalizeConfig(raw: RawConfig, discoveredTargets: string[]): ReadmeEchoConfig {
  return {
    source: typeof raw.source === "string" ? raw.source : defaultConfig.source,
    targets: isStringArray(raw.targets) ? raw.targets : discoveredTargets,
    ignoreHeadings: isStringArray(raw.ignoreHeadings) ? raw.ignoreHeadings : defaultConfig.ignoreHeadings,
    allowLocalizedTitles: typeof raw.allowLocalizedTitles === "boolean"
      ? raw.allowLocalizedTitles
      : defaultConfig.allowLocalizedTitles,
  };
}

export async function loadConfig(cwd: string = process.cwd()): Promise<ReadmeEchoConfig> {
  const discoveredTargets = await discoverTargets(cwd);

  try {
    const content = await readFile(join(cwd, ".readme-echo.json"), "utf8");
    return normalizeConfig(JSON.parse(content) as RawConfig, discoveredTargets);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
    return normalizeConfig({}, discoveredTargets);
  }
}
