import { relations } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ─── Templates ────────────────────────────────────────────────────────────────

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  variableSchema: text('variable_schema', { mode: 'json' })
    .notNull()
    .$type<Array<{
    name: string
    type: 'string' | 'number' | 'boolean'
    required: boolean
    default?: string
  }>>()
    .default([]),
  cssConfig: text('css_config').notNull().default(''),
  tags: text('tags', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const fonts = sqliteTable('fonts', {
  id: text('id').primaryKey(),
  family: text('family').notNull(),
  weight: integer('weight').notNull().default(400),
  style: text('style', { enum: ['normal', 'italic'] }).notNull().default('normal'),
  source: text('source', { enum: ['upload', 'google'] }).notNull(),
  filePath: text('file_path').notNull(),
  createdAt: text('created_at').notNull(),
})

// ─── Template ↔ Font join table ───────────────────────────────────────────────

export const templateFonts = sqliteTable('template_fonts', {
  templateId: text('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  fontId: text('font_id')
    .notNull()
    .references(() => fonts.id, { onDelete: 'cascade' }),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const templatesRelations = relations(templates, ({ many }) => ({
  templateFonts: many(templateFonts),
}))

export const fontsRelations = relations(fonts, ({ many }) => ({
  templateFonts: many(templateFonts),
}))

export const templateFontsRelations = relations(templateFonts, ({ one }) => ({
  template: one(templates, {
    fields: [templateFonts.templateId],
    references: [templates.id],
  }),
  font: one(fonts, {
    fields: [templateFonts.fontId],
    references: [fonts.id],
  }),
}))

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  tagRestrictions: text('tag_restrictions', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
})

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

// ─── Assets (Gallery) ─────────────────────────────────────────────────────────

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  /** Dot-notation identifier used as Gallery.<identifier> in templates. */
  identifier: text('identifier').notNull().unique(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  filePath: text('file_path').notNull(),
  createdAt: text('created_at').notNull(),
})
