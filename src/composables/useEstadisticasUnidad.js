import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

export function useEstadisticasUnidad() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * 🆕 Descarga las coordenadas del archivo JSON en Firebase Storage
   * (Reutilizando lógica de useReportesTrayectos.js)
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
          estado: coord.estado || coord.status || 'desconocido',
        }))

      return coordenadasNormalizadas
    } catch (err) {
      console.error('Error descargando coordenadas del Storage:', err)
      return []
    }
  }

  /**
   * 🔥 Calcula el tiempo de conducción HOY analizando coordenadas
   */
  const calcularTiempoConductionHoy = async (unidadId) => {
    try {
      const hoy = new Date()
      const fechaStr = formatearFechaParaFirestore(hoy)

      console.log(`📊 Buscando RutaDiaria para unidad ${unidadId} en fecha ${fechaStr}`)

      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fechaStr)
      const rutaSnap = await getDoc(rutaRef)

      if (!rutaSnap.exists()) {
        console.log(`❌ No hay datos de RutaDiaria para ${unidadId}/${fechaStr}`)
        return 0
      }

      const data = rutaSnap.data()
      console.log('📦 Datos de RutaDiaria:', data)

      // 🔥 OPCIÓN 1: Si tienes coordenadas en Storage
      if (data.rutas_url) {
        console.log('🌐 Descargando coordenadas desde Storage...')
        const coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)

        if (coordenadas.length > 0) {
          console.log(`✅ Descargadas ${coordenadas.length} coordenadas`)
          return calcularTiempoDesdeCoordenadasConEstado(coordenadas)
        }
      }

      // 🔥 OPCIÓN 2: Si está en el campo duracion_total_minutos
      if (data.duracion_total_minutos) {
        console.log(`✅ Usando duracion_total_minutos: ${data.duracion_total_minutos}`)
        return data.duracion_total_minutos * 60 * 1000 // Convertir a ms
      }

      // 🔥 OPCIÓN 3: Si tienes fecha_hora_inicio y fecha_hora_fin
      if (data.fecha_hora_inicio && data.fecha_hora_fin) {
        const inicio = data.fecha_hora_inicio.toDate?.() || new Date(data.fecha_hora_inicio)
        const fin = data.fecha_hora_fin.toDate?.() || new Date(data.fecha_hora_fin)
        const duracionMs = fin.getTime() - inicio.getTime()

        console.log(`✅ Calculado desde inicio/fin: ${formatearDuracion(duracionMs)}`)
        return duracionMs
      }

      console.log('⚠️ No se encontró forma de calcular duración')
      return 0
    } catch (err) {
      console.error('Error calculando tiempo de conducción:', err)
      return 0
    }
  }

  /**
   * 🆕 Calcula el tiempo total filtrando por estado
   */
  const calcularTiempoDesdeCoordenadasConEstado = (coordenadas) => {
    // Filtrar solo coordenadas con timestamp válido
    const coordsValidas = coordenadas
      .filter((coord) => coord.timestamp && !isNaN(new Date(coord.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (coordsValidas.length < 2) {
      console.log('⚠️ No hay suficientes coordenadas con timestamp')
      return 0
    }

    // 🔥 CALCULAR TIEMPO SOLO EN MOVIMIENTO O DETENIDO
    let tiempoTotal = 0

    for (let i = 1; i < coordsValidas.length; i++) {
      const coordActual = coordsValidas[i]
      const coordAnterior = coordsValidas[i - 1]

      const timestampActual = new Date(coordActual.timestamp).getTime()
      const timestampAnterior = new Date(coordAnterior.timestamp).getTime()

      const diferencia = timestampActual - timestampAnterior

      // Solo contar si la diferencia es razonable (< 10 minutos entre puntos)
      if (diferencia > 0 && diferencia < 600000) {
        // Si tiene estado, solo contar movimiento/detenido
        if (coordActual.estado) {
          if (coordActual.estado === 'movimiento' || coordActual.estado === 'detenido') {
            tiempoTotal += diferencia
          }
        } else {
          // Si no hay estado, contar todo
          tiempoTotal += diferencia
        }
      }
    }

    console.log(`✅ Tiempo total calculado desde coordenadas: ${formatearDuracion(tiempoTotal)}`)
    return tiempoTotal
  }

  /**
   * Obtiene estadísticas completas de una unidad
   */
  const obtenerEstadisticas = async (unidadId) => {
    loading.value = true
    error.value = null

    try {
      console.log(`\n📊 === CALCULANDO ESTADÍSTICAS PARA UNIDAD ${unidadId} ===`)

      const tiempoHoy = await calcularTiempoConductionHoy(unidadId)

      console.log(`✅ RESULTADO: Tiempo hoy = ${formatearDuracion(tiempoHoy)}`)
      console.log(`=== FIN CÁLCULO ===\n`)

      return {
        tiempoConductionHoy: tiempoHoy > 0 ? formatearDuracion(tiempoHoy) : '0h 0m',
        tiempoConductionHoyMs: tiempoHoy,
      }
    } catch (err) {
      console.error('❌ Error obteniendo estadísticas:', err)
      error.value = err.message

      return {
        tiempoConductionHoy: 'N/A',
        tiempoConductionHoyMs: 0,
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Calcula la duración del estado actual
   */
  const calcularDuracionEstado = (timestampUltimaActualizacion) => {
    if (!timestampUltimaActualizacion) {
      return 'N/A'
    }

    const ahora = Date.now()
    const diff = ahora - timestampUltimaActualizacion

    if (diff > 86400000) {
      return 'Desactualizado'
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

    if (horas > 0) {
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
