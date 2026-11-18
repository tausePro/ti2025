// Ubicación en Storage de los documentos legales importados de la plataforma
// anterior. La usan el importador (scripts/wp-legacy) y la ruta que entrega el
// archivo, así que debe poder calcularse solo con la fila de project_documents.

export const LEGACY_DOCUMENTS_BUCKET = 'legacy-wp-documents'
export const LEGACY_DOCUMENT_URL_PREFIX = '/api/legacy-wp/documents/'

/**
 * @param {string} projectId
 * @param {string} documentId id de la fila en project_documents
 * @param {string} fileName nombre original, solo para conservar la extensión
 */
export function legacyDocumentObjectPath(projectId, documentId, fileName) {
  const extension = /\.[A-Za-z0-9]{1,8}$/.exec(String(fileName ?? ''))?.[0].toLowerCase() ?? ''
  return `${projectId}/${documentId}${extension}`
}

/** @param {string} documentId */
export function legacyDocumentUrl(documentId) {
  return `${LEGACY_DOCUMENT_URL_PREFIX}${documentId}`
}
