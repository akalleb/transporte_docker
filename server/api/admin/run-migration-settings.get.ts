export default defineEventHandler(async (event) => {
  const { client } = await requireAdmin(event)

  try {
    const { error } = await client.rpc('run_sql', {
      sql: `
        ALTER TABLE system_settings 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Opcional: Criar índice
        CREATE INDEX IF NOT EXISTS idx_system_settings_org ON system_settings(organization_id);
      `
    })

    if (error) {
      // Se RPC não estiver habilitado ou função não existir, tentar via query direta se possível (mas supabase-js client geralmente não permite DDL direto sem RPC ou Service Role forte)
      // Tentativa alternativa usando SQL direto se o cliente permitir (geralmente não permite raw sql string)
      return { success: false, error: error.message, note: "Pode ser necessário rodar o SQL manualmente no painel do Supabase se a função run_sql não existir." }
    }

    return { success: true, message: "Coluna organization_id adicionada com sucesso." }
  } catch (e) {
    return { success: false, error: e.message }
  }
})
