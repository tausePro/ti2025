import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PerformanceMetric, PerformanceDashboard, PerformanceAlert } from '@/types/database-extended'
import { useAuth } from '@/contexts/AuthContext'

export function usePerformanceMetrics() {
  const supabase = createClient()
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [dashboard, setDashboard] = useState<PerformanceDashboard | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = async (filters?: {
    company_id?: string
    project_id?: string
    metric_type?: string
    date_from?: string
    date_to?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters?.metric_type) {
        query = query.eq('metric_type', filters.metric_type)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      const { data, error } = await query

      if (error) throw error
      setMetrics(data || [])
    } catch (err) {
      console.error('Error loading metrics:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar métricas')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboard = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Solo super_admin puede ver el dashboard completo
      if (user.role !== 'super_admin') {
        setError('No tienes permisos para ver el dashboard de métricas')
        return
      }

      // Obtener métricas del último mes
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: metricsData, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      if (metricsError) throw metricsError

      // Obtener estadísticas de empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, company_type, created_at')
        .eq('is_active', true)

      if (companiesError) throw companiesError

      // Obtener estadísticas de proyectos
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_company_id, status, created_at')

      if (projectsError) throw projectsError

      // Obtener estadísticas de usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, role, created_at')
        .eq('is_active', true)

      if (usersError) throw usersError

      // Calcular métricas
      const totalCompanies = companiesData?.length || 0
      const totalProjects = projectsData?.length || 0
      const totalUsers = usersData?.length || 0

      // Métricas de rendimiento
      const pageLoadMetrics = metricsData?.filter(m => m.metric_type === 'page_load_time') || []
      const averageLoadTime = pageLoadMetrics.length > 0
        ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length
        : 0

      const errorMetrics = metricsData?.filter(m => m.metric_type === 'error_rate') || []
      const errorRate = errorMetrics.length > 0
        ? errorMetrics.reduce((sum, m) => sum + m.value, 0) / errorMetrics.length
        : 0

      // Empresas más activas
      const companyUsage = new Map<string, number>()
      metricsData?.forEach(metric => {
        if (metric.company_id) {
          companyUsage.set(metric.company_id, (companyUsage.get(metric.company_id) || 0) + 1)
        }
      })

      const topCompaniesByUsage = Array.from(companyUsage.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([company_id, usage_count]) => ({
          company_id,
          company_name: companiesData?.find(c => c.id === company_id)?.name || 'Desconocido',
          usage_count
        }))

      // Features más usadas
      const featureUsage = new Map<string, number>()
      metricsData?.filter(m => m.metric_type === 'feature_usage')
        .forEach(metric => {
          const featureName = metric.metric_name
          featureUsage.set(featureName, (featureUsage.get(featureName) || 0) + metric.value)
        })

      const topFeatures = Array.from(featureUsage.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([feature_name, usage_count]) => ({
          feature_name,
          usage_count
        }))

      // Métricas por empresa
      const companyMetrics = companiesData?.map(company => {
        const companyProjects = projectsData?.filter(p => p.client_company_id === company.id) || []
        const companyMetrics = metricsData?.filter(m => m.company_id === company.id) || []
        const lastActivity = companyMetrics.length > 0
          ? companyMetrics[0].created_at
          : company.created_at

        // Calcular score de rendimiento (simplificado)
        const performanceScore = Math.max(0, 100 - (errorRate * 10))

        return {
          company_id: company.id,
          company_name: company.name,
          projects_count: companyProjects.length,
          users_count: usersData?.filter(u => u.role === 'cliente' && company.company_type === 'cliente').length || 0,
          last_activity: lastActivity,
          performance_score: performanceScore
        }
      }) || []

      const dashboardData: PerformanceDashboard = {
        total_companies: totalCompanies,
        total_projects: totalProjects,
        total_users: totalUsers,
        active_configurations: 1, // Por ahora simplificado
        metrics_summary: {
          period: 'Últimos 30 días',
          total_page_views: pageLoadMetrics.length,
          average_load_time: averageLoadTime,
          error_rate: errorRate,
          top_companies_by_usage: topCompaniesByUsage,
          top_features: topFeatures
        },
        company_metrics: companyMetrics
      }

      setDashboard(dashboardData)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const recordMetric = async (
    metric_type: PerformanceMetric['metric_type'],
    metric_name: string,
    value: number,
    metadata?: Record<string, any>,
    company_id?: string,
    project_id?: string
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          metric_type,
          metric_name,
          value,
          company_id,
          project_id,
          user_id: user.id,
          metadata: metadata || {}
        })

      if (error) throw error
    } catch (err) {
      console.error('Error recording metric:', err)
      throw err
    }
  }

  const loadAlerts = async () => {
    if (!user || user.role !== 'super_admin') return

    try {
      // Obtener métricas recientes para detectar alertas
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data: recentMetrics, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', oneHourAgo.toISOString())
        .in('metric_type', ['error_rate', 'api_response_time', 'system_health'])

      if (error) throw error

      // Generar alertas basadas en umbrales
      const newAlerts: PerformanceAlert[] = []

      // Alerta de error rate alto
      const errorRateMetrics = recentMetrics?.filter(m => m.metric_type === 'error_rate') || []
      if (errorRateMetrics.length > 0) {
        const avgErrorRate = errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length
        if (avgErrorRate > 5) { // Más del 5% de errores
          newAlerts.push({
            id: `error_rate_${Date.now()}`,
            type: 'error_rate',
            severity: avgErrorRate > 10 ? 'critical' : 'high',
            message: `Tasa de error alta: ${avgErrorRate.toFixed(2)}%`,
            threshold: 5,
            current_value: avgErrorRate,
            created_at: new Date().toISOString(),
            is_resolved: false
          })
        }
      }

      // Alerta de respuesta lenta
      const responseTimeMetrics = recentMetrics?.filter(m => m.metric_type === 'api_response_time') || []
      if (responseTimeMetrics.length > 0) {
        const avgResponseTime = responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        if (avgResponseTime > 2000) { // Más de 2 segundos
          newAlerts.push({
            id: `slow_response_${Date.now()}`,
            type: 'slow_response',
            severity: avgResponseTime > 5000 ? 'critical' : 'high',
            message: `Tiempo de respuesta lento: ${avgResponseTime.toFixed(0)}ms`,
            threshold: 2000,
            current_value: avgResponseTime,
            created_at: new Date().toISOString(),
            is_resolved: false
          })
        }
      }

      setAlerts(newAlerts)
    } catch (err) {
      console.error('Error loading alerts:', err)
    }
  }

  useEffect(() => {
    if (user) {
      loadDashboard()
      loadAlerts()
    }
  }, [user])

  return {
    metrics,
    dashboard,
    alerts,
    loading,
    error,
    loadMetrics,
    loadDashboard,
    recordMetric,
    loadAlerts,
    refreshData: () => {
      loadDashboard()
      loadAlerts()
    }
  }
}