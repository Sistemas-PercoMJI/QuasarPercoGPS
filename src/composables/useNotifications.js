// src/composables/useNotifications.js
import { ref, computed } from 'vue'

const notifications = ref([])
let notificationIdCounter = 0

export function useNotifications() {
  /**
   * Agrega una nueva notificación que expira en 5 minutos
   */
  function agregarNotificacion(notificacionData) {
    const id = ++notificationIdCounter
    const ahora = Date.now()
    const expiraEn = ahora + 5 * 60 * 1000 // 5 minutos

    const nuevaNotificacion = {
      id,
      type: notificacionData.type || 'info',
      title: notificacionData.title || 'Notificación',
      message: notificacionData.message || '',
      eventoId: notificacionData.eventoId || null,
      eventoNombre: notificacionData.eventoNombre || '',
      ubicacionNombre: notificacionData.ubicacionNombre || '',
      tipoUbicacion: notificacionData.tipoUbicacion || '',
      accion: notificacionData.accion || '',
      timestamp: ahora,
      expiraEn,
      leida: false,
    }

    notifications.value.unshift(nuevaNotificacion)
    console.log('✅ Notificación creada:', nuevaNotificacion.title)

    // Auto-expirar después de 5 minutos
    setTimeout(
      () => {
        marcarComoLeida(id)
      },
      5 * 60 * 1000,
    )

    return id
  }

  /**
   * Marca una notificación como leída (pasa al historial)
   */
  function marcarComoLeida(notificationId) {
    const notif = notifications.value.find((n) => n.id === notificationId)
    if (notif && !notif.leida) {
      notif.leida = true
      console.log('✅ Notificación marcada como leída:', notificationId)
    }
  }

  /**
   * Elimina una notificación completamente
   */
  function removeNotification(notificationId) {
    const index = notifications.value.findIndex((n) => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
      console.log('✅ Notificación eliminada:', notificationId)
    }
  }

  /**
   * Limpia todas las notificaciones activas (las marca como leídas)
   */
  function clearAll() {
    const noLeidas = notifications.value.filter((n) => !n.leida)

    noLeidas.forEach((notif) => {
      notif.leida = true
    })

    // 🔥 Forzar re-render creando una nueva referencia del array
    notifications.value = [...notifications.value]

    console.log('✅ Todas las notificaciones limpiadas')
    console.log('📊 Notificaciones marcadas:', noLeidas.length)
    console.log('📊 Total no leídas después:', totalNoLeidas.value)
  }

  /**
   * Elimina notificaciones leídas antiguas (más de 1 hora)
   */
  function limpiarHistorial() {
    const hace1Hora = Date.now() - 60 * 60 * 1000
    const antiguas = notifications.value.filter((n) => n.leida && n.timestamp < hace1Hora)

    antiguas.forEach((notif) => removeNotification(notif.id))
    console.log(`✅ ${antiguas.length} notificaciones antiguas eliminadas`)
  }

  // Computed properties para filtrar notificaciones
  const notificacionesActivas = computed(() => notifications.value.filter((n) => !n.leida))

  const notificacionesLeidas = computed(() => notifications.value.filter((n) => n.leida))

  const notificacionesImportantes = computed(() =>
    notifications.value.filter((n) => !n.leida && (n.type === 'warning' || n.type === 'negative')),
  )

  const totalNoLeidas = computed(() => notificacionesActivas.value.length)

  return {
    notifications,
    notificacionesActivas,
    notificacionesLeidas,
    notificacionesImportantes,
    totalNoLeidas,
    agregarNotificacion,
    marcarComoLeida,
    removeNotification,
    clearAll,
    limpiarHistorial,
  }
}
