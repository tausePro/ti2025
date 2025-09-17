'use client'

import { useState } from 'react'
import { StyleConfiguration, BrandingAsset } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Image, 
  Upload, 
  Trash2, 
  Eye,
  Building2,
  FileImage
} from 'lucide-react'

interface BrandingConfigurationProps {
  configuration: StyleConfiguration
  assets: BrandingAsset[]
  onUpload: (configId: string, file: File, assetType: BrandingAsset['asset_type']) => Promise<BrandingAsset>
  onUpdate: (updates: Partial<StyleConfiguration>) => void
}

export function BrandingConfiguration({ 
  configuration, 
  assets, 
  onUpload, 
  onUpdate 
}: BrandingConfigurationProps) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (file: File, assetType: BrandingAsset['asset_type']) => {
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Solo se permiten JPG, PNG, SVG y WebP.')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB.')
      return
    }

    setUploading(assetType)
    setError(null)

    try {
      await onUpload(configuration.id, file, assetType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploading(null)
    }
  }

  const getAssetByType = (type: BrandingAsset['asset_type']) => {
    return assets.find(asset => asset.asset_type === type)
  }

  const handleInputChange = (field: keyof StyleConfiguration, value: string) => {
    onUpdate({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Configuración de Branding
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Personaliza la identidad visual de la aplicación
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de la empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de la Empresa</CardTitle>
            <CardDescription>
              Datos básicos que aparecerán en la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nombre de la Empresa</Label>
              <Input
                id="company_name"
                value={configuration.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Ej: Talento Inmobiliario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_slogan">Slogan</Label>
              <Textarea
                id="company_slogan"
                value={configuration.company_slogan || ''}
                onChange={(e) => handleInputChange('company_slogan', e.target.value)}
                placeholder="Ej: Supervisión Técnica Profesional"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo Principal</CardTitle>
            <CardDescription>
              Logo que aparecerá en el header y documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getAssetByType('logo') ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={getAssetByType('logo')?.file_url}
                    alt="Logo actual"
                    className="h-16 w-auto object-contain border rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getAssetByType('logo')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('logo')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getAssetByType('logo')?.file_url, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFileUpload(file, 'logo')
                      }
                      input.click()
                    }}
                    disabled={uploading === 'logo'}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploading === 'logo' ? 'Subiendo...' : 'Cambiar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No hay logo subido</p>
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileUpload(file, 'logo')
                    }
                    input.click()
                  }}
                  disabled={uploading === 'logo'}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploading === 'logo' ? 'Subiendo...' : 'Subir Logo'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Favicon</CardTitle>
            <CardDescription>
              Icono que aparece en la pestaña del navegador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getAssetByType('favicon') ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={getAssetByType('favicon')?.file_url}
                    alt="Favicon actual"
                    className="h-8 w-8 object-contain border rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getAssetByType('favicon')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('favicon')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getAssetByType('favicon')?.file_url, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFileUpload(file, 'favicon')
                      }
                      input.click()
                    }}
                    disabled={uploading === 'favicon'}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploading === 'favicon' ? 'Subiendo...' : 'Cambiar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No hay favicon subido</p>
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileUpload(file, 'favicon')
                    }
                    input.click()
                  }}
                  disabled={uploading === 'favicon'}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploading === 'favicon' ? 'Subiendo...' : 'Subir Favicon'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Banner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Banner</CardTitle>
            <CardDescription>
              Imagen de cabecera para páginas especiales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getAssetByType('banner') ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={getAssetByType('banner')?.file_url}
                    alt="Banner actual"
                    className="h-16 w-32 object-cover border rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getAssetByType('banner')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('banner')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getAssetByType('banner')?.file_url, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFileUpload(file, 'banner')
                      }
                      input.click()
                    }}
                    disabled={uploading === 'banner'}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploading === 'banner' ? 'Subiendo...' : 'Cambiar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No hay banner subido</p>
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileUpload(file, 'banner')
                    }
                    input.click()
                  }}
                  disabled={uploading === 'banner'}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploading === 'banner' ? 'Subiendo...' : 'Subir Banner'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assets existentes */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assets Subidos</CardTitle>
            <CardDescription>
              Todos los archivos de branding subidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src={asset.file_url}
                      alt={asset.alt_text || asset.file_name}
                      className="h-8 w-8 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {asset.asset_type} • {(asset.file_size || 0) / 1024} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(asset.file_url, '_blank')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('¿Eliminar este asset?')) {
                          // Aquí se implementaría la eliminación
                          console.log('Delete asset:', asset.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
