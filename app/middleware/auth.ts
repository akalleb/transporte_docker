export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // Debug
  if (import.meta.client) {
    console.log('Middleware Auth:', to.path, 'User:', !!user.value)
  }

  if (!user.value) {
    // Tenta pegar a sessão ativamente do storage se o reativo demorar 1 tick
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      return navigateTo('/login')
    }
  }
})
