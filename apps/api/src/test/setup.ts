// Global test setup for the API
// Sets required environment variables before any module imports env.ts

process.env.GITHUB_CLIENT_ID = 'test-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret'
process.env.ALLOWED_EMAILS = 'test@example.com,other@example.com'
process.env.SESSION_SECRET = 'test-session-secret-32-bytes-long!!'
process.env.DATABASE_URL = ':memory:'
process.env.FONT_DIR = '/tmp/og-test-fonts'
process.env.PORT = '3001'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
