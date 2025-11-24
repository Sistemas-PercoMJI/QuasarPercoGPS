<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>

    <q-btn
      fab
      :color="traficoActivo ? 'positive' : 'red'"
      :icon="traficoActivo ? 'traffic' : 'block'"
      class="traffic-toggle-btn"
      @click="manejarToggleTrafico"
      size="md"
    >
      <q-tooltip>{{ traficoActivo ? 'Ocultar tráfico' : 'Mostrar tráfico' }}</q-tooltip>
    </q-btn>

    <transition name="fade-scale">
      <div v-if="mostrarBotonConfirmarGeozona" class="floating-buttons-container">
        <q-btn
          fab
          color="negative"
          icon="close"
          class="floating-cancel-btn"
          @click="cancelarGeozona"
          size="md"
        >
          <q-tooltip>Cancelar geozona</q-tooltip>
        </q-btn>

        <q-btn
          fab
          color="secondary"
          icon="check"
          class="floating-confirm-btn-main"
          @click="confirmarYVolverADialogo"
          size="lg"
        >
          <q-tooltip>Listo, guardar geozona</q-tooltip>
        </q-btn>
      </div>
    </transition>

    <div v-if="ubicacionActiva" class="user-location-indicator">
      <q-icon name="gps_fixed" size="24px" color="positive" />
      <span class="text-caption">GPS Activo</span>
    </div>

    <!-- 🎯 Indicador de simulador activo (opcional) -->
    <div v-if="simuladorActivo" class="simulador-indicator">
      <q-icon name="explore" size="16px" color="white" class="pulse-icon" />
      <span class="text-caption">Simulador activo</span>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useMapboxGL } from 'src/composables/useMapboxGL'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
import { useEventos } from 'src/composables/useEventos'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useEventDetection } from 'src/composables/useEventDetection'
import { auth } from 'src/firebase/firebaseConfig'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'
import { useSimuladorUnidades } from 'src/composables/useSimuladorUnidades'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'
import { useQuasar } from 'quasar'
import mapboxgl from 'mapbox-gl'

const {
  initMap,
  addMarker,
  cleanup,
  toggleTrafico,
  actualizarMarcadoresUnidades,
  limpiarMarcadoresUnidades,
} = useMapboxGL()
const { abrirGeozonasConPOI } = useEventBus()
const { inicializar, evaluarEventosParaUnidadesSimulacion, resetear } = useEventDetection()

const marcadoresPOIs = ref([])

const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)
const ubicacionActiva = ref(false)
const marcadorUsuario = ref(null)
const { unidadesActivas, iniciarTracking, detenerTracking } = useTrackingUnidades()
const userId = ref(auth.currentUser?.uid || '')

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)
const { obtenerEventos } = useEventos(userId.value)
const traficoActivo = ref(false)

const poisCargados = ref([])
const geozonasCargadas = ref([])

const $q = useQuasar()
const { simulacionActiva, iniciarSimulacion } = useSimuladorUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()
const simuladorActivo = ref(false)
let simuladorYaIniciado = false

let watchId = null
let mapaAPI = null
let intervaloEvaluacionEventos = null
let popupGlobalActivo = null

let ultimaActualizacionMarcadores = 0
const THROTTLE_MARCADORES = 2000

watch(
  unidadesActivas,
  (nuevasUnidades) => {
    if (!mapaAPI || !mapaListo.value) {
      return
    }

    const ahora = Date.now()
    if (ahora - ultimaActualizacionMarcadores < THROTTLE_MARCADORES) {
      return
    }
    ultimaActualizacionMarcadores = ahora

    if (nuevasUnidades && nuevasUnidades.length > 0) {
      actualizarMarcadoresUnidades(nuevasUnidades)
    } else {
      limpiarMarcadoresUnidades()
    }
  },
  { deep: true, immediate: false }
)

function iniciarEvaluacionContinuaEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
  }

  console.log('🔄 Iniciando evaluación continua de eventos (cada 10 segundos)...')

  intervaloEvaluacionEventos = setInterval(() => {
    const unidadesParaEvaluar = window._unidadesTrackeadas || unidadesActivas.value

    if (unidadesParaEvaluar && unidadesParaEvaluar.length > 0) {
      evaluarEventosParaUnidadesSimulacion(unidadesParaEvaluar)
    }
  }, 10000)

  console.log('✅ Evaluación continua de eventos iniciada cada 10 segundos')
}

function detenerEvaluacionEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
    intervaloEvaluacionEventos = null
    console.log('🛑 Evaluación de eventos detenida')
  }
}

const iniciarSimuladorAutomatico = async () => {
  if (simuladorYaIniciado || simulacionActiva.value) {
    console.log('⚠️ Simulador ya iniciado, saltando...')
    return
  }

  try {
    console.log('🔄 Cargando datos para simulador automático...')
    
    await Promise.all([
      obtenerConductores(),
      obtenerUnidades()
    ])

    const conductoresConUnidad = conductores.value.filter(c => c.UnidadAsignada)
    
    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ No hay conductores con unidades asignadas')
      $q.notify({
        type: 'warning',
        message: 'No hay conductores con unidades para simular',
        position: 'top',
        timeout: 3000
      })
      return
    }

    console.log(`🚀 Iniciando simulador automático con ${conductoresConUnidad.length} unidades...`)
    
    simuladorYaIniciado = true
    
    await iniciarSimulacion(conductores.value, unidades.value)
    
    simuladorActivo.value = true
    
    $q.notify({
      type: 'positive',
      message: `🎯 Simulador GPS iniciado: ${conductoresConUnidad.length} unidades`,
      position: 'top',
      timeout: 3000,
      icon: 'explore'
    })
    
    console.log(`✅ Simulador automático activo con ${conductoresConUnidad.length} unidades`)
    
  } catch (error) {
    console.error('❌ Error al iniciar simulador automático:', error)
    simuladorYaIniciado = false
    
    $q.notify({
      type: 'negative',
      message: 'Error al iniciar el simulador GPS',
      position: 'top',
      timeout: 3000
    })
  }
}

function tieneEventosAsignados(ubicacionId, tipo, eventosActivos) {
  let count = 0
  eventosActivos.forEach((evento) => {
    if (evento.condiciones) {
      evento.condiciones.forEach((condicion) => {
        if (
          condicion.ubicacionId === ubicacionId &&
          ((tipo === 'poi' && condicion.tipo === 'POI') ||
            (tipo === 'geozona' && condicion.tipo === 'Geozona'))
        ) {
          count++
        }
      })
    }
  })
  return count
}

function actualizarMarcadorUsuario(lat, lng) {
  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const map = mapPage._mapaAPI.map

  if (marcadorUsuario.value) {
    marcadorUsuario.value.setLngLat([lng, lat])
  } else {
    const markerEl = document.createElement('div')
    markerEl.className = 'user-location-marker'
    markerEl.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: #4285F4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
      <div style="
        width: 40px;
        height: 40px;
        background: rgba(66, 133, 244, 0.2);
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse-location 2s infinite;
      "></div>
    `

    marcadorUsuario.value = new mapboxgl.Marker({
      element: markerEl,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<b>📍 Tu ubicación</b>'))
      .addTo(map)
  }
}

function iniciarSeguimientoGPS() {
  if (!navigator.geolocation) {
    console.error('❌ Geolocalización no soportada en este navegador')
    return
  }

  const opciones = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      ubicacionActiva.value = true
      actualizarMarcadorUsuario(latitude, longitude)
    },
    (error) => {
      console.error('❌ Error de geolocalización:', error.message)
      ubicacionActiva.value = false
    },
    opciones,
  )

  console.log('🎯 Seguimiento GPS iniciado')
}

function detenerSeguimientoGPS() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
    ubicacionActiva.value = false
    console.log('🛑 Seguimiento GPS detenido')
  }
}

async function inicializarSistemaDeteccion() {
  try {
    console.log('🚀 Inicializando sistema de detección de eventos...')

    const [eventos, pois, geozonas] = await Promise.all([
      obtenerEventos(),
      obtenerPOIs(),
      obtenerGeozonas(),
    ])

    const eventosActivos = eventos.filter((e) => e.activo)

    inicializar(eventosActivos, pois, geozonas)

    console.log('✅ Sistema de detección inicializado')
    console.log('  📊 Eventos activos:', eventosActivos.length)
    console.log('  📍 POIs:', pois.length)
    console.log('  🗺️ Geozonas:', geozonas.length)

    if (eventosActivos.length > 0) {
      console.log('📋 Eventos configurados:')
      eventosActivos.forEach((evento) => {
        console.log(`  - ${evento.nombre}:`, evento.condiciones)
      })
    } else {
      console.warn('⚠️ No hay eventos activos configurados')
    }
  } catch (error) {
    console.error('❌ Error al inicializar detección:', error)
  }
}

function metersToPixelsAtMaxZoom(meters, latitude) {
  return meters / 0.075 / Math.cos((latitude * Math.PI) / 180)
}

function oscurecerColor(hex, porcentaje = 20) {
  hex = hex.replace('#', '')
  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)

  r = Math.floor(r * (1 - porcentaje / 100))
  g = Math.floor(g * (1 - porcentaje / 100))
  b = Math.floor(b * (1 - porcentaje / 100))

  const rHex = r.toString(16).padStart(2, '0')
  const gHex = g.toString(16).padStart(2, '0')
  const bHex = b.toString(16).padStart(2, '0')

  return `#${rHex}${gHex}${bHex}`
}

// 🔧 FUNCIÓN CORREGIDA
const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  mapaAPI = mapPage._mapaAPI
  limpiarCapasDelMapa()

  try {
    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter((e) => e.activo)

    const pois = await obtenerPOIs()
    poisCargados.value = pois

    // ============================================
    // 📍 DIBUJAR POIs (sin cambios)
    // ============================================
    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const { lat, lng } = poi.coordenadas
        const radio = poi.radio || 100

        const cantidadEventos = tieneEventosAsignados(poi.id, 'poi', eventosFiltrados)
        const tieneEventos = cantidadEventos > 0

        const circleId = `poi-circle-${poi.id}`

        if (!mapaAPI.map.getSource(circleId)) {
          mapaAPI.map.addSource(circleId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
            },
          })

          mapaAPI.map.addLayer({
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
        }

        const popupContent = `
          <div style="min-width: 180px;">
            <b style="font-size: 14px;">📍 ${poi.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${poi.direccion}
            </p>
            <button
              onclick="window.verDetallesPOI('${poi.id}')"
              style="
                width: 100%;
                margin-top: 8px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 12px;
              "
            >
              📍 Ver detalles
            </button>
          </div>
        `

        const markerEl = document.createElement('div')
        markerEl.innerHTML = '📍'
        markerEl.style.fontSize = '30px'
        markerEl.style.cursor = 'pointer'

        if (tieneEventos) {
          markerEl.innerHTML = `
            <div style="position: relative;">
              <div style="font-size: 30px;">📍</div>
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ff5722;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 8px rgba(255, 87, 34, 0.6);
              ">${cantidadEventos}</div>
            </div>
          `
        }

        const popup = new mapboxgl.Popup({
          offset: 25,
          className: 'popup-animated',
          closeButton: true,
          closeOnClick: false,
        }).setHTML(popupContent)

        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapaAPI.map)

        popup.on('open', () => {
          if (popupGlobalActivo && popupGlobalActivo !== popup) {
            popupGlobalActivo.remove()
          }
          popupGlobalActivo = popup
        })

        marcadoresPOIs.value.push(marker)
      }
    })

    // ============================================
    // 🗺️ DIBUJAR GEOZONAS - CORREGIDO
    // ============================================
    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas

    geozonas.forEach((geozona) => {
      const cantidadEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
      const tieneEventos = cantidadEventos > 0

      const popupContent = `
        <div style="min-width: 180px;">
          <b style="font-size: 14px;">${geozona.tipoGeozona === 'circular' ? '🔵' : '🔷'} ${geozona.nombre}</b>
          ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
            ${geozona.tipoGeozona === 'circular' ? `Radio: ${geozona.radio}m` : `${geozona.puntos.length} puntos`}
          </p>
          <button
            onclick="window.verDetallesGeozona('${geozona.id}')"
            style="
              width: 100%;
              margin-top: 8px;
              padding: 8px 12px;
              background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 12px;
            "
          >
            📍 Ver detalles
          </button>
        </div>
      `

      // ============================================
      // 🔵 GEOZONA CIRCULAR
      // ============================================
      if (geozona.tipoGeozona === 'circular' && geozona.centro) {
        const { lat, lng } = geozona.centro
        const fillColor = geozona.color || '#4ECDC4'
        const borderColor = oscurecerColor(fillColor, 30)

        const circleId = `geozona-circle-${geozona.id}`

        if (!mapaAPI.map.getSource(circleId)) {
          mapaAPI.map.addSource(circleId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
            },
          })

          mapaAPI.map.addLayer({
            id: circleId,
            type: 'circle',
            source: circleId,
            paint: {
              'circle-radius': {
                stops: [
                  [0, 0],
                  [20, metersToPixelsAtMaxZoom(geozona.radio, lat)],
                ],
                base: 2,
              },
              'circle-color': fillColor,
              'circle-opacity': 0.35,
              'circle-stroke-width': 2,
              'circle-stroke-color': borderColor,
            },
          })
        }

        // ✅ LÓGICA CORREGIDA: Popup según eventos
        if (!tieneEventos) {
          // ✅ SIN EVENTOS: Click en cualquier parte del círculo muestra popup
          mapaAPI.map.on('click', circleId, (e) => {
            if (popupGlobalActivo) {
              popupGlobalActivo.remove()
            }

            popupGlobalActivo = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: false,
              className: 'popup-animated',
            })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(mapaAPI.map)
          })

          mapaAPI.map.on('mouseenter', circleId, () => {
            mapaAPI.map.getCanvas().style.cursor = 'pointer'
          })

          mapaAPI.map.on('mouseleave', circleId, () => {
            mapaAPI.map.getCanvas().style.cursor = ''
          })
        } else {
          // ✅ CON EVENTOS: Solo el badge muestra popup, el círculo NO
          // Badge con eventos
          const badgeEl = document.createElement('div')
          badgeEl.innerHTML = `
            <div style="
              background: #ff5722;
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 3px 12px rgba(255, 87, 34, 0.6);
              cursor: pointer;
            ">
              ${cantidadEventos}
            </div>
          `

          // ✅ CORRECCIÓN: Solo un popup desde el badge
          const badgePopup = new mapboxgl.Popup({
            offset: 25,
            className: 'popup-animated',
            closeButton: true,
            closeOnClick: false,
          }).setHTML(popupContent)

          // ✅ Crear y configurar badge marker
          new mapboxgl.Marker({ element: badgeEl })
            .setLngLat([lng, lat])
            .setPopup(badgePopup)
            .addTo(mapaAPI.map)

          // Prevenir duplicación de popups
          badgePopup.on('open', () => {
            if (popupGlobalActivo && popupGlobalActivo !== badgePopup) {
              popupGlobalActivo.remove()
            }
            popupGlobalActivo = badgePopup
          })
        }
      }

      // ============================================
      // 🔷 GEOZONA POLIGONAL
      // ============================================
      else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
        const fillColor = geozona.color || '#4ECDC4'
        const borderColor = oscurecerColor(fillColor, 30)

        const polygonId = `geozona-polygon-${geozona.id}`
        const coordinates = geozona.puntos.map((p) => [p.lng, p.lat])
        coordinates.push(coordinates[0])

        if (!mapaAPI.map.getSource(polygonId)) {
          mapaAPI.map.addSource(polygonId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates],
              },
            },
          })

          mapaAPI.map.addLayer({
            id: polygonId,
            type: 'fill',
            source: polygonId,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': 0.35,
            },
          })

          mapaAPI.map.addLayer({
            id: `${polygonId}-outline`,
            type: 'line',
            source: polygonId,
            paint: {
              'line-color': borderColor,
              'line-width': 3,
            },
          })
        }

        // ✅ LÓGICA CORREGIDA: Popup según eventos
        if (!tieneEventos) {
          // ✅ SIN EVENTOS: Click en cualquier parte del polígono muestra popup
          mapaAPI.map.on('click', polygonId, (e) => {
            if (popupGlobalActivo) {
              popupGlobalActivo.remove()
            }

            popupGlobalActivo = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: false,
              className: 'popup-animated',
            })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(mapaAPI.map)
          })

          mapaAPI.map.on('mouseenter', polygonId, () => {
            mapaAPI.map.getCanvas().style.cursor = 'pointer'
          })

          mapaAPI.map.on('mouseleave', polygonId, () => {
            mapaAPI.map.getCanvas().style.cursor = ''
          })
        } else {
          // ✅ CON EVENTOS: Solo el badge muestra popup, el polígono NO
          const lats = geozona.puntos.map((p) => p.lat)
          const lngs = geozona.puntos.map((p) => p.lng)
          const centroLat = lats.reduce((a, b) => a + b) / lats.length
          const centroLng = lngs.reduce((a, b) => a + b) / lngs.length

          const badgeEl = document.createElement('div')
          badgeEl.innerHTML = `
            <div style="
              background: #ff5722;
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 3px 12px rgba(255, 87, 34, 0.6);
              cursor: pointer;
            ">
              ${cantidadEventos}
            </div>
          `

          // ✅ CORRECCIÓN: Solo un popup desde el badge
          const badgePopup = new mapboxgl.Popup({
            offset: 25,
            className: 'popup-animated',
            closeButton: true,
            closeOnClick: false,
          }).setHTML(popupContent)

          // ✅ Crear y configurar badge marker
          new mapboxgl.Marker({ element: badgeEl })
            .setLngLat([centroLng, centroLat])
            .setPopup(badgePopup)
            .addTo(mapaAPI.map)

          // Prevenir duplicación de popups
          badgePopup.on('open', () => {
            if (popupGlobalActivo && popupGlobalActivo !== badgePopup) {
              popupGlobalActivo.remove()
            }
            popupGlobalActivo = badgePopup
          })
        }
      }
    })

    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }
  } catch (error) {
    console.error('❌ Error al cargar y dibujar items:', error)
  }
}

const limpiarCapasDelMapa = () => {
  if (!mapaAPI || !mapaAPI.map) return

  const layers = mapaAPI.map.getStyle().layers

  layers.forEach((layer) => {
    if (
      layer.id.startsWith('poi-circle-') ||
      layer.id.startsWith('geozona-circle-') ||
      layer.id.startsWith('geozona-polygon-')
    ) {
      mapaAPI.map.removeLayer(layer.id)
      if (mapaAPI.map.getSource(layer.source)) {
        mapaAPI.map.removeSource(layer.source)
      }
    }
  })

  console.log('🧹 Capas del mapa limpiadas')
}

onMounted(async () => {
  try {
    console.log('🗺️ Iniciando mapa Mapbox satelital...')

    requestAnimationFrame(async () => {
      await initMap('map', [32.504421823945805, -116.9514484543167], 13)

      setTimeout(async () => {
        addMarker(32.504421823945805, -116.9514484543167, {
          popup: '<b>MJ Industrias</b><br>Ubicación principal',
        })

        mapaListo.value = true

        console.log('✅ Mapa completamente listo')

        window.abrirDetallesUbicacion = (ubicacionData) => {
          try {
            if (ubicacionData.tipo === 'poi') {
              const poi = poisCargados.value.find((p) => p.id === ubicacionData.id)
              if (poi) {
                abrirGeozonasConPOI(poi)
              } else {
                console.error('❌ POI no encontrado:', ubicacionData.id)
              }
            } else if (ubicacionData.tipo === 'geozona') {
              const geozona = geozonasCargadas.value.find((g) => g.id === ubicacionData.id)
              if (geozona) {
                abrirGeozonasConPOI(geozona)
              } else {
                console.error('❌ Geozona no encontrada:', ubicacionData.id)
              }
            }
          } catch (error) {
            console.error('❌ Error al abrir detalles:', error)
          }
        }

        window.verDetallesPOI = (poiId) => {
          window.abrirDetallesUbicacion({ tipo: 'poi', id: poiId })
        }

        window.verDetallesGeozona = (geozonaId) => {
          window.abrirDetallesUbicacion({ tipo: 'geozona', id: geozonaId })
        }

        await dibujarTodosEnMapa()
        await inicializarSistemaDeteccion()

        iniciarEvaluacionContinuaEventos()

        iniciarSeguimientoGPS()

        console.log('🎯 Esperando 2 segundos antes de iniciar simulador...')
        setTimeout(async () => {
          await iniciarSimuladorAutomatico()
        }, 2000)
      }, 500)

      window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
    })
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
  }

  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const mapPage = document.getElementById('map-page')
      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
        mapPage._mapaAPI.resize(true)
      }
    }, 250)
  }

  window.addEventListener('resize', handleResize)
  window._resizeHandler = handleResize

  window.addEventListener('redibujarMapa', async () => {
    console.log('🔄 Redibujando mapa...')

    limpiarCapasDelMapa()

    await dibujarTodosEnMapa()

    resetear()
    await inicializarSistemaDeteccion()

    detenerEvaluacionEventos()
    iniciarEvaluacionContinuaEventos()

    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }

    console.log('✅ Mapa redibujado completamente')
  })

  console.log('🚀 Iniciando tracking GPS...')
  iniciarTracking()
})

const handleMostrarBoton = (e) => {
  mostrarBotonConfirmarGeozona.value = e.detail.mostrar
}

const confirmarYVolverADialogo = () => {
  const evento = new CustomEvent('confirmarGeozonaDesdeBoton', {
    detail: { confirmed: true },
  })
  window.dispatchEvent(evento)

  mostrarBotonConfirmarGeozona.value = false
}

const cancelarGeozona = () => {
  mostrarBotonConfirmarGeozona.value = false

  const mapPage = document.getElementById('map-page')
  if (mapPage && mapPage._mapaAPI) {
    const mapaAPI = mapPage._mapaAPI

    mapaAPI.desactivarModoSeleccion()
    mapaAPI.limpiarCirculoTemporal()
    mapaAPI.limpiarPoligonoTemporal()
  }

  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  const evento = new CustomEvent('cancelarGeozonaDesdeBoton', {
    detail: { cancelled: true },
  })
  window.dispatchEvent(evento)

  const $q = window.$q
  if ($q && $q.notify) {
    $q.notify({
      type: 'info',
      message: 'Creación de geozona cancelada',
      icon: 'cancel',
      position: 'top',
      timeout: 2000,
    })
  }
}

onUnmounted(() => {
  detenerSeguimientoGPS()

  detenerEvaluacionEventos()

  detenerTracking()
  limpiarMarcadoresUnidades()
  resetear()

  if (window._resizeHandler) {
    window.removeEventListener('resize', window._resizeHandler)
    delete window._resizeHandler
  }

  window.removeEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
  window.removeEventListener('redibujarMapa', () => {})

  if (window.abrirDetallesUbicacion) {
    delete window.abrirDetallesUbicacion
  }
  if (window.verDetallesPOI) {
    delete window.verDetallesPOI
  }
  if (window.verDetallesGeozona) {
    delete window.verDetallesGeozona
  }

  cleanup()

  console.log('🧹 IndexPage desmontado, mapa y detección limpiados')
})

const manejarToggleTrafico = () => {
  const nuevoEstado = toggleTrafico()
  traficoActivo.value = nuevoEstado
}
</script>

<style scoped>
.full-height {
  height: 100%;
  overflow: hidden;
}

.full-map {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.floating-confirm-btn {
  position: fixed !important;
  bottom: 100px;
  right: 24px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.user-location-indicator {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 1000;
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideInRight 0.3s ease-out;
}

/* 🆕 Indicador del simulador */
.simulador-indicator {
  position: fixed;
  top: 220px;
  right: 16px;
  z-index: 1000;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideInRight 0.3s ease-out;
  font-weight: 600;
}

.pulse-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

:deep(.custom-marker-with-badge) {
  background: none !important;
  border: none !important;
}

:deep(.geozona-marker-badge) {
  background: none !important;
  border: none !important;
}

:deep(.user-location-marker) {
  background: none !important;
  border: none !important;
}

@keyframes pulse-badge {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.5);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 3px 12px rgba(255, 87, 34, 0.7);
  }
}

@keyframes pulse-badge-geozona {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 3px 12px rgba(255, 87, 34, 0.6);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 4px 16px rgba(255, 87, 34, 0.8);
  }
}

@keyframes pulse-location {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.3;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
}

.floating-buttons-container {
  position: fixed !important;
  bottom: 100px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.floating-confirm-btn-main {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.floating-cancel-btn {
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
}

.floating-cancel-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 28px rgba(244, 67, 54, 0.5);
}

.floating-confirm-btn-main:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.traffic-toggle-btn {
  position: fixed !important;
  top: 150px;
  right: 20px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.traffic-toggle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.traffic-toggle-btn.bg-positive {
  animation: pulse-traffic 2s infinite;
}

@keyframes pulse-traffic {
  0%,
  100% {
    box-shadow: 0 4px 12px rgba(33, 186, 69, 0.4);
  }
  50% {
    box-shadow: 0 6px 20px rgba(33, 186, 69, 0.6);
  }
}

:deep(.traffic-layer-blend) {
  mix-blend-mode: multiply;
  opacity: 0.9;
}

:deep(.custom-marker-unidad) {
  background: none !important;
  border: none !important;
}

@keyframes pulse-gps {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

:deep(.popup-animated .mapboxgl-popup-content) {
  animation: popupFade 0.2s ease-out;
}

@keyframes popupFade {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>