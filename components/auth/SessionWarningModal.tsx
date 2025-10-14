'use client'

import { useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Clock } from 'lucide-react'

interface SessionWarningModalProps {
  open: boolean
  timeRemaining: number
  onContinue: () => void
}

export function SessionWarningModal({ open, timeRemaining, onContinue }: SessionWarningModalProps) {
  const minutes = Math.floor(timeRemaining / 60000)
  const seconds = Math.floor((timeRemaining % 60000) / 1000)

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Tu sesión está por expirar
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Por seguridad, tu sesión se cerrará automáticamente por inactividad.
            </p>
            <p className="text-lg font-semibold text-orange-600">
              Tiempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-gray-600">
              Haz clic en "Continuar" para mantener tu sesión activa.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinue}>
            Continuar Sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
