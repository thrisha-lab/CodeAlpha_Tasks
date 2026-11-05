// Seed script for ShopSphere.
// Run with: bun run db:seed  (or `bun prisma/seed.ts`)
//
// Consumes the shared catalog in `prisma/catalog.ts` (the single source of
// truth, also used by the image generator). Creates 5 categories, 55 products
// (11 per category), one admin user, and one demo customer. Product images
// reference locally-generated premium visuals under /public/products.

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { CATEGORIES, PRODUCTS } from "./catalog";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const productImage = (slug: string) => `/products/${slug}.png`;
const categoryImage = (slug: string) => `/products/category-${slug}.png`;

async function main() {
  console.log("🌱 Seeding ShopSphere…");

  // ── Users ──────────────────────────────────────────────────
  await db.user.upsert({
    where: { email: "admin@shopsphere.dev" },
    update: { password: hashPassword("admin123"), role: "admin", name: "Store Admin" },
    create: {
      email: "admin@shopsphere.dev",
      name: "Store Admin",
      password: hashPassword("admin123"),
      role: "admin",
    },
  });
  await db.user.upsert({
    where: { email: "demo@shopsphere.dev" },
    update: { password: hashPassword("demo123"), name: "Demo Customer" },
    create: {
      email: "demo@shopsphere.dev",
      name: "Demo Customer",
      password: hashPassword("demo123"),
      role: "customer",
    },
  });
  console.log("✅ Users seeded (admin@shopsphere.dev / admin123, demo@shopsphere.dev / demo123)");

  // ── Categories ──────────────────────────────────────────────
  const catMap: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const rec = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: categoryImage(c.slug) },
      create: { name: c.name, slug: c.slug, image: categoryImage(c.slug) },
    });
    catMap[c.slug] = rec.id;
  }
  console.log(`✅ ${CATEGORIES.length} categories seeded`);

  // Remove legacy categories no longer in the catalog (e.g., Books / Sports & Outdoors).
  const validSlugs = new Set(CATEGORIES.map((c) => c.slug));
  const legacy = await db.category.findMany();
  for (const c of legacy) {
    if (!validSlugs.has(c.slug)) {
      // Reassign or delete products under legacy categories.
      await db.product.deleteMany({ where: { categoryId: c.id } });
      await db.category.delete({ where: { id: c.id } });
      console.log(`   ↪ removed legacy category: ${c.slug}`);
    }
  }

  // ── Products ────────────────────────────────────────────────
  // Clear existing products so a re-seed reflects the latest catalog exactly.
  await db.product.deleteMany({});

  let count = 0;
  for (const p of PRODUCTS) {
    await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        image: productImage(p.slug),
        images: productImage(p.slug), // primary image (string field, pipe-separated)
        categoryId: catMap[p.category],
        rating: p.rating,
        numReviews: p.numReviews,
        stock: p.stock,
        featured: p.featured,
        isNew: p.isNew,
        brand: p.brand,
      },
    });
    count++;
  }
  console.log(`✅ ${count} products seeded`);

  // Summary
  const perCat: Record<string, number> = {};
  for (const c of CATEGORIES) {
    perCat[c.name] = await db.product.count({ where: { categoryId: catMap[c.slug] } });
  }
  const featuredN = await db.product.count({ where: { featured: true } });
  const newN = await db.product.count({ where: { isNew: true } });
  console.log("   per category:", perCat);
  console.log(`   featured: ${featuredN} | new: ${newN}`);
  console.log("🎉 Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
