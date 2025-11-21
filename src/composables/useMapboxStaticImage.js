// composables/useMapboxStaticImage.js

/**
 * Composable para generar imágenes estáticas de mapas con trayectos
 * Usa Mapbox Static Images API
 */
export function useMapboxStaticImage() {
  const MAPBOX_TOKEN =
    'pk.eyJ1IjoiY29uY2F6ZWQiLCJhIjoiY20zZnJhYmR4MGFyNzJsczl5b2F6YWs4ZyJ9.S7LXqkbzV_FUb-NmxrN7Ug'

  // Colores para diferentes vehículos
  const COLORES_VEHICULOS = [
    'f44336', // Rojo
    '2196F3', // Azul
    '4CAF50', // Verde
    'FF9800', // Naranja
    '9C27B0', // Púrpura
    '00BCD4', // Cyan
    'FFEB3B', // Amarillo
    '795548', // Café
    'E91E63', // Rosa
    '607D8B', // Gris azulado
  ]

  /**
   * Genera una URL de imagen estática de Mapbox con trayectos
   * @param {Array} trayectos - Array de trayectos con coordenadas
   * @param {Object} opciones - Opciones de configuración
   * @returns {String} URL de la imagen
   */
  function generarURLMapaTrayectos(trayectos, opciones = {}) {
    const {
      width = 1200,
      height = 800,
      padding = 50, // Padding en píxeles alrededor del mapa
      mostrarMarcadores = true,
      // mostrarUnidades y mostrarPlacas están disponibles para futuras implementaciones
      // cuando se quiera agregar etiquetas de texto en los marcadores
    } = opciones

    if (!trayectos || trayectos.length === 0) {
      console.warn('No hay trayectos para mostrar en el mapa')
      return null
    }

    // Construir overlays (líneas y marcadores)
    const overlays = []

    trayectos.forEach((trayecto, index) => {
      if (!trayecto.coordenadas || trayecto.coordenadas.length === 0) {
        return
      }

      const color = COLORES_VEHICULOS[index % COLORES_VEHICULOS.length]
      const coordenadas = trayecto.coordenadas

      // 1. Agregar la línea del trayecto
      const puntosLinea = coordenadas.map((coord) => `${coord.lng},${coord.lat}`).join(',')

      overlays.push(`path-5+${color}-0.8(${puntosLinea})`)

      // 2. Agregar marcadores de inicio y fin
      if (mostrarMarcadores && coordenadas.length > 0) {
        const inicio = coordenadas[0]
        const fin = coordenadas[coordenadas.length - 1]

        // Marcador de inicio (verde)
        overlays.push(`pin-s-circle+4CAF50(${inicio.lng},${inicio.lat})`)

        // Marcador de fin (rojo)
        overlays.push(`pin-s-square+f44336(${fin.lng},${fin.lat})`)
      }
    })

    // Calcular bounds automáticamente
    const todasLasCoordenadas = []
    trayectos.forEach((trayecto) => {
      if (trayecto.coordenadas) {
        todasLasCoordenadas.push(...trayecto.coordenadas)
      }
    })

    // Construir URL
    // Mapbox calcula automáticamente el zoom con 'auto' basándose en los overlays
    const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/static'
    const overlayString = overlays.join(',')
    const url = `${baseUrl}/${overlayString}/auto/${width}x${height}@2x?padding=${padding}&access_token=${MAPBOX_TOKEN}`

    return url
  }

  /**
   * Calcula los límites (bounds) de un conjunto de coordenadas
   */
  function calcularBounds(coordenadas) {
    if (!coordenadas || coordenadas.length === 0) {
      // Valores por defecto (Tijuana)
      return {
        minLat: 32.5,
        maxLat: 32.55,
        minLng: -117.1,
        maxLng: -117.05,
      }
    }

    let minLat = Infinity
    let maxLat = -Infinity
    let minLng = Infinity
    let maxLng = -Infinity

    coordenadas.forEach((coord) => {
      if (coord.lat < minLat) minLat = coord.lat
      if (coord.lat > maxLat) maxLat = coord.lat
      if (coord.lng < minLng) minLng = coord.lng
      if (coord.lng > maxLng) maxLng = coord.lng
    })

    // Agregar un pequeño margen (5%)
    const latMargin = (maxLat - minLat) * 0.05
    const lngMargin = (maxLng - minLng) * 0.05

    return {
      minLat: minLat - latMargin,
      maxLat: maxLat + latMargin,
      minLng: minLng - lngMargin,
      maxLng: maxLng + lngMargin,
    }
  }

  /**
   * Descarga la imagen del mapa y la convierte a base64
   * @param {String} url - URL de la imagen
   * @returns {Promise<String>} Base64 de la imagen
   */
  async function descargarImagenMapaBase64(url) {
    try {
      const response = await fetch(url)
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
   * Prepara los datos de trayectos para el mapa
   * @param {Array} registros - Registros del reporte
   * @returns {Array} Trayectos formateados
   */
  function prepararDatosTrayectos(registros) {
    const trayectosPorVehiculo = {}

    // Agrupar por vehículo
    registros.forEach((registro) => {
      const vehiculoId = registro.vehiculoId || registro.unidadId
      const vehiculoNombre = registro.vehiculo || registro.unidad || 'Sin nombre'

      if (!trayectosPorVehiculo[vehiculoId]) {
        trayectosPorVehiculo[vehiculoId] = {
          vehiculoId,
          vehiculoNombre,
          placa: registro.placa || '',
          coordenadas: [],
        }
      }

      // Agregar coordenadas si existen
      if (registro.latitud && registro.longitud) {
        trayectosPorVehiculo[vehiculoId].coordenadas.push({
          lat: parseFloat(registro.latitud),
          lng: parseFloat(registro.longitud),
          timestamp: registro.fecha || registro.timestamp,
        })
      }
    })

    // Convertir a array y ordenar coordenadas por timestamp
    return Object.values(trayectosPorVehiculo).map((trayecto) => ({
      ...trayecto,
      coordenadas: trayecto.coordenadas.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return timeA - timeB
      }),
    }))
  }

  /**
   * Genera una leyenda para el mapa
   * @param {Array} trayectos - Trayectos del mapa
   * @returns {Array} Array de items de leyenda
   */
  function generarLeyendaMapa(trayectos) {
    return trayectos.map((trayecto, index) => {
      const color = COLORES_VEHICULOS[index % COLORES_VEHICULOS.length]
      return {
        vehiculo: trayecto.vehiculoNombre,
        placa: trayecto.placa,
        color: `#${color}`,
        puntos: trayecto.coordenadas.length,
      }
    })
  }

  return {
    generarURLMapaTrayectos,
    descargarImagenMapaBase64,
    prepararDatosTrayectos,
    generarLeyendaMapa,
    calcularBounds,
    COLORES_VEHICULOS,
  }
}
