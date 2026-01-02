/*Este es mi IndexPage.vue*/
<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>

    <!-- 🗺️ BOTÓN DE CAPAS CON MENÚ DESPLEGABLE -->
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
        <q-list
          style="
            min-width: 280px;
            background: linear-gradient(135deg, #ffffff 0%, #ddf4e7 100%) !important;
          "
        >
          <!-- SECCIÓN: ESTILO DE MAPA -->
          <div class="map-styles-section">
            <q-item-label header class="text-weight-bold text-black"> ESTILO DE MAPA </q-item-label>
            <q-separator class="menu-separator" />

            <div class="map-styles-container">
              <!-- OPCIÓN: VISTA SATELITAL -->
              <div
                class="map-style-card"
                :class="{ active: estiloMapa === 'satellite' }"
                @click="cambiarEstiloDesdeMenu('satellite')"
              >
                <div class="style-preview">
                  <!-- SVG Inline Vista Satelital -->
                  <svg
                    width="150"
                    height="100"
                    viewBox="0 0 150 100"
                    xmlns="http://www.w3.org/2000/svg"
                    border-radius="20px"
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
                    <rect width="150" height="100" fill="url(#earthGradient)" rx="12" ry="12" />
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
                  <div v-if="estiloMapa === 'satellite'" class="active-badge">
                    <q-icon name="check_circle" size="20px" color="positive" />
                  </div>
                </div>
                <div class="style-label">Satélite</div>
              </div>

              <!-- OPCIÓN: VISTA CALLES -->
              <div
                class="map-style-card"
                :class="{ active: estiloMapa === 'streets' }"
                @click="cambiarEstiloDesdeMenu('streets')"
              >
                <div class="style-preview">
                  <!-- SVG Inline Vista Calles -->
                  <svg
                    width="150"
                    height="100"
                    viewBox="0 0 150 100"
                    xmlns="http://www.w3.org/2000/svg"
                    border-radius="20px"
                  >
                    <defs>
                      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color: #f5f5f0; stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: #e8e8e0; stop-opacity: 1" />
                      </linearGradient>
                    </defs>
                    <rect width="150" height="100" fill="url(#bgGradient)" rx="12" ry="12" />
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
                  <div v-if="estiloMapa === 'streets'" class="active-badge">
                    <q-icon name="check_circle" size="20px" color="positive" />
                  </div>
                </div>
                <div class="style-label">Calles</div>
              </div>
            </div>
          </div>

          <!-- LÍNEA DIVISORIA -->
          <q-separator class="menu-separator" />

          <!-- SECCIÓN: CAPAS ADICIONALES -->
          <div class="traffic-section">
            <q-item-label header class="text-weight-bold text-black">
              CAPAS ADICIONALES
            </q-item-label>
            <q-separator class="menu-separator" />

            <q-item clickable @click="manejarToggleTrafico" class="traffic-toggle-item">
              <q-item-section avatar>
                <q-checkbox
                  :model-value="traficoActivo"
                  color="positive"
                  @update:model-value="manejarToggleTrafico"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>Mostrar Tráfico</q-item-label>
                <q-item-label caption> Visualiza el tráfico en tiempo real </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="traffic" :color="traficoActivo ? 'positive' : 'grey-5'" />
              </q-item-section>
            </q-item>
          </div>
        </q-list>
      </q-menu>
    </q-btn>
    <q-btn
      fab
      style="background: linear-gradient(135deg, #bb0000 30%, #bb5e00 70%) !important"
      icon="my_location"
      text-color="white"
      class="recenter-btn"
      padding="sm"
      border-color="#000000"
      @click="recentrarEnUsuario"
    >
      <q-tooltip>Centrar en mi ubicación</q-tooltip>
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

const {
  initMap,
  // addMarker,
  cleanup,
  toggleTrafico,
  cambiarEstiloMapa, // ✅ NUEVA FUNCIÓN
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
    // 🔥 CARGAR USUARIO PRIMERO
    if (!idEmpresaActual.value) {
      console.log('⏳ Cargando empresa...')
      await cargarUsuarioActual()
    }
    console.log('🏢 Empresa:', idEmpresaActual.value)

    // Ahora sí cargar conductores
    await obtenerConductores()
    await obtenerUnidades()

    // ... resto del código ...
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
      message: `🎯 Simulador GPS iniciado: ${conductoresConUnidad.length} unidades`,
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

    // ✅ NUEVO: Popup mejorado con el estilo de tus POIs
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
          console.warn('⏱️ GPS timeout - reintentando...')
          break
        case error.PERMISSION_DENIED:
          console.error('❌ Permiso de GPS denegado')
          ubicacionActiva.value = false
          break
        case error.POSITION_UNAVAILABLE:
          console.warn('⚠️ Posición GPS no disponible')
          break
        default:
          console.error('❌ Error de geolocalización:', error.message)
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

function crearIconoPOI(tieneEventos = false, color = '#FF5252') {
  const iconoHTML = `
    <div class="marker-container-poi" style="position: relative; display: inline-block; transition: transform 0.2s ease;">
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); cursor: pointer;" class="icono-poi-hover">
        <!-- Borde blanco exterior -->
        <path
          fill="white"
          stroke="white"
          stroke-width="4"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        />
        <!-- Pin con color -->
        <path
          fill="${color}"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        />
      </svg>

      ${
        tieneEventos
          ? `
        <div style="
          position: absolute;
          top: -3px;
          right: -1px;
          width: 16px;
          height: 16px;
          background: #FF9800;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        "></div>
      `
          : ''
      }
    </div>
  `

  const markerEl = document.createElement('div')
  markerEl.innerHTML = iconoHTML
  markerEl.style.cursor = 'pointer'

  // ✅ Agregar efecto hover al contenedor completo
  const container = markerEl.querySelector('.marker-container-poi')

  markerEl.addEventListener('mouseenter', () => {
    if (container) {
      container.style.transform = 'scale(1.15)'
      container.style.filter = 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))'
    }
  })

  markerEl.addEventListener('mouseleave', () => {
    if (container) {
      container.style.transform = 'scale(1)'
      container.style.filter = ''
    }
  })

  return markerEl
}

function crearIconoGeozona(tipo = 'circular', tieneEventos = false, color = null) {
  const colorFinal = color || '#FFFFFF'

  let iconoSVG = ''

  if (tipo === 'circular') {
    iconoSVG = `
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); cursor: pointer;" class="icono-geozona-hover">
        <circle cx="12" cy="12" r="10" fill="${colorFinal}" stroke="white" stroke-width="2"/>
      </svg>
    `
  } else {
    iconoSVG = `
      <svg width="32" height="32" viewBox="0 0 24 24" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); cursor: pointer;" class="icono-geozona-hover">
        <polygon points="12,2 22,12 12,22 2,12" fill="${colorFinal}" stroke="white" stroke-width="2"/>
      </svg>
    `
  }

  const iconoHTML = `
    <div class="marker-container-geozona" style="position: relative; display: inline-block; transition: transform 0.2s ease, filter 0.2s ease;">
      ${iconoSVG}

      ${
        tieneEventos
          ? `
        <div style="
          position: absolute;
          top: -3px;
          right: -1px;
          width: 15px;
          height: 15px;
          background: #FF9800;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        "></div>
      `
          : ''
      }
    </div>
  `

  const markerEl = document.createElement('div')
  markerEl.innerHTML = iconoHTML
  markerEl.style.cursor = 'pointer'

  // ✅ Agregar efecto hover al contenedor completo
  const container = markerEl.querySelector('.marker-container-geozona')

  markerEl.addEventListener('mouseenter', () => {
    if (container) {
      container.style.transform = 'scale(1.15)'
      container.style.filter = 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))'
    }
  })

  markerEl.addEventListener('mouseleave', () => {
    if (container) {
      container.style.transform = 'scale(1)'
      container.style.filter = ''
    }
  })

  return markerEl
}

const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  mapaAPI = mapPage._mapaAPI

  // limpiarCapasDelMapa()

  try {
    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter((e) => e.activo)

    const pois = await obtenerPOIs()
    poisCargados.value = pois

    // ✅ DIBUJAR SOLO POIs NUEVOS
    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const poiKey = `poi-${poi.id}`

        // ✅ Si ya está dibujado, saltar
        if (poisDibujados.value.has(poiKey)) {
          return
        }

        const { lat, lng } = poi.coordenadas
        const radio = poi.radio || 100
        const color = poi.color || '#FF5252'

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
              'circle-color': color,
              'circle-opacity': 0.15,
              'circle-stroke-width': 2,
              'circle-stroke-color': color,
            },
          })
        }

        const popupContent = `
          <div class="poi-popup-container">
            <div class="poi-popup-header">
              <div class="header-info">
                <div class="header-title">${poi.nombre}</div>
                <div class="header-divider"></div>
                <div class="header-subtitle">Radio: ${radio}m</div>
              </div>
            </div>

            <div class="poi-popup-body">
              <div class="address-info">
                <div class="address-icon"></div>
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

        const markerEl = crearIconoPOI(tieneEventos, color, poi.nombre)

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

        // ✅ MARCAR COMO DIBUJADO
        poisDibujados.value.add(poiKey)
      }
    })

    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas

    // ✅ DIBUJAR SOLO GEOZONAS NUEVAS
    for (const geozona of geozonas) {
      const geozonaKey = `geozona-${geozona.id}`

      // ✅ Si ya está dibujada, saltar
      if (geozonasDibujadas.value.has(geozonaKey)) {
        continue
      }

      const cantidadEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
      const tieneEventos = cantidadEventos > 0

      let direccionesPuntos = []

      if (geozona.tipoGeozona === 'poligono' && geozona.puntos && geozona.puntos.length > 0) {
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
          // ✅ Verificar si ya tiene listener antes de agregar
          if (!mapaAPI.map._listeners || !mapaAPI.map._listeners[`click:${circleId}`]) {
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
        }

        const markerEl = crearIconoGeozona('circular', tieneEventos, fillColor)

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

        // ✅ MARCAR COMO DIBUJADA
        geozonasDibujadas.value.add(geozonaKey)
      } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
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

        const lats = geozona.puntos.map((p) => p.lat)
        const lngs = geozona.puntos.map((p) => p.lng)
        const centroLat = lats.reduce((a, b) => a + b) / lats.length
        const centroLng = lngs.reduce((a, b) => a + b) / lngs.length

        const markerEl = crearIconoGeozona('poligonal', tieneEventos, fillColor)

        const popup = new mapboxgl.Popup({
          offset: 25,
          className: 'popup-animated',
          closeButton: true,
          closeOnClick: false,
        }).setHTML(popupContent)

        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([centroLng, centroLat])
          .setPopup(popup)
          .addTo(mapaAPI.map)

        popup.on('open', () => {
          if (popupGlobalActivo && popupGlobalActivo !== popup) {
            popupGlobalActivo.remove()
          }
          popupGlobalActivo = popup
        })

        marcadoresPOIs.value.push(marker)

        // ✅ MARCAR COMO DIBUJADA
        geozonasDibujadas.value.add(geozonaKey)

        if (!tieneEventos) {
          const togglePopupGeozona = (e) => {
            if (e && e.originalEvent) {
              e.originalEvent.stopPropagation()
            }

            if (popup.isOpen()) {
              popup.remove()
            } else {
              if (popupGlobalActivo && popupGlobalActivo !== popup) {
                popupGlobalActivo.remove()
              }
              popup.setLngLat([centroLng, centroLat]).addTo(mapaAPI.map)
            }
          }

          markerEl.addEventListener('click', (e) => {
            e.stopPropagation()
            togglePopupGeozona(e)
          })

          mapaAPI.map.on('click', polygonId, togglePopupGeozona)

          mapaAPI.map.on('mouseenter', polygonId, () => {
            mapaAPI.map.getCanvas().style.cursor = 'pointer'
          })

          mapaAPI.map.on('mouseleave', polygonId, () => {
            mapaAPI.map.getCanvas().style.cursor = ''
          })
        }
      }
    }

    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }

    console.log(`✅ Dibujados ${marcadoresPOIs.value.length} marcadores totales`)
  } catch (error) {
    console.error('❌ Error al cargar y dibujar items:', error)
  }
}

// 🆕 FUNCIÓN PARA RESTAURAR SOLO LAS CAPAS (sin marcadores)
const restaurarCapasDespuesEstilo = async () => {
  if (!mapaAPI || !mapaAPI.map) return

  console.log('🔄 Restaurando capas después de cambio de estilo...')

  // Recorrer POIs dibujados y recrear solo las capas (círculos)
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

  // Recorrer geozonas dibujadas y recrear capas
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

  console.log('✅ Capas restauradas')
}

const limpiarCapasDelMapa = () => {
  if (!mapaAPI || !mapaAPI.map) return

  // ✅ PASO 1: Limpiar MARCADORES de POIs y Geozonas
  if (marcadoresPOIs.value && marcadoresPOIs.value.length > 0) {
    console.log(`🧹 Limpiando ${marcadoresPOIs.value.length} marcadores`)
    marcadoresPOIs.value.forEach((marker) => {
      try {
        marker.remove()
      } catch (e) {
        console.warn('⚠️ Error al remover marcador:', e)
      }
    })
    marcadoresPOIs.value = []
  }

  // ✅ PASO 2: Limpiar CAPAS del mapa (círculos y polígonos)
  const layers = mapaAPI.map.getStyle().layers

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

  // ✅ PASO 3: Limpiar SOURCES del mapa
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

  // ✅ LIMPIAR CACHE
  geozonasDibujadas.value.clear()
  poisDibujados.value.clear()

  console.log('✅ Capas, marcadores y cache limpiados')
}
/*const inicializarMapaConUbicacion = async () => {
  // ✅ Coordenadas por defecto (MJ Industrias como fallback)
  const defaultCoords = [32.504421823945805, -116.9514484543167]
  const defaultZoom = 13

  if (!navigator.geolocation) {
    // No hay GPS, usar ubicación por defecto
    console.warn('⚠️ Geolocalización no disponible, usando ubicación por defecto')
    await initMap('map', defaultCoords, defaultZoom) // ✅ Sin .then()
    return
  }

  // ✅ Intentar obtener ubicación del usuario (RÁPIDO - solo 5 segundos)
  return new Promise((resolve) => {
    const timeoutId = setTimeout(async () => {
      // Si tarda más de 5 segundos, usar ubicación por defecto
      console.warn('⏱️ GPS tardando, iniciando con ubicación por defecto')
      await initMap('map', defaultCoords, defaultZoom) // ✅ Sin .then()
      resolve()
    }, 5000)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeoutId)
        const { latitude, longitude } = position.coords

        // ✅ Inicializar mapa en la ubicación del usuario
        await initMap('map', [latitude, longitude], 14) // ✅ Sin .then()

        $q.notify({
          type: 'positive',
          message: '📍 Mapa centrado en tu ubicación',
          position: 'top',
          timeout: 2000,
          icon: 'my_location',
        })

        resolve()
      },
      async (error) => {
        clearTimeout(timeoutId)
        console.warn('⚠️ No se pudo obtener ubicación:', error.message)

        // Usar ubicación por defecto
        await initMap('map', defaultCoords, defaultZoom) // ✅ Sin .then()

        // Notificar al usuario
        $q.notify({
          type: 'info',
          message: '📍 Usando ubicación por defecto',
          caption: 'Permite el acceso a GPS para centrar en tu ubicación',
          position: 'top',
          timeout: 3000,
          icon: 'map',
        })

        resolve()
      },
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 60000,
      },
    )
  })
}*/

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
    duration: 1500, // Animación suave de 1.5 segundos
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

onMounted(async () => {
  await cargarUsuarioActual()
  try {
    // ✅ PASO 1: Inicializar mapa INMEDIATAMENTE (sin esperar GPS)
    const defaultCoords = [32.504421823945805, -116.9514484543167]
    const defaultZoom = 13

    await initMap('map', defaultCoords, defaultZoom)

    // ✅ PASO 2: Esperar a que el mapa esté completamente cargado
    const mapPage = document.getElementById('map-page')
    if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) {
      console.error('❌ Error: Mapa no inicializado correctamente')
      return
    }

    // ✅ PASO 3: Esperar al evento 'load' del mapa antes de continuar
    await new Promise((resolve) => {
      if (mapPage._mapaAPI.map.loaded()) {
        resolve()
      } else {
        mapPage._mapaAPI.map.once('load', resolve)
      }
    })

    // ✅ PASO 4: AHORA sí, marcar como listo y dibujar todo
    mapaListo.value = true

    // ✅ PASO 5: Configurar funciones globales
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

    // ✅ PASO 6: Dibujar POIs y Geozonas
    await dibujarTodosEnMapa()

    // ✅ PASO 7: Inicializar sistema de detección
    await inicializarSistemaDeteccion()
    iniciarEvaluacionContinuaEventos()

    // ✅ PASO 8: Iniciar seguimiento GPS (esto actualiza marcadorUsuario)
    iniciarSeguimientoGPS()

    // ✅ PASO 9: Iniciar simulador
    setTimeout(async () => {
      await iniciarSimuladorAutomatico()
    }, 1000)

    // ✅ PASO 10: Configurar listeners de clicks
    if (mapPage) {
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
    }

    // ✅ PASO 11: Configurar listener de clicks en el mapa para cerrar popups
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
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
            feature.layer.id.startsWith('geozona-polygon-'),
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
    }

    // ✅ PASO 12: Intentar obtener ubicación GPS en segundo plano (SOLO PARA CENTRAR INICIAL)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords

          // Volar suavemente a la ubicación del usuario
          if (mapPage._mapaAPI && mapPage._mapaAPI.map) {
            mapPage._mapaAPI.map.flyTo({
              center: [longitude, latitude],
              zoom: 14,
              duration: 2000,
              essential: true,
            })

            $q.notify({
              type: 'positive',
              message: '📍 Mapa centrado en tu ubicación',
              position: 'top',
              timeout: 2000,
              icon: 'my_location',
            })
          }
        },
        () => {
          // ✅ SILENCIOSO: No mostrar warning si falla el GPS inicial
          console.log('ℹ️ Ubicación GPS no disponible en carga inicial')
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

  // ✅ PASO 13: Configurar listener de resize
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const mapPage = document.getElementById('map-page')
      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
        mapPage._mapaAPI.resize(true)
      }
    }, 500) // ✅ Aumentado de 250ms a 500ms
  }

  window.addEventListener('resize', handleResize)
  window._resizeHandler = handleResize

  window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
  // 🆕 AGREGAR ESTE LISTENER
  window.addEventListener('restaurarCapasEstilo', restaurarCapasDespuesEstilo)

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
  window.addEventListener('redibujarMapa', async () => {
    console.log('🔄 Evento redibujarMapa recibido')

    await nextTick()

    // ✅ LIMPIAR TODO (incluyendo cache) Y REDIBUJAR
    limpiarCapasDelMapa() // Esto limpia marcadores, layers, sources Y cache

    // ✅ PASO 3: Esperar un momento para asegurar limpieza
    await nextTick()

    // ✅ PASO 4: Redibujar todo desde cero
    await dibujarTodosEnMapa()

    // ✅ PASO 5: Reinicializar sistema de detección de eventos
    resetear()
    await inicializarSistemaDeteccion()
    detenerEvaluacionEventos()
    iniciarEvaluacionContinuaEventos()

    // ✅ PASO 6: Actualizar marcadores de unidades
    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }

    console.log('✅ Mapa redibujado completamente')
  })
  setTimeout(() => {
    iniciarSimuladorAutomatico()
  }, 1000)

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
const cambiarEstiloDesdeMenu = (nuevoEstilo) => {
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
</style>

<style scoped>
.recenter-btn {
  position: fixed !important;
  top: 145px;
  right: 20px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  width: 45px !important;
  height: 45px !important;
  border-radius: 12px !important;
  border: 3px solid #ffffff !important;
}

.recenter-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  width: 45px !important;
  height: 45px !important;
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
  right: 20px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  border-radius: 12px !important;
  border: 2px solid #ddf4e7 !important;

  width: 45px !important;
  height: 45px !important;
}

/* 🔲 Hacer el botón cuadrado con esquinas redondeadas - MÁS ESPECÍFICO */
.layers-menu-btn.q-btn {
  border-radius: 12px !important;
  border: 3px solid #ffffff !important;
}

.layers-menu-btn :deep(.q-btn__wrapper) {
  border-radius: 12px !important;
  padding: 12px !important;
  border: 3px solid #ffffff !important;
}

.layers-menu-btn :deep(.q-btn__content) {
  border-radius: 12px !important;
  border-color: #ffffff;
}

/* Asegurar que el ripple effect también sea redondeado */
.layers-menu-btn :deep(.q-focus-helper),
.layers-menu-btn :deep(.q-ripple) {
  border-radius: 12px !important;
  border-color: #ffffff;
}

.layers-menu-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
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
  background: transparent !important;
  border-radius: 16px !important;
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
.map-styles-section .q-item__label--header {
  background: white;
  padding: 12px 16px;
  margin: 0;
}

/* Container de tarjetas SIN fondo blanco (muestra degradado) */
.map-styles-container {
  background: transparent;
}

/* ✅ TODA LA SECCIÓN DE TRÁFICO - Fondo blanco */
.traffic-section {
  background: white;
  padding: 0;
  margin: 0;
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
  gap: 12px;
  padding: 12px 16px;
  justify-content: center;
}

/* Tarjeta individual de estilo */
.map-style-card {
  flex: 1;
  cursor: pointer;
  border-radius: 12px; /* ✅ Cambié de 8px a 12px */
  overflow: hidden;
  transition: all 0.2s ease;
  border: 2px solid #e0e0e0;
  background: white;
}

.map-style-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #bdbdbd;
}

.map-style-card.active {
  border-color: #4caf50;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* Preview de la imagen */
.style-preview {
  position: relative;
  width: 100%;
  height: 80px;
  overflow: hidden;
  background: #f5f5f5;
  padding: 4px; /* ✅ Agrega esto */
}

.style-preview svg {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px; /* ✅ Agrega esto para redondear el SVG también */
  clip-path: inset(0 round 12px);
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
  padding: 8px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #424242;
  background: #f5f5f5;
}

.map-style-card.active .style-label {
  background: #e8f5e9;
  color: #2e7d32;
}

/* Item del toggle de tráfico */
.traffic-toggle-item {
  padding: 12px 16px;
}

.traffic-toggle-item:hover {
  background-color: #f5f5f5;
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
</style>
