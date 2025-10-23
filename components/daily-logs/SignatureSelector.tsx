'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'

interface SignatureData {
  user_id: string
  user_name: string
  user_role: string
  signature_url: string
  signed_at: string
}

interface SignatureSelectorProps {
  projectId: string
  signatures: SignatureData[]
  onChange: (signatures: SignatureData[]) => void
}

export function SignatureSelector({ projectId, signatures, onChange }: SignatureSelectorProps) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProjectUsers()
  }, [projectId])

  async function loadProjectUsers() {
    try {
      setLoading(true)
      
      // Obtener usuarios del proyecto que tengan firma
      const { data, error } = await supabase
        .from('project_team')
        .select(`
          user_id,
          role,
          profiles!inner(
            id,
            full_name,
            email,
            role,
            signature_url
          )
        `)
        .eq('project_id', projectId)
        .not('profiles.signature_url', 'is', null)

      if (error) throw error

      const users = data?.map((item: any) => {
        const profile = item.profiles
        return {
          id: profile.id,
          name: profile.full_name || profile.email,
          role: profile.role,
          signature_url: profile.signature_url
        }
      }) || []

      setAvailableUsers(users)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSignature = (user: any) => {
    const newSignature: SignatureData = {
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      signature_url: user.signature_url,
      signed_at: new Date().toISOString()
    }
    onChange([...signatures, newSignature])
  }

  const removeSignature = (userId: string) => {
    onChange(signatures.filter(sig => sig.user_id !== userId))
  }

  const isUserSigned = (userId: string) => {
    return signatures.some(sig => sig.user_id === userId)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando usuarios...</div>
  }

  return (
    <div className="space-y-4">
      {/* Firmas agregadas */}
      {signatures.length > 0 && (
        <div className="space-y-2">
          <Label>Firmas Agregadas ({signatures.length})</Label>
          <div className="grid gap-2">
            {signatures.map((sig) => (
              <Card key={sig.user_id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {sig.signature_url && (
                      <img 
                        src={sig.signature_url} 
                        alt={`Firma de ${sig.user_name}`}
                        className="h-16 w-32 object-contain border rounded bg-white"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sig.user_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{sig.user_role}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(sig.signed_at).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSignature(sig.user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Usuarios disponibles para firmar */}
      {availableUsers.length > 0 && (
        <div className="space-y-2">
          <Label>Agregar Firma</Label>
          <div className="grid gap-2">
            {availableUsers
              .filter(user => !isUserSigned(user.id))
              .map((user) => (
                <Card key={user.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addSignature(user)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {user.signature_url && (
                        <img 
                          src={user.signature_url} 
                          alt={`Firma de ${user.name}`}
                          className="h-12 w-24 object-contain border rounded bg-white"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {availableUsers.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No hay usuarios con firma disponibles en este proyecto.
          <br />
          Los usuarios deben subir su firma en su perfil primero.
        </div>
      )}
    </div>
  )
}
