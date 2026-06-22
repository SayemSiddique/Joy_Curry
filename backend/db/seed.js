import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../config/db.js';
import { initializeSchema } from './setup.js';
import { seedBundles } from './seed-bundles.js';

const MENU_DIR = path.resolve(__dirname, '../../frontend/js/data/menu');

const CATEGORY_FILES = [
  { file: 'appetizers.js',        export: 'appetizers' },
  { file: 'salads-soups.js',      export: 'saladsAndSoups' },
  { file: 'vegetable-entrees.js', export: 'vegetableEntrees' },
  { file: 'vegan-entrees.js',     export: 'veganEntrees' },
  { file: 'chicken-entrees.js',   export: 'chickenEntrees' },
  { file: 'meat-entrees.js',      export: 'meatEntrees' },
  { file: 'fish-shrimp.js',       export: 'fishAndShrimp' },
  { file: 'tandoori.js',          export: 'tandooriDishes' },
  { file: 'rice-biryani.js',      export: 'riceAndBiryani' },
  { file: 'express-lunch.js',     export: 'expressLunch' },
  { file: 'sides.js',             export: 'sides' },
  { file: 'condiments.js',        export: 'condiments' },
  { file: 'breads.js',            export: 'breads' },
  { file: 'desserts.js',          export: 'desserts' },
  { file: 'beverages.js',         export: 'beverages' },
];

const SPICE_MAP = { Mild: 1, Medium: 2, Hot: 3 };

async function insertItem(item) {
  const priceCents = Math.round(item.basePrice * 100);
  const spiceInt = SPICE_MAP[item.spiceLevel] ?? 0;

  await db.run(
    `INSERT INTO menu_items
      (id, name, category, subcategory, description, base_price_cents,
       is_vegan, is_vegetarian, is_gluten_free, spice_level, allergen_note,
       served_with, protein_choices, piece_count, tags, search_keywords,
       image_url, in_stock, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (id) DO NOTHING`,
    [
      item.id,
      item.name,
      item.category,
      item.subcategory ?? null,
      item.description ?? '',
      priceCents,
      item.isVegan ? 1 : 0,
      item.isVegetarian ? 1 : 0,
      item.isGlutenFree ? 1 : 0,
      spiceInt,
      item.allergenNote ?? null,
      item.servedWith ?? null,
      item.proteinChoice ? JSON.stringify(item.proteinChoice) : null,
      item.pieceCount ?? null,
      JSON.stringify(item.tags ?? []),
      JSON.stringify(item.searchKeywords ?? []),
      item.imageUrl ?? null,
      item.inStock !== false ? 1 : 0,
      item.isActive !== false ? 1 : 0,
    ]
  );

  for (const allergen of item.allergens ?? []) {
    await db.run(
      'INSERT INTO item_allergens (item_id, allergen) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [item.id, allergen]
    );
  }

  for (const mod of item.modifiers ?? []) {
    await db.run(
      'INSERT INTO item_modifiers (item_id, modifier_id, label, price_delta_cents) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [item.id, mod.id, mod.label, Math.round((mod.priceDelta ?? 0) * 100)]
    );
  }

  for (const opt of item.sizeOptions ?? []) {
    await db.run(
      'INSERT INTO item_size_options (item_id, label, price_cents) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [item.id, opt.label, Math.round(opt.price * 100)]
    );
  }
}

async function runSeed() {
  let totalSeeded = 0;

  for (const { file, export: exportName } of CATEGORY_FILES) {
    const filePath = `file://${path.join(MENU_DIR, file)}`;
    const mod = await import(filePath);
    const items = mod[exportName] ?? [];

    let count = 0;
    for (const item of items) {
      await insertItem(item);
      count++;
    }

    console.log(`  ✓ ${exportName.padEnd(20)} ${count} items`);
    totalSeeded += count;
  }

  console.log(`Seed complete — ${totalSeeded} items written to DB.`);
}

// Called by server.js on every startup. Only seeds when the table is empty,
// so a redeploy on Render (ephemeral FS) always gets fresh data, but a
// hot-restart of a live server with existing data is a no-op.
export async function seedIfEmpty() {
  const row = await db.get('SELECT COUNT(*) as count FROM menu_items');
  const count = parseInt(row.count, 10);
  if (count > 0) {
    console.log(`DB already has ${count} menu items — skipping category seed.`);
  } else {
    console.log('DB is empty — seeding menu data...');
    await runSeed();
  }

  // Bundles (dinner-specials + combos) are NOT part of the category files, so
  // they must be seeded separately. This runs on EVERY boot (idempotent via
  // ON CONFLICT DO NOTHING) — without it, the category seed satisfies the
  // count>0 guard above and bundles silently never load on a fresh DB.
  const insertedBundles = await seedBundles();
  if (insertedBundles > 0) {
    console.log(`Seeded ${insertedBundles} bundle items (dinner-specials + combos).`);
  } else {
    console.log('Bundle items already present — skipping bundle seed.');
  }
}

// Standalone CLI: node db/seed.js
// Runs schema init + full seed + closes DB. Used for local resets.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeSchema()
    .then(() => runSeed())
    .then(() => db.close())
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exit(1);
    });
}
