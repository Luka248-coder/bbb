import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'streamself-secret-key-change-in-production'
)

export interface User {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  email: string | null
  is_admin: boolean
  role?: 'user' | 'staff' | 'admin'
  is_disabled?: boolean
  disabled_reason?: string | null
}

export interface SessionPayload {
  user: User
  exp: number
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

function parseCookieHeader(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=')
    if (key.trim() === name) return rest.join('=').trim()
  }
  return null
}

export async function getSession(): Promise<User | null> {
  let token: string | null = null

  try {
    const headerStore = await headers()
    const cookieHeader = headerStore.get('cookie') || ''
    if (cookieHeader) token = parseCookieHeader(cookieHeader, 'session')
  } catch {}

  if (!token) {
    try {
      const cookieStore = await cookies()
      token = cookieStore.get('session')?.value || null
    } catch {}
  }

  if (!token) return null

  try {
    const session = await verifySession(token)
    if (!session) return null
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) return null

    // Always check DB for latest user state
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: dbUser } = await supabase
        .from('users')
        .select('is_banned, is_admin, is_disabled, disabled_reason, role')
        .eq('id', session.user.id)
        .single()

      if (!dbUser) return null
      if (dbUser.is_banned) return null

      // Return disabled info so middleware/pages can redirect
      if (dbUser.is_disabled) {
        return {
          ...session.user,
          is_admin: dbUser.is_admin,
          role: dbUser.role || 'user',
          is_disabled: true,
          disabled_reason: dbUser.disabled_reason || 'Compte désactivé temporairement.',
        }
      }

      session.user.is_admin = dbUser.is_admin
      session.user.role = dbUser.role || 'user'
      session.user.is_disabled = false
    } catch {}

    return session.user
  } catch {
    return null
  }
}

export async function clearSession() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('session')
  } catch {}
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.is_admin === true || user.discord_id === '1195798936049422376'
}

export function isStaff(user: User | null): boolean {
  if (!user) return false
  return user.role === 'staff' || user.role === 'admin' || isAdmin(user)
}