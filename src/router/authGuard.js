import { auth } from 'src/firebase/firebaseConfig'

export const authGuard = (to, from, next) => {
  // Obtener el usuario actual
  const user = auth.currentUser

  // Rutas públicas (no requieren autenticación)
  const publicRoutes = ['/login', '/recuperar-password']

  if (publicRoutes.includes(to.path)) {
    // Si ya está logueado y va al login, redirigir al dashboard
    if (user) {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    // Rutas protegidas
    if (user) {
      next() // Permitir acceso
    } else {
      next('/login') // Redirigir al login
    }
  }
}
