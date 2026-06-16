import { NextRequest, NextResponse } from 'next/server'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1498406329751044216'
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/discord/callback`

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get('redirect')

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  })

  // On transmet l'URL de retour souhaitée via "state", relu tel quel par Discord
  // dans le callback. On ne garde que les chemins relatifs internes.
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    params.set('state', redirect)
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`

  return NextResponse.redirect(discordAuthUrl)
}
