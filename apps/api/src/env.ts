/**
 * Environment variable validation.
 * Fails fast on startup if required vars are missing.
 */
import { config } from 'dotenv'

config({
  path: '../../.env',
})

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val)
    throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  DATABASE_URL: optionalEnv('DATABASE_URL', './data/og.db'),
  GITHUB_CLIENT_ID: requireEnv('GITHUB_CLIENT_ID'),
  GITHUB_CLIENT_SECRET: requireEnv('GITHUB_CLIENT_SECRET'),
  ALLOWED_EMAILS: requireEnv('ALLOWED_EMAILS')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  FONT_DIR: optionalEnv('FONT_DIR', './data/fonts'),
  ASSET_DIR: optionalEnv('ASSET_DIR', './data/assets'),
  PORT: Number.parseInt(optionalEnv('PORT', '3000'), 10),
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
} as const

export type Env = typeof env
