import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST() {
  const response = NextResponse.redirect(new URL('/', appUrl))
  response.cookies.set({
    name: 'session',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/', appUrl))
  response.cookies.set({
    name: 'session',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}