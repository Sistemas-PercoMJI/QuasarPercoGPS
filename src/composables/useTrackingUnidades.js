// src/composables/useTrackingUnidades.js - SIN DETENCIÓN AUTOMÁTICA
import { ref, watch } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, onValue, off } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'

// 🆕 Variables globales para mantener el tracking siempre activo
let unsubscribeGlobal = null
const unidadesActivasGlobal = ref([])
const loadingGlobal = ref(false)
const errorGlobal = ref(null)
let trackingIniciado = false

export function useTrackingUnidades() {
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()

  /**
   * Inicia el tracking en tiempo real de todas las unidades activas
   */
  const iniciarTracking = () => {
    // Si ya está iniciado, no hacer nada
    if (trackingIniciado) {
      console.log('✅ Tracking ya está activo')
      return
    }

    loadingGlobal.value = true
    errorGlobal.value = null

    try {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')

      // Escuchar cambios en tiempo real
      unsubscribeGlobal = onValue(
        unidadesRef,
        (snapshot) => {
          const data = snapshot.val()

          if (data) {
            // Filtrar solo unidades válidas con ubicación completa
            const unidadesValidas = Object.entries(data)
              .filter(([, value]) => {
                const esValida =
                  value &&
                  value.ubicacion &&
                  typeof value.ubicacion.lat === 'number' &&
                  typeof value.ubicacion.lng === 'number' &&
                  !isNaN(value.ubicacion.lat) &&
                  !isNaN(value.ubicacion.lng) &&
                  value.conductorNombre &&
                  value.unidadNombre

                return esValida
              })
              .map(([key, value]) => ({
                id: value.unidadId || value.id || key,
                ...value,
                lat: value.ubicacion.lat,
                lng: value.ubicacion.lng,
                nombre: value.conductorNombre,
              }))

            unidadesActivasGlobal.value = unidadesValidas
            window._unidadesTrackeadas = unidadesValidas
          } else {
            unidadesActivasGlobal.value = []
            console.log('📡 No hay unidades activas')
          }

          loadingGlobal.value = false
        },
        (err) => {
          console.error('❌ Error en tracking:', err)
          errorGlobal.value = err.message
          loadingGlobal.value = false
        },
      )

      trackingIniciado = true
      console.log('✅ Tracking GPS iniciado (permanente)')
    } catch (err) {
      console.error('❌ Error al iniciar tracking:', err)
      errorGlobal.value = err.message
      loadingGlobal.value = false
    }
  }

  /**
   * 🔧 Método para detener manualmente (solo en casos excepcionales)
   * NO se llama automáticamente
   */
  const detenerTrackingManual = () => {
    if (unsubscribeGlobal) {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')
      off(unidadesRef)
      unsubscribeGlobal = null
      trackingIniciado = false
      console.log('🛑 Tracking detenido manualmente')
    }
  }

  /**
   * Evaluar eventos para todas las unidades trackeadas
   */
  const evaluarEventosParaTodasLasUnidades = async () => {
    if (unidadesActivasGlobal.value.length > 0) {
      try {
        await evaluarEventosParaUnidadesSimulacion(unidadesActivasGlobal.value)
      } catch (err) {
        console.error('❌ Error evaluando eventos:', err)
      }
    }
  }

  // Watch para evaluar eventos cuando cambien las unidades
  watch(
    unidadesActivasGlobal,
    () => {
      // Descomenta si necesitas evaluación automática
      // evaluarEventosParaTodasLasUnidades()
    },
    { deep: true },
  )

  /**
   * Obtiene una unidad específica por ID
   */
  const obtenerUnidad = (unidadId) => {
    return unidadesActivasGlobal.value.find((u) => u.id === unidadId || u.unidadId === unidadId)
  }

  /**
   * Filtra unidades por estado
   */
  const unidadesPorEstado = (estado) => {
    if (estado === 'todos') {
      return unidadesActivasGlobal.value
    }
    return unidadesActivasGlobal.value.filter((u) => u.estado === estado)
  }

  /**
   * Cuenta unidades por estado
   */
  const contarPorEstado = () => {
    const conteo = {
      todos: unidadesActivasGlobal.value.length,
      movimiento: 0,
      detenido: 0,
      inactivo: 0,
    }

    unidadesActivasGlobal.value.forEach((unidad) => {
      if (conteo[unidad.estado] !== undefined) {
        conteo[unidad.estado]++
      }
    })

    return conteo
  }

  /**
   * Obtiene estadísticas generales
   */
  const estadisticas = () => {
    const total = unidadesActivasGlobal.value.length
    const enMovimiento = unidadesActivasGlobal.value.filter((u) => u.estado === 'movimiento').length
    const detenidas = unidadesActivasGlobal.value.filter((u) => u.estado === 'detenido').length
    const inactivas = unidadesActivasGlobal.value.filter((u) => u.estado === 'inactivo').length

    const velocidadPromedio =
      total > 0
        ? unidadesActivasGlobal.value.reduce((acc, u) => acc + (u.velocidad || 0), 0) / total
        : 0

    return {
      total,
      enMovimiento,
      detenidas,
      inactivas,
      velocidadPromedio: Math.round(velocidadPromedio),
      porcentajeActivo: total > 0 ? Math.round((enMovimiento / total) * 100) : 0,
    }
  }

  // 🔧 YA NO hay onUnmounted - el tracking se mantiene activo

  return {
    unidadesActivas: unidadesActivasGlobal,
    loading: loadingGlobal,
    error: errorGlobal,
    iniciarTracking,
    detenerTrackingManual, // 🆕 Solo para casos especiales
    obtenerUnidad,
    unidadesPorEstado,
    contarPorEstado,
    estadisticas,
    evaluarEventosParaTodasLasUnidades,
  }
}
