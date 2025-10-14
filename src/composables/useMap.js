import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ref } from 'vue'

const map = ref(null)
const markers = ref([])
const modoSeleccion = ref(false)
const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)

// 🗝️ TOKEN DE MAPBOX
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA' // ← CAMBIA ESTO

export function useMap() {
  const initMap = (containerId, center, zoom) => {
    // Limpiar mapa existente
    if (map.value) {
      map.value.remove()
      map.value = null
      markers.value = []
    }

    // Crear mapa con configuración fija
    map.value = L.map(containerId, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,
    })

    // 🛰️ Mapbox Satellite Streets
    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      {
        attribution: '© Mapbox © OpenStreetMap',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1,
      },
    ).addTo(map.value)

    // Forzar redibujado
    setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize()
      }
    }, 200)

    console.log('🗺️ Mapbox inicializado')
    return map.value
  }

  const addMarker = (lat, lng, options = {}) => {
    const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
      draggable: false,
      autoPan: false,
    }).addTo(map.value)

    if (options.popup) {
      marker.bindPopup(options.popup)
    }

    markers.value.push({
      marker: marker,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    })

    console.log('✅ Marcador agregado en:', lat, lng)
    return marker
  }

  const activarModoSeleccion = () => {
    modoSeleccion.value = true
    ubicacionSeleccionada.value = null
    map.value.getContainer().style.cursor = 'crosshair'
    map.value.on('click', onMapClick)
  }

  const desactivarModoSeleccion = () => {
    modoSeleccion.value = false
    map.value.getContainer().style.cursor = ''
    map.value.off('click', onMapClick)
  }

  const onMapClick = async (e) => {
    const lat = parseFloat(e.latlng.lat.toFixed(6))
    const lng = parseFloat(e.latlng.lng.toFixed(6))

    // Remover marcador temporal anterior
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
    }

    // Crear marcador temporal ROJO
    marcadorTemporal.value = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      draggable: false,
    }).addTo(map.value)

    const direccion = await obtenerDireccion(lat, lng)

    ubicacionSeleccionada.value = {
      coordenadas: { lat, lng },
      direccion: direccion,
    }

    marcadorTemporal.value
      .bindPopup(
        `<b>Ubicación seleccionada</b><br>${direccion}<br><small>Lat: ${lat}, Lng: ${lng}</small>`,
      )
      .openPopup()

    console.log('📍 Ubicación seleccionada:', { lat, lng, direccion })
  }

  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      )
      const data = await response.json()
      return data.display_name || `${lat}, ${lng}`
    } catch (error) {
      console.error('Error en geocodificación:', error)
      return `${lat}, ${lng}`
    }
  }

  const getUbicacionSeleccionada = () => {
    return ubicacionSeleccionada.value
  }

  const confirmarMarcadorTemporal = (nombre) => {
    if (marcadorTemporal.value && ubicacionSeleccionada.value) {
      const { lat, lng } = ubicacionSeleccionada.value.coordenadas

      console.log('📍 Confirmando marcador:', { lat, lng, nombre })

      // Remover temporal
      map.value.removeLayer(marcadorTemporal.value)

      // Crear permanente
      const markerPermanente = L.marker([lat, lng], {
        draggable: false,
        autoPan: false,
      }).addTo(map.value)

      markerPermanente.bindPopup(
        `<b>${nombre}</b><br>${ubicacionSeleccionada.value.direccion}<br><small>Lat: ${lat}, Lng: ${lng}</small>`,
      )

      markers.value.push({
        marker: markerPermanente,
        lat: lat,
        lng: lng,
        nombre: nombre,
      })

      marcadorTemporal.value = null
      ubicacionSeleccionada.value = null

      console.log('✅ Marcador permanente creado. Total:', markers.value.length)
    }
  }

  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
      ubicacionSeleccionada.value = null
    }
  }

  const eliminarMarcadorPorCoordenadas = (lat, lng) => {
    const markerIndex = markers.value.findIndex((m) => {
      return Math.abs(m.lat - lat) < 0.000001 && Math.abs(m.lng - lng) < 0.000001
    })

    if (markerIndex > -1) {
      map.value.removeLayer(markers.value[markerIndex].marker)
      markers.value.splice(markerIndex, 1)
      console.log('✅ Marcador eliminado. Total:', markers.value.length)
    }
  }

  const actualizarMarcador = (lat, lng, nombre, direccion) => {
    const markerObj = markers.value.find((m) => {
      return Math.abs(m.lat - lat) < 0.000001 && Math.abs(m.lng - lng) < 0.000001
    })

    if (markerObj) {
      markerObj.marker.bindPopup(`<b>${nombre}</b><br>${direccion}`)
      markerObj.nombre = nombre
      console.log('✅ Marcador actualizado:', nombre)
    }
  }

  const cleanup = () => {
    markers.value.forEach((m) => {
      if (map.value && m.marker) {
        map.value.removeLayer(m.marker)
      }
    })
    markers.value = []

    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }

    if (map.value) {
      map.value.remove()
      map.value = null
    }
  }

  return {
    map,
    initMap,
    addMarker,
    activarModoSeleccion,
    desactivarModoSeleccion,
    getUbicacionSeleccionada,
    confirmarMarcadorTemporal,
    limpiarMarcadorTemporal,
    eliminarMarcadorPorCoordenadas,
    actualizarMarcador,
    cleanup,
  }
}
