import { mkdirSync } from 'node:fs'
/**
 * Creates an isolated in-memory SQLite database for each test.
 * Re-exports the db instance so tests can seed data directly.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../db/schema.js'

export function createTestDb() {
  // In-memory SQLite — ephemeral, no disk writes
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')

  // Create all tables manually (no migration runner needed for tests)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      variable_schema TEXT NOT NULL DEFAULT '[]',
      css_config TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fonts (
      id TEXT PRIMARY KEY,
      family TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 400,
      style TEXT NOT NULL DEFAULT 'normal',
      source TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS template_fonts (
      template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      font_id TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      tag_restrictions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `)

  mkdirSync('/tmp/og-test-fonts', { recursive: true })

  return drizzle(sqlite, { schema })
}

export type TestDb = ReturnType<typeof createTestDb>
