import { useGeocoding } from './useGeocoding'

export function useGeozonaUtils() {
  const { obtenerDireccion } = useGeocoding()

  /**
   * Calcula el centroide (punto medio) de un polígono
   * @param {Array} puntos - Array de objetos {lat, lng}
   * @returns {Object} - {lat, lng} del centroide
   */
  const calcularCentroide = (puntos) => {
    if (!puntos || puntos.length === 0) {
      console.warn('⚠️ No hay puntos para calcular centroide')
      return null
    }

    // Si es solo 1 punto, ese es el centroide
    if (puntos.length === 1) {
      return { lat: puntos[0].lat, lng: puntos[0].lng }
    }

    // Calcular promedio de latitudes y longitudes
    const sumaLat = puntos.reduce((sum, punto) => sum + punto.lat, 0)
    const sumaLng = puntos.reduce((sum, punto) => sum + punto.lng, 0)

    const centroide = {
      lat: sumaLat / puntos.length,
      lng: sumaLng / puntos.length,
    }

    return centroide
  }

  /**
   * Calcula el centroide y lo geocodifica
   * @param {Array} puntos - Array de objetos {lat, lng}
   * @returns {Promise<Object>} - {lat, lng, direccion}
   */
  const calcularCentroideConDireccion = async (puntos) => {
    const centroide = calcularCentroide(puntos)

    if (!centroide) {
      return null
    }

    try {
      const direccion = await obtenerDireccion(centroide)
      return {
        ...centroide,
        direccion,
      }
    } catch (error) {
      console.error('❌ Error geocodificando centroide:', error)
      return {
        ...centroide,
        direccion: `${centroide.lat.toFixed(6)}, ${centroide.lng.toFixed(6)}`,
      }
    }
  }

  /**
   * Calcula el centroide de una geozona (circular o poligonal)
   * @param {Object} geozona - Objeto geozona con tipoGeozona, centro o puntos
   * @returns {Promise<Object>} - {lat, lng, direccion}
   */
  const obtenerCentroGeozona = async (geozona) => {
    if (!geozona) {
      console.warn('⚠️ Geozona inválida')
      return null
    }

    // Si es circular, el centro ya existe
    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      const direccion = await obtenerDireccion(geozona.centro)
      return {
        ...geozona.centro,
        direccion,
      }
    }

    // Si es poligonal, calcular centroide
    if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
      return await calcularCentroideConDireccion(geozona.puntos)
    }

    console.warn('⚠️ Tipo de geozona no reconocido')
    return null
  }

  /**
   * Calcula el área aproximada de un polígono en metros cuadrados
   * Usa la fórmula de Shoelace (área en coordenadas esféricas)
   * @param {Array} puntos - Array de objetos {lat, lng}
   * @returns {Number} - Área en metros cuadrados
   */
  const calcularAreaPoligono = (puntos) => {
    if (!puntos || puntos.length < 3) {
      return 0
    }

    const EARTH_RADIUS = 6371000 // Radio de la Tierra en metros

    // Convertir a radianes
    const toRad = (deg) => (deg * Math.PI) / 180

    let area = 0
    const n = puntos.length

    for (let i = 0; i < n; i++) {
      const p1 = puntos[i]
      const p2 = puntos[(i + 1) % n]

      const lat1 = toRad(p1.lat)
      const lat2 = toRad(p2.lat)
      const lng1 = toRad(p1.lng)
      const lng2 = toRad(p2.lng)

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2
    return Math.abs(area)
  }

  /**
   * Formatea el área en unidades legibles
   * @param {Number} areaM2 - Área en metros cuadrados
   * @returns {String} - Área formateada (ej: "1.5 km²" o "500 m²")
   */
  const formatearArea = (areaM2) => {
    if (areaM2 >= 1000000) {
      return `${(areaM2 / 1000000).toFixed(2)} km²`
    } else if (areaM2 >= 10000) {
      return `${(areaM2 / 10000).toFixed(2)} hectáreas`
    } else {
      return `${areaM2.toFixed(2)} m²`
    }
  }

  return {
    calcularCentroide,
    calcularCentroideConDireccion,
    obtenerCentroGeozona,
    calcularAreaPoligono,
    formatearArea,
  }
}
