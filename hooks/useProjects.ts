import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, ProjectMember, ProjectDocument, ProjectActivity } from '@/types'

interface ProjectFilters {
  search: string
  status: string
  interventionType: string
  clientId: string
  dateRange: {
    start: string
    end: string
  } | null
  progressRange: {
    min: number
    max: number
  } | null
}

interface UseProjectsOptions {
  page?: number
  pageSize?: number
  filters?: Partial<ProjectFilters>
  includeArchived?: boolean
}

export function useProjects(options: UseProjectsOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    filters = {},
    includeArchived = false
  } = options

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const supabase = createClient()

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('projects')
        .select(`
          *,
          company:companies!client_company_id(
            id, name, logo_url, company_type
          )
        `)
        .eq('is_archived', includeArchived)

      // Aplicar filtros
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%,address.ilike.%${filters.search}%`)
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.interventionType && filters.interventionType !== 'all') {
        query = query.contains('intervention_types', [filters.interventionType])
      }

      if (filters.clientId && filters.clientId !== 'all') {
        query = query.eq('client_company_id', filters.clientId)
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('start_date', filters.dateRange.start)
        }
        if (filters.dateRange.end) {
          query = query.lte('end_date', filters.dateRange.end)
        }
      }

      if (filters.progressRange) {
        query = query
          .gte('progress_percentage', filters.progressRange.min)
          .lte('progress_percentage', filters.progressRange.max)
      }

      // Paginación
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setProjects(data || [])
      setTotalCount(data?.length || 0)
      setHasMore((data?.length || 0) === pageSize)
    } catch (err) {
      console.error('Error loading projects:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [page, pageSize, filters, includeArchived])

  const refreshProjects = () => {
    loadProjects()
  }

  const addProject = (project: Project) => {
    setProjects(prev => [project, ...prev])
  }

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => 
      prev.map(p => p.id === projectId ? { ...p, ...updates } : p)
    )
  }

  const removeProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  return {
    projects,
    loading,
    error,
    totalCount,
    hasMore,
    refreshProjects,
    addProject,
    updateProject,
    removeProject
  }
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (queryError) throw queryError

      setMembers(data || [])
    } catch (err) {
      console.error('Error loading project members:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadMembers()
    }
  }, [projectId])

  const addMember = async (memberData: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .insert(memberData)
        .select(`
          *,
          user:profiles(id, full_name, email, avatar_url)
        `)
        .single()

      if (error) throw error

      setMembers(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding member:', err)
      throw err
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) {
      console.error('Error removing member:', err)
      throw err
    }
  }

  const updateMemberRole = async (memberId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role_in_project: role })
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, role_in_project: role } : m)
      )
    } catch (err) {
      console.error('Error updating member role:', err)
      throw err
    }
  }

  return {
    members,
    loading,
    error,
    addMember,
    removeMember,
    updateMemberRole,
    refreshMembers: loadMembers
  }
}

export function useProjectDocuments(projectId: string) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('project_documents')
        .select(`
          *,
          uploaded_by_user:profiles!uploaded_by(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (queryError) throw queryError

      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading project documents:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadDocuments()
    }
  }, [projectId])

  const uploadDocument = async (documentData: Omit<ProjectDocument, 'id' | 'uploaded_at'>) => {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .insert(documentData)
        .select(`
          *,
          uploaded_by_user:profiles!uploaded_by(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setDocuments(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error uploading document:', err)
      throw err
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      setDocuments(prev => prev.filter(d => d.id !== documentId))
    } catch (err) {
      console.error('Error deleting document:', err)
      throw err
    }
  }

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    refreshDocuments: loadDocuments
  }
}

export function useProjectActivities(projectId: string) {
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('project_activities')
        .select(`
          *,
          user:profiles!user_id(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (queryError) throw queryError

      setActivities(data || [])
    } catch (err) {
      console.error('Error loading project activities:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadActivities()
    }
  }, [projectId])

  const addActivity = async (activityData: Omit<ProjectActivity, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('project_activities')
        .insert(activityData)
        .select(`
          *,
          user:profiles!user_id(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setActivities(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding activity:', err)
      throw err
    }
  }

  return {
    activities,
    loading,
    error,
    addActivity,
    refreshActivities: loadActivities
  }
}
