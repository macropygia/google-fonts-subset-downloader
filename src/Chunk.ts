import fs from "node:fs";
import path from "node:path";

import * as csstree from "css-tree";
import { Base, type Settings } from "./Base";
import pLimit from "p-limit";

export interface ChunkSettings extends Settings {
  /** `Noto Sans JP` */
  family: string;
  /** `400` */
  weight: number;
  italic?: boolean;
  swap?: boolean;
  [x: string]: unknown;
}

export class Chunk extends Base {
  constructor(args: ChunkSettings) {
    super(args);

    const { family, weight, italic, swap } = args;

    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!family || !weight) {
      throw new Error("family nad weight are required");
    }

    if (typeof weight !== "number" || weight < 0) {
      throw new Error("weight must be an integer");
    }

    // fs.rmSync(this.outDir, { recursive: true, force: true });
    fs.mkdirSync(this.outDir, { recursive: true });

    // Resolve options
    this.family = Chunk.familyFormatter(family);
    this.weight = Chunk.weightFormatter(weight);
    this.italic = Chunk.italicFormatter(italic);

    // Generate params
    if (italic) {
      this.url.searchParams.append("family", `${family}:ital,wght@1,${weight}`);
    } else {
      this.url.searchParams.append("family", `${family}:wght@${weight}`);
    }
    if (swap) {
      this.url.searchParams.append("display", "swap");
    }
  }

  /**
   * @returns CSS
   */
  public async generate() {
    const css = await fetch(this.url, {
      headers: {
        "User-Agent": this.userAgent,
      },
    })
      .then((res) => res.text())
      .catch(() => null);

    if (!css) {
      throw new Error(`CSS download failed: ${this.url.href}`);
    }

    const labels: string[] = [];
    const ast = csstree.parse(css, {
      onComment: (value) => {
        labels.push(value.trim().replace("[", "").replace("]", ""));
      },
    });

    const limit = pLimit(1);
    const queue: Promise<void>[] = [];

    csstree.walk(ast, (node) => {
      if (node.type === "Atrule") {
        const label = labels.shift() as string;
        // biome-ignore lint/complexity/noForEach: <explanation>
        node.block?.children.forEach((item) => {
          csstree.walk(item, (node) => {
            if (node.type === "Url") {
              const downloadUrl = node.value as string;
              this.ext = downloadUrl.split(".").at(-1) as string;
              this.version = node.value.split("/").at(-2) as string;
              const filename = this.generateFilename(label);
              node.value = `${this.urlPrefix}${filename}`;
              queue.push(limit(() => this.download(downloadUrl, filename)));
            }
          });
        });
      }
    });

    await Promise.all(queue);

    return csstree.generate(ast);
  }

  private async download(downloadUrl: string, filename: string) {
    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!downloadUrl || !filename) {
      throw new Error(`Not ready for download: ${this.url.href}`);
    }

    const outPath = path.resolve(this.outDir, filename);

    await fetch(downloadUrl)
      .then(async (res) => {
        if (res.ok) {
          await fs.promises.writeFile(
            outPath,
            Buffer.from(await res.arrayBuffer()),
          );
          console.info("Font file downloaded:", filename);
        } else {
          throw new Error(`Font download failed: ${downloadUrl} -> ${outPath}`);
        }
      })
      .catch(() => {
        throw new Error(
          `Font download failed (Unknown): ${downloadUrl} -> ${outPath}`,
        );
      });
  }

  public generateFilename(label: string) {
    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!this.version || !label || !this.ext) {
      throw new Error("Cannot generate filename");
    }
    return this.pattern
      .replace("[family]", this.family)
      .replace("[version]", this.version)
      .replace("[weight]", this.weight)
      .replace("[italic]", this.italic)
      .replace("[label]", label)
      .replace("[ext]", this.ext);
  }
}
