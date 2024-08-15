import fs from "node:fs";
import path from "node:path";

import inquirer from "inquirer";
import fg from "fast-glob";

import { downloadProfile, type Profile } from "./src/downloadProfile";
import {
  DEFAULT_CSS,
  DEFAULT_EXT,
  DEFAULT_OUTDIR,
  DEFAULT_PATTERN,
  DEFAULT_UA,
} from "./src/const";
import { Subset } from "./src/Subset";

async function main() {
  const profiles = await fg.glob("profiles/*.json", {
    ignore: ["profiles/schema.json"],
  });

  const file = await inquirer
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    .prompt<any, { file: string }>([
      {
        type: "list",
        message: "プロファイルを選択してください",
        name: "file",
        choices: profiles,
      },
    ])
    .then(async (answers) => answers.file);

  const json = await fs.promises.readFile(file);
  const profile = JSON.parse(json.toString()) as Profile;

  const { $schema, chunk, subset, ...settings } = profile;
  const defaultSettings = {
    outDir: `${DEFAULT_OUTDIR}/${path.parse(file).name}`,
    cssFile: `${DEFAULT_CSS}`,
    urlPrefix: "(N/A)",
    userAgent: `${DEFAULT_UA}`,
    ext: `${DEFAULT_EXT}`,
    pattern: `${DEFAULT_PATTERN}`,
  };

  if (!profile.outDir) {
    profile.outDir = `${DEFAULT_OUTDIR}/${path.parse(file).name}`;
  }

  console.info("Settings");
  console.table({ ...defaultSettings, ...settings });
  console.info("Chunks");
  console.table(chunk);
  console.info("Subsets");
  console.table(
    subset?.map((s) => {
      const { text, ...rest } = s;
      const resolvedText = Subset.textFormatter(text);
      return {
        ...rest,
        text: `${resolvedText.slice(0, 10)}${
          resolvedText.length > 10 ? "..." : ""
        } (${resolvedText.length} chars)`,
      };
    }),
  );

  const confirm = await inquirer
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    .prompt<any, { confirm: boolean }>({
      confirm: {
        type: "confirm",
        message: "上記のフォントをダウンロードします、よろしいですか？",
        default: false,
      },
    })
    .then(async (answers) => answers.confirm);

  if (!confirm) {
    console.info("中止しました");
    process.exit(0);
  }

  await downloadProfile(profile);
}

main();
