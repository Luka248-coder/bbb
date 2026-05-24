'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
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
    </div>
  )
}
