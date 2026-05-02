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

使用 `readme-echo check --summary` 可打印简洁的最终摘要行，例如 `Checked 2 target README file(s): 1 drift report(s).`

使用 `readme-echo check --json` 可获得机器可读输出。它会打印包含 `ok`、`source`、`targets`、`summary` 和 `reports` 的 JSON 对象；`summary` 包含 `checkedTargets` 和 `driftReports`。存在漂移的报告会包含目标路径和结构化标题差异。当 fail-fast 提前停止时，`targets`、`summary` 和 `reports` 只反映已经检查过的目标。

使用 `readme-echo check --quiet` 可在文件保持同步时禁止输出。漂移报告仍会打印。与 `--summary` 一起使用时，成功时会隐藏摘要，失败时会打印摘要。

使用 `readme-echo check --fail-fast` 可在第一个发生漂移的目标处停止。即使配置中省略 `failFast` 或将其设为 `false`，该标志也会启用 fail-fast。fail-fast 提前停止时，文本输出只打印第一个漂移报告。

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

- 为重复标题添加更多诊断。
- 在 JSON 输出中添加每个目标的耗时。
- 发布带签名的软件包版本。

## 贡献

欢迎贡献。请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并使用英文 Conventional Commits 提交信息。

## 许可证

Readme Echo 基于 [MIT License](LICENSE) 发布。
