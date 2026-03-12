import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

export function useEstadisticasUnidad() {
  const loading = ref(false)
  const error = ref(null)

  // Configuración de umbrales
  const VELOCIDAD_MINIMA_MOVIMIENTO = 5 // km/h
  const MAX_TIEMPO_ENTRE_PUNTOS = 600000 // 10 minutos en ms

  /**
   * Calcula la distancia entre dos coordenadas (fórmula Haversine)
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
    return R * c // Distancia en km
  }

  /**
   * Calcula la velocidad entre dos coordenadas
   */
  const calcularVelocidad = (coord1, coord2) => {
    const distanciaKm = calcularDistancia(coord1.lat, coord1.lng, coord2.lat, coord2.lng)
    const tiempoHoras =
      (new Date(coord2.timestamp).getTime() - new Date(coord1.timestamp).getTime()) / 3600000

    if (tiempoHoras <= 0) return 0

    return distanciaKm / tiempoHoras // km/h
  }

  /**
   * Determina el estado basándose en la velocidad
   */
  const determinarEstado = (velocidad) => {
    if (velocidad >= VELOCIDAD_MINIMA_MOVIMIENTO) {
      return 'movimiento'
    } else if (velocidad > 0) {
      return 'detenido'
    } else {
      return 'detenido'
    }
  }

  /**
   * Descarga las coordenadas del archivo JSON en Firebase Storage
   */
  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) {
      console.warn(' No hay URL de rutas')
      return []
    }

    try {
      const response = await fetch(rutasUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // El archivo puede tener diferentes estructuras
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

      // Normalizar formato
      const coordenadasNormalizadas = coordenadas
        .filter((coord) => {
          const lat = coord.lat || coord.latitude
          const lng = coord.lng || coord.longitude || coord.lon
          return lat && lng
        })
        .map((coord) => ({
          lat: coord.lat || coord.latitude,
          lng: coord.lng || coord.longitude || coord.lon,
          timestamp: coord.timestamp || coord.time || null,
        }))

      return coordenadasNormalizadas
    } catch (err) {
      console.error(' Error descargando coordenadas del Storage:', err)
      return []
    }
  }

  /**
   *  Calcula el tiempo de conducción analizando coordenadas con velocidad
   */
  const calcularTiempoDesdeCoordenadasConVelocidad = (coordenadas) => {
    // Filtrar y ordenar coordenadas válidas
    const coordsValidas = coordenadas
      .filter((coord) => coord.timestamp && !isNaN(new Date(coord.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (coordsValidas.length < 2) {
      return {
        tiempoTotal: 0,
        tiempoMovimiento: 0,
        tiempoDetenido: 0,
        desglose: [],
      }
    }

    let tiempoMovimiento = 0
    let tiempoDetenido = 0
    const desglose = []

    // Analizar cada segmento entre coordenadas
    for (let i = 1; i < coordsValidas.length; i++) {
      const coordActual = coordsValidas[i]
      const coordAnterior = coordsValidas[i - 1]

      const timestampActual = new Date(coordActual.timestamp).getTime()
      const timestampAnterior = new Date(coordAnterior.timestamp).getTime()
      const diferenciaTiempo = timestampActual - timestampAnterior

      // Validar que la diferencia sea razonable
      if (diferenciaTiempo <= 0 || diferenciaTiempo > MAX_TIEMPO_ENTRE_PUNTOS) {
        continue
      }

      // Calcular velocidad
      const velocidad = calcularVelocidad(coordAnterior, coordActual)
      const estado = determinarEstado(velocidad)

      // Acumular tiempo según estado
      if (estado === 'movimiento') {
        tiempoMovimiento += diferenciaTiempo
      } else if (estado === 'detenido') {
        tiempoDetenido += diferenciaTiempo
      }

      desglose.push({
        desde: new Date(coordAnterior.timestamp),
        hasta: new Date(coordActual.timestamp),
        duracion: diferenciaTiempo,
        velocidad: velocidad.toFixed(2),
        estado,
      })
    }

    const tiempoTotal = tiempoMovimiento + tiempoDetenido

    return {
      tiempoTotal,
      tiempoMovimiento,
      tiempoDetenido,
      desglose,
    }
  }

  /**
   *  Calcula el tiempo de conducción HOY
   */
  const calcularTiempoConductionHoy = async (unidadId) => {
    try {
      const hoy = new Date()
      const fechaStr = formatearFechaParaFirestore(hoy)

      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fechaStr)
      const rutaSnap = await getDoc(rutaRef)

      if (!rutaSnap.exists()) {
        return {
          tiempoTotal: 0,
          tiempoMovimiento: 0,
          tiempoDetenido: 0,
        }
      }

      const data = rutaSnap.data()

      // Descargar coordenadas desde Storage
      if (data.rutas_url) {
        const coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)

        if (coordenadas.length > 0) {
          const resultado = calcularTiempoDesdeCoordenadasConVelocidad(coordenadas)

          return resultado
        }
      }

      // Si no hay coordenadas, intentar usar campos del documento
      if (data.duracion_total_minutos) {
        const tiempoMs = data.duracion_total_minutos * 60 * 1000
        return {
          tiempoTotal: tiempoMs,
          tiempoMovimiento: tiempoMs,
          tiempoDetenido: 0,
        }
      }

      return {
        tiempoTotal: 0,
        tiempoMovimiento: 0,
        tiempoDetenido: 0,
      }
    } catch (err) {
      console.error(' Error calculando tiempo de conducción:', err)
      return {
        tiempoTotal: 0,
        tiempoMovimiento: 0,
        tiempoDetenido: 0,
      }
    }
  }

  /**
   * Obtiene estadísticas completas de una unidad
   */
  const obtenerEstadisticas = async (unidadId) => {
    loading.value = true
    error.value = null

    try {
      const resultado = await calcularTiempoConductionHoy(unidadId)

      return {
        tiempoConductionHoy:
          resultado.tiempoTotal > 0 ? formatearDuracion(resultado.tiempoTotal) : '0h 0m',
        tiempoConductionHoyMs: resultado.tiempoTotal,
        tiempoMovimiento: formatearDuracion(resultado.tiempoMovimiento),
        tiempoDetenido: formatearDuracion(resultado.tiempoDetenido),
      }
    } catch (err) {
      console.error(' Error obteniendo estadísticas:', err)
      error.value = err.message

      return {
        tiempoConductionHoy: 'N/A',
        tiempoConductionHoyMs: 0,
        tiempoMovimiento: 'N/A',
        tiempoDetenido: 'N/A',
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Calcula la duración del estado actual
   * Necesita timestamp_cambio_estado del documento principal de la unidad
   */
  const calcularDuracionEstado = (timestampCambioEstado, timestampActual) => {
    if (!timestampCambioEstado || !timestampActual) {
      return 'N/A'
    }

    const diff = timestampActual - timestampCambioEstado

    if (diff < 0) {
      return 'N/A'
    }

    if (diff > 86400000) {
      // Más de 24 horas
      return 'Más de 1 día'
    }

    return formatearDuracion(diff)
  }

  /**
   * Formatea una duración en milisegundos a formato legible
   */
  const formatearDuracion = (ms) => {
    if (!ms || ms < 0) return '0m'

    const segundos = Math.floor(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)

    if (dias > 0) {
      return `${dias}d ${horas % 24}h`
    } else if (horas > 0) {
      return `${horas}h ${minutos % 60}m`
    } else if (minutos > 0) {
      return `${minutos}m`
    } else {
      return `${segundos}s`
    }
  }

  /**
   * Formatea timestamp a fecha legible
   */
  const formatearFechaHora = (timestamp) => {
    if (!timestamp) return 'N/A'

    const fecha = new Date(timestamp)

    if (isNaN(fecha.getTime())) {
      return 'N/A'
    }

    return fecha.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  /**
   * Formatea fecha para Firestore (YYYY-MM-DD)
   */
  const formatearFechaParaFirestore = (fecha) => {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  return {
    loading,
    error,
    obtenerEstadisticas,
    calcularDuracionEstado,
    formatearDuracion,
    formatearFechaHora,
  }
}
