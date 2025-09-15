'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, Calendar, DollarSign, Users } from 'lucide-react'
import { ProjectFilters as FilterType } from '@/hooks/useProjects'

interface ProjectFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
  companies: Array<{ id: string; name: string; logo_url?: string }>
  loading?: boolean
}

export function ProjectFilters({ 
  filters, 
  onFiltersChange, 
  companies, 
  loading = false 
}: ProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFilterChange = (key: keyof FilterType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      interventionType: 'all',
      clientId: 'all',
      dateRange: null,
      progressRange: null
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.status !== 'all') count++
    if (filters.interventionType !== 'all') count++
    if (filters.clientId !== 'all') count++
    if (filters.dateRange) count++
    if (filters.progressRange) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Básicos' : 'Avanzados'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtros básicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar proyectos..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          {/* Estado */}
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado del proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="planificacion">Planificación</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* Tipo de intervención */}
          <Select
            value={filters.interventionType}
            onValueChange={(value) => handleFilterChange('interventionType', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de intervención" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="supervision_tecnica">Supervisión Técnica</SelectItem>
              <SelectItem value="interventoria_administrativa">Interventoría Administrativa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtros avanzados */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cliente */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Empresa Cliente</Label>
                <Select
                  value={filters.clientId}
                  onValueChange={(value) => handleFilterChange('clientId', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center gap-2">
                          {company.logo_url && (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="w-4 h-4 rounded"
                            />
                          )}
                          {company.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango de fechas */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Rango de fechas</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) => handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      start: e.target.value
                    })}
                    disabled={loading}
                    className="text-sm"
                  />
                  <span className="text-gray-400">a</span>
                  <Input
                    type="date"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) => handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      end: e.target.value
                    })}
                    disabled={loading}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Rango de progreso */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Progreso (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    min="0"
                    max="100"
                    value={filters.progressRange?.min || ''}
                    onChange={(e) => handleFilterChange('progressRange', {
                      ...filters.progressRange,
                      min: e.target.value ? parseInt(e.target.value) : 0
                    })}
                    disabled={loading}
                    className="text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    min="0"
                    max="100"
                    value={filters.progressRange?.max || ''}
                    onChange={(e) => handleFilterChange('progressRange', {
                      ...filters.progressRange,
                      max: e.target.value ? parseInt(e.target.value) : 100
                    })}
                    disabled={loading}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
