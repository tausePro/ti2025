'use client'

import { useState } from 'react'
import { StyleConfiguration, BrandingAsset } from '@/types'
import { useGlobalLogo } from '@/hooks/useGlobalLogo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Image, Upload, Trash2, Building2 } from 'lucide-react'

interface BrandingConfigurationProps {
  configuration: StyleConfiguration | null
  assets: BrandingAsset[]
  onUpload: (configId: string, file: File, assetType: BrandingAsset['asset_type']) => Promise<BrandingAsset>
  onUpdate: (updates: Partial<StyleConfiguration>) => void
}

export function BrandingConfiguration({ configuration, assets, onUpload, onUpdate }: BrandingConfigurationProps) {
  const [uploading, setUploading] = useState(false)
  const { logoSizeDashboard, logoSizeLogin, updateLogoSize } = useGlobalLogo()

  if (!configuration) return null

  const handleFileUpload = async (file: File, assetType: BrandingAsset['asset_type']) => {
    setUploading(true)
    try {
      await onUpload(configuration.id, file, assetType)
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (field: keyof StyleConfiguration, value: string) => {
    onUpdate({ [field]: value })
  }

  const getAssetByType = (type: BrandingAsset['asset_type']) => {
    return assets.find(asset => asset.asset_type === type)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Configuración de Branding
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Personaliza el logo, favicon y elementos de marca de la aplicación
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de la empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de la Empresa</CardTitle>
            <CardDescription>
              Datos básicos de la empresa para personalización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nombre de la Empresa</Label>
              <Input
                id="company_name"
                value={configuration.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Mi Empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_slogan">Slogan</Label>
              <Input
                id="company_slogan"
                value={configuration.company_slogan || ''}
                onChange={(e) => handleInputChange('company_slogan', e.target.value)}
                placeholder="Slogan de la empresa"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo Principal</CardTitle>
            <CardDescription>
              Logo que aparecerá en la aplicación
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
                  <div>
                    <p className="text-sm font-medium">{getAssetByType('logo')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('logo')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Cambiar Logo'}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-3">No hay logo cargado</p>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Logo'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración de tamaño del logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tamaño del Logo</CardTitle>
            <CardDescription>
              Configura el tamaño del logo en diferentes partes de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_size_dashboard">Dashboard</Label>
                <Select
                  value={logoSizeDashboard}
                  onValueChange={(value) => {
                    updateLogoSize('dashboard', value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">Extra Pequeño (16px)</SelectItem>
                    <SelectItem value="sm">Pequeño (24px)</SelectItem>
                    <SelectItem value="md">Mediano (32px)</SelectItem>
                    <SelectItem value="lg">Grande (48px)</SelectItem>
                    <SelectItem value="xl">Extra Grande (64px)</SelectItem>
                    <SelectItem value="2xl">Muy Grande (80px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_size_login">Login</Label>
                <Select
                  value={logoSizeLogin}
                  onValueChange={(value) => {
                    updateLogoSize('login', value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">Extra Pequeño (16px)</SelectItem>
                    <SelectItem value="sm">Pequeño (24px)</SelectItem>
                    <SelectItem value="md">Mediano (32px)</SelectItem>
                    <SelectItem value="lg">Grande (48px)</SelectItem>
                    <SelectItem value="xl">Extra Grande (64px)</SelectItem>
                    <SelectItem value="2xl">Muy Grande (80px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              💡 Los cambios se aplicarán inmediatamente en la aplicación
            </div>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Favicon</CardTitle>
            <CardDescription>
              Icono que aparecerá en la pestaña del navegador
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
                  <div>
                    <p className="text-sm font-medium">{getAssetByType('favicon')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('favicon')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Cambiar Favicon'}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-3">No hay favicon cargado</p>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Favicon'}
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
              Imagen de banner para la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getAssetByType('banner') ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={getAssetByType('banner')?.file_url}
                    alt="Banner actual"
                    className="h-16 w-auto object-contain border rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{getAssetByType('banner')?.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {(getAssetByType('banner')?.file_size || 0) / 1024} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Cambiar Banner'}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-3">No hay banner cargado</p>
                <Button
                  variant="outline"
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
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Subiendo...' : 'Subir Banner'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}