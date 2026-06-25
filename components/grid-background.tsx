'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 100% 50% at 50% 0%, rgba(29,111,232,0.18) 0%, transparent 65%)
        `,
      }} />
    </div>
  )
}
