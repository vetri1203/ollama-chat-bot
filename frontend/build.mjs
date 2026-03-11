import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(__dirname, "src/main.jsx")],
  bundle: true,
  format: "esm",
  minify: false,
  sourcemap: false,
  outfile: path.join(distDir, "app.js"),
  jsx: "automatic",
  loader: {
    ".js": "jsx",
    ".jsx": "jsx"
  }
});

await fs.copyFile(
  path.join(__dirname, "src/index.html"),
  path.join(distDir, "index.html")
);
