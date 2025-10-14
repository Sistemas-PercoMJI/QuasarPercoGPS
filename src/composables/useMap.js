import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ref } from 'vue'

const map = ref(null)
const markers = ref([]) // Array para guardar todos los marcadores
const modoSeleccion = ref(false)
const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)

export function useMap() {
  const initMap = (containerId, center, zoom) => {
    // Si ya existe un mapa, destruirlo primero
    if (map.value) {
      map.value.remove()
      map.value = null
    }

    // Crear el mapa con opciones específicas para evitar problemas de proyección
    map.value = L.map(containerId, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false, // Usar SVG en lugar de Canvas
      worldCopyJump: false, // Evitar que los marcadores salten entre copias del mundo
      maxBounds: null, // Sin límites
      maxBoundsViscosity: 1.0,
    })

    // SOLO capa de satélite (Esri World Imagery)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
        minZoom: 2,
        tileSize: 256,
        zoomOffset: 0,
        detectRetina: true, // Mejor calidad en pantallas retina
      },
    ).addTo(map.value)

    // Forzar redibujado después de inicializar
    setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize()
      }
    }, 100)

    console.log('🗺️ Mapa inicializado correctamente')
    return map.value
  }

  const addMarker = (lat, lng, options = {}) => {
    // Crear icono personalizado para evitar problemas de visualización
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    const marker = L.marker([lat, lng], { icon }).addTo(map.value)

    if (options.popup) {
      marker.bindPopup(options.popup)
    }

    // Guardar referencia del marcador
    markers.value.push({
      marker: marker,
      lat: lat,
      lng: lng,
    })

    console.log('✅ Marcador agregado. Total marcadores:', markers.value.length)
    return marker
  }

  // Activar modo selección
  const activarModoSeleccion = () => {
    modoSeleccion.value = true
    ubicacionSeleccionada.value = null
    map.value.getContainer().style.cursor = 'crosshair'
    map.value.on('click', onMapClick)
  }

  // Desactivar modo selección
  const desactivarModoSeleccion = () => {
    modoSeleccion.value = false
    map.value.getContainer().style.cursor = ''
    map.value.off('click', onMapClick)
  }

  // Manejador del clic en el mapa
  const onMapClick = async (e) => {
    const { lat, lng } = e.latlng

    // Remover marcador temporal anterior si existe
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
    }

    // Crear nuevo marcador temporal ROJO
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
    }).addTo(map.value)

    // Obtener dirección
    const direccion = await obtenerDireccion(lat, lng)

    // Guardar ubicación seleccionada
    ubicacionSeleccionada.value = {
      coordenadas: { lat, lng },
      direccion: direccion,
    }

    // Mostrar popup
    marcadorTemporal.value
      .bindPopup(
        `
        <b>Ubicación seleccionada</b><br>
        ${direccion}<br>
        <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
      `,
      )
      .openPopup()
  }

  // Geocodificación inversa
  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      )
      const data = await response.json()
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (error) {
      console.error('Error en geocodificación:', error)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  // Obtener ubicación seleccionada
  const getUbicacionSeleccionada = () => {
    return ubicacionSeleccionada.value
  }

  // Convertir marcador temporal a permanente
  const confirmarMarcadorTemporal = (nombre) => {
    if (marcadorTemporal.value && ubicacionSeleccionada.value) {
      const { lat, lng } = ubicacionSeleccionada.value.coordenadas

      console.log('📍 Confirmando marcador en:', { lat, lng, nombre })

      // Eliminar el marcador temporal rojo
      map.value.removeLayer(marcadorTemporal.value)

      // Crear marcador permanente AZUL con coordenadas fijas
      const markerPermanente = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        draggable: false, // IMPORTANTE: No permitir arrastre
        autoPan: false,
      }).addTo(map.value)

      // Agregar popup permanente
      markerPermanente.bindPopup(`
      <b>${nombre}</b><br>
      ${ubicacionSeleccionada.value.direccion}<br>
      <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
    `)

      // Guardar en el array con las coordenadas exactas
      markers.value.push({
        marker: markerPermanente,
        lat: parseFloat(lat), // Asegurar que sea número
        lng: parseFloat(lng), // Asegurar que sea número
        nombre: nombre,
      })

      // Limpiar referencias temporales
      marcadorTemporal.value = null
      ubicacionSeleccionada.value = null

      console.log('✅ Marcador permanente creado. Total:', markers.value.length)
      console.log(
        '📊 Marcadores actuales:',
        markers.value.map((m) => ({
          nombre: m.nombre,
          lat: m.lat,
          lng: m.lng,
        })),
      )
    }
  }

  // Limpiar marcador temporal
  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
      ubicacionSeleccionada.value = null
      console.log('🗑️ Marcador temporal eliminado')
    }
  }

  // Eliminar marcador por coordenadas
  const eliminarMarcadorPorCoordenadas = (lat, lng) => {
    const markerIndex = markers.value.findIndex((m) => {
      return Math.abs(m.lat - lat) < 0.00001 && Math.abs(m.lng - lng) < 0.00001
    })

    if (markerIndex > -1) {
      map.value.removeLayer(markers.value[markerIndex].marker)
      markers.value.splice(markerIndex, 1)
      console.log('✅ Marcador eliminado. Total marcadores:', markers.value.length)
    } else {
      console.warn('⚠️ No se encontró el marcador para eliminar')
    }
  }

  // Actualizar marcador existente
  const actualizarMarcador = (lat, lng, nombre, direccion) => {
    const markerObj = markers.value.find((m) => {
      return Math.abs(m.lat - lat) < 0.00001 && Math.abs(m.lng - lng) < 0.00001
    })

    if (markerObj) {
      markerObj.marker.bindPopup(`<b>${nombre}</b><br>${direccion}`)
      markerObj.nombre = nombre
      console.log('✅ Marcador actualizado:', nombre)
    } else {
      console.warn('⚠️ No se encontró el marcador para actualizar')
    }
  }

  // Cleanup
  const cleanup = () => {
    // Limpiar todos los marcadores
    markers.value.forEach((m) => {
      if (map.value && m.marker) {
        map.value.removeLayer(m.marker)
      }
    })
    markers.value = []

    // Limpiar marcador temporal
    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }

    // Destruir el mapa
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
