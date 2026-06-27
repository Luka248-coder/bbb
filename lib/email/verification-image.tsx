import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

const WIDTH = 600
const HEIGHT = 700

let fontsCache: { name: string; data: Buffer; weight: 600 | 700 | 900; style: 'normal' }[] | null = null
let logoDataUriCache: string | null = null

async function loadFonts() {
  if (fontsCache) return fontsCache
  const dir = path.join(process.cwd(), 'assets', 'fonts')
  const [w600, w700, w900] = await Promise.all([
    readFile(path.join(dir, 'Poppins-600.woff')),
    readFile(path.join(dir, 'Poppins-700.woff')),
    readFile(path.join(dir, 'Poppins-900.woff')),
  ])
  fontsCache = [
    { name: 'Poppins', data: w600, weight: 600, style: 'normal' },
    { name: 'Poppins', data: w700, weight: 700, style: 'normal' },
    { name: 'Poppins', data: w900, weight: 900, style: 'normal' },
  ]
  return fontsCache
}

async function loadLogoDataUri() {
  if (logoDataUriCache) return logoDataUriCache
  const logoPath = path.join(process.cwd(), 'assets', 'logo-transparent.png')
  const buf = await readFile(logoPath)
  logoDataUriCache = `data:image/png;base64,${buf.toString('base64')}`
  return logoDataUriCache
}

// Petite PRNG déterministe (mulberry32) pour générer des confettis qui varient
// d'un envoi à l'autre sans dépendre de Math.random à chaque rendu.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SILVER_TONES = ['#E8E8EC', '#C9CBD1', '#B7BAC2', '#9AA0AA', '#DDE1E6']

function buildConfetti(seed: number) {
  const rand = mulberry32(seed)
  const pieces = []
  const count = 80
  for (let i = 0; i < count; i++) {
    const top = rand() * HEIGHT
    const left = rand() * WIDTH
    const roll = rand()
    const kind: 'circle' | 'square' | 'sparkle' = roll > 0.85 ? 'sparkle' : roll > 0.45 ? 'circle' : 'square'
    const size = kind === 'sparkle' ? 10 + rand() * 8 : 3 + rand() * 7
    const rotate = Math.floor(rand() * 360)
    const opacity = 0.18 + rand() * 0.55
    const color = SILVER_TONES[Math.floor(rand() * SILVER_TONES.length)]
    pieces.push({ top, left, kind, size, rotate, opacity, color, key: i })
  }
  return pieces
}

export async function renderVerificationCodeImage(code: string): Promise<Buffer> {
  const digits = code.split('')
  const [fonts, logoDataUri] = await Promise.all([loadFonts(), loadLogoDataUri()])
  const confetti = buildConfetti(
    Array.from(code).reduce((acc, c) => acc + c.charCodeAt(0), 7),
  )

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          background: 'linear-gradient(160deg, #050608 0%, #000000 55%, #03070f 100%)',
          fontFamily: 'Poppins',
          overflow: 'hidden',
        }}
      >
        {/* Lueur bleue de fond, cohérente avec le logo */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: WIDTH / 2 - 220,
            width: 440,
            height: 320,
            borderRadius: 9999,
            background: 'rgba(0, 104, 255, 0.22)',
            filter: 'blur(40px)',
            display: 'flex',
          }}
        />

        {/* Confettis argentés / pailletés */}
        {confetti.map((c) =>
          c.kind === 'sparkle' ? (
            <div
              key={c.key}
              style={{
                position: 'absolute',
                top: c.top,
                left: c.left,
                width: c.size,
                height: c.size,
                opacity: c.opacity,
                transform: `rotate(${c.rotate}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: c.size,
                  height: Math.max(1.5, c.size * 0.16),
                  borderRadius: 2,
                  background: c.color,
                  boxShadow: `0 0 8px 1px rgba(255,255,255,${c.opacity * 0.7})`,
                  display: 'flex',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: Math.max(1.5, c.size * 0.16),
                  height: c.size,
                  borderRadius: 2,
                  background: c.color,
                  boxShadow: `0 0 8px 1px rgba(255,255,255,${c.opacity * 0.7})`,
                  display: 'flex',
                }}
              />
            </div>
          ) : (
            <div
              key={c.key}
              style={{
                position: 'absolute',
                top: c.top,
                left: c.left,
                width: c.size,
                height: c.size,
                borderRadius: c.kind === 'circle' ? '50%' : 3,
                background: c.color,
                opacity: c.opacity,
                boxShadow: `0 0 6px 1px rgba(255,255,255,${c.opacity * 0.6})`,
                transform: `rotate(${c.rotate}deg)`,
                display: 'flex',
              }}
            />
          ),
        )}

        {/* Contenu principal */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            paddingTop: 56,
            width: '100%',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              width: 76,
              height: 76,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <img src={logoDataUri} width={48} height={48} style={{ borderRadius: 12 }} />
          </div>

          <div
            style={{
              display: 'flex',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: -0.5,
            }}
          >
            Code de vérification
          </div>

          <div
            style={{
              display: 'flex',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 36,
              textAlign: 'center',
              maxWidth: 360,
            }}
          >
            Entrez ce code pour confirmer votre adresse e-mail
          </div>

          {/* Cadre contenant le code */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '34px 30px',
              borderRadius: 28,
              background: 'rgba(255,255,255,0.045)',
              border: '1.5px solid rgba(201,203,209,0.45)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 18px 40px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              {digits.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 58,
                    height: 74,
                    margin: '0 6px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(0,104,255,0.5)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 42,
                      fontWeight: 900,
                      color: '#0068FF',
                      fontFamily: 'Poppins',
                    }}
                  >
                    {d}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              fontWeight: 600,
              marginTop: 22,
              letterSpacing: 1,
            }}
          >
            Ce code expire dans 10 minutes
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13,
              fontWeight: 700,
              marginTop: 44,
              letterSpacing: 1.5,
            }}
          >
            STREAMSELF.FR
          </div>

          <div
            style={{
              display: 'flex',
              color: 'rgba(255,255,255,0.22)',
              fontSize: 11,
              fontWeight: 600,
              marginTop: 14,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            Vous n'avez pas demandé ce code ? Ignorez cet e-mail.
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    },
  )

  const arrayBuffer = await image.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
