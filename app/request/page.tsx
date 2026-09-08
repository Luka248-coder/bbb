export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Footer } from '@/components/footer'
import { RequestForm } from '@/components/request-form'

export const metadata = {
  title: 'Souhaits - StreamSelf',
}

export default async function RequestPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen bg-[#08080a]">
      <main>
        <RequestForm userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
