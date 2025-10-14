// src/composables/useMap.js
import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Referencia reactiva al mapa
const map = ref(null)

// 🔑 Tu API key de Mapbox
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA' // ← REEMPLAZA CON TU TOKEN

export function useMap() {
  const initMap = async (containerId, center, zoom) => {
    try {
      // Limpiar mapa anterior si existe
      if (map.value) {
        map.value.remove()
      }

      // Crear nuevo mapa
      map.value = L.map(containerId).setView(center, zoom)

      // 🔥 IMPORTANTE: Exponer globalmente
      window.mapaGlobal = map.value
      window.L = L // También exponer Leaflet

      // 🛰️ MAPBOX SATELLITE LAYER
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
        {
          maxZoom: 22,
          tileSize: 512,
          zoomOffset: -1,
          attribution:
            '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(map.value)

      console.log('✅ Mapa Mapbox satelital inicializado correctamente')
      return map.value
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error)
      throw error
    }
  }

  const addMarker = (lat, lng, options = {}) => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return null
    }

    try {
      const marker = L.marker([lat, lng]).addTo(map.value)

      if (options.popup) {
        marker.bindPopup(options.popup)
      }

      if (options.icon) {
        marker.setIcon(options.icon)
      }

      return marker
    } catch (error) {
      console.error('❌ Error agregando marcador:', error)
      return null
    }
  }

  const cleanup = () => {
    if (map.value) {
      map.value.remove()
      map.value = null
    }

    // Limpiar referencias globales
    if (window.mapaGlobal) {
      window.mapaGlobal = null
    }
    if (window.marcadorBusqueda) {
      window.marcadorBusqueda = null
    }

    console.log('🧹 Mapa limpiado')
  }

  return {
    map,
    initMap,
    addMarker,
    cleanup,
  }
}
