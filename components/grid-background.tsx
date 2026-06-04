'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 40% at 50% 90%, rgba(120,40,8,0.14) 0%, transparent 70%),
          radial-gradient(ellipse 50% 25% at 50% 88%, rgba(150,50,8,0.08) 0%, transparent 55%)
        `,
      }} />
    </div>
  )
}
