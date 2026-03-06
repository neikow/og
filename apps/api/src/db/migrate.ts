import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export function runMigrations(): void {
  migrate(db, {
    migrationsFolder: resolve(__dirname, '../../drizzle/migrations'),
  })
  console.warn('Migrations applied successfully')
}
