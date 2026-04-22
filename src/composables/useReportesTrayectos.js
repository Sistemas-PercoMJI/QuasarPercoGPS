// composables/useReportesTrayectos.js
import { ref } from 'vue'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'
import { useProcesamientoTrayectos } from './useProcesamientoTrayectos'

export function useReportesTrayectos() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Descarga las coordenadas del archivo JSON en Firebase Storage
   * 🆕 Conserva campos ignicion y velocidad
   */
  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) {
      console.warn('No hay URL de rutas')
      return []
    }

    try {
      const response = await fetch(rutasUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      let coordenadas = []

      if (Array.isArray(data)) {
        coordenadas = data
      } else if (data.coordenadas && Array.isArray(data.coordenadas)) {
        coordenadas = data.coordenadas
      } else if (data.ruta && Array.isArray(data.ruta)) {
        coordenadas = data.ruta
      } else if (data.puntos && Array.isArray(data.puntos)) {
        coordenadas = data.puntos
      }

      const coordenadasNormalizadas = coordenadas
        .filter((coord) => {
          const lat = coord.lat || coord.latitude
          const lng = coord.lng || coord.longitude || coord.lon
          return lat && lng
        })
        .filter((coord) => {
          // 👈 AGREGAR ESTO
          const ts = coord.timestamp || coord.time || ''
          return !/\.\d{3}Z$/.test(ts)
        })
        .map((coord) => ({
          lat: coord.lat || coord.latitude,
          lng: coord.lng || coord.longitude || coord.lon,
          timestamp: coord.timestamp || coord.time || null,
          ignicion: coord.ignicion ?? null, // 🆕
          velocidad: coord.velocidad || 0, // 🆕
        }))

      return coordenadasNormalizadas
    } catch (err) {
      console.error('Error descargando coordenadas del Storage:', err)
      return []
    }
  }

  const obtenerTrayectos = async (unidadesNombres, fechaInicio, fechaFin) => {
    loading.value = true
    error.value = null

    try {
      const todosTrayectos = []
      const fechas = generarRangoFechas(fechaInicio, fechaFin)

      const unidadesIds = unidadesNombres.map((nombre) => {
        if (window.unidadesMap && window.unidadesMap[nombre]) {
          return window.unidadesMap[nombre]
        }
        return nombre
      })

      const odometrosPorUnidad = {}

      for (let i = 0; i < unidadesIds.length; i++) {
        const unidadId = unidadesIds[i]
        const unidadNombre = unidadesNombres[i]

        if (!odometrosPorUnidad[unidadId]) {
          odometrosPorUnidad[unidadId] = 0
        }

        for (const fecha of fechas) {
          try {
            const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
            const rutaSnap = await getDoc(rutaRef)

            if (rutaSnap.exists()) {
              const data = rutaSnap.data()

              // Descargar coordenadas del Storage
              let coordenadas = []
              if (data.rutas_url) {
                coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)
              }

              if (coordenadas.length === 0 && data.nuevaCoordenada) {
                coordenadas = [
                  {
                    lat: data.nuevaCoordenada.lat,
                    lng: data.nuevaCoordenada.lng,
                    timestamp: data.nuevaCoordenada.timestamp,
                    ignicion: data.nuevaCoordenada.ignicion ?? null,
                    velocidad: 0,
                  },
                ]
              }

              // 🆕 Detectar si hay campos ignicion en las coordenadas
              const tieneIgnicion = coordenadas.some(
                (c) => c.ignicion !== null && c.ignicion !== undefined,
              )

              // 🆕 Dividir por ignición si hay datos, sino usar todo como un viaje
              const gruposCoords = tieneIgnicion
                ? detectarViajesPorIgnicion(coordenadas)
                : [coordenadas]

              const odometroInicio = parseFloat(data.odometro_inicio) || 0
              const odometroFin = parseFloat(data.odometro_fin) || 0

              for (const [indexViaje, coordsViaje] of gruposCoords.entries()) {
                if (coordsViaje.length === 0) continue

                const inicioCoord = coordsViaje[0]
                const finCoord = coordsViaje[coordsViaje.length - 1]

                const inicioTs = inicioCoord.timestamp
                  ? new Date(inicioCoord.timestamp)
                  : data.fecha_hora_inicio?.toDate?.() || null

                const finTs = finCoord.timestamp
                  ? new Date(finCoord.timestamp)
                  : data.fecha_hora_fin?.toDate?.() || null

                const duracionMs = inicioTs && finTs ? finTs - inicioTs : 0
                const duracionHoras = duracionMs / 3600000

                // 🆕 Calcular distancia de este viaje con Haversine
                let distanciaViaje = 0
                if (coordsViaje.length >= 2) {
                  for (let j = 1; j < coordsViaje.length; j++) {
                    distanciaViaje += calcularDistanciaHaversine(coordsViaje[j - 1], coordsViaje[j])
                  }
                }

                // Si solo hay un viaje usar distancia del firestore, si hay varios calcular con Haversine
                const distanciaTotal = parseFloat(data.distancia_recorrida_km) || 0
                const distanciaFinal =
                  gruposCoords.length === 1
                    ? distanciaTotal > 0
                      ? distanciaTotal
                      : distanciaViaje
                    : parseFloat(distanciaViaje.toFixed(2))

                // 🆕 Velocidad máxima del viaje
                const velMaximaViaje = Math.max(...coordsViaje.map((c) => c.velocidad || 0))
                const velMaximaFinal =
                  gruposCoords.length === 1
                    ? parseFloat(data.velocidad_maxima) || velMaximaViaje
                    : velMaximaViaje

                // 🆕 Velocidad promedio del viaje
                let velPromedioViaje = 0
                if (duracionHoras > 0 && distanciaFinal > 0) {
                  velPromedioViaje = distanciaFinal / duracionHoras
                  if (!isFinite(velPromedioViaje) || velPromedioViaje < 0) velPromedioViaje = 0
                }
                const velPromedioFinal =
                  gruposCoords.length === 1
                    ? parseFloat(data.velocidad_promedio) || velPromedioViaje
                    : parseFloat(velPromedioViaje.toFixed(2))

                // Odómetros
                const kmInicio = odometroInicio > 0 ? odometroInicio : odometrosPorUnidad[unidadId]
                const kmFinal = odometroFin > 0 ? odometroFin : kmInicio + distanciaFinal

                todosTrayectos.push({
                  id: gruposCoords.length > 1 ? `${fecha}_viaje_${indexViaje + 1}` : fecha,
                  idUnidad: unidadId,
                  fecha: fecha,
                  conductorId: data.conductor_id || null,
                  conductorNombre: data.conductor_nombre || 'N/A',
                  unidadNombre: unidadNombre,
                  Placa: 'N/A',
                  inicioTimestamp: inicioTs,
                  finTimestamp: finTs,
                  duracion: duracionMs,
                  duracionHoras: duracionHoras.toFixed(2),
                  kilometrajeRecorrido: distanciaFinal,
                  kilometrajeInicio: kmInicio,
                  kilometrajeFinal: kmFinal,
                  odometroInicio: odometroInicio,
                  odometroFin: odometroFin,
                  odometroVirtual: odometrosPorUnidad[unidadId],
                  velocidadPromedio: parseFloat(
                    velPromedioFinal.toFixed ? velPromedioFinal.toFixed(2) : velPromedioFinal,
                  ),
                  velocidadMaxima: velMaximaFinal,
                  paradas: data.paradas?.length || 0,
                  ubicacionInicio: data.ubicacion_inicio || 'N/A',
                  ubicacionFin: data.ubicacion_fin || 'N/A',
                  coordenadas: coordsViaje,
                  latitud: inicioCoord.lat,
                  longitud: inicioCoord.lng,
                  _raw: data,
                  _simulado: false,
                })
              }

              // Actualizar odómetro virtual
              if (odometroFin > 0) {
                odometrosPorUnidad[unidadId] = odometroFin
              } else {
                odometrosPorUnidad[unidadId] += parseFloat(data.distancia_recorrida_km) || 0
              }
            } else {
              console.warn(`${fecha}: No hay datos en Firebase`)
            }
          } catch (err) {
            console.warn(`Error en ${unidadId}/${fecha}:`, err.message)
          }
        }
      }

      // Si no hay trayectos reales, generar simulados

      if (todosTrayectos.length === 0) {
        return { trayectos: [], elementosSinDatos: unidadesNombres }
      }

      const { procesarTrayectosParaPDF } = useProcesamientoTrayectos()
      const trayectosProcesados = await procesarTrayectosParaPDF(todosTrayectos)

      return trayectosProcesados
    } catch (err) {
      console.error('Error al obtener trayectos:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  const enriquecerConDatosUnidades = async (trayectos) => {
    try {
      // Normalizar si viene como objeto { trayectos: [...] }
      const listaTrayectos = Array.isArray(trayectos) ? trayectos : trayectos?.trayectos || []

      if (listaTrayectos.length === 0) return []
      if (listaTrayectos[0]._simulado) return listaTrayectos

      const unidadesRef = collection(db, 'Unidades')
      const unidadesSnapshot = await getDocs(unidadesRef)

      const unidadesMap = {}
      unidadesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        unidadesMap[doc.id] = {
          nombre: data.Unidad || doc.id,
          placa: data.Placa || 'Sin placa',
        }
      })

      return listaTrayectos.map((trayecto) => {
        const unidadInfo = unidadesMap[trayecto.idUnidad]
        return {
          ...trayecto,
          unidadNombre: unidadInfo?.nombre || trayecto.unidadNombre || trayecto.idUnidad,
          Placa: unidadInfo?.placa || trayecto.Placa || 'Sin placa',
        }
      })
    } catch (err) {
      console.error('Error al enriquecer unidades:', err)
      return Array.isArray(trayectos) ? trayectos : []
    }
  }

  return {
    loading,
    error,
    obtenerTrayectos,
    enriquecerConDatosUnidades,
    //generarTrayectosSimulados,
    descargarCoordenadasDeStorage,
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function generarRangoFechas(fechaInicio, fechaFin) {
  const fechas = []
  const fechaActual = new Date(fechaInicio)

  while (fechaActual <= fechaFin) {
    fechas.push(formatearFecha(fechaActual))
    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  return fechas
}

function formatearFecha(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * 🆕 Divide un array de coordenadas en viajes separados usando el campo ignicion.
 * Un viaje empieza con ignicion: true y termina con ignicion: false.
 */
function detectarViajesPorIgnicion(coordenadas) {
  const conMovimiento = coordenadas.filter((c) => (c.velocidad || 0) > 7)
  const conIgnicionTrue = coordenadas.filter((c) => c.ignicion === true)

  // Sin ignición cableada pero con movimiento real → segmentar por velocidad
  if (conMovimiento.length > 3 && conIgnicionTrue.length === 0) {
    return detectarViajesPorVelocidad(coordenadas)
  }

  // Lógica normal por ignición
  const viajes = []
  let viajeActual = []
  let enViaje = false

  for (const coord of coordenadas) {
    if (coord.ignicion === true) {
      enViaje = true
      viajeActual.push(coord)
    } else if (coord.ignicion === false && enViaje) {
      viajeActual.push(coord)
      if (viajeActual.length > 1) viajes.push([...viajeActual])
      viajeActual = []
      enViaje = false
    }
  }

  if (viajeActual.length > 1) viajes.push(viajeActual)

  if (viajes.length === 0 && coordenadas.length > 0) return [coordenadas]

  return viajes
}

/**
 * 🆕 Calcula distancia en km entre dos coordenadas usando Haversine
 */
function calcularDistanciaHaversine(coord1, coord2) {
  const R = 6371
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
function detectarViajesPorVelocidad(coordenadas) {
  const UMBRAL_KMH = 7
  const GAP_DETENCION_MS = 5 * 60 * 1000 // 5 minutos detenido = fin de viaje

  const viajes = []
  let viajeActual = []

  for (let i = 0; i < coordenadas.length; i++) {
    const c = coordenadas[i]
    const enMovimiento = (c.velocidad || 0) > UMBRAL_KMH

    if (enMovimiento) {
      viajeActual.push(c)
    } else if (viajeActual.length > 0) {
      const ultimoMovimiento = viajeActual[viajeActual.length - 1]
      const tiempoDetenido = new Date(c.timestamp) - new Date(ultimoMovimiento.timestamp)

      if (tiempoDetenido >= GAP_DETENCION_MS) {
        // Detenido suficiente tiempo → cerrar viaje
        viajeActual.push(c)
        if (viajeActual.length >= 2) viajes.push([...viajeActual])
        viajeActual = []
      } else {
        // Desaceleración momentánea (semáforo, tope) → mantener en viaje
        viajeActual.push(c)
      }
    }
  }

  // Cerrar viaje que quedó abierto al final
  if (viajeActual.length >= 2) viajes.push(viajeActual)

  return viajes.length > 0 ? viajes : [coordenadas]
}
