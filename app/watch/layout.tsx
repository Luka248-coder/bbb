export default function WatchLayout({ children }: { children: React.ReactNode }) {
  // Le player ne doit pas être affecté par le zoom desktop
  // On enveloppe dans un div qui contre-balance le scale parent
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {children}
    </div>
  )
}
