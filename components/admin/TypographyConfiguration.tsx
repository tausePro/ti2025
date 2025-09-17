'use client'

import { useState } from 'react'
import { StyleConfiguration } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Type, RefreshCw } from 'lucide-react'

interface TypographyConfigurationProps {
  configuration: StyleConfiguration
  onUpdate: (updates: Partial<StyleConfiguration>) => void
}

const fontFamilies = [
  { value: 'Inter', label: 'Inter (Recomendado)' },
  { value: 'system-ui', label: 'System UI' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' }
]

const fontWeights = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
  { value: '900', label: 'Black (900)' }
]

const fontSizes = [
  { value: '12px', label: '12px (Muy pequeño)' },
  { value: '14px', label: '14px (Pequeño)' },
  { value: '16px', label: '16px (Normal)' },
  { value: '18px', label: '18px (Mediano)' },
  { value: '20px', label: '20px (Grande)' },
  { value: '24px', label: '24px (Muy grande)' }
]

export function TypographyConfiguration({ configuration, onUpdate }: TypographyConfigurationProps) {
  const [typography, setTypography] = useState({
    fontFamily: configuration.font_family,
    fontSizeBase: configuration.font_size_base,
    fontWeightNormal: configuration.font_weight_normal,
    fontWeightMedium: configuration.font_weight_medium,
    fontWeightSemibold: configuration.font_weight_semibold,
    fontWeightBold: configuration.font_weight_bold
  })

  const handleTypographyChange = (key: string, value: string) => {
    const newTypography = { ...typography, [key]: value }
    setTypography(newTypography)
    
    // Actualizar configuración
    const updates: Partial<StyleConfiguration> = {}
    switch (key) {
      case 'fontFamily':
        updates.font_family = value
        break
      case 'fontSizeBase':
        updates.font_size_base = value
        break
      case 'fontWeightNormal':
        updates.font_weight_normal = value
        break
      case 'fontWeightMedium':
        updates.font_weight_medium = value
        break
      case 'fontWeightSemibold':
        updates.font_weight_semibold = value
        break
      case 'fontWeightBold':
        updates.font_weight_bold = value
        break
    }
    
    onUpdate(updates)
  }

  const resetToDefault = () => {
    const defaultTypography = {
      fontFamily: 'Inter',
      fontSizeBase: '16px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightSemibold: '600',
      fontWeightBold: '700'
    }
    setTypography(defaultTypography)
    onUpdate({
      font_family: defaultTypography.fontFamily,
      font_size_base: defaultTypography.fontSizeBase,
      font_weight_normal: defaultTypography.fontWeightNormal,
      font_weight_medium: defaultTypography.fontWeightMedium,
      font_weight_semibold: defaultTypography.fontWeightSemibold,
      font_weight_bold: defaultTypography.fontWeightBold
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Type className="h-5 w-5 mr-2" />
            Configuración de Tipografía
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Personaliza las fuentes y estilos de texto de la aplicación
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefault}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar por Defecto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuración básica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración Básica</CardTitle>
            <CardDescription>
              Fuente principal y tamaño base del texto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Familia de Fuente</Label>
              <Select
                value={typography.fontFamily}
                onValueChange={(value) => handleTypographyChange('fontFamily', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente" />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSizeBase">Tamaño Base</Label>
              <Select
                value={typography.fontSizeBase}
                onValueChange={(value) => handleTypographyChange('fontSizeBase', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tamaño" />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pesos de fuente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesos de Fuente</CardTitle>
            <CardDescription>
              Configura los diferentes pesos de fuente utilizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fontWeightNormal">Normal</Label>
              <Select
                value={typography.fontWeightNormal}
                onValueChange={(value) => handleTypographyChange('fontWeightNormal', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar peso" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontWeightMedium">Medium</Label>
              <Select
                value={typography.fontWeightMedium}
                onValueChange={(value) => handleTypographyChange('fontWeightMedium', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar peso" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontWeightSemibold">Semi Bold</Label>
              <Select
                value={typography.fontWeightSemibold}
                onValueChange={(value) => handleTypographyChange('fontWeightSemibold', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar peso" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontWeightBold">Bold</Label>
              <Select
                value={typography.fontWeightBold}
                onValueChange={(value) => handleTypographyChange('fontWeightBold', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar peso" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      {weight.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vista previa de tipografía */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa de Tipografía</CardTitle>
          <CardDescription>
            Cómo se ve el texto con la configuración actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="space-y-4"
            style={{ 
              fontFamily: typography.fontFamily,
              fontSize: typography.fontSizeBase
            }}
          >
            <div>
              <h1 
                className="text-4xl font-bold mb-2"
                style={{ fontWeight: typography.fontWeightBold }}
              >
                Título Principal
              </h1>
              <p className="text-gray-600">
                Este es un ejemplo de texto con la configuración actual de tipografía.
              </p>
            </div>

            <Separator />

            <div>
              <h2 
                className="text-2xl font-semibold mb-2"
                style={{ fontWeight: typography.fontWeightSemibold }}
              >
                Título Secundario
              </h2>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>

            <Separator />

            <div>
              <h3 
                className="text-lg font-medium mb-2"
                style={{ fontWeight: typography.fontWeightMedium }}
              >
                Título Terciario
              </h3>
              <p className="text-gray-600">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                <strong style={{ fontWeight: typography.fontWeightBold }}>Texto en negrita:</strong> Este es un ejemplo de texto en negrita.
              </p>
              <p className="text-sm text-gray-500">
                <em>Texto en cursiva:</em> Este es un ejemplo de texto en cursiva.
              </p>
              <p className="text-sm text-gray-500">
                <u>Texto subrayado:</u> Este es un ejemplo de texto subrayado.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Tarjeta de Ejemplo</h4>
                <p className="text-sm text-gray-600">
                  Este es un ejemplo de cómo se ve el texto dentro de una tarjeta.
                </p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium mb-2">Tarjeta con Fondo</h4>
                <p className="text-sm text-gray-600">
                  Este es un ejemplo de texto en una tarjeta con fondo gris.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
