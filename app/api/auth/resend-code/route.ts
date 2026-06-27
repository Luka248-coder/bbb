import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVerificationCode, VERIFICATION_CODE_TTL_MS } from '@/lib/email/code'
import { sendVerificationCodeEmail } from '@/lib/email/send-verification'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('pending_registrations')
    .select('email')
    .eq('email', normalizedEmail)
    .single()

  if (!pending) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const code = generateVerificationCode()
  const expires_at = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString()

  const { error } = await supabase
    .from('pending_registrations')
    .update({ code, attempts: 0, expires_at })
    .eq('email', normalizedEmail)

  if (error) {
    return NextResponse.json({ error: 'db_failed' }, { status: 500 })
  }

  try {
    await sendVerificationCodeEmail(normalizedEmail, code)
  } catch (e) {
    console.error('Resend verification email error:', e)
    return NextResponse.json({ error: 'email_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
