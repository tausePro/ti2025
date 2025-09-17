'use client'

import { useState } from 'react'
import { StyleConfiguration } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Type, RefreshCw } from 'lucide-react'

interface TypographyConfigurationProps {
  configuration: StyleConfiguration | null
  onUpdate: (updates: Partial<StyleConfiguration>) => void
}

export function TypographyConfiguration({ configuration, onUpdate }: TypographyConfigurationProps) {
  if (!configuration) return null

  const handleInputChange = (field: keyof StyleConfiguration, value: string) => {
    onUpdate({ [field]: value })
  }

  const resetToDefault = () => {
    onUpdate({
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
  }

  const fontFamilies = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Nunito', label: 'Nunito' }
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
    { value: '14px', label: 'Pequeño (14px)' },
    { value: '16px', label: 'Normal (16px)' },
    { value: '18px', label: 'Grande (18px)' },
    { value: '20px', label: 'Extra Grande (20px)' }
  ]

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
        <button
          onClick={resetToDefault}
          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar por Defecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuente principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fuente Principal</CardTitle>
            <CardDescription>
              Fuente base para toda la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font_family">Familia de Fuente</Label>
              <Select
                value={configuration.font_family}
                onValueChange={(value) => handleInputChange('font_family', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fuente" />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="font_size_base">Tamaño Base</Label>
              <Select
                value={configuration.font_size_base}
                onValueChange={(value) => handleInputChange('font_size_base', value)}
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
              Configura los diferentes pesos de fuente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font_weight_normal">Peso Normal</Label>
              <Select
                value={configuration.font_weight_normal}
                onValueChange={(value) => handleInputChange('font_weight_normal', value)}
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
              <Label htmlFor="font_weight_medium">Peso Medium</Label>
              <Select
                value={configuration.font_weight_medium}
                onValueChange={(value) => handleInputChange('font_weight_medium', value)}
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
              <Label htmlFor="font_weight_semibold">Peso Semi Bold</Label>
              <Select
                value={configuration.font_weight_semibold}
                onValueChange={(value) => handleInputChange('font_weight_semibold', value)}
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
              <Label htmlFor="font_weight_bold">Peso Bold</Label>
              <Select
                value={configuration.font_weight_bold}
                onValueChange={(value) => handleInputChange('font_weight_bold', value)}
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

        {/* Espaciado y bordes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Espaciado y Bordes</CardTitle>
            <CardDescription>
              Configura el espaciado y radio de bordes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="border_radius">Radio de Bordes</Label>
              <Input
                id="border_radius"
                value={configuration.border_radius}
                onChange={(e) => handleInputChange('border_radius', e.target.value)}
                placeholder="0.5rem"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spacing_unit">Unidad de Espaciado</Label>
              <Input
                id="spacing_unit"
                value={configuration.spacing_unit}
                onChange={(e) => handleInputChange('spacing_unit', e.target.value)}
                placeholder="0.25rem"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sombras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sombras</CardTitle>
            <CardDescription>
              Configura las sombras de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shadow_sm">Sombra Pequeña</Label>
              <Input
                id="shadow_sm"
                value={configuration.shadow_sm}
                onChange={(e) => handleInputChange('shadow_sm', e.target.value)}
                placeholder="0 1px 2px 0 rgb(0 0 0 / 0.05)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shadow_md">Sombra Mediana</Label>
              <Input
                id="shadow_md"
                value={configuration.shadow_md}
                onChange={(e) => handleInputChange('shadow_md', e.target.value)}
                placeholder="0 4px 6px -1px rgb(0 0 0 / 0.1)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shadow_lg">Sombra Grande</Label>
              <Input
                id="shadow_lg"
                value={configuration.shadow_lg}
                onChange={(e) => handleInputChange('shadow_lg', e.target.value)}
                placeholder="0 10px 15px -3px rgb(0 0 0 / 0.1)"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview de tipografía */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa</CardTitle>
          <CardDescription>
            Cómo se ve la tipografía aplicada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="space-y-4 p-6 border rounded-lg"
            style={{
              fontFamily: configuration.font_family,
              fontSize: configuration.font_size_base
            }}
          >
            <h1 
              className="text-4xl font-bold"
              style={{ fontWeight: configuration.font_weight_bold }}
            >
              Título Principal
            </h1>
            <h2 
              className="text-2xl font-semibold"
              style={{ fontWeight: configuration.font_weight_semibold }}
            >
              Título Secundario
            </h2>
            <h3 
              className="text-xl font-medium"
              style={{ fontWeight: configuration.font_weight_medium }}
            >
              Título Terciario
            </h3>
            <p className="text-base">
              Este es un párrafo de ejemplo que muestra cómo se ve el texto normal con la fuente seleccionada. 
              Incluye <strong>texto en negrita</strong> y <em>texto en cursiva</em> para demostrar los diferentes estilos.
            </p>
            <div className="flex space-x-4">
              <button 
                className="px-4 py-2 rounded text-white"
                style={{ 
                  backgroundColor: configuration.primary_color,
                  borderRadius: configuration.border_radius
                }}
              >
                Botón Primario
              </button>
              <button 
                className="px-4 py-2 border rounded"
                style={{ 
                  borderColor: configuration.border_color,
                  borderRadius: configuration.border_radius
                }}
              >
                Botón Secundario
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}