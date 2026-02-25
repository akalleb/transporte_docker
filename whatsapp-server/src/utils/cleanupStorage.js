import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Configurações do Supabase ausentes para o script de limpeza.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const BUCKET_NAME = 'requisicoes'
const MAX_AGE_DAYS = 15

export async function cleanupStorage() {
  console.log(`[Cleanup] Iniciando limpeza de arquivos com mais de ${MAX_AGE_DAYS} dias...`)
  
  try {
    // Listar arquivos no bucket (limite de 100 por vez)
    const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list('whatsapp', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'asc' },
    })

    if (error) {
      console.error('[Cleanup] Erro ao listar arquivos:', error)
      return
    }

    if (!files || files.length === 0) {
      console.log('[Cleanup] Nenhum arquivo encontrado para verificar.')
      return
    }

    const now = new Date()
    const filesToDelete = []

    for (const file of files) {
      const fileDate = new Date(file.created_at)
      const diffTime = Math.abs(now - fileDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays > MAX_AGE_DAYS) {
        filesToDelete.push(`whatsapp/${file.name}`)
      }
    }

    if (filesToDelete.length > 0) {
      console.log(`[Cleanup] Excluindo ${filesToDelete.length} arquivos antigos...`)
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)

      if (deleteError) {
        console.error('[Cleanup] Erro ao excluir arquivos:', deleteError)
      } else {
        console.log('[Cleanup] Limpeza concluída com sucesso.')
      }
    } else {
      console.log('[Cleanup] Nenhum arquivo antigo para excluir.')
    }

  } catch (err) {
    console.error('[Cleanup] Erro inesperado:', err)
  }
}

// Se rodar diretamente: node src/utils/cleanupStorage.js
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupStorage()
}
