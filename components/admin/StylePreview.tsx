'use client'

import { StyleConfiguration } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layout, Eye } from 'lucide-react'

interface StylePreviewProps {
  configuration: StyleConfiguration | null
}

export function StylePreview({ configuration }: StylePreviewProps) {
  if (!configuration) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Vista Previa
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Previsualiza cómo se verá la aplicación con esta configuración
        </p>
      </div>

      <div 
        className="border rounded-lg p-6 space-y-6"
        style={{
          fontFamily: configuration.font_family,
          fontSize: configuration.font_size_base,
          backgroundColor: configuration.background_color,
          color: configuration.foreground_color
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: configuration.primary_color, color: configuration.primary_foreground }}
        >
          <div className="flex items-center space-x-3">
            {configuration.logo_url && (
              <img 
                src={configuration.logo_url} 
                alt="Logo" 
                className="h-8 w-8 object-contain"
              />
            )}
            <h1 className="text-xl font-bold">{configuration.company_name || 'Mi Empresa'}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              style={{ 
                backgroundColor: configuration.secondary_color, 
                color: configuration.secondary_foreground,
                border: `1px solid ${configuration.border_color}`
              }}
            >
              Iniciar Sesión
            </Button>
            <Button 
              size="sm"
              style={{ 
                backgroundColor: configuration.accent_color, 
                color: configuration.accent_foreground
              }}
            >
              Registrarse
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-4">
          <a 
            href="#" 
            className="px-3 py-2 rounded text-sm font-medium"
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              border: `1px solid ${configuration.border_color}`
            }}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className="px-3 py-2 rounded text-sm font-medium"
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              border: `1px solid ${configuration.border_color}`
            }}
          >
            Proyectos
          </a>
          <a 
            href="#" 
            className="px-3 py-2 rounded text-sm font-medium"
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              border: `1px solid ${configuration.border_color}`
            }}
          >
            Reportes
          </a>
        </nav>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              borderColor: configuration.border_color
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg">Proyecto Activo</CardTitle>
              <CardDescription>Descripción del proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progreso</span>
                  <span className="text-sm font-medium">75%</span>
                </div>
                <div 
                  className="w-full rounded-full h-2"
                  style={{ backgroundColor: configuration.input_color }}
                >
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: '75%',
                      backgroundColor: configuration.primary_color
                    }}
                  />
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button 
                    size="sm"
                    style={{ 
                      backgroundColor: configuration.primary_color,
                      color: configuration.primary_foreground
                    }}
                  >
                    Ver Detalles
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    style={{ 
                      borderColor: configuration.border_color,
                      color: configuration.foreground_color
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              borderColor: configuration.border_color
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg">Estadísticas</CardTitle>
              <CardDescription>Resumen del mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Proyectos Completados</span>
                  <Badge 
                    style={{ 
                      backgroundColor: configuration.success_color,
                      color: 'white'
                    }}
                  >
                    12
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">En Progreso</span>
                  <Badge 
                    style={{ 
                      backgroundColor: configuration.info_color,
                      color: 'white'
                    }}
                  >
                    5
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pendientes</span>
                  <Badge 
                    style={{ 
                      backgroundColor: configuration.warning_color,
                      color: 'white'
                    }}
                  >
                    3
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            style={{ 
              backgroundColor: configuration.card_background,
              color: configuration.card_foreground,
              borderColor: configuration.border_color
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg">Formulario</CardTitle>
              <CardDescription>Ejemplo de formulario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preview-name">Nombre</Label>
                  <Input
                    id="preview-name"
                    placeholder="Ingresa tu nombre"
                    style={{
                      backgroundColor: configuration.background_color,
                      borderColor: configuration.input_color,
                      color: configuration.foreground_color
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preview-email">Email</Label>
                  <Input
                    id="preview-email"
                    type="email"
                    placeholder="tu@email.com"
                    style={{
                      backgroundColor: configuration.background_color,
                      borderColor: configuration.input_color,
                      color: configuration.foreground_color
                    }}
                  />
                </div>
                <Button 
                  className="w-full"
                  style={{ 
                    backgroundColor: configuration.primary_color,
                    color: configuration.primary_foreground
                  }}
                >
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: configuration.success_color,
              color: 'white'
            }}
          >
            <div className="font-medium">Éxito</div>
            <div className="text-sm opacity-90">Operación completada exitosamente</div>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: configuration.warning_color,
              color: 'white'
            }}
          >
            <div className="font-medium">Advertencia</div>
            <div className="text-sm opacity-90">Revisa los datos antes de continuar</div>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: configuration.error_color,
              color: 'white'
            }}
          >
            <div className="font-medium">Error</div>
            <div className="text-sm opacity-90">Ha ocurrido un error inesperado</div>
          </div>
        </div>
      </div>
    </div>
  )
}