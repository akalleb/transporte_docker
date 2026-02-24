import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  console.log('[API] /api/admin/users called')
  
  // Debug headers
  const headers = getRequestHeaders(event)
  console.log('[API] Cookies present:', !!headers.cookie)
  
  let user = null
  try {
    user = await serverSupabaseUser(event)
  } catch (e) {
    console.warn('[API] serverSupabaseUser failed:', e.message)
  }

  if (!user) {
      console.warn('[API] serverSupabaseUser returned null, trying getUser via client...')
      try {
          const client = await serverSupabaseServiceRole(event)
          // Tentar pegar o token do header Authorization se existir, ou cookie
          // Mas serverSupabaseServiceRole usa service role key, não o token do user.
          // Precisamos criar um client com o contexto do request para pegar o user.
          
          // Tentar ler o cookie sb-access-token ou sb-[ref]-auth-token
          // Mas vamos confiar que o serverSupabaseUser deveria ter funcionado.
          // Se falhou, vamos tentar validar o token manualmente se estiver no header
          
          const authHeader = getRequestHeader(event, 'Authorization')
          console.log('[API] Auth Header present:', !!authHeader)
          if (authHeader) {
               const token = authHeader.replace('Bearer ', '')
               const { data: userData, error: userError } = await client.auth.getUser(token)
               if (userData?.user) {
                   console.log('[API] User recovered via Authorization header')
                   user = userData.user
               } else if (userError) {
                   console.warn('[API] Auth.getUser error:', userError)
               }
          }
      } catch (e) {
          console.error('[API] Fallback auth check failed:', e)
      }
  }

  console.log('[API] User found:', user?.id)
    
  if (!user || (!user.id && !user.sub)) {
      // Tentar uma última cartada: verificar se o token está no header Authorization
      // e usar auth.getUser(token)
      // Mas por enquanto, vamos apenas retornar erro JSON
      console.warn('[API] Unauthorized: Missing User ID', user)
      return { error: 'Unauthorized', message: 'User not authenticated or session expired' }
  }

  const userId = user.id || user.sub

  try {
    const client = await serverSupabaseServiceRole(event)
    console.log('[API] Service Role Client initialized')

    // 2. Buscar perfil do usuário logado para verificar organização
    const { data: requesterProfile, error: requesterError } = await client
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single()

    if (requesterError) {
        console.warn('[API] Requester profile fetch error:', requesterError.code, requesterError.message)
        if (requesterError.code !== 'PGRST116') {
             // Apenas logar, não falhar tudo ainda
             console.error('[API] Critical profile fetch error', requesterError)
        }
    }

    // Buscar usuário fresco do Auth Admin para garantir role atualizado (caso token esteja stale)
    const { data: authUser } = await client.auth.admin.getUserById(userId)
    const freshRole = authUser?.user?.app_metadata?.role

    console.log('[API] User Role Debug:', { 
        id: userId, 
        email: user.email,
        app_metadata: user.app_metadata, 
        freshRole, 
        profileRole: requesterProfile?.role,
        requesterOrgId
    })

    // Se o usuário logado tem organization_id, FORÇAR o filtro
    const requesterOrgId = requesterProfile?.organization_id
    
    // Verificação de Super Admin mais robusta
    // Apenas confiamos no app_metadata do token JWT ou se o usuário acabou de provar ser super admin
    const isSuperAdmin = user.app_metadata?.role === 'super_admin' || freshRole === 'super_admin'
    
    console.log('[API] Requester Org:', requesterOrgId, 'Is Super Admin:', isSuperAdmin)

    // Se não tem organização e NÃO é super admin, bloqueia acesso a outros usuários
    if (!requesterOrgId && !isSuperAdmin) {
        console.log('[API] Orphan user detected, returning self profile only')
        const { data: fullSelf } = await client.from('profiles').select('*').eq('id', userId).single()
        return fullSelf ? [{ ...fullSelf, email: user.email }] : []
    }

    const query = getQuery(event)
    // Se for super admin, usa o parametro da query. Se for user normal, usa a org dele OBRIGATORIAMENTE.
    const organizationId = isSuperAdmin ? (query.organization_id as string) : requesterOrgId
    
    console.log('[API] Target Organization ID:', organizationId)

    // Se não for super admin e não tiver organizationId definido (erro de logica), retornar vazio por segurança
    if (!isSuperAdmin && !organizationId) {
        console.error('[API] Security Alert: Non-admin user without orgId trying to list users')
        return []
    }

    // 1. Buscar perfis existentes primeiro (filtrando por org)
    let profilesQuery = client
      .from('profiles')
      .select('*')
      .order('name')
    
    if (organizationId) {
        profilesQuery = profilesQuery.eq('organization_id', organizationId)
    }

    const { data: profiles, error: profileError } = await profilesQuery

    if (profileError) {
      console.error('[API] Error fetching profiles:', profileError)
      return []
    }

    // Se não achou perfis e estamos filtrando por org, não precisamos buscar no Auth (pois Auth não tem org_id nativo fácil de filtrar sem profile)
    // Mas para exibir emails, precisamos dos dados do Auth.
    // Estratégia: Pegar os IDs dos perfis encontrados e buscar usuários do Auth correspondentes (se possível)
    // Ou listar usuários do Auth e cruzar.
    
    // Se for Super Admin sem filtro de org, ele quer ver tudo.
    // Se for User Normal, ele só vê o que retornou em 'profiles'.
    
    let authUsers = []
    
    // Otimização: Se já temos os perfis filtrados, não precisamos listar TODOS os usuários do Auth se forem muitos.
    // Mas o supabase-js admin não tem "getUsersByIds". Tem listUsers.
    // Vamos listar users (limitado) e cruzar.
    
    try {
        const { data: authData } = await client.auth.admin.listUsers({ perPage: 1000 }) // Aumentei para 1000 para garantir
        authUsers = authData?.users || []
    } catch (e) {
        console.error('[API] Exception listing auth users:', e)
    }

    // 3. Sincronizar (Apenas se Super Admin e sem filtro de org, para criar profiles órfãos)
    // Usuários normais NÃO devem disparar criação de profiles globais
    if (authUsers.length > 0 && !organizationId && isSuperAdmin) {
      const existingIds = new Set(profiles?.map(p => p.id) || [])
      const missingUsers = authUsers.filter(u => !existingIds.has(u.id))

      if (missingUsers.length > 0) {
        // ... lógica de sync (mantida mas protegida pelo if acima) ...
        console.log(`[API] Syncing ${missingUsers.length} orphan users...`)
        const newProfiles = missingUsers.map(u => ({
          id: u.id,
          name: u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuário Sem Nome',
          role: 'user',
          status: 'active',
          created_at: u.created_at
        }))

        await client.from('profiles').upsert(newProfiles)
        
        // Recarregar profiles após sync
        const { data: updatedProfiles } = await client.from('profiles').select('*').order('name')
        if (updatedProfiles) {
             return updatedProfiles.map(p => ({
                ...p,
                email: authUsers.find(u => u.id === p.id)?.email || 'N/A'
             }))
        }
      }
    }

    // Retorno padrão cruzando profiles encontrados (filtrados) com authUsers
    if (profiles) {
        return profiles.map(p => {
          const authUser = authUsers.find(u => u.id === p.id)
          return {
            ...p,
            email: authUser?.email || 'N/A'
          }
        })
    }

    return []
  } catch (err) {
    console.error('[API] CRITICAL FAILURE in /api/admin/users:', err)
    // Retornar array vazio em caso de erro crítico para não quebrar o frontend
    return { error: 'Internal Server Error', message: err.message }
  }
})
