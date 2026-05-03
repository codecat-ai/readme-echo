# Readme Echo

Readme Echo 是一个小型 CLI，用来检查本地化 README 文件是否与主要英文 README 保持相同的标题结构。

它面向希望使用确定性、适合 CI 的文档检查的维护者，不依赖翻译服务，不调用外部 AI，也不执行 README 内容。本项目在 AI 辅助下维护，测试和版本库中的项目文件以英文为主。

## 安装

发布后可通过 `npx` 使用：

```sh
npx readme-echo check
```

在本仓库中进行本地开发：

```sh
npm test
node src/cli.ts check
```

需要 Node.js 22.18 或更新版本。

## 快速开始

创建主文件 `README.md`，以及一个或多个顶层本地化文件，例如 `README-zh.md` 或 `README-jp.md`。

运行：

```sh
readme-echo check
```

默认情况下，Readme Echo 使用 `README.md` 作为源文件，并检查所有匹配 `README-*.md` 的顶层文件。

如果想在检查前确认会比较哪些本地化 README 文件，可以使用 `readme-echo list-targets`。如果想在不运行比较的情况下查看完整的生效配置，可以使用 `readme-echo show-config`。

## 配置

当默认行为不够时，在仓库根目录添加 `.readme-echo.json`：

```json
{
  "source": "README.md",
  "targets": ["README-zh.md", "README-jp.md"],
  "ignoreHeadings": ["Changelog"],
  "allowLocalizedTitles": true,
  "failFast": false
}
```

选项：

- `source`：源 README 路径。
- `targets`：本地化 README 路径。
- `ignoreHeadings`：要忽略的精确标题文本。
- `allowLocalizedTitles`：只比较标题层级和顺序，不要求翻译后的标题与英文文本一致。
- `failFast`：在第一个发生漂移的目标后停止，而不是检查所有目标。

## CLI 输出

当文件保持同步时，命令以退出码 `0` 结束。

当发现漂移时，命令以退出码 `1` 结束，并报告缺失、多余或顺序变化的标题。

用法：`readme-echo check [--json] [--pretty] [--no-timing] [--quiet] [--summary] [--summary-only] [--fail-fast] [--duplicates] [--source-only] [--strict-targets] [--ignore-case] [--exit-zero] [--target <path>] [--ignore-heading <text>] [--min-depth <n>] [--max-depth <n>]`

用法：`readme-echo version`

用法：`readme-echo --version`

使用 `readme-echo version` 或 `readme-echo --version` 可打印软件包版本，并在末尾带一个换行符。

使用 `readme-echo check --summary` 可打印简洁的最终摘要行，例如 `Checked 2 target README file(s): 1 drift report(s).`

使用 `readme-echo check --summary-only` 可在文本输出中只打印该摘要行。它会保持普通检查的成功或失败退出状态；成功时不会打印 `All README files are synchronized.`，失败时会隐藏详细漂移或重复标题报告。它不能与 `--json` 组合使用。

使用 `readme-echo check --json` 可获得机器可读输出。它会打印包含 `ok`、`source`、`targets`、`summary`、`targetReports` 和 `reports` 的 JSON 对象；`summary` 包含 `checkedTargets`、`driftReports` 和 `totalDurationMs`。每个 `targetReports` 条目都包含目标路径、目标级别的 `ok` 状态，以及非负的 `durationMs`。将 `--no-timing` 与 `--json` 一起使用，可省略 `summary.totalDurationMs` 和每个 `targetReports[].durationMs`，同时保留其余 JSON 结构和退出码行为，便于生成确定性的快照。存在漂移的报告会包含目标路径和结构化标题差异。当 fail-fast 提前停止时，`targets`、`summary`、`targetReports` 和 `reports` 只反映已经检查过的目标。

使用 `readme-echo check --exit-zero` 可进行建议性本地审计或非阻塞 CI 任务。它仍会执行所有请求的检查，并打印相同的文本或 JSON 诊断；但漂移、重复标题报告和 strict 缺失目标报告会返回退出码 `0`。当诊断失败时，JSON `ok` 仍保持 `false`。用法错误和无效选项仍返回退出码 `1`，且该选项只适用于 `check`。

对于 `check` 和 `list-targets`，将 `--pretty` 与 `--json` 一起使用，可用两个空格缩进格式化 JSON 输出，例如 `readme-echo check --json --pretty` 或 `readme-echo list-targets --json --pretty`。不使用 `--pretty` 时，这些 JSON 输出保持紧凑格式。

使用 `readme-echo list-targets` 可在不运行标题比较的情况下逐行打印目标 README 路径。使用 `readme-echo list-targets --json` 可将配置后的 `source` 和 `targets` 打印为 JSON。

使用 `readme-echo show-config` 可打印经过默认值、目标发现和 `.readme-echo.json` 覆盖后得到的生效配置。它会以漂亮格式 JSON 打印 `source`、`targets`、`ignoreHeadings`、`allowLocalizedTitles` 和 `failFast`；为保持命令对称性，也接受 `--json` 和 `--pretty`，输出相同的漂亮格式。

使用 `readme-echo check --target README-zh.md` 可只检查一个已配置或已发现的目标。重复使用 `--target` 可检查多个指定的 README 文件。

使用 `readme-echo check --strict-targets` 可要求每个已配置或已选择的目标 README 路径在比较前都存在且可读。缺失目标会让命令以退出码 `1` 结束；文本输出会列出每个缺失目标，JSON 输出会将 `ok` 设为 `false`，并在 `missingTargets` 中列出它们。

使用 `readme-echo check --ignore-heading "Changelog"` 可在本次运行中额外忽略一个精确标题文本。重复使用 `--ignore-heading` 可添加多个运行时忽略项；它们会追加到 `.readme-echo.json` 的 `ignoreHeadings`。

使用 `readme-echo check --ignore-case` 可在本次运行中用 JavaScript 小写转换来比较标题文本，因此 `Introduction` 和 `introduction` 这样的标题会被视为相同。标题层级、顺序、缺失和多余诊断、重复标题诊断，以及 `ignoreHeadings` 匹配都保持不变。启用 `allowLocalizedTitles` 时，该标志实际上没有影响，因为标题文本本来就不要求匹配。

使用 `readme-echo check --min-depth 2` 可在本次运行中忽略层级浅于 2 的标题，使用 `readme-echo check --max-depth 2` 可忽略层级深于 2 的标题。取值必须是正整数，且 `--min-depth` 不能大于 `--max-depth`。深度过滤会在结构比较和重复标题诊断之前，同时应用于源 README 和目标 README 的标题。

使用 `readme-echo check --duplicates` 可在应用 `ignoreHeadings` 过滤后，报告源 README 和每个已检查目标中的重复标题。重复标题指同一文件中相同层级和相同文本的标题出现多次。重复标题报告会让 `ok` 为 false，并以退出码 `1` 结束，但 `summary.driftReports` 仍只表示跨文件漂移。JSON 输出会添加 `duplicateReports`，其中包含每个文件路径以及重复项 `{ level, text, count }`。

在 `readme-echo check --duplicates` 中添加 `--source-only`，可只检查源 README 中的重复标题。目标 README 仍会执行正常的源与目标漂移比较，但其重复标题不会作为重复诊断读取，也不会出现在文本输出或 JSON `duplicateReports` 中。

使用 `readme-echo check --quiet` 可在文件保持同步时禁止输出。漂移报告仍会打印。与 `--summary` 一起使用时，成功时会隐藏摘要，失败时会打印摘要。

使用 `readme-echo check --fail-fast` 可在第一个发生漂移的目标处停止；当同时使用 `--duplicates` 时，也会在第一个有重复标题的目标处停止。与 `--strict-targets` 一起使用时，它会在第一个缺失目标后停止。即使配置中省略 `failFast` 或将其设为 `false`，该标志也会启用 fail-fast。启用重复标题诊断时，源 README 的重复标题仍会被报告。

## CI

可以使用这个 GitHub Actions 任务作为文档质量门禁：

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
      - run: node src/cli.ts check
```

## 开发

本项目使用 TypeScript 源文件和 Node 内置测试运行器。

```sh
npm test
```

实现刻意保持轻依赖，并且不会执行 Markdown 内容或代码块。

## 测试

测试覆盖 Markdown 标题解析、围栏代码块处理、比较行为、配置加载和 CLI 结果。

本项目按照严格 TDD 工作流构建：先写失败测试，再做最小实现，运行聚焦测试和完整套件，最后清理。

## 路线图

- 发布带签名的软件包版本。

## 贡献

欢迎贡献。请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并使用英文 Conventional Commits 提交信息。

## 许可证

Readme Echo 基于 [MIT License](LICENSE) 发布。
