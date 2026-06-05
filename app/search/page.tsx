export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { searchContent } from '@/lib/fastflux'
import { Footer } from '@/components/footer'
import { SearchResults } from '@/components/search-results'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Recherche - Streamself',
  description: 'Recherchez des films et séries sur Streamself',
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

async function SearchContent({ query }: { query: string }) {
  if (!query) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Recherchez un film ou une série</h2>
        <p className="text-muted-foreground">Utilisez la barre de recherche pour trouver votre contenu préféré</p>
      </div>
    )
  }
  const results = await searchContent(query)
  return <SearchResults query={query} movies={results.movies} series={results.series} />
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await getSession()
  const params = await searchParams
  const query = params.q || ''
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pt-24">
        <Suspense fallback={<Loading />}>
          <SearchContent query={query} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
