// composables/useMapboxStaticImage.js
//  GENERADOR DE MAPAS ESTÁTICOS USANDO MAPBOX STATIC IMAGES API
// Con algoritmo Douglas-Peucker para simplificación inteligente

/**
 * ============================================
 * CONFIGURACIÓN
 * ============================================
 */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
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
  'e74c3c', // Rojo vivo
  '2980b9', // Azul fuerte
  '27ae60', // Verde fuerte
  'f39c12', // Amarillo oscuro
  '8e44ad', // Púrpura
  '16a085', // Verde azulado
  'd35400', // Naranja quemado
  '2c3e50', // Azul oscuro
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
function simplificarCoordenadasInteligente(coordenadas, maxPuntos = 100, protegidos = new Set()) {
  if (!coordenadas || coordenadas.length === 0) {
    return []
  }

  if (coordenadas.length <= maxPuntos) {
    return coordenadas
  }

  // Calcular tolerancia inicial basada en el área del trayecto
  const lats = coordenadas.map((c) => c.lat)
  const lngs = coordenadas.map((c) => c.lng)
  const rangoLat = Math.max(...lats) - Math.min(...lats)
  const rangoLng = Math.max(...lngs) - Math.min(...lngs)
  const area = rangoLat * rangoLng

  // Tolerancia adaptativa según el área
  let tolerancia = area * 0.0003 // Empezar con 0.1% del área
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
    const paso = Math.ceil(simplificadas.length / maxPuntos)
    const muestreadas = [simplificadas[0]] // Siempre incluir inicio

    for (let i = paso; i < simplificadas.length - 1; i += paso) {
      muestreadas.push(simplificadas[i])
    }

    coordenadas.forEach((punto, idx) => {
      if (protegidos.has(idx) && !muestreadas.includes(punto)) {
        muestreadas.push(punto)
      }
    })
    muestreadas.push(simplificadas[simplificadas.length - 1])
    // Re-ordenar por timestamp para que la línea quede correcta
    muestreadas.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    simplificadas = muestreadas
  }

  const reduccion = ((1 - simplificadas.length / coordenadas.length) * 100).toFixed(1)
  console.log(`   ${coordenadas.length} → ${simplificadas.length} puntos (${reduccion}% reducción)`)

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
/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

function prepararDatosTrayectos(registros) {
  const trayectos = registros
    .filter((registro) => registro.coordenadas && registro.coordenadas.length > 0)
    .map((registro, index) => {
      const coordenadasOrdenadas = [...registro.coordenadas].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return timeA - timeB
      })

      // 🆕 Solo analizar gaps entre coords con ignición ON
      const coordsRelevantes = coordenadasOrdenadas.filter(
        (c) => c.ignicion === true || c.velocidad > 0,
      )

      const pinsConexion = []
      const indicesProtegidos = new Set([0, coordenadasOrdenadas.length - 1])

      for (let i = 1; i < coordsRelevantes.length; i++) {
        const anterior = coordsRelevantes[i - 1]
        const actual = coordsRelevantes[i]
        const diffSegundos = (new Date(actual.timestamp) - new Date(anterior.timestamp)) / 1000
        const dLat = ((actual.lat - anterior.lat) * Math.PI) / 180
        const dLng = ((actual.lng - anterior.lng) * Math.PI) / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((anterior.lat * Math.PI) / 180) *
            Math.cos((actual.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2
        const distanciaKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        if (diffSegundos > 120 && distanciaKm > 0.5) {
          // Encontrar índices en coordenadasOrdenadas para protegerlos
          const idxAnterior = coordenadasOrdenadas.indexOf(anterior)
          const idxActual = coordenadasOrdenadas.indexOf(actual)
          if (idxAnterior !== -1) {
            // Proteger 2 puntos antes y después del gap
            for (
              let j = Math.max(0, idxAnterior - 2);
              j <= Math.min(coordenadasOrdenadas.length - 1, idxAnterior + 2);
              j++
            ) {
              indicesProtegidos.add(j)
            }
          }
          if (idxActual !== -1) {
            for (
              let j = Math.max(0, idxActual - 2);
              j <= Math.min(coordenadasOrdenadas.length - 1, idxActual + 2);
              j++
            ) {
              indicesProtegidos.add(j)
            }
          }
          pinsConexion.push({ lat: anterior.lat, lng: anterior.lng, tipo: 'perdida' })
          pinsConexion.push({ lat: actual.lat, lng: actual.lng, tipo: 'reconexion' })
        }
      }

      const maxPuntosPorViaje = registros.length > 4 ? 80 : 120
      const coordenadasSimplificadas = simplificarCoordenadasInteligente(
        coordenadasOrdenadas,
        maxPuntosPorViaje,
        indicesProtegidos,
      )
      console.log('pinsConexion detectados:', pinsConexion.length, pinsConexion)
      console.log('indicesProtegidos:', [...indicesProtegidos])
      console.log('coords totales antes de simplificar:', coordenadasOrdenadas.length)
      console.log('coords después de simplificar:', coordenadasSimplificadas.length)
      // Verificar si los puntos del gap quedaron incluidos
      const pin1 = coordenadasSimplificadas.find((c) => c.lat === 32.4918866)
      const pin2 = coordenadasSimplificadas.find((c) => c.lat === 32.4942583)
      const pin3 = coordenadasSimplificadas.find((c) => c.lat === 32.49688)
      const pin4 = coordenadasSimplificadas.find((c) => c.lat === 32.497755)
      console.log(
        'pin1 en simplificadas:',
        !!pin1,
        'pin2:',
        !!pin2,
        'pin3:',
        !!pin3,
        'pin4:',
        !!pin4,
      )
      return {
        vehiculoId: registro.idUnidad || registro.vehiculoId,
        vehiculoNombre: `${registro.unidadNombre || 'Sin nombre'} - Viaje ${index + 1}`,
        placa: registro.Placa || registro.placa || '',
        coordenadas: coordenadasSimplificadas,
        pinsConexion,
      }
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
    console.warn(' No hay trayectos para generar mapa')
    return null
  }

  const { mostrarPins = true } = config

  const padding = config.padding ?? 60

  // Construir overlays (paths + pins)
  const overlays = []

  trayectos.forEach((trayecto, index) => {
    const color = COLORES_TRAYECTOS[index % COLORES_TRAYECTOS.length]
    const coordenadas = trayecto.coordenadas

    if (coordenadas.length === 0) return

    const todasIguales = coordenadas.every(
      (c) => c.lat === coordenadas[0].lat && c.lng === coordenadas[0].lng,
    )

    if (coordenadas.length < 2 || todasIguales) {
      if (mostrarPins) {
        const tamano = index === 0 ? 'pin-l' : 'pin-s'
        overlays.push(
          `${tamano}-${index + 1}+${color}(${coordenadas[0].lng.toFixed(6)},${coordenadas[0].lat.toFixed(6)})`,
        )
      }
      return
    }

    // 1. GeoJSON LineString (en lugar de path)
    const geojson = {
      type: 'Feature',
      properties: {
        stroke: `#${color}`,
        'stroke-width': 3,
        'stroke-opacity': 1,
      },
      geometry: {
        type: 'LineString',
        coordinates: coordenadas.map((c) => [c.lng, c.lat]),
      },
    }

    const geojsonStr = encodeURIComponent(JSON.stringify(geojson))

    overlays.push(`geojson(${geojsonStr})`)

    // 2. Pin de inicio (verde)
    if (mostrarPins) {
      const inicio = coordenadas[0]
      const tamano = index === 0 ? 'pin-l' : 'pin-s'
      overlays.push(
        `${tamano}-${index + 1}+${color}(${inicio.lng.toFixed(6)},${inicio.lat.toFixed(6)})`,
      )
    }

    // Pin de fin (cuadrado del mismo color)
    if (mostrarPins) {
      const fin = coordenadas[coordenadas.length - 1]
      overlays.push(`pin-s-square+${color}(${fin.lng.toFixed(6)},${fin.lat.toFixed(6)})`)
    }
    if (trayecto.pinsConexion && trayecto.pinsConexion.length > 0) {
      for (let i = 0; i < trayecto.pinsConexion.length - 1; i += 2) {
        const pinPerdida = trayecto.pinsConexion[i]
        const pinReconexion = trayecto.pinsConexion[i + 1]

        const geojsonGap = {
          type: 'Feature',
          properties: {
            stroke: '#ff0000',
            'stroke-width': 2,
            'stroke-opacity': 0.6,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [pinPerdida.lng, pinPerdida.lat],
              [pinReconexion.lng, pinReconexion.lat],
            ],
          },
        }
        overlays.push(`geojson(${encodeURIComponent(JSON.stringify(geojsonGap))})`)
      }
      trayecto.pinsConexion.forEach((pin) => {
        if (pin.tipo === 'perdida') {
          overlays.push(`pin-s-cross+ff0000(${pin.lng.toFixed(6)},${pin.lat.toFixed(6)})`)
        } else {
          overlays.push(`pin-s-star+00cc00(${pin.lng.toFixed(6)},${pin.lat.toFixed(6)})`)
        }
      })
    }
  })

  /*overlays.forEach((overlay, i) => {
    console.log(`   ${i + 1}. ${overlay.substring(0, 150)}...`)
  })*/

  // Construir URL
  const baseURL = `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static`
  const overlaysStr = overlays.join(',')
  const dimensions = `${MAP_WIDTH}x${MAP_HEIGHT}${MAP_RETINA}`

  const url = `${baseURL}/${overlaysStr}/auto/${dimensions}?padding=${padding}&access_token=${MAPBOX_TOKEN}`
  console.log('URL length:', url.length)
  if (url.length > 8000) {
    console.warn(' URL muy larga, puede fallar. Considera reducir más los puntos.')
  }
  if (url.length > 7999) {
    console.warn('URL muy larga, reduciendo puntos...')
    const trayectosReducidos = trayectos.map((t) => {
      const paso = Math.ceil(t.coordenadas.length / Math.floor(t.coordenadas.length * 0.6))
      const reducidas = [t.coordenadas[0]]
      for (let i = paso; i < t.coordenadas.length - 1; i += paso) {
        reducidas.push(t.coordenadas[i])
      }
      reducidas.push(t.coordenadas[t.coordenadas.length - 1])
      return { ...t, coordenadas: reducidas }
    })
    return generarURLMapaTrayectos(trayectosReducidos, config)
  }
  return url
}

/**
 * Descarga la imagen del mapa y la convierte a Base64
 * Usa Firebase Function como proxy para evitar problemas de CORS
 */
async function descargarImagenMapaBase64(url) {
  try {
    //  USAR TU FIREBASE FUNCTION COMO PROXY
    const proxyUrl = `https://us-central1-gpsmjindust.cloudfunctions.net/getMapboxImage?url=${encodeURIComponent(url)}`

    const response = await fetch(proxyUrl, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(' Error descargando imagen del mapa:', error)

    // Si falla, devolver null (no mostrar mapa)
    return null
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
      // 1. Preparar trayectos
      const trayectos = prepararDatosTrayectos(registros)

      if (trayectos.length === 0) {
        console.warn(' No hay trayectos válidos para mostrar')
        return null
      }

      // 2. Generar URL
      const url = generarURLMapaTrayectos(trayectos, config)

      if (!url) {
        return null
      }

      // 3. Descargar imagen
      const imagenBase64 = await descargarImagenMapaBase64(url)

      return {
        imagenBase64,
        trayectos,
        url,
      }
    } catch (error) {
      console.error(' Error generando mapa:', error)
      throw error
    }
  }

  /**
   *  Genera un mapa estático para un evento (punto único)
   * @param {Object} ubicacion - Objeto con { lat, lng, nombre, tipo }
   * @returns {Promise<Object>} - { imagenBase64, url }
   */
  const generarMapaEvento = async (ubicacion) => {
    try {
      const { lat, lng, nombre, tipo } = ubicacion
      const zoom = 15 // Zoom más cercano para eventos
      const width = 400
      const height = 250
      const retina = '@2x'

      // Pin según tipo
      const pinColor = tipo === 'POI' ? 'f44' : '42a' // Rojo para POI, Azul para Geozona
      const pinIcon = tipo === 'POI' ? 'circle' : 'square'

      // Construir URL
      const baseURL = `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static`
      const pin = `pin-l-${pinIcon}+${pinColor}(${lng},${lat})`
      const dimensions = `${width}x${height}${retina}`

      const url = `${baseURL}/${pin}/${lng},${lat},${zoom},0/${dimensions}?access_token=${MAPBOX_TOKEN}`

      // Descargar imagen
      const imagenBase64 = await descargarImagenMapaBase64(url)

      return {
        imagenBase64,
        url,
        ubicacion: { lat, lng, nombre, tipo },
      }
    } catch (error) {
      console.error(' Error generando mapa de evento:', error)
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
    generarMapaEvento, //  NUEVA FUNCIÓN
    prepararDatosTrayectos,
    generarURLMapaTrayectos,
    descargarImagenMapaBase64,
    generarLeyendaMapa,
  }
}
