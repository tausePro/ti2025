'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Calendar, ClipboardList, Download, Loader2, User } from 'lucide-react'
import Link from 'next/link'

interface ProjectOption {
  id: string
  name: string
  project_code: string
}

interface ResidentOption {
  id: string
  label: string
}

interface DailyLogItem {
  id: string
  project_id: string
  date: string
  time: string | null
  activities: string | null
  assigned_to: string | null
  created_at: string
  project?: {
    name: string
    project_code: string
    status?: string | null
    company?: {
      name: string
    } | null
  }
  created_by_profile?: {
    full_name: string | null
    email: string | null
  }
  assigned_to_profile?: {
    full_name: string | null
    email: string | null
  }
}

export default function SupervisorDailyLogsPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [logs, setLogs] = useState<DailyLogItem[]>([])
  const [projectFilter, setProjectFilter] = useState('all')
  const [residentFilter, setResidentFilter] = useState('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  useEffect(() => {
    if (profile && profile.role !== 'supervisor') {
      router.push('/dashboard')
      return
    }

    if (profile) {
      loadSupervisorContext()
    }
  }, [profile, router])

  useEffect(() => {
    if (!profile) return
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, residentFilter, dateStart, dateEnd, profile?.id])

  const loadSupervisorContext = async () => {
    try {
      setLoading(true)

      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile!.id)
        .eq('is_active', true)

      if (membersError) throw membersError

      const projectIds = (membersData || []).map((m: any) => m.project_id)
      if (projectIds.length === 0) {
        setProjects([])
        setResidents([])
        setLogs([])
        return
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .in('id', projectIds)
        .order('name', { ascending: true })

      if (projectsError) throw projectsError

      setProjects(projectsData || [])

      const { data: membersList, error: membersListError } = await supabase
        .from('project_members')
        .select('user_id, role_in_project, user:profiles!user_id(full_name, email)')
        .in('project_id', projectIds)
        .eq('is_active', true)

      if (membersListError) throw membersListError

      const residentsOptions = (membersList || [])
        .filter((member: any) => member.role_in_project === 'residente')
        .map((member: any) => ({
          id: member.user_id,
          label: member.user?.full_name || member.user?.email || 'Residente'
        }))

      const uniqueResidents = Array.from(
        new Map(residentsOptions.map(option => [option.id, option])).values()
      )

      setResidents(uniqueResidents)
    } catch (error) {
      console.error('❌ Error loading supervisor context:', error)
      setProjects([])
      setResidents([])
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)

      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile!.id)
        .eq('is_active', true)

      if (membersError) throw membersError

      const projectIds = (membersData || []).map((m: any) => m.project_id)
      if (projectIds.length === 0) {
        setLogs([])
        return
      }

      let query = supabase
        .from('daily_logs')
        .select(`
          id,
          project_id,
          date,
          time,
          activities,
          assigned_to,
          created_at,
          project:projects!daily_logs_project_id_fkey(
            name,
            project_code,
            status,
            company:companies!client_company_id(name)
          ),
          created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email),
          assigned_to_profile:profiles!daily_logs_assigned_to_fkey(full_name, email)
        `)
        .in('project_id', projectIds)

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter)
      }

      if (residentFilter !== 'all') {
        query = query.eq('assigned_to', residentFilter)
      }

      if (dateStart) {
        query = query.gte('date', dateStart)
      }

      if (dateEnd) {
        query = query.lte('date', dateEnd)
      }

      const { data: logsData, error: logsError } = await query.order('date', { ascending: false })

      if (logsError) throw logsError

      const normalizedLogs = (logsData || []).map((log: any) => ({
        ...log,
        project: Array.isArray(log.project) ? log.project[0] : log.project,
        created_by_profile: Array.isArray(log.created_by_profile) ? log.created_by_profile[0] : log.created_by_profile,
        assigned_to_profile: Array.isArray(log.assigned_to_profile) ? log.assigned_to_profile[0] : log.assigned_to_profile
      }))

      setLogs(normalizedLogs as DailyLogItem[])
    } catch (error) {
      console.error('❌ Error loading logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const logsForExport = useMemo(() => {
    return logs.map(log => ({
      fecha: log.date,
      hora: log.time || '',
      proyecto: log.project?.name || '',
      codigo_proyecto: log.project?.project_code || '',
      residente: log.assigned_to_profile?.full_name || log.assigned_to_profile?.email || '',
      creado_por: log.created_by_profile?.full_name || log.created_by_profile?.email || '',
      actividades: (log.activities || '').replace(/\n/g, ' ')
    }))
  }, [logs])

  const handleExport = () => {
    if (logsForExport.length === 0) return

    const headers = Object.keys(logsForExport[0])
    const csvRows = [headers.join(',')]

    logsForExport.forEach(row => {
      const values = headers.map(header => {
        const value = String((row as any)[header] ?? '')
        return `"${value.replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    })

    const csvContent = `\uFEFF${csvRows.join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bitacoras_supervisor_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bitácoras del Supervisor</h1>
        <p className="text-gray-600 mt-1">Filtra por proyecto, residente y periodos de tiempo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la búsqueda antes de exportar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Residente</Label>
            <Select value={residentFilter} onValueChange={setResidentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los residentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los residentes</SelectItem>
                {residents.map(resident => (
                  <SelectItem key={resident.id} value={resident.id}>
                    {resident.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Desde</Label>
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{logs.length} bitácoras encontradas</p>
        <Button onClick={handleExport} disabled={logs.length === 0} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No hay bitácoras con esos filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {logs.map(log => (
            <Card key={log.id} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {log.project?.name || 'Proyecto'}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {log.project?.project_code || 'Sin código'}
                    </CardDescription>
                  </div>
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {log.date}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {log.project?.company?.name && (
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {log.project.company.name}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    {log.time ? `Hora: ${log.time}` : 'Hora no registrada'}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="truncate max-w-[140px]">
                      {log.assigned_to_profile?.full_name || log.assigned_to_profile?.email || 'Residente'}
                    </span>
                  </span>
                </div>

                {log.activities && (
                  <p className="text-sm text-gray-700 line-clamp-2 mb-4">{log.activities}</p>
                )}

                <div className="flex gap-2">
                  <Button asChild className="flex-1" variant="outline">
                    <Link href={`/projects/${log.project_id}/daily-logs/${log.id}`}>
                      Ver detalle
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
