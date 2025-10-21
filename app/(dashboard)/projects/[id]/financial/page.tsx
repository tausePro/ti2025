'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function FinancialRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la vista simple
    router.replace(`/projects/${params.id}/financial/simple`)
  }, [params.id, router])

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
    </div>
  )
}
