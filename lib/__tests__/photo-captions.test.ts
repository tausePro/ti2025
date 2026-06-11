import { describe, it, expect } from 'vitest'
import { getPhotoCaptions } from '@/lib/photo-captions'

describe('getPhotoCaptions', () => {
  it('devuelve captions desde un array de strings', () => {
    expect(getPhotoCaptions(['una', 'dos'], 2)).toEqual(['una', 'dos'])
  })

  it('rellena con vacío hasta el total de fotos', () => {
    expect(getPhotoCaptions(['una'], 3)).toEqual(['una', '', ''])
  })

  it('parsea un string JSON de array', () => {
    expect(getPhotoCaptions('["a","b"]', 2)).toEqual(['a', 'b'])
  })

  it('parsea strings separados por coma', () => {
    expect(getPhotoCaptions('a, b, c', 3)).toEqual(['a', 'b', 'c'])
  })

  it('devuelve vacíos si el JSON es inválido', () => {
    expect(getPhotoCaptions('[invalid', 2)).toEqual(['', ''])
  })

  it('extrae caption de objetos de foto como fallback', () => {
    const photos = [
      { caption: 'desde caption' },
      { description: 'desde description' },
      { leyenda: 'desde leyenda' }
    ]
    expect(getPhotoCaptions(null, 3, photos)).toEqual([
      'desde caption',
      'desde description',
      'desde leyenda'
    ])
  })

  it('descarta URLs de fotos usadas como caption', () => {
    const captions = [
      'https://x.supabase.co/storage/v1/object/public/daily-logs-photos/foto.jpg',
      'caption real'
    ]
    expect(getPhotoCaptions(captions, 2)).toEqual(['', 'caption real'])
  })

  it('descarta URLs con extensión de imagen', () => {
    expect(getPhotoCaptions(['https://cdn.example.com/foto.png'], 1)).toEqual([''])
  })

  it('mantiene texto que no es URL de imagen', () => {
    expect(getPhotoCaptions(['ver https en informe'], 1)).toEqual(['ver https en informe'])
  })

  it('devuelve array vacío cuando totalPhotos es 0', () => {
    expect(getPhotoCaptions(['a'], 0)).toEqual([])
  })

  it('maneja captions null/undefined sin fotos', () => {
    expect(getPhotoCaptions(null, 2)).toEqual(['', ''])
    expect(getPhotoCaptions(undefined, 2)).toEqual(['', ''])
  })
})
