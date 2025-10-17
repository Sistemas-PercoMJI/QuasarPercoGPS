// src/composables/useMap.js
import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Referencia reactiva al mapa
const map = ref(null)
const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)
const modoSeleccionActivo = ref(false)

// Nuevas referencias para geozonas
const circuloTemporal = ref(null)
const poligonoTemporal = ref(null)
const puntosPoligono = ref([])
const marcadoresPoligono = ref([]) // Añadido para almacenar los marcadores de los puntos
const modoSeleccionGeozonaCircular = ref(false)
const modoSeleccionGeozonaPoligonal = ref(false)
const poligonoFinalizado = ref(false)

// 🔑 Tu API key de Mapbox
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

export function useMap() {
  // Función para activar modo selección (para POIs)
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

  // Función para desactivar modo selección (para POIs)
  const desactivarModoSeleccion = () => {
    if (!map.value) return

    modoSeleccionActivo.value = false
    map.value.getContainer().style.cursor = ''
    map.value.off('click', onMapClick)

    console.log('❌ Modo selección desactivado')
  }

  // Función para activar modo selección de geozona circular
  const activarModoSeleccionGeozonaCircular = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    modoSeleccionGeozonaCircular.value = true
    ubicacionSeleccionada.value = null

    // Cambiar cursor a "seleccionar"
    map.value.getContainer().style.cursor = 'crosshair'

    // Agregar evento de clic al mapa
    map.value.off('click') // Remover eventos previos
    map.value.on('click', onMapClickGeozonaCircular)

    console.log('✅ Modo selección geozona circular activado')
    return true
  }

  // Función para activar modo selección de geozona poligonal
  const activarModoSeleccionGeozonaPoligonal = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    modoSeleccionGeozonaPoligonal.value = true
    puntosPoligono.value = []
    marcadoresPoligono.value = [] // Limpiar marcadores existentes
    poligonoFinalizado.value = false

    // Cambiar cursor a "seleccionar"
    map.value.getContainer().style.cursor = 'crosshair'

    // Agregar evento de clic al mapa
    map.value.off('click') // Remover eventos previos
    map.value.on('click', onMapClickGeozonaPoligonal)

    console.log('✅ Modo selección geozona poligonal activado')
    return true
  }

  // Manejar clic en el mapa (para POIs)
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
    obtenerDireccion(lat, lng).then((direccionObtenida) => {
      // Renombrado para evitar conflicto
      ubicacionSeleccionada.value = {
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
      }

      console.log('📍 Ubicación seleccionada:', ubicacionSeleccionada.value)
    })
  }

  // Manejar clic en el mapa (para geozona circular)
  const onMapClickGeozonaCircular = (e) => {
    if (!modoSeleccionGeozonaCircular.value || !map.value) return

    const { lat, lng } = e.latlng

    // Limpiar círculo temporal anterior
    if (circuloTemporal.value) {
      map.value.removeLayer(circuloTemporal.value)
    }

    // Crear nuevo círculo temporal con radio por defecto
    circuloTemporal.value = L.circle([lat, lng], {
      radius: 100,
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.2,
      draggable: true,
    }).addTo(map.value)

    // Obtener dirección (reverse geocoding simple)
    obtenerDireccion(lat, lng).then((direccionObtenida) => {
      ubicacionSeleccionada.value = {
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
      }

      console.log('📍 Centro de geozona circular seleccionado:', ubicacionSeleccionada.value)

      // ✅ NUEVO: Mostrar botón flotante
      window.dispatchEvent(
        new CustomEvent('mostrarBotonConfirmarGeozona', {
          detail: { mostrar: true },
        }),
      )
    })
  }

  // Manejar clic en el mapa (para geozona poligonal)
  const onMapClickGeozonaPoligonal = (e) => {
    if (!modoSeleccionGeozonaPoligonal.value || !map.value) return

    const { lat, lng } = e.latlng

    // Agregar punto a la lista
    puntosPoligono.value.push({ lat, lng })

    // Crear marcador para el punto y guardarlo en el array
    const marcadorPunto = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'marcador-punto-poligono',
        html: '📍',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      }),
      draggable: true,
    }).addTo(map.value)

    // Guardar referencia al marcador
    marcadoresPoligono.value.push(marcadorPunto)

    // Actualizar el polígono si hay suficientes puntos
    if (puntosPoligono.value.length >= 2) {
      // Limpiar polígono anterior si existe
      if (poligonoTemporal.value) {
        map.value.removeLayer(poligonoTemporal.value)
      }

      // Crear nuevo polígono
      poligonoTemporal.value = L.polygon(puntosPoligono.value, {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      }).addTo(map.value)
    }

    console.log('📍 Punto agregado al polígono:', { lat, lng })
    console.log('📍 Total de puntos:', puntosPoligono.value.length)

    // ✅ NUEVO: Mostrar botón flotante si ya hay al menos 3 puntos
    if (puntosPoligono.value.length >= 3) {
      window.dispatchEvent(
        new CustomEvent('mostrarBotonConfirmarGeozona', {
          detail: { mostrar: true },
        }),
      )
    }
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

  // Obtener puntos seleccionados para polígono
  const getPuntosSeleccionados = () => {
    return puntosPoligono.value
  }

  // Verificar si el polígono está finalizado
  const isPoligonoFinalizado = () => {
    return poligonoFinalizado.value
  }

  // Finalizar polígono temporal
  const finalizarPoligonoTemporal = () => {
    if (poligonoTemporal.value && puntosPoligono.value.length >= 3) {
      poligonoFinalizado.value = true
      console.log('✅ Polígono finalizado')
    }
  }

  // Limpiar marcador temporal
  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  // Limpiar círculo temporal
  const limpiarCirculoTemporal = () => {
    if (circuloTemporal.value && map.value) {
      map.value.removeLayer(circuloTemporal.value)
      circuloTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  // Limpiar polígono temporal
  const limpiarPoligonoTemporal = () => {
    if (poligonoTemporal.value && map.value) {
      map.value.removeLayer(poligonoTemporal.value)
      poligonoTemporal.value = null
    }

    // Eliminar todos los marcadores de puntos usando el array de referencias
    marcadoresPoligono.value.forEach((marcador) => {
      if (map.value && marcador) {
        map.value.removeLayer(marcador)
      }
    })
    marcadoresPoligono.value = []

    puntosPoligono.value = []
    poligonoFinalizado.value = false
  }

  // Confirmar marcador temporal (convertir a permanente)
  const confirmarMarcadorTemporal = (nombre) => {
    if (marcadorTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Marcador confirmado: ${nombre}`, ubicacionSeleccionada.value)
      // Aquí puedes convertir el marcador temporal a permanente si lo necesitas
      limpiarMarcadorTemporal()
    }
  }

  // Confirmar círculo temporal (convertir a permanente)
  const confirmarCirculoTemporal = (nombre) => {
    if (circuloTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Círculo confirmado: ${nombre}`, ubicacionSeleccionada.value)
      // Aquí puedes convertir el círculo temporal a permanente si lo necesitas
      limpiarCirculoTemporal()
    }
  }

  // Confirmar polígono temporal (convertir a permanente)
  const confirmarPoligonoTemporal = (nombre) => {
    if (poligonoTemporal.value && puntosPoligono.value.length >= 3) {
      console.log(`✅ Polígono confirmado: ${nombre}`, puntosPoligono.value)
      // Aquí puedes convertir el polígono temporal a permanente si lo necesitas
      limpiarPoligonoTemporal()
    }
  }

  // Actualizar marcador existente
  const actualizarMarcador = (lat, lng, nombre, direccion) => {
    // He añadido 'direccion' al console.log para usar la variable
    console.log(`🔄 Actualizando marcador: ${nombre} en ${lat}, ${lng} con dirección: ${direccion}`)

    // Aquí puedes implementar la lógica para actualizar marcadores existentes
    // Por ejemplo, buscar el marcador por su ID o coordenadas y actualizar su popup o icono.
  }

  // Actualizar círculo existente
  const actualizarCirculo = (id, centro, radio, nombre) => {
    console.log(
      `🔄 Actualizando círculo: ${nombre} en ${centro.lat}, ${centro.lng} con radio ${radio}`,
    )
    // Aquí puedes implementar la lógica para actualizar círculos existentes
  }

  // Actualizar polígono existente
  const actualizarPoligono = (id, puntos, nombre) => {
    console.log(`🔄 Actualizando polígono: ${nombre} con ${puntos.length} puntos`)
    // Aquí puedes implementar la lógica para actualizar polígonos existentes
  }

  // Actualizar polígono temporal
  const actualizarPoligonoTemporal = (puntos) => {
    if (!map.value) return

    // Limpiar polígono anterior si existe
    if (poligonoTemporal.value) {
      map.value.removeLayer(poligonoTemporal.value)
    }

    // Crear nuevo polígono con los puntos actualizados
    if (puntos.length >= 2) {
      poligonoTemporal.value = L.polygon(puntos, {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      }).addTo(map.value)
    }
  }

  // Eliminar marcador por coordenadas
  const eliminarMarcadorPorCoordenadas = (lat, lng) => {
    console.log(`🗑️ Eliminando marcador en: ${lat}, ${lng}`)
    // Aquí puedes implementar la lógica para eliminar marcadores
  }

  // Eliminar círculo por ID
  const eliminarCirculo = (id) => {
    console.log(`🗑️ Eliminando círculo con ID: ${id}`)
    // Aquí puedes implementar la lógica para eliminar círculos
  }

  // Eliminar polígono por ID
  const eliminarPoligono = (id) => {
    console.log(`🗑️ Eliminando polígono con ID: ${id}`)
    // Aquí puedes implementar la lógica para eliminar polígonos
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

        // Funciones de selección (las que busca GeoZonas para POIs)
        activarModoSeleccion,
        desactivarModoSeleccion,
        getUbicacionSeleccionada,
        limpiarMarcadorTemporal,
        confirmarMarcadorTemporal,
        actualizarMarcador,
        eliminarMarcadorPorCoordenadas,

        // Nuevas funciones para geozonas circulares
        activarModoSeleccionGeozonaCircular,
        limpiarCirculoTemporal,
        confirmarCirculoTemporal,
        actualizarCirculo,
        eliminarCirculo,

        // Nuevas funciones para geozonas poligonales
        activarModoSeleccionGeozonaPoligonal,
        getPuntosSeleccionados,
        isPoligonoFinalizado,
        finalizarPoligonoTemporal,
        limpiarPoligonoTemporal,
        confirmarPoligonoTemporal,
        actualizarPoligono,
        actualizarPoligonoTemporal,
        eliminarPoligono,
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
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false
    ubicacionSeleccionada.value = null
    marcadorTemporal.value = null
    circuloTemporal.value = null
    poligonoTemporal.value = null
    puntosPoligono.value = []
    marcadoresPoligono.value = [] // Limpiar marcadores de polígono
    poligonoFinalizado.value = false

    console.log('🧹 Mapa limpiado')
  }

  return {
    map,
    initMap,
    addMarker,
    cleanup,
    // Exportar las funciones existentes
    activarModoSeleccion,
    desactivarModoSeleccion,
    getUbicacionSeleccionada,
    limpiarMarcadorTemporal,
    confirmarMarcadorTemporal,
    actualizarMarcador,
    eliminarMarcadorPorCoordenadas,
    // Exportar las nuevas funciones para geozonas circulares
    activarModoSeleccionGeozonaCircular,
    limpiarCirculoTemporal,
    confirmarCirculoTemporal,
    actualizarCirculo,
    eliminarCirculo,
    // Exportar las nuevas funciones para geozonas poligonales
    activarModoSeleccionGeozonaPoligonal,
    getPuntosSeleccionados,
    isPoligonoFinalizado,
    finalizarPoligonoTemporal,
    limpiarPoligonoTemporal,
    confirmarPoligonoTemporal,
    actualizarPoligono,
    actualizarPoligonoTemporal,
    eliminarPoligono,
  }
}
