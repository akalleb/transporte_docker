/**
 * Extrai o path relativo de um arquivo a partir de uma URL pública do Supabase Storage.
 * @param url URL pública completa (ex: https://.../storage/v1/object/public/requisicoes/whatsapp/123.jpg)
 * @param bucket Nome do bucket (ex: 'requisicoes')
 * @returns Path relativo dentro do bucket (ex: 'whatsapp/123.jpg') ou null
 */
export function extractStoragePath(url: string | null | undefined, bucket: string): string | null {
    if (!url) return null

    const marker = `/${bucket}/`
    if (url.includes(marker)) {
        const parts = url.split(marker)
        return parts.length > 1 ? parts[1] : null
    }

    return null
}
