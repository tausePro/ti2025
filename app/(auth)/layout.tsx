'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && pathname !== '/confirm') {
        router.push('/dashboard')
      }
    }
    
    checkUser()
  }, [router, supabase, pathname])

  return (
    <>
      {children}
    </>
  )
}
