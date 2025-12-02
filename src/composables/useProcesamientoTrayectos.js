// src/composables/useProcesamientoTrayectos.js
import { ref } from 'vue'
import { useRutasStorage } from './useRutasStorage'
import { useMapboxStaticImage } from './useMapboxStaticImage'
import { useGeocoding } from './useGeocoding'

export function useProcesamientoTrayectos() {
  const loading = ref(false)
  const error = ref(null)

  const { obtenerCoordenadasDesdeStorage } = useRutasStorage()
  const { generarImagenMapa, obtenerColorVehiculo } = useMapboxStaticImage()
  const { obtenerDireccionDesdeCoordenadas } = useGeocoding()

  /**
   * Obtiene las coordenadas de un trayecto desde Storage o simulación
   * @param {Object} trayecto - Objeto de trayecto
   * @returns {Promise<Array>} - Array de coordenadas { lat, lng, timestamp }
   */
  const obtenerCoordenadasTrayecto = async (trayecto) => {
    try {
      // Si es simulado y ya tiene coordenadas, usarlas
      if (trayecto._simulado && trayecto.coordenadasInicio && trayecto.coordenadasFin) {
        // Para trayectos simulados, generar puntos intermedios
        return generarPuntosIntermediosSimulados(
          trayecto.coordenadasInicio,
          trayecto.coordenadasFin,
          Math.floor(trayecto.duracion / 60000), // Minutos de duración
        )
      }

      // Si tiene datos reales con URL de rutas
      if (trayecto._raw && trayecto._raw.rutas_url) {
        const coordenadas = await obtenerCoordenadasDesdeStorage(trayecto._raw.rutas_url)
        return coordenadas
      }

      // Si no tiene coordenadas, retornar array vacío
      console.warn(`⚠️ Trayecto ${trayecto.id} no tiene coordenadas disponibles`)
      return []
    } catch (err) {
      console.error(`❌ Error obteniendo coordenadas del trayecto ${trayecto.id}:`, err)
      return []
    }
  }

  /**
   * Genera puntos intermedios para trayectos simulados
   * @param {Object} inicio - { lat, lng }
   * @param {Object} fin - { lat, lng }
   * @param {number} numPuntos - Número de puntos intermedios
   * @returns {Array} - Array de coordenadas
   */
  const generarPuntosIntermediosSimulados = (inicio, fin, numPuntos = 10) => {
    const puntos = []
    const pasos = Math.max(numPuntos, 10) // Mínimo 10 puntos

    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos
      const lat = inicio.lat + (fin.lat - inicio.lat) * t
      const lng = inicio.lng + (fin.lng - inicio.lng) * t

      // Agregar algo de variación aleatoria para que no sea una línea recta perfecta
      const variacionLat = (Math.random() - 0.5) * 0.002
      const variacionLng = (Math.random() - 0.5) * 0.002

      puntos.push({
        lat: lat + variacionLat,
        lng: lng + variacionLng,
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
      })
    }

    return puntos
  }

  /**
   * Procesa múltiples trayectos y obtiene sus coordenadas
   * @param {Array} trayectos - Array de trayectos agrupados por unidad
   * @returns {Promise<Array>} - Array de rutas { nombre, unidadId, coordenadas, color }
   */
  const procesarTrayectosParaMapa = async (trayectos) => {
    loading.value = true
    error.value = null

    try {
      const rutas = []
      let colorIndex = 0

      // Agrupar trayectos por unidad
      const trayectosPorUnidad = {}

      for (const trayecto of trayectos) {
        const unidadKey = trayecto.unidadNombre || trayecto.idUnidad || 'Sin unidad'

        if (!trayectosPorUnidad[unidadKey]) {
          trayectosPorUnidad[unidadKey] = []
        }

        trayectosPorUnidad[unidadKey].push(trayecto)
      }

      // Procesar cada unidad
      for (const [unidadNombre, trayectosUnidad] of Object.entries(trayectosPorUnidad)) {
        const todasCoordenadasUnidad = []

        // Obtener coordenadas de todos los trayectos de esta unidad
        for (const trayecto of trayectosUnidad) {
          const coordenadas = await obtenerCoordenadasTrayecto(trayecto)
          todasCoordenadasUnidad.push(...coordenadas)
        }

        // Ordenar por timestamp
        todasCoordenadasUnidad.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        if (todasCoordenadasUnidad.length > 0) {
          rutas.push({
            nombre: unidadNombre,
            unidadId: trayectosUnidad[0].idUnidad,
            coordenadas: todasCoordenadasUnidad,
            color: obtenerColorVehiculo(colorIndex),
            totalPuntos: todasCoordenadasUnidad.length,
            inicioTimestamp: todasCoordenadasUnidad[0].timestamp,
            finTimestamp: todasCoordenadasUnidad[todasCoordenadasUnidad.length - 1].timestamp,
          })

          colorIndex++
        }
      }

      console.log(
        `✅ ${rutas.length} rutas procesadas con un total de ${rutas.reduce((acc, r) => acc + r.totalPuntos, 0)} puntos`,
      )

      return rutas
    } catch (err) {
      console.error('❌ Error procesando trayectos para mapa:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Genera imagen del mapa con los trayectos
   * @param {Array} trayectos - Array de trayectos
   * @param {Object} opciones - Opciones del mapa
   * @returns {Promise<Object>} - { dataURL, rutas, blob }
   */
  const generarMapaTrayectos = async (trayectos, opciones = {}) => {
    loading.value = true
    error.value = null

    try {
      console.log('🗺️ Generando mapa de trayectos...')

      // 1. Procesar trayectos y obtener coordenadas
      const rutas = await procesarTrayectosParaMapa(trayectos)

      if (rutas.length === 0) {
        throw new Error('No hay rutas con coordenadas para mostrar en el mapa')
      }

      // 2. Generar imagen del mapa
      const { dataURL, blob } = await generarImagenMapa(rutas, {
        ancho: opciones.ancho || 1200,
        alto: opciones.alto || 800,
        mostrarMarcadores: opciones.mostrarMarcadores !== false,
        estilo: opciones.estilo || 'streets-v12',
      })

      console.log('✅ Mapa de trayectos generado exitosamente')

      return {
        dataURL,
        blob,
        rutas,
        totalRutas: rutas.length,
        totalPuntos: rutas.reduce((acc, r) => acc + r.totalPuntos, 0),
      }
    } catch (err) {
      console.error('❌ Error generando mapa de trayectos:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene estadísticas de las rutas
   * @param {Array} rutas - Array de rutas procesadas
   * @returns {Object} - Estadísticas
   */
  const obtenerEstadisticasRutas = (rutas) => {
    if (!rutas || rutas.length === 0) {
      return {
        totalRutas: 0,
        totalPuntos: 0,
        totalKilometros: 0,
        duracionTotal: 0,
      }
    }

    const totalPuntos = rutas.reduce((acc, r) => acc + r.totalPuntos, 0)

    // Calcular distancia total aproximada
    let totalKilometros = 0
    rutas.forEach((ruta) => {
      for (let i = 0; i < ruta.coordenadas.length - 1; i++) {
        const p1 = ruta.coordenadas[i]
        const p2 = ruta.coordenadas[i + 1]
        totalKilometros += calcularDistanciaEnKm(p1.lat, p1.lng, p2.lat, p2.lng)
      }
    })

    // Calcular duración total
    let duracionTotal = 0
    rutas.forEach((ruta) => {
      const inicio = new Date(ruta.inicioTimestamp)
      const fin = new Date(ruta.finTimestamp)
      duracionTotal += (fin - inicio) / (1000 * 60 * 60) // Horas
    })

    return {
      totalRutas: rutas.length,
      totalPuntos,
      totalKilometros: totalKilometros.toFixed(2),
      duracionTotal: duracionTotal.toFixed(2),
    }
  }

  /**
   * Calcula distancia entre dos puntos en kilómetros (fórmula Haversine)
   */
  const calcularDistanciaEnKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const calcularKilometrajeRecorrido = (coordenadas) => {
    if (!coordenadas || coordenadas.length < 2) {
      return 0
    }

    let kilometrajeTotal = 0

    for (let i = 0; i < coordenadas.length - 1; i++) {
      const p1 = coordenadas[i]
      const p2 = coordenadas[i + 1]

      if (p1.lat && p1.lng && p2.lat && p2.lng) {
        kilometrajeTotal += calcularDistanciaEnKm(p1.lat, p1.lng, p2.lat, p2.lng)
      }
    }

    return parseFloat(kilometrajeTotal.toFixed(2))
  }
  const calcularVelocidadPromedio = (kilometraje, duracionHoras) => {
    if (!duracionHoras || duracionHoras === 0) {
      return 0
    }

    const velocidad = kilometraje / parseFloat(duracionHoras)
    return parseFloat(velocidad.toFixed(2))
  }
  const procesarTrayectosParaPDF = async (trayectos) => {
    if (!trayectos || trayectos.length === 0) {
      return []
    }

    console.log(`🔄 Procesando ${trayectos.length} trayecto(s) para PDF...`)

    // Importar geocoding dinámicamente para evitar dependencias circulares

    const trayectosProcesados = await Promise.all(
      trayectos.map(async (trayecto) => {
        try {
          // 1. Validar que tenga coordenadas
          if (!trayecto.coordenadas || trayecto.coordenadas.length === 0) {
            console.warn(`⚠️ Trayecto ${trayecto.id} no tiene coordenadas`)
            return {
              ...trayecto,
              kilometrajeRecorrido: 0,
              velocidadPromedio: 0,
              ubicacionInicio: 'Sin coordenadas',
              ubicacionFin: 'Sin coordenadas',
            }
          }

          // 2. Calcular kilometraje recorrido
          const kilometrajeRecorrido = calcularKilometrajeRecorrido(trayecto.coordenadas)

          // 3. Calcular velocidad promedio
          const velocidadPromedio = calcularVelocidadPromedio(
            kilometrajeRecorrido,
            trayecto.duracionHoras || 0,
          )

          // 4. Geocodificar inicio
          const primeraCoord = trayecto.coordenadas[0]
          const ubicacionInicio = await obtenerDireccionDesdeCoordenadas(
            primeraCoord.lat,
            primeraCoord.lng,
          )

          // 5. Geocodificar fin
          const ultimaCoord = trayecto.coordenadas[trayecto.coordenadas.length - 1]
          const ubicacionFin = await obtenerDireccionDesdeCoordenadas(
            ultimaCoord.lat,
            ultimaCoord.lng,
          )

          console.log(
            `✅ Trayecto ${trayecto.id}: ${kilometrajeRecorrido} km, ${velocidadPromedio} km/h`,
          )

          return {
            ...trayecto,
            kilometrajeRecorrido,
            velocidadPromedio,
            ubicacionInicio: ubicacionInicio || 'Dirección no disponible',
            ubicacionFin: ubicacionFin || 'Dirección no disponible',
          }
        } catch (error) {
          console.error(`❌ Error procesando trayecto ${trayecto.id}:`, error)
          return {
            ...trayecto,
            kilometrajeRecorrido: 0,
            velocidadPromedio: 0,
            ubicacionInicio: 'Error al geocodificar',
            ubicacionFin: 'Error al geocodificar',
          }
        }
      }),
    )

    console.log(`✅ ${trayectosProcesados.length} trayecto(s) procesado(s)`)

    return trayectosProcesados
  }
  return {
    loading,
    error,
    obtenerCoordenadasTrayecto,
    procesarTrayectosParaMapa,
    generarMapaTrayectos,
    obtenerEstadisticasRutas,
    calcularKilometrajeRecorrido,
    calcularVelocidadPromedio,
    procesarTrayectosParaPDF,
  }
}
