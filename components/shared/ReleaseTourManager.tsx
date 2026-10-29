'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  CURRENT_RELEASE,
  CURRENT_RELEASE_VERSION,
  getReleaseStorageKey,
  getReleaseToastDismissedKey,
  getTourStepsForRole
} from '@/lib/release-notes'

interface ReleaseTourManagerProps {
  userId?: string | null
  userRole?: string | null
}

export function ReleaseTourManager({ userId, userRole }: ReleaseTourManagerProps) {
  const router = useRouter()
  const steps = useMemo(() => getTourStepsForRole(userRole, CURRENT_RELEASE), [userRole])

  const [hasSeenTour, setHasSeenTour] = useState(true)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [swWaitingWorker, setSwWaitingWorker] = useState<ServiceWorker | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const seenKey = useMemo(
    () => getReleaseStorageKey(CURRENT_RELEASE_VERSION, userId),
    [userId]
  )
  const toastDismissedKey = useMemo(
    () => getReleaseToastDismissedKey(CURRENT_RELEASE_VERSION, userId),
    [userId]
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return

    const alreadySeen = window.localStorage.getItem(seenKey) === 'true'
    const toastDismissed = window.localStorage.getItem(toastDismissedKey) === 'true'

    setHasSeenTour(alreadySeen)

    if (!alreadySeen && !toastDismissed) {
      setShowUpdateBanner(true)
      const timer = window.setTimeout(() => {
        toast.info(CURRENT_RELEASE.toastTitle, {
          id: `release-toast-${CURRENT_RELEASE_VERSION}`,
          description: CURRENT_RELEASE.toastDescription,
          duration: 12000,
          action: {
            label: 'Ver tour guiado',
            onClick: () => {
              setCurrentStepIndex(0)
              setTourOpen(true)
              setShowUpdateBanner(false)
            }
          }
        })
      }, 600)

      return () => window.clearTimeout(timer)
    }
  }, [userId, seenKey, toastDismissedKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let isMounted = true

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!isMounted || !registration) return

      if (registration.waiting) {
        setSwWaitingWorker(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwWaitingWorker(newWorker)
            toast.info('Nueva actualización lista para aplicar', {
              id: 'sw-update-ready',
              description: 'Recarga la aplicación para activar la versión más reciente.',
              duration: 15000,
              action: {
                label: 'Actualizar ahora',
                onClick: () => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  window.location.reload()
                }
              }
            })
          }
        })
      })
    })

    return () => {
      isMounted = false
    }
  }, [])

  const currentStep = steps[currentStepIndex] || steps[0]

  useEffect(() => {
    if (typeof document === 'undefined') return

    const allNavLinks = document.querySelectorAll<HTMLElement>('[data-tour-href]')
    allNavLinks.forEach((el) => {
      el.classList.remove(
        'ring-2',
        'ring-talento-green',
        'bg-talento-green/15',
        'text-talento-green'
      )
    })

    if (!tourOpen || !currentStep?.targetNavHref) return

    const matchingLinks = document.querySelectorAll<HTMLElement>(
      `[data-tour-href="${currentStep.targetNavHref}"]`
    )
    matchingLinks.forEach((el) => {
      el.classList.add(
        'ring-2',
        'ring-talento-green',
        'bg-talento-green/15',
        'text-talento-green'
      )
    })

    return () => {
      matchingLinks.forEach((el) => {
        el.classList.remove(
          'ring-2',
          'ring-talento-green',
          'bg-talento-green/15',
          'text-talento-green'
        )
      })
    }
  }, [tourOpen, currentStep])

  const markTourSeen = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(seenKey, 'true')
      window.localStorage.setItem(toastDismissedKey, 'true')
    }
    setHasSeenTour(true)
    setShowUpdateBanner(false)
  }

  const handleDismissBanner = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(toastDismissedKey, 'true')
    }
    setShowUpdateBanner(false)
  }

  const handleStartTour = () => {
    setCurrentStepIndex(0)
    setTourOpen(true)
    setShowUpdateBanner(false)
  }

  const handleCloseTour = (openState: boolean) => {
    setTourOpen(openState)
    if (!openState) {
      markTourSeen()
    }
  }

  const handleFinishTour = () => {
    markTourSeen()
    setTourOpen(false)
    toast.success('Recorrido completado', {
      description: 'Puedes volver a abrir las novedades desde el botón superior cuando quieras.'
    })
  }

  const handleGoToFeature = (href: string) => {
    markTourSeen()
    setTourOpen(false)
    router.push(href)
  }

  const handleApplySwUpdate = () => {
    if (swWaitingWorker) {
      swWaitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  if (!currentStep) return null

  const totalSteps = steps.length
  const progressPct = Math.round(((currentStepIndex + 1) / totalSteps) * 100)

  return (
    <>
      <div className="flex items-center gap-2">
        {swWaitingWorker && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplySwUpdate}
            className="hidden sm:inline-flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            title="Hay una nueva versión lista para recargar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Actualizar app</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleStartTour}
          className="relative inline-flex items-center gap-1.5 border-talento-green/40 bg-talento-green/5 text-gray-800 hover:bg-talento-green/15"
          title="Ver novedades y tour guiado de la versión actual"
          data-testid="open-release-tour-button"
        >
          <Sparkles className="h-4 w-4 text-talento-green" />
          <span className="hidden sm:inline text-xs font-medium">
            Novedades {CURRENT_RELEASE_VERSION}
          </span>
          <span className="sm:hidden text-xs font-medium">{CURRENT_RELEASE_VERSION}</span>
          {!hasSeenTour && (
            <span
              className="flex h-2.5 w-2.5 rounded-full bg-talento-green ring-2 ring-white"
              aria-label="Novedades pendientes por revisar"
            />
          )}
        </Button>
      </div>

      {showUpdateBanner && !tourOpen && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-talento-green/40 bg-white p-4 shadow-xl print:hidden animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-talento-green/15 text-talento-green">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {CURRENT_RELEASE.toastTitle}
                </p>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Cerrar aviso de actualización"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {CURRENT_RELEASE.toastDescription}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleStartTour}
                  className="h-8 bg-talento-green text-white hover:bg-talento-green/90 text-xs"
                >
                  Iniciar tour guiado
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissBanner}
                  className="h-8 text-xs text-gray-600"
                >
                  Más tarde
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={tourOpen} onOpenChange={handleCloseTour}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2">
                <Badge className="bg-talento-green/15 text-talento-green hover:bg-talento-green/20 border-0">
                  {currentStep.moduleBadge}
                </Badge>
                <span className="text-xs font-medium text-gray-500">
                  Versión {currentStep.version}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Paso {currentStepIndex + 1} de {totalSteps}
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-talento-green transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <DialogTitle className="pt-3 text-lg font-semibold text-gray-900">
              {currentStep.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 leading-relaxed">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Qué incluye esta mejora
            </p>
            <ul className="space-y-2">
              {currentStep.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-talento-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'w-6 bg-talento-green'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ir al paso ${index + 1}: ${step.title}`}
              />
            ))}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
            <div>
              {currentStep.ctaHref && currentStep.ctaLabel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGoToFeature(currentStep.ctaHref!)}
                  className="w-full sm:w-auto inline-flex items-center gap-1.5 text-xs"
                >
                  <span>{currentStep.ctaLabel}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              {currentStepIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
              )}

              {currentStepIndex < totalSteps - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))
                  }
                  className="inline-flex items-center gap-1 bg-talento-green text-white hover:bg-talento-green/90 text-xs"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinishTour}
                  className="bg-talento-green text-white hover:bg-talento-green/90 text-xs"
                >
                  Entendido, finalizar
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
