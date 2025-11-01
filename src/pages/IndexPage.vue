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

    <div class="simulador-container">
      <SimuladorControl :pois-iniciales="poisCargados" :geozonas-iniciales="geozonasCargadas" />
    </div>

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
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useMap } from 'src/composables/useMap'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
import { useEventos } from 'src/composables/useEventos'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useEventDetection } from 'src/composables/useEventDetection'
import { auth } from 'src/firebase/firebaseConfig'
import SimuladorControl from 'src/components/SimuladorControl.vue'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'

const {
  initMap,
  addMarker,
  cleanup,
  toggleTrafico,
  actualizarMarcadoresUnidades,
  limpiarMarcadoresUnidades,
} = useMap()
const { abrirGeozonasConPOI } = useEventBus()
const { inicializar, evaluarEventosParaUnidadesSimulacion, resetear } = useEventDetection()

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

let watchId = null
let mapaAPI = null
let intervaloEvaluacionEventos = null

watch(
  unidadesActivas,
  (nuevasUnidades) => {
    if (!mapaAPI || !mapaListo.value) {
      return
    }

    if (nuevasUnidades && nuevasUnidades.length > 0) {
      actualizarMarcadoresUnidades(nuevasUnidades)
    } else {
      limpiarMarcadoresUnidades()
    }
  },
  { deep: true, immediate: false },
)

// 🔧 NUEVA FUNCIÓN: Iniciar evaluación continua de eventos
function iniciarEvaluacionContinuaEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
  }

  console.log('🔄 Iniciando evaluación continua de eventos (cada 10 segundos)...')

  intervaloEvaluacionEventos = setInterval(() => {
    // 🔧 FIX: Usar unidades trackeadas globalmente
    const unidadesParaEvaluar = window._unidadesTrackeadas || unidadesActivas.value

    if (unidadesParaEvaluar && unidadesParaEvaluar.length > 0) {
      evaluarEventosParaUnidadesSimulacion(unidadesParaEvaluar)
    }
  }, 10000)

  console.log('✅ Evaluación continua de eventos iniciada cada 10 segundos')
}

// 🔧 NUEVA FUNCIÓN: Detener evaluación
function detenerEvaluacionEventos() {
  if (intervaloEvaluacionEventos) {
    clearInterval(intervaloEvaluacionEventos)
    intervaloEvaluacionEventos = null
    console.log('🛑 Evaluación de eventos detenida')
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

function crearIconoConBadge(tipoUbicacion, colorUrl, tieneEventos, cantidadEventos) {
  const iconUrl =
    colorUrl ||
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'

  if (tieneEventos > 0) {
    return window.L.divIcon({
      className: 'custom-marker-with-badge',
      html: `
        <div style="position: relative;">
          <img src="${iconUrl}" style="width: 25px; height: 41px;" />
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff5722;
            color: white;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(255, 87, 34, 0.5);
            animation: pulse-badge 2s infinite;
          ">
            ${cantidadEventos}
          </div>
        </div>
      `,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
  }

  return window.L.icon({
    iconUrl: iconUrl,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

function actualizarMarcadorUsuario(lat, lng) {
  if (!mapaAPI || !mapaAPI.map) return

  if (marcadorUsuario.value) {
    marcadorUsuario.value.setLatLng([lat, lng])
  } else {
    const iconoUsuario = mapaAPI.L.divIcon({
      className: 'user-location-marker',
      html: `
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
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    marcadorUsuario.value = mapaAPI.L.marker([lat, lng], {
      icon: iconoUsuario,
      zIndexOffset: 2000,
    }).addTo(mapaAPI.map)

    marcadorUsuario.value.bindPopup('<b>📍 Tu ubicación</b>')
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

// 🔧 MEJORADA: Función de inicialización con logs detallados
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

    // 🔧 NUEVO: Log de eventos para debug
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

const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  mapaAPI = mapPage._mapaAPI
  if (mapaAPI.map) {
    mapaAPI.map.closePopup()
  }

  try {
    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter((e) => e.activo)

    const pois = await obtenerPOIs()
    poisCargados.value = pois

    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const { lat, lng } = poi.coordenadas
        const radio = poi.radio || 100
        mapaAPI.L.circle([lat, lng], {
          radius: radio,
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapaAPI.map)
        const cantidadEventos = tieneEventosAsignados(poi.id, 'poi', eventosFiltrados)
        const tieneEventos = cantidadEventos > 0

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
                transition: all 0.2s ease;
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(187, 0, 0, 0.3)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
            >
              📍 Ver detalles
            </button>
          </div>
        `

        const marker = mapaAPI.L.marker([lat, lng], {
          icon: crearIconoConBadge(
            'poi',
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            tieneEventos,
            cantidadEventos,
          ),
        }).addTo(mapaAPI.map)

        marker.bindPopup(popupContent)
      }
    })

    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas

    geozonas.forEach((geozona) => {
      const cantidadEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
      const tieneEventos = cantidadEventos > 0

      if (geozona.tipoGeozona === 'circular' && geozona.centro) {
        const { lat, lng } = geozona.centro
        const color = '#FF6B6B'
        const fillColor = '#FF6B6B'

        const circle = mapaAPI.L.circle([lat, lng], {
          radius: geozona.radio,
          color: color,
          fillColor: fillColor,
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapaAPI.map)

        const popupContent = `
          <div style="min-width: 180px;">
            <b style="font-size: 14px;">🔵 ${geozona.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              Radio: ${geozona.radio}m
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
                transition: all 0.2s ease;
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(187, 0, 0, 0.3)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
            >
              📍 Ver detalles
            </button>
          </div>
        `

        circle.bindPopup(popupContent)

        if (tieneEventos) {
          const markerIcono = mapaAPI.L.divIcon({
            className: 'geozona-marker-badge',
            html: `
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
                animation: pulse-badge-geozona 2s infinite;
              ">
                ${cantidadEventos}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })

          const marcadorEvento = mapaAPI.L.marker([lat, lng], {
            icon: markerIcono,
            zIndexOffset: 1000,
          }).addTo(mapaAPI.map)

          marcadorEvento.bindPopup(`
            <div style="min-width: 180px;">
              <b style="font-size: 14px;">🔔 ${geozona.nombre}</b>
              <span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">${cantidadEventos} evento${cantidadEventos > 1 ? 's' : ''}</span>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                Geozona Circular - Radio: ${geozona.radio}m
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
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(187, 0, 0, 0.3)';"
                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
              >
                📍 Ver detalles
              </button>
            </div>
          `)
        }
      } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
        const puntos = geozona.puntos.map((p) => [p.lat, p.lng])
        const color = '#4ECDC4'
        const fillColor = '#4ECDC4'

        const polygon = mapaAPI.L.polygon(puntos, {
          color: color,
          fillColor: fillColor,
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapaAPI.map)

        const popupContent = `
          <div style="min-width: 180px;">
            <b style="font-size: 14px;">🔷 ${geozona.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${geozona.puntos.length} puntos
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
                transition: all 0.2s ease;
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(187, 0, 0, 0.3)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
            >
              📍 Ver detalles
            </button>
          </div>
        `

        polygon.bindPopup(popupContent)

        if (tieneEventos) {
          const bounds = mapaAPI.L.latLngBounds(puntos)
          const centro = bounds.getCenter()

          const markerIcono = mapaAPI.L.divIcon({
            className: 'geozona-marker-badge',
            html: `
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
                animation: pulse-badge-geozona 2s infinite;
              ">
                ${cantidadEventos}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })

          const marcadorEvento = mapaAPI.L.marker(centro, {
            icon: markerIcono,
            zIndexOffset: 1000,
          }).addTo(mapaAPI.map)

          marcadorEvento.bindPopup(`
            <div style="min-width: 180px;">
              <b style="font-size: 14px;">🔔 ${geozona.nombre}</b>
              <span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">${cantidadEventos} evento${cantidadEventos > 1 ? 's' : ''}</span>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
                Geozona Poligonal - ${geozona.puntos.length} puntos
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
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(187, 0, 0, 0.3)';"
                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
              >
                📍 Ver detalles
              </button>
            </div>
          `)
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

onMounted(async () => {
  try {
    console.log('🗺️ Iniciando mapa Mapbox satelital...')

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

      // 🔧 NUEVO: Iniciar evaluación continua de eventos
      iniciarEvaluacionContinuaEventos()

      iniciarSeguimientoGPS()
    }, 100)

    window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
  }

  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const mapPage = document.getElementById('map-page')
      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
        mapPage._mapaAPI.map.invalidateSize(true)
      }
    }, 250)
  }

  window.addEventListener('resize', handleResize)
  window._resizeHandler = handleResize

  // Listener mejorado para redibujar mapa
  window.addEventListener('redibujarMapa', async () => {
    const mapPage = document.getElementById('map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      // 🔧 FIX CRÍTICO: Cerrar todos los popups primero
      mapPage._mapaAPI.map.closePopup()

      const marcadoresGPSTemporales = []

      mapPage._mapaAPI.map.eachLayer((layer) => {
        if (layer instanceof mapPage._mapaAPI.L.Marker) {
          const esMarkerVehiculo =
            layer.options?.className === 'marker-vehiculo-gps' ||
            layer.options?.icon?.options?.className === 'custom-marker-unidad' ||
            layer.options?.zIndexOffset === 5000

          if (esMarkerVehiculo) {
            marcadoresGPSTemporales.push(layer)
          }
        }
      })

      mapPage._mapaAPI.map.eachLayer((layer) => {
        if (
          layer instanceof mapPage._mapaAPI.L.Marker ||
          layer instanceof mapPage._mapaAPI.L.Circle ||
          layer instanceof mapPage._mapaAPI.L.Polygon
        ) {
          const esMarkerPrincipal =
            layer.getPopup()?.getContent() === '<b>MJ Industrias</b><br>Ubicación principal'
          const esMarkerUsuario = layer === marcadorUsuario.value
          const esMarkerVehiculo = marcadoresGPSTemporales.includes(layer)

          if (!esMarkerPrincipal && !esMarkerUsuario && !esMarkerVehiculo) {
            // 🔧 FIX: Desligar popup antes de eliminar capa
            if (layer.getPopup()) {
              layer.unbindPopup()
            }
            mapPage._mapaAPI.map.removeLayer(layer)
          }
        }
      })
    }

    await dibujarTodosEnMapa()

    // Reinicializar sistema de detección
    resetear()
    await inicializarSistemaDeteccion()

    detenerEvaluacionEventos()
    iniciarEvaluacionContinuaEventos()

    await nextTick()
    if (unidadesActivas.value && unidadesActivas.value.length > 0) {
      actualizarMarcadoresUnidades(unidadesActivas.value)
    }
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

  // 🔧 NUEVO: Detener evaluación de eventos
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

.simulador-container {
  position: fixed !important;
  top: 220px;
  right: 20px;
  z-index: 1000;
}

.simulador-container :deep(.simulador-card-expandido) {
  width: 350px;
}

@media (max-width: 768px) {
  .simulador-container :deep(.simulador-card-expandido) {
    width: 320px;
  }

  .simulador-container {
    right: 10px;
  }
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

:deep(.popup-unidad .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

:deep(.popup-unidad .leaflet-popup-content) {
  margin: 0;
}
</style>
