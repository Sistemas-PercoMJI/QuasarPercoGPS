import { auth } from 'src/firebase/firebaseConfig'

export const authGuard = (to, from, next) => {
  // Obtener el usuario actual
  const user = auth.currentUser

  console.log('🔐 AuthGuard - Ruta:', to.path, 'Usuario:', user?.email || 'No logueado')

  // Rutas públicas (no requieren autenticación)
  const publicRoutes = ['/login']

  if (publicRoutes.includes(to.path)) {
    // Si ya está logueado y va al login, redirigir al dashboard
    if (user) {
      console.log('✅ Ya está logueado, redirigiendo a dashboard')
      next('/dashboard')
    } else {
      console.log('✅ Permitir acceso al login')
      next()
    }
  } else {
    // Rutas protegidas
    if (user) {
      console.log('✅ Usuario autenticado, permitir acceso')
      next() // Permitir acceso
    } else {
      console.log('❌ No autenticado, redirigir a login')
      next('/login') // Redirigir al login
    }
  }
}
