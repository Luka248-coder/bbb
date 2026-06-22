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
    })

    const body = await r.json()

    if (!r.ok) {
      console.error('[discord-avatar] API error:', r.status, body)
      return NextResponse.json({
        error: `Discord API: ${body?.message || r.status}`,
        code: body?.code,
      }, { status: r.status })
    }

    let url: string
    if (body.avatar) {
      const ext = body.avatar.startsWith('a_') ? 'gif' : 'png'
      url = `https://cdn.discordapp.com/avatars/${discordId}/${body.avatar}.${ext}?size=256`
    } else {
      // Avatar par défaut basé sur l'ID
      const index = (BigInt(discordId) >> 22n) % 6n
      url = `https://cdn.discordapp.com/embed/avatars/${index}.png`
    }

    return NextResponse.json({
      url,
      username: body.global_name || body.username || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
