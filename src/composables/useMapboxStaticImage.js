// composables/useMapboxStaticImage.js
// 🗺️ GENERADOR DE MAPAS ESTÁTICOS USANDO MAPBOX STATIC IMAGES API
// Con algoritmo Douglas-Peucker para simplificación inteligente

/**
 * ============================================
 * CONFIGURACIÓN
 * ============================================
 */
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'
const MAPBOX_STYLE = 'streets-v12' // streets-v12, satellite-v9, outdoors-v12, etc.
const MAP_WIDTH = 1200
const MAP_HEIGHT = 800
const MAP_RETINA = '@2x' // Alta resolución

/**
 * ============================================
 * COLORES PARA TRAYECTOS
 * ============================================
 */
const COLORES_TRAYECTOS = [
  'f44336', // Rojo
  '2196F3', // Azul
  '4CAF50', // Verde
  'FF9800', // Naranja
  '9C27B0', // Púrpura
  'FFEB3B', // Amarillo
  '00BCD4', // Cyan
  'FF5722', // Naranja profundo
]

/**
 * ============================================
 * ALGORITMO DOUGLAS-PEUCKER
 * ============================================
 */

/**
 * Calcula la distancia perpendicular de un punto a una línea
 * @param {Object} point - Punto a evaluar {lat, lng}
 * @param {Object} lineStart - Punto inicial de la línea {lat, lng}
 * @param {Object} lineEnd - Punto final de la línea {lat, lng}
 * @returns {Number} Distancia perpendicular
 */
function distanciaPerpendicularPunto(point, lineStart, lineEnd) {
  const { lat: x0, lng: y0 } = point
  const { lat: x1, lng: y1 } = lineStart
  const { lat: x2, lng: y2 } = lineEnd

  // Fórmula de distancia perpendicular punto-línea
  const numerador = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
  const denominador = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2))

  return denominador === 0 ? 0 : numerador / denominador
}

/**
 * Algoritmo Douglas-Peucker para simplificar trayectos
 * Elimina puntos en líneas rectas, conserva puntos en curvas
 *
 * @param {Array} coordenadas - Array de {lat, lng, timestamp}
 * @param {Number} tolerancia - Tolerancia en grados (más alto = más simplificación)
 * @returns {Array} Coordenadas simplificadas
 */
function douglasPeucker(coordenadas, tolerancia = 0.0001) {
  if (coordenadas.length <= 2) {
    return coordenadas
  }

  let maxDistancia = 0
  let indiceMaxDistancia = 0
  const fin = coordenadas.length - 1

  // Encontrar el punto más alejado de la línea entre inicio y fin
  for (let i = 1; i < fin; i++) {
    const distancia = distanciaPerpendicularPunto(coordenadas[i], coordenadas[0], coordenadas[fin])

    if (distancia > maxDistancia) {
      maxDistancia = distancia
      indiceMaxDistancia = i
    }
  }

  // Si el punto más alejado está por encima de la tolerancia, dividir
  if (maxDistancia > tolerancia) {
    // Dividir en dos segmentos y simplificar recursivamente
    const resultados1 = douglasPeucker(coordenadas.slice(0, indiceMaxDistancia + 1), tolerancia)
    const resultados2 = douglasPeucker(coordenadas.slice(indiceMaxDistancia), tolerancia)

    // Combinar resultados (sin duplicar el punto del medio)
    return resultados1.slice(0, -1).concat(resultados2)
  } else {
    // Todos los puntos están cerca de la línea, solo conservar inicio y fin
    return [coordenadas[0], coordenadas[fin]]
  }
}

/**
 * Simplifica coordenadas de manera inteligente
 * Usa Douglas-Peucker + límite de puntos máximo
 *
 * @param {Array} coordenadas - Coordenadas originales
 * @param {Number} maxPuntos - Límite máximo de puntos (default: 100)
 * @returns {Array} Coordenadas simplificadas
 */
function simplificarCoordenadasInteligente(coordenadas, maxPuntos = 100) {
  if (!coordenadas || coordenadas.length === 0) {
    return []
  }

  if (coordenadas.length <= maxPuntos) {
    console.log(`  ℹ️ Trayecto con ${coordenadas.length} puntos (no requiere simplificación)`)
    return coordenadas
  }

  console.log(`  🔄 Simplificando ${coordenadas.length} puntos...`)

  // Calcular tolerancia inicial basada en el área del trayecto
  const lats = coordenadas.map((c) => c.lat)
  const lngs = coordenadas.map((c) => c.lng)
  const rangoLat = Math.max(...lats) - Math.min(...lats)
  const rangoLng = Math.max(...lngs) - Math.min(...lngs)
  const area = rangoLat * rangoLng

  // Tolerancia adaptativa según el área
  let tolerancia = area * 0.001 // Empezar con 0.1% del área
  let simplificadas = douglasPeucker(coordenadas, tolerancia)

  // Si aún hay demasiados puntos, aumentar tolerancia iterativamente
  let intentos = 0
  const maxIntentos = 10

  while (simplificadas.length > maxPuntos && intentos < maxIntentos) {
    tolerancia *= 1.5 // Aumentar tolerancia 50%
    simplificadas = douglasPeucker(coordenadas, tolerancia)
    intentos++
  }

  // Si después de todo aún hay demasiados puntos, aplicar muestreo uniforme
  if (simplificadas.length > maxPuntos) {
    console.log(`  ⚠️ Aplicando muestreo adicional...`)
    const paso = Math.ceil(simplificadas.length / maxPuntos)
    const muestreadas = [simplificadas[0]] // Siempre incluir inicio

    for (let i = paso; i < simplificadas.length - 1; i += paso) {
      muestreadas.push(simplificadas[i])
    }

    muestreadas.push(simplificadas[simplificadas.length - 1]) // Siempre incluir fin
    simplificadas = muestreadas
  }

  const reduccion = ((1 - simplificadas.length / coordenadas.length) * 100).toFixed(1)
  console.log(
    `  ✅ ${coordenadas.length} → ${simplificadas.length} puntos (${reduccion}% reducción)`,
  )

  return simplificadas
}

/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

/**
 * Prepara los datos de trayectos para el mapa
 */
function prepararDatosTrayectos(registros) {
  const trayectosPorVehiculo = {}

  registros.forEach((registro) => {
    const vehiculoId = registro.vehiculoId || registro.unidadId || registro.idUnidad
    const vehiculoNombre =
      registro.vehiculo || registro.unidad || registro.unidadNombre || 'Sin nombre'

    if (!trayectosPorVehiculo[vehiculoId]) {
      trayectosPorVehiculo[vehiculoId] = {
        vehiculoId,
        vehiculoNombre,
        placa: registro.placa || '',
        coordenadas: [],
      }
    }

    // Si el registro tiene array de coordenadas, usarlo
    if (
      registro.coordenadas &&
      Array.isArray(registro.coordenadas) &&
      registro.coordenadas.length > 0
    ) {
      console.log(`  📍 Agregando ${registro.coordenadas.length} coordenadas de ${vehiculoNombre}`)
      trayectosPorVehiculo[vehiculoId].coordenadas.push(...registro.coordenadas)
    }
    // Fallback: si solo tiene lat/lng individuales
    else if (registro.latitud && registro.longitud) {
      trayectosPorVehiculo[vehiculoId].coordenadas.push({
        lat: parseFloat(registro.latitud),
        lng: parseFloat(registro.longitud),
        timestamp: registro.fecha || registro.timestamp,
      })
    }
  })

  // Convertir a array y ordenar coordenadas
  const trayectos = Object.values(trayectosPorVehiculo)
    .filter((t) => t.coordenadas.length > 0)
    .map((trayecto) => {
      // Ordenar por timestamp
      const coordenadasOrdenadas = trayecto.coordenadas.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return timeA - timeB
      })

      // 🔥 SIMPLIFICAR con Douglas-Peucker (máximo 80 puntos por trayecto)
      const coordenadasSimplificadas = simplificarCoordenadasInteligente(coordenadasOrdenadas, 80)

      return {
        ...trayecto,
        coordenadas: coordenadasSimplificadas,
      }
    })

  console.log(`✅ Trayectos preparados: ${trayectos.length}`)
  trayectos.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.vehiculoNombre}: ${t.coordenadas.length} puntos`)
  })

  return trayectos
}

/**
 * Calcula el bounding box de todos los trayectos
 */

/**
 * Genera la URL del mapa estático de Mapbox con trayectos
 */
function generarURLMapaTrayectos(trayectos, config = {}) {
  if (!trayectos || trayectos.length === 0) {
    console.warn('⚠️ No hay trayectos para generar mapa')
    return null
  }

  const { mostrarPins = true, padding = 50 } = config

  console.log('🗺️ Generando URL de mapa...')
  console.log(`   Trayectos: ${trayectos.length}`)

  // Construir overlays (paths + pins)
  const overlays = []

  trayectos.forEach((trayecto, index) => {
    const color = COLORES_TRAYECTOS[index % COLORES_TRAYECTOS.length]
    const coordenadas = trayecto.coordenadas

    if (coordenadas.length === 0) return

    // 1. Path (línea del trayecto)
    const pathCoords = coordenadas.map((c) => `${c.lng},${c.lat}`).join(',')

    overlays.push(`path-5+${color}-0.8(${pathCoords})`)

    // 2. Pin de inicio (verde)
    if (mostrarPins) {
      const inicio = coordenadas[0]
      overlays.push(`pin-s-circle+4CAF50(${inicio.lng},${inicio.lat})`)
    }

    // 3. Pin de fin (color del trayecto)
    if (mostrarPins) {
      const fin = coordenadas[coordenadas.length - 1]
      overlays.push(`pin-s-square+${color}(${fin.lng},${fin.lat})`)
    }
  })

  // Construir URL
  const baseURL = `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static`
  const overlaysStr = overlays.join(',')
  const dimensions = `${MAP_WIDTH}x${MAP_HEIGHT}${MAP_RETINA}`

  const url = `${baseURL}/${overlaysStr}/auto/${dimensions}?padding=${padding}&access_token=${MAPBOX_TOKEN}`

  console.log(`✅ URL generada (longitud: ${url.length} caracteres)`)

  if (url.length > 8000) {
    console.warn('⚠️ URL muy larga, puede fallar. Considera reducir más los puntos.')
  }

  return url
}

/**
 * Descarga la imagen del mapa y la convierte a Base64
 */
async function descargarImagenMapaBase64(url) {
  try {
    console.log('📥 Descargando imagen del mapa...')

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error descargando imagen del mapa:', error)
    throw error
  }
}

/**
 * ============================================
 * COMPOSABLE PRINCIPAL
 * ============================================
 */
export function useMapboxStaticImage() {
  /**
   * Genera un mapa estático con trayectos
   */
  const generarMapaTrayectos = async (registros, config = {}) => {
    try {
      console.log('🗺️ Iniciando generación de mapa de trayectos')
      console.log(`   Registros recibidos: ${registros.length}`)

      // 1. Preparar trayectos
      const trayectos = prepararDatosTrayectos(registros)

      if (trayectos.length === 0) {
        console.warn('⚠️ No hay trayectos válidos para mostrar')
        return null
      }

      // 2. Generar URL
      const url = generarURLMapaTrayectos(trayectos, config)

      if (!url) {
        return null
      }

      // 3. Descargar imagen
      const imagenBase64 = await descargarImagenMapaBase64(url)

      console.log('✅ Mapa generado exitosamente')

      return {
        imagenBase64,
        trayectos,
        url,
      }
    } catch (error) {
      console.error('❌ Error generando mapa:', error)
      throw error
    }
  }

  const generarLeyendaMapa = (trayectos) => {
    const nombresColores = {
      f44336: 'Rojo',
      '2196F3': 'Azul',
      '4CAF50': 'Verde',
      FF9800: 'Naranja',
      '9C27B0': 'Púrpura',
      FFEB3B: 'Amarillo',
      '00BCD4': 'Cyan',
      FF5722: 'Naranja profundo',
    }

    const leyendas = trayectos.map((t, index) => {
      const colorHex = COLORES_TRAYECTOS[index % COLORES_TRAYECTOS.length]
      const nombreColor = nombresColores[colorHex] || colorHex
      return `${nombreColor}: ${t.vehiculoNombre} (${t.coordenadas.length} puntos)`
    })

    return leyendas.join(' | ')
  }

  return {
    generarMapaTrayectos,
    prepararDatosTrayectos,
    generarURLMapaTrayectos,
    descargarImagenMapaBase64,
    generarLeyendaMapa,
  }
}
