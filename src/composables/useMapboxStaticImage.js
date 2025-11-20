// src/composables/useMapboxStaticImage.js
import { ref } from 'vue'

export function useMapboxStaticImage() {
  const loading = ref(false)
  const error = ref(null)

  // 🔑 TOKEN DE MAPBOX
  const MAPBOX_TOKEN =
    'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

  // 🎨 COLORES PARA DIFERENTES VEHÍCULOS
  const COLORES_VEHICULOS = [
    'f44336', // Rojo
    '2196f3', // Azul
    '4caf50', // Verde
    'ff9800', // Naranja
    '9c27b0', // Púrpura
    '00bcd4', // Cian
    'ffeb3b', // Amarillo
    'e91e63', // Rosa
    '795548', // Marrón
    '607d8b', // Gris azulado
  ]

  /**
   * 🆕 Simplifica un array de coordenadas eliminando puntos redundantes
   * @param {Array} coords - Array de [lng, lat]
   * @param {number} maxPuntos - Máximo de puntos por ruta
   * @returns {Array} - Array simplificado
   */
  const simplificarCoordenadas = (coords, maxPuntos = 50) => {
    if (!coords || coords.length <= maxPuntos) return coords

    const simplified = []
    const step = Math.ceil(coords.length / maxPuntos)

    // Siempre mantener el primer punto
    simplified.push(coords[0])

    // Tomar puntos intermedios con saltos
    for (let i = step; i < coords.length - 1; i += step) {
      simplified.push(coords[i])
    }

    // Siempre mantener el último punto
    simplified.push(coords[coords.length - 1])

    console.log(`📉 Simplificado: ${coords.length} → ${simplified.length} puntos`)

    return simplified
  }

  /**
   * Codifica coordenadas a formato Polyline (algoritmo de Google)
   * @param {Array} coordinates - Array de [lng, lat]
   * @returns {string} - Polyline codificado
   */
  const encodePolyline = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return ''

    // 🔥 SIMPLIFICAR ANTES DE CODIFICAR
    const coordsSimplificadas = simplificarCoordenadas(coordinates, 50)

    let encoded = ''
    let prevLat = 0
    let prevLng = 0

    for (const [lng, lat] of coordsSimplificadas) {
      // Convertir a enteros (multiplicar por 1e5)
      const latInt = Math.round(lat * 1e5)
      const lngInt = Math.round(lng * 1e5)

      // Calcular deltas
      const deltaLat = latInt - prevLat
      const deltaLng = lngInt - prevLng

      // Codificar deltas
      encoded += encodeValue(deltaLat)
      encoded += encodeValue(deltaLng)

      prevLat = latInt
      prevLng = lngInt
    }

    return encoded
  }

  /**
   * Codifica un valor entero a formato Polyline
   */
  const encodeValue = (value) => {
    let encoded = ''

    // Hacer negativo -> positivo con bit shift
    let v = value < 0 ? ~(value << 1) : value << 1

    while (v >= 0x20) {
      encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }

    encoded += String.fromCharCode(v + 63)
    return encoded
  }

  /**
   * Calcula el bounding box de un conjunto de coordenadas
   * @param {Array} coordinates - Array de [lng, lat]
   * @returns {Object} - { minLng, minLat, maxLng, maxLat }
   */
  const calcularBoundingBox = (coordinates) => {
    if (!coordinates || coordinates.length === 0) {
      return { minLng: -117.12, minLat: 32.47, maxLng: -116.9, maxLat: 32.55 }
    }

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity

    coordinates.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    })

    // Agregar padding (5%)
    const paddingLng = (maxLng - minLng) * 0.05
    const paddingLat = (maxLat - minLat) * 0.05

    return {
      minLng: minLng - paddingLng,
      minLat: minLat - paddingLat,
      maxLng: maxLng + paddingLng,
      maxLat: maxLat + paddingLat,
    }
  }

  /**
   * Genera URL de Mapbox Static Image con múltiples rutas
   * @param {Array} rutas - Array de objetos { nombre, coordenadas }
   * @param {Object} opciones - { ancho, alto, mostrarMarcadores }
   * @returns {string} - URL de la imagen
   */
  const generarURLMapaConRutas = (rutas, opciones = {}) => {
    const {
      ancho = 1200,
      alto = 800,
      mostrarMarcadores = true,
      estilo = 'streets-v12', // streets-v12, satellite-v9, outdoors-v12
    } = opciones

    try {
      // Base URL
      const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox'

      // Array para construir las capas (overlays)
      const overlays = []

      // 🗺️ AGREGAR RUTAS (polylines)
      rutas.forEach((ruta, index) => {
        if (!ruta.coordenadas || ruta.coordenadas.length === 0) return

        // Convertir coordenadas de { lat, lng } a [lng, lat]
        const coords = ruta.coordenadas.map((c) => [c.lng, c.lat])

        // Codificar polyline (ya simplificado internamente)
        const polyline = encodePolyline(coords)

        // Color del vehículo
        const color = COLORES_VEHICULOS[index % COLORES_VEHICULOS.length]

        // Agregar path overlay
        overlays.push(`path-3+${color}-0.9(${encodeURIComponent(polyline)})`)

        // 📍 AGREGAR MARCADORES DE INICIO Y FIN
        if (mostrarMarcadores && coords.length > 0) {
          // Marcador de inicio (verde)
          const inicio = coords[0]
          overlays.push(`pin-s+4caf50(${inicio[0]},${inicio[1]})`)

          // Marcador de fin (rojo)
          const fin = coords[coords.length - 1]
          overlays.push(`pin-s+f44336(${fin[0]},${fin[1]})`)
        }
      })

      // 🗺️ CALCULAR BOUNDING BOX (para encuadrar todas las rutas)
      const todasCoordenadas = []
      rutas.forEach((ruta) => {
        if (ruta.coordenadas && ruta.coordenadas.length > 0) {
          ruta.coordenadas.forEach((c) => todasCoordenadas.push([c.lng, c.lat]))
        }
      })

      const bbox = calcularBoundingBox(todasCoordenadas)

      // Construir el bounding box en formato Mapbox
      const bboxStr = `[${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}]`

      // 🔗 CONSTRUIR URL COMPLETA
      const url = `${baseUrl}/${estilo}/static/${overlays.join(',')}/${bboxStr}/${ancho}x${alto}@2x?access_token=${MAPBOX_TOKEN}`

      console.log('🗺️ URL del mapa generada (longitud):', url.length, 'caracteres')

      // 🔥 VERIFICAR LONGITUD DE URL
      if (url.length > 8000) {
        console.warn('⚠️ URL muy larga:', url.length, 'caracteres. Puede fallar.')
      }

      return url
    } catch (err) {
      console.error('❌ Error generando URL del mapa:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * Descarga la imagen del mapa como Blob
   * @param {string} url - URL de Mapbox Static Image
   * @returns {Promise<Blob>} - Blob de la imagen
   */
  const descargarImagenMapa = async (url) => {
    loading.value = true
    error.value = null

    try {
      console.log('📥 Descargando imagen del mapa...')
      console.log('🔗 URL length:', url.length, 'caracteres')

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error al descargar mapa: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()

      console.log('✅ Imagen descargada:', blob.size, 'bytes')

      return blob
    } catch (err) {
      console.error('❌ Error descargando imagen:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Convierte Blob a Data URL (base64)
   * @param {Blob} blob - Blob de la imagen
   * @returns {Promise<string>} - Data URL
   */
  const blobToDataURL = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Genera y descarga imagen del mapa completa
   * @param {Array} rutas - Array de rutas
   * @param {Object} opciones - Opciones del mapa
   * @returns {Promise<Object>} - { url, blob, dataURL }
   */
  const generarImagenMapa = async (rutas, opciones = {}) => {
    loading.value = true
    error.value = null

    try {
      // 1. Generar URL
      const url = generarURLMapaConRutas(rutas, opciones)

      // 2. Descargar imagen
      const blob = await descargarImagenMapa(url)

      // 3. Convertir a Data URL
      const dataURL = await blobToDataURL(blob)

      return {
        url,
        blob,
        dataURL,
      }
    } catch (err) {
      console.error('❌ Error generando imagen del mapa:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene el color asignado a un vehículo por índice
   */
  const obtenerColorVehiculo = (index) => {
    return `#${COLORES_VEHICULOS[index % COLORES_VEHICULOS.length]}`
  }

  return {
    loading,
    error,
    generarURLMapaConRutas,
    descargarImagenMapa,
    blobToDataURL,
    generarImagenMapa,
    obtenerColorVehiculo,
    COLORES_VEHICULOS,
    simplificarCoordenadas, // 🆕 Exportar por si se necesita
  }
}
