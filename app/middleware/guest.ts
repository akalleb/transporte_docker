export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()

  if (import.meta.client) {
      console.log('Middleware Guest:', to.path, 'User:', !!user.value)
  }

  if (user.value) {
    return navigateTo('/')
  }
})
