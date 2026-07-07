/**
 * Joy Curry Tandoor — Image Asset Pipeline
 * --------------------------------------------------
 * Reads the raw photos from "JCT Food Picture/" (repo root), maps each one to
 * the menu-item slug used in backend/db/data/menu/*.js, and emits responsive,
 * next-gen image variants into astro-frontend/public/images/dishes/.
 *
 * For every target slug it produces (4:3 cover-cropped to match the MenuCard):
 *   {slug}-400.{avif,webp,jpg}   ← mobile card
 *   {slug}-800.{avif,webp,jpg}   ← tablet/desktop card + modal
 *   {slug}.{avif,webp,jpg}       ← non-suffixed aliases (= 800w) for back-compat
 *   {slug}-lqip.jpg              ← 20px blur-up placeholder
 * and records a base64 LQIP data-URI into lqip-map.json.
 *
 * Run:  node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASTRO_ROOT = path.resolve(__dirname, '..');             // astro-frontend/
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');  // Joy Curry Project/
const SRC_DIR = path.join(REPO_ROOT, 'JCT Food Picture');
const OUT_DIR = path.join(ASTRO_ROOT, 'public', 'images', 'dishes');

// PRIMARY: source PNG (relative to SRC_DIR) -> menu slug
const PRIMARY = {
  // Appetizers — meat
  'APPETIZERS_Meat/Assorted_Tandoori.png': 'assorted-tandoori',
  'APPETIZERS_Meat/Meat_Samosa.png': 'meat-samosa',
  'APPETIZERS_Meat/Shami_Kabab.png': 'shami-kabab',
  // Appetizers — veggie
  'APPETIZERS_Veggie/Aloo_Papri_Chaat.png': 'aloo-papri-chaat',
  'APPETIZERS_Veggie/Aloo_Tikki.png': 'aloo-tikki',
  'APPETIZERS_Veggie/Paneer_Tikka.png': 'paneer-tikka',
  'APPETIZERS_Veggie/Papadum.png': 'papadum',
  'APPETIZERS_Veggie/Samosa_Chaat.png': 'samosa-chaat',
  'APPETIZERS_Veggie/Tandoori_Vegetables.png': 'tandoori-vegetables',
  'APPETIZERS_Veggie/Veg_Samosa.png': 'veg-samosa',
  // Fish & shrimp
  'BONELESS_FISH_and_SHRIMP/Fish_Curry.png': 'fish-curry',
  'BONELESS_FISH_and_SHRIMP/Fish_Masala.png': 'fish-masala',
  'BONELESS_FISH_and_SHRIMP/Shrimp_Masala.png': 'shrimp-masala',
  'BONELESS_FISH_and_SHRIMP/Whole_Fish_Masala.png': 'whole-fish-masala',
  // Chicken entrees
  'CHICKEN_Entrees/Chicken_Chili.png': 'chicken-chili',
  'CHICKEN_Entrees/Chicken_Curry.png': 'chicken-curry',
  'CHICKEN_Entrees/Chicken_Jhalfrezi.png': 'chicken-jhalfrezi',
  'CHICKEN_Entrees/Chicken_Karahi.png': 'chicken-karahi',
  'CHICKEN_Entrees/Chicken_Keema_Aloo.png': 'chicken-keema-aloo',
  'CHICKEN_Entrees/Chicken_Korma.png': 'chicken-korma',
  'CHICKEN_Entrees/Chicken_Makhni_Butter_Chicken.png': 'chicken-makhni',
  'CHICKEN_Entrees/Chicken_Saag.png': 'chicken-saag',
  'CHICKEN_Entrees/Chicken_Tikka_Masala.png': 'chicken-tikka-masala',
  'CHICKEN_Entrees/Chicken_Vindaloo.png': 'chicken-vindaloo',
  // Condiments
  'CONDIMENTS/Green_Chutney.png': 'green-chutney',
  'CONDIMENTS/Imly_Tamarind_Chutney.png': 'imly-chutney',
  'CONDIMENTS/Mango_Chutney.png': 'mango-chutney',
  'CONDIMENTS/Mixed_Pickle.png': 'mixed-pickle',
  'CONDIMENTS/Onion_Relish.png': 'onion-relish',
  'CONDIMENTS/Raita.png': 'raita',
  // Desserts
  'DESSERTS/Gulab_Jamun.png': 'gulab-jamun',
  'DESSERTS/Kheer.png': 'kheer',
  'DESSERTS/Rasmalai.png': 'rasmalai',
  // Breads
  'INDIAN_BREADS/Aloo_Paratha.png': 'aloo-paratha',
  'INDIAN_BREADS/Chicken_Tikka_Naan.png': 'chicken-tikka-naan',
  'INDIAN_BREADS/Garlic_Naan.png': 'garlic-naan',
  'INDIAN_BREADS/Keema_Naan.png': 'keema-naan',
  'INDIAN_BREADS/Keema_Paratha.png': 'keema-paratha',
  'INDIAN_BREADS/Onion_Kulcha.png': 'onion-kulcha',
  'INDIAN_BREADS/Rosemary_Naan.png': 'rosemary-naan',
  'INDIAN_BREADS/Roti.png': 'roti',
  'INDIAN_BREADS/Tandoori_Naan.png': 'tandoori-naan',
  'INDIAN_BREADS/Tandoori_Paratha.png': 'tandoori-paratha',
  // Meat entrees (note -entree slug suffix)
  'MEAT_entrees/Goat_Bhuna.png': 'goat-bhuna-entree',
  'MEAT_entrees/Goat_Curry.png': 'goat-curry-entree',
  'MEAT_entrees/Goat_Karahi.png': 'goat-karahi-entree',
  'MEAT_entrees/Lamb_Bhuna.png': 'lamb-bhuna-entree',
  'MEAT_entrees/Lamb_Curry.png': 'lamb-curry-entree',
  'MEAT_entrees/Lamb_Karahi.png': 'lamb-karahi-entree',
  'MEAT_entrees/Lamb_Korma.png': 'lamb-korma-entree',
  'MEAT_entrees/Lamb_Saag.png': 'lamb-saag-entree',
  'MEAT_entrees/Lamb_Vindaloo.png': 'lamb-vindaloo-entree',
  // Rice & biryani
  'RICE_and_BIRYANI_SPECIALS/Basmati_Pulao.png': 'basmati-pulao',
  'RICE_and_BIRYANI_SPECIALS/Beef_Biryani.png': 'beef-biryani',
  'RICE_and_BIRYANI_SPECIALS/Chicken_Biryani.png': 'chicken-biryani',
  'RICE_and_BIRYANI_SPECIALS/Chicken_Tikka_Biryani.png': 'chicken-tikka-biryani',
  'RICE_and_BIRYANI_SPECIALS/Goat_Biryani.png': 'goat-biryani',
  'RICE_and_BIRYANI_SPECIALS/Lamb_Biryani.png': 'lamb-biryani',
  'RICE_and_BIRYANI_SPECIALS/Mattar_Pulao.png': 'mattar-pulao',
  'RICE_and_BIRYANI_SPECIALS/Shrimp_Biryani.png': 'shrimp-biryani',
  'RICE_and_BIRYANI_SPECIALS/Vegetable_Biryani.png': 'vegetable-biryani',
  // Salad
  'SALAD_Vegan/Green_Salad.png': 'green-salad',
  'SALAD_Vegan/Katchumber.png': 'katchumber',
  // Soup
  'SOUP/Daal.png': 'daal-soup',
  // Tandoori
  'TANDOORI_DISHES/Chicken_Boti_Kabab.png': 'chicken-boti-kabab',
  'TANDOORI_DISHES/Chicken_Shashlik.png': 'chicken-shashlik',
  'TANDOORI_DISHES/Chicken_Tikka_7pcs.png': 'chicken-tikka',
  'TANDOORI_DISHES/Fish_Tikka.png': 'fish-tikka',
  'TANDOORI_DISHES/Malai_Kabab.png': 'malai-kabab',
  'TANDOORI_DISHES/Mixed_Grill.png': 'mixed-grill',
  'TANDOORI_DISHES/Seekh_Kabab_Chicken.png': 'seekh-kabab-chicken',
  'TANDOORI_DISHES/Seekh_Kabab_Lamb_3pcs.png': 'seekh-kabab-lamb',
  'TANDOORI_DISHES/Tandoori_Chicken_Half_Full.png': 'tandoori-chicken',
  'TANDOORI_DISHES/Tandoori_Fish.png': 'tandoori-fish',
  'TANDOORI_DISHES/Tandoori_Lamb_Chop.png': 'tandoori-lamb-chop',
  'TANDOORI_DISHES/Tandoori_Shrimp.png': 'tandoori-shrimp',
  // Vegan
  'VEGAN_Dish/Aloo_Gobi_Mattar.png': 'aloo-gobi-mattar',
  'VEGAN_Dish/Baingan_Bharta.png': 'baingan-bharta',
  'VEGAN_Dish/Bhindi_Masala.png': 'bhindi-masala',
  'VEGAN_Dish/Chana_Masala.png': 'chana-masala',
  'VEGAN_Dish/Chana_Saag.png': 'chana-saag',
  'VEGAN_Dish/Mixed_Vegetables.png': 'mixed-vegetables',
  'VEGAN_Dish/Mushroom_Masala.png': 'mushroom-masala',
  'VEGAN_Dish/Tarka_Daal.png': 'tarka-daal',
  // Vegetable entrees
  'VEGETABLE_entrees/Daal_Makhni.png': 'daal-makhni',
  'VEGETABLE_entrees/Malai_Kofta.png': 'malai-kofta',
  'VEGETABLE_entrees/Mattar_Paneer.png': 'mattar-paneer',
  'VEGETABLE_entrees/Navrattan_Korma.png': 'navrattan-korma',
  'VEGETABLE_entrees/Palak_Paneer.png': 'palak-paneer',
  'VEGETABLE_entrees/Paneer_Makhni.png': 'paneer-makhni',
};

// ALIAS: extra slug -> source PNG of an existing dish (sides / express-lunch reuse).
const ALIASES = {
  // Sides reuse the parent dish photo
  'chicken-curry-side': 'CHICKEN_Entrees/Chicken_Curry.png',
  'chicken-vindaloo-side': 'CHICKEN_Entrees/Chicken_Vindaloo.png',
  'chicken-saag-side': 'CHICKEN_Entrees/Chicken_Saag.png',
  'chicken-karahi-side': 'CHICKEN_Entrees/Chicken_Karahi.png',
  'chicken-tikka-masala-side': 'CHICKEN_Entrees/Chicken_Tikka_Masala.png',
  'lamb-curry-side': 'MEAT_entrees/Lamb_Curry.png',
  'lamb-vindaloo-side': 'MEAT_entrees/Lamb_Vindaloo.png',
  'lamb-saag-side': 'MEAT_entrees/Lamb_Saag.png',
  'mixed-vegetable-side': 'VEGAN_Dish/Mixed_Vegetables.png',
  'palak-paneer-side': 'VEGETABLE_entrees/Palak_Paneer.png',
  'aloo-gobi-side': 'VEGAN_Dish/Aloo_Gobi_Mattar.png',
  'bhindi-masala-side': 'VEGAN_Dish/Bhindi_Masala.png',
  'baingan-bharta-side': 'VEGAN_Dish/Baingan_Bharta.png',
  'chana-saag-side': 'VEGAN_Dish/Chana_Saag.png',
  'daal-makhni-side': 'VEGETABLE_entrees/Daal_Makhni.png',
  'tarka-daal-side': 'VEGAN_Dish/Tarka_Daal.png',
  // Express-lunch reuse the parent dish photo
  'lamb-curry-lunch': 'MEAT_entrees/Lamb_Curry.png',
  'goat-over-rice-lunch': 'MEAT_entrees/Goat_Curry.png',
  'chicken-curry-lunch': 'CHICKEN_Entrees/Chicken_Curry.png',
  'fish-flounder-lunch': 'BONELESS_FISH_and_SHRIMP/Fish_Curry.png',
  'low-fat-chicken-tikka-lunch': 'TANDOORI_DISHES/Chicken_Tikka_7pcs.png',
  'tandoori-chicken-half-lunch': 'TANDOORI_DISHES/Tandoori_Chicken_Half_Full.png',
  'chicken-with-naan-lunch': 'CHICKEN_Entrees/Chicken_Curry.png',
  'vegetable-over-rice-lunch': 'VEGAN_Dish/Mixed_Vegetables.png',
  'daal-over-rice-lunch': 'VEGAN_Dish/Tarka_Daal.png',
};

const WIDTHS = [400, 800];
const AR = 3 / 4; // height/width — 4:3 landscape card

async function emit(srcAbs, slug) {
  const input = sharp(srcAbs, { failOn: 'none' });
  for (const w of WIDTHS) {
    const h = Math.round(w * AR);
    const base = input.clone().resize(w, h, { fit: 'cover', position: 'centre' });
    await base.clone().avif({ quality: 70, effort: 6 }).toFile(path.join(OUT_DIR, `${slug}-${w}.avif`));
    await base.clone().webp({ quality: 82 }).toFile(path.join(OUT_DIR, `${slug}-${w}.webp`));
    await base.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(path.join(OUT_DIR, `${slug}-${w}.jpg`));
  }
  // Non-suffixed aliases (= 800w) so the current MenuCard picture/src keeps working
  const big = input.clone().resize(800, Math.round(800 * AR), { fit: 'cover', position: 'centre' });
  await big.clone().avif({ quality: 70, effort: 6 }).toFile(path.join(OUT_DIR, `${slug}.avif`));
  await big.clone().webp({ quality: 82 }).toFile(path.join(OUT_DIR, `${slug}.webp`));
  await big.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(path.join(OUT_DIR, `${slug}.jpg`));
  // LQIP — tiny blurred base64 placeholder
  const lqipBuf = await input.clone().resize(20, 15, { fit: 'cover' }).jpeg({ quality: 40 }).toBuffer();
  await fs.writeFile(path.join(OUT_DIR, `${slug}-lqip.jpg`), lqipBuf);
  return `data:image/jpeg;base64,${lqipBuf.toString('base64')}`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const lqipMap = {};
  const done = [];
  const missing = [];

  const jobs = [
    ...Object.entries(PRIMARY).map(([rel, slug]) => ({ rel, slug })),
    ...Object.entries(ALIASES).map(([slug, rel]) => ({ rel, slug })),
  ];

  for (const { rel, slug } of jobs) {
    const srcAbs = path.join(SRC_DIR, rel);
    try {
      await fs.access(srcAbs);
    } catch {
      missing.push(`${slug}  (source not found: ${rel})`);
      continue;
    }
    lqipMap[slug] = await emit(srcAbs, slug);
    done.push(slug);
    process.stdout.write(`✓ ${slug}\n`);
  }

  await fs.writeFile(path.join(OUT_DIR, 'lqip-map.json'), JSON.stringify(lqipMap, null, 2));

  console.log(`\nDone. ${done.length} slugs processed → ${OUT_DIR}`);
  if (missing.length) {
    console.log(`\n${missing.length} skipped (no source):`);
    missing.forEach((m) => console.log('  - ' + m));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
