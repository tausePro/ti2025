'use client'

import { useState, useEffect } from 'react'
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Users,
  Building2,
  BarChart3,
  Clock,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'
import { PerformanceMetric } from '@/types/database-extended'

export default function PerformanceDashboard() {
  const { profile } = useAuth()
  const {
    metrics,
    dashboard,
    alerts,
    loading,
    error,
    loadMetrics,
    recordMetric,
    refreshData
  } = usePerformanceMetrics()

  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedMetricType, setSelectedMetricType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')

  // Verificar permisos
  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600">
            Solo los Super Administradores pueden acceder a este dashboard.
          </p>
        </div>
      </div>
    )
  }

  const handleRefresh = () => {
    refreshData()
  }

  const handleExportData = async () => {
    try {
      // Exportar métricas como CSV
      const response = await fetch('/api/metrics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany === 'all' ? null : selectedCompany,
          metric_type: selectedMetricType === 'all' ? null : selectedMetricType,
          date_range: dateRange
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `metrics-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay datos disponibles
        </h3>
        <p className="text-gray-500">
          Espera a que se acumulen algunas métricas para ver el dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de Rendimiento
          </h1>
          <p className="text-gray-600 mt-2">
            Monitorea el rendimiento y uso de la plataforma
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {dashboard.company_metrics.map((company) => (
                    <SelectItem key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Métrica</label>
              <Select value={selectedMetricType} onValueChange={setSelectedMetricType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las métricas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las métricas</SelectItem>
                  <SelectItem value="page_load_time">Tiempo de Carga</SelectItem>
                  <SelectItem value="api_response_time">Tiempo de API</SelectItem>
                  <SelectItem value="error_rate">Tasa de Error</SelectItem>
                  <SelectItem value="feature_usage">Uso de Funciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rango de Fechas</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.total_companies}</div>
            <p className="text-xs text-muted-foreground">
              Empresas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.total_projects}</div>
            <p className="text-xs text-muted-foreground">
              Proyectos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.metrics_summary.average_load_time.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo de carga promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Alertas activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con contenido detallado */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="companies">Por Empresa</TabsTrigger>
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="features">Funciones</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Empresas más activas */}
            <Card>
              <CardHeader>
                <CardTitle>Empresas Más Activas</CardTitle>
                <CardDescription>
                  Empresas con mayor uso de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.metrics_summary.top_companies_by_usage.map((company, index) => (
                    <div key={company.company_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{company.company_name}</p>
                          <p className="text-sm text-gray-500">
                            {company.usage_count} acciones
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {company.usage_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Funciones más usadas */}
            <Card>
              <CardHeader>
                <CardTitle>Funciones Más Usadas</CardTitle>
                <CardDescription>
                  Funcionalidades más utilizadas en la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.metrics_summary.top_features.map((feature, index) => (
                    <div key={feature.feature_name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{feature.feature_name}</p>
                          <p className="text-sm text-gray-500">
                            {feature.usage_count} usos
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {feature.usage_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas por Empresa</CardTitle>
              <CardDescription>
                Rendimiento y uso detallado por empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.company_metrics.map((company) => (
                  <div key={company.company_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{company.company_name}</h3>
                      <Badge
                        variant={company.performance_score > 80 ? "default" : company.performance_score > 60 ? "secondary" : "destructive"}
                      >
                        Score: {company.performance_score}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Proyectos</p>
                        <p className="font-medium">{company.projects_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Usuarios</p>
                        <p className="font-medium">{company.users_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Última Actividad</p>
                        <p className="font-medium">
                          {new Date(company.last_activity).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webvitals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">LCP (Largest Contentful Paint)</CardTitle>
                <CardDescription>
                  Tiempo hasta que el contenido principal es visible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {(() => {
                    const lcpMetrics = metrics.filter(m => m.metric_name === 'LCP')
                    if (lcpMetrics.length === 0) return 'N/A'
                    const avgLCP = lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length
                    return `${avgLCP.toFixed(0)}ms`
                  })()}
                </div>
                <div className="mt-2">
                  {(() => {
                    const lcpMetrics = metrics.filter(m => m.metric_name === 'LCP')
                    if (lcpMetrics.length === 0) return null
                    const avgLCP = lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length
                    const rating = avgLCP <= 2500 ? 'good' : avgLCP <= 4000 ? 'needs-improvement' : 'poor'
                    return (
                      <Badge variant={rating === 'good' ? 'default' : rating === 'needs-improvement' ? 'secondary' : 'destructive'}>
                        {rating === 'good' ? 'Excelente' : rating === 'needs-improvement' ? 'Mejorable' : 'Crítico'}
                      </Badge>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FID (First Input Delay)</CardTitle>
                <CardDescription>
                  Tiempo de respuesta a la primera interacción
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {(() => {
                    const fidMetrics = metrics.filter(m => m.metric_name === 'FID')
                    if (fidMetrics.length === 0) return 'N/A'
                    const avgFID = fidMetrics.reduce((sum, m) => sum + m.value, 0) / fidMetrics.length
                    return `${avgFID.toFixed(0)}ms`
                  })()}
                </div>
                <div className="mt-2">
                  {(() => {
                    const fidMetrics = metrics.filter(m => m.metric_name === 'FID')
                    if (fidMetrics.length === 0) return null
                    const avgFID = fidMetrics.reduce((sum, m) => sum + m.value, 0) / fidMetrics.length
                    const rating = avgFID <= 100 ? 'good' : avgFID <= 300 ? 'needs-improvement' : 'poor'
                    return (
                      <Badge variant={rating === 'good' ? 'default' : rating === 'needs-improvement' ? 'secondary' : 'destructive'}>
                        {rating === 'good' ? 'Excelente' : rating === 'needs-improvement' ? 'Mejorable' : 'Crítico'}
                      </Badge>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CLS (Cumulative Layout Shift)</CardTitle>
                <CardDescription>
                  Estabilidad visual del contenido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {(() => {
                    const clsMetrics = metrics.filter(m => m.metric_name === 'CLS')
                    if (clsMetrics.length === 0) return 'N/A'
                    const avgCLS = clsMetrics.reduce((sum, m) => sum + m.value, 0) / clsMetrics.length
                    return avgCLS.toFixed(3)
                  })()}
                </div>
                <div className="mt-2">
                  {(() => {
                    const clsMetrics = metrics.filter(m => m.metric_name === 'CLS')
                    if (clsMetrics.length === 0) return null
                    const avgCLS = clsMetrics.reduce((sum, m) => sum + m.value, 0) / clsMetrics.length
                    const rating = avgCLS <= 0.1 ? 'good' : avgCLS <= 0.25 ? 'needs-improvement' : 'poor'
                    return (
                      <Badge variant={rating === 'good' ? 'default' : rating === 'needs-improvement' ? 'secondary' : 'destructive'}>
                        {rating === 'good' ? 'Excelente' : rating === 'needs-improvement' ? 'Mejorable' : 'Crítico'}
                      </Badge>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals - Resumen</CardTitle>
              <CardDescription>
                Métricas de rendimiento desde la perspectiva del usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {(() => {
                      const lcpMetrics = metrics.filter(m => m.metric_name === 'LCP')
                      if (lcpMetrics.length === 0) return '0%'
                      const goodLCP = lcpMetrics.filter(m => m.value <= 2500).length
                      return `${Math.round((goodLCP / lcpMetrics.length) * 100)}%`
                    })()}
                  </div>
                  <p className="text-sm text-gray-600">LCP Bueno</p>
                  <p className="text-xs text-gray-500">≤ 2.5 segundos</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {(() => {
                      const fidMetrics = metrics.filter(m => m.metric_name === 'FID')
                      if (fidMetrics.length === 0) return '0%'
                      const goodFID = fidMetrics.filter(m => m.value <= 100).length
                      return `${Math.round((goodFID / fidMetrics.length) * 100)}%`
                    })()}
                  </div>
                  <p className="text-sm text-gray-600">FID Bueno</p>
                  <p className="text-xs text-gray-500">≤ 100ms</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {(() => {
                      const clsMetrics = metrics.filter(m => m.metric_name === 'CLS')
                      if (clsMetrics.length === 0) return '0%'
                      const goodCLS = clsMetrics.filter(m => m.value <= 0.1).length
                      return `${Math.round((goodCLS / clsMetrics.length) * 100)}%`
                    })()}
                  </div>
                  <p className="text-sm text-gray-600">CLS Bueno</p>
                  <p className="text-xs text-gray-500">≤ 0.1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso de Funciones</CardTitle>
              <CardDescription>
                Métricas detalladas de uso de funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Las métricas de funciones se mostrarán aquí una vez que se acumulen más datos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Rendimiento</CardTitle>
              <CardDescription>
                Alertas automáticas del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <p className="text-gray-500">
                    ¡Excelente! No hay alertas de rendimiento en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-gray-500">
                              Umbral: {alert.threshold} | Actual: {alert.current_value}
                            </p>
                          </div>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}