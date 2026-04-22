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
let throttleTimer = null // ← agregar aquí
const THROTTLE_MS = 3000
const unidadesActivasGlobal = ref([])
const unidadesRawGlobal = ref([]) //  Guardamos los datos sin filtrar
const loadingGlobal = ref(false)
const errorGlobal = ref(null)
let trackingIniciado = false
const unidadesValidasGlobal = ref(new Set()) // IDs con IMEI válido
let unsubscribeUnidades = null

export function useTrackingUnidades() {
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  const { idEmpresaActual } = useMultiTenancy()

  const filtrarUnidadesPorEmpresa = (unidadesRaw) => {
    if (!idEmpresaActual.value) return []

    return unidadesRaw.filter((unidad) => {
      // Filtro empresa (existente)
      const empresaDeUnidad = unidad.IdEmpresaConductor || unidad.IdEmpresaUnidad
      if (!empresaDeUnidad) return false
      const pasaEmpresa = Array.isArray(idEmpresaActual.value)
        ? idEmpresaActual.value.includes(empresaDeUnidad)
        : empresaDeUnidad === idEmpresaActual.value
      if (!pasaEmpresa) return false

      // 🆕 Filtro IMEI: solo mostrar unidades con IMEI válido en Firestore
      const unidadId = unidad.unidadId || unidad.id
      return unidadesValidasGlobal.value.has(unidadId)
    })
  }

  /**
   * Inicia el tracking en tiempo real
   */
  const { obtenerDireccion } = useGeocoding()

  const iniciarListenerUnidades = () => {
    if (unsubscribeUnidades) return // ya escuchando

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

            //  Actualizar datos raw
            unidadesRawGlobal.value = todasLasUnidades

            // Geocodificar las que no tienen direccion
            const geocodificarPendientes = async (unidades) => {
              const actualizaciones = await Promise.all(
                unidades.map(async (unidad, index) => {
                  if (!unidad.direccionTexto && unidad.ubicacion) {
                    try {
                      const direccion = await obtenerDireccion({
                        lat: unidad.ubicacion.lat,
                        lng: unidad.ubicacion.lng,
                      })
                      return { index, direccionTexto: direccion }
                    } catch (e) {
                      console.warn(e)
                      return {
                        index,
                        direccionTexto: `${unidad.ubicacion.lat.toFixed(5)}, ${unidad.ubicacion.lng.toFixed(5)}`,
                      }
                    }
                  }
                  return null
                }),
              )

              const nuevasUnidades = [...unidadesRawGlobal.value]
              let huboCambios = false
              actualizaciones.forEach((act) => {
                if (act && nuevasUnidades[act.index]) {
                  nuevasUnidades[act.index] = {
                    ...nuevasUnidades[act.index],
                    direccionTexto: act.direccionTexto,
                  }
                  huboCambios = true
                }
              })
              if (huboCambios) {
                unidadesRawGlobal.value = nuevasUnidades
              }
            }

            geocodificarPendientes(todasLasUnidades)

            //  Aplicar filtrado
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

  //  WATCH: Re-filtrar cuando cambie IdEmpresa o los datos raw
  watch(idEmpresaActual, () => {
    if (trackingIniciado && idEmpresaActual.value && unidadesRawGlobal.value.length > 0) {
      const unidadesFiltradas = filtrarUnidadesPorEmpresa(unidadesRawGlobal.value)
      unidadesActivasGlobal.value = unidadesFiltradas
      window._unidadesTrackeadas = unidadesFiltradas
    }
  })
  const detenerTrackingManual = () => {
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

    // 🆕 Limpiar listener de Firestore
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
