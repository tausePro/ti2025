'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useStyleConfiguration } from '@/hooks/useStyleConfiguration'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Palette, 
  Upload, 
  Save, 
  Eye, 
  Trash2, 
  Plus,
  Settings,
  Image,
  Type,
  Layout
} from 'lucide-react'
import { ColorConfiguration } from '@/components/admin/ColorConfiguration'
import { BrandingConfiguration } from '@/components/admin/BrandingConfiguration'
import { TypographyConfiguration } from '@/components/admin/TypographyConfiguration'
import { StylePreview } from '@/components/admin/StylePreview'

export default function StyleConfigPage() {
  const { profile, signOut } = useAuth()
  const {
    configurations,
    activeConfiguration,
    brandingAssets,
    loading,
    error,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    uploadBrandingAsset,
    activateConfiguration
  } = useStyleConfiguration()

  const [selectedConfig, setSelectedConfig] = useState<string | null>(activeConfiguration?.id || null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<StyleConfiguration | null>(null)

  const handleCreateNew = async () => {
    setIsCreating(true)
    try {
      const newConfig = await createConfiguration({
        name: 'Nueva Configuración',
        description: 'Configuración personalizada',
        is_active: false,
        is_default: false,
        primary_color: '#000000',
        primary_foreground: '#ffffff',
        secondary_color: '#f1f5f9',
        secondary_foreground: '#0f172a',
        accent_color: '#f1f5f9',
        accent_foreground: '#0f172a',
        success_color: '#22c55e',
        warning_color: '#f59e0b',
        error_color: '#ef4444',
        info_color: '#3b82f6',
        background_color: '#ffffff',
        foreground_color: '#0f172a',
        card_background: '#ffffff',
        card_foreground: '#0f172a',
        border_color: '#e2e8f0',
        input_color: '#e2e8f0',
        ring_color: '#0f172a',
        company_name: 'Mi Empresa',
        company_slogan: 'Slogan de la empresa',
        font_family: 'Inter',
        font_size_base: '16px',
        font_weight_normal: '400',
        font_weight_medium: '500',
        font_weight_semibold: '600',
        font_weight_bold: '700',
        border_radius: '0.5rem',
        spacing_unit: '0.25rem',
        shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      })
      setSelectedConfig(newConfig.id)
    } catch (error) {
      console.error('Error creating configuration:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSave = async () => {
    if (!selectedConfig || !currentConfig) return
    
    setIsSaving(true)
    try {
      await updateConfiguration(selectedConfig, currentConfig)
      console.log('Configuration saved successfully')
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfigUpdate = (updates: Partial<StyleConfiguration>) => {
    if (currentConfig) {
      const updatedConfig = { ...currentConfig, ...updates }
      setCurrentConfig(updatedConfig)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await activateConfiguration(id)
      setSelectedConfig(id)
    } catch (error) {
      console.error('Error activating configuration:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración?')) return
    
    try {
      await deleteConfiguration(id)
      if (selectedConfig === id) {
        setSelectedConfig(null)
      }
    } catch (error) {
      console.error('Error deleting configuration:', error)
    }
  }

  // Actualizar currentConfig cuando cambie selectedConfig
  React.useEffect(() => {
    const config = configurations.find(config => config.id === selectedConfig)
    setCurrentConfig(config || null)
  }, [selectedConfig, configurations])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administración de Estilos</h1>
          <p className="text-gray-600 mt-2">
            Personaliza la apariencia y branding de la aplicación
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreateNew} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? 'Creando...' : 'Nueva Configuración'}
          </Button>
          {currentConfig && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={signOut}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            🚪 Logout
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            🔄 Recargar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Debug info */}
      {profile && (
        <Alert>
          <AlertDescription>
            <strong>Debug Info:</strong> Usuario: {profile.email} | Rol: {profile.role} | 
            {profile.role === 'super_admin' ? ' ✅ Puede editar' : ' ❌ No puede editar'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de configuraciones */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuraciones
              </CardTitle>
              <CardDescription>
                Selecciona una configuración para editarla
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConfig === config.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedConfig(config.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-500">{config.description}</p>
                      {config.is_active && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mt-1">
                          Activa
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {!config.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivate(config.id)
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(config.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Editor de configuración */}
        <div className="lg:col-span-2">
          {currentConfig ? (
            <Tabs defaultValue="colors" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors" className="flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Colores
                </TabsTrigger>
                <TabsTrigger value="branding" className="flex items-center">
                  <Image className="h-4 w-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center">
                  <Type className="h-4 w-4 mr-2" />
                  Tipografía
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center">
                  <Layout className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors">
                <ColorConfiguration
                  configuration={currentConfig}
                  onUpdate={handleConfigUpdate}
                />
              </TabsContent>

              <TabsContent value="branding">
                <BrandingConfiguration
                  configuration={currentConfig}
                  assets={brandingAssets}
                  onUpload={uploadBrandingAsset}
                  onUpdate={handleConfigUpdate}
                />
              </TabsContent>

              <TabsContent value="typography">
                <TypographyConfiguration
                  configuration={currentConfig}
                  onUpdate={handleConfigUpdate}
                />
              </TabsContent>

              <TabsContent value="preview">
                <StylePreview configuration={currentConfig} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecciona una configuración
                </h3>
                <p className="text-gray-500 text-center mb-6">
                  Elige una configuración de la lista para comenzar a editarla, o crea una nueva.
                </p>
                <Button onClick={handleCreateNew} disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Configuración
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
