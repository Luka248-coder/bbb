'use client'

import { useEffect, useRef } from 'react'

export function GridBackground() {
  const spotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const spot = spotRef.current
    if (!spot) return
    const handleMove = (e: MouseEvent) => {
      spot.style.background = `radial-gradient(circle 350px at ${e.clientX}px ${e.clientY}px, rgba(220,30,30,0.40) 0%, rgba(160,10,10,0.15) 40%, transparent 100%)`
    }
    const handleLeave = () => {
      spot.style.background = 'none'
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseleave', handleLeave)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(200,30,30,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(200,30,30,0.08) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        backgroundColor: '#12080a',
      }} />
      {/* Mouse spotlight */}
      <div ref={spotRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}