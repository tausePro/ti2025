import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const configId = formData.get('configId') as string
    const assetType = formData.get('assetType') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes.' 
      }, { status: 400 })
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 5MB.' 
      }, { status: 400 })
    }

    const supabase = createClient()

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${configId}-${assetType}-${Date.now()}.${fileExt}`
    
    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('branding-assets')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ 
        error: 'Error subiendo archivo: ' + uploadError.message 
      }, { status: 500 })
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('branding-assets')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      success: true,
      publicUrl,
      fileName: uploadData.path,
      fileSize: file.size,
      mimeType: file.type
    })

  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}