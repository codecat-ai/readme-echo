# Readme Echo

Readme Echo は、ローカライズされた README がメインの英語 README と同じ見出し構造を保っているか確認する小さな CLI です。

翻訳サービス、外部 AI 呼び出し、README 内容の実行なしで、決定的で CI に組み込みやすいドキュメントチェックを必要とするメンテナー向けです。このプロジェクトは AI の支援を受けて保守されており、テストとリポジトリ内のプロジェクトファイルは英語を基準にしています。

## インストール

公開後は `npx` で利用できます。

```sh
npx readme-echo check
```

このリポジトリでローカル開発する場合:

```sh
npm test
node src/cli.ts check
```

Node.js 22.18 以降が必要です。

## クイックスタート

メインの `README.md` と、`README-zh.md` や `README-jp.md` のようなトップレベルのローカライズファイルを 1 つ以上作成します。

実行します。

```sh
readme-echo check
```

デフォルトでは、Readme Echo は `README.md` をソースとして使い、`README-*.md` に一致するすべてのトップレベルファイルをチェックします。

チェック前に比較対象になるローカライズ README を確認したい場合は、`readme-echo list-targets` を使います。比較を実行せずに有効な設定全体を確認したい場合は、`readme-echo show-config` を使います。

## 設定

デフォルトで足りない場合は、リポジトリルートに `.readme-echo.json` を追加します。

```json
{
  "source": "README.md",
  "targets": ["README-zh.md", "README-jp.md"],
  "ignoreHeadings": ["Changelog"],
  "allowLocalizedTitles": true,
  "failFast": false
}
```

オプション:

- `source`: ソース README のパス。
- `targets`: ローカライズされた README のパス。
- `ignoreHeadings`: 無視する見出しテキストの完全一致。
- `allowLocalizedTitles`: 翻訳後の見出しを英語テキストと一致させず、見出しレベルと順序だけを比較します。
- `failFast`: すべてのターゲットを確認せず、最初に差分があるターゲットで停止します。

## CLI 出力

ファイルが同期している場合、コマンドは終了コード `0` で終了します。

差分が見つかった場合、終了コード `1` で終了し、欠落、余分、または順序変更された見出しを報告します。

使い方: `readme-echo check [--json] [--pretty] [--no-timing] [--quiet] [--summary] [--fail-fast] [--duplicates] [--source-only] [--strict-targets] [--target <path>] [--ignore-heading <text>] [--max-depth <n>]`

使い方: `readme-echo version`

使い方: `readme-echo --version`

`readme-echo version` または `readme-echo --version` を使うと、パッケージバージョンを末尾の改行付きで出力できます。

`readme-echo check --summary` を使うと、`Checked 2 target README file(s): 1 drift report(s).` のような簡潔な最終サマリー行を出力できます。

`readme-echo check --json` を使うと、機械可読な出力を得られます。`ok`、`source`、`targets`、`summary`、`targetReports`、`reports` を含む JSON オブジェクトを出力し、`summary` には `checkedTargets`、`driftReports`、`totalDurationMs` が含まれます。各 `targetReports` エントリには、ターゲットパス、ターゲット単位の `ok` 状態、非負の `durationMs` が含まれます。`--json` と一緒に `--no-timing` を使うと、`summary.totalDurationMs` とすべての `targetReports[].durationMs` を省略しつつ、その他の JSON 形状と終了コードの動作を保てるため、決定的なスナップショットに使えます。差分があるレポートにはターゲットパスと構造化された見出し差分が含まれます。fail-fast が途中で停止した場合、`targets`、`summary`、`targetReports`、`reports` には確認済みのターゲットだけが反映されます。

`check` と `list-targets` では、`--pretty` を `--json` と一緒に使うと、JSON 出力を 2 スペースのインデントで整形できます。たとえば `readme-echo check --json --pretty` や `readme-echo list-targets --json --pretty` です。`--pretty` を使わない場合、これらの JSON 出力はコンパクトなままです。

`readme-echo list-targets` を使うと、見出し比較を実行せずにターゲット README のパスを 1 行ずつ出力できます。`readme-echo list-targets --json` を使うと、設定後の `source` と `targets` を JSON として出力できます。

`readme-echo show-config` を使うと、デフォルト、ターゲット検出、`.readme-echo.json` の上書きが適用された有効な設定を出力できます。`source`、`targets`、`ignoreHeadings`、`allowLocalizedTitles`、`failFast` を整形済み JSON として出力します。コマンドの対称性のため `--json` と `--pretty` も受け付け、同じ整形済み出力になります。

`readme-echo check --target README-zh.md` を使うと、設定済みまたは検出済みのターゲットを 1 つだけ確認できます。`--target` を繰り返すと、複数の特定 README ファイルを確認できます。

`readme-echo check --strict-targets` を使うと、設定済みまたは選択済みのすべてのターゲット README パスが比較前に存在し、読み取り可能であることを要求できます。欠落したターゲットがある場合、コマンドは終了コード `1` で終了し、テキスト出力は各欠落ターゲットを示し、JSON 出力は `ok` を `false` にして `missingTargets` にそれらを列挙します。

`readme-echo check --ignore-heading "Changelog"` を使うと、この実行だけで追加の完全一致見出しテキストを 1 つ無視できます。`--ignore-heading` を繰り返すと、複数の実行時無視項目を追加できます。これらは `.readme-echo.json` の `ignoreHeadings` に追加して適用されます。

`readme-echo check --max-depth 2` を使うと、この実行ではレベル 2 より深い見出しを無視できます。値は正の整数でなければなりません。深さフィルターは、構造比較と重複見出し診断の前に、ソース README とターゲット README の両方の見出しへ適用されます。

`readme-echo check --duplicates` を使うと、`ignoreHeadings` のフィルタリング後に、ソース README と確認済みターゲット内の重複見出しを報告できます。重複とは、同じファイル内で同じ見出しレベルと同じテキストが複数回現れることです。重複レポートがある場合、`ok` は false になり終了コードは `1` になりますが、`summary.driftReports` は引き続きファイル間の差分だけを表します。JSON 出力には、各ファイルパスと重複項目 `{ level, text, count }` を含む `duplicateReports` が追加されます。

`readme-echo check --duplicates` に `--source-only` を追加すると、重複見出しの検査はソース README だけに限定されます。ターゲット README は通常のソース対ターゲット差分比較では引き続き確認されますが、ターゲット側の重複見出しは重複診断として読み取られず、テキスト出力や JSON の `duplicateReports` にも含まれません。

`readme-echo check --quiet` を使うと、ファイルが同期している場合の出力を抑制できます。差分レポートは引き続き出力されます。`--summary` と組み合わせると、成功時はサマリーを抑制し、失敗時はサマリーを出力します。

`readme-echo check --fail-fast` を使うと、最初に差分があるターゲットで停止します。`--duplicates` も指定した場合は、最初に重複見出しがあるターゲットでも停止します。`--strict-targets` と一緒に使うと、最初の欠落ターゲットで停止します。このフラグは、設定で `failFast` が省略されている場合や `false` の場合でも fail-fast を有効にします。重複診断が有効な場合、ソース README の重複見出しは引き続き報告されます。

## CI

この GitHub Actions ジョブをドキュメント品質ゲートとして利用できます。

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

## 開発

このプロジェクトは TypeScript ソースファイルと Node の組み込みテストランナーを使います。

```sh
npm test
```

実装は意図的に依存を少なくし、Markdown の内容やコードブロックを実行しません。

## テスト

テストは Markdown 見出しの解析、フェンス付きコードブロックの扱い、比較処理、設定読み込み、CLI 結果をカバーします。

このプロジェクトは厳格な TDD ワークフローで構築されました。失敗するテストを先に書き、最小実装を行い、対象テストとフルスイートを実行してから整理しています。

## ロードマップ

- 署名付きパッケージリリースを公開する。

## コントリビュート

コントリビューションを歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を読み、コミットメッセージは英語の Conventional Commits を使ってください。

## ライセンス

Readme Echo は [MIT License](LICENSE) の下で公開されています。
