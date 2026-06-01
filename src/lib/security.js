// Client-side security helpers for the demo SPA.
// Real production auth requires a server; these measures reduce common
// client-side risks (localStorage tampering, plaintext secrets, unsafe URLs).

const SESSION_KEY = 'storenav.session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
const PBKDF2_ITERATIONS = 120_000
export const MAX_PASSWORD_LENGTH = 128

const LOGIN_ATTEMPTS_KEY = 'storenav.loginAttempts'
const MAX_LOGIN_ATTEMPTS = 8
const LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes

// ── User password hashing (PBKDF2-SHA256) ───────────────────────────────────
function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

export async function hashPassword(password) {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Invalid password length.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return `${toBase64(salt)}:${toBase64(new Uint8Array(bits))}`
}

export async function verifyPassword(password, stored) {
  if (!password || password.length > MAX_PASSWORD_LENGTH) return false
  if (!stored || typeof stored !== 'string') return false
  // Legacy plaintext accounts (pre-security upgrade) — re-hash on next save.
  if (!stored.includes(':')) return password === stored

  const [saltB64, hashB64] = stored.split(':')
  if (!saltB64 || !hashB64) return false

  const salt = fromBase64(saltB64)
  const expected = fromBase64(hashB64)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const actual = new Uint8Array(bits)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

export function isLegacyPassword(stored) {
  return typeof stored === 'string' && stored.length > 0 && !stored.includes(':')
}

// ── Session management (sessionStorage — not persistent across browser rest) ─
/** @typedef {'customer-account' | 'manager'} SessionType */

export function createSession(type, subject) {
  const session = {
    type,
    subject,
    token: crypto.randomUUID(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.type || !session?.subject || !session?.expiresAt) {
      clearSession()
      return null
    }
    if (Date.now() > session.expiresAt) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function sessionMatches(type, subject = null) {
  const session = getSession()
  if (!session || session.type !== type) return false
  if (subject !== null && session.subject !== subject) return false
  return true
}

export function isManagerSession() {
  const session = getSession()
  return session?.type === 'manager' && !!session.subject
}

export function isCustomerSession() {
  const session = getSession()
  return session?.type === 'customer-account'
}

// ── Login rate limiting ─────────────────────────────────────────────────────
function readLoginAttempts() {
  try {
    return JSON.parse(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)) || { count: 0, lockedUntil: 0 }
  } catch {
    return { count: 0, lockedUntil: 0 }
  }
}

function writeLoginAttempts(data) {
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data))
}

export function getLoginLockout() {
  const { count, lockedUntil } = readLoginAttempts()
  if (Date.now() < lockedUntil) {
    const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000)
    return { locked: true, secondsLeft }
  }
  if (count >= MAX_LOGIN_ATTEMPTS) writeLoginAttempts({ count: 0, lockedUntil: 0 })
  return { locked: false, secondsLeft: 0 }
}

export function recordFailedLogin() {
  const data = readLoginAttempts()
  const count = data.count + 1
  if (count >= MAX_LOGIN_ATTEMPTS) {
    writeLoginAttempts({ count, lockedUntil: Date.now() + LOCKOUT_MS })
  } else {
    writeLoginAttempts({ count, lockedUntil: 0 })
  }
}

export function clearLoginAttempts() {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY)
}

// ── API connection validation ─────────────────────────────────────────────────
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
])

function isPrivateIp(hostname) {
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
  if (/^169\.254\./.test(hostname)) return true
  return false
}

export function validateApiUrl(urlString) {
  let parsed
  try {
    parsed = new URL(urlString.trim())
  } catch {
    return { ok: false, error: 'The API URL is not a valid URL.' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only http:// and https:// URLs are allowed.' }
  }

  const host = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(host) || isPrivateIp(host)) {
    return { ok: false, error: 'Local and private network URLs are not allowed.' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URLs with embedded credentials are not allowed.' }
  }

  return { ok: true, url: parsed.href }
}

const SAFE_HEADER = /^[A-Za-z0-9-]+$/

export function sanitizeAuthHeader(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  if (!SAFE_HEADER.test(trimmed)) return null
  const lower = trimmed.toLowerCase()
  if (lower === 'host' || lower === 'content-length' || lower === 'transfer-encoding') return null
  return trimmed
}

const ALLOWED_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH'])

export function sanitizeHttpMethod(method) {
  const upper = (method || 'GET').toUpperCase()
  return ALLOWED_HTTP_METHODS.has(upper) ? upper : 'GET'
}

