import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  name: string | null
  phone: string | null
  avatar_url?: string | null
  role: 'admin' | 'user'
  status: 'pending' | 'active' | 'blocked'
  created_at: string
}

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser() // Nuxt/Supabase reactive user
  const router = useRouter()
  
  // Estado global do perfil
  const userProfile = useState<UserProfile | null>('userProfile', () => null)

  // =================================================================
  // 1. Fetch Profile
  // =================================================================
  const fetchProfile = async () => {
    // Tenta pegar o usuário do estado reativo ou do cliente
    let currentUser = user.value as User | null
    
    if (!currentUser) {
      const { data } = await supabase.auth.getUser()
      currentUser = data.user
    }

    if (!currentUser || !currentUser.id) {
      // Silencioso se realmente não houver sessão (ex: login page)
      // console.warn('useAuth: fetchProfile - Nenhum usuário autenticado.')
      return null
    }

    try {
      console.log('useAuth: Buscando perfil para', currentUser.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error) {
        // Se não encontrar (PGRST116), não é erro crítico, retorna null
        if (error.code === 'PGRST116') {
            console.warn('useAuth: Perfil não encontrado no banco.')
            userProfile.value = null
            return null
        }
        throw error
      }

      userProfile.value = data as UserProfile
      return data
    } catch (error: any) {
      console.error('useAuth: Erro ao buscar perfil:', error.message)
      return null
    }
  }

  // =================================================================
  // 2. Update Profile
  // =================================================================
  const updateProfile = async (updates: { name?: string; phone?: string; avatar_url?: string }) => {
    // Sempre valida o usuário atual no servidor antes de gravar
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData.user

    if (!currentUser) {
      return { success: false, error: 'Sessão inválida. Faça login novamente.' }
    }

    try {
      // 1. Upsert no profile via API (Bypass RLS for Insert)
      const { data } = await $fetch('/api/profile/upsert', {
        method: 'POST',
        body: updates
      })

      console.log('useAuth: updateProfile - Dados salvos no banco:', data)

      // 2. Atualizar Metadata (Opcional, mas bom para UI)
      if (updates.name) {
        await supabase.auth.updateUser({
          data: { full_name: updates.name }
        })
      }

      // 3. Atualizar estado local com os dados retornados do banco
      userProfile.value = data as UserProfile
      
      return { success: true }
    } catch (error: any) {
      console.error('useAuth: Erro ao atualizar:', error.message, error.data)
      return { success: false, error: error.data?.message || error.message }
    }
  }

  // =================================================================
  // 3. Upload Avatar
  // =================================================================
  const uploadAvatar = async (file: File) => {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData.user

    if (!currentUser) {
        return { success: false, error: 'Usuário não autenticado.' }
    }

    // Nome do arquivo: ID-TIMESTAMP.EXT
    const fileExt = file.name.split('.').pop()
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`

    try {
        // 1. Upload para o bucket 'perfil'
        const { error: uploadError } = await supabase.storage
            .from('perfil')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) throw uploadError

        // 2. Obter URL pública
        const { data: urlData } = supabase.storage
            .from('perfil')
            .getPublicUrl(fileName)

        if (!urlData.publicUrl) throw new Error('Falha ao obter URL pública.')

        // 3. Salvar URL no perfil
        await updateProfile({ avatar_url: urlData.publicUrl })

        return { success: true, url: urlData.publicUrl }
    } catch (error: any) {
        console.error('useAuth: Erro uploadAvatar:', error)
        return { success: false, error: error.message }
    }
  }

  // =================================================================
  // 4. Auth Actions
  // =================================================================
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    
    // Força o fetchProfile para garantir que o estado esteja atualizado
    await fetchProfile()
    
    router.push('/')
    return { success: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    userProfile.value = null
    router.push('/login')
  }

  return {
    user,
    userProfile,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    login,
    logout
  }
}
