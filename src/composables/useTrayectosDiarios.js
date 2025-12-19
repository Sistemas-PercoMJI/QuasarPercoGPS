// src/composables/useTrayectosDiarios.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

export function useTrayectosDiarios() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Descarga coordenadas desde Storage
   */
  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) return []

    try {
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

      return coordenadas
        .filter((coord) => {
          const lat = coord.lat || coord.latitude
          const lng = coord.lng || coord.longitude || coord.lon
          return lat && lng
        })
        .map((coord) => ({
          lat: coord.lat || coord.latitude,
          lng: coord.lng || coord.longitude || coord.lon,
          timestamp: coord.timestamp || coord.time || null,
          velocidad: coord.velocidad || coord.speed || 0,
          estado: coord.estado || coord.status || 'desconocido',
        }))
    } catch (err) {
      console.error('Error descargando coordenadas:', err)
      return []
    }
  }

  /**
   * Analiza coordenadas y genera trayectos (viajes separados por paradas)
   */
  const analizarTrayectos = (coordenadas) => {
    if (!coordenadas || coordenadas.length === 0) return []

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
    //const TIEMPO_MIN_PARADA = 5 * 60 * 1000 // 5 minutos en ms

    for (let i = 0; i < coordenadas.length; i++) {
      const coord = coordenadas[i]
      const velocidad = coord.velocidad || 0

      // Detectar inicio de movimiento
      if (!enMovimiento && velocidad > UMBRAL_PARADA) {
        enMovimiento = true
        trayectoActual.inicio = coord
        trayectoActual.coordenadas = [coord]
      }

      // Si está en movimiento, agregar coordenada
      if (enMovimiento) {
        trayectoActual.coordenadas.push(coord)
        trayectoActual.velocidadMax = Math.max(trayectoActual.velocidadMax, velocidad)

        // Calcular distancia (aproximación simple)
        if (trayectoActual.coordenadas.length > 1) {
          const prev = trayectoActual.coordenadas[trayectoActual.coordenadas.length - 2]
          const dist = calcularDistancia(prev.lat, prev.lng, coord.lat, coord.lng)
          trayectoActual.distancia += dist
        }
      }

      // Detectar parada (velocidad baja por tiempo prolongado)
      if (enMovimiento && velocidad <= UMBRAL_PARADA) {
        const siguientesParados = coordenadas
          .slice(i, i + 5)
          .every((c) => (c.velocidad || 0) <= UMBRAL_PARADA)

        if (siguientesParados) {
          trayectoActual.fin = coord

          // Calcular velocidad promedio
          const velocidades = trayectoActual.coordenadas
            .map((c) => c.velocidad || 0)
            .filter((v) => v > 0)
          trayectoActual.velocidadPromedio =
            velocidades.length > 0 ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length : 0

          // Guardar trayecto
          if (trayectoActual.coordenadas.length > 5) {
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
    if (enMovimiento && trayectoActual.coordenadas.length > 5) {
      trayectoActual.fin = coordenadas[coordenadas.length - 1]
      const velocidades = trayectoActual.coordenadas
        .map((c) => c.velocidad || 0)
        .filter((v) => v > 0)
      trayectoActual.velocidadPromedio =
        velocidades.length > 0 ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length : 0
      trayectos.push(trayectoActual)
    }

    return trayectos
  }

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
   * Obtiene los trayectos de una unidad en una fecha específica
   */
  const obtenerTrayectosDia = async (unidadId, fecha) => {
    loading.value = true
    error.value = null

    try {
      const fechaStr = formatearFechaParaFirestore(fecha)
      console.log(`📊 Buscando trayectos para unidad ${unidadId} en fecha ${fechaStr}`)

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
      console.log('📦 Datos encontrados:', data)

      // Descargar coordenadas
      let coordenadas = []
      if (data.rutas_url) {
        coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)
      } else if (data.nuevaCoordenada) {
        coordenadas = [data.nuevaCoordenada]
      }

      console.log(`✅ ${coordenadas.length} coordenadas descargadas`)

      // Analizar trayectos
      const trayectos = analizarTrayectos(coordenadas)
      console.log(`✅ ${trayectos.length} trayectos detectados`)

      // Generar resumen
      const resumen = {
        ubicacionInicio: data.ubicacion_inicio || 'Desconocido',
        ubicacionFin: data.ubicacion_fin || 'Desconocido',
        duracionTrabajo: data.duracion_total_minutos
          ? formatearDuracion(data.duracion_total_minutos * 60 * 1000)
          : 'N/A',
        kilometraje: data.distancia_recorrida_km
          ? `${parseFloat(data.distancia_recorrida_km).toFixed(2)} km`
          : 'N/A',
        numTrayectos: trayectos.length,
        numParadas: data.paradas?.length || 0,
      }

      return {
        existenDatos: true,
        trayectos: trayectos.map((t, index) => ({
          id: `trayecto_${index}`,
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
      console.error('Error obteniendo trayectos:', err)
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
    obtenerTrayectosDia,
  }
}
