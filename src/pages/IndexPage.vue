<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>

    <!-- Botón flotante para confirmar geozona -->
    <transition name="fade-scale">
      <q-btn
        v-if="mostrarBotonConfirmarGeozona"
        fab
        color="secondary"
        icon="check"
        class="floating-confirm-btn"
        @click="confirmarYVolverADialogo"
        size="lg"
      >
        <q-tooltip>Listo, guardar geozona</q-tooltip>
      </q-btn>
    </transition>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useMap } from 'src/composables/useMap'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
import { useEventos } from 'src/composables/useEventos'
import { useEventBus } from 'src/composables/useEventBus.js' // 🆕 AGREGADO
import { auth } from 'src/firebase/firebaseConfig'

const { initMap, addMarker, cleanup } = useMap()
const { abrirGeozonasConPOI } = useEventBus() // 🆕 AGREGADO
const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)

const userId = ref(auth.currentUser?.uid || '')

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)
const { obtenerEventos } = useEventos(userId.value)

// Variables para almacenar los datos cargados
const poisCargados = ref([])
const geozonasCargadas = ref([])

// 🆕 FUNCIÓN PARA VERIFICAR SI UNA UBICACIÓN TIENE EVENTOS
function tieneEventosAsignados(ubicacionId, tipo, eventosActivos) {
  let count = 0
  eventosActivos.forEach(evento => {
    if (evento.condiciones) {
      evento.condiciones.forEach(condicion => {
        if (condicion.ubicacionId === ubicacionId && 
            ((tipo === 'poi' && condicion.tipo === 'POI') || 
             (tipo === 'geozona' && condicion.tipo === 'Geozona'))) {
          count++
        }
      })
    }
  })
  return count
}

// 🆕 FUNCIÓN PARA CREAR ÍCONO PERSONALIZADO CON BADGE
function crearIconoConBadge(tipoUbicacion, colorUrl, tieneEventos, cantidadEventos) {
  const iconUrl = colorUrl || 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
  
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

const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  const mapaAPI = mapPage._mapaAPI

  try {
    console.log('🎨 Cargando y dibujando items en el mapa...')

    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter(e => e.activo)
    console.log('✅ Eventos activos cargados:', eventosFiltrados.length)

    // Cargar POIs
    const pois = await obtenerPOIs()
    poisCargados.value = pois // 🆕 Guardar para uso posterior
    console.log('✅ POIs cargados:', pois.length)

    // Dibujar POIs
    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const { lat, lng } = poi.coordenadas
        const cantidadEventos = tieneEventosAsignados(poi.id, 'poi', eventosFiltrados)
        const tieneEventos = cantidadEventos > 0

        // ✅ CAMBIO CLAVE: El onclick ahora llama a una función más simple
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
          icon: crearIconoConBadge('poi', 
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            tieneEventos,
            cantidadEventos
          )
        }).addTo(mapaAPI.map)

        marker.bindPopup(popupContent)
        marker.on('click', () => {
          console.log('🖱️ Clic en POI:', poi.nombre)
        })

        console.log(`📍 POI dibujado: ${poi.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`)
      }
    })

    // Cargar Geozonas
    const geozonas = await obtenerGeozonas()
    geozonasCargadas.value = geozonas // 🆕 Guardar para uso posterior
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

        // ✅ CAMBIO CLAVE: El onclick ahora llama a una función más simple
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
            zIndexOffset: 1000
          }).addTo(mapaAPI.map)

          // ✅ CAMBIO CLAVE: El onclick ahora llama a una función más simple
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

        console.log(`🔵 Geozona circular dibujada: ${geozona.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`)
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

        // ✅ CAMBIO CLAVE: El onclick ahora llama a una función más simple
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
            zIndexOffset: 1000
          }).addTo(mapaAPI.map)

          // ✅ CAMBIO CLAVE: El onclick ahora llama a una función más simple
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

        console.log(`🔷 Geozona poligonal dibujada: ${geozona.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`)
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

      // ✅ FUNCIÓN GLOBAL PRINCIPAL MEJORADA
      window.abrirDetallesUbicacion = (ubicacionData) => {
        console.log('🔍 Abriendo detalles de ubicación:', ubicacionData)
        
        try {
          if (ubicacionData.tipo === 'poi') {
            const poi = poisCargados.value.find(p => p.id === ubicacionData.id)
            if (poi) {
              console.log('📍 Navegando a detalles de POI:', poi.nombre)
              abrirGeozonasConPOI(poi)
            } else {
              console.error('❌ POI no encontrado:', ubicacionData.id)
            }
          } else if (ubicacionData.tipo === 'geozona') {
            const geozona = geozonasCargadas.value.find(g => g.id === ubicacionData.id)
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

      // ✅ NUEVAS FUNCIONES GLOBALES AUXILIARES
      window.verDetallesPOI = (poiId) => {
        window.abrirDetallesUbicacion({ tipo: 'poi', id: poiId })
      }

      window.verDetallesGeozona = (geozonaId) => {
        window.abrirDetallesUbicacion({ tipo: 'geozona', id: geozonaId })
      }

      await dibujarTodosEnMapa()
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

  window.addEventListener('redibujarMapa', async () => {
    console.log('🔄 Redibujando mapa...')

    const mapPage = document.getElementById('map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.eachLayer((layer) => {
        if (
          layer instanceof mapPage._mapaAPI.L.Marker ||
          layer instanceof mapPage._mapaAPI.L.Circle ||
          layer instanceof mapPage._mapaAPI.L.Polygon
        ) {
          if (layer.getPopup()?.getContent() !== '<b>MJ Industrias</b><br>Ubicación principal') {
            mapPage._mapaAPI.map.removeLayer(layer)
          }
        }
      })
    }

    await dibujarTodosEnMapa()
  })
})

onUnmounted(() => {
  if (window._resizeHandler) {
    window.removeEventListener('resize', window._resizeHandler)
    delete window._resizeHandler
  }

  window.removeEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
  window.removeEventListener('redibujarMapa', () => {})

  // 🆕 Limpiar funciones globales
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

  console.log('🧹 IndexPage desmontado, mapa limpiado')
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

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.5);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 3px 12px rgba(255, 87, 34, 0.7);
  }
}

@keyframes pulse-badge-geozona {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 3px 12px rgba(255, 87, 34, 0.6);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 4px 16px rgba(255, 87, 34, 0.8);
  }
}
</style>