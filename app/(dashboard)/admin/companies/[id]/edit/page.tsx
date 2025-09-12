'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  nit: string
  company_type: string | null
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  legal_representative: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  is_active: boolean | null
}

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCompany()
  }, [params.id])

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setCompany(data)
    } catch (error) {
      console.error('Error fetching company:', error)
      toast.error('Error al cargar la empresa')
      router.push('/admin/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push('/admin/companies')
  }

  const handleCancel = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-gray-200 h-96 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empresa no encontrada</h2>
          <p className="text-gray-600 mb-4">La empresa que buscas no existe o fue eliminada.</p>
          <Button asChild>
            <Link href="/admin/companies">
              Volver a Empresas
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/companies">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Empresa</h1>
          <p className="text-gray-600">Modifica los datos de {company.name}</p>
        </div>
      </div>

      {/* Form */}
      <CompanyForm 
        company={company}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
