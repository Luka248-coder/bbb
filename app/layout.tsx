import type { Metadata } from 'next'
import { Inter, Barlow_Condensed } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/session-provider'
import { MovieDrawerProvider } from '@/components/movie-drawer'
import './globals.css'
import { GridBackground } from '@/components/grid-background'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-barlow-condensed' })

export const metadata: Metadata = {
  title: 'StreamSelf',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${barlowCondensed.variable} font-sans antialiased`}>
        <GridBackground />
        <SessionProvider>
          <MovieDrawerProvider>
            <div className="relative page-scaled" style={{zIndex:1}}>
              {children}
            </div>
          </MovieDrawerProvider>
        </SessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
