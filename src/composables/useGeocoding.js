// src/composables/useGeocoding.js
import { ref } from 'vue'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Cache global persistente: clave -> dirección string
const cacheGeocodificacion = ref({})

// Cache de promesas en vuelo: clave -> Promise<string>
// Evita que llamadas concurrentes con la misma clave disparen múltiples requests
const enVuelo = new Map()

export function useGeocoding() {
  /**
   * Hace el fetch real a Mapbox. Solo se llama cuando no hay cache ni promesa en vuelo.
   * Un solo intento con types amplio para evitar el doble fetch anterior.
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

        // Fallback: usar la primera parte del place_name completo
        const fallback = place_name.split(',')[0].trim()
        if (fallback && fallback.length > 3) {
          return fallback
        }
      }
    } catch (error) {
      console.error('Error en geocoding:', error)
    }

    // Último recurso: coordenadas como texto
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  /**
   * Obtiene la dirección de una coordenada con cache de dos niveles:
   * 1. Cache persistente (resultado ya obtenido)
   * 2. Cache de promesas en vuelo (evita requests duplicados concurrentes)
   *
   * @param {object} coordenada - Objeto con lat, lng y opcionalmente direccion
   * @returns {Promise<string>} Dirección formateada
   */
  const obtenerDireccion = async (coordenada) => {
    // Si el objeto ya trae dirección precargada, usarla directamente
    if (coordenada?.direccion) {
      return coordenada.direccion
    }

    const lat = coordenada?.lat
    const lng = coordenada?.lng

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      console.warn('useGeocoding: coordenadas inválidas', coordenada)
      return 'Ubicación desconocida'
    }

    // Clave redondeada a 4 decimales (~11m de precisión, suficiente para dirección)
    const clave = `${lat.toFixed(4)},${lng.toFixed(4)}`

    // Nivel 1: cache persistente
    if (cacheGeocodificacion.value[clave]) {
      return cacheGeocodificacion.value[clave]
    }

    // Nivel 2: ya hay un request en vuelo para esta clave — reusar esa promesa
    if (enVuelo.has(clave)) {
      return enVuelo.get(clave)
    }

    // Nivel 3: lanzar nuevo request y registrarlo en enVuelo
    const promesa = obtenerDireccionDesdeCoordenadas(lat, lng)
      .then((dir) => {
        cacheGeocodificacion.value[clave] = dir
        enVuelo.delete(clave)
        return dir
      })
      .catch((err) => {
        enVuelo.delete(clave)
        console.error('useGeocoding: error obteniendo dirección', err)
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      })

    enVuelo.set(clave, promesa)
    return promesa
  }

  /**
   * Limpia el cache de geocodificación (útil en desarrollo o para forzar refresh)
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
