import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const ADMIN_EMAILS = ['dua.lipa140@outlook.fr']
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const sessionUser = {
    id: user.id,
    discord_id: user.discord_id || '',
    username: user.username,
    avatar: user.avatar,
    email: user.email,
    is_admin: user.is_admin || ADMIN_EMAILS.includes(email.toLowerCase()),
  }

  const token = await createSession(sessionUser)
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: 'session',
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}