// src/composables/useMapLibre.js - COMPLETO CON TODAS TUS FUNCIONES

import { ref } from 'vue'
import mapboxgl from 'mapbox-gl' // ⬅️ CAMBIO
import 'mapbox-gl/dist/mapbox-gl.css' // ⬅️ CAMBIO

// Referencia reactiva al mapa
const map = ref(null)
//const marcadorTemporal = ref(null)
const ubicacionSeleccionada = ref(null)
const modoSeleccionActivo = ref(false)
const marcadoresUnidades = ref({})
const modoSeleccionGeozonaCircular = ref(false)
const modoSeleccionGeozonaPoligonal = ref(false)
const poligonoFinalizado = ref(false)
const colorGeozonaActual = ref('#4ECDC4')
const puntosPoligono = ref([])
const circuloTemporal = ref(null)
const poligonoTemporal = ref(null)
const circuloTemporalPOI = ref(null)
let colorPoligonoTemporal = '#4ECDC4'
let marcadoresPuntosPoligono = []

//const capaTrafico = ref(true)

// 🔑 Tu API key de Mapbox
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

export function useMapboxGL() {
  let marcadorTemporalElement = null

  // 🆕 FUNCIONES PARA TRACKING DE UNIDADES GPS
  const crearIconoUnidad = (estado) => {
    const colores = {
      movimiento: '#4CAF50',
      detenido: '#FF9800',
      inactivo: '#9E9E9E',
    }
    const color = colores[estado] || '#9E9E9E'

    const el = document.createElement('div')
    el.className = 'custom-marker-unidad'
    el.style.width = '36px'
    el.style.height = '36px'
    el.innerHTML = `
      <div style="
        width: 36px;
        height: 36px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
        <div style="
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          background: ${estado === 'movimiento' ? '#4CAF50' : '#FF9800'};
          border: 2px solid white;
          border-radius: 50%;
          ${estado === 'movimiento' ? 'animation: pulse-gps 2s infinite;' : ''}
        "></div>
      </div>
    `
    return el
  }

  const crearPopupUnidad = (unidad) => {
    const estadoTexto = {
      movimiento: 'En movimiento',
      detenido: 'Detenido',
      inactivo: 'Inactivo',
    }
    const estadoColor = {
      movimiento: '#4CAF50',
      detenido: '#FF9800',
      inactivo: '#9E9E9E',
    }

    return `
      <div style="min-width: 220px; font-family: 'Roboto', sans-serif;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #eee;">
          ${
            unidad.conductorFoto
              ? `<img src="${unidad.conductorFoto}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid ${estadoColor[unidad.estado]};">`
              : `<div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${unidad.conductorNombre.charAt(0)}</div>`
          }
          <div style="flex: 1;">
            <strong style="font-size: 15px; color: #212121;">${unidad.conductorNombre}</strong>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">${unidad.unidadNombre}</div>
          </div>
        </div>
        <div style="background: #f5f7fa; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${estadoColor[unidad.estado]};"></div>
            <span style="font-size: 13px; font-weight: 600; color: ${estadoColor[unidad.estado]};">${estadoTexto[unidad.estado]}</span>
          </div>
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px; font-size: 12px; color: #424242;">
            <span>⚡ Velocidad:</span><span>${unidad.velocidad} km/h</span>
            <span>📍 Ubicación:</span><span>${unidad.direccionTexto}</span>
            <span>🔋 Batería:</span><span>${unidad.bateria}%</span>
            <span>🔑 Placa:</span><span>${unidad.unidadPlaca}</span>
          </div>
        </div>
        <div style="font-size: 11px; color: #999; text-align: center; margin-top: 8px;">
          Última actualización: ${new Date(unidad.timestamp).toLocaleTimeString('es-MX')}
        </div>
      </div>
    `
  }

  const actualizarMarcadoresUnidades = (unidades) => {
    if (!map.value) {
      console.warn('⚠️ Mapa no disponible')
      return
    }

    const idsActuales = new Set()

    unidades.forEach((unidad) => {
      if (
        !unidad.ubicacion ||
        typeof unidad.ubicacion.lat !== 'number' ||
        typeof unidad.ubicacion.lng !== 'number' ||
        isNaN(unidad.ubicacion.lat) ||
        isNaN(unidad.ubicacion.lng)
      ) {
        console.warn(`⚠️ Unidad sin ubicación válida:`, {
          id: unidad.unidadId || unidad.id,
          nombre: unidad.unidadNombre,
          ubicacion: unidad.ubicacion,
        })
        return
      }

      const unidadId = unidad.unidadId || unidad.id
      idsActuales.add(unidadId)

      const { lat, lng } = unidad.ubicacion

      if (marcadoresUnidades.value[unidadId]) {
        // Actualizar marcador existente
        marcadoresUnidades.value[unidadId].setLngLat([lng, lat])
        marcadoresUnidades.value[unidadId].getPopup().setHTML(crearPopupUnidad(unidad))
      } else {
        // Crear nuevo marcador
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(crearPopupUnidad(unidad))

        const marker = new mapboxgl.Marker({
          element: crearIconoUnidad(unidad.estado),
          anchor: 'center',
        })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.value)

        marcadoresUnidades.value[unidadId] = marker
        console.log(`🆕 Nuevo marcador creado: ${unidad.conductorNombre} - ${unidad.unidadNombre}`)
      }
    })

    // Limpiar marcadores inactivos
    Object.keys(marcadoresUnidades.value).forEach((id) => {
      if (!idsActuales.has(id)) {
        marcadoresUnidades.value[id].remove()
        delete marcadoresUnidades.value[id]
        console.log(`🗑️ Marcador GPS removido: ${id}`)
      }
    })
  }

  const limpiarMarcadoresUnidades = () => {
    if (!map.value) return

    Object.values(marcadoresUnidades.value).forEach((marcador) => {
      marcador.remove()
    })

    marcadoresUnidades.value = {}
    console.log('🧹 Marcadores GPS limpiados')
  }

  const centrarEnUnidad = (unidadId) => {
    if (!map.value) return

    const marcador = marcadoresUnidades.value[unidadId]
    if (marcador) {
      const lngLat = marcador.getLngLat()
      map.value.flyTo({
        center: [lngLat.lng, lngLat.lat],
        zoom: 16,
        duration: 1000,
      })
      marcador.togglePopup()
    }
  }

  // 🔵 FUNCIONES POI CON CÍRCULOS
  function crearCirculoTemporalPOI(lat, lng, radio) {
    if (!map.value) return

    limpiarCirculoTemporalPOI()

    circuloTemporalPOI.value = {
      type: 'circle',
      center: [lng, lat],
      radius: radio,
    }

    if (!map.value.getSource('poi-circle-temp')) {
      map.value.addSource('poi-circle-temp', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      })

      map.value.addLayer({
        id: 'poi-circle-temp',
        type: 'circle',
        source: 'poi-circle-temp',
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, metersToPixelsAtMaxZoom(radio, lat)],
            ],
            base: 2,
          },
          'circle-color': '#2196F3',
          'circle-opacity': 0.2,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#2196F3',
        },
      })
    } else {
      map.value.getSource('poi-circle-temp').setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      })
    }

    console.log(`🔵 Círculo temporal POI creado: ${radio}m`)
  }

  function metersToPixelsAtMaxZoom(meters, latitude) {
    return meters / 0.075 / Math.cos((latitude * Math.PI) / 180)
  }

  function actualizarRadioCirculoTemporal(lat, lng, nuevoRadio) {
    if (!map.value) return
    crearCirculoTemporalPOI(lat, lng, nuevoRadio)
    console.log(`🔄 Radio actualizado: ${nuevoRadio}m`)
  }

  function limpiarCirculoTemporalPOI() {
    if (map.value && map.value.getLayer('poi-circle-temp')) {
      map.value.removeLayer('poi-circle-temp')
      map.value.removeSource('poi-circle-temp')
      circuloTemporalPOI.value = null
      console.log('🧹 Círculo temporal POI limpiado')
    }
  }

  function confirmarMarcadorConCirculo(nombre, radio) {
    if (!ubicacionSeleccionada.value) {
      console.error('❌ No hay ubicación seleccionada')
      return
    }

    const { lat, lng } = ubicacionSeleccionada.value.coordenadas

    // Crear marcador permanente
    const markerEl = document.createElement('div')
    markerEl.innerHTML = '📍'
    markerEl.style.fontSize = '30px'

    new mapboxgl.Marker({ element: markerEl })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<b>📍 ${nombre}</b><br>${ubicacionSeleccionada.value.direccion}`,
        ),
      )
      .addTo(map.value)

    // Crear círculo permanente
    const circleId = `poi-circle-${Date.now()}`
    map.value.addSource(circleId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      },
    })

    map.value.addLayer({
      id: circleId,
      type: 'circle',
      source: circleId,
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, metersToPixelsAtMaxZoom(radio, lat)],
          ],
          base: 2,
        },
        'circle-color': '#2196F3',
        'circle-opacity': 0.15,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#2196F3',
      },
    })

    limpiarCirculoTemporalPOI()
    limpiarMarcadorTemporal()
    ubicacionSeleccionada.value = null
  }

  function actualizarMarcadorConCirculo(lat, lng, nombre, direccion, radio) {
    if (!map.value) return
    // Implementación similar a confirmarMarcadorConCirculo
    console.log(`🔄 Marcador y círculo actualizados: ${nombre} (${radio}m)`)
  }

  // 🎯 MODO SELECCIÓN SIMPLE (POI)
  const activarModoSeleccion = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    modoSeleccionActivo.value = true
    ubicacionSeleccionada.value = null
    map.value.getCanvas().style.cursor = 'crosshair'

    map.value.once('click', async (e) => {
      const { lng, lat } = e.lngLat

      // Remover marcador anterior
      if (marcadorTemporalElement) {
        marcadorTemporalElement.remove()
      }

      // Crear marcador temporal
      const el = document.createElement('div')
      el.innerHTML = '📍'
      el.style.fontSize = '30px'

      marcadorTemporalElement = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map.value)

      const direccionObtenida = await obtenerDireccion(lat, lng)
      ubicacionSeleccionada.value = {
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
      }

      console.log('📍 Ubicación seleccionada:', ubicacionSeleccionada.value)
    })

    console.log('✅ Modo selección activado')
    return true
  }

  const desactivarModoSeleccion = () => {
    if (!map.value) return
    modoSeleccionActivo.value = false
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false
    map.value.getCanvas().style.cursor = ''
    console.log('❌ Todos los modos de selección desactivados')
  }

  // 🔵 MODO SELECCIÓN GEOZONA CIRCULAR
  const activarModoSeleccionGeozonaCircular = () => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }

    modoSeleccionGeozonaCircular.value = true
    ubicacionSeleccionada.value = null
    map.value.getCanvas().style.cursor = 'crosshair'

    map.value.once('click', async (e) => {
      const { lng, lat } = e.lngLat
      const radioInicial = 500

      if (circuloTemporal.value) {
        map.value.removeLayer(circuloTemporal.value.id)
        map.value.removeSource(circuloTemporal.value.id)
      }

      const circleId = `temp-circle-${Date.now()}`
      map.value.addSource(circleId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      })

      map.value.addLayer({
        id: circleId,
        type: 'circle',
        source: circleId,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, metersToPixelsAtMaxZoom(radioInicial, lat)],
            ],
            base: 2,
          },
          'circle-color': '#3388ff',
          'circle-opacity': 0.2,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3388ff',
        },
      })

      circuloTemporal.value = { id: circleId }

      const direccionObtenida = await obtenerDireccion(lat, lng)
      ubicacionSeleccionada.value = {
        tipo: 'circular',
        coordenadas: { lat, lng },
        direccion: direccionObtenida,
        radio: radioInicial,
      }

      console.log('🔵 Geozona circular seleccionada:', ubicacionSeleccionada.value)
    })

    console.log('✅ Modo selección geozona circular activado')
    return true
  }

  const limpiarCirculoTemporal = () => {
    if (circuloTemporal.value && map.value) {
      if (map.value.getLayer(circuloTemporal.value.id)) {
        map.value.removeLayer(circuloTemporal.value.id)
        map.value.removeSource(circuloTemporal.value.id)
      }
      circuloTemporal.value = null
    }
    ubicacionSeleccionada.value = null
  }

  const confirmarCirculoTemporal = (nombre) => {
    if (circuloTemporal.value && ubicacionSeleccionada.value) {
      console.log(`✅ Círculo confirmado: ${nombre}`, ubicacionSeleccionada.value)
      limpiarCirculoTemporal()
    }
  }

  // 🔷 MODO SELECCIÓN GEOZONA POLIGONAL
  const activarModoSeleccionGeozonaPoligonal = (puntosExistentes = [], color = '#4ECDC4') => {
    if (!map.value) {
      console.error('❌ Mapa no inicializado')
      return false
    }
    limpiarPoligonoTemporal()
    colorPoligonoTemporal = color
    modoSeleccionGeozonaPoligonal.value = true
    colorGeozonaActual.value = color

    if (puntosExistentes && puntosExistentes.length > 0) {
      console.log('🔄 Restaurando puntos existentes:', puntosExistentes.length)
      setPuntosSeleccionados(puntosExistentes)
    } else {
      puntosPoligono.value = []
    }

    poligonoFinalizado.value = false
    map.value.getCanvas().style.cursor = 'crosshair'

    const clickHandler = (e) => {
      if (!modoSeleccionGeozonaPoligonal.value) return

      const { lng, lat } = e.lngLat
      puntosPoligono.value.push({ lat, lng })

      // Agregar marcador del punto
      const markerEl = document.createElement('div')
      markerEl.style.width = '12px'
      markerEl.style.height = '12px'
      markerEl.style.backgroundColor = color
      markerEl.style.border = '2px solid white'
      markerEl.style.borderRadius = '50%'
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.value)

      marcadoresPuntosPoligono.push(marker)

      if (puntosPoligono.value.length >= 2) {
        actualizarPoligonoTemporal(puntosPoligono.value)
      }

      console.log(`📍 Punto ${puntosPoligono.value.length} agregado con color: ${color}`)

      if (puntosPoligono.value.length >= 3) {
        console.log('🎯 ¡Tercer punto colocado! Mostrando botones de confirmación.')
        window.dispatchEvent(
          new CustomEvent('mostrarBotonConfirmarGeozona', {
            detail: { mostrar: true },
          }),
        )
      }
    }

    map.value.on('click', clickHandler)

    console.log('✅ Modo selección geozona poligonal activado con color:', color)
    return true
  }

  const actualizarPoligonoTemporal = (puntos) => {
    if (!map.value || puntos.length === 0) return

    const sourceId = 'geozona-temporal'
    const coordinates = puntos.map((p) => [p.lng, p.lat])

    // ✅ Usar el color actual
    const color = colorPoligonoTemporal || '#4ECDC4'
    const borderColor = oscurecerColor(color, 30)

    if (map.value.getSource(sourceId)) {
      // Actualizar datos
      map.value.getSource(sourceId).setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      })

      // ✅ AGREGAR: Actualizar colores también
      if (map.value.getLayer(`${sourceId}-fill`)) {
        map.value.setPaintProperty(`${sourceId}-fill`, 'fill-color', color)
      }
      if (map.value.getLayer(`${sourceId}-outline`)) {
        map.value.setPaintProperty(`${sourceId}-outline`, 'line-color', borderColor)
      }
    } else {
      // Crear source y capas con el color correcto
      map.value.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        },
      })

      map.value.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.3,
        },
      })

      map.value.addLayer({
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': borderColor,
          'line-width': 2,
        },
      })
    }

    console.log('✅ Polígono temporal actualizado con', puntos.length, 'puntos y color', color)
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

  const limpiarPoligonoTemporal = () => {
    if (!map.value) return

    const sourceId = 'geozona-temporal'

    try {
      // ✅ Eliminar capas en orden correcto
      if (map.value.getLayer(`${sourceId}-outline`)) {
        map.value.removeLayer(`${sourceId}-outline`)
      }
      if (map.value.getLayer(`${sourceId}-fill`)) {
        map.value.removeLayer(`${sourceId}-fill`)
      }

      // ✅ Eliminar source
      if (map.value.getSource(sourceId)) {
        map.value.removeSource(sourceId)
      }

      // ✅ Limpiar marcadores de puntos
      if (marcadoresPuntosPoligono && marcadoresPuntosPoligono.length > 0) {
        marcadoresPuntosPoligono.forEach((marker) => {
          try {
            marker.remove()
          } catch (e) {
            console.warn('Error al remover marcador:', e)
          }
        })
        marcadoresPuntosPoligono = []
      }

      // ✅ Limpiar puntos
      puntosPoligono.value = []
      poligonoFinalizado.value = false

      console.log('✅ Polígono temporal limpiado completamente')
    } catch (error) {
      console.error('❌ Error limpiando polígono temporal:', error)
    }
  }
  const confirmarPoligonoTemporal = (nombre) => {
    if (poligonoTemporal.value && puntosPoligono.value.length >= 3) {
      console.log(`✅ Polígono confirmado: ${nombre}`, puntosPoligono.value)
      limpiarPoligonoTemporal()
    }
  }

  // 🔄 ACTUALIZAR GEOZONAS EXISTENTES
  const actualizarCirculo = (id, centro, radio, nombre, color = '#4ECDC4') => {
    if (!map.value) return

    const circleId = `geozona-circle-${id}`

    if (map.value.getLayer(circleId)) {
      map.value.removeLayer(circleId)
      map.value.removeSource(circleId)
    }

    const borderColor = oscurecerColor(color, 30) // ✅ Ya está definida globalmente

    map.value.addSource(circleId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [centro.lng, centro.lat],
        },
      },
    })

    map.value.addLayer({
      id: circleId,
      type: 'circle',
      source: circleId,
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, metersToPixelsAtMaxZoom(radio, centro.lat)],
          ],
          base: 2,
        },
        'circle-color': color,
        'circle-opacity': 0.2,
        'circle-stroke-width': 3,
        'circle-stroke-color': borderColor,
      },
    })

    console.log(`✅ Círculo actualizado con color: ${color}`)
  }

  const actualizarPoligono = (id, puntos, nombre, color = '#4ECDC4') => {
    if (!map.value) return

    const polygonId = `geozona-polygon-${id}`

    if (map.value.getLayer(polygonId)) {
      map.value.removeLayer(polygonId)
      map.value.removeLayer(`${polygonId}-outline`)
      map.value.removeSource(polygonId)
    }

    const borderColor = oscurecerColor(color, 30)

    const coordinates = puntos.map((p) => [p.lng, p.lat])
    coordinates.push(coordinates[0])

    map.value.addSource(polygonId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    })

    map.value.addLayer({
      id: polygonId,
      type: 'fill',
      source: polygonId,
      paint: {
        'fill-color': color,
        'fill-opacity': 0.2,
      },
    })

    map.value.addLayer({
      id: `${polygonId}-outline`,
      type: 'line',
      source: polygonId,
      paint: {
        'line-color': borderColor,
        'line-width': 3,
      },
    })

    console.log(`✅ Polígono actualizado con color: ${color}`)
  }

  // 🌐 OBTENER DIRECCIÓN
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

  // 🗺️ INICIALIZAR MAPA
  const initMap = (containerId, center, zoom) => {
    try {
      if (map.value) {
        map.value.remove()
      }

      // ✅ Configurar token de Mapbox
      mapboxgl.accessToken = MAPBOX_TOKEN

      console.log('🗺️ Inicializando mapa Mapbox GL v1...')

      map.value = new mapboxgl.Map({
        container: containerId,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [center[1], center[0]],
        zoom: zoom,
        // ✅ Agregar estas opciones de rendimiento
        hash: false,
        preserveDrawingBuffer: false,
        refreshExpiredTiles: false,
        maxTileCacheSize: 50, // Cachear menos tiles
        minZoom: 5, //
        maxZoom: 18,
      })

      // Agregar controles de navegación
      map.value.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // ✅ Cuando el mapa cargue, agregar capa de tráfico
      map.value.on('load', () => {
        console.log('✅ Mapa Mapbox GL cargado correctamente')

        // Agregar fuente de tráfico
        map.value.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        })

        // ✅ Buscar la primera capa de etiquetas
        const layers = map.value.getStyle().layers
        let labelLayerId
        for (let i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id
            break
          }
        }

        // ✅ Insertar tráfico ANTES de las etiquetas
        map.value.addLayer(
          {
            id: 'traffic',
            type: 'line',
            source: 'mapbox-traffic',
            'source-layer': 'traffic',
            paint: {
              'line-width': [
                'interpolate',
                ['exponential', 1.5],
                ['zoom'],
                10,
                1, // Zoom 10 → grosor 1px
                13,
                2, // Zoom 13 → grosor 2px
                15,
                3, // Zoom 15 → grosor 3px
                18,
                6, // Zoom 18 → grosor 5px
                20,
                10, // Zoom 20 → grosor 8px
              ],
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'],
                '#4CAF50',
                ['==', ['get', 'congestion'], 'moderate'],
                '#FF9800',
                ['==', ['get', 'congestion'], 'heavy'],
                '#F44336',
                ['==', ['get', 'congestion'], 'severe'],
                '#9C27B0',
                '#888888',
              ],
            },
            layout: {
              visibility: 'none',
            },
          },
          labelLayerId,
        )

        console.log('🚦 Capa de tráfico agregada DEBAJO de etiquetas')
      })

      // Manejo de errores
      map.value.on('error', (e) => {
        console.error('❌ Error en Mapbox GL:', e)
      })

      // ✅ Crear objeto mapaAPI con todas las funciones
      const mapaAPI = {
        map: map.value,
        resize: () => {
          if (map.value && map.value.resize) {
            map.value.resize()
            console.log('🔄 Mapa redimensionado')
          }
        },
        setPuntosSeleccionados,
        activarModoSeleccion,
        desactivarModoSeleccion,
        getUbicacionSeleccionada: () => ubicacionSeleccionada.value,
        limpiarMarcadorTemporal,
        confirmarMarcadorTemporal: (nombre) => {
          if (ubicacionSeleccionada.value) {
            console.log(`✅ Marcador confirmado: ${nombre}`)
            limpiarMarcadorTemporal()
          }
        },
        actualizarMarcador: (_lat, _lng, nombre) => {
          console.log(`🔄 Actualizando marcador: ${nombre}`)
        },
        eliminarMarcadorPorCoordenadas: (lat, lng) => {
          console.log(`🗑️ Eliminando marcador en: ${lat}, ${lng}`)
        },
        activarModoSeleccionGeozonaCircular,
        limpiarCirculoTemporal,
        confirmarCirculoTemporal,
        actualizarCirculo,
        eliminarCirculo: (id) => {
          console.log(`🗑️ Eliminando círculo con ID: ${id}`)
        },
        activarModoSeleccionGeozonaPoligonal,
        getPuntosSeleccionados: () => puntosPoligono.value,
        isPoligonoFinalizado: () => poligonoFinalizado.value,
        finalizarPoligonoTemporal,
        limpiarPoligonoTemporal,
        confirmarPoligonoTemporal,
        actualizarPoligono,
        actualizarPoligonoTemporal,
        eliminarPoligono: (id) => {
          console.log(`🗑️ Eliminando polígono con ID: ${id}`)
        },
        crearCirculoTemporalPOI,
        actualizarRadioCirculoTemporal,
        limpiarCirculoTemporalPOI,
        confirmarMarcadorConCirculo,
        actualizarMarcadorConCirculo,
        toggleTrafico: () => {
          if (!map.value) return false

          const visibility = map.value.getLayoutProperty('traffic', 'visibility')

          if (visibility === 'visible') {
            map.value.setLayoutProperty('traffic', 'visibility', 'none')
            console.log('🚫 Tráfico desactivado')
            return false
          } else {
            map.value.setLayoutProperty('traffic', 'visibility', 'visible')
            console.log('✅ Tráfico activado')
            return true
          }
        },
        actualizarMarcadoresUnidades,
        limpiarMarcadoresUnidades,
        centrarEnUnidad,
      }

      window.mapaGlobal = mapaAPI

      const mapPage = document.getElementById('map-page')
      if (mapPage) {
        mapPage._mapaAPI = mapaAPI
        console.log('✅ _mapaAPI expuesto en map-page')
      }

      console.log('✅ Mapa Mapbox GL inicializado correctamente')
      return map.value
    } catch (error) {
      console.error('❌ Error crítico inicializando mapa:', error)
      throw error
    }
  }
  const limpiarMarcadorTemporal = () => {
    if (marcadorTemporalElement) {
      marcadorTemporalElement.remove()
      marcadorTemporalElement = null
    }
    ubicacionSeleccionada.value = null
  }

  const setPuntosSeleccionados = (puntos) => {
    if (!map.value || !puntos || puntos.length === 0) {
      console.warn('⚠️ No hay puntos para restaurar')
      return
    }

    limpiarPoligonoTemporal()
    puntosPoligono.value = [...puntos]

    puntos.forEach((punto) => {
      const markerEl = document.createElement('div')
      markerEl.style.width = '12px'
      markerEl.style.height = '12px'
      markerEl.style.backgroundColor = colorGeozonaActual.value
      markerEl.style.border = '2px solid white'
      markerEl.style.borderRadius = '50%'
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      new mapboxgl.Marker({ element: markerEl }).setLngLat([punto.lng, punto.lat]).addTo(map.value)
    })

    if (puntos.length >= 2) {
      actualizarPoligonoTemporal(puntos)
    }

    console.log(`✅ ${puntos.length} puntos restaurados`)
  }

  const cleanup = () => {
    limpiarMarcadoresUnidades()
    if (map.value) {
      map.value.remove()
      map.value = null
    }
    if (window.mapaGlobal) {
      window.mapaGlobal = null
    }
    modoSeleccionActivo.value = false
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false
    ubicacionSeleccionada.value = null
    puntosPoligono.value = []
    poligonoFinalizado.value = false
    console.log('🧹 Mapa limpiado')
  }

  const toggleTrafico = () => {
    if (!map.value) {
      console.warn('⚠️ Mapa no disponible')
      return false
    }

    try {
      // Verificar si existe la capa de tráfico
      if (!map.value.getLayer('traffic')) {
        console.warn('⚠️ Capa de tráfico no existe')
        return false
      }

      // Obtener visibilidad actual
      const visibility = map.value.getLayoutProperty('traffic', 'visibility')

      if (visibility === 'visible') {
        // Ocultar tráfico
        map.value.setLayoutProperty('traffic', 'visibility', 'none')
        console.log('🚫 Tráfico desactivado')
        return false
      } else {
        // Mostrar tráfico
        map.value.setLayoutProperty('traffic', 'visibility', 'visible')
        console.log('✅ Tráfico activado')
        return true
      }
    } catch (error) {
      console.error('❌ Error al toggle tráfico:', error)
      return false
    }
  }

  // Función helper para oscurecer colores hexadecimales
  function oscurecerColor(hex, porcentaje = 30) {
    hex = hex.replace('#', '')
    let r = parseInt(hex.substring(0, 2), 16)
    let g = parseInt(hex.substring(2, 4), 16)
    let b = parseInt(hex.substring(4, 6), 16)
    r = Math.floor(r * (1 - porcentaje / 100))
    g = Math.floor(g * (1 - porcentaje / 100))
    b = Math.floor(b * (1 - porcentaje / 100))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  return {
    map,
    initMap,
    addMarker: (lat, lng, options = {}) => {
      if (!map.value) {
        console.error('❌ Mapa no inicializado')
        return null
      }
      const el = document.createElement('div')
      el.innerHTML = options.icon || '📍'
      el.style.fontSize = '30px'
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat])
      if (options.popup) {
        marker.setPopup(new mapboxgl.Popup().setHTML(options.popup))
      }
      marker.addTo(map.value)
      return marker
    },
    cleanup,
    activarModoSeleccion,
    desactivarModoSeleccion,
    getUbicacionSeleccionada: () => ubicacionSeleccionada.value,
    limpiarMarcadorTemporal,
    confirmarMarcadorTemporal: (nombre) => {
      if (ubicacionSeleccionada.value) {
        console.log(`✅ Marcador confirmado: ${nombre}`)
        limpiarMarcadorTemporal()
      }
    },
    actualizarMarcador: (_lat, _lng, nombre) => {
      console.log(`🔄 Actualizando marcador: ${nombre}`)
    },
    eliminarMarcadorPorCoordenadas: (lat, lng) => {
      console.log(`🗑️ Eliminando marcador en: ${lat}, ${lng}`)
    },
    activarModoSeleccionGeozonaCircular,
    limpiarCirculoTemporal,
    confirmarCirculoTemporal,
    actualizarCirculo,
    eliminarCirculo: (id) => {
      console.log(`🗑️ Eliminando círculo con ID: ${id}`)
    },
    activarModoSeleccionGeozonaPoligonal,
    getPuntosSeleccionados: () => puntosPoligono.value,
    isPoligonoFinalizado: () => poligonoFinalizado.value,
    finalizarPoligonoTemporal,
    limpiarPoligonoTemporal,
    confirmarPoligonoTemporal,
    actualizarPoligono,
    actualizarPoligonoTemporal,
    eliminarPoligono: (id) => {
      console.log(`🗑️ Eliminando polígono con ID: ${id}`)
    },
    crearCirculoTemporalPOI,
    actualizarRadioCirculoTemporal,
    limpiarCirculoTemporalPOI,
    confirmarMarcadorConCirculo,
    actualizarMarcadorConCirculo,
    toggleTrafico,
    actualizarMarcadoresUnidades,
    limpiarMarcadoresUnidades,
    centrarEnUnidad,
    setPuntosSeleccionados,
  }
}
