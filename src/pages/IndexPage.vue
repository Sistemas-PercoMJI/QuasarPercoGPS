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

    <!-- SimuladorControl - Justo debajo del botón de tráfico -->
    <div class="simulador-container">
      <SimuladorControl />
    </div>

    <transition name="fade-scale">
      <div v-if="mostrarBotonConfirmarGeozona" class="floating-buttons-container">
        <!-- Botón de Cancelar -->
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

        <!-- Botón de Confirmar -->
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

    <!-- Marcador de ubicación del usuario -->
    <div v-if="ubicacionActiva" class="user-location-indicator">
      <q-icon name="gps_fixed" size="24px" color="positive" />
      <span class="text-caption">GPS Activo</span>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useMap } from 'src/composables/useMap'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
import { useEventos } from 'src/composables/useEventos'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useEventDetection } from 'src/composables/useEventDetection'
import { auth } from 'src/firebase/firebaseConfig'
import SimuladorControl from 'src/components/SimuladorControl.vue'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'


const { initMap, addMarker, cleanup, toggleTrafico, actualizarMarcadoresUnidades, limpiarMarcadoresUnidades } = useMap()
const { abrirGeozonasConPOI } = useEventBus()
const { inicializar, actualizarUbicacion, resetear } = useEventDetection()

const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)
const ubicacionActiva = ref(false)
const marcadorUsuario = ref(null)
const { unidadesActivas, iniciarTracking, detenerTracking } = useTrackingUnidades()
const userId = ref(auth.currentUser?.uid || '')

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)
const { obtenerEventos } = useEventos(userId.value)
//trafico
const traficoActivo = ref(false)

// Variables para almacenar los datos cargados
const poisCargados = ref([])
const geozonasCargadas = ref([])

// Variables para GPS
let watchId = null
let mapaAPI = null

// Función para verificar si una ubicación tiene eventos
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

// Función para crear ícono personalizado con badge
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

// FUNCIÓN PARA ACTUALIZAR EL MARCADOR DEL USUARIO
function actualizarMarcadorUsuario(lat, lng) {
  if (!mapaAPI || !mapaAPI.map) return

  if (marcadorUsuario.value) {
    // Actualizar posición del marcador existente
    marcadorUsuario.value.setLatLng([lat, lng])
  } else {
    // Crear nuevo marcador de usuario
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

// FUNCIÓN PARA INICIAR SEGUIMIENTO GPS
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

      console.log('📍 Nueva ubicación detectada:', latitude, longitude)
      ubicacionActiva.value = true

      // Actualizar marcador en el mapa
      actualizarMarcadorUsuario(latitude, longitude)

      // Evaluar eventos con la nueva ubicación
      actualizarUbicacion(latitude, longitude)
    },
    (error) => {
      console.error('❌ Error de geolocalización:', error.message)
      ubicacionActiva.value = false
    },
    opciones,
  )

  console.log('🎯 Seguimiento GPS iniciado')
}

// FUNCIÓN PARA DETENER SEGUIMIENTO GPS
function detenerSeguimientoGPS() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
    ubicacionActiva.value = false
    console.log('🛑 Seguimiento GPS detenido')
  }
}

// FUNCIÓN PARA INICIALIZAR EL SISTEMA DE DETECCIÓN
async function inicializarSistemaDeteccion() {
  try {
    console.log('🚀 Inicializando sistema de detección de eventos...')

    const [eventos, pois, geozonas] = await Promise.all([
      obtenerEventos(),
      obtenerPOIs(),
      obtenerGeozonas(),
    ])

    // Filtrar solo eventos activos
    const eventosActivos = eventos.filter((e) => e.activo)

    // Inicializar el detector
    inicializar(eventosActivos, pois, geozonas)

    console.log('✅ Sistema de detección inicializado')
    console.log('  📊 Eventos activos:', eventosActivos.length)
    console.log('  📍 POIs:', pois.length)
    console.log('  🗺️ Geozonas:', geozonas.length)
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

  // 🆕 Watch para actualizar marcadores GPS en tiempo real
watch(unidadesActivas, (nuevasUnidades) => {
  if (mapaAPI && mapaListo.value && nuevasUnidades.length > 0) {
    console.log(`🗺️ Actualizando ${nuevasUnidades.length} unidades en el mapa`)
    actualizarMarcadoresUnidades(nuevasUnidades)
  } else if (nuevasUnidades.length === 0) {
    console.log('🧹 No hay unidades activas, limpiando marcadores')
    limpiarMarcadoresUnidades()
  }
}, { deep: true })


  mapaAPI = mapPage._mapaAPI

  try {
    console.log('🎨 Cargando y dibujando items en el mapa...')

    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter((e) => e.activo)
    console.log('✅ Eventos activos cargados:', eventosFiltrados.length)

    // Cargar POIs
    const pois = await obtenerPOIs()
    poisCargados.value = pois
    console.log('✅ POIs cargados:', pois.length)

    // Dibujar POIs
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
        marker.on('click', () => {
          console.log('🖱️ Clic en POI:', poi.nombre)
        })

        console.log(
          `📍 POI dibujado: ${poi.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`,
        )
      }
    })

    // Cargar Geozonas
    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas
    console.log('✅ Geozonas cargadas:', geozonas.length)

    // Dibujar Geozonas
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
        circle.on('click', () => {
          console.log('🖱️ Clic en Geozona Circular:', geozona.nombre)
        })

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

          marcadorEvento.on('click', () => {
            console.log('🖱️ Clic en marcador de geozona con eventos:', geozona.nombre)
          })
        }

        console.log(
          `🔵 Geozona circular dibujada: ${geozona.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`,
        )
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
        polygon.on('click', () => {
          console.log('🖱️ Clic en Geozona Poligonal:', geozona.nombre)
        })

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

          marcadorEvento.on('click', () => {
            console.log('🖱️ Clic en marcador de geozona con eventos:', geozona.nombre)
          })
        }

        console.log(
          `🔷 Geozona poligonal dibujada: ${geozona.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`,
        )
      }
    })

    console.log('✅ Todos los items dibujados en el mapa')
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
        console.log('🔍 Abriendo detalles de ubicación:', ubicacionData)

        try {
          if (ubicacionData.tipo === 'poi') {
            const poi = poisCargados.value.find((p) => p.id === ubicacionData.id)
            if (poi) {
              console.log('📍 Navegando a detalles de POI:', poi.nombre)
              abrirGeozonasConPOI(poi)
            } else {
              console.error('❌ POI no encontrado:', ubicacionData.id)
            }
          } else if (ubicacionData.tipo === 'geozona') {
            const geozona = geozonasCargadas.value.find((g) => g.id === ubicacionData.id)
            if (geozona) {
              console.log('🔷 Navegando a detalles de Geozona:', geozona.nombre)
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

      // Inicializar sistema de detección de eventos
      await inicializarSistemaDeteccion()

      // Iniciar seguimiento GPS
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
    console.log('🔄 Redibujando mapa y reiniciando detección...')

    const mapPage = document.getElementById('map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.eachLayer((layer) => {
        if (
          layer instanceof mapPage._mapaAPI.L.Marker ||
          layer instanceof mapPage._mapaAPI.L.Circle ||
          layer instanceof mapPage._mapaAPI.L.Polygon
        ) {
          if (layer.getPopup()?.getContent() !== '<b>MJ Industrias</b><br>Ubicación principal') {
            // No eliminar el marcador del usuario
            if (layer !== marcadorUsuario.value) {
              mapPage._mapaAPI.map.removeLayer(layer)
            }
          }
        }
      })
    }

    await dibujarTodosEnMapa()

    // Reinicializar sistema de detección
    resetear()
    await inicializarSistemaDeteccion()
  })
  console.log('🚀 Iniciando tracking GPS...')
  iniciarTracking()
})

const handleMostrarBoton = (e) => {
  console.log('🔘 Evento mostrarBotonConfirmarGeozona:', e.detail)
  mostrarBotonConfirmarGeozona.value = e.detail.mostrar
}

const confirmarYVolverADialogo = () => {
  console.log('✅ Botón confirmar geozona presionado')

  const evento = new CustomEvent('confirmarGeozonaDesdeBoton', {
    detail: { confirmed: true },
  })
  window.dispatchEvent(evento)

  mostrarBotonConfirmarGeozona.value = false
}

const cancelarGeozona = () => {
  console.log('❌ Cancelando creación de geozona')

  // Ocultar botones
  mostrarBotonConfirmarGeozona.value = false

  // Limpiar capas temporales del mapa
  const mapPage = document.getElementById('map-page')
  if (mapPage && mapPage._mapaAPI) {
    const mapaAPI = mapPage._mapaAPI

    // Desactivar modos de selección
    mapaAPI.desactivarModoSeleccion()

    // Limpiar capas temporales
    mapaAPI.limpiarCirculoTemporal()
    mapaAPI.limpiarPoligonoTemporal()

    console.log('✅ Capas temporales limpiadas')
  }

  // ✅ NUEVO: Restaurar opacidad del drawer
  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
    console.log('✅ Opacidad del drawer restaurada')
  }

  // Disparar evento para que GeoZonas limpie su estado
  const evento = new CustomEvent('cancelarGeozonaDesdeBoton', {
    detail: { cancelled: true },
  })
  window.dispatchEvent(evento)

  // Notificar al usuario
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
  // Detener seguimiento GPS
  detenerSeguimientoGPS()

  // Resetear sistema de detección
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

/* Indicador de GPS activo */
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

/* Estilos para marcador de usuario */
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

/* Animación del marcador de ubicación */
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

/* Botón de confirmar (palomita) */
.floating-confirm-btn-main {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* Botón de cancelar (X) */
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

/* Animación de entrada */
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

/* Botón de toggle de tráfico */
.traffic-toggle-btn {
  position: fixed !important;
  top: 150px;
  right: 20px; /* Justo a la derecha del drawer mini */
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.traffic-toggle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Animación cuando está activo */
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

/* Contenedor del SimuladorControl - VERSIÓN COMPACTA */
.simulador-container {
  position: fixed !important;
  top: 220px; /* Debajo del botón de tráfico */
  right: 20px;
  z-index: 1000;
}

/* Cuando está expandido, darle ancho fijo */
.simulador-container :deep(.simulador-card-expandido) {
  width: 350px;
}

/* Media query para pantallas pequeñas */
@media (max-width: 768px) {
  .simulador-container :deep(.simulador-card-expandido) {
    width: 320px;
  }
  
  .simulador-container {
    right: 10px;
  }
}

/* 🆕 Estilos para marcadores GPS */
:deep(.custom-marker-unidad) {
  background: none !important;
  border: none !important;
}

@keyframes pulse-gps {
  0%, 100% {
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
