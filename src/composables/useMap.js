// src/composables/useMap.js
import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Referencia reactiva al mapa
const map = ref(null)
const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)
const modoSeleccionActivo = ref(false)

// 🔑 Tu API key de Mapbox
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

export function useMap() {
  // Función para activar modo selección
  const activarModoSeleccion = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    modoSeleccionActivo.value = true
    ubicacionSeleccionada.value = null

    // Cambiar cursor a "seleccionar"
    map.value.getContainer().style.cursor = 'crosshair'

    // Agregar evento de clic al mapa
    map.value.off('click') // Remover eventos previos
    map.value.on('click', onMapClick)

    console.log('✅ Modo selección activado')
    return true
  }

  // Función para desactivar modo selección
  const desactivarModoSeleccion = () => {
    if (!map.value) return

    modoSeleccionActivo.value = false
    map.value.getContainer().style.cursor = ''
    map.value.off('click', onMapClick)

    console.log('❌ Modo selección desactivado')
  }

  // Manejar clic en el mapa
  const onMapClick = (e) => {
    if (!modoSeleccionActivo.value || !map.value) return

    const { lat, lng } = e.latlng

    // Limpiar marcador temporal anterior
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
    }

    // Crear nuevo marcador temporal
    marcadorTemporal.value = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'marcador-temporal',
        html: '📍',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
      draggable: true,
    }).addTo(map.value)

    // Obtener dirección (reverse geocoding simple)
    obtenerDireccion(lat, lng).then((direccion) => {
      ubicacionSeleccionada.value = {
        coordenadas: { lat, lng },
        direccion: direccion,
      }

      console.log('📍 Ubicación seleccionada:', ubicacionSeleccionada.value)
    })
  }

  // Obtener dirección desde coordenadas
  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      )
      const data = await response.json()

      if (data && data.display_name) {
        return data.display_name
      }
    } catch (error) {
      console.error('Error obteniendo dirección:', error)
    }

    return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
  }

  // Obtener ubicación seleccionada
  const getUbicacionSeleccionada = () => {
    return ubicacionSeleccionada.value
  }

  // Limpiar marcador temporal
  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  // Confirmar marcador temporal (convertir a permanente)
  const confirmarMarcadorTemporal = (nombre) => {
    if (marcadorTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Marcador confirmado: ${nombre}`, ubicacionSeleccionada.value)
      // Aquí puedes convertir el marcador temporal a permanente si lo necesitas
      limpiarMarcadorTemporal()
    }
  }

  // Actualizar marcador existente
  const actualizarMarcador = (lat, lng, nombre) => {
    console.log(`🔄 Actualizando marcador: ${nombre} en ${lat}, ${lng}`)
    // Aquí puedes implementar la lógica para actualizar marcadores existentes
  }

  // Eliminar marcador por coordenadas
  const eliminarMarcadorPorCoordenadas = (lat, lng) => {
    console.log(`🗑️ Eliminando marcador en: ${lat}, ${lng}`)
    // Aquí puedes implementar la lógica para eliminar marcadores
  }

  const initMap = async (containerId, center, zoom) => {
    try {
      // Limpiar mapa anterior si existe
      if (map.value) {
        map.value.remove()
      }

      // Crear nuevo mapa
      map.value = L.map(containerId).setView(center, zoom)

      // 🔥 IMPORTANTE: Exponer la API completa globalmente
      const mapaAPI = {
        // Funciones del mapa base
        map: map.value,
        L: L,

        // Funciones de selección (las que busca GeoZonas)
        activarModoSeleccion,
        desactivarModoSeleccion,
        getUbicacionSeleccionada,
        limpiarMarcadorTemporal,
        confirmarMarcadorTemporal,
        actualizarMarcador,
        eliminarMarcadorPorCoordenadas,
      }

      window.mapaGlobal = mapaAPI
      window.L = L

      // También exponer directamente en el elemento del mapa
      const mapPage = document.getElementById('map-page')
      if (mapPage) {
        mapPage._mapaAPI = mapaAPI
        console.log('✅ _mapaAPI expuesto en map-page')
      }

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
      console.log('✅ API del mapa expuesta en window.mapaGlobal y map-page._mapaAPI')

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

    // Limpiar estado de selección
    modoSeleccionActivo.value = false
    ubicacionSeleccionada.value = null
    marcadorTemporal.value = null

    console.log('🧹 Mapa limpiado')
  }

  return {
    map,
    initMap,
    addMarker,
    cleanup,
    // Exportar las nuevas funciones
    activarModoSeleccion,
    desactivarModoSeleccion,
    getUbicacionSeleccionada,
    limpiarMarcadorTemporal,
    confirmarMarcadorTemporal,
    actualizarMarcador,
    eliminarMarcadorPorCoordenadas,
  }
}
