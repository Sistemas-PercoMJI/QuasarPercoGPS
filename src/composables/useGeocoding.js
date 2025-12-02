// src/composables/useGeocoding.js
import { ref } from 'vue'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

// Cache global para evitar llamadas repetidas
const cacheGeocodificacion = ref({})

export function useGeocoding() {
  /**
   * Obtiene la dirección desde coordenadas usando Mapbox Geocoding API
   */
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,poi,locality&limit=1`,
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
          console.log(`🗺️ Geocoding exitoso: ${direccionFinal}`)
          return direccionFinal
        }
      }

      console.warn('⚠️ Sin resultado específico, intentando búsqueda amplia...')
      const responseAmplia = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`,
      )
      const dataAmplia = await responseAmplia.json()

      if (dataAmplia.features && dataAmplia.features.length > 0) {
        const feature = dataAmplia.features[0]
        const parts = feature.place_name.split(',')
        const direccion = parts[0].trim()
        if (direccion && direccion.length > 3) {
          console.log(`🗺️ Geocoding amplio: ${direccion}`)
          return direccion
        }
      }
    } catch (error) {
      console.error('❌ Error en geocoding:', error)
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  /**
   * Obtiene la dirección de una coordenada con cache
   * @param {object} coordenada - Objeto con lat, lng y opcionalmente direccion
   * @returns {Promise<string>} Dirección formateada
   */
  const obtenerDireccion = async (coordenada) => {
    // Si ya tiene dirección, usarla
    if (coordenada.direccion) {
      return coordenada.direccion
    }

    // Crear clave única para el cache (redondeada a 4 decimales)
    const clave = `${coordenada.lat.toFixed(4)},${coordenada.lng.toFixed(4)}`

    // Si ya está en cache, retornar
    if (cacheGeocodificacion.value[clave]) {
      console.log(`📦 Usando dirección en cache: ${cacheGeocodificacion.value[clave]}`)
      return cacheGeocodificacion.value[clave]
    }

    // Geocodificar
    const direccion = await obtenerDireccionDesdeCoordenadas(coordenada.lat, coordenada.lng)

    // Guardar en cache
    cacheGeocodificacion.value[clave] = direccion
    return direccion
  }

  /**
   * Limpia el cache de geocodificación
   */
  const limpiarCache = () => {
    cacheGeocodificacion.value = {}
    console.log('🗑️ Cache de geocodificación limpiado')
  }

  return {
    obtenerDireccion,
    obtenerDireccionDesdeCoordenadas,
    limpiarCache,
    cacheGeocodificacion,
  }
}
