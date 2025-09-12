'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  User,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Company {
  id: string
  name: string
  nit: string
  company_type: 'cliente' | 'constructora' | 'interventora' | 'supervisora' | null
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  website: string | null
  legal_representative: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  is_active: boolean
  created_at: string
}

const ITEMS_PER_PAGE = 10

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()
  const { profile } = useAuth()

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
      toast.error('Error al cargar las empresas')
    } finally {
      setLoading(false)
    }
  }

  async function deleteCompany(id: string) {
    setDeletingId(id)
    try {
      // Verificar si la empresa tiene proyectos asociados
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_company_id', id)
        .limit(1)

      if (projectsError) throw projectsError

      if (projects && projects.length > 0) {
        toast.error('No se puede eliminar la empresa porque tiene proyectos asociados')
        return
      }

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCompanies(companies.filter(c => c.id !== id))
      toast.success('Empresa eliminada correctamente')
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error('Error al eliminar la empresa')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.nit.includes(searchTerm) ||
    company.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.company_type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Paginación
  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Cliente</h1>
          <p className="text-gray-600">Gestiona las empresas cliente del sistema</p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Link>
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o NIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="ml-4">
          {filteredCompanies.length} empresa{filteredCompanies.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Comienza agregando tu primera empresa cliente'
                }
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/admin/companies/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Empresa
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          paginatedCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Logo */}
                    {company.logo_url && (
                      <img 
                        src={company.logo_url} 
                        alt={`Logo ${company.name}`}
                        className="w-12 h-12 object-contain border rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        {company.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        NIT: {company.nit}
                        {company.company_type && (
                          <span className="ml-2">
                            • <Badge variant="outline" className="text-xs">
                              {company.company_type === 'cliente' && 'Cliente'}
                              {company.company_type === 'constructora' && 'Constructora'}
                              {company.company_type === 'interventora' && 'Interventora'}
                              {company.company_type === 'supervisora' && 'Supervisora'}
                            </Badge>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/companies/${company.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          disabled={deletingId === company.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la empresa 
                            <strong> {company.name}</strong> del sistema.
                            {'\n\n'}
                            Solo se puede eliminar si no tiene proyectos asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCompany(company.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Información de contacto */}
                  <div className="space-y-2">
                    {company.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        {company.phone}
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Información de ubicación */}
                  <div className="space-y-2">
                    {company.city && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        {company.city}
                      </div>
                    )}
                    {company.address && (
                      <div className="text-sm text-gray-600">
                        <strong>Dirección:</strong> {company.address}
                      </div>
                    )}
                  </div>

                  {/* Información legal y contacto */}
                  <div className="md:col-span-2 space-y-2">
                    {company.legal_representative && (
                      <div className="text-sm text-gray-600">
                        <strong>Representante Legal:</strong> {company.legal_representative}
                      </div>
                    )}
                    {company.contact_person && (
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span><strong>Contacto:</strong> {company.contact_person}</span>
                        {company.contact_phone && (
                          <span className="ml-2">• {company.contact_phone}</span>
                        )}
                        {company.contact_email && (
                          <span className="ml-2">• {company.contact_email}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredCompanies.length)} de {filteredCompanies.length} empresas
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
