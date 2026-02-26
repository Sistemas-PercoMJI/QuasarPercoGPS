// src/composables/useTrackingUnidades.js - CON FILTRADO REACTIVO
import { ref, watch } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, onValue, off } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'
import { useMultiTenancy } from 'src/composables/useMultiTenancy'

// Variables globales
let unsubscribeGlobal = null
const unidadesActivasGlobal = ref([])
const unidadesRawGlobal = ref([]) //  Guardamos los datos sin filtrar
const loadingGlobal = ref(false)
const errorGlobal = ref(null)
let trackingIniciado = false

export function useTrackingUnidades() {
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  const { idEmpresaActual } = useMultiTenancy()

  const filtrarUnidadesPorEmpresa = (unidadesRaw) => {
    if (!idEmpresaActual.value) {
      console.warn(' No hay IdEmpresa, retornando array vacío')
      return []
    }

    const unidadesFiltradas = unidadesRaw.filter((unidad) => {
      //  IMPORTANTE: Filtrar por IdEmpresaConductor (no IdEmpresaUnidad)
      if (!unidad.IdEmpresaConductor) {
        return false
      }

      // Soportar array de empresas
      const perteneceAMisEmpresas = Array.isArray(idEmpresaActual.value)
        ? idEmpresaActual.value.includes(unidad.IdEmpresaConductor)
        : unidad.IdEmpresaConductor === idEmpresaActual.value

      return perteneceAMisEmpresas
    })

    return unidadesFiltradas
  }

  /**
   * Inicia el tracking en tiempo real
   */
  const iniciarTracking = () => {
    if (trackingIniciado) {
      return
    }

    if (!idEmpresaActual.value) {
      console.warn(' No se puede iniciar tracking: IdEmpresa no disponible')

      setTimeout(() => {
        iniciarTracking()
      }, 1000)
      return
    }

    loadingGlobal.value = true
    errorGlobal.value = null

    try {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')

      unsubscribeGlobal = onValue(
        unidadesRef,
        (snapshot) => {
          const data = snapshot.val()

          if (data) {
            //  Guardar TODAS las unidades sin filtrar
            const todasLasUnidades = Object.entries(data)
              .filter(([, value]) => {
                // Solo validación básica de ubicación
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

            //  Actualizar datos raw
            unidadesRawGlobal.value = todasLasUnidades

            //  Aplicar filtrado
            const unidadesFiltradas = filtrarUnidadesPorEmpresa(todasLasUnidades)

            unidadesActivasGlobal.value = unidadesFiltradas
            window._unidadesTrackeadas = unidadesFiltradas
          } else {
            unidadesRawGlobal.value = []
            unidadesActivasGlobal.value = []
          }

          loadingGlobal.value = false
        },
        (err) => {
          console.error(' Error en tracking:', err)
          errorGlobal.value = err.message
          loadingGlobal.value = false
        },
      )

      trackingIniciado = true
    } catch (err) {
      console.error(' Error al iniciar tracking:', err)
      errorGlobal.value = err.message
      loadingGlobal.value = false
    }
  }

  //  WATCH: Re-filtrar cuando cambie IdEmpresa o los datos raw
  watch(
    [idEmpresaActual, unidadesRawGlobal],
    () => {
      if (trackingIniciado && idEmpresaActual.value && unidadesRawGlobal.value.length > 0) {
        const unidadesFiltradas = filtrarUnidadesPorEmpresa(unidadesRawGlobal.value)
        unidadesActivasGlobal.value = unidadesFiltradas
        window._unidadesTrackeadas = unidadesFiltradas
      }
    },
    { deep: true },
  )

  const detenerTrackingManual = () => {
    if (unsubscribeGlobal) {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')
      off(unidadesRef)
      unsubscribeGlobal = null
      trackingIniciado = false
      unidadesRawGlobal.value = []
      unidadesActivasGlobal.value = []
    }
  }

  const evaluarEventosParaTodasLasUnidades = async () => {
    if (unidadesActivasGlobal.value.length > 0) {
      try {
        await evaluarEventosParaUnidadesSimulacion(unidadesActivasGlobal.value)
      } catch (err) {
        console.error('Error evaluando eventos:', err)
      }
    }
  }

  const obtenerUnidad = (unidadId) => {
    return unidadesActivasGlobal.value.find((u) => u.id === unidadId || u.unidadId === unidadId)
  }

  const unidadesPorEstado = (estado) => {
    if (estado === 'todos') {
      return unidadesActivasGlobal.value
    }
    return unidadesActivasGlobal.value.filter((u) => u.estado === estado)
  }

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

  return {
    unidadesActivas: unidadesActivasGlobal,
    loading: loadingGlobal,
    error: errorGlobal,
    iniciarTracking,
    detenerTrackingManual,
    obtenerUnidad,
    unidadesPorEstado,
    contarPorEstado,
    estadisticas,
    evaluarEventosParaTodasLasUnidades,
  }
}
