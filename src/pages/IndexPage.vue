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
//import { useRouter } from 'vue-router'

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
//const router = useRouter()

const $q = useQuasar()
const { simulacionActiva, iniciarSimulacion } = useSimuladorUnidades()

const {
  conductores,
  unidades,
  gruposConductores,
  obtenerGruposConductores,
  obtenerConductores,
  obtenerUnidades,
} = useConductoresFirebase()

const { estadoCompartido } = useEventBus()

const simuladorActivo = ref(false)
let simuladorYaIniciado = false

let watchId = null
let mapaAPI = null
let intervaloEvaluacionEventos = null
let popupGlobalActivo = null

let ultimoHashUnidades = ''

watch(
  unidadesActivas,
  (nuevasUnidades) => {
    if (!mapaAPI || !mapaListo.value) return

    if (!nuevasUnidades || nuevasUnidades.length === 0) {
      limpiarMarcadoresUnidades()
      return
    }

    // ⚡ Crear hash solo con datos relevantes (id + lat + lng + estado)
    const nuevoHash = nuevasUnidades
      .map((u) => `${u.unidadId}-${u.ubicacion?.lat}-${u.ubicacion?.lng}-${u.estado}`)
      .join('|')

    // ⚡ Solo actualizar si realmente cambió algo importante
    if (nuevoHash !== ultimoHashUnidades) {
      console.log('📍 Posiciones actualizadas, redibujando mapa')
      actualizarMarcadoresUnidades(nuevasUnidades)
      ultimoHashUnidades = nuevoHash
    }
  },
  { deep: false, immediate: false }, // ⚡ Cambiar a false
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

  console.log('🔄 Evaluando eventos...', new Date().toLocaleTimeString())
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

    await Promise.all([obtenerConductores(), obtenerUnidades()])

    const conductoresConUnidad = conductores.value.filter((c) => c.UnidadAsignada)

    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ No hay conductores con unidades asignadas')
      $q.notify({
        type: 'warning',
        message: 'No hay conductores con unidades para simular',
        position: 'top',
        timeout: 3000,
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
      timeout: 500,
      icon: 'explore',
    })

    console.log(`✅ Simulador automático activo con ${conductoresConUnidad.length} unidades`)
  } catch (error) {
    console.error('❌ Error al iniciar simulador automático:', error)
    simuladorYaIniciado = false

    $q.notify({
      type: 'negative',
      message: 'Error al iniciar el simulador GPS',
      position: 'top',
      timeout: 3000,
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

async function obtenerDireccionPunto(lat, lng) {
  try {
    const MAPBOX_TOKEN =
      'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&language=es&limit=1&access_token=${MAPBOX_TOKEN}`,
    )

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const address = data.features[0]
      // Extraer solo el nombre de la calle sin el número y ciudad
      const placeName = address.place_name || ''
      const parts = placeName.split(',')

      // Intentar obtener solo el nombre de la calle
      if (parts.length > 0) {
        const streetPart = parts[0].trim()
        // Remover número si existe (patrón común en direcciones)
        const streetOnly = streetPart.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '')
        return streetOnly || 'Calle desconocida'
      }
    }

    return 'Dirección no disponible'
  } catch (error) {
    console.error('❌ Error obteniendo dirección del punto:', error)
    return 'Error al obtener dirección'
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

// ============================================
// 🎨 FUNCIÓN: Crear icono POI elegante
// ============================================
function crearIconoPOI(tieneEventos = false) {
  const iconoHTML = `
    <div style="position: relative; display: inline-block;">
      <!-- Icono SVG principal con color blanco -->
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); cursor: pointer; transition: transform 0.2s ease;" class="icono-poi-hover">
        <path fill="white" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>

      ${
        tieneEventos
          ? `
        <!-- Badge de evento en esquina superior derecha -->
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #FF5722 0%, #F44336 100%);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(255, 87, 34, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          animation: pulse-badge 2s infinite;
        ">
          🔔
        </div>
      `
          : ''
      }
    </div>
  `

  const markerEl = document.createElement('div')
  markerEl.innerHTML = iconoHTML
  markerEl.style.cursor = 'pointer'

  return markerEl
}

// ============================================
// 🎨 FUNCIÓN: Crear icono Geozona elegante
// ============================================
function crearIconoGeozona(tipo = 'circular', tieneEventos = false, color = null) {
  const colorFinal = color || '#FFFFFF'

  // Diferentes SVGs según el tipo de geozona
  let iconoSVG = ''

  if (tipo === 'circular') {
    iconoSVG = `
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); cursor: pointer; transition: transform 0.2s ease, filter 0.2s ease;" class="icono-geozona-hover">
        <circle cx="12" cy="12" r="10" fill="${colorFinal}" stroke="white" stroke-width="2"/>
      </svg>
    `
  } else {
    // Poligonal
    iconoSVG = `
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); cursor: pointer; transition: transform 0.2s ease, filter 0.2s ease;" class="icono-geozona-hover">
        <polygon points="12,2 22,12 12,22 2,12" fill="${colorFinal}" stroke="white" stroke-width="2"/>
      </svg>
    `
  }

  const iconoHTML = `
    <div style="position: relative; display: inline-block;">
      ${iconoSVG}

      ${
        tieneEventos
          ? `
        <!-- Badge de evento en esquina superior derecha -->
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #FF5722 0%, #F44336 100%);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(255, 87, 34, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          animation: pulse-badge 2s infinite;
        ">
          🔔
        </div>
      `
          : ''
      }
    </div>
  `

  const markerEl = document.createElement('div')
  markerEl.innerHTML = iconoHTML
  markerEl.style.cursor = 'pointer'

  return markerEl
}

/*function getHueRotation(_hexColor) {
  return '0deg'
}*/

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

        // 🆕 POPUP CON ESTILO SIMILAR A GEOZONA PERO SIN BOTÓN DE EXPANDIR
        const popupContent = `
          <div class="poi-popup-container">
            <!-- Cabecera -->
            <div class="poi-popup-header">
              <div class="header-info">
                <div class="header-title">📍 ${poi.nombre}</div>
                <div class="header-subtitle">Radio: ${radio}m</div>
              </div>
            </div>

            <!-- Cuerpo (siempre visible) -->
            <div class="poi-popup-body">
              <div class="address-info">
                <div class="address-icon">📍</div>
                <div class="address-text">${poi.direccion}</div>
              </div>

              <button
                onclick="window.verDetallesPOI('${poi.id}')"
                class="details-btn"
              >
                Ver más detalles
              </button>
            </div>
          </div>
        `

        // ✅ USAR NUEVO ICONO ELEGANTE
        const markerEl = crearIconoPOI(tieneEventos)

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

    //  DIBUJAR GEOZONAS CON ICONOS ELEGANTES

    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas

    for (const geozona of geozonas) {
      const cantidadEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
      const tieneEventos = cantidadEventos > 0

      // 🆕 OBTENER DIRECCIONES DE TODOS LOS PUNTOS
      let direccionesPuntos = []

      if (geozona.tipoGeozona === 'poligono' && geozona.puntos && geozona.puntos.length > 0) {
        // Obtener direcciones para todos los puntos del polígono
        const promesasDirecciones = geozona.puntos.map(async (punto, index) => {
          try {
            const direccion = await obtenerDireccionPunto(punto.lat, punto.lng)
            return {
              index: index,
              direccion: direccion,
              lat: punto.lat,
              lng: punto.lng,
            }
          } catch (error) {
            console.warn(`⚠️ Error obteniendo dirección para punto ${index + 1}:`, error)
            return {
              index: index,
              direccion: 'Dirección no disponible',
              lat: punto.lat,
              lng: punto.lng,
            }
          }
        })

        direccionesPuntos = await Promise.all(promesasDirecciones)
      }

      const popupContent = `
        <div class="geozona-popup-container">
          <!-- Cabecera (siempre visible) -->
          <div class="geozona-popup-header">
            <div class="header-info">
              <div class="header-title">🔷 ${geozona.nombre}</div>
              <div class="header-subtitle">${geozona.puntos.length} puntos definidos</div>
            </div>
            <!-- El botón de expandir ahora está aquí -->
            <button
              id="toggle-btn-geo-${geozona.id}"
              class="toggle-geozona-btn"
              onclick="toggleGeozonaPopup('${geozona.id}')"
            >
              <svg class="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <!-- Cuerpo (oculto por defecto con max-height) -->
          <div id="geozona-popup-body-${geozona.id}" class="geozona-popup-body">
            <div class="points-list-container">
              ${direccionesPuntos
                .map(
                  (punto) => `
                <div class="point-card">
                  <div class="point-label">Punto ${punto.index + 1}</div>
                  <div class="point-address">
                    <div class="address-name">${punto.direccion}</div>
                  </div>
                  <div class="point-coords">
                    <div>
                      <span class="coord-label">Latitud:</span>
                      <span class="coord-value">${punto.lat.toFixed(6)}</span>
                    </div>
                    <div>
                      <span class="coord-label">Longitud:</span>
                      <span class="coord-value">${punto.lng.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>

            <button
              onclick="window.verDetallesGeozona('${geozona.id}')"
              class="details-btn"
            >
              Ver más detalles
            </button>
          </div>
        </div>
      `
      // 🔵 GEOZONA CIRCULAR
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

        if (!tieneEventos) {
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
        }

        // ✅ USAR NUEVO ICONO ELEGANTE PARA CENTRO
        const markerEl = crearIconoGeozona('circular', tieneEventos, fillColor)

        const popup = new mapboxgl.Popup({
          offset: 25,
          className: 'popup-animated',
          closeButton: true,
          closeOnClick: false,
        }).setHTML(popupContent)

        new mapboxgl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapaAPI.map)

        popup.on('open', () => {
          if (popupGlobalActivo && popupGlobalActivo !== popup) {
            popupGlobalActivo.remove()
          }
          popupGlobalActivo = popup
        })
      }

      // 🔷 GEOZONA POLIGONAL
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

        if (!tieneEventos) {
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
        }

        const lats = geozona.puntos.map((p) => p.lat)
        const lngs = geozona.puntos.map((p) => p.lng)
        const centroLat = lats.reduce((a, b) => a + b) / lats.length
        const centroLng = lngs.reduce((a, b) => a + b) / lngs.length

        // ✅ USAR NUEVO ICONO ELEGANTE PARA CENTRO
        const markerEl = crearIconoGeozona('poligonal', tieneEventos, fillColor)

        const popup = new mapboxgl.Popup({
          offset: 25,
          className: 'popup-animated',
          closeButton: true,
          closeOnClick: false,
        }).setHTML(popupContent)

        new mapboxgl.Marker({ element: markerEl })
          .setLngLat([centroLng, centroLat])
          .setPopup(popup)
          .addTo(mapaAPI.map)

        popup.on('open', () => {
          if (popupGlobalActivo && popupGlobalActivo !== popup) {
            popupGlobalActivo.remove()
          }
          popupGlobalActivo = popup
        })
      }
    }

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

  // 🔥 PASO 1: Primero eliminar TODOS los layers
  layers.forEach((layer) => {
    if (
      layer.id.startsWith('poi-circle-') ||
      layer.id.startsWith('geozona-circle-') ||
      layer.id.startsWith('geozona-polygon-')
    ) {
      try {
        mapaAPI.map.removeLayer(layer.id)
      } catch (e) {
        console.warn(`⚠️ Error al eliminar layer ${layer.id}:`, e.message)
      }
    }
  })

  // 🔥 PASO 2: Después eliminar los sources
  const sources = Object.keys(mapaAPI.map.getStyle().sources)
  sources.forEach((sourceId) => {
    if (
      sourceId.startsWith('poi-circle-') ||
      sourceId.startsWith('geozona-circle-') ||
      sourceId.startsWith('geozona-polygon-')
    ) {
      try {
        if (mapaAPI.map.getSource(sourceId)) {
          mapaAPI.map.removeSource(sourceId)
        }
      } catch (e) {
        console.warn(`⚠️ Error al eliminar source ${sourceId}:`, e.message)
      }
    }
  })

  console.log('✅ Capas del mapa limpiadas correctamente')
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

        // ========================================
        // FUNCIONES GLOBALES PARA ABRIR DETALLES
        // ========================================
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

        // ========================================
        // CARGAR DATOS Y SISTEMAS
        // ========================================
        await dibujarTodosEnMapa()
        await inicializarSistemaDeteccion()
        iniciarEvaluacionContinuaEventos()
        iniciarSeguimientoGPS()

        console.log('🎯 Esperando 2 segundos antes de iniciar simulador...')
        setTimeout(async () => {
          await iniciarSimuladorAutomatico()
        }, 2000)

        // ========================================
        // 🆕 EVENT LISTENER DEL MAPA
        // ========================================
        const mapPage = document.getElementById('map-page')
        if (mapPage) {
          mapPage.addEventListener('click', (event) => {
            // ✅ VALIDACIÓN CRÍTICA
            if (!event || !event.target) {
              console.warn('⚠️ Evento sin target válido')
              return
            }

            // ========================================
            // MANEJO DE BOTONES DE POI/GEOZONA
            // ========================================
            const actionButton = event.target.closest('[data-action]')
            if (actionButton && actionButton.dataset.action !== 'ver-detalles-conductor') {
              const action = actionButton.dataset.action
              const id = actionButton.dataset.poiId || actionButton.dataset.geozonaId

              if (action === 'ver-detalles-poi' && id) {
                window.verDetallesPOI(id)
              } else if (action === 'ver-detalles-geozona' && id) {
                window.verDetallesGeozona(id)
              }
              return
            }

            // ========================================
            // TOGGLE DEL POPUP DE UNIDADES
            // ========================================
            const toggleBtn = event.target.closest('.toggle-popup-btn')
            if (toggleBtn) {
              const unidadId = toggleBtn.dataset.unidadId
              if (unidadId) {
                const popupContainer = document.getElementById(`popup-unidad-${unidadId}`)
                if (popupContainer) {
                  popupContainer.classList.toggle('expanded')
                }
              }
              return
            }

            // ========================================
            // 🆕 VER DETALLES DEL CONDUCTOR
            // ========================================
            const detailsBtn = event.target.closest('[data-action="ver-detalles-conductor"]')
            if (detailsBtn) {
              const conductorId = detailsBtn.dataset.conductorId
              const conductorNombre = detailsBtn.dataset.conductorNombre

              if (conductorId) {
                console.log(`🚀 Navegando a: ${conductorNombre} (ID: ${conductorId})`)

                // Buscar conductor y grupo
                obtenerConductores().then(() => {
                  const conductorEncontrado = conductores.value.find((c) => c.id === conductorId)

                  if (conductorEncontrado) {
                    obtenerGruposConductores().then(() => {
                      const grupoDelConductor = gruposConductores.value.find((g) =>
                        g.ConductoresIds?.includes(conductorId),
                      )

                      if (grupoDelConductor) {
                        console.log(`✅ Grupo encontrado: ${grupoDelConductor.Nombre}`)

                        // Cerrar dialogs
                        const cerrarDialogs = new CustomEvent('cerrarTodosDialogs')
                        window.dispatchEvent(cerrarDialogs)

                        // Delay para sincronización
                        setTimeout(() => {
                          // Actualizar estado compartido
                          estadoCompartido.value.abrirConductoresConConductor = {
                            conductor: {
                              id: conductorId,
                              grupoId: grupoDelConductor.id,
                              grupoNombre: grupoDelConductor.Nombre,
                            },
                            timestamp: Date.now(),
                          }

                          $q.notify({
                            type: 'positive',
                            message: `Abriendo detalles de ${conductorNombre}`,
                            icon: 'person',
                            position: 'top',
                            timeout: 2000,
                          })
                        }, 100)
                      } else {
                        console.warn('⚠️ Conductor sin grupo')
                        $q.notify({
                          type: 'warning',
                          message: 'El conductor no está asignado a ningún grupo',
                          icon: 'warning',
                          position: 'top',
                        })
                      }
                    })
                  } else {
                    console.error('❌ Conductor no encontrado')
                    $q.notify({
                      type: 'negative',
                      message: 'No se encontró el conductor',
                      icon: 'error',
                      position: 'top',
                    })
                  }
                })
              }
              return
            }
          })
        }
      }, 500)

      window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
    })
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
  }

  // ========================================
  // OTROS EVENT LISTENERS
  // ========================================
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

  // Función global para toggle de geozonas
  window.toggleGeozonaPopup = (geozonaId) => {
    const body = document.getElementById(`geozona-popup-body-${geozonaId}`)
    const button = document.getElementById(`toggle-btn-geo-${geozonaId}`)

    button.classList.toggle('expanded')

    if (button.classList.contains('expanded')) {
      body.style.maxHeight = body.scrollHeight + 'px'
    } else {
      body.style.maxHeight = '0'
    }
  }

  // Event listener para redibujar mapa
  window.addEventListener('redibujarMapa', async () => {
    //console.log('🔄 Redibujando mapa...')
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

    //console.log('✅ Mapa redibujado completamente')
  })

  console.log('🚀 Iniciando tracking GPS...')
  iniciarTracking()
})

const handleMostrarBoton = (e) => {
  mostrarBotonConfirmarGeozona.value = e.detail.mostrar
}

function confirmarYVolverADialogo() {
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

<style>
/* ============================================
  ⚙️ ESTILOS GLOBALES (para el Popup de Mapbox)
  ============================================
  Estos estilos no son 'scoped' porque el popup de Mapbox
  se inyecta en el body, fuera del componente Vue.
============================================ */

/* Contenedor principal del popup de Mapbox */
.mapboxgl-popup-content {
  padding: 0 !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
  background-color: #ffffff !important;
}

/* La pequeña flecha del popup */
.mapboxgl-popup-tip {
  border-top-color: #ffffff !important;
}

/* MODIFICADO: Botón de cerrar (X) más pequeño y mejor posicionado */
.mapboxgl-popup-close-button {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
  border-radius: 50% !important;
  font-size: 18px !important; /* <-- ¡CAMBIO CLAVE! Fuente más pequeña */
  font-weight: bold !important;
  border: 1px solid #e5e7eb !important;
  transition: all 0.2s ease !important;
  top: 6px !important; /* <-- ¡CAMBIO CLAVE! Reposicionado */
  right: 16px !important; /* <-- ¡CAMBIO CLAVE! Reposicionado */
}

.mapboxgl-popup-close-button:hover {
  background-color: #e5e7eb !important;
  color: #374151 !important;
}

/* Contenedor personalizado para el popup de Geozona */
.geozona-popup-container {
  min-width: 260px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}

.geozona-popup-header {
  display: flex;
  flex-direction: column; /* <-- ¡CAMBIO CLAVE! */
  padding: 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-info {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px; /* Espacio entre el título y el botón de expandir */
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.toggle-geozona-btn {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  cursor: pointer;
  width: 30px; /* <-- ¡CAMBIO CLAVE! Más pequeño */
  height: 30px; /* <-- ¡CAMBIO CLAVE! Más pequeño */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  align-self: flex-end; /* <-- ¡CAMBIO CLAVE! Alinea a la derecha */
}

.toggle-geozona-btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  transform: scale(1.05);
}

.chevron-icon {
  transition: transform 0.3s ease-in-out;
}

.toggle-geozona-btn.expanded .chevron-icon {
  transform: rotate(180deg);
}

/* Cuerpo del popup (la parte que se expande y contrae) */
.geozona-popup-body {
  max-height: 0;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding 0.4s ease-in-out;
  padding: 0 16px;
}

/* Estilos del cuerpo cuando está expandido */
.toggle-geozona-btn.expanded ~ .geozona-popup-body {
  padding: 16px;
}

/* Contenedor de la lista de puntos con scroll */
.points-list-container {
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 16px;
}

/* Tarjeta para cada punto */
.point-card {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.point-card:last-child {
  margin-bottom: 0;
}

.point-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.point-address {
  margin-bottom: 8px;
}

.address-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  background-color: #f3f4f6;
  padding: 6px 8px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  margin-bottom: 4px;
}

.point-coords {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.coord-label {
  color: #6b7280;
  font-weight: 500;
}

.coord-value {
  color: #1f2937;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 600;
}

.details-btn {
  width: 100%;
  padding: 18px 12px; /* <-- ¡CAMBIO CLAVE! Más padding */
  margin-bottom: 16px; /* <-- ¡CAMBIO CLAVE! Espacio abajo del botón */
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);
}

.details-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(239, 68, 68, 0.3);
}

/* Scrollbar personalizado para la lista de puntos */
.points-list-container::-webkit-scrollbar {
  width: 6px;
}

.points-list-container::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.points-list-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.points-list-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.poi-popup-container {
  min-width: 260px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}

.poi-popup-header {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.poi-popup-body {
  padding: 16px;
}

.event-indicator {
  display: flex;
  align-items: center;
  background-color: #fef2f2;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.event-icon {
  font-size: 24px;
  margin-right: 8px;
}

.event-info {
  display: flex;
  flex-direction: column;
}

.event-count {
  font-size: 16px;
  font-weight: bold;
  color: #dc2626;
}

.event-label {
  font-size: 11px;
  color: #7f1d1d;
}

.address-info {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
}

.address-icon {
  font-size: 18px;
  margin-right: 8px;
  margin-top: 2px;
}

.address-text {
  font-size: 13px;
  color: #4b5563;
  flex: 1;
}

.details-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);
}

.details-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(239, 68, 68, 0.3);
}

/* Animación de entrada del popup */
.popup-animated .mapboxgl-popup-content {
  animation: popupFade 0.2s ease-out;
}

.popup-section {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
}

.popup-section:last-child {
  border-bottom: none;
}

.popup-section .label {
  color: #6b7280;
  font-weight: 500;
}

.popup-section .value {
  color: #1f2937;
  font-weight: 600;
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

.unidad-popup-container {
  min-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}

/* ✅ NUEVO: Estilo para la dirección en el estado contraído */
.unidad-direccion {
  font-size: 12px;
  color: #374151;
  margin-top: 4px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* Ajusta según sea necesario */
}

.unidad-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.unidad-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unidad-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.unidad-texto strong {
  font-size: 15px;
  color: #1f2937;
  display: block;
}

.unidad-texto div {
  font-size: 12px;
  color: #6b7280;
}

.toggle-popup-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.toggle-popup-btn:hover {
  background-color: #e5e7eb;
}

.unidad-popup-body {
  max-height: 0;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding 0.4s ease-in-out;
  padding: 0 16px;
}

.unidad-popup-container.expanded .unidad-popup-body {
  max-height: 400px; /* Un valor lo suficientemente grande */
  padding: 16px;
}

.unidad-popup-container.expanded .chevron-icon {
  transform: rotate(180deg);
}
</style>

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
  0%,
  100% {
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

:deep(.icono-poi-hover:hover) {
  transform: scale(1.15);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4)) !important;
}

:deep(.icono-geozona-hover:hover) {
  transform: scale(1.15);
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35)) !important;
}

:deep(.icono-poi-hover:hover > div > div:last-child),
:deep(.icono-geozona-hover:hover > div > div:last-child) {
  transform: scale(0.91) !important;
}
</style>
