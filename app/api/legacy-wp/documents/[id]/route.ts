import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LEGACY_DOCUMENTS_BUCKET, legacyDocumentObjectPath, legacyDocumentUrl } from '@/lib/legacy-wp/document-path.mjs'

// Entrega un documento legal importado de WordPress. El archivo está en un
// bucket privado: se valida con la sesión del usuario (RLS de project_documents
// y de Storage) y se redirige a una URL firmada de corta duración.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: document } = await supabase
    .from('project_documents')
    .select('id, project_id, file_name, file_url')
    .eq('id', id)
    .maybeSingle()
  if (!document || document.file_url !== legacyDocumentUrl(document.id)) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  const download = request.nextUrl.searchParams.has('download') ? { download: document.file_name } : undefined
  const { data, error } = await supabase.storage
    .from(LEGACY_DOCUMENTS_BUCKET)
    .createSignedUrl(legacyDocumentObjectPath(document.project_id, document.id, document.file_name), 60, download)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'No tienes acceso a este documento' }, { status: 403 })
  }
  return NextResponse.redirect(data.signedUrl)
}
