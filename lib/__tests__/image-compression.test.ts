import { describe, it, expect } from 'vitest'
import { compressImageFile, compressImageFiles } from '@/lib/image-compression'

function makeFile(bytes: number, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('compressImageFile', () => {
  it('devuelve el archivo intacto si no es una imagen', async () => {
    const pdf = makeFile(2_000_000, 'documento.pdf', 'application/pdf')
    const result = await compressImageFile(pdf)
    expect(result).toBe(pdf)
  })

  it('no recomprime imágenes pequeñas que no son HEIC', async () => {
    const small = makeFile(100 * 1024, 'foto.jpg', 'image/jpeg')
    const result = await compressImageFile(small)
    expect(result).toBe(small)
  })

  it('hace fallback al original si la compresión falla (sin DOM disponible)', async () => {
    // En el entorno de test no hay canvas/Image, por lo que la compresión
    // lanza y debe devolver el archivo original para no bloquear el guardado.
    const big = makeFile(3 * 1024 * 1024, 'foto-grande.jpg', 'image/jpeg')
    const result = await compressImageFile(big)
    expect(result).toBe(big)
  })

  it('respeta el umbral skipBelowBytes configurable', async () => {
    const file = makeFile(300 * 1024, 'foto.jpg', 'image/jpeg')
    // Con un umbral alto, no intenta comprimir y devuelve el mismo archivo.
    const result = await compressImageFile(file, { skipBelowBytes: 1024 * 1024 })
    expect(result).toBe(file)
  })
})

describe('compressImageFiles', () => {
  it('conserva el orden y la longitud de la lista', async () => {
    const files = [
      makeFile(50 * 1024, 'a.jpg', 'image/jpeg'),
      makeFile(60 * 1024, 'b.jpg', 'image/jpeg'),
      makeFile(70 * 1024, 'c.jpg', 'image/jpeg'),
    ]
    const result = await compressImageFiles(files)
    expect(result).toHaveLength(3)
    expect(result.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
  })

  it('devuelve lista vacía para entrada vacía', async () => {
    expect(await compressImageFiles([])).toEqual([])
  })
})
