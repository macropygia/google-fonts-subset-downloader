import {
  DEFAULT_EXT,
  DEFAULT_OUTDIR,
  DEFAULT_PATTERN,
  DEFAULT_UA,
} from "./const";

export interface Settings {
  /**
   * Prefix for `url()`
   * - `url('/path/to/dir/font-name-v1-chunk-100.woff2')`
   * @example `/path/to/dir/`
   */
  urlPrefix?: string;
  /**
   * Output directory
   * @default `downloads`
   */
  outDir?: string;
  /**
   * User agent
   * @default `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36`
   */
  userAgent?: string;
  /**
   * Filename pattern
   * @default `[family]-[version]-[weight][italic]-[label].[ext]`
   */
  pattern?: string;
  /** Font extension
   * @default `woff2`
   */
  ext?: string;
}

export class Base {
  url = new URL("https://fonts.googleapis.com/css2");
  /** `noto-sans-jp` */
  family: string;
  /** `400` */
  weight: string;
  /** `i` */
  italic: string;
  /** v15 */
  version?: string;

  /** /path/to/fonts/dir/ */
  urlPrefix: string;
  /** Download directory */
  outDir: string;
  /** User-agent */
  userAgent: string;
  /** `woff2` */
  ext: string;
  /** Filename pattern */
  pattern: string;

  constructor(args?: Settings) {
    const { urlPrefix, outDir, userAgent, pattern, ext } = args || {};

    // Settings
    this.urlPrefix = urlPrefix || "";
    this.outDir = outDir || DEFAULT_OUTDIR;
    this.userAgent = userAgent || DEFAULT_UA;
    this.pattern = pattern || DEFAULT_PATTERN;
    this.ext = ext || DEFAULT_EXT;
  }

  /**
   * Font family formatter
   * - `"Noto Sans JP"` -> `"noto-sans-jp"`
   */
  static familyFormatter(family: string): string {
    return family.toLowerCase().split(" ").join("-");
  }

  /**
   * Weight formatter
   * - `400` -> `"400"`
   */
  static weightFormatter(weight: number): string {
    return weight.toString();
  }

  /**
   * Italic formatter
   * - `true` -> `"-italic"`
   */
  static italicFormatter(italic?: boolean): string {
    return italic ? "i" : "";
  }

  /**
   * Version formatter
   * - `"v10"` -> `"v10"`
   */
  static versionFormatter(version: string): string {
    return version;
  }
}
