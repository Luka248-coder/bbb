import { AdminHeroManager } from '@/components/admin/admin-hero-manager'

export default function AdminHeroPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Hero — Mise en avant</h1>
          <p className="text-zinc-400 text-sm">Choisissez les contenus affichés dans le bandeau principal de l&apos;accueil</p>
        </div>
        <AdminHeroManager />
      </div>
    </div>
  )
}
