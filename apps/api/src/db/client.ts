import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { env } from '../env'
import * as schema from './schema'

// Ensure the data directory exists
mkdirSync(dirname(env.DATABASE_URL), { recursive: true })

const sqlite = new Database(env.DATABASE_URL)

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
