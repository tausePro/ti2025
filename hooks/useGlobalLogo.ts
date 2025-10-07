import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useGlobalLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoSizeDashboard, setLogoSizeDashboard] = useState<string>('md')
  const [logoSizeLogin, setLogoSizeLogin] = useState<string>('lg')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadGlobalLogo()

    // Escuchar eventos de actualización de logo
    const handleLogoUpdate = (event: CustomEvent) => {
      setLogoUrl(event.detail.logoUrl)
    }

    window.addEventListener('logoUpdated', handleLogoUpdate as EventListener)
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate as EventListener)
    }
  }, [])

  const loadGlobalLogo = async () => {
    try {
      console.log('🔄 useGlobalLogo: Iniciando carga de logo...')
      setLoading(true)
      
      // 1. Buscar configuración activa
      const { data: activeConfig, error: configError } = await supabase
        .from('style_configurations')
        .select('id')
        .eq('is_active', true)
        .single()

      if (configError || !activeConfig) {
        console.log('❌ useGlobalLogo: No hay configuración activa', configError?.message)
        setLogoUrl(null)
        return
      }

      console.log('✅ useGlobalLogo: Configuración activa encontrada:', activeConfig.id)

      // Usar valores por defecto para los tamaños de logo
      // (Los campos no existen en la tabla aún)
      setLogoSizeDashboard('md')
      setLogoSizeLogin('lg')

      // 2. Buscar logo en branding assets
      const { data: logoAsset, error: assetError } = await supabase
        .from('branding_assets')
        .select('file_url')
        .eq('style_configuration_id', activeConfig.id)
        .eq('asset_type', 'logo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (assetError || !logoAsset) {
        console.log('❌ useGlobalLogo: No hay logo de branding', assetError?.message)
        setLogoUrl(null)
        return
      }

      console.log('✅ useGlobalLogo: Logo encontrado:', logoAsset.file_url)
      setLogoUrl(logoAsset.file_url)
    } catch (error) {
      console.error('❌ useGlobalLogo: Error loading global logo:', error)
      setLogoUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const updateLogo = (newLogoUrl: string | null) => {
    setLogoUrl(newLogoUrl)
  }

  const updateLogoSize = async (context: 'dashboard' | 'login', size: string) => {
    try {
      console.log(`🔄 Actualizando tamaño de logo ${context} a:`, size)
      
      // Buscar configuración activa
      const { data: activeConfig, error: configError } = await supabase
        .from('style_configurations')
        .select('id')
        .eq('is_active', true)
        .single()

      if (configError || !activeConfig) {
        console.error('❌ No hay configuración activa')
        return
      }

      // Actualizar el tamaño en la base de datos
      const fieldName = context === 'dashboard' ? 'logo_size_dashboard' : 'logo_size_login'
      const { error: updateError } = await supabase
        .from('style_configurations')
        .update({ 
          [fieldName]: size,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConfig.id)

      if (updateError) {
        console.error('❌ Error actualizando tamaño:', updateError)
        return
      }

      // Actualizar estado local
      if (context === 'dashboard') {
        setLogoSizeDashboard(size)
      } else {
        setLogoSizeLogin(size)
      }

      console.log('✅ Tamaño de logo actualizado')
    } catch (error) {
      console.error('❌ Error updating logo size:', error)
    }
  }

  return {
    logoUrl,
    logoSizeDashboard,
    logoSizeLogin,
    loading,
    updateLogo,
    updateLogoSize,
    refreshLogo: loadGlobalLogo
  }
}
