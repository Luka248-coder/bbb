'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Intro cinématique "Paramount & Netflix Hybrid" — portée depuis le fichier HTML/CSS/JS
 * fourni, avec CINEPRIMEE remplacé par STREAMSELF. Logique (canvas, timings, sons)
 * conservée à l'identique, juste adaptée en composant React.
 *
 * S'affiche une fois par session (sessionStorage). Se retire elle-même du DOM
 * une fois la séquence terminée, révélant le site en dessous.
 */

const SESSION_KEY = 'streamself_intro_played'
const STAR_COUNT = 180
const WARP_DELAY_MS = 1800
const END_DELAY_MS = 4400
const FADE_OUT_MS = 600

type Star = { x: number; y: number; z: number; color: string }

export default function LaunchIntro() {
  const [mounted, setMounted] = useState(false)
  const [started, setStarted] = useState(false)
  const [stageVisible, setStageVisible] = useState(false)
  const [rumble, setRumble] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [viewportOpacity, setViewportOpacity] = useState(1)
  const [removed, setRemoved] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const warpRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Décide une seule fois (au montage) si l'intro doit jouer cette session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        setRemoved(true)
        return
      }
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !started) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * canvas.width - canvas.width / 2,
      y: Math.random() * canvas.height - canvas.height / 2,
      z: Math.random() * canvas.width,
      color: '#fff',
    }))

    function drawStars() {
      const warp = warpRef.current
      ctx!.fillStyle = warp ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.9)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

      const centerX = canvas!.width / 2
      const centerY = canvas!.height / 2

      for (const s of starsRef.current) {
        s.z -= warp ? 20 : 0.55

        if (s.z <= 0) {
          s.z = canvas!.width
          s.x = Math.random() * canvas!.width - canvas!.width / 2
          s.y = Math.random() * canvas!.height - canvas!.height / 2
          s.color = warp
            ? ['#e50914', '#007fff', '#ffaa00', '#8e2de2'][Math.floor(Math.random() * 4)]
            : '#ffffff'
        }

        const px = (s.x / s.z) * centerX + centerX
        const py = (s.y / s.z) * centerY + centerY
        const size = (1 - s.z / canvas!.width) * 4

        ctx!.beginPath()
        if (warp) {
          const prevZ = s.z + 45
          const ppx = (s.x / prevZ) * centerX + centerX
          const ppy = (s.y / prevZ) * centerY + centerY
          ctx!.strokeStyle = s.color
          ctx!.lineWidth = size * 0.8
          ctx!.moveTo(px, py)
          ctx!.lineTo(ppx, ppy)
          ctx!.stroke()
        } else {
          ctx!.fillStyle = s.color
          ctx!.arc(px, py, size, 0, Math.PI * 2)
          ctx!.fill()
        }
      }

      rafRef.current = requestAnimationFrame(drawStars)
    }
    drawStars()

    const warpTimer = setTimeout(() => {
      warpRef.current = true
      setRumble(true)
    }, WARP_DELAY_MS)

    const endTimer = setTimeout(() => {
      setViewportOpacity(0)
      setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        setRemoved(true)
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {}
      }, FADE_OUT_MS)
    }, END_DELAY_MS)

    return () => {
      window.removeEventListener('resize', resize)
      clearTimeout(warpTimer)
      clearTimeout(endTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [mounted, started])

  function handleStart() {
    setOverlayOpacity(0)
    setTimeout(() => setStarted(true), 500)
    setStageVisible(true)

    const audio = new Audio('/launch-intro.mp3')
    audio.volume = 1.0
    audioRef.current = audio
    audio.play().catch(() => {})
  }

  if (!mounted || removed) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      <style>{`
        .si-logo {
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-size: clamp(2.4rem, 7.8vw, 6.5rem);
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          letter-spacing: clamp(4px, 1.6vw, 16px);
          margin: 0;
          background: linear-gradient(to bottom, #777 0%, #fefefe 44%, #181818 49%, #ffffff 53%, #a1a1a1 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          filter: drop-shadow(0 0 15px rgba(229, 9, 20, 0.95)) drop-shadow(0 0 35px rgba(229, 9, 20, 0.5));
          will-change: transform, opacity;
          transform: translateZ(0) scale(0.9);
          animation: si-logo-warp-zoom 4.4s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }
        .si-shine {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-size: clamp(2.4rem, 7.8vw, 6.5rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: clamp(4px, 1.6vw, 16px);
          white-space: nowrap;
          background: linear-gradient(115deg, transparent 40%, rgba(255, 215, 0, 0.8) 50%, transparent 60%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          pointer-events: none;
          will-change: background-position;
          animation: si-light-sweep 1.8s ease-in-out forwards;
          animation-delay: 0.5s;
          opacity: 0;
        }
        .si-rumble {
          animation: si-shake-rumble 1.5s ease-in-out;
        }
        @keyframes si-logo-warp-zoom {
          0% { opacity: 0; transform: translateZ(-100px) scale(0.85); filter: blur(4px); }
          15% { opacity: 1; filter: blur(0px); }
          42% { transform: translateZ(50px) scale(1); opacity: 1; filter: blur(0px); }
          55% { opacity: 0.95; filter: blur(1px); }
          75%, 100% { transform: translateZ(1000px) scale(35); opacity: 0; filter: blur(20px); }
        }
        @keyframes si-light-sweep {
          0% { background-position: -200% 0; opacity: 0; }
          15% { opacity: 0.8; }
          70% { opacity: 0.8; }
          100% { background-position: 200% 0; opacity: 0; }
        }
        @keyframes si-shake-rumble {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-2px, 1px) rotate(-0.3deg); }
          20% { transform: translate(1px, -2px) rotate(0.3deg); }
          30% { transform: translate(-1px, 2px) rotate(0deg); }
          40% { transform: translate(2px, 1px) rotate(0.3deg); }
          50% { transform: translate(-1px, -1px) rotate(-0.3deg); }
          60% { transform: translate(2px, 2px) rotate(0deg); }
          70% { transform: translate(-2px, 1px) rotate(0.3deg); }
          80% { transform: translate(1px, -2px) rotate(-0.3deg); }
          90% { transform: translate(-1px, 1px) rotate(0deg); }
        }
      `}</style>

      {/* Overlay de démarrage (obligatoire pour autoriser le son au clic) */}
      {!started && (
        <div
          onClick={handleStart}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#020202',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            color: '#fff',
            cursor: 'pointer',
            opacity: overlayOpacity,
            transition: 'opacity 0.5s ease',
          }}
        >
          <h2
            style={{
              fontSize: '0.85rem',
              letterSpacing: 6,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 25,
              textTransform: 'uppercase',
            }}
          >
            Production cinématographique
          </h2>
          <button
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '15px 45px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 2,
              borderRadius: 50,
            }}
          >
            Entrer sur StreamSelf
          </button>
        </div>
      )}

      {!started ? null : (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: 1000,
              overflow: 'hidden',
              zIndex: 10,
              opacity: viewportOpacity,
              transition: 'opacity 0.6s ease',
            }}
          >
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />

            {stageVisible && (
              <div style={{ position: 'relative', transformStyle: 'preserve-3d', zIndex: 10 }}>
                <div className={rumble ? 'si-rumble' : ''}>
                  <h1 className="si-logo">Streamself</h1>
                  <div className="si-shine">Streamself</div>
                </div>
              </div>
            )}
          </div>

          {/* Vignette d'ambiance */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.98) 100%)',
              pointerEvents: 'none',
              zIndex: 500,
            }}
          />
        </>
      )}
    </div>
  )
}
