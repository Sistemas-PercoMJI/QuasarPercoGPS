// src/composables/useMap.js
// 🔧 SOLUCIÓN AL PROBLEMA: Los cambios clave están en la función toggleTrafico()

import { ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Referencia reactiva al mapa
const map = ref(null)
const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)
const modoSeleccionActivo = ref(false)

// 🔧 CAMBIO 1: Convertir capaTrafico a ref para reactividad
const capaTrafico = ref(null)

// Nuevas referencias para geozonas
const circuloTemporal = ref(null)
const poligonoTemporal = ref(null)
const puntosPoligono = ref([])
const marcadoresPoligono = ref([])
const modoSeleccionGeozonaCircular = ref(false)
const modoSeleccionGeozonaPoligonal = ref(false)
const poligonoFinalizado = ref(false)

// 🔑 Tu API key de Mapbox
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

export function useMap() {
  // Variable para almacenar el círculo temporal del POI
  let circuloTemporalPOI = null

  // ... (mantén todas tus funciones anteriores igual)
  // Solo modificaremos toggleTrafico y cleanup

  function crearCirculoTemporalPOI(lat, lng, radio) {
    if (!map.value || !L) return
    if (circuloTemporalPOI) {
      map.value.removeLayer(circuloTemporalPOI)
    }
    circuloTemporalPOI = L.circle([lat, lng], {
      radius: radio,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '5, 10',
    }).addTo(map.value)
    console.log(`🔵 Círculo temporal POI creado: ${radio}m`)
  }

  function actualizarRadioCirculoTemporal(lat, lng, nuevoRadio) {
    if (!map.value || !L) return
    if (circuloTemporalPOI) {
      map.value.removeLayer(circuloTemporalPOI)
    }
    crearCirculoTemporalPOI(lat, lng, nuevoRadio)
    console.log(`🔄 Radio actualizado: ${nuevoRadio}m`)
  }

  function limpiarCirculoTemporalPOI() {
    if (circuloTemporalPOI && map.value) {
      map.value.removeLayer(circuloTemporalPOI)
      circuloTemporalPOI = null
      console.log('🧹 Círculo temporal POI limpiado')
    }
  }

  function confirmarMarcadorConCirculo(nombre, radio) {
    if (!marcadorTemporal.value || !ubicacionSeleccionada.value) {
      console.error('❌ No hay marcador temporal para confirmar')
      return
    }
    const { lat, lng } = ubicacionSeleccionada.value.coordenadas
    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }
    L.marker([lat, lng], {
      icon: L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.value)
      .bindPopup(`<b>📍 ${nombre}</b><br>${ubicacionSeleccionada.value.direccion}`)
    L.circle([lat, lng], {
      radius: radio,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map.value)
    limpiarCirculoTemporalPOI()
    ubicacionSeleccionada.value = null
    console.log(`✅ POI confirmado con círculo de ${radio}m`)
  }

  function actualizarMarcadorConCirculo(lat, lng, nombre, direccion, radio) {
    if (!map.value || !L) return
    map.value.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        const pos = layer.getLatLng()
        if (pos && Math.abs(pos.lat - lat) < 0.00001 && Math.abs(pos.lng - lng) < 0.00001) {
          map.value.removeLayer(layer)
        }
      }
    })
    L.marker([lat, lng], {
      icon: L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.value)
      .bindPopup(`<b>📍 ${nombre}</b><br>${direccion}`)
    L.circle([lat, lng], {
      radius: radio,
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map.value)
    console.log(`🔄 Marcador y círculo actualizados: ${nombre} (${radio}m)`)
  }

  const activarModoSeleccion = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }
    modoSeleccionActivo.value = true
    ubicacionSeleccionada.value = null
    map.value.getContainer().style.cursor = 'crosshair'
    map.value.off('click')
    map.value.on('click', onMapClick)
    console.log('✅ Modo selección activado')
    return true
  }

  const desactivarModoSeleccion = () => {
    if (!map.value) return
    modoSeleccionActivo.value = false
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false
    map.value.getContainer().style.cursor = ''
    map.value.off('click', onMapClick)
    map.value.off('click', onMapClickGeozonaCircular)
    map.value.off('click', onMapClickGeozonaPoligonal)
    console.log('❌ Todos los modos de selección desactivados')
  }

  const activarModoSeleccionGeozonaCircular = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }
    modoSeleccionGeozonaCircular.value = true
    ubicacionSeleccionada.value = null
    map.value.getContainer().style.cursor = 'crosshair'
    map.value.off('click')
    map.value.on('click', onMapClickGeozonaCircular)
    console.log('✅ Modo selección geozona circular activado')
    return true
  }

  const activarModoSeleccionGeozonaPoligonal = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }
    modoSeleccionGeozonaPoligonal.value = true
    puntosPoligono.value = []
    marcadoresPoligono.value = []
    poligonoFinalizado.value = false
    map.value.getContainer().style.cursor = 'crosshair'
    map.value.off('click')
    map.value.on('click', onMapClickGeozonaPoligonal)
    console.log('✅ Modo selección geozona poligonal activado')
    return true
  }

  const onMapClick = (e) => {
    if (!modoSeleccionActivo.value || !map.value) return
    const { lat, lng } = e.latlng
    if (marcadorTemporal.value) {
      map.value.removeLayer(marcadorTemporal.value)
    }
    marcadorTemporal.value = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'marcador-temporal',
        html: '📍',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
      draggable: true,
    }).addTo(map.value)
    obtenerDireccion(lat, lng).then((direccionObtenida) => {
      ubicacionSeleccionada.value = {
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
      }
      console.log('📍 Ubicación seleccionada:', ubicacionSeleccionada.value)
    })
  }

  const onMapClickGeozonaCircular = (e) => {
    if (!modoSeleccionGeozonaCircular.value || !map.value) return
    const { lat, lng } = e.latlng
    if (circuloTemporal.value) {
      map.value.removeLayer(circuloTemporal.value)
    }
    const radioInicial = 500
    circuloTemporal.value = L.circle([lat, lng], {
      radius: radioInicial,
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.2,
    }).addTo(map.value)
    obtenerDireccion(lat, lng).then((direccionObtenida) => {
      ubicacionSeleccionada.value = {
        tipo: 'circular',
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
        radio: radioInicial,
      }
      console.log('🔵 Geozona circular seleccionada:', ubicacionSeleccionada.value)
    })
  }

  const onMapClickGeozonaPoligonal = (e) => {
    if (!modoSeleccionGeozonaPoligonal.value || !map.value) return
    const { lat, lng } = e.latlng
    const punto = { lat, lng }
    puntosPoligono.value.push(punto)
    const marcador = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'punto-poligono',
        html: `<div style="
          width: 12px;
          height: 12px;
          background: #3388ff;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    }).addTo(map.value)
    marcadoresPoligono.value.push(marcador)
    if (puntosPoligono.value.length >= 2) {
      actualizarPoligonoTemporal(puntosPoligono.value)
    }
    console.log(`📍 Punto ${puntosPoligono.value.length} agregado al polígono`)
  }

  const finalizarPoligonoTemporal = () => {
    if (puntosPoligono.value.length < 3) {
      console.error('❌ Se necesitan al menos 3 puntos para crear un polígono')
      return false
    }
    poligonoFinalizado.value = true
    console.log('✅ Polígono finalizado con', puntosPoligono.value.length, 'puntos')
    return true
  }

  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`,
      )
      const data = await response.json()
      return data.features[0]?.place_name || 'Dirección no disponible'
    } catch (error) {
      console.error('Error obteniendo dirección:', error)
      return 'Error al obtener dirección'
    }
  }

  const getUbicacionSeleccionada = () => ubicacionSeleccionada.value
  const getPuntosSeleccionados = () => puntosPoligono.value
  const isPoligonoFinalizado = () => poligonoFinalizado.value

  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporal.value && map.value) {
      map.value.removeLayer(marcadorTemporal.value)
      marcadorTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  const limpiarCirculoTemporal = () => {
    if (circuloTemporal.value && map.value) {
      map.value.removeLayer(circuloTemporal.value)
      circuloTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  const limpiarPoligonoTemporal = () => {
    if (poligonoTemporal.value && map.value) {
      map.value.removeLayer(poligonoTemporal.value)
      poligonoTemporal.value = null
    }
    marcadoresPoligono.value.forEach((marcador) => {
      if (map.value && marcador) {
        map.value.removeLayer(marcador)
      }
    })
    marcadoresPoligono.value = []
    puntosPoligono.value = []
    poligonoFinalizado.value = false
  }

  const confirmarMarcadorTemporal = (nombre) => {
    if (marcadorTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Marcador confirmado: ${nombre}`, ubicacionSeleccionada.value)
      limpiarMarcadorTemporal()
    }
  }

  const confirmarCirculoTemporal = (nombre) => {
    if (circuloTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Círculo confirmado: ${nombre}`, ubicacionSeleccionada.value)
      limpiarCirculoTemporal()
    }
  }

  const confirmarPoligonoTemporal = (nombre) => {
    if (poligonoTemporal.value && puntosPoligono.value.length >= 3) {
      console.log(`✅ Polígono confirmado: ${nombre}`, puntosPoligono.value)
      limpiarPoligonoTemporal()
    }
  }

  const actualizarMarcador = (lat, lng, nombre, direccion) => {
    console.log(`🔄 Actualizando marcador: ${nombre} en ${lat}, ${lng} con dirección: ${direccion}`)
  }

  const actualizarCirculo = (id, centro, radio, nombre) => {
    console.log(
      `🔄 Actualizando círculo: ${nombre} en ${centro.lat}, ${centro.lng} con radio ${radio}`,
    )
  }

  const actualizarPoligono = (id, puntos, nombre) => {
    console.log(`🔄 Actualizando polígono: ${nombre} con ${puntos.length} puntos`)
  }

  const actualizarPoligonoTemporal = (puntos) => {
    if (!map.value) return
    if (poligonoTemporal.value) {
      map.value.removeLayer(poligonoTemporal.value)
    }
    if (puntos.length >= 2) {
      poligonoTemporal.value = L.polygon(puntos, {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      }).addTo(map.value)
    }
  }

  const eliminarMarcadorPorCoordenadas = (lat, lng) => {
    console.log(`🗑️ Eliminando marcador en: ${lat}, ${lng}`)
  }

  const eliminarCirculo = (id) => {
    console.log(`🗑️ Eliminando círculo con ID: ${id}`)
  }

  const eliminarPoligono = (id) => {
    console.log(`🗑️ Eliminando polígono con ID: ${id}`)
  }

  const initMap = async (containerId, center, zoom) => {
    try {
      if (map.value) {
        map.value.remove()
      }
      map.value = L.map(containerId).setView(center, zoom)
      const mapaAPI = {
        map: map.value,
        L: L,
        activarModoSeleccion,
        desactivarModoSeleccion,
        getUbicacionSeleccionada,
        limpiarMarcadorTemporal,
        confirmarMarcadorTemporal,
        actualizarMarcador,
        eliminarMarcadorPorCoordenadas,
        activarModoSeleccionGeozonaCircular,
        limpiarCirculoTemporal,
        confirmarCirculoTemporal,
        actualizarCirculo,
        eliminarCirculo,
        activarModoSeleccionGeozonaPoligonal,
        getPuntosSeleccionados,
        isPoligonoFinalizado,
        finalizarPoligonoTemporal,
        limpiarPoligonoTemporal,
        confirmarPoligonoTemporal,
        actualizarPoligono,
        actualizarPoligonoTemporal,
        eliminarPoligono,
        crearCirculoTemporalPOI,
        actualizarRadioCirculoTemporal,
        limpiarCirculoTemporalPOI,
        confirmarMarcadorConCirculo,
        actualizarMarcadorConCirculo,
        toggleTrafico,
      }
      window.mapaGlobal = mapaAPI
      window.L = L
      const mapPage = document.getElementById('map-page')
      if (mapPage) {
        mapPage._mapaAPI = mapaAPI
        console.log('✅ _mapaAPI expuesto en map-page')
      }
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
      // 🔧 CAMBIO 2: Limpiar listener de zoom antes de remover el mapa
      map.value.off('zoomend')
      map.value.remove()
      map.value = null
    }
    if (window.mapaGlobal) {
      window.mapaGlobal = null
    }
    if (window.marcadorBusqueda) {
      window.marcadorBusqueda = null
    }
    modoSeleccionActivo.value = false
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false
    ubicacionSeleccionada.value = null
    marcadorTemporal.value = null
    circuloTemporal.value = null
    poligonoTemporal.value = null
    puntosPoligono.value = []
    marcadoresPoligono.value = []
    poligonoFinalizado.value = false
    capaTrafico.value = null // 🔧 Limpiar referencia
    console.log('🧹 Mapa limpiado')
  }

  // 🚦 TRAFICO - SOLUCIÓN PRINCIPAL
  const toggleTrafico = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    if (capaTrafico.value) {
      // Desactivar tráfico
      map.value.off('zoomend', actualizarCapaTrafico) // 🔧 Remover listener
      map.value.removeLayer(capaTrafico.value)
      capaTrafico.value = null
      console.log('🚦 Capa de tráfico DESACTIVADA')
      return false
    } else {
      // Activar tráfico
      capaTrafico.value = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/traffic-day-v2/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
        {
          maxZoom: 22,
          tileSize: 512,
          zoomOffset: -1,
          opacity: 1,
          className: 'traffic-layer-blend',
          // 🔧 SOLUCIÓN 1: Configurar para actualización inmediata
          updateWhenIdle: false, // NO esperar a que termine el zoom
          updateWhenZooming: true, // Actualizar DURANTE el zoom
          keepBuffer: 2, // Mantener buffer de tiles
        },
      ).addTo(map.value)

      // 🔧 SOLUCIÓN 2: Forzar redibujado en cada zoom
      map.value.on('zoomend', actualizarCapaTrafico)

      console.log('🚦 Capa de tráfico ACTIVADA')
      return true
    }
  }

  // 🔧 SOLUCIÓN 3: Función dedicada para actualizar la capa
  const actualizarCapaTrafico = () => {
    if (capaTrafico.value) {
      // Forzar redibujado de todos los tiles
      capaTrafico.value.redraw()
      console.log('🔄 Capa de tráfico actualizada en zoom:', map.value.getZoom())
    }
  }

  return {
    map,
    initMap,
    addMarker,
    cleanup,
    activarModoSeleccion,
    desactivarModoSeleccion,
    getUbicacionSeleccionada,
    limpiarMarcadorTemporal,
    confirmarMarcadorTemporal,
    actualizarMarcador,
    eliminarMarcadorPorCoordenadas,
    activarModoSeleccionGeozonaCircular,
    limpiarCirculoTemporal,
    confirmarCirculoTemporal,
    actualizarCirculo,
    eliminarCirculo,
    activarModoSeleccionGeozonaPoligonal,
    getPuntosSeleccionados,
    isPoligonoFinalizado,
    finalizarPoligonoTemporal,
    limpiarPoligonoTemporal,
    confirmarPoligonoTemporal,
    actualizarPoligono,
    actualizarPoligonoTemporal,
    eliminarPoligono,
    crearCirculoTemporalPOI,
    actualizarRadioCirculoTemporal,
    limpiarCirculoTemporalPOI,
    confirmarMarcadorConCirculo,
    actualizarMarcadorConCirculo,
    toggleTrafico,
  }
}
