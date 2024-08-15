import fs from "node:fs";
import path from "node:path";

import type { Settings } from "./Base";
import { Chunk, type ChunkSettings } from "./Chunk";
import { Subset, type SubsetSettings } from "./Subset";
import { DEFAULT_CSS } from "./const";

export interface Profile extends Settings {
  $schema?: string;
  outDir: string;
  emptyDir?: boolean;
  cssFile?: string;
  chunk?: ChunkSettings[];
  subset?: SubsetSettings[];
}

export const downloadProfile = async (profile: Profile): Promise<void> => {
  const { cssFile, emptyDir = true, chunk, subset, ...settings } = profile;

  // biome-ignore lint/complexity/useSimplifiedLogicExpression: <explanation>
  if ((!chunk || !chunk.length) && (!subset || !subset.length)) {
    console.warn("Nothing to download.");
    return;
  }

  if (emptyDir) {
    await fs.promises.rmdir(settings.outDir, { recursive: true });
  }

  const cssChunk: string[] = [];

  if (chunk && chunk.length > 0) {
    for await (const chunkSettings of chunk) {
      const chunkInstance = new Chunk({ ...settings, ...chunkSettings });
      const css = await chunkInstance.generate();
      cssChunk.push(css);
    }
  }

  if (subset && subset.length > 0) {
    for await (const subsetSettings of subset) {
      const subsetInstance = new Subset({ ...settings, ...subsetSettings });
      const css = await subsetInstance.generate();
      cssChunk.push(css);
    }
  }

  await fs.promises.writeFile(
    path.resolve(settings.outDir || "./downloads", cssFile || DEFAULT_CSS),
    cssChunk.join("\n"),
  );

  console.info("Download completed.");
};
