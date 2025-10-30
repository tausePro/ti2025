'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { 
  Settings, 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  Loader2,
  TrendingUp,
  DollarSign,
  Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AISetting {
  id: string
  provider: string
  api_key: string
  api_key_last_4: string
  model_name: string
  temperature: number
  max_tokens: number
  is_active: boolean
  daily_token_limit: number
  tokens_used_today: number
  system_prompt: string
}

interface UsageStats {
  today: number
  this_week: number
  this_month: number
  estimated_cost_month: number
}

export default function AISettingsPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  
  const [settings, setSettings] = useState<AISetting | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  
  // Form state
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [dailyLimit, setDailyLimit] = useState(100000)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (profile?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }
    loadSettings()
  }, [profile])

  const loadSettings = async () => {
    try {
      setLoading(true)

      // Cargar configuración actual
      const { data: settingsData } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('provider', 'openai')
        .eq('is_active', true)
        .single()

      if (settingsData) {
        setSettings(settingsData)
        setApiKey(settingsData.api_key || '')
        setModelName(settingsData.model_name)
        setTemperature(settingsData.temperature)
        setMaxTokens(settingsData.max_tokens)
        setDailyLimit(settingsData.daily_token_limit)
        setSystemPrompt(settingsData.system_prompt)
        setIsActive(settingsData.is_active)
      } else {
        // Valores por defecto
        setSystemPrompt('Eres un ingeniero civil experto en redacción de informes técnicos de interventoría. Escribe de forma profesional, técnica y detallada.')
      }

      // Cargar estadísticas de uso
      const { data: usageData } = await supabase
        .from('ai_usage_logs')
        .select('tokens_total, estimated_cost, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (usageData) {
        const now = new Date()
        const today = usageData.filter(u => 
          new Date(u.created_at).toDateString() === now.toDateString()
        ).reduce((sum, u) => sum + u.tokens_total, 0)

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const thisWeek = usageData.filter(u => 
          new Date(u.created_at) >= weekAgo
        ).reduce((sum, u) => sum + u.tokens_total, 0)

        const thisMonth = usageData.reduce((sum, u) => sum + u.tokens_total, 0)
        const costMonth = usageData.reduce((sum, u) => sum + (u.estimated_cost || 0), 0)

        setUsageStats({
          today,
          this_week: thisWeek,
          this_month: thisMonth,
          estimated_cost_month: costMonth
        })
      }

    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const last4 = apiKey.slice(-4)

      const settingsData = {
        provider: 'openai',
        api_key: apiKey,
        api_key_last_4: last4,
        model_name: modelName,
        temperature,
        max_tokens: maxTokens,
        daily_token_limit: dailyLimit,
        system_prompt: systemPrompt,
        is_active: isActive,
        updated_by: profile?.id
      }

      if (settings?.id) {
        // Actualizar
        const { error } = await supabase
          .from('ai_settings')
          .update(settingsData)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            ...settingsData,
            created_by: profile?.id
          })

        if (error) throw error
      }

      alert('✅ Configuración guardada exitosamente')
      loadSettings()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert('Error al guardar configuración: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-blue-600" />
          Configuración de IA
        </h1>
        <p className="text-gray-600">Configura la integración con OpenAI para generación automática de contenido</p>
      </div>

      {/* Estadísticas de uso */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Hoy</span>
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {usageStats.today.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">tokens</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Esta semana</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {usageStats.this_week.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">tokens</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Este mes</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {usageStats.this_month.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">tokens</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Costo estimado</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${usageStats.estimated_cost_month.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">este mes</p>
          </div>
        </div>
      )}

      {/* Formulario de configuración */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración de OpenAI</h2>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              API Key de OpenAI *
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {settings?.api_key_last_4 && (
              <p className="text-xs text-gray-500 mt-1">
                Actual: ****{settings.api_key_last_4}
              </p>
            )}
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4o">GPT-4o (Recomendado)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Más económico)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = Más preciso, 1 = Más creativo
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Límite diario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Límite diario de tokens
            </label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Límite de tokens que se pueden usar por día
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt del Sistema
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Instrucciones generales para la IA..."
            />
          </div>

          {/* Estado */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Activar generación con IA
            </label>
          </div>
        </div>

        {/* Botón guardar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• La API key se guarda de forma segura en la base de datos</li>
          <li>• El límite diario ayuda a controlar los costos</li>
          <li>• GPT-4o es el modelo recomendado para informes técnicos</li>
          <li>• Puedes obtener tu API key en: <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">platform.openai.com</a></li>
        </ul>
      </div>
    </div>
  )
}
