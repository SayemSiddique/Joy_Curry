import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err.message);
});

export const db = {
  run(sql, params = []) {
    return pool.query(sql, params);
  },

  get(sql, params = []) {
    return pool.query(sql, params).then((r) => r.rows[0] ?? null);
  },

  all(sql, params = []) {
    return pool.query(sql, params).then((r) => r.rows);
  },

  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        run: (sql, params = []) => client.query(sql, params),
        get: (sql, params = []) => client.query(sql, params).then((r) => r.rows[0] ?? null),
        all: (sql, params = []) => client.query(sql, params).then((r) => r.rows),
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  close() {
    return pool.end();
  },
};
