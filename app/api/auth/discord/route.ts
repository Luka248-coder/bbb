import { NextResponse } from 'next/server'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1498406329751044216'
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`

export async function GET() {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  })

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`
  
  return NextResponse.redirect(discordAuthUrl)
}
