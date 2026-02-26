export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  if (import.meta.client) {
    console.log('Middleware Guest:', to.path, 'User:', !!user.value)
  }

  if (user.value) {
    return navigateTo('/')
  } else {
    // Tenta pegar ativamente a sessão caso ainda não tenha dado 1 tick no reativo
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      return navigateTo('/')
    }
  }
})
