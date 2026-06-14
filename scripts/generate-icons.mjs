#!/usr/bin/env node
/** Kopiuje SVG logo do public/. PNG generuje Next.js (icon.tsx, /icons/[size]). */
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svg = readFileSync(join(root, "public/brand/logo.svg"), "utf8");

async function main() {
  await mkdir(join(root, "public/icons"), { recursive: true });
  await writeFile(join(root, "public/icons/icon.svg"), svg);
  console.log("✓ public/icons/icon.svg");
  console.log("PNG: generowane przez Next.js → /icon, /apple-icon, /icons/[size]");
}

main();
