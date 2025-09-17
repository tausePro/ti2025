'use client'

import { useState } from 'react'
import { StyleConfiguration } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Palette, RefreshCw } from 'lucide-react'

interface ColorConfigurationProps {
  configuration: StyleConfiguration
  onUpdate: (updates: Partial<StyleConfiguration>) => void
}

export function ColorConfiguration({ configuration, onUpdate }: ColorConfigurationProps) {
  const [colors, setColors] = useState({
    primary: configuration.primary_color,
    primaryForeground: configuration.primary_foreground,
    secondary: configuration.secondary_color,
    secondaryForeground: configuration.secondary_foreground,
    accent: configuration.accent_color,
    accentForeground: configuration.accent_foreground,
    success: configuration.success_color,
    warning: configuration.warning_color,
    error: configuration.error_color,
    info: configuration.info_color,
    background: configuration.background_color,
    foreground: configuration.foreground_color,
    card: configuration.card_background,
    cardForeground: configuration.card_foreground,
    border: configuration.border_color,
    input: configuration.input_color,
    ring: configuration.ring_color
  })

  const handleColorChange = (key: string, value: string) => {
    const newColors = { ...colors, [key]: value }
    setColors(newColors)
    
    // Actualizar configuración
    const updates: Partial<StyleConfiguration> = {}
    switch (key) {
      case 'primary':
        updates.primary_color = value
        break
      case 'primaryForeground':
        updates.primary_foreground = value
        break
      case 'secondary':
        updates.secondary_color = value
        break
      case 'secondaryForeground':
        updates.secondary_foreground = value
        break
      case 'accent':
        updates.accent_color = value
        break
      case 'accentForeground':
        updates.accent_foreground = value
        break
      case 'success':
        updates.success_color = value
        break
      case 'warning':
        updates.warning_color = value
        break
      case 'error':
        updates.error_color = value
        break
      case 'info':
        updates.info_color = value
        break
      case 'background':
        updates.background_color = value
        break
      case 'foreground':
        updates.foreground_color = value
        break
      case 'card':
        updates.card_background = value
        break
      case 'cardForeground':
        updates.card_foreground = value
        break
      case 'border':
        updates.border_color = value
        break
      case 'input':
        updates.input_color = value
        break
      case 'ring':
        updates.ring_color = value
        break
    }
    
    onUpdate(updates)
  }

  const resetToDefault = () => {
    const defaultColors = {
      primary: '#000000',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#0f172a'
    }
    setColors(defaultColors)
    onUpdate({
      primary_color: defaultColors.primary,
      primary_foreground: defaultColors.primaryForeground,
      secondary_color: defaultColors.secondary,
      secondary_foreground: defaultColors.secondaryForeground,
      accent_color: defaultColors.accent,
      accent_foreground: defaultColors.accentForeground,
      success_color: defaultColors.success,
      warning_color: defaultColors.warning,
      error_color: defaultColors.error,
      info_color: defaultColors.info,
      background_color: defaultColors.background,
      foreground_color: defaultColors.foreground,
      card_background: defaultColors.card,
      card_foreground: defaultColors.cardForeground,
      border_color: defaultColors.border,
      input_color: defaultColors.input,
      ring_color: defaultColors.ring
    })
  }

  const ColorInput = ({ label, key, value }: { label: string; key: string; value: string }) => (
    <div className="space-y-2">
      <Label htmlFor={key} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center space-x-2">
        <Input
          id={key}
          type="color"
          value={value}
          onChange={(e) => handleColorChange(key, e.target.value)}
          className="w-12 h-10 p-1 border rounded"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => handleColorChange(key, e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Configuración de Colores
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Personaliza los colores principales de la aplicación
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefault}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar por Defecto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colores principales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colores Principales</CardTitle>
            <CardDescription>
              Colores base para botones, enlaces y elementos principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorInput label="Primario" key="primary" value={colors.primary} />
            <ColorInput label="Primario (Texto)" key="primaryForeground" value={colors.primaryForeground} />
            <ColorInput label="Secundario" key="secondary" value={colors.secondary} />
            <ColorInput label="Secundario (Texto)" key="secondaryForeground" value={colors.secondaryForeground} />
            <ColorInput label="Acento" key="accent" value={colors.accent} />
            <ColorInput label="Acento (Texto)" key="accentForeground" value={colors.accentForeground} />
          </CardContent>
        </Card>

        {/* Colores de estado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colores de Estado</CardTitle>
            <CardDescription>
              Colores para mensajes, alertas y estados del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorInput label="Éxito" key="success" value={colors.success} />
            <ColorInput label="Advertencia" key="warning" value={colors.warning} />
            <ColorInput label="Error" key="error" value={colors.error} />
            <ColorInput label="Información" key="info" value={colors.info} />
          </CardContent>
        </Card>

        {/* Colores de fondo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colores de Fondo</CardTitle>
            <CardDescription>
              Colores para fondos y superficies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorInput label="Fondo Principal" key="background" value={colors.background} />
            <ColorInput label="Texto Principal" key="foreground" value={colors.foreground} />
            <ColorInput label="Fondo de Tarjetas" key="card" value={colors.card} />
            <ColorInput label="Texto de Tarjetas" key="cardForeground" value={colors.cardForeground} />
          </CardContent>
        </Card>

        {/* Colores de borde */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colores de Borde</CardTitle>
            <CardDescription>
              Colores para bordes, inputs y elementos de interfaz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorInput label="Borde" key="border" value={colors.border} />
            <ColorInput label="Input" key="input" value={colors.input} />
            <ColorInput label="Ring/Focus" key="ring" value={colors.ring} />
          </CardContent>
        </Card>
      </div>

      {/* Preview de colores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa</CardTitle>
          <CardDescription>
            Cómo se ven los colores aplicados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: colors.primary, 
                color: colors.primaryForeground 
              }}
            >
              <div className="font-medium">Primario</div>
              <div className="text-sm opacity-90">Botón principal</div>
            </div>
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: colors.secondary, 
                color: colors.secondaryForeground 
              }}
            >
              <div className="font-medium">Secundario</div>
              <div className="text-sm opacity-90">Botón secundario</div>
            </div>
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: colors.success, 
                color: 'white' 
              }}
            >
              <div className="font-medium">Éxito</div>
              <div className="text-sm opacity-90">Estado exitoso</div>
            </div>
            <div 
              className="p-4 rounded-lg text-center"
              style={{ 
                backgroundColor: colors.error, 
                color: 'white' 
              }}
            >
              <div className="font-medium">Error</div>
              <div className="text-sm opacity-90">Estado de error</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
