/*Este es mi IndexPage.vue*/
<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>
    <q-btn
      unelevated
      style="background: linear-gradient(135deg, #bb0000 15%, #bb5e00 85%) !important"
      text-color="white"
      icon="layers"
      class="layers-menu-btn"
      padding="sm"
      border-color="#000000"
    >
      <q-tooltip>Capas del Mapa</q-tooltip>

      <q-menu class="layers-menu" transition-show="jump-down" transition-hide="jump-up">
        <q-list style="min-width: 320px">
          <div class="map-styles-section">
            <q-item-label header class="section-header">
              <q-icon name="map" size="18px" class="header-icon" />
              ESTILO DE MAPA
            </q-item-label>

            <div class="map-styles-container">
              <div
                class="map-style-card"
                :class="{ active: estiloMapa === 'satellite' }"
                @click="cambiarEstiloDesdeMenu('satellite')"
              >
                <div class="style-preview">
                  <svg
                    width="150"
                    height="100"
                    viewBox="0 0 150 100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="earthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color: #1a3a1a; stop-opacity: 1" />
                        <stop offset="50%" style="stop-color: #2d5a2d; stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: #1a3a1a; stop-opacity: 1" />
                      </linearGradient>
                      <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color: #1a4d6d; stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: #0d2a3d; stop-opacity: 1" />
                      </linearGradient>
                    </defs>
                    <rect width="150" height="100" fill="url(#earthGradient)" rx="8" ry="8" />
                    <path
                      d="M 0 60 Q 40 55, 80 60 T 150 55 L 150 100 L 0 100 Z"
                      fill="url(#waterGradient)"
                      opacity="0.8"
                    />
                    <ellipse cx="30" cy="35" rx="25" ry="20" fill="#0d2a1a" opacity="0.6" />
                    <ellipse cx="90" cy="25" rx="35" ry="25" fill="#0d2a1a" opacity="0.5" />
                    <ellipse cx="120" cy="45" rx="20" ry="18" fill="#0d2a1a" opacity="0.7" />
                    <rect x="10" y="70" width="30" height="20" fill="#3d4a2d" opacity="0.5" />
                    <rect x="60" y="65" width="40" height="25" fill="#3d4a2d" opacity="0.4" />
                    <line
                      x1="0"
                      y1="50"
                      x2="150"
                      y2="48"
                      stroke="#555555"
                      stroke-width="1.5"
                      opacity="0.8"
                    />
                    <line
                      x1="45"
                      y1="0"
                      x2="48"
                      y2="100"
                      stroke="#555555"
                      stroke-width="1"
                      opacity="0.6"
                    />
                    <line
                      x1="100"
                      y1="0"
                      x2="95"
                      y2="100"
                      stroke="#555555"
                      stroke-width="1"
                      opacity="0.6"
                    />
                    <rect x="42" y="45" width="4" height="4" fill="#8a8a8a" opacity="0.9" />
                    <rect x="47" y="47" width="3" height="3" fill="#8a8a8a" opacity="0.9" />
                    <rect x="96" y="72" width="5" height="5" fill="#8a8a8a" opacity="0.9" />
                    <rect x="102" y="70" width="4" height="4" fill="#8a8a8a" opacity="0.9" />
                  </svg>
                </div>
                <div class="style-info">
                  <div class="style-label">Satélite</div>
                  <div class="style-description">Vista aérea</div>
                </div>
                <div v-if="estiloMapa === 'satellite'" class="active-indicator">
                  <q-icon name="check_circle" size="22px" color="positive" />
                </div>
              </div>

              <!-- OPCIÓN: VISTA CALLES -->
              <div
                class="map-style-card"
                :class="{ active: estiloMapa === 'streets' }"
                @click="cambiarEstiloDesdeMenu('streets')"
              >
                <div class="style-preview">
                  <!-- 🔥 SVG COMPLETO CALLES -->
                  <svg
                    width="150"
                    height="100"
                    viewBox="0 0 150 100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color: #f5f5f0; stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: #e8e8e0; stop-opacity: 1" />
                      </linearGradient>
                    </defs>
                    <rect width="150" height="100" fill="url(#bgGradient)" rx="8" ry="8" />
                    <rect x="5" y="10" width="35" height="30" fill="#c8e6c9" opacity="0.8" />
                    <rect x="110" y="55" width="30" height="35" fill="#c8e6c9" opacity="0.8" />
                    <rect x="0" y="45" width="150" height="6" fill="#d0d0d0" />
                    <rect x="55" y="0" width="6" height="100" fill="#d0d0d0" />
                    <rect x="0" y="75" width="150" height="4" fill="#d0d0d0" />
                    <rect x="95" y="0" width="4" height="100" fill="#d0d0d0" />
                    <rect x="25" y="0" width="2" height="100" fill="#e5e5e5" />
                    <rect x="80" y="0" width="2" height="100" fill="#e5e5e5" />
                    <rect x="120" y="0" width="2" height="100" fill="#e5e5e5" />
                    <rect x="0" y="20" width="150" height="2" fill="#e5e5e5" />
                    <rect x="0" y="65" width="150" height="2" fill="#e5e5e5" />
                    <rect x="0" y="90" width="150" height="2" fill="#e5e5e5" />
                    <rect
                      x="8"
                      y="52"
                      width="15"
                      height="12"
                      fill="#f5f5f5"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="28"
                      y="52"
                      width="20"
                      height="12"
                      fill="#ffffff"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="62"
                      y="12"
                      width="18"
                      height="18"
                      fill="#fafafa"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="85"
                      y="15"
                      width="12"
                      height="15"
                      fill="#f5f5f5"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="62"
                      y="52"
                      width="25"
                      height="20"
                      fill="#ffffff"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="100"
                      y="20"
                      width="15"
                      height="22"
                      fill="#fafafa"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="8"
                      y="80"
                      width="20"
                      height="15"
                      fill="#f5f5f5"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="35"
                      y="80"
                      width="15"
                      height="15"
                      fill="#ffffff"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="62"
                      y="80"
                      width="18"
                      height="15"
                      fill="#fafafa"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <rect
                      x="100"
                      y="80"
                      width="12"
                      height="15"
                      fill="#f5f5f5"
                      stroke="#c0c0c0"
                      stroke-width="0.5"
                    />
                    <line
                      x1="0"
                      y1="48"
                      x2="150"
                      y2="48"
                      stroke="white"
                      stroke-width="0.5"
                      stroke-dasharray="3,3"
                      opacity="0.6"
                    />
                    <line
                      x1="58"
                      y1="0"
                      x2="58"
                      y2="100"
                      stroke="white"
                      stroke-width="0.5"
                      stroke-dasharray="3,3"
                      opacity="0.6"
                    />
                    <circle cx="15" cy="20" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="25" cy="18" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="20" cy="28" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="32" cy="25" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="120" cy="65" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="128" cy="70" r="3" fill="#66bb6a" opacity="0.8" />
                    <circle cx="122" cy="80" r="3" fill="#66bb6a" opacity="0.8" />
                  </svg>
                </div>
                <div class="style-info">
                  <div class="style-label">Calles</div>
                  <div class="style-description">Vista urbana</div>
                </div>
                <div v-if="estiloMapa === 'streets'" class="active-indicator">
                  <q-icon name="check_circle" size="22px" color="positive" />
                </div>
              </div>
            </div>
          </div>

          <!-- LÍNEA DIVISORIA -->
          <q-separator class="section-separator" />

          <!-- SECCIÓN: CAPAS ADICIONALES -->
          <div class="traffic-section">
            <q-item-label header class="section-header">
              <q-icon name="add_road" size="18px" class="header-icon" />
              CAPAS ADICIONALES
            </q-item-label>

            <q-item clickable @click="manejarToggleTrafico" class="traffic-toggle-item">
              <q-item-section avatar>
                <q-icon
                  :name="traficoActivo ? 'toggle_on' : 'toggle_off'"
                  :color="traficoActivo ? 'positive' : 'grey-5'"
                  size="32px"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="traffic-label">Tráfico en tiempo real</q-item-label>
                <q-item-label caption class="traffic-caption">
                  {{ traficoActivo ? 'Activado' : 'Desactivado' }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </div>
        </q-list>
      </q-menu>
    </q-btn>
    <q-btn
      fab
      unelevated
      style="background: linear-gradient(135deg, #bb0000 15%, #bb5e00 85%) !important"
      icon="my_location"
      text-color="white"
      class="recenter-btn boton-centrar-mapa"
      @click="recentrarEnUsuario"
    >
      <q-tooltip class="bg-grey-9" transition-show="scale" transition-hide="scale">
        Centrar en mi ubicación
      </q-tooltip>
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
import { useMultiTenancy } from 'src/composables/useMultiTenancy'
import { useGeozonaUtils } from 'src/composables/useGeozonaUtils'
import { useGeocoding } from 'src/composables/useGeocoding'

const geozonasCacheCompleto = ref([])

const {
  initMap,
  cleanup,
  toggleTrafico,
  cambiarEstiloMapa,
  actualizarMarcadoresUnidades,
  limpiarMarcadoresUnidades,
} = useMapboxGL()

const geozonasDibujadas = ref(new Set())
const poisDibujados = ref(new Set())

const { cargarUsuarioActual, idEmpresaActual } = useMultiTenancy()

const { abrirGeozonasConPOI } = useEventBus()
const { inicializar, evaluarEventosParaUnidadesSimulacion, resetear } = useEventDetection()

const marcadoresPOIs = ref([])
//const marcadoresGeozonas = ref([])
const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)
const ubicacionActiva = ref(false)
const marcadorUsuario = ref(null)
const { unidadesActivas, iniciarTracking } = useTrackingUnidades()
const userId = ref(auth.currentUser?.uid || '')

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)
const { obtenerEventos } = useEventos(userId.value)
const traficoActivo = ref(false)
const estiloMapa = ref('satellite') // ✅ NUEVO ESTADO

const poisCargados = ref([])
const geozonasCargadas = ref([])

const $q = useQuasar()
const { simulacionActiva, iniciarSimulacion } = useSimuladorUnidades()

const { obtenerCentroGeozona } = useGeozonaUtils()
const { obtenerDireccion } = useGeocoding() // 🔥 Agregar esta línea

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

    const mapElement = document.querySelector('.mapboxgl-map')
    if (mapElement) {
      const isZooming = mapElement.classList.contains('mapboxgl-touch-zoom-rotate')
      const isPanning = mapElement.classList.contains('mapboxgl-touch-drag-pan')

      if (isZooming || isPanning) {
        return
      }
    }

    const nuevoHash = nuevasUnidades
      .map((u) => `${u.unidadId}-${u.ubicacion?.lat}-${u.ubicacion?.lng}-${u.estado}`)
      .join('|')

    if (nuevoHash !== ultimoHashUnidades) {
      actualizarMarcadoresUnidades(nuevasUnidades)
      ultimoHashUnidades = nuevoHash
    }
  },
  { deep: false, immediate: false },
)

function iniciarEvaluacionContinuaEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
  }

  intervaloEvaluacionEventos = setInterval(() => {
    const unidadesParaEvaluar = window._unidadesTrackeadas || unidadesActivas.value

    if (unidadesParaEvaluar && unidadesParaEvaluar.length > 0) {
      evaluarEventosParaUnidadesSimulacion(unidadesParaEvaluar)
    }
  }, 10000)
}

function detenerEvaluacionEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
    intervaloEvaluacionEventos = null
  }
}

const iniciarSimuladorAutomatico = async () => {
  if (simuladorYaIniciado || simulacionActiva.value) {
    return
  }

  try {
    if (!idEmpresaActual.value) {
      await cargarUsuarioActual()
    }
    await obtenerConductores()
    await obtenerUnidades()
  } catch (error) {
    console.error('❌ Error:', error)
  }

  try {
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

    simuladorYaIniciado = true

    await iniciarSimulacion(conductores.value, unidades.value)

    simuladorActivo.value = true

    $q.notify({
      type: 'positive',
      message: `Simulador GPS iniciado: ${conductoresConUnidad.length} unidades`,
      position: 'top',
      timeout: 500,
      icon: 'explore',
    })
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

    const popupContent = `
      <div class="ubicacion-popup-container">
        <div class="ubicacion-popup-header">
          <div class="header-info">
            <div class="header-title">Tu ubicación</div>
            <div class="header-divider"></div>
            <div class="header-subtitle">Ubicación actual GPS</div>
          </div>
        </div>

        <div class="ubicacion-popup-body">
          <div class="coords-info">
            <div class="coord-row">
              <span class="coord-label">Latitud:</span>
              <span class="coord-value">${lat.toFixed(6)}</span>
            </div>
            <div class="coord-row">
              <span class="coord-label">Longitud:</span>
              <span class="coord-value">${lng.toFixed(6)}</span>
            </div>
          </div>
        </div>
      </div>
    `

    const popup = new mapboxgl.Popup({
      offset: 25,
      className: 'popup-animated',
      closeButton: true,
      closeOnClick: false,
    }).setHTML(popupContent)

    marcadorUsuario.value = new mapboxgl.Marker({
      element: markerEl,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .setPopup(popup)
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
    timeout: 15000,
    maximumAge: 5000,
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      ubicacionActiva.value = true
      actualizarMarcadorUsuario(latitude, longitude)
    },
    (error) => {
      switch (error.code) {
        case error.TIMEOUT:
          console.warn('GPS timeout - reintentando...')
          break
        case error.PERMISSION_DENIED:
          console.error('Permiso de GPS denegado')
          ubicacionActiva.value = false
          break
        case error.POSITION_UNAVAILABLE:
          console.warn('Posición GPS no disponible')
          break
        default:
          console.error('Error de geolocalización:', error.message)
      }
    },
    opciones,
  )
}

function detenerSeguimientoGPS() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
    ubicacionActiva.value = false
  }
}

async function inicializarSistemaDeteccion() {
  try {
    const [eventos, pois, geozonas] = await Promise.all([
      obtenerEventos(),
      obtenerPOIs(),
      obtenerGeozonas(),
    ])

    const eventosActivos = eventos.filter((e) => e.activo)

    inicializar(eventosActivos, pois, geozonas)
  } catch (error) {
    console.error('Error al inicializar detección:', error)
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

const dibujarGeozonasCombinadas = async (geozonas) => {
  if (!mapaAPI?.map) return

  const eventosActivos = await obtenerEventos()
  const eventosFiltrados = eventosActivos.filter((e) => e.activo)

  const circularesFeatures = []
  const poligonalesFeatures = []
  const symbolsFeatures = []

  geozonas.forEach((geozona) => {
    const tieneEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
    const color = geozona.color || '#4ECDC4'
    const borderColor = oscurecerColor(color, 30)
    const colorKey = color.replace('#', '')
    if (window._mapboxLoadIcon) {
      if (geozona.tipoGeozona === 'circular') {
        window._mapboxLoadIcon(mapaAPI.map, 'geozona-circular', color, false)
        window._mapboxLoadIcon(mapaAPI.map, 'geozona-circular', color, true)
      } else if (geozona.tipoGeozona === 'poligono') {
        window._mapboxLoadIcon(mapaAPI.map, 'geozona-poligonal', color, false)
        window._mapboxLoadIcon(mapaAPI.map, 'geozona-poligonal', color, true)
      }
    }

    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      circularesFeatures.push({
        type: 'Feature',
        properties: {
          id: geozona.id,
          nombre: geozona.nombre,
          color: color,
          borderColor: borderColor,
          radio: geozona.radio,
          lat: geozona.centro.lat,
          tieneEventos: tieneEventos,
        },
        geometry: {
          type: 'Point',
          coordinates: [geozona.centro.lng, geozona.centro.lat],
        },
      })

      const iconSuffix = tieneEventos ? '-badge' : ''
      symbolsFeatures.push({
        type: 'Feature',
        properties: {
          id: geozona.id,
          nombre: geozona.nombre,
          tipo: 'circular',
          iconImage: `geozona-circular-${colorKey}${iconSuffix}`,
          tieneEventos: tieneEventos,
          puntos: 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [geozona.centro.lng, geozona.centro.lat],
        },
      })
    } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
      const coordinates = geozona.puntos.map((p) => [p.lng, p.lat])
      coordinates.push(coordinates[0])

      poligonalesFeatures.push({
        type: 'Feature',
        properties: {
          id: geozona.id,
          nombre: geozona.nombre,
          color: color,
          borderColor: borderColor,
          tieneEventos: tieneEventos,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      })

      const lats = geozona.puntos.map((p) => p.lat)
      const lngs = geozona.puntos.map((p) => p.lng)
      const centroLat = lats.reduce((a, b) => a + b) / lats.length
      const centroLng = lngs.reduce((a, b) => a + b) / lngs.length

      const iconSuffix = tieneEventos ? '-badge' : ''
      symbolsFeatures.push({
        type: 'Feature',
        properties: {
          id: geozona.id,
          nombre: geozona.nombre,
          tipo: 'poligonal',
          iconImage: `geozona-poligonal-${colorKey}${iconSuffix}`,
          puntos: geozona.puntos.length,
        },
        geometry: {
          type: 'Point',
          coordinates: [centroLng, centroLat],
        },
      })
    }
  })
  if (circularesFeatures.length > 0) {
    const sourceId = 'geozonas-circulares-combined'

    if (mapaAPI.map.getSource(sourceId)) {
      mapaAPI.map.getSource(sourceId).setData({
        type: 'FeatureCollection',
        features: circularesFeatures,
      })
    } else {
      mapaAPI.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: circularesFeatures,
        },
      })

      mapaAPI.map.addLayer({
        id: sourceId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            0,
            20,
            [
              '/',
              ['get', 'radio'],
              ['/', 0.075, ['cos', ['*', ['get', 'lat'], ['/', Math.PI, 180]]]],
            ],
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.35,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'borderColor'],
        },
      })
    }
  }
  if (poligonalesFeatures.length > 0) {
    const sourceId = 'geozonas-poligonales-combined'

    if (mapaAPI.map.getSource(sourceId)) {
      mapaAPI.map.getSource(sourceId).setData({
        type: 'FeatureCollection',
        features: poligonalesFeatures,
      })
    } else {
      mapaAPI.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: poligonalesFeatures,
        },
      })
      mapaAPI.map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.35,
        },
      })
      mapaAPI.map.addLayer({
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': ['get', 'borderColor'],
          'line-width': 3,
        },
      })
    }
  }
  if (symbolsFeatures.length > 0) {
    const sourceId = 'geozonas-symbols'

    if (mapaAPI.map.getSource(sourceId)) {
      mapaAPI.map.getSource(sourceId).setData({
        type: 'FeatureCollection',
        features: symbolsFeatures,
      })

      if (mapaAPI.map.getLayer(sourceId)) {
        mapaAPI.map.moveLayer(sourceId)
      }
    } else {
      mapaAPI.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: symbolsFeatures,
        },
      })

      mapaAPI.map.addLayer({
        id: sourceId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': ['get', 'iconImage'],
          'icon-size': 0.75,
          'icon-allow-overlap': true,
          'icon-ignore-placement': false,
        },
      })
      mapaAPI.map.on('click', sourceId, (e) => {
        e.preventDefault()
        if (e.originalEvent) {
          e.originalEvent.stopPropagation()
        }

        const feature = e.features[0]
        const geozona = geozonasCargadas.value.find((g) => g.id === feature.properties.id)

        if (geozona) {
          mostrarPopupGeozonaConDireccion(geozona, e.lngLat)
          let direccionesPuntos = []
          if (geozona.tipoGeozona === 'poligono' && geozona.puntos?.length > 0) {
            direccionesPuntos = geozona.puntos.map((punto, index) => ({
              index: index,
              direccion: punto.direccion || 'Dirección no disponible',
              lat: punto.lat,
              lng: punto.lng,
            }))
          }

          const popupContent = `
      <div class="geozona-popup-container">
        <div class="geozona-popup-header">
          <div class="header-info">
            <div class="header-title">${geozona.nombre}</div>
            <div class="header-divider"></div>
            <div class="header-subtitle">${geozona.puntos?.length || 0} puntos definidos</div>
          </div>
          <button id="toggle-btn-geo-${geozona.id}" class="toggle-geozona-btn" onclick="toggleGeozonaPopup('${geozona.id}')">
            <svg class="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
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
                  <div><span class="coord-label">Latitud:</span> <span class="coord-value">${punto.lat.toFixed(6)}</span></div>
                  <div><span class="coord-label">Longitud:</span> <span class="coord-value">${punto.lng.toFixed(6)}</span></div>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
          <button onclick="window.verDetallesGeozona('${geozona.id}')" class="details-btn">
            Ver más detalles
          </button>
        </div>
      </div>
    `

          if (popupGlobalActivo) {
            popupGlobalActivo.remove()
          }

          popupGlobalActivo = new mapboxgl.Popup({
            offset: 25,
            className: 'popup-animated',
            closeButton: true,
            closeOnClick: true,
          })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(mapaAPI.map)
        } else {
          console.error('❌ Geozona NO encontrada')
        }
      })

      // Cursor pointer al hover
      mapaAPI.map.on('mouseenter', sourceId, () => {
        mapaAPI.map.getCanvas().style.cursor = 'pointer'
      })

      mapaAPI.map.on('mouseleave', sourceId, () => {
        mapaAPI.map.getCanvas().style.cursor = ''
      })
    }
  }
}
const dibujarPOIsCombinados = async (pois) => {
  if (!mapaAPI?.map) return

  const eventosActivos = await obtenerEventos()
  const eventosFiltrados = eventosActivos.filter((e) => e.activo)
  const poisFeatures = pois
    .filter((poi) => poi.coordenadas)
    .map((poi) => {
      const { lat, lng } = poi.coordenadas
      const radio = poi.radio || 100
      const color = poi.color || '#FF5252'
      const colorKey = color.replace('#', '')
      const tieneEventos = tieneEventosAsignados(poi.id, 'poi', eventosFiltrados)

      if (window._mapboxLoadIcon) {
        window._mapboxLoadIcon(mapaAPI.map, 'poi', color, false)
        window._mapboxLoadIcon(mapaAPI.map, 'poi', color, true)
      }
      const iconSuffix = tieneEventos ? '-badge' : ''
      return {
        type: 'Feature',
        properties: {
          id: poi.id,
          nombre: poi.nombre,
          direccion: poi.direccion,
          color: color,
          colorKey: colorKey,
          radio: radio,
          lat: lat,
          tieneEventos: tieneEventos,
          iconImage: `poi-${colorKey}${iconSuffix}`,
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      }
    })

  if (poisFeatures.length > 0) {
    const sourceId = 'pois-combined'

    if (mapaAPI.map.getSource(sourceId)) {
      mapaAPI.map.getSource(sourceId).setData({
        type: 'FeatureCollection',
        features: poisFeatures,
      })

      if (mapaAPI.map.getLayer('pois-symbols')) {
        mapaAPI.map.moveLayer('pois-symbols')
      }
    } else {
      mapaAPI.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: poisFeatures,
        },
      })
      mapaAPI.map.addLayer({
        id: 'pois-circles',
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            0,
            20,
            [
              '/',
              ['get', 'radio'],
              ['/', 0.075, ['cos', ['*', ['get', 'lat'], ['/', Math.PI, 180]]]],
            ],
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.15,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
        },
      })
      mapaAPI.map.addLayer({
        id: 'pois-symbols',
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': ['get', 'iconImage'],
          'icon-size': 0.75,
          'icon-allow-overlap': true,
          'icon-ignore-placement': false,
        },
      })
      mapaAPI.map.on('click', 'pois-symbols', (e) => {
        e.preventDefault()
        if (e.originalEvent) {
          e.originalEvent.stopPropagation()
        }

        const feature = e.features[0]
        const poi = pois.find((p) => p.id === feature.properties.id)

        if (poi) {
          const popupContent = `
            <div class="poi-popup-container">
              <div class="poi-popup-header">
                <div class="header-info">
                  <div class="header-title">${poi.nombre}</div>
                  <div class="header-divider"></div>
                  <div class="header-subtitle">Radio: ${poi.radio || 100}m</div>
                </div>
              </div>
              <div class="poi-popup-body">
                <div class="address-info">
                  <div class="address-icon"></div>
                  <div class="address-text">${poi.direccion}</div>
                </div>
                <button onclick="window.verDetallesPOI('${poi.id}')" class="details-btn">
                  Ver más detalles
                </button>
              </div>
            </div>
          `

          if (popupGlobalActivo) {
            popupGlobalActivo.remove()
          }

          popupGlobalActivo = new mapboxgl.Popup({
            offset: 25,
            className: 'popup-animated',
            closeButton: true,
            closeOnClick: false,
          })
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(mapaAPI.map)
        }
      })

      // Cursor pointer al hover
      mapaAPI.map.on('mouseenter', 'pois-symbols', () => {
        mapaAPI.map.getCanvas().style.cursor = 'pointer'
      })

      mapaAPI.map.on('mouseleave', 'pois-symbols', () => {
        mapaAPI.map.getCanvas().style.cursor = ''
      })
    }
  }
}

const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  mapaAPI = mapPage._mapaAPI

  try {
    const pois = await obtenerPOIs()
    poisCargados.value = pois
    await dibujarPOIsCombinados(pois)

    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas
    geozonasCacheCompleto.value = geozonas
    await dibujarGeozonasCombinadas(geozonas)

    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }
  } catch (error) {
    console.error('❌ Error al cargar y dibujar items:', error)
  }
}

const restaurarCapasDespuesEstilo = async () => {
  if (!mapaAPI || !mapaAPI.map) return
  for (const poiKey of poisDibujados.value) {
    const poiId = poiKey.replace('poi-', '')
    const poi = poisCargados.value.find((p) => p.id === poiId)

    if (!poi) continue

    const { lat, lng } = poi.coordenadas
    const radio = poi.radio || 100
    const color = poi.color || '#FF5252'
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
          'circle-color': color,
          'circle-opacity': 0.15,
          'circle-stroke-width': 2,
          'circle-stroke-color': color,
        },
      })
    }
  }

  for (const geozonaKey of geozonasDibujadas.value) {
    const geozonaId = geozonaKey.replace('geozona-', '')
    const geozona = geozonasCargadas.value.find((g) => g.id === geozonaId)

    if (!geozona) continue

    const fillColor = geozona.color || '#4ECDC4'
    const borderColor = oscurecerColor(fillColor, 30)

    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      const { lat, lng } = geozona.centro
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
    } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
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
    }
  }
}

const limpiarCapasDelMapa = () => {
  if (!mapaAPI || !mapaAPI.map) return

  // Limpiar marcadores
  if (marcadoresPOIs.value && marcadoresPOIs.value.length > 0) {
    marcadoresPOIs.value.forEach((marker) => {
      try {
        marker.remove()
      } catch (e) {
        console.warn('⚠️ Error al remover marcador:', e)
      }
    })
    marcadoresPOIs.value = []
  }
  const layersToRemove = [
    'pois-combined',
    'geozonas-circulares-combined',
    'geozonas-poligonales-combined-fill',
    'geozonas-poligonales-combined-outline',
  ]

  const sourcesToRemove = [
    'pois-combined',
    'geozonas-circulares-combined',
    'geozonas-poligonales-combined',
  ]

  layersToRemove.forEach((layerId) => {
    if (mapaAPI.map.getLayer(layerId)) {
      mapaAPI.map.removeLayer(layerId)
    }
  })

  sourcesToRemove.forEach((sourceId) => {
    if (mapaAPI.map.getSource(sourceId)) {
      mapaAPI.map.removeSource(sourceId)
    }
  })

  // Limpiar cache
  geozonasDibujadas.value.clear()
  poisDibujados.value.clear()
}

const recentrarEnUsuario = () => {
  if (!marcadorUsuario.value) {
    $q.notify({
      type: 'warning',
      message: '⚠️ Ubicación GPS no disponible',
      caption: 'Esperando señal GPS...',
      position: 'top',
      timeout: 2000,
    })
    return
  }

  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const coords = marcadorUsuario.value.getLngLat()

  mapPage._mapaAPI.map.flyTo({
    center: [coords.lng, coords.lat],
    zoom: 15,
    duration: 1500,
    essential: true,
  })

  $q.notify({
    type: 'positive',
    message: '🎯 Centrado en tu ubicación',
    position: 'top',
    timeout: 1500,
    icon: 'my_location',
  })
}

// En IndexPage.vue, reemplaza el método dibujarRutaTrayecto completo:

const dibujarRutaTrayecto = async (trayecto, vehiculo) => {
  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) {
    console.warn('⚠️ Mapa no inicializado')
    return
  }

  const map = mapPage._mapaAPI.map

  try {
    console.log('📍 Dibujando ruta con', trayecto.coordenadas?.length, 'puntos')
    console.log('🎨 Color del trayecto:', trayecto.color)

    // 🔥 IMPORTANTE: Primero limpiar LAYERS, luego SOURCES
    const capasRuta = [
      'ruta-trayecto-borde',
      'ruta-trayecto',
      'ruta-flechas',
      'ruta-circulo-inicio',
      'ruta-circulo-fin',
      'ruta-inicio',
      'ruta-fin',
    ]

    capasRuta.forEach((capa) => {
      if (map.getLayer(capa)) {
        map.removeLayer(capa)
      }
    })

    // AHORA sí remover sources (después de los layers)
    const sourcesRuta = [
      'ruta-trayecto',
      'ruta-flechas',
      'ruta-circulo-inicio',
      'ruta-circulo-fin',
      'ruta-inicio',
      'ruta-fin',
    ]

    sourcesRuta.forEach((source) => {
      if (map.getSource(source)) {
        map.removeSource(source)
      }
    })

    // Limpiar marcadores HTML previos
    marcadoresRuta.value.forEach((marker) => {
      try {
        marker.remove()
      } catch (e) {
        console.warn('Error removiendo marcador:', e)
      }
    })
    marcadoresRuta.value = []

    // Obtener coordenadas del trayecto
    const coordenadas = trayecto.coordenadas || []

    if (coordenadas.length === 0) {
      console.warn('⚠️ Trayecto sin coordenadas')
      return
    }

    // Convertir coordenadas al formato [lng, lat] para Mapbox
    const lineCoordinates = coordenadas.map((coord) => [coord.lng, coord.lat])

    // 1. Agregar source para la línea del trayecto
    map.addSource('ruta-trayecto', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineCoordinates,
        },
      },
    })

    // 2. Capa de BORDE NEGRO (debajo, más ancha)
    map.addLayer({
      id: 'ruta-trayecto-borde',
      type: 'line',
      source: 'ruta-trayecto',
      paint: {
        'line-color': '#000000',
        'line-width': 10, // 👈 Cambiar de 8 a 12
        'line-opacity': 1,
      },
    })

    // 3. Capa BLANCA principal (encima, más delgada)
    map.addLayer({
      id: 'ruta-trayecto',
      type: 'line',
      source: 'ruta-trayecto',
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 8, // 👈 Cambiar de 5 a 8
        'line-opacity': 1,
      },
    })

    // 🎯 NUEVO: Agregar FLECHAS direccionales
    // Cargar el icono de flecha si no existe
    if (!map.hasImage('arrow-icon')) {
      const arrowSvg = `
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2 L18 10 L10 18 L10 12 L2 12 L2 8 L10 8 Z" fill="#00FFF2" stroke="#000000" stroke-width="2"/>
  </svg>
`
      const img = new Image(20, 20)
      img.onload = () => map.addImage('arrow-icon', img)
      img.src = 'data:image/svg+xml;base64,' + btoa(arrowSvg)
    }

    // Esperar un poco para que se cargue el icono
    setTimeout(() => {
      map.addLayer({
        id: 'ruta-flechas',
        type: 'symbol',
        source: 'ruta-trayecto',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 80, // Espaciado entre flechas
          'icon-image': 'arrow-icon',
          'icon-size': 0.6,
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-opacity': 0.8,
        },
      })
    }, 100)

    // 🎯 NUEVO: Agregar CÍRCULOS de sombra en inicio y fin
    const inicio = coordenadas[0]
    const fin = coordenadas[coordenadas.length - 1]

    // Círculo de inicio (azul semi-transparente)
    map.addSource('ruta-circulo-inicio', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [inicio.lng, inicio.lat],
        },
      },
    })

    map.addLayer({
      id: 'ruta-circulo-inicio',
      type: 'circle',
      source: 'ruta-circulo-inicio',
      paint: {
        'circle-radius': 20,
        'circle-color': '#1976D2',
        'circle-opacity': 0.4, // 👈 Cambiar de 0.25 a 0.4
        'circle-blur': 0.5,
      },
    })

    // Círculo de fin (naranja semi-transparente)
    map.addSource('ruta-circulo-fin', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fin.lng, fin.lat],
        },
      },
    })

    map.addLayer({
      id: 'ruta-circulo-fin',
      type: 'circle',
      source: 'ruta-circulo-fin',
      paint: {
        'circle-radius': 20,
        'circle-color': '#FF6D00',
        'circle-opacity': 0.4, // 👈 Cambiar de 0.25 a 0.4
        'circle-blur': 0.5,
      },
    })

    // 4. Crear marcador de INICIO con pin azul
    const markerInicioEl = document.createElement('div')
    markerInicioEl.className = 'marcador-ruta-custom marcador-inicio'
    markerInicioEl.innerHTML = `
      <div class="marcador-pin-container">
        <svg width="30" height="50" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin azul -->
          <path d="M20 0C8.95 0 0 8.95 0 20C0 32 20 52 20 52C20 52 40 32 40 20C40 8.95 31.05 0 20 0Z" fill="#1976D2"/>
          <path d="M20 0C8.95 0 0 8.95 0 20C0 32 20 52 20 52C20 52 40 32 40 20C40 8.95 31.05 0 20 0Z" fill="url(#gradient-inicio)"/>

          <!-- Círculo blanco interior -->
          <circle cx="20" cy="18" r="11" fill="white"/>

          <!-- Texto "INICIO" -->
          <text x="20" y="18" text-anchor="middle" dominant-baseline="central"
                font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="#1976D2">
            INICIO
          </text>

          <defs>
            <linearGradient id="gradient-inicio" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#2196F3;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1565C0;stop-opacity:1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    `

    const markerInicio = new mapboxgl.Marker({
      element: markerInicioEl,
      anchor: 'bottom',
    })
      .setLngLat([inicio.lng, inicio.lat])
      .addTo(map)

    marcadoresRuta.value.push(markerInicio)

    // 5. Crear marcador de FIN con pin naranja/rojo
    const markerFinEl = document.createElement('div')
    markerFinEl.className = 'marcador-ruta-custom marcador-fin'
    markerFinEl.innerHTML = `
      <div class="marcador-pin-container">
        <svg width="30" height="50" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin naranja -->
          <path d="M20 0C8.95 0 0 8.95 0 20C0 32 20 52 20 52C20 52 40 32 40 20C40 8.95 31.05 0 20 0Z" fill="#FF6D00"/>
          <path d="M20 0C8.95 0 0 8.95 0 20C0 32 20 52 20 52C20 52 40 32 40 20C40 8.95 31.05 0 20 0Z" fill="url(#gradient-fin)"/>

          <!-- Círculo blanco interior -->
          <circle cx="20" cy="18" r="11" fill="white"/>

          <!-- Texto "FIN" -->
          <text x="20" y="18" text-anchor="middle" dominant-baseline="central"
                font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#FF6D00">
            FIN
          </text>

          <defs>
            <linearGradient id="gradient-fin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#FF9800;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#E65100;stop-opacity:1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    `

    const markerFin = new mapboxgl.Marker({
      element: markerFinEl,
      anchor: 'bottom',
    })
      .setLngLat([fin.lng, fin.lat])
      .addTo(map)

    marcadoresRuta.value.push(markerFin)

    // 6. Hacer zoom a la ruta
    const bounds = new mapboxgl.LngLatBounds()
    lineCoordinates.forEach((coord) => bounds.extend(coord))

    map.fitBounds(bounds, {
      padding: 80,
      duration: 1000,
      maxZoom: 15,
    })

    // 7. Notificar al usuario
    $q.notify({
      type: 'positive',
      message: vehiculo?.nombre ? `Ruta mostrada: ${vehiculo.nombre}` : 'Ruta mostrada',
      caption: `${trayecto.horaInicio || ''} - ${trayecto.horaFin || ''}`,
      position: 'top',
      timeout: 2000,
      icon: 'route',
    })

    console.log('✅ Ruta dibujada correctamente')
  } catch (error) {
    console.error('❌ Error dibujando ruta:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al mostrar la ruta',
      position: 'top',
      timeout: 2000,
    })
  }
}
// 🆕 MÉTODO PARA LIMPIAR RUTA
const marcadoresRuta = ref([]) // 🆕 Para guardar referencias de marcadores A y B

const limpiarRuta = () => {
  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const map = mapPage._mapaAPI.map

  // 🔥 PRIMERO remover LAYERS
  const capas = [
    'ruta-trayecto-borde',
    'ruta-trayecto',
    'ruta-flechas',
    'ruta-puntos',
    'ruta-circulo-inicio',
    'ruta-circulo-fin',
    'ruta-inicio',
    'ruta-fin',
  ]

  capas.forEach((capa) => {
    try {
      if (map.getLayer(capa)) {
        map.removeLayer(capa)
      }
    } catch (e) {
      console.warn(`Error removiendo layer ${capa}:`, e)
    }
  })

  // 🔥 DESPUÉS remover SOURCES
  const sources = [
    'ruta-trayecto',
    'ruta-flechas',
    'ruta-puntos',
    'ruta-circulo-inicio',
    'ruta-circulo-fin',
    'ruta-inicio',
    'ruta-fin',
  ]

  sources.forEach((source) => {
    try {
      if (map.getSource(source)) {
        map.removeSource(source)
      }
    } catch (e) {
      console.warn(`Error removiendo source ${source}:`, e)
    }
  })

  // 🔥 Limpiar marcadores HTML (A y B)
  marcadoresRuta.value.forEach((marker) => {
    try {
      marker.remove()
    } catch (e) {
      console.warn('Error removiendo marcador:', e)
    }
  })
  marcadoresRuta.value = []

  // También limpiar por clase (por si quedó alguno)
  const marcadoresHTML = document.querySelectorAll('.marcador-ruta-custom')
  marcadoresHTML.forEach((m) => m.remove())

  console.log('✅ Ruta limpiada correctamente')
}

// 🆕 EXPONER MÉTODOS GLOBALMENTE (para que EstadoFlota pueda llamarlos)
window.dibujarRutaTrayecto = dibujarRutaTrayecto
window.limpiarRuta = limpiarRuta

// 🆕 Función para mostrar popup de geozona con dirección geocodificada
// 🆕 Función para mostrar popup de geozona con dirección geocodificada
const mostrarPopupGeozonaConDireccion = async (geozona, lngLat) => {
  // Calcular centroide con dirección
  const centroInfo = await obtenerCentroGeozona(geozona)

  if (!centroInfo) {
    console.error('❌ No se pudo calcular centroide')
    return
  }

  // Obtener direcciones de los puntos individuales (solo para polígonos)
  let direccionesPuntos = []
  if (geozona.tipoGeozona === 'poligono' && geozona.puntos?.length > 0) {
    // Geocodificar cada punto
    direccionesPuntos = await Promise.all(
      geozona.puntos.map(async (punto, index) => {
        let direccion = punto.direccion
        if (!direccion) {
          try {
            direccion = await obtenerDireccion({ lat: punto.lat, lng: punto.lng })
          } catch {
            direccion = 'Dirección no disponible'
          }
        }
        return {
          index: index,
          direccion: direccion,
          lat: punto.lat,
          lng: punto.lng,
        }
      }),
    )
  }

  const popupContent = `
    <div class="geozona-popup-container">
      <div class="geozona-popup-header">
        <div class="header-info">
          <div class="header-title">${geozona.nombre}</div>
          <div class="header-divider"></div>
          <!-- 🔥 CAMBIO: Mostrar dirección en lugar de "X puntos definidos" -->
          <div class="header-subtitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6b7280" stroke-width="2" fill="none"/>
              <circle cx="12" cy="9" r="2.5" fill="#6b7280"/>
            </svg>
            ${centroInfo.direccion}
          </div>
        </div>
        <button id="toggle-btn-geo-${geozona.id}" class="toggle-geozona-btn" onclick="toggleGeozonaPopup('${geozona.id}')">
          <svg class="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div id="geozona-popup-body-${geozona.id}" class="geozona-popup-body">
        ${
          direccionesPuntos.length > 0
            ? `
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
                  <div><span class="coord-label">Lat:</span> <span class="coord-value">${punto.lat.toFixed(6)}</span></div>
                  <div><span class="coord-label">Lng:</span> <span class="coord-value">${punto.lng.toFixed(6)}</span></div>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : `
          <div class="centro-info">
            <div class="info-label">Centro de la geozona</div>
            <div class="info-value">${centroInfo.lat.toFixed(6)}, ${centroInfo.lng.toFixed(6)}</div>
          </div>
        `
        }
        <button onclick="window.verDetallesGeozona('${geozona.id}')" class="details-btn">
          Ver más detalles
        </button>
      </div>
    </div>
  `

  if (popupGlobalActivo) {
    popupGlobalActivo.remove()
  }

  popupGlobalActivo = new mapboxgl.Popup({
    offset: 25,
    className: 'popup-animated',
    closeButton: true,
    closeOnClick: true,
  })
    .setLngLat(lngLat)
    .setHTML(popupContent)
    .addTo(mapaAPI.map)
}

onMounted(async () => {
  await cargarUsuarioActual()

  try {
    const defaultCoords = [32.504421823945805, -116.9514484543167]
    const defaultZoom = 13

    await initMap('map', defaultCoords, defaultZoom)

    const mapPage = document.getElementById('map-page')
    if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) {
      console.error('❌ Error: Mapa no inicializado correctamente')
      return
    }
    await new Promise((resolve) => {
      if (mapPage._mapaAPI.map.loaded()) {
        resolve()
      } else {
        mapPage._mapaAPI.map.once('load', resolve)
      }
    })

    mapaListo.value = true
    if (!window._mapListenersRegistered) {
      window._mapListenersRegistered = true

      let moveStartHandler = () => {
        const layersToHide = [
          'pois-symbols',
          'pois-circles',
          'geozonas-symbols',
          'geozonas-circulares-combined',
          'geozonas-poligonales-combined-fill',
          'geozonas-poligonales-combined-outline',
        ]

        layersToHide.forEach((layerId) => {
          if (mapaAPI.map.getLayer(layerId)) {
            mapaAPI.map.setLayoutProperty(layerId, 'visibility', 'none')
          }
        })
      }

      let moveEndHandler = () => {
        setTimeout(() => {
          const layersToShow = [
            'pois-symbols',
            'pois-circles',
            'geozonas-symbols',
            'geozonas-circulares-combined',
            'geozonas-poligonales-combined-fill',
            'geozonas-poligonales-combined-outline',
          ]

          layersToShow.forEach((layerId) => {
            if (mapaAPI.map.getLayer(layerId)) {
              mapaAPI.map.setLayoutProperty(layerId, 'visibility', 'visible')
            }
          })
        }, 100)
      }
      window._mapMoveStartHandler = moveStartHandler
      window._mapMoveEndHandler = moveEndHandler
    }
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

    window.toggleGeozonaPopup = (geozonaId) => {
      const body = document.getElementById(`geozona-popup-body-${geozonaId}`)
      const button = document.getElementById(`toggle-btn-geo-${geozonaId}`)

      if (button && body) {
        button.classList.toggle('expanded')

        if (button.classList.contains('expanded')) {
          body.style.maxHeight = body.scrollHeight + 'px'
        } else {
          body.style.maxHeight = '0'
        }
      }
    }
    await dibujarTodosEnMapa()

    let timeoutViewport = null

    mapPage._mapaAPI.map.on('zoomend', () => {
      clearTimeout(timeoutViewport)
      timeoutViewport = setTimeout(() => {}, 300)
    })

    await inicializarSistemaDeteccion()
    iniciarEvaluacionContinuaEventos()

    iniciarSeguimientoGPS()

    iniciarTracking()

    setTimeout(async () => {
      await iniciarSimuladorAutomatico()
    }, 1000)

    mapPage.addEventListener('click', (event) => {
      if (!event || !event.target) {
        console.warn('⚠️ Evento sin target válido')
        return
      }

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
      const detailsBtn = event.target.closest('[data-action="ver-detalles-conductor"]')
      if (detailsBtn) {
        const conductorId = detailsBtn.dataset.conductorId
        const conductorNombre = detailsBtn.dataset.conductorNombre

        if (conductorId) {
          obtenerConductores().then(() => {
            const conductorEncontrado = conductores.value.find((c) => c.id === conductorId)

            if (conductorEncontrado) {
              obtenerGruposConductores().then(() => {
                const grupoDelConductor = gruposConductores.value.find((g) =>
                  g.ConductoresIds?.includes(conductorId),
                )

                if (grupoDelConductor) {
                  const cerrarDialogs = new CustomEvent('cerrarTodosDialogs')
                  window.dispatchEvent(cerrarDialogs)

                  setTimeout(() => {
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
    mapPage._mapaAPI.map.on('click', (e) => {
      const clickEnMarcador = e.originalEvent.target.closest('.mapboxgl-marker')

      if (clickEnMarcador) {
        return
      }

      const features = mapPage._mapaAPI.map.queryRenderedFeatures(e.point)
      const clickEnCapa = features.some(
        (feature) =>
          feature.layer.id.startsWith('poi-circle-') ||
          feature.layer.id.startsWith('geozona-circle-') ||
          feature.layer.id.startsWith('geozona-polygon-') ||
          feature.layer.id === 'geozonas-symbols' ||
          feature.layer.id === 'pois-symbols',
      )

      if (!clickEnCapa) {
        if (popupGlobalActivo) {
          popupGlobalActivo.remove()
          popupGlobalActivo = null
        }

        const allPopups = document.querySelectorAll('.mapboxgl-popup')
        allPopups.forEach((popupEl) => {
          const closeBtn = popupEl.querySelector('.mapboxgl-popup-close-button')
          if (closeBtn) {
            closeBtn.click()
          }
        })
      }
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords

          if (mapPage._mapaAPI && mapPage._mapaAPI.map) {
            mapPage._mapaAPI.map.flyTo({
              center: [longitude, latitude],
              zoom: 14,
              duration: 2000,
              essential: true,
            })

            $q.notify({
              type: 'positive',
              message: 'Mapa centrado en tu ubicación',
              position: 'top',
              timeout: 2000,
              icon: 'my_location',
            })
          }
        },
        () => {
          console.warn('⚠️ No se pudo obtener la ubicación GPS inicial')
        },
        {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 60000,
        },
      )
    }
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al inicializar el mapa',
      icon: 'error',
      position: 'top',
    })
  }

  // ✅ LISTENERS GLOBALES (fuera del try-catch)
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const mapPage = document.getElementById('map-page')
      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
        mapPage._mapaAPI.resize(true)
      }
    }, 500)
  }

  window.addEventListener('resize', handleResize)
  window._resizeHandler = handleResize

  window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)

  window.addEventListener('restaurarCapasEstilo', restaurarCapasDespuesEstilo)

  window.addEventListener('redibujarMapa', async () => {
    await nextTick()

    // Limpiar todo (incluyendo cache)
    limpiarCapasDelMapa()

    await nextTick()

    // Redibujar todo desde cero
    await dibujarTodosEnMapa()

    resetear()
    await inicializarSistemaDeteccion()
    detenerEvaluacionEventos()
    iniciarEvaluacionContinuaEventos()

    // Actualizar marcadores de unidades
    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }
  })
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
  // 🔥 Limpiar listeners globales
  const mapPage = document.getElementById('map-page')

  if (window._mapMoveStartHandler && mapPage?._mapaAPI?.map) {
    mapPage._mapaAPI.map.off('movestart', window._mapMoveStartHandler)
  }
  if (window._mapMoveEndHandler && mapPage?._mapaAPI?.map) {
    mapPage._mapaAPI.map.off('moveend', window._mapMoveEndHandler)
  }

  // Limpiar flags
  delete window._mapListenersRegistered
  delete window._mapMoveStartHandler
  delete window._mapMoveEndHandler

  detenerSeguimientoGPS()

  detenerEvaluacionEventos()
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
})

const manejarToggleTrafico = () => {
  const nuevoEstado = toggleTrafico()
  traficoActivo.value = nuevoEstado
}

// ✅ NUEVA FUNCIÓN PARA CAMBIAR ESTILO DESDE MENÚ
const cambiarEstiloDesdeMenu = async (nuevoEstilo) => {
  if (estiloMapa.value === nuevoEstilo) {
    return // Ya está en ese estilo
  }

  const resultado = cambiarEstiloMapa()
  if (resultado !== null) {
    estiloMapa.value = nuevoEstilo

    $q.notify({
      type: 'info',
      message:
        nuevoEstilo === 'streets' ? '🗺️ Vista de calles activada' : '🛰️ Vista satelital activada',
      position: 'top',
      timeout: 1500,
      icon: nuevoEstilo === 'streets' ? 'map' : 'satellite',
    })

    // 🆕 ESPERAR A QUE EL MAPA CARGUE EL NUEVO ESTILO
    const mapPage = document.getElementById('map-page')
    if (mapPage?._mapaAPI?.map) {
      mapPage._mapaAPI.map.once('styledata', async () => {
        console.log('✅ Estilo cargado, redibujando capas...')

        // 🎯 Esperar un momento para que el estilo termine de cargar completamente
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 🎯 Redibujar TODO (POIs, Geozonas, Unidades)
        await dibujarTodosEnMapa()

        // 🎯 Actualizar marcadores de unidades si existen
        if (unidadesActivas.value && unidadesActivas.value.length > 0) {
          actualizarMarcadoresUnidades(unidadesActivas.value)
        }

        console.log('✅ Capas redibujadas después de cambio de estilo')
      })
    }
  }
}
</script>

<style>
.mapboxgl-popup-content {
  padding: 0 !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
  background-color: #ffffff !important;
}

.mapboxgl-popup-tip {
  border-top-color: #ffffff !important;
}

.mapboxgl-popup-close-button {
  position: absolute !important;
  top: 14px !important;
  left: 14px !important;
  background-color: #f3f4f6 !important;
  border: 1px solid #6b7280 !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  font-size: 18px !important;
  font-weight: bold !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10 !important;
  flex-shrink: 0 !important;
  margin: 0 !important;
}

.mapboxgl-popup-close-button:hover {
  background-color: #e5e7eb !important;
  border-color: #9ca3af !important;
  transform: scale(1.05) !important;
}
.geozona-popup-container {
  min-width: 260px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
  padding-bottom: 12px;
}

.geozona-popup-header {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-divider {
  width: 100%;
  height: 1px;
  margin-bottom: 10px;
  background-color: #6b7280;
  margin: 15px 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-left: 15%;
}

.header-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.toggle-geozona-btn {
  background-color: #f3f4f6 !important;
  border: 1px solid #6b7280;

  border-radius: 50%;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease !important;
  align-self: flex-end;
  margin-top: -32px;
}

.toggle-geozona-btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  transform: scale(1.05) !important;
}

.chevron-icon {
  transition: transform 0.3s ease-in-out;
}

.toggle-geozona-btn.expanded .chevron-icon {
  transform: rotate(180deg);
}

.geozona-popup-body {
  max-height: 0;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding 0.4s ease-in-out;
  padding: 0 16px;
}

.toggle-geozona-btn.expanded ~ .geozona-popup-body {
  padding: 16px;
}

.points-list-container {
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 16px;
}

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
  padding: 12px;
  background: linear-gradient(135deg, #91c6bc 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
  margin-top: 8px;
}
.details-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
  background: linear-gradient(135deg, #91c6bc 0%, #047857 100%);
}

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

.poi-popup-body {
  padding: 16px;
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

.mapboxgl-popup-content {
  padding: 0 !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
  background-color: #ffffff !important;
}

.popup-section {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
}
.popup-section:last-of-type {
  border-bottom: none;
  margin-bottom: 12px;
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
  text-align: right;
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
  min-width: 320px !important;
  max-width: 380px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}

.unidad-popup-container .mapboxgl-popup-close-button {
  position: absolute !important;
  top: 16px !important;
  left: 16px !important;
  background-color: #f3f4f6 !important;
  border: 1px solid #6b7280 !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  font-size: 18px !important;
  font-weight: bold !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10 !important;
  flex-shrink: 0 !important;
  margin: 0 !important;
}

.unidad-popup-container .mapboxgl-popup-close-button:hover {
  background-color: #e5e7eb !important;
  border-color: #9ca3af !important;
  transform: scale(1.05) !important;
}
.unidad-direccion {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unidad-popup-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.unidad-header-top-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  position: relative;
}
.unidad-close-placeholder {
  width: 28px;
  min-width: 28px;
  height: 28px;
  flex-shrink: 0;
}
.unidad-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}
.unidad-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
/* ✅ Ícono del vehículo */
.unidad-icon {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 2px solid white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  flex-shrink: 0 !important;
}
.unidad-icon svg {
  width: 20px !important;
  height: 20px !important;
}
.unidad-texto {
  flex: 1;
  min-width: 0;
}
.unidad-texto strong {
  font-size: 15px;
  color: #1f2937;
  font-weight: 700;
  display: block;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.unidad-texto div {
  font-size: 12px;
  color: #6b7280;
}

.toggle-popup-btn {
  background: #f3f4f6 !important;
  border: 1px solid #6b7280 !important;
  cursor: pointer;
  padding: 0 !important;
  border-radius: 50% !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0 !important;
  margin-top: 2px;
}

.toggle-popup-btn:hover {
  background-color: #e5e7eb !important;
  border-color: #9ca3af !important;
  transform: scale(1.05) !important;
}
.toggle-popup-btn .chevron-icon {
  transition: transform 0.3s ease-in-out;
  pointer-events: none;
}
.unidad-popup-container.expanded .toggle-popup-btn .chevron-icon {
  transform: rotate(180deg);
}
.unidad-placa {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  max-height: 500px;
  padding: 16px;
}
.unidad-popup-container .mapboxgl-popup-content {
  display: flex !important;
  flex-direction: column !important;
}

.unidad-popup-container.expanded .chevron-icon {
  transform: rotate(180deg);
}

.ubicacion-popup-container {
  min-width: 260px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background-color: #ffffff;
}

.ubicacion-popup-header {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-bottom: 1px solid #90caf9;
}

.ubicacion-popup-body {
  padding: 16px;
}

.coords-info {
  background-color: #f5f9ff;
  border: 1px solid #e3f2fd;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 4px;
}

.coord-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.coord-row:first-child {
  padding-top: 0;
  border-bottom: 1px solid #e3f2fd;
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.coord-row:last-child {
  padding-bottom: 0;
  padding-top: 8px;
}

.coord-label {
  color: #1976d2;
  font-weight: 600;
}

.coord-value {
  color: #0d47a1;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
  background-color: #e3f2fd;
  padding: 2px 8px;
  border-radius: 4px;
}
/* ... tus estilos existentes de IndexPage ... */

/* ============================================ */
/* === POPUP MEJORADO EVENTOS === */
/* ============================================ */
.evento-popup-mejorado .mapboxgl-popup-content {
  padding: 0 !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2) !important;
  min-width: 300px !important;
}

.evento-popup-mejorado .mapboxgl-popup-tip {
  border-top-color: white !important;
}

.evento-popup-mejorado .mapboxgl-popup-close-button {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  width: 24px !important;
  height: 24px !important;
  background: rgba(0, 0, 0, 0.5) !important;
  border-radius: 50% !important;
  color: white !important;
  font-size: 16px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.evento-popup-mejorado .mapboxgl-popup-close-button:hover {
  background: rgba(0, 0, 0, 0.7) !important;
  transform: scale(1.1) !important;
}

.evento-popup-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
}

.evento-popup-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  color: white;
}

.evento-icon {
  width: 42px;
  height: 42px;
  min-width: 42px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.evento-info {
  flex: 1;
  min-width: 0;
}

.evento-titulo {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.3;
  letter-spacing: -0.2px;
}

.evento-tipo {
  font-size: 13px;
  opacity: 0.92;
  line-height: 1.3;
  font-weight: 500;
}

.evento-popup-body {
  padding: 18px 16px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evento-detalle {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detalle-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: #f3f4f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detalle-texto {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}

.detalle-label {
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  line-height: 1.2;
}

.detalle-valor {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Animación del marcador de evento */
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0) rotate(-45deg);
  }
  50% {
    transform: translateY(-10px) rotate(-45deg);
  }
}

.marcador-evento-custom {
  cursor: pointer;
  z-index: 1000;
}

/* Estilos para el header subtitle con icono */
.header-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
  display: flex;
  align-items: center;
  line-height: 1.4;
}

.header-subtitle svg {
  flex-shrink: 0;
}

/* Info del centro (para geozonas circulares) */
.centro-info {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 6px;
}

.info-value {
  font-size: 13px;
  color: #1f2937;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}
</style>

<style scoped>
.recenter-btn:active {
  transform: scale(0.95) !important;
}
.recenter-btn:hover :deep(.q-icon) {
  animation: pulse-icon 0.6s ease-in-out;
}

@keyframes pulse-icon {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
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

:deep(.mapboxgl-map) {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

:deep(.mapboxgl-canvas) {
  will-change: transform;
  transform: translateZ(0);
}

:deep(.custom-marker-unidad) {
  will-change: transform;
  transform: translateZ(0);
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

/* ✅ NUEVO: Botón principal de capas */
.layers-menu-btn {
  position: fixed !important;
  top: 80px;
  right: 20px; /* 🔥 DERECHA */
  z-index: 1000;

  /* Glassmorphism */
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;

  box-shadow:
    0 8px 32px rgba(187, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2) !important;

  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 50% !important;

  width: 52px !important;
  height: 52px !important;

  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
.recenter-btn {
  position: fixed !important;
  top: 150px; /* 🔥 80px + 52px (tamaño) + 18px (espacio) = 150px */
  right: 20px; /* 🔥 DERECHA */
  z-index: 1000;

  /* Glassmorphism */
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;

  box-shadow:
    0 8px 32px rgba(187, 0, 0, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.2) !important;

  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 50% !important;

  width: 52px !important;
  height: 52px !important;

  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.recenter-btn:hover {
  transform: scale(1.1) translateY(-2px) !important;
  box-shadow:
    0 12px 40px rgba(187, 0, 0, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.recenter-btn:active {
  transform: scale(0.95) !important;
}

/* Animación del ícono */
.recenter-btn:hover :deep(.q-icon) {
  animation: pulse-icon 0.6s ease-in-out;
}
.layers-menu-btn:hover {
  transform: scale(1.1) translateY(-2px) !important;
  box-shadow:
    0 12px 40px rgba(187, 0, 0, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

/* Estilos del menú desplegable */
:deep(.layers-menu) {
  border-radius: 16px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
  overflow: hidden !important;
}

/* Aplicar degradado a TODOS los elementos posibles del menú */
:deep(.layers-menu .q-menu) {
  background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%) !important;
  border-radius: 16px !important;
}

:deep(.layers-menu .q-list) {
  padding: 0 !important;
  background: #ffffff !important;
}
.section-header {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 16px 20px 12px 20px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  color: #374151 !important;
  background: #f9fafb !important;
  margin: 0 !important;
}
.header-icon {
  color: #6b7280 !important;
}
.section-separator {
  margin: 0 !important;
  background-color: #e5e7eb !important;
  height: 1px !important;
}
:deep(.layers-menu .q-menu__content) {
  background: linear-gradient(135deg, #ffffff 0%, #cceeff 100%) !important;
  border-radius: 16px !important;
}

:deep(.layers-menu .q-card) {
  background: transparent !important;
}

:deep(.layers-menu .q-item) {
  background: transparent !important;
}

/* ✅ SOLO EL HEADER "ESTILO DE MAPA" - Fondo blanco */
.map-styles-section {
  background: #f9fafb;
  padding-bottom: 16px;
}
/* Container de tarjetas SIN fondo blanco (muestra degradado) */
.map-styles-container {
  background: transparent;
}

/* ✅ TODA LA SECCIÓN DE TRÁFICO - Fondo blanco */
.traffic-section {
  background: white;
  padding-bottom: 8px;
}
.traffic-section .q-item__label--header {
  padding: 12px 16px;
  margin: 0;
}

/* ✅ LÍNEA DIVISORIA */
.menu-separator {
  background-color: #949791cd !important;
  margin: 0 !important;
}

/* Container de las tarjetas de estilo */
.map-styles-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
}

/* Tarjeta individual de estilo */
.map-style-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-style-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(2px);
}
.map-style-card.active {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

/* Preview de la imagen */
.style-preview {
  flex-shrink: 0;
  width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.style-preview svg {
  width: 100%;
  height: 100%;
  display: block;
}
.style-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
/* Badge de activo (checkmark) */
.active-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Label del estilo */
.style-label {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}
.style-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
}
.active-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.map-style-card.active .style-label {
  color: #059669;
}
/* Item del toggle de tráfico */
.traffic-toggle-item {
  padding: 12px 20px !important;
  min-height: 64px !important;
}
.traffic-label {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1f2937 !important;
}
.traffic-toggle-item:hover {
  background-color: #f9fafb !important;
}
.traffic-caption {
  font-size: 12px !important;
  color: #6b7280 !important;
  margin-top: 2px !important;
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

:deep(.icono-unidad-hover:hover) {
  transform: scale(1.15);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4)) !important;
}

:deep(.custom-marker-unidad:hover) {
  z-index: 1000 !important;
}

:deep(.mapboxgl-canvas-container) {
  will-change: transform;
  transform: translateZ(0);
}

:deep(.mapboxgl-canvas) {
  will-change: transform;
  transform: translateZ(0);
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

/* 🎯 Optimización: Suavizar transiciones de opacidad */
:deep(.custom-marker-unidad),
:deep(.marker-container-poi),
:deep(.marker-container-geozona) {
  transition: opacity 0.2s ease-out;
  will-change: opacity;
}

/* 🎯 Cursor durante panning */
:deep(.mapboxgl-canvas-container.mapboxgl-touch-drag-pan) {
  cursor: grabbing !important;
}

/* 🎯 Optimizar rendering del canvas durante movimiento */
:deep(.mapboxgl-canvas) {
  will-change: transform;
}

/* 🎯 Reducir peso visual de hover effects */
:deep(.icono-poi-hover:hover),
:deep(.icono-geozona-hover:hover),
:deep(.icono-unidad-hover:hover) {
  transform: scale(1.08) translateZ(0) !important;
  transition: transform 0.15s ease !important;
}

/* Marcadores de ruta personalizados */
.marcador-ruta-custom {
  cursor: pointer;
  z-index: 1000;
}

.marcador-ruta-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 255, 255, 0.5);
  animation: pulse-marcador 2s ease-in-out infinite;
}

.marcador-ruta-letra {
  color: white;
  font-size: 20px;
  font-weight: 900;
  font-family: 'Arial Black', sans-serif;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.5),
    0 0 10px rgba(255, 255, 255, 0.3);
}

/* Animación de pulso */
@keyframes pulse-marcador {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(255, 255, 255, 0.5);
  }
  50% {
    transform: scale(1.1);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(255, 255, 255, 0.7);
  }
}

.marcador-inicio .marcador-ruta-circle {
  background-color: #00ff41 !important; /* Verde neón */
}

.marcador-fin .marcador-ruta-circle {
  background-color: #ff0080 !important; /* Rosa neón */
}

/* Marcadores de ruta personalizados */
.marcador-ruta-custom {
  cursor: pointer;
  z-index: 1000;
}

.marcador-pin-container {
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: bounce-pin 2s ease-in-out infinite;
}

.marcador-pin-container svg {
  width: 40px;
  height: 52px;
}

/* Animación de rebote suave */
@keyframes bounce-pin {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.marcador-inicio .marcador-pin-container:hover,
.marcador-fin .marcador-pin-container:hover {
  animation: bounce-pin 0.5s ease-in-out infinite;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
}
</style>
