'use client'

import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Camera, CheckSquare, Square } from 'lucide-react'
import type { ReportPhoto } from '@/lib/reports/report-photos'

interface ReportPhotoCuratorProps {
  photos: ReportPhoto[]
  onChange: (photos: ReportPhoto[]) => void
  disabled?: boolean
}

function sortPhotos(photos: ReportPhoto[]): ReportPhoto[] {
  return [...photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

function renumber(photos: ReportPhoto[]): ReportPhoto[] {
  return photos.map((photo, index) => ({ ...photo, sort_order: index }))
}

function formatTakenAt(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Curaduría de fotos del informe quincenal: el residente decide qué fotos
 * de las bitácoras/documentos del período van al informe, en qué orden y
 * con qué pie. No hay límite de cantidad.
 */
export function ReportPhotoCurator({ photos, onChange, disabled = false }: ReportPhotoCuratorProps) {
  const ordered = useMemo(() => sortPhotos(photos), [photos])
  const includedCount = ordered.filter((photo) => photo.included !== false).length

  const update = (next: ReportPhoto[]) => onChange(renumber(next))

  const toggle = (index: number) => {
    const next = [...ordered]
    next[index] = { ...next[index], included: next[index].included === false }
    update(next)
  }

  const setCaption = (index: number, caption: string) => {
    const next = [...ordered]
    next[index] = { ...next[index], caption }
    update(next)
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  const setAll = (included: boolean) => {
    update(ordered.map((photo) => ({ ...photo, included })))
  }

  if (ordered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        <Camera className="mx-auto mb-2 h-6 w-6 text-gray-400" />
        No hay fotos en las bitácoras ni documentos del período. Genera el informe para recopilarlas.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-gray-600">
          <span className="font-medium text-gray-900">{includedCount}</span> de {ordered.length} fotos irán al informe
        </p>
        {!disabled && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setAll(true)} className="text-blue-600 hover:underline">
              Incluir todas
            </button>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={() => setAll(false)} className="text-blue-600 hover:underline">
              Excluir todas
            </button>
          </div>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((photo, index) => {
          const included = photo.included !== false
          return (
            <li
              key={photo.file_url}
              className={`flex flex-col rounded-lg border bg-white p-2 ${included ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.file_url}
                  alt={photo.caption || `Foto ${index + 1}`}
                  className="h-36 w-full rounded object-cover"
                  loading="lazy"
                />
                <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  {included ? `Foto ${ordered.slice(0, index).filter((p) => p.included !== false).length + 1}` : 'Excluida'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {photo.source_type === 'daily_log' ? 'Bitácora' : 'Documento'}
                  {photo.taken_at ? ` · ${formatTakenAt(photo.taken_at)}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Subir"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === ordered.length - 1}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Bajar"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    disabled={disabled}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                    aria-label={included ? 'Excluir del informe' : 'Incluir en el informe'}
                  >
                    {included ? (
                      <CheckSquare className="h-4 w-4 text-green-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={photo.caption || ''}
                onChange={(event) => setCaption(index, event.target.value)}
                disabled={disabled}
                placeholder="Pie de foto"
                className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
