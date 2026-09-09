import type { Metadata } from 'next'
import { Inter, Barlow_Condensed, Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/session-provider'
import { MovieDrawerProvider } from '@/components/movie-drawer'
import { NavbarWrapper } from '@/components/navbar-wrapper'
import { SupportWidget } from '@/components/support-widget'
import { GridBackground } from '@/components/grid-background'
import { PresenceTracker } from '@/components/presence-tracker'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { ProfileGate } from '@/components/profile-gate'
import { CinflixSwRegister } from '@/components/cinflix-sw-register'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
})
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: 'StreamSelf',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${barlowCondensed.variable} ${montserrat.variable} font-sans antialiased`}>
        <GridBackground />
        <PresenceTracker />

        <SessionProvider>
          <ProfileProvider>
            <ProfileGate>
              <MovieDrawerProvider>
                <NavbarWrapper />
                <SupportWidget />
                <div className="relative" style={{ zIndex: 1 }}>
                  {children}
                </div>
              </MovieDrawerProvider>
            </ProfileGate>
          </ProfileProvider>
        </SessionProvider>

        <CinflixSwRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
