# Google Fonts Subset Downloader

設定ファイルに基づいてGoogle Fontsのチャンク一式、または使用する文字を指定したサブセットのフォントファイルをダウンロードし、 `@font-face` を指定するCSSを出力する。

## 使用方法

- 依存関係をインストールする
    - `bun install` , `pnpm install` 等
- `profiles/scheme.json` の書式に従って `profiles/*.json` に設定ファイルを作成する
- `cli.ts` を実行する
    - `bun cli.ts` , `pnpm run cli` 等
- 対話式CLIで使用する設定ファイルを選択してダウンロードを実行する
