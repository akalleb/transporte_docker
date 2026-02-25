export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  
  // Debug
  if (import.meta.client) {
      console.log('Middleware Auth:', to.path, 'User:', !!user.value)
  }

  if (!user.value) {
    return navigateTo('/login')
  }
})
