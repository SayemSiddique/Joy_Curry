import { db } from '../config/db.js';

function deserialize(row) {
  if (!row) return null;
  return {
    id:             row.id,
    name:           row.name,
    email:          row.email,
    phone:          row.phone ?? null,
    role:           row.role,
    dietaryPrefs:   row.dietary_prefs ? JSON.parse(row.dietary_prefs) : [],
    addresses:      row.addresses     ? JSON.parse(row.addresses)      : [],
    rewardsPoints:  row.rewards_points ?? 0,
    isActive:       row.is_active === 1,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

export async function createUser({ name, email, phone, passwordHash }) {
  const result = await db.run(
    `INSERT INTO users (name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email.toLowerCase().trim(), phone ?? null, passwordHash]
  );
  return getUserById(result.rows[0].id);
}

export async function getUserByEmail(email) {
  const row = await db.get(
    'SELECT * FROM users WHERE email = $1 AND is_active = 1',
    [email.toLowerCase().trim()]
  );
  if (!row) return null;
  return { ...deserialize(row), passwordHash: row.password_hash };
}

export async function getUserById(id) {
  const row = await db.get(
    'SELECT * FROM users WHERE id = $1 AND is_active = 1',
    [id]
  );
  return deserialize(row);
}

export async function updateUser(id, { name, phone, dietaryPrefs, addresses }) {
  const fields = [];
  const values = [];
  let n = 1;

  if (name !== undefined)         { fields.push(`name = $${n++}`);          values.push(name); }
  if (phone !== undefined)        { fields.push(`phone = $${n++}`);         values.push(phone); }
  if (dietaryPrefs !== undefined) { fields.push(`dietary_prefs = $${n++}`); values.push(JSON.stringify(dietaryPrefs)); }
  if (addresses !== undefined)    { fields.push(`addresses = $${n++}`);     values.push(JSON.stringify(addresses)); }

  if (fields.length === 0) return getUserById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${n} AND is_active = 1`,
    values
  );
  return getUserById(id);
}
