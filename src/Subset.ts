import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import * as csstree from "css-tree";
import { Base, type Settings } from "./Base";

export interface SubsetSettings extends Settings {
  /** `Noto Sans JP` */
  family: string;
  /** `400` */
  weight: number;
  italic?: boolean;
  /** `あいうえお` */
  text: string | (string | string[])[];
  swap?: boolean;
  [x: string]: unknown;
}

export class Subset extends Base {
  /** `あいうえお` */
  text: string;
  /** MD5 for resolvedText */
  hash?: string;
  /** `https://fonts.gstatic.com/l/font?kit=...` */
  downloadUrl?: string;

  constructor(args: SubsetSettings) {
    super(args);

    const { family, weight, italic, text, swap } = args;

    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!family || !weight || !text) {
      throw new Error("family, weight and text are required");
    }

    if (typeof weight !== "number" || weight < 0) {
      throw new Error("weight must be an integer");
    }

    // fs.rmSync(this.outDir, { recursive: true, force: true });
    fs.mkdirSync(this.outDir, { recursive: true });

    this.family = Subset.familyFormatter(family);
    this.weight = Subset.weightFormatter(weight);
    this.italic = Subset.italicFormatter(italic);
    this.text = Subset.textFormatter(text);
    this.hash = crypto.createHash("md5").update(this.text).digest("hex");

    // Generate params
    if (italic) {
      this.url.searchParams.append("family", `${family}:ital,wght@1,${weight}`);
    } else {
      this.url.searchParams.append("family", `${family}:wght@${weight}`);
    }
    this.url.searchParams.append("text", this.text);
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

    const ast = csstree.parse(css);
    csstree.walk(ast, (node) => {
      if (node.type === "Url") {
        this.downloadUrl = node.value;

        if (!this.downloadUrl) {
          throw new Error(`Download url does not exist: ${this.url.href}`);
        }

        const version = new URL(this.downloadUrl).searchParams.get("v");
        if (!version) {
          throw new Error(`Font version does not exist: ${this.url.href}`);
        }
        this.version = Subset.versionFormatter(version);

        node.value = `${this.urlPrefix}${this.filename}`;
      }
    });

    if (!this.downloadUrl) {
      throw new Error(`CSS may be invalid: ${this.url.href}`);
    }

    await this.download();

    // return css.replace(this.downloadUrl, `'${this.urlPrefix}${this.filename}'`);
    return csstree.generate(ast);
  }

  public get filename() {
    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!this.version || !this.hash || !this.ext) {
      throw new Error("Cannot generate filename");
    }
    return this.pattern
      .replace("[family]", this.family)
      .replace("[version]", this.version)
      .replace("[weight]", this.weight)
      .replace("[italic]", this.italic)
      .replace("[label]", this.hash)
      .replace("[ext]", this.ext);
  }

  private async download() {
    // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
    if (!this.filename || !this.downloadUrl) {
      throw new Error(`Not ready for download: ${this.url.href}`);
    }

    const outPath = path.resolve(this.outDir, this.filename);

    await fetch(this.downloadUrl)
      .then(async (res) => {
        if (res.ok) {
          await fs.promises.writeFile(
            outPath,
            Buffer.from(await res.arrayBuffer()),
          );
          console.info("Font file downloaded:", this.filename);
        } else {
          throw new Error(
            `Font download failed: ${this.downloadUrl} -> ${outPath}`,
          );
        }
      })
      .catch(() => {
        throw new Error(
          `Font download failed (Unknown): ${this.downloadUrl} -> ${outPath}`,
        );
      });
  }

  /**
   * Text formatter
   * - Trim
   * - Delete whitespaces
   * - Dedupe
   * - Sort by `codePointAt()`
   */
  static textFormatter(input: string | (string | string[])[]): string {
    const raw = typeof input !== "string" ? input.flat().join("") : input;
    const str = raw.trim().replaceAll(/\s/g, "");
    const array = [...str];
    const set = new Set(array);
    const dedupedArray = [...set];
    const sortedArray = dedupedArray.sort((a, b) => {
      const aCode = a.codePointAt(0);
      const bCode = b.codePointAt(0);
      if (aCode !== undefined && bCode !== undefined) {
        return aCode - bCode;
      }
      return 0;
    });
    const resolved = sortedArray.join("");
    return resolved;
  }

  /**
   * Hasher for the text
   */
  static hasher(text: string): string {
    if ("hash" in crypto) {
      // @ts-expect-error works only with Node.js >= 20.12.0
      return crypto.hash("md5", text);
    }
    return crypto.createHash("md5").update(text).digest("hex");
  }
}
