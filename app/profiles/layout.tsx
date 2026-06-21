export default function ProfilesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh', position: 'relative', zIndex: 50 }}>
      {children}
    </div>
  )
}
