'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 90% 55% at 50% 75%, rgba(130,45,8,0.20) 0%, transparent 70%),
          radial-gradient(ellipse 60% 35% at 50% 70%, rgba(170,60,8,0.10) 0%, transparent 55%)
        `,
      }} />
    </div>
  )
}
