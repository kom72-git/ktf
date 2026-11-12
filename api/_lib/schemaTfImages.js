import { readdir } from "node:fs/promises";

const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|avif|svg)$/i;

export async function listSchemaTfImagePaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSION.test(entry.name))
    .map((entry) => `img/TF/${entry.name}`)
    .sort((a, b) => a.localeCompare(b, "cs", { numeric: true, sensitivity: "base" }));
}
