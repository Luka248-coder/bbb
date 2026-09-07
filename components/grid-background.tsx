'use client'

export function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* Base noire neutre */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#08080a',
      }} />

      {/* Halo principal — centre haut */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(220,38,38,0.16) 0%, transparent 70%)',
      }} />

      {/* Halo secondaire — bas gauche, très discret */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 40% at -10% 110%, rgba(220,38,38,0.06) 0%, transparent 60%)',
      }} />

      {/* Halo tertiaire — bas droite */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 50% 35% at 110% 100%, rgba(150,20,24,0.06) 0%, transparent 55%)',
      }} />

      {/* Légère brume centrale flottante */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 30% at 50% 45%, rgba(220,38,38,0.04) 0%, transparent 70%)',
      }} />

    </div>
  )
}
