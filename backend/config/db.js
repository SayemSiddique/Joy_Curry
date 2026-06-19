import sqlite3pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../..', '.env') });

const sqlite3 = sqlite3pkg.verbose();

const DB_PATH = process.env.DATABASE_URL ?? './joy-curry.db';

let _db = null;

function getDb() {
  if (_db) return _db;

  _db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      throw new Error(`Failed to open SQLite database at "${DB_PATH}": ${err.message}`);
    }
  });

  _db.run('PRAGMA journal_mode = WAL;');
  _db.run('PRAGMA foreign_keys = ON;');

  return _db;
}

export const db = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row ?? null);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  close() {
    return new Promise((resolve, reject) => {
      if (!_db) return resolve();
      _db.close((err) => {
        if (err) return reject(err);
        _db = null;
        resolve();
      });
    });
  },
};
