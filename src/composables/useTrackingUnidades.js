// src/composables/useTrackingUnidades.js - CON FILTRADO REACTIVO
import { ref, watch } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, onValue, off } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'
import { useMultiTenancy } from 'src/composables/useMultiTenancy'
import { useGeocoding } from 'src/composables/useGeocoding'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

// Variables globales
let unsubscribeGlobal = null
let throttleTimer = null
let geocodingTimer = null // 🆕 throttle para geocoding
const THROTTLE_MS = 3000
const unidadesActivasGlobal = ref([])
const unidadesRawGlobal = ref([])
const loadingGlobal = ref(false)
const errorGlobal = ref(null)
let trackingIniciado = false
const unidadesValidasGlobal = ref(new Set())
const ultimoGeocoding = new Map() // unidadId -> { lat, lng }

let unsubscribeUnidades = null

// 🆕 Función movida a nivel de módulo para que el throttle funcione correctamente
const calcularDistanciaKmGlobal = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 🆕 Función movida a nivel de módulo con throttle de 10 segundos
const crearGeocodificador = (obtenerDireccion) => {
  const geocodificarPendientes = async (unidades) => {
    // Si ya hay un geocoding pendiente, ignorar esta llamada
    if (geocodingTimer) return
    console.log(`🔴 geocodificarPendientes llamada, procesando en 10s...`)
    geocodingTimer = setTimeout(async () => {
      geocodingTimer = null

      const actualizaciones = await Promise.all(
        unidades.map(async (unidad) => {
          if (!unidad.ubicacion) return null

          const { lat, lng } = unidad.ubicacion
          const ultimaPos = ultimoGeocoding.get(unidad.id)

          const necesitaGeocodificar =
            !ultimaPos || calcularDistanciaKmGlobal(ultimaPos.lat, ultimaPos.lng, lat, lng) > 0.5

          if (!necesitaGeocodificar) return null

          try {
            const direccion = await obtenerDireccion({ lat, lng })
            ultimoGeocoding.set(unidad.id, { lat, lng })
            return { id: unidad.id, direccionTexto: direccion } // 🆕 usar id en vez de index
          } catch (e) {
            console.warn(e)
            return {
              id: unidad.id,
              direccionTexto: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            }
          }
        }),
      )

      const nuevasUnidades = [...unidadesRawGlobal.value]
      let huboCambios = false
      actualizaciones.forEach((act) => {
        if (!act) return
        // 🆕 buscar por id en vez de index para evitar bug de posición
        const i = nuevasUnidades.findIndex((u) => u.id === act.id)
        if (i !== -1) {
          nuevasUnidades[i] = {
            ...nuevasUnidades[i],
            direccionTexto: act.direccionTexto,
          }
          huboCambios = true
        }
      })

      if (huboCambios) {
        unidadesRawGlobal.value = nuevasUnidades
      }
    }, 10000) // 🆕 esperar 10s antes de procesar el siguiente batch
  }

  return geocodificarPendientes
}

export function useTrackingUnidades() {
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  const { idEmpresaActual } = useMultiTenancy()

  const filtrarUnidadesPorEmpresa = (unidadesRaw) => {
    if (!idEmpresaActual.value) return []

    return unidadesRaw.filter((unidad) => {
      const empresaDeUnidad = unidad.IdEmpresaConductor || unidad.IdEmpresaUnidad
      if (!empresaDeUnidad) return false
      const pasaEmpresa = Array.isArray(idEmpresaActual.value)
        ? idEmpresaActual.value.includes(empresaDeUnidad)
        : empresaDeUnidad === idEmpresaActual.value
      if (!pasaEmpresa) return false

      const unidadId = unidad.unidadId || unidad.id
      return unidadesValidasGlobal.value.has(unidadId)
    })
  }

  const { obtenerDireccion } = useGeocoding()

  // 🆕 Crear el geocodificador una sola vez con la función obtenerDireccion
  const geocodificarPendientes = crearGeocodificador(obtenerDireccion)

  const iniciarListenerUnidades = () => {
    if (unsubscribeUnidades) return

    const unidadesRef = collection(db, 'Unidades')

    unsubscribeUnidades = onSnapshot(unidadesRef, (snapshot) => {
      const idsValidos = new Set()
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const imei = data.imei?.toString().trim()
        if (imei && imei.length === 15) {
          idsValidos.add(doc.id)
        }
      })
      unidadesValidasGlobal.value = idsValidos
    })
  }

  const iniciarTracking = () => {
    iniciarListenerUnidades()
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
            const todasLasUnidades = Object.entries(data)
              .filter(([, value]) => {
                const esValida =
                  value &&
                  value.ubicacion &&
                  typeof value.ubicacion.lat === 'number' &&
                  typeof value.ubicacion.lng === 'number' &&
                  !isNaN(value.ubicacion.lat) &&
                  !isNaN(value.ubicacion.lng) &&
                  value.unidadNombre
                return esValida
              })
              .map(([key, value]) => ({
                id: value.unidadId || value.id || key,
                ...value,
                timestamp: value.timestamp || Date.now(),
                lat: value.ubicacion.lat,
                lng: value.ubicacion.lng,
                nombre: value.conductorNombre,
                direccionTexto:
                  value.direccionTexto === 'Obteniendo...' ? null : value.direccionTexto,
              }))

            unidadesRawGlobal.value = todasLasUnidades

            // 🆕 Llamar la función que ahora vive a nivel de módulo con throttle
            geocodificarPendientes(todasLasUnidades)

            if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                const unidadesFiltradas = filtrarUnidadesPorEmpresa(unidadesRawGlobal.value)
                unidadesActivasGlobal.value = unidadesFiltradas
                window._unidadesTrackeadas = unidadesFiltradas
                throttleTimer = null
              }, THROTTLE_MS)
            }
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

  watch(idEmpresaActual, () => {
    if (trackingIniciado && idEmpresaActual.value && unidadesRawGlobal.value.length > 0) {
      const unidadesFiltradas = filtrarUnidadesPorEmpresa(unidadesRawGlobal.value)
      unidadesActivasGlobal.value = unidadesFiltradas
      window._unidadesTrackeadas = unidadesFiltradas
    }
  })

  const detenerTrackingManual = () => {
    // 🆕 NO limpiar ultimoGeocoding para que el cache sobreviva reinicios
    // ultimoGeocoding.clear() ← eliminado

    if (geocodingTimer) {
      clearTimeout(geocodingTimer)
      geocodingTimer = null
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    if (unsubscribeGlobal) {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')
      off(unidadesRef)
      unsubscribeGlobal = null
      trackingIniciado = false
      unidadesRawGlobal.value = []
      unidadesActivasGlobal.value = []
    }

    if (unsubscribeUnidades) {
      unsubscribeUnidades()
      unsubscribeUnidades = null
    }

    unidadesValidasGlobal.value = new Set()
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
