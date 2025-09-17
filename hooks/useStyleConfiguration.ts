import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StyleConfiguration, BrandingAsset } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export function useStyleConfiguration() {
  const supabase = createClient()
  const { user } = useAuth()
  const [configurations, setConfigurations] = useState<StyleConfiguration[]>([])
  const [activeConfiguration, setActiveConfiguration] = useState<StyleConfiguration | null>(null)
  const [brandingAssets, setBrandingAssets] = useState<BrandingAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfigurations = async () => {
    setLoading(true)
    setError(null)

    try {
      // Cargar todas las configuraciones
      const { data: configsData, error: configsError } = await supabase
        .from('style_configurations')
        .select('*')
        .order('created_at', { ascending: false })

      if (configsError) throw configsError
      setConfigurations(configsData || [])

      // Cargar configuración activa
      const { data: activeData, error: activeError } = await supabase
        .from('style_configurations')
        .select('*')
        .eq('is_active', true)
        .single()

      if (activeError && activeError.code !== 'PGRST116') throw activeError
      setActiveConfiguration(activeData || null)

      // Cargar assets de branding si hay configuración activa
      if (activeData) {
        const { data: assetsData, error: assetsError } = await supabase
          .from('branding_assets')
          .select('*')
          .eq('style_configuration_id', activeData.id)
          .order('created_at', { ascending: false })

        if (assetsError) throw assetsError
        setBrandingAssets(assetsData || [])
      }

    } catch (err) {
      console.error('Error loading style configurations:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar configuraciones de estilos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigurations()
  }, [])

  const createConfiguration = async (config: Omit<StyleConfiguration, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) throw new Error('User not authenticated')
    
    try {
      const { data, error } = await supabase
        .from('style_configurations')
        .insert({ ...config, created_by: user.id })
        .select()
        .single()

      if (error) throw error
      setConfigurations(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating style configuration:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear configuración de estilos')
      throw err
    }
  }

  const updateConfiguration = async (id: string, updates: Partial<Omit<StyleConfiguration, 'id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
    try {
      const { data, error } = await supabase
        .from('style_configurations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setConfigurations(prev => prev.map(config => config.id === id ? data : config))
      
      // Si se activó esta configuración, actualizar la configuración activa
      if (updates.is_active) {
        setActiveConfiguration(data)
        // Aplicar estilos inmediatamente
        applyStyles(data)
      }
      
      return data
    } catch (err) {
      console.error('Error updating style configuration:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar configuración de estilos')
      throw err
    }
  }

  const deleteConfiguration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('style_configurations')
        .delete()
        .eq('id', id)

      if (error) throw error
      setConfigurations(prev => prev.filter(config => config.id !== id))
      
      // Si se eliminó la configuración activa, recargar
      if (activeConfiguration?.id === id) {
        loadConfigurations()
      }
    } catch (err) {
      console.error('Error deleting style configuration:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar configuración de estilos')
      throw err
    }
  }

  const uploadBrandingAsset = async (configId: string, file: File, assetType: BrandingAsset['asset_type']) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${configId}-${assetType}-${Date.now()}.${fileExt}`
      const filePath = `branding-assets/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath)

      // Crear registro en la base de datos
      const { data, error } = await supabase
        .from('branding_assets')
        .insert({
          style_configuration_id: configId,
          asset_type: assetType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      setBrandingAssets(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error uploading branding asset:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al subir asset de branding')
      throw err
    }
  }

  const applyStyles = (config: StyleConfiguration) => {
    // Aplicar estilos CSS variables al documento
    const root = document.documentElement
    
    root.style.setProperty('--primary', config.primary_color)
    root.style.setProperty('--primary-foreground', config.primary_foreground)
    root.style.setProperty('--secondary', config.secondary_color)
    root.style.setProperty('--secondary-foreground', config.secondary_foreground)
    root.style.setProperty('--accent', config.accent_color)
    root.style.setProperty('--accent-foreground', config.accent_foreground)
    root.style.setProperty('--background', config.background_color)
    root.style.setProperty('--foreground', config.foreground_color)
    root.style.setProperty('--card', config.card_background)
    root.style.setProperty('--card-foreground', config.card_foreground)
    root.style.setProperty('--border', config.border_color)
    root.style.setProperty('--input', config.input_color)
    root.style.setProperty('--ring', config.ring_color)
    root.style.setProperty('--radius', config.border_radius)
    
    // Aplicar colores de estado
    root.style.setProperty('--success', config.success_color)
    root.style.setProperty('--warning', config.warning_color)
    root.style.setProperty('--error', config.error_color)
    root.style.setProperty('--info', config.info_color)
    
    // Aplicar tipografía
    root.style.setProperty('--font-family', config.font_family)
    root.style.setProperty('--font-size-base', config.font_size_base)
    
    // Aplicar sombras
    root.style.setProperty('--shadow-sm', config.shadow_sm)
    root.style.setProperty('--shadow-md', config.shadow_md)
    root.style.setProperty('--shadow-lg', config.shadow_lg)
    
    // Actualizar título de la página si hay nombre de empresa
    if (config.company_name) {
      document.title = config.company_name
    }
    
    // Actualizar favicon si existe
    if (config.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = config.favicon_url
      }
    }
  }

  const activateConfiguration = async (id: string) => {
    try {
      // Desactivar todas las configuraciones
      await supabase
        .from('style_configurations')
        .update({ is_active: false })
        .neq('id', id)

      // Activar la configuración seleccionada
      const { data, error } = await supabase
        .from('style_configurations')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setActiveConfiguration(data)
      applyStyles(data)
      
      // Recargar configuraciones para reflejar cambios
      loadConfigurations()
      
      return data
    } catch (err) {
      console.error('Error activating style configuration:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al activar configuración de estilos')
      throw err
    }
  }

  return {
    configurations,
    activeConfiguration,
    brandingAssets,
    loading,
    error,
    refreshConfigurations: loadConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    uploadBrandingAsset,
    activateConfiguration,
    applyStyles
  }
}
