import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

migrate(db, {
  migrationsFolder: resolve(__dirname, '../../drizzle/migrations'),
})

console.warn('Migrations applied successfully')
