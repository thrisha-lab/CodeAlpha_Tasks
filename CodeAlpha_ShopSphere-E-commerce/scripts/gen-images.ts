// Generates premium, copyright-safe product images for ShopSphere.
// Uses z-ai-web-dev-sdk (backend only). Resumable: skips files that already
// exist and are non-empty. Retries on failure with backoff.
//
// Supports parallel sharding via env vars to speed up large catalogs:
//   SHARD_INDEX=0 SHARD_COUNT=4 bun scripts/gen-images.ts
// (Processes items whose index % SHARD_COUNT === SHARD_INDEX.)
//
// Run all at once: bun run gen:images
// Run 4 parallel shards: see scripts/gen-images-parallel.sh
//
// Outputs:
//   public/products/<slug>.png            (product images, 1024x1024)
//   public/products/category-<slug>.png   (category card images)

import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";
import { CATEGORIES, PRODUCTS, STYLE_SUFFIX } from "../prisma/catalog";

const OUT = path.join(process.cwd(), "public", "products");
const SIZE = "1024x1024";

// Sharding config (defaults to a single shard = everything).
const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? "0");
const SHARD_COUNT = Number(process.env.SHARD_COUNT ?? "1");
const SHARD_TAG = SHARD_COUNT > 1 ? ` [shard ${SHARD_INDEX}/${SHARD_COUNT}]` : "";

// Optional time budget (seconds). The script exits gracefully after the
// budget elapses, so it can be run in foreground within a command timeout
// and re-run (resumable) to finish a large catalog without being killed
// mid-write. 0 = no budget (run to completion).
const TIME_BUDGET = Number(process.env.TIME_BUDGET ?? "0");
const START = Date.now();
function overBudget(): boolean {
  if (TIME_BUDGET <= 0) return false;
  return Date.now() - START > TIME_BUDGET * 1000;
}

function isMine(index: number): boolean {
  if (SHARD_COUNT <= 1) return true;
  return index % SHARD_COUNT === SHARD_INDEX;
}

function ensureDir() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
}

function existsNonEmpty(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 1024;
  } catch {
    return false;
  }
}

async function generateOne(zai: Awaited<ReturnType<typeof ZAI.create>>, prompt: string, outPath: string, retries = 5): Promise<boolean> {
  if (existsNonEmpty(outPath)) {
    console.log(`  ✓ skip (exists): ${path.basename(outPath)}`);
    return true;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await zai.images.generations.create({ prompt, size: SIZE });
      const b64 = res.data?.[0]?.base64;
      if (!b64) throw new Error("no base64 in response");
      fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
      console.log(`  ✓ ${path.basename(outPath)} (${attempt})`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${path.basename(outPath)} attempt ${attempt}: ${msg}`);
      if (attempt < retries) {
        // exponential backoff: 2s, 4s, 8s, 16s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  return false;
}

// Never let a single failure crash the whole batch.
process.on("unhandledRejection", (e) => {
  console.error("  (non-fatal) unhandledRejection:", e instanceof Error ? e.message : e);
});
process.on("uncaughtException", (e) => {
  console.error("  (non-fatal) uncaughtException:", e instanceof Error ? e.message : e);
});

function fullPrompt(subject: string, bg: string): string {
  return `${subject}, ${bg}, ${STYLE_SUFFIX}square 1:1 composition, no text, no watermark, no logos`;
}

async function main() {
  ensureDir();
  console.log(`🎨 Generating ShopSphere product imagery${SHARD_TAG}…`);

  const zai = await ZAI.create();
  let ok = 0;
  let fail = 0;
  const failures: string[] = [];

  // Category cards (only shard 0 handles these to avoid duplication)
  if (SHARD_INDEX === 0 || SHARD_COUNT === 1) {
    console.log(`\n— Category images${SHARD_TAG} —`);
    for (let i = 0; i < CATEGORIES.length; i++) {
      if (!isMine(i)) continue;
      const c = CATEGORIES[i];
      const p = path.join(OUT, `category-${c.slug}.png`);
      const good = await generateOne(zai, fullPrompt(c.heroPrompt, c.bg), p);
      if (good) ok++;
      else { fail++; failures.push(`category-${c.slug}`); }
    }
  }

  // Products
  console.log(`\n— Product images${SHARD_TAG} —`);
  for (let i = 0; i < PRODUCTS.length; i++) {
    if (overBudget()) { console.log(`  ⏱ time budget reached, exiting gracefully (resumable).`); break; }
    if (!isMine(i)) continue;
    const prod = PRODUCTS[i];
    const cat = CATEGORIES.find((c) => c.slug === prod.category)!;
    const p = path.join(OUT, `${prod.slug}.png`);
    const good = await generateOne(zai, fullPrompt(prod.imagePrompt, cat.bg), p);
    if (good) ok++;
    else { fail++; failures.push(prod.slug); }
  }

  console.log(`\n📊 Done${SHARD_TAG}: ${ok} generated/skipped, ${fail} failed.`);
  if (failures.length) console.log("Failed:", failures.join(", "));
  process.exit(0); // always exit 0 so partial runs are "successful" (resumable)
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
