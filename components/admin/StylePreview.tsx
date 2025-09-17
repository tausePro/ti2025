'use client'

import { StyleConfiguration } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info,
  Star,
  Heart,
  Download,
  Upload,
  Settings
} from 'lucide-react'

interface StylePreviewProps {
  configuration: StyleConfiguration
}

export function StylePreview({ configuration }: StylePreviewProps) {
  const previewStyle = {
    '--primary': configuration.primary_color,
    '--primary-foreground': configuration.primary_foreground,
    '--secondary': configuration.secondary_color,
    '--secondary-foreground': configuration.secondary_foreground,
    '--accent': configuration.accent_color,
    '--accent-foreground': configuration.accent_foreground,
    '--background': configuration.background_color,
    '--foreground': configuration.foreground_color,
    '--card': configuration.card_background,
    '--card-foreground': configuration.card_foreground,
    '--border': configuration.border_color,
    '--input': configuration.input_color,
    '--ring': configuration.ring_color,
    '--success': configuration.success_color,
    '--warning': configuration.warning_color,
    '--error': configuration.error_color,
    '--info': configuration.info_color,
    '--radius': configuration.border_radius,
    '--font-family': configuration.font_family,
    '--font-size-base': configuration.font_size_base
  } as React.CSSProperties

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Vista Previa de Estilos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Cómo se verá la aplicación con esta configuración
        </p>
      </div>

      <div 
        className="p-6 border rounded-lg"
        style={previewStyle}
      >
        {/* Header simulado */}
        <div className="flex items-center justify-between mb-6 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center space-x-3">
            {configuration.logo_url && (
              <img 
                src={configuration.logo_url} 
                alt="Logo" 
                className="h-8 w-auto"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                {configuration.company_name || 'Mi Empresa'}
              </h1>
              {configuration.company_slogan && (
                <p className="text-sm opacity-70" style={{ color: 'var(--foreground)' }}>
                  {configuration.company_slogan}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-1" />
              Configuración
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
          </div>
        </div>

        {/* Contenido de ejemplo */}
        <div className="space-y-6">
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 desde el mes pasado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  +15% desde el mes pasado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% desde el mes pasado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Botones de ejemplo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Botones</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Botón Primario</Button>
              <Button variant="secondary">Botón Secundario</Button>
              <Button variant="outline">Botón Outline</Button>
              <Button variant="ghost">Botón Ghost</Button>
              <Button variant="destructive">Botón Destructivo</Button>
            </div>
          </div>

          {/* Badges de ejemplo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          {/* Alertas de ejemplo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alertas</h3>
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta es una alerta de éxito con el color configurado.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta es una alerta de error con el color configurado.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Formulario de ejemplo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Formulario</h3>
            <Card>
              <CardHeader>
                <CardTitle>Ejemplo de Formulario</CardTitle>
                <CardDescription>
                  Este es un ejemplo de cómo se ven los formularios con la configuración actual.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Ingresa tu nombre"
                      className="w-full px-3 py-2 border rounded-md"
                      style={{ 
                        borderColor: 'var(--input)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <input 
                      type="email" 
                      placeholder="tu@email.com"
                      className="w-full px-3 py-2 border rounded-md"
                      style={{ 
                        borderColor: 'var(--input)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mensaje</label>
                  <textarea 
                    placeholder="Escribe tu mensaje aquí..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{ 
                      borderColor: 'var(--input)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)'
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Enviar</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Iconos de ejemplo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Iconos</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Star className="h-4 w-4" />
                <span className="text-sm">Favorito</span>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Heart className="h-4 w-4" />
                <span className="text-sm">Me gusta</span>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Subir</span>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Download className="h-4 w-4" />
                <span className="text-sm">Descargar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información de la configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de la Configuración</CardTitle>
          <CardDescription>
            Detalles de la configuración actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Colores Principales</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: configuration.primary_color }}
                  />
                  <span>Primario: {configuration.primary_color}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: configuration.secondary_color }}
                  />
                  <span>Secundario: {configuration.secondary_color}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: configuration.accent_color }}
                  />
                  <span>Acento: {configuration.accent_color}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tipografía</h4>
              <div className="space-y-1">
                <div>Fuente: {configuration.font_family}</div>
                <div>Tamaño base: {configuration.font_size_base}</div>
                <div>Radio de borde: {configuration.border_radius}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
