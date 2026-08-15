// src/composables/useGeocoding.js
import { ref } from 'vue'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
// Cache global para evitar llamadas repetidas
const cacheGeocodificacion = ref({})
const enVuelo = new Map()

export function useGeocoding() {
  /**
   * Obtiene la dirección desde coordenadas usando Mapbox Geocoding API
   */
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,poi,locality,neighborhood,place&limit=1`,
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const place_name = feature.place_name || ''
        const text = feature.text || ''
        const address = feature.address || ''

        let direccionFinal = ''

        if (address && text) {
          direccionFinal = `${text} ${address}`
        } else if (text) {
          direccionFinal = text
        } else {
          direccionFinal = place_name.split(',')[0] || ''
        }

        direccionFinal = direccionFinal
          .replace(/, Baja California, México/g, '')
          .replace(/, Baja California/g, '')
          .replace(/, Tijuana, Baja California/g, '')
          .replace(/, Tijuana/g, '')
          .replace(/, México/g, '')
          .replace(/22[0-9]{3}/g, '')
          .trim()

        if (direccionFinal && direccionFinal.length > 3) {
          return direccionFinal
        }
        const fallback = place_name.split(',')[0].trim()
        if (fallback && fallback.length > 3) {
          return fallback
        }
      }
    } catch (error) {
      console.error(' Error en geocoding:', error)
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  /**
   * Obtiene la dirección de una coordenada con cache
   * @param {object} coordenada - Objeto con lat, lng y opcionalmente direccion
   * @returns {Promise<string>} Dirección formateada
   */
  const obtenerDireccion = async (coordenada) => {
    if (coordenada.direccion) {
      return coordenada.direccion
    }

    const clave = `${coordenada.lat.toFixed(4)},${coordenada.lng.toFixed(4)}`

    // Nivel 1: cache persistente
    if (cacheGeocodificacion.value[clave]) {
      return cacheGeocodificacion.value[clave]
    }

    // Nivel 2: request en vuelo para la misma clave
    if (enVuelo.has(clave)) {
      return enVuelo.get(clave)
    }

    // Nivel 3: lanzar nuevo request
    const promesa = obtenerDireccionDesdeCoordenadas(coordenada.lat, coordenada.lng)
      .then((dir) => {
        cacheGeocodificacion.value[clave] = dir
        enVuelo.delete(clave)
        return dir
      })
      .catch(() => {
        enVuelo.delete(clave)
        return `${coordenada.lat.toFixed(5)}, ${coordenada.lng.toFixed(5)}`
      })

    enVuelo.set(clave, promesa)
    return promesa
  }

  /**
   * Limpia el cache de geocodificación
   */
  const limpiarCache = () => {
    cacheGeocodificacion.value = {}
    enVuelo.clear()
  }

  return {
    obtenerDireccion,
    obtenerDireccionDesdeCoordenadas,
    limpiarCache,
    cacheGeocodificacion,
  }
}
