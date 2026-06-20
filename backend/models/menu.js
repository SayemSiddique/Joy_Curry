import { db } from '../config/db.js';

const SPICE_INT_TO_LABEL = { 0: null, 1: 'Mild', 2: 'Medium', 3: 'Hot' };

async function attachRelations(item) {
  if (!item) return null;

  const [allergens, modifiers, sizeOptions] = await Promise.all([
    db.all('SELECT allergen FROM item_allergens WHERE item_id = ?', [item.id]),
    db.all(
      'SELECT modifier_id, label, price_delta_cents FROM item_modifiers WHERE item_id = ?',
      [item.id]
    ),
    db.all(
      'SELECT label, price_cents FROM item_size_options WHERE item_id = ?',
      [item.id]
    ),
  ]);

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    description: item.description,
    basePriceCents: item.base_price_cents,
    isVegan: Boolean(item.is_vegan),
    isVegetarian: Boolean(item.is_vegetarian),
    isGlutenFree: Boolean(item.is_gluten_free),
    spiceLevel: SPICE_INT_TO_LABEL[item.spice_level] ?? null,
    allergenNote: item.allergen_note,
    servedWith: item.served_with,
    proteinChoice: item.protein_choices ? JSON.parse(item.protein_choices) : null,
    pieceCount: item.piece_count,
    tags: item.tags ? JSON.parse(item.tags) : [],
    searchKeywords: item.search_keywords ? JSON.parse(item.search_keywords) : [],
    imageUrl: item.image_url,
    inStock: Boolean(item.in_stock),
    isActive: Boolean(item.is_active),
    isHalal: Boolean(item.is_halal),
    allergens: allergens.map((r) => r.allergen),
    modifiers: modifiers.map((r) => ({
      id: r.modifier_id,
      label: r.label,
      priceDeltaCents: r.price_delta_cents,
    })),
    sizeOptions: sizeOptions.map((r) => ({
      label: r.label,
      priceCents: r.price_cents,
    })),
  };
}

export async function getAllMenuItems(filters = {}) {
  const conditions = [
    'is_active = 1',
    'deleted_at IS NULL',
  ];
  const params = [];

  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.isVegan !== null && filters.isVegan !== undefined) {
    conditions.push('is_vegan = ?');
    params.push(filters.isVegan);
  }
  if (filters.isVegetarian !== null && filters.isVegetarian !== undefined) {
    conditions.push('is_vegetarian = ?');
    params.push(filters.isVegetarian);
  }
  if (filters.isGlutenFree !== null && filters.isGlutenFree !== undefined) {
    conditions.push('is_gluten_free = ?');
    params.push(filters.isGlutenFree);
  }
  if (filters.inStock !== null && filters.inStock !== undefined) {
    conditions.push('in_stock = ?');
    params.push(filters.inStock);
  }
  if (filters.search) {
    conditions.push(
      "(name LIKE ? OR search_keywords LIKE ? OR description LIKE ?)"
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const sql = `SELECT * FROM menu_items WHERE ${conditions.join(' AND ')} ORDER BY category, name`;
  const rows = await db.all(sql, params);
  return Promise.all(rows.map(attachRelations));
}

export async function getAllMenuItemsAdmin() {
  const rows = await db.all(
    'SELECT * FROM menu_items WHERE deleted_at IS NULL ORDER BY category, name'
  );
  return Promise.all(rows.map(attachRelations));
}

export async function getMenuItemById(id) {
  const row = await db.get(
    'SELECT * FROM menu_items WHERE id = ? AND is_active = 1 AND deleted_at IS NULL',
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
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.id,
      data.name,
      data.category,
      data.subcategory ?? null,
      data.description ?? '',
      priceCents,
      data.isVegan ? 1 : 0,
      data.isVegetarian ? 1 : 0,
      data.isGlutenFree ? 1 : 0,
      spiceLabelToInt(data.spiceLevel),
      data.allergenNote ?? null,
      data.servedWith ?? null,
      data.proteinChoice ? JSON.stringify(data.proteinChoice) : null,
      data.pieceCount ?? null,
      JSON.stringify(data.tags ?? []),
      JSON.stringify(data.searchKeywords ?? []),
      data.imageUrl ?? null,
      data.inStock !== false ? 1 : 0,
      data.isActive !== false ? 1 : 0,
    ]
  );

  await insertRelations(data.id, data);
  return getMenuItemById(data.id);
}

export async function updateMenuItem(id, data) {
  const existing = await db.get('SELECT id, deleted_at FROM menu_items WHERE id = ?', [id]);
  if (!existing) return null;
  if (existing.deleted_at) {
    const err = new Error('Cannot update a deleted menu item.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const fields = [];
  const params = [];

  if (data.name !== undefined)        { fields.push('name = ?');             params.push(data.name); }
  if (data.category !== undefined)    { fields.push('category = ?');         params.push(data.category); }
  if (data.subcategory !== undefined) { fields.push('subcategory = ?');      params.push(data.subcategory); }
  if (data.description !== undefined) { fields.push('description = ?');      params.push(data.description); }
  if (data.basePrice !== undefined)   { fields.push('base_price_cents = ?'); params.push(Math.round(data.basePrice * 100)); }
  if (data.isVegan !== undefined)     { fields.push('is_vegan = ?');         params.push(data.isVegan ? 1 : 0); }
  if (data.isVegetarian !== undefined){ fields.push('is_vegetarian = ?');    params.push(data.isVegetarian ? 1 : 0); }
  if (data.isGlutenFree !== undefined){ fields.push('is_gluten_free = ?');   params.push(data.isGlutenFree ? 1 : 0); }
  if (data.spiceLevel !== undefined)  { fields.push('spice_level = ?');      params.push(spiceLabelToInt(data.spiceLevel)); }
  if (data.allergenNote !== undefined){ fields.push('allergen_note = ?');    params.push(data.allergenNote); }
  if (data.servedWith !== undefined)  { fields.push('served_with = ?');      params.push(data.servedWith); }
  if (data.imageUrl !== undefined)    { fields.push('image_url = ?');        params.push(data.imageUrl); }
  if (data.isActive !== undefined)    { fields.push('is_active = ?');        params.push(data.isActive ? 1 : 0); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    params.push(id);
    await db.run(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  if (data.allergens !== undefined || data.modifiers !== undefined || data.sizeOptions !== undefined) {
    if (data.allergens !== undefined) {
      await db.run('DELETE FROM item_allergens WHERE item_id = ?', [id]);
    }
    if (data.modifiers !== undefined) {
      await db.run('DELETE FROM item_modifiers WHERE item_id = ?', [id]);
    }
    if (data.sizeOptions !== undefined) {
      await db.run('DELETE FROM item_size_options WHERE item_id = ?', [id]);
    }
    await insertRelations(id, data);
  }

  return getMenuItemById(id);
}

export async function softDeleteMenuItem(id) {
  const row = await db.get('SELECT id, deleted_at FROM menu_items WHERE id = ?', [id]);
  if (!row) return null;
  if (row.deleted_at) {
    const err = new Error('Item is already deleted.');
    err.code = 'CONFLICT';
    throw err;
  }
  await db.run(
    "UPDATE menu_items SET is_active = 0, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  return { id };
}

export async function toggleItemStock(id, inStock) {
  const row = await db.get(
    'SELECT id FROM menu_items WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!row) return null;
  await db.run(
    "UPDATE menu_items SET in_stock = ?, updated_at = datetime('now') WHERE id = ?",
    [inStock ? 1 : 0, id]
  );
  return { id, inStock: Boolean(inStock) };
}

function spiceLabelToInt(label) {
  const map = { Mild: 1, Medium: 2, Hot: 3 };
  return map[label] ?? 0;
}

async function insertRelations(itemId, data) {
  for (const allergen of data.allergens ?? []) {
    await db.run(
      'INSERT OR IGNORE INTO item_allergens (item_id, allergen) VALUES (?, ?)',
      [itemId, allergen]
    );
  }
  for (const mod of data.modifiers ?? []) {
    await db.run(
      'INSERT OR IGNORE INTO item_modifiers (item_id, modifier_id, label, price_delta_cents) VALUES (?, ?, ?, ?)',
      [itemId, mod.id, mod.label, Math.round((mod.priceDelta ?? 0) * 100)]
    );
  }
  for (const opt of data.sizeOptions ?? []) {
    await db.run(
      'INSERT OR IGNORE INTO item_size_options (item_id, label, price_cents) VALUES (?, ?, ?)',
      [itemId, opt.label, Math.round(opt.price * 100)]
    );
  }
}
