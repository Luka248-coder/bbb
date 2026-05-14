export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { RouletteClient } from '@/components/roulette-client'

export const metadata = {
  title: 'Roulette - StreamSelf',
  description: 'Laisse le hasard choisir ton prochain film ou série',
}

export default async function RoulettePage() {
  const user = await getSession()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24">
        <RouletteClient userId={user?.id ?? null} />
      </main>
      <Footer />
    </div>
  )
}