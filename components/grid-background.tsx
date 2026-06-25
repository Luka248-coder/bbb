'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* Base sombre bleutée */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#050a14',
      }} />

      {/* Halo principal — centre haut */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(29,111,232,0.22) 0%, transparent 70%)',
      }} />

      {/* Halo secondaire — bas gauche, très discret */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 40% at -10% 110%, rgba(29,111,232,0.08) 0%, transparent 60%)',
      }} />

      {/* Halo tertiaire — bas droite */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 50% 35% at 110% 100%, rgba(59,130,246,0.06) 0%, transparent 55%)',
      }} />

      {/* Légère brume centrale flottante */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 30% at 50% 45%, rgba(29,111,232,0.05) 0%, transparent 70%)',
      }} />

    </div>
  )
}
