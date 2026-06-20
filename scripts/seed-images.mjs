/**
 * seed-images.mjs
 * Updates image_url in the backend DB with verified Unsplash CDN URLs.
 * Run from repo root: DATABASE_URL=./backend/joy-curry.db node scripts/seed-images.mjs
 *
 * All photo IDs below are verified as returning HTTP 200 from Unsplash CDN.
 */
import { db } from '../backend/config/db.js';

const Q = '?q=80&w=800&auto=format&fit=crop';
const U = (id) => `https://images.unsplash.com/photo-${id}${Q}`;

// ── Verified working Unsplash photo IDs ───────────────────────────────────────
// APPETIZER / SNACK — chaat, samosa platter
const SNACK      = U('1601050690597-df0568f70950');
// CURRY / PANEER — orange curry with bread
const CURRY_VEG  = U('1631452180519-c014fe946bc7');
// TIKKA MASALA — red-orange chicken curry
const CURRY_CKN  = U('1565557623262-b51c2513a641');
// VEGETABLE CURRY — green/mixed veg curry
const CURRY_MIX  = U('1585937421612-70a008356fbe');
// TANDOORI — charred skewers on grill
const TANDOORI   = U('1599487488170-d11ec9c172f0');
// BIRYANI — rice dish with saffron
const BIRYANI    = U('1563379091339-03b21ab4a4f8');
// SOUP BOWL — cream soup top-down
const SOUP       = U('1547592166-23ac45744acd');
// MEAT — grilled/minced meat
const MEAT       = U('1529692236671-f1f6cf9683ba');
// FISH / SHRIMP
const FISH       = U('1534482421-64566f976cfa');
// BREAD / NAAN — use curry plate (owner to replace with real naan photo)
const BREAD      = U('1631452180519-c014fe946bc7');
// SALAD — fresh greens plate
const SALAD      = U('1490645935967-10de6ba17061');
// SALAD 2 — use veg curry as alternative (1514996937319 is a laptop photo)
const SALAD2     = U('1490645935967-10de6ba17061');
// LASSI / BEVERAGE — use soup bowl (owner to replace with real drink photo)
const LASSI      = U('1547592166-23ac45744acd');
// TEA / BEVERAGE — use snack photo
const TEA        = U('1601050690597-df0568f70950');
// DESSERT — Indian sweets with drizzle ✅ visually confirmed
const DESSERT    = U('1567620905732-2d1ec7ab7445');
// DESSERT 2 — plated Indian sweet ✅ visually confirmed
const DESSERT2   = U('1565958011703-44f9829ba187');
// CONDIMENT — use salad as placeholder
const CONDIMENT  = U('1514996937319-344454492b37');

// ── Category fallbacks (used for any item not in ITEM_IMAGES) ─────────────────
const CATEGORY_FALLBACKS = {
  'appetizer':         SNACK,
  'salad':             SALAD,
  'soup':              SOUP,
  'vegetable-entree':  CURRY_MIX,
  'vegan-entree':      CURRY_MIX,
  'chicken-entree':    CURRY_CKN,
  'meat-entree':       MEAT,
  'fish-shrimp':       FISH,
  'tandoori':          TANDOORI,
  'rice-biryani':      BIRYANI,
  'express-lunch':     CURRY_CKN,
  'bread':             BREAD,
  'side':              CURRY_VEG,
  'condiment':         CONDIMENT,
  'dessert':           DESSERT,
  'beverage':          LASSI,
};

// ── Per-item overrides for visual variety ─────────────────────────────────────
const ITEM_IMAGES = {
  // Appetizers — variety between snack and curry shots
  'aloo-papri-chaat':     SNACK,
  'aloo-tikki':           CURRY_VEG,
  'assorted-tandoori':    TANDOORI,
  'meat-samosa':          SNACK,
  'veg-samosa':           SNACK,
  'samosa-chaat':         SNACK,
  'paneer-tikka':         CURRY_VEG,
  'reshmi-kabab':         TANDOORI,
  'shami-kabab':          MEAT,
  'papadum':              SALAD,
  'tandoori-vegetables':  CURRY_MIX,

  // Soups
  'mulligatawny':         SOUP,
  'dal-soup':             SOUP,
  'lentil-soup':          SOUP,

  // Salads
  'green-salad':          SALAD2,
  'raita':                SALAD,
  'cucumber-salad':       SALAD2,

  // Chicken entrées
  'butter-chicken':       CURRY_CKN,
  'chicken-tikka-masala': CURRY_CKN,
  'chicken-korma':        CURRY_CKN,
  'chicken-jalfrezi':     CURRY_MIX,
  'chicken-curry':        CURRY_CKN,
  'chicken-vindaloo':     CURRY_MIX,
  'karahi-chicken':       TANDOORI,
  'saag-chicken':         CURRY_MIX,

  // Meat entrées
  'lamb-rogan-josh':      CURRY_CKN,
  'lamb-korma':           CURRY_CKN,
  'lamb-curry':           CURRY_MIX,
  'lamb-vindaloo':        CURRY_MIX,
  'goat-curry':           MEAT,
  'beef-curry':           MEAT,
  'nihari':               MEAT,
  'keema-matar':          MEAT,
  'saag-gosht':           CURRY_MIX,

  // Fish & Shrimp
  'fish-curry':           FISH,
  'fish-tikka':           FISH,
  'shrimp-curry':         FISH,
  'shrimp-masala':        FISH,
  'shrimp-vindaloo':      FISH,

  // Tandoori
  'tandoori-chicken-full':  TANDOORI,
  'tandoori-chicken-half':  TANDOORI,
  'chicken-tikka':          TANDOORI,
  'chicken-boti':           TANDOORI,
  'seekh-kabab':            MEAT,
  'shami-kabab-tandoori':   MEAT,
  'fish-tikka-tandoori':    FISH,
  'assorted-tandoori-platter': TANDOORI,
  'tandoori-mix-grill':     TANDOORI,

  // Rice & Biryani
  'chicken-biryani':      BIRYANI,
  'lamb-biryani':         BIRYANI,
  'vegetable-biryani':    BIRYANI,
  'vegan-biryani':        BIRYANI,
  'shrimp-biryani':       BIRYANI,
  'beef-biryani':         BIRYANI,
  'basmati-rice':         BIRYANI,
  'pulao-rice':           BIRYANI,

  // Breads
  'naan':                 BREAD,
  'garlic-naan':          BREAD,
  'keema-naan':           BREAD,
  'paneer-naan':          BREAD,
  'peshwari-naan':        BREAD,
  'aloo-paratha':         BREAD,
  'paratha':              BREAD,
  'stuffed-paratha':      BREAD,
  'onion-kulcha':         BREAD,
  'poori':                BREAD,

  // Desserts
  'gulab-jamun':          DESSERT,
  'rasmalai':             DESSERT,
  'kheer':                DESSERT2,
  'kulfi':                DESSERT2,
  'mango-kulfi':          DESSERT2,

  // Beverages
  'lassi-mango':          LASSI,
  'lassi-sweet-salt':     LASSI,
  'tea-chai':             TEA,
  'soda':                 TEA,
  'water':                TEA,
  'juices':               LASSI,
  'gatorade':             TEA,
  'vitamin-water':        TEA,
};

async function main() {
  const items = await db.all('SELECT id, category FROM menu_items WHERE deleted_at IS NULL');
  console.log(`Found ${items.length} menu items. Seeding images...`);

  let updated = 0;
  let skipped = 0;
  for (const item of items) {
    const url = ITEM_IMAGES[item.id] ?? CATEGORY_FALLBACKS[item.category];
    if (!url) {
      console.warn(`  No mapping for: ${item.id} (${item.category})`);
      skipped++;
      continue;
    }
    await db.run('UPDATE menu_items SET image_url = ? WHERE id = ?', [url, item.id]);
    updated++;
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
  await db.close();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
