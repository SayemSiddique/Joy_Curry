import { db } from '../config/db.js';

function deserialize(row) {
  if (!row) return null;
  return {
    id:           row.id,
    name:         row.name,
    email:        row.email,
    phone:        row.phone ?? null,
    role:         row.role,
    dietaryPrefs: row.dietary_prefs ? JSON.parse(row.dietary_prefs) : [],
    addresses:    row.addresses    ? JSON.parse(row.addresses)     : [],
    isActive:     row.is_active === 1,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

export async function createUser({ name, email, phone, passwordHash }) {
  const result = await db.run(
    `INSERT INTO users (name, email, phone, password_hash)
     VALUES (?, ?, ?, ?)`,
    [name, email.toLowerCase().trim(), phone ?? null, passwordHash]
  );
  return getUserById(result.lastID);
}

export async function getUserByEmail(email) {
  const row = await db.get(
    'SELECT * FROM users WHERE email = ? AND is_active = 1',
    [email.toLowerCase().trim()]
  );
  if (!row) return null;
  return { ...deserialize(row), passwordHash: row.password_hash };
}

export async function getUserById(id) {
  const row = await db.get(
    'SELECT * FROM users WHERE id = ? AND is_active = 1',
    [id]
  );
  return deserialize(row);
}

export async function updateUser(id, { name, phone, dietaryPrefs, addresses }) {
  const fields = [];
  const values = [];

  if (name !== undefined)         { fields.push('name = ?');          values.push(name); }
  if (phone !== undefined)        { fields.push('phone = ?');         values.push(phone); }
  if (dietaryPrefs !== undefined) { fields.push('dietary_prefs = ?'); values.push(JSON.stringify(dietaryPrefs)); }
  if (addresses !== undefined)    { fields.push('addresses = ?');     values.push(JSON.stringify(addresses)); }

  if (fields.length === 0) return getUserById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND is_active = 1`,
    values
  );
  return getUserById(id);
}
