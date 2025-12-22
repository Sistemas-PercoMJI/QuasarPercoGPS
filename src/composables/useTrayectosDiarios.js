// src/composables/useTrayectosDiarios.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { useGeocoding } from './useGeocoding'

export function useTrayectosDiarios() {
  const loading = ref(false)
  const error = ref(null)
  const { obtenerDireccion } = useGeocoding()

  /**
   * Calcula distancia entre dos puntos (fórmula Haversine)
   */
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Calcula velocidad entre dos coordenadas
   */
  const calcularVelocidad = (coord1, coord2) => {
    const distanciaKm = calcularDistancia(coord1.lat, coord1.lng, coord2.lat, coord2.lng)
    const tiempoHoras =
      (new Date(coord2.timestamp).getTime() - new Date(coord1.timestamp).getTime()) / 3600000

    if (tiempoHoras <= 0) return 0
    return distanciaKm / tiempoHoras // km/h
  }

  /**
   * Descarga coordenadas desde Storage
   */
  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) return []

    try {
      console.log('🌐 Descargando coordenadas desde Storage...')
      const response = await fetch(rutasUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

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
          const timestamp = coord.timestamp || coord.time
          return lat && lng && timestamp
        })
        .map((coord) => ({
          lat: coord.lat || coord.latitude,
          lng: coord.lng || coord.longitude || coord.lon,
          timestamp: coord.timestamp || coord.time,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      console.log(`✅ ${coordenadasNormalizadas.length} coordenadas descargadas`)
      return coordenadasNormalizadas
    } catch (err) {
      console.error('❌ Error descargando coordenadas:', err)
      return []
    }
  }

  /**
   * 🔥 Analiza coordenadas y calcula velocidades entre puntos
   */
  const enriquecerCoordenadasConVelocidad = (coordenadas) => {
    if (coordenadas.length < 2) return []

    const coordenadasEnriquecidas = [
      {
        ...coordenadas[0],
        velocidad: 0,
      },
    ]

    for (let i = 1; i < coordenadas.length; i++) {
      const velocidad = calcularVelocidad(coordenadas[i - 1], coordenadas[i])
      coordenadasEnriquecidas.push({
        ...coordenadas[i],
        velocidad: Math.round(velocidad), // Redondear a entero
      })
    }

    return coordenadasEnriquecidas
  }

  /**
   * Analiza coordenadas y genera trayectos (viajes separados por paradas)
   */
  const analizarTrayectos = (coordenadas) => {
    if (!coordenadas || coordenadas.length < 2) return []

    // 🔥 Primero calcular velocidades
    const coordsConVelocidad = enriquecerCoordenadasConVelocidad(coordenadas)

    const trayectos = []
    let trayectoActual = {
      inicio: null,
      fin: null,
      coordenadas: [],
      distancia: 0,
      velocidadMax: 0,
      velocidadPromedio: 0,
    }

    let enMovimiento = false
    const UMBRAL_PARADA = 5 // km/h
    const MIN_COORDS_TRAYECTO = 5

    for (let i = 0; i < coordsConVelocidad.length; i++) {
      const coord = coordsConVelocidad[i]
      const velocidad = coord.velocidad || 0

      // Detectar inicio de movimiento
      if (!enMovimiento && velocidad > UMBRAL_PARADA) {
        enMovimiento = true
        trayectoActual.inicio = coord
        trayectoActual.coordenadas = [coord]
        console.log(`🚗 Inicio de trayecto en ${formatearHora(coord.timestamp)}`)
      }

      // Si está en movimiento, agregar coordenada
      if (enMovimiento) {
        trayectoActual.coordenadas.push(coord)
        trayectoActual.velocidadMax = Math.max(trayectoActual.velocidadMax, velocidad)

        // Calcular distancia
        if (trayectoActual.coordenadas.length > 1) {
          const prev = trayectoActual.coordenadas[trayectoActual.coordenadas.length - 2]
          const dist = calcularDistancia(prev.lat, prev.lng, coord.lat, coord.lng)
          trayectoActual.distancia += dist
        }
      }

      // Detectar parada (velocidad baja por tiempo prolongado)
      if (enMovimiento && velocidad <= UMBRAL_PARADA) {
        // Verificar si los siguientes 3 puntos también están parados
        const siguientesParados = coordsConVelocidad
          .slice(i, i + 3)
          .every((c) => (c.velocidad || 0) <= UMBRAL_PARADA)

        if (siguientesParados) {
          trayectoActual.fin = coord

          // Calcular velocidad promedio
          const velocidades = trayectoActual.coordenadas
            .map((c) => c.velocidad || 0)
            .filter((v) => v > 0)
          trayectoActual.velocidadPromedio =
            velocidades.length > 0 ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length : 0

          // Guardar trayecto solo si tiene suficientes coordenadas
          if (trayectoActual.coordenadas.length >= MIN_COORDS_TRAYECTO) {
            console.log(
              `🏁 Fin de trayecto en ${formatearHora(coord.timestamp)} - ${trayectoActual.distancia.toFixed(2)} km`,
            )
            trayectos.push({ ...trayectoActual })
          }

          // Resetear
          enMovimiento = false
          trayectoActual = {
            inicio: null,
            fin: null,
            coordenadas: [],
            distancia: 0,
            velocidadMax: 0,
            velocidadPromedio: 0,
          }
        }
      }
    }

    // Si quedó un trayecto activo al final
    if (enMovimiento && trayectoActual.coordenadas.length >= MIN_COORDS_TRAYECTO) {
      trayectoActual.fin = coordsConVelocidad[coordsConVelocidad.length - 1]
      const velocidades = trayectoActual.coordenadas
        .map((c) => c.velocidad || 0)
        .filter((v) => v > 0)
      trayectoActual.velocidadPromedio =
        velocidades.length > 0 ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length : 0
      trayectos.push(trayectoActual)
    }

    console.log(`✅ Total de trayectos detectados: ${trayectos.length}`)
    return trayectos
  }

  /**
   * Obtiene los trayectos de una unidad en una fecha específica
   */
  const obtenerTrayectosDia = async (unidadId, fecha) => {
    loading.value = true
    error.value = null

    try {
      const fechaStr = formatearFechaParaFirestore(fecha)

      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fechaStr)
      const rutaSnap = await getDoc(rutaRef)

      if (!rutaSnap.exists()) {
        console.log(`❌ No hay datos para ${unidadId}/${fechaStr}`)
        return {
          existenDatos: false,
          trayectos: [],
          resumen: null,
        }
      }

      const data = rutaSnap.data()
      console.log('📦 Datos de RutaDiaria:', {
        duracion: data.duracion_total_minutos,
        distancia: data.distancia_recorrida_km,
        paradas: data.paradas?.length,
        tiene_rutas_url: !!data.rutas_url,
      })

      // Descargar coordenadas
      let coordenadas = []
      if (data.rutas_url) {
        coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)
      }

      if (coordenadas.length === 0) {
        console.log('⚠️ No hay coordenadas para analizar')
        return {
          existenDatos: true,
          trayectos: [],
          resumen: generarResumenDesdeData(data, []),
        }
      }

      // Analizar trayectos
      const trayectos = analizarTrayectos(coordenadas)

      // Generar resumen
      const resumen = await generarResumenDesdeData(data, trayectos)

      console.log(`=== FIN OBTENCIÓN TRAYECTOS ===\n`)

      return {
        existenDatos: true,
        trayectos: trayectos.map((t, index) => ({
          id: `trayecto_${fechaStr}_${index}`,
          titulo: `Viaje ${index + 1}`,
          horaInicio: t.inicio.timestamp ? formatearHora(t.inicio.timestamp) : 'N/A',
          horaFin: t.fin.timestamp ? formatearHora(t.fin.timestamp) : 'N/A',
          duracion: calcularDuracionTrayecto(t.inicio.timestamp, t.fin.timestamp),
          distancia: `${t.distancia.toFixed(2)} km`,
          velocidadMax: `${Math.round(t.velocidadMax)} km/h`,
          velocidadPromedio: `${Math.round(t.velocidadPromedio)} km/h`,
          coordenadas: t.coordenadas,
          icono: 'navigation',
          color: 'green',
        })),
        resumen,
      }
    } catch (err) {
      console.error('❌ Error obteniendo trayectos:', err)
      error.value = err.message
      return {
        existenDatos: false,
        trayectos: [],
        resumen: null,
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 🆕 Geocodifica coordenadas a dirección legible usando Nominatim
   */
  const geocodificarCoordenadas = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WebGpsPerco/1.0', // Nominatim requiere User-Agent
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.display_name) {
        // Simplificar la dirección
        const address = data.address
        const partes = []

        if (address.road) partes.push(address.road)
        if (address.suburb) partes.push(address.suburb)
        if (address.city || address.town) partes.push(address.city || address.town)
        if (address.state) partes.push(address.state)

        return partes.length > 0 ? partes.join(', ') : data.display_name
      }

      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (err) {
      console.error('Error geocodificando:', err)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  /**
   * Genera el resumen del día calculando desde los trayectos
   */
  const generarResumenDesdeData = async (data, trayectos) => {
    // Calcular duración total sumando todos los trayectos
    let duracionTotalMs = 0
    let kilometrajeTotal = 0

    trayectos.forEach((t) => {
      if (t.inicio.timestamp && t.fin.timestamp) {
        const duracion =
          new Date(t.fin.timestamp).getTime() - new Date(t.inicio.timestamp).getTime()
        duracionTotalMs += duracion
      }
      kilometrajeTotal += t.distancia
    })

    let ubicacionInicio = 'Desconocido'
    let ubicacionFin = 'Desconocido'

    if (trayectos.length > 0) {
      const primerTrayecto = trayectos[0]
      const ultimoTrayecto = trayectos[trayectos.length - 1]

      // 🔥 Geocodificar ubicación de inicio
      if (primerTrayecto.inicio) {
        console.log('🌍 Geocodificando ubicación de inicio...')
        ubicacionInicio = await obtenerDireccion({
          lat: primerTrayecto.inicio.lat,
          lng: primerTrayecto.inicio.lng,
        })
        console.log('✅ Inicio:', ubicacionInicio)
      }

      // 🔥 Geocodificar ubicación de fin
      if (ultimoTrayecto.fin) {
        console.log('🌍 Geocodificando ubicación de fin...')
        ubicacionFin = await obtenerDireccion({
          lat: ultimoTrayecto.fin.lat,
          lng: ultimoTrayecto.fin.lng,
        })
        console.log('✅ Fin:', ubicacionFin)
      }
    }

    return {
      ubicacionInicio,
      ubicacionFin,
      duracionTrabajo: duracionTotalMs > 0 ? formatearDuracion(duracionTotalMs) : 'N/A',
      kilometraje: kilometrajeTotal > 0 ? `${kilometrajeTotal.toFixed(2)} km` : '0.00 km',
      numTrayectos: trayectos.length,
    }
  }

  const formatearFechaParaFirestore = (fecha) => {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  const formatearHora = (timestamp) => {
    if (!timestamp) return 'N/A'
    const fecha = new Date(timestamp)
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calcularDuracionTrayecto = (inicio, fin) => {
    if (!inicio || !fin) return 'N/A'
    const diff = new Date(fin).getTime() - new Date(inicio).getTime()
    return formatearDuracion(diff)
  }

  const formatearDuracion = (ms) => {
    if (!ms || ms < 0) return '0m'
    const minutos = Math.floor(ms / 60000)
    const horas = Math.floor(minutos / 60)
    if (horas > 0) {
      return `${horas}h ${minutos % 60}m`
    }
    return `${minutos}m`
  }

  return {
    loading,
    error,
    geocodificarCoordenadas,
    obtenerTrayectosDia,
  }
}
