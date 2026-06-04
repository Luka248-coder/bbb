'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 70% 60% at 50% 40%, rgba(160,60,10,0.28) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 50% 35%, rgba(200,80,10,0.15) 0%, transparent 50%),
          radial-gradient(ellipse 100% 80% at 50% 50%, rgba(100,20,5,0.18) 0%, transparent 75%)
        `,
      }} />
    </div>
  )
}
