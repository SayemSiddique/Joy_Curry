import { db } from '../config/db.js';

const SPICE_INT_TO_LABEL = { 0: null, 1: 'Mild', 2: 'Medium', 3: 'Hot' };

// Shape a raw menu_items row + its already-loaded relations into the API object.
// Pure (no DB access) so it's reused by both the single-item and batched paths.
function assembleItem(item, allergens = [], modifiers = [], sizeOptions = []) {
  return {
    id:             item.id,
    name:           item.name,
    category:       item.category,
    subcategory:    item.subcategory,
    description:    item.description,
    basePriceCents: item.base_price_cents,
    isVegan:        Boolean(item.is_vegan),
    isVegetarian:   Boolean(item.is_vegetarian),
    isGlutenFree:   Boolean(item.is_gluten_free),
    spiceLevel:     SPICE_INT_TO_LABEL[item.spice_level] ?? null,
    allergenNote:   item.allergen_note,
    servedWith:     item.served_with,
    proteinChoice:  item.protein_choices ? JSON.parse(item.protein_choices) : null,
    pieceCount:     item.piece_count,
    tags:           item.tags            ? JSON.parse(item.tags)            : [],
    searchKeywords: item.search_keywords ? JSON.parse(item.search_keywords) : [],
    imageUrl:       item.image_url,
    inStock:        Boolean(item.in_stock),
    isActive:       Boolean(item.is_active),
    isHalal:        Boolean(item.is_halal),
    allergens:      allergens.map((r) => r.allergen),
    modifiers:      modifiers.map((r) => ({
      id:             r.modifier_id,
      label:          r.label,
      priceDeltaCents: r.price_delta_cents,
    })),
    sizeOptions: sizeOptions.map((r) => ({
      label:      r.label,
      priceCents: r.price_cents,
    })),
  };
}

// Group relation rows into a Map<item_id, row[]> for O(1) lookup per item.
function groupByItemId(rows) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.item_id);
    if (list) list.push(row);
    else map.set(row.item_id, [row]);
  }
  return map;
}

// N+1 fix: load every item's relations in 3 batched queries (via `= ANY($1)`)
// instead of 3 queries per item, then assemble in memory. 4 queries total for
// any list size, vs. the previous 1 + 3×N.
async function attachRelationsBatch(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [allergens, modifiers, sizeOptions] = await Promise.all([
    db.all('SELECT item_id, allergen FROM item_allergens WHERE item_id = ANY($1)', [ids]),
    db.all(
      'SELECT item_id, modifier_id, label, price_delta_cents FROM item_modifiers WHERE item_id = ANY($1)',
      [ids]
    ),
    db.all(
      'SELECT item_id, label, price_cents FROM item_size_options WHERE item_id = ANY($1)',
      [ids]
    ),
  ]);

  const aMap = groupByItemId(allergens);
  const mMap = groupByItemId(modifiers);
  const sMap = groupByItemId(sizeOptions);

  return rows.map((row) =>
    assembleItem(row, aMap.get(row.id) ?? [], mMap.get(row.id) ?? [], sMap.get(row.id) ?? [])
  );
}

// Single-item attach — reuses the batched path so behaviour stays identical.
async function attachRelations(item) {
  if (!item) return null;
  const [result] = await attachRelationsBatch([item]);
  return result ?? null;
}

export async function getAllMenuItems(filters = {}) {
  const conditions = ['is_active = 1', 'deleted_at IS NULL'];
  const params = [];
  let n = 1;

  if (filters.category) {
    conditions.push(`category = $${n++}`);
    params.push(filters.category);
  }
  if (filters.isVegan !== null && filters.isVegan !== undefined) {
    conditions.push(`is_vegan = $${n++}`);
    params.push(filters.isVegan);
  }
  if (filters.isVegetarian !== null && filters.isVegetarian !== undefined) {
    conditions.push(`is_vegetarian = $${n++}`);
    params.push(filters.isVegetarian);
  }
  if (filters.isGlutenFree !== null && filters.isGlutenFree !== undefined) {
    conditions.push(`is_gluten_free = $${n++}`);
    params.push(filters.isGlutenFree);
  }
  if (filters.inStock !== null && filters.inStock !== undefined) {
    conditions.push(`in_stock = $${n++}`);
    params.push(filters.inStock);
  }
  if (filters.search) {
    conditions.push(`(name ILIKE $${n} OR search_keywords ILIKE $${n} OR description ILIKE $${n})`);
    params.push(`%${filters.search}%`);
    n++;
  }

  let sql = `SELECT * FROM menu_items WHERE ${conditions.join(' AND ')} ORDER BY category, name`;

  // Pagination: LIMIT/OFFSET over the ordered scan (sargable — the planner
  // applies them after the index-ordered read, no per-row cast). `limit` is
  // pre-capped at 100 in sanitizeMenuQuery; null means "return all".
  if (filters.limit !== null && filters.limit !== undefined) {
    sql += ` LIMIT $${n++}`;
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += ` OFFSET $${n}`;
    params.push(filters.offset);
  }

  const rows = await db.all(sql, params);
  return attachRelationsBatch(rows);
}

// "Most Loved" strip — items whose JSON `tags` array contains "popular".
// tags is stored as a JSON string (e.g. ["popular","spicy"]), so we match the
// quoted token to avoid false hits on substrings. Capped + only active/in-stock.
export async function getPopularMenuItems(limit = 16) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 16, 1), 24);
  const rows = await db.all(
    `SELECT * FROM menu_items
     WHERE is_active = 1 AND deleted_at IS NULL AND in_stock = 1
       AND tags LIKE '%"popular"%'
     ORDER BY category, name
     LIMIT $1`,
    [safeLimit]
  );
  return attachRelationsBatch(rows);
}

export async function getAllMenuItemsAdmin() {
  const rows = await db.all(
    'SELECT * FROM menu_items WHERE deleted_at IS NULL ORDER BY category, name'
  );
  return attachRelationsBatch(rows);
}

export async function getMenuItemById(id) {
  const row = await db.get(
    'SELECT * FROM menu_items WHERE id = $1 AND is_active = 1 AND deleted_at IS NULL',
    [id]
  );
  return attachRelations(row);
}

export async function createMenuItem(data) {
  const priceCents = Math.round(data.basePrice * 100);
  await db.run(
    `INSERT INTO menu_items
      (id, name, category, subcategory, description, base_price_cents,
       is_vegan, is_vegetarian, is_gluten_free, spice_level, allergen_note,
       served_with, protein_choices, piece_count, tags, search_keywords,
       image_url, in_stock, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      data.id,
      data.name,
      data.category,
      data.subcategory ?? null,
      data.description ?? '',
      priceCents,
      data.isVegan       ? 1 : 0,
      data.isVegetarian  ? 1 : 0,
      data.isGlutenFree  ? 1 : 0,
      spiceLabelToInt(data.spiceLevel),
      data.allergenNote  ?? null,
      data.servedWith    ?? null,
      data.proteinChoice ? JSON.stringify(data.proteinChoice) : null,
      data.pieceCount    ?? null,
      JSON.stringify(data.tags ?? []),
      JSON.stringify(data.searchKeywords ?? []),
      data.imageUrl      ?? null,
      data.inStock !== false ? 1 : 0,
      data.isActive !== false ? 1 : 0,
    ]
  );

  await insertRelations(data.id, data);
  return getMenuItemById(data.id);
}

export async function updateMenuItem(id, data) {
  const existing = await db.get('SELECT id, deleted_at FROM menu_items WHERE id = $1', [id]);
  if (!existing) return null;
  if (existing.deleted_at) {
    const err = new Error('Cannot update a deleted menu item.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const fields = [];
  const params = [];
  let n = 1;

  if (data.name !== undefined)        { fields.push(`name = $${n++}`);             params.push(data.name); }
  if (data.category !== undefined)    { fields.push(`category = $${n++}`);         params.push(data.category); }
  if (data.subcategory !== undefined) { fields.push(`subcategory = $${n++}`);      params.push(data.subcategory); }
  if (data.description !== undefined) { fields.push(`description = $${n++}`);      params.push(data.description); }
  if (data.basePrice !== undefined)   { fields.push(`base_price_cents = $${n++}`); params.push(Math.round(data.basePrice * 100)); }
  if (data.isVegan !== undefined)     { fields.push(`is_vegan = $${n++}`);         params.push(data.isVegan ? 1 : 0); }
  if (data.isVegetarian !== undefined){ fields.push(`is_vegetarian = $${n++}`);    params.push(data.isVegetarian ? 1 : 0); }
  if (data.isGlutenFree !== undefined){ fields.push(`is_gluten_free = $${n++}`);   params.push(data.isGlutenFree ? 1 : 0); }
  if (data.spiceLevel !== undefined)  { fields.push(`spice_level = $${n++}`);      params.push(spiceLabelToInt(data.spiceLevel)); }
  if (data.allergenNote !== undefined){ fields.push(`allergen_note = $${n++}`);    params.push(data.allergenNote); }
  if (data.servedWith !== undefined)  { fields.push(`served_with = $${n++}`);      params.push(data.servedWith); }
  if (data.imageUrl !== undefined)    { fields.push(`image_url = $${n++}`);        params.push(data.imageUrl); }
  if (data.isActive !== undefined)    { fields.push(`is_active = $${n++}`);        params.push(data.isActive ? 1 : 0); }

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`);
    params.push(id);
    await db.run(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${n}`, params);
  }

  if (data.allergens !== undefined || data.modifiers !== undefined || data.sizeOptions !== undefined) {
    if (data.allergens !== undefined) {
      await db.run('DELETE FROM item_allergens WHERE item_id = $1', [id]);
    }
    if (data.modifiers !== undefined) {
      await db.run('DELETE FROM item_modifiers WHERE item_id = $1', [id]);
    }
    if (data.sizeOptions !== undefined) {
      await db.run('DELETE FROM item_size_options WHERE item_id = $1', [id]);
    }
    await insertRelations(id, data);
  }

  return getMenuItemById(id);
}

export async function softDeleteMenuItem(id) {
  const row = await db.get('SELECT id, deleted_at FROM menu_items WHERE id = $1', [id]);
  if (!row) return null;
  if (row.deleted_at) {
    const err = new Error('Item is already deleted.');
    err.code = 'CONFLICT';
    throw err;
  }
  await db.run(
    'UPDATE menu_items SET is_active = 0, deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
    [id]
  );
  return { id };
}

export async function toggleItemStock(id, inStock) {
  const row = await db.get(
    'SELECT id FROM menu_items WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!row) return null;
  await db.run(
    'UPDATE menu_items SET in_stock = $1, updated_at = NOW() WHERE id = $2',
    [inStock ? 1 : 0, id]
  );
  return { id, inStock: Boolean(inStock) };
}

/**
 * Live availability snapshot for the storefront. Returns the id of every
 * active, non-deleted item together with its real stock state. We track stock
 * as a boolean (`in_stock`) — there is no per-item quantity — so we never
 * fabricate "N servings left" scarcity. The client badges sold-out items only.
 */
export async function getAvailability() {
  const rows = await db.all(
    'SELECT id, in_stock FROM menu_items WHERE is_active = 1 AND deleted_at IS NULL'
  );
  return rows.map((r) => ({ itemId: r.id, inStock: Boolean(r.in_stock) }));
}

function spiceLabelToInt(label) {
  const map = { Mild: 1, Medium: 2, Hot: 3 };
  return map[label] ?? 0;
}

async function insertRelations(itemId, data) {
  for (const allergen of data.allergens ?? []) {
    await db.run(
      'INSERT INTO item_allergens (item_id, allergen) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [itemId, allergen]
    );
  }
  for (const mod of data.modifiers ?? []) {
    await db.run(
      'INSERT INTO item_modifiers (item_id, modifier_id, label, price_delta_cents) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [itemId, mod.id, mod.label, Math.round((mod.priceDelta ?? 0) * 100)]
    );
  }
  for (const opt of data.sizeOptions ?? []) {
    await db.run(
      'INSERT INTO item_size_options (item_id, label, price_cents) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [itemId, opt.label, Math.round(opt.price * 100)]
    );
  }
}
