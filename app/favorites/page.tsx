export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Footer } from '@/components/footer'
import { FavoritesList } from '@/components/favorites-list'

export const metadata = {
  title: 'Mes favoris - Streamself',
  description: 'Retrouvez vos films et séries favoris sur Streamself',
}

export default async function FavoritesPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pt-24">
        <FavoritesList userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
