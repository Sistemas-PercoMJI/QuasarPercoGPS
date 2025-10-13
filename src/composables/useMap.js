import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAPBOX_TOKEN, MAPBOX_STYLES } from 'src/config/mapbox'

export function useMap() {
  const map = ref(null)
  const markers = ref([])
  const trafficLayer = ref(null)

  // Inicializar mapa
  const initMap = (containerId, center = [32.5149, -117.0382], zoom = 13) => {
    map.value = L.map(containerId).setView(center, zoom)

    L.tileLayer(
      `https://api.mapbox.com/styles/v1/${MAPBOX_STYLES.streets}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      {
        attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19,
      },
    ).addTo(map.value)

    return map.value
  }

  // Agregar marcador
  const addMarker = (lat, lng, options = {}) => {
    const marker = L.marker([lat, lng], options).addTo(map.value)

    if (options.popup) {
      marker.bindPopup(options.popup)
    }

    markers.value.push(marker)
    return marker
  }

  // Limpiar marcadores
  const clearMarkers = () => {
    markers.value.forEach((marker) => marker.remove())
    markers.value = []
  }

  // Centrar mapa en ubicación
  const centerMap = (lat, lng, zoom = 13) => {
    if (map.value) {
      map.value.setView([lat, lng], zoom)
    }
  }

  // Cambiar estilo del mapa
  const changeStyle = (style) => {
    if (map.value) {
      map.value.eachLayer((layer) => {
        if (layer instanceof L.TileLayer && layer !== trafficLayer.value) {
          map.value.removeLayer(layer)
        }
      })

      L.tileLayer(
        `https://api.mapbox.com/styles/v1/${MAPBOX_STYLES[style]}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
        {
          attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 19,
        },
      ).addTo(map.value)
    }
  }

  // Toggle de tráfico
  const toggleTraffic = (show) => {
    if (!map.value) return

    if (show) {
      // Agregar capa de tráfico
      if (!trafficLayer.value) {
        trafficLayer.value = L.tileLayer(
          `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.vector.pbf?access_token=${MAPBOX_TOKEN}`,
          {
            attribution: '© Mapbox Traffic',
            maxZoom: 19,
          },
        )
      }
      trafficLayer.value.addTo(map.value)
    } else {
      // Quitar capa de tráfico
      if (trafficLayer.value) {
        map.value.removeLayer(trafficLayer.value)
      }
    }
  }

  // Limpiar al desmontar
  const cleanup = () => {
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  }

  return {
    map,
    markers,
    initMap,
    addMarker,
    clearMarkers,
    centerMap,
    changeStyle,
    toggleTraffic,
    cleanup,
  }
}
