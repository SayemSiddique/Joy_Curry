import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Pool hardening — Render's free Postgres caps total connections low, so we
  // bound the pool and fail fast instead of hanging a request when it's saturated
  // during a lunch/dinner rush.
  max: 10,                          // never exceed the managed-DB connection cap
  idleTimeoutMillis: 30_000,        // release idle clients after 30s
  connectionTimeoutMillis: 5_000,   // reject (don't hang) if no client free in 5s
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
