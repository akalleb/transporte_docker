import pg from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Configurar __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar .env
dotenv.config()

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260220130000_create_registrations_and_boarding.sql')

async function runMigration() {
  console.log('Iniciando migração...')

  // Tentar conectar usando connection string se existir, ou construir
  // Nota: O .env atual tem SUPABASE_URL e SUPABASE_ANON_KEY, mas não tem DATABASE_URL
  // O usuário precisará fornecer a string de conexão ou rodar no dashboard
  
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não encontrada no arquivo .env')
    console.log('⚠️  Para corrigir isso automaticamente, precisamos da string de conexão do banco de dados.')
    console.log('ℹ️  Ela tem o formato: postgres://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres')
    console.log('\n✅ ALTERNATIVA RECOMENDADA:')
    console.log('1. Copie o conteúdo do arquivo: supabase/migrations/20260220130000_create_registrations_and_boarding.sql')
    console.log('2. Vá no painel do Supabase > SQL Editor')
    console.log('3. Cole e execute o script.')
    return
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Conectado ao banco de dados.')

    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
    await client.query(sql)
    
    console.log('✅ Migração aplicada com sucesso!')
  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err)
  } finally {
    await client.end()
  }
}

runMigration()
