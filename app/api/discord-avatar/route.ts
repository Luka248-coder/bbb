import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const discordId = request.nextUrl.searchParams.get('id')
  if (!discordId || !/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({ error: 'ID Discord invalide (17-20 chiffres)' }, { status: 400 })
  }

  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token Discord non configuré' }, { status: 500 })
  }

  try {
    const r = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!r.ok) {
      return NextResponse.json({ error: 'Utilisateur Discord introuvable' }, { status: 404 })
    }

    const user = await r.json()
    let url: string

    if (user.avatar) {
      const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
      url = `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${ext}?size=256`
    } else {
      const index = (BigInt(discordId) >> 22n) % 6n
      url = `https://cdn.discordapp.com/embed/avatars/${index}.png`
    }

    return NextResponse.json({
      url,
      username: user.global_name || user.username || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erreur réseau : ' + err.message }, { status: 502 })
  }
}
