// src/composables/useNotifications.js
import { ref, computed } from 'vue'
import { useMapboxStaticImage } from './useMapboxStaticImage'

const notifications = ref([])
let notificationIdCounter = 0

//  Instancia del composable de mapas
const { generarMapaEvento } = useMapboxStaticImage()

export function useNotifications() {
  /**
   * Agrega una nueva notificación que expira en 5 minutos
   */
  async function agregarNotificacion(notificacionData) {
    const id = ++notificationIdCounter
    const ahora = Date.now()
    const expiraEn = ahora + 5 * 60 * 1000 // 5 minutos

    setTimeout(
      () => {
        marcarComoLeida(id)
      },
      24 * 60 * 60 * 1000,
    )

    //  GENERAR MAPA SI HAY UBICACIÓN
    let mapImage = null
    let mapUrl = null

    if (notificacionData.ubicacion) {
      try {
        const mapaData = await generarMapaEvento({
          lat: notificacionData.ubicacion.lat,
          lng: notificacionData.ubicacion.lng,
          nombre:
            notificacionData.ubicacion.nombre || notificacionData.ubicacionNombre || 'Ubicación',
          tipo: notificacionData.ubicacion.tipo || notificacionData.tipoUbicacion || 'POI',
        })

        mapImage = mapaData.imagenBase64
        mapUrl = mapaData.url
      } catch (error) {
        console.warn(' Error generando mapa para notificación:', error)
        // Continuar sin mapa si falla
      }
    }

    const nuevaNotificacion = {
      id,
      leida: notificacionData.yaLeida || false,
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
      mapImage, //  Imagen del mapa en base64
      mapUrl, //  URL del mapa para abrir en nueva pestaña
    }

    if (!nuevaNotificacion.leida) {
      // 🆕
      setTimeout(
        () => {
          marcarComoLeida(id)
        },
        24 * 60 * 60 * 1000,
      )
    }

    notifications.value.unshift(nuevaNotificacion)

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
    }
  }

  /**
   * Elimina una notificación completamente
   */
  function removeNotification(notificationId) {
    const index = notifications.value.findIndex((n) => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
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

    //  Forzar re-render creando una nueva referencia del array
    notifications.value = [...notifications.value]
  }

  /**
   * Elimina notificaciones leídas antiguas (más de 1 hora)
   */
  function limpiarHistorial() {
    const antes = notifications.value.length
    const notificacionesLeidas = notifications.value.filter((n) => n.leida).length

    console.log(' Notificaciones leídas a eliminar:', notificacionesLeidas)

    //  Filtrar y mantener solo las NO leídas
    notifications.value = notifications.value.filter((n) => !n.leida)

    const eliminadas = antes - notifications.value.length

    console.log(` ${eliminadas} notificaciones leídas eliminadas`)
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
