'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { CompanyForm } from '@/components/companies/CompanyForm'

export default function NewCompanyPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/admin/companies')
  }

  const handleCancel = () => {
    router.push('/admin/companies')
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
          <h1 className="text-2xl font-bold text-gray-900">Nueva Empresa Cliente</h1>
          <p className="text-gray-600">Registra una nueva empresa cliente en el sistema</p>
        </div>
      </div>

      {/* Form */}
      <CompanyForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
