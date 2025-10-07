'use client'

import { UserDebugInfo } from '@/components/debug/UserDebugInfo'

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Debug - Información del Usuario
        </h1>
        <p className="text-gray-600">
          Esta página muestra información detallada del usuario actual para debugging.
          Úsala para verificar el rol y permisos del usuario.
        </p>
      </div>

      <UserDebugInfo />

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">🔧 Instrucciones para corregir el problema:</h3>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. Verifica que tu rol sea "super_admin" en la sección "Perfil de Usuario"</li>
          <li>2. Si ves "admin" en lugar de "super_admin", ejecuta el script FIX_USER_ROLE.sql en Supabase</li>
          <li>3. Verifica que los permisos estén cargados correctamente en la sección "Permisos del Usuario"</li>
          <li>4. Prueba los permisos en la sección "Pruebas de Permisos"</li>
          <li>5. Si es necesario, haz logout y login nuevamente</li>
        </ol>
      </div>
    </div>
  )
}