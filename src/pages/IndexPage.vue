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
import { auth } from 'src/firebase/firebaseConfig'

const { initMap, addMarker, cleanup } = useMap()
const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)

const userId = ref(auth.currentUser?.uid || '')

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)
const { obtenerEventos } = useEventos(userId.value)

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
  
  // Si tiene eventos, crear ícono con badge
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
  
  // Ícono normal sin badge
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

    // 🆕 Cargar eventos primero
    const eventosActivos = await obtenerEventos()
    const eventosFiltrados = eventosActivos.filter(e => e.activo)
    console.log('✅ Eventos activos cargados:', eventosFiltrados.length)

    // Cargar POIs
    const pois = await obtenerPOIs()
    console.log('✅ POIs cargados:', pois.length)

    // 🆕 Dibujar POIs con badges si tienen eventos
    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const { lat, lng } = poi.coordenadas
        
        // 🆕 Verificar si tiene eventos
        const cantidadEventos = tieneEventosAsignados(poi.id, 'poi', eventosFiltrados)
        const tieneEventos = cantidadEventos > 0

        const popupContent = `
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">📍 ${poi.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${poi.direccion}
            </p>
          </div>
        `

        // 🆕 Crear marcador con badge si tiene eventos
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
          
          window.dispatchEvent(new CustomEvent('seleccionarUbicacionDesdeMapa', {
            detail: {
              poiId: poi.id,
              geozonaId: null,
              tipo: 'poi',
              nombre: poi.nombre,
              coordenadas: poi.coordenadas,
              direccion: poi.direccion
            }
          }))
          
          window.dispatchEvent(new CustomEvent('abrirDrawerGeozonas'))
        })

        console.log(`📍 POI dibujado: ${poi.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`)
      }
    })

    // Cargar Geozonas
    const geozonas = await obtenerGeozonas()
    console.log('✅ Geozonas cargadas:', geozonas.length)

    // 🆕 Dibujar Geozonas con indicador visual si tienen eventos
    geozonas.forEach((geozona) => {
      // 🆕 Verificar si tiene eventos
      const cantidadEventos = tieneEventosAsignados(geozona.id, 'geozona', eventosFiltrados)
      const tieneEventos = cantidadEventos > 0

      if (geozona.tipoGeozona === 'circular' && geozona.centro) {
        const { lat, lng } = geozona.centro

        // 🆕 Cambiar color si tiene eventos
        const color = tieneEventos ? '#ff5722' : '#FF6B6B'
        const fillColor = tieneEventos ? '#ff5722' : '#FF6B6B'

        const circle = mapaAPI.L.circle([lat, lng], {
          radius: geozona.radio,
          color: color,
          fillColor: fillColor,
          fillOpacity: tieneEventos ? 0.25 : 0.15,
          weight: tieneEventos ? 3 : 2,
          className: tieneEventos ? 'geozona-con-eventos' : ''
        }).addTo(mapaAPI.map)

        circle.bindPopup(`
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">🔵 ${geozona.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              Radio: ${geozona.radio}m
            </p>
          </div>
        `)

        circle.on('click', () => {
          console.log('🖱️ Clic en Geozona Circular:', geozona.nombre)
          
          window.dispatchEvent(new CustomEvent('seleccionarUbicacionDesdeMapa', {
            detail: {
              poiId: null,
              geozonaId: geozona.id,
              tipo: 'geozona',
              nombre: geozona.nombre,
              tipoGeozona: geozona.tipoGeozona,
              centro: geozona.centro,
              radio: geozona.radio
            }
          }))
          
          window.dispatchEvent(new CustomEvent('abrirDrawerGeozonas'))
        })

        console.log(`🔵 Geozona circular dibujada: ${geozona.nombre}${tieneEventos ? ' (con ' + cantidadEventos + ' eventos)' : ''}`)
      } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
        const puntos = geozona.puntos.map((p) => [p.lat, p.lng])

        // 🆕 Cambiar color si tiene eventos
        const color = tieneEventos ? '#ff5722' : '#4ECDC4'
        const fillColor = tieneEventos ? '#ff5722' : '#4ECDC4'

        const polygon = mapaAPI.L.polygon(puntos, {
          color: color,
          fillColor: fillColor,
          fillOpacity: tieneEventos ? 0.25 : 0.15,
          weight: tieneEventos ? 3 : 2,
          className: tieneEventos ? 'geozona-con-eventos' : ''
        }).addTo(mapaAPI.map)

        polygon.bindPopup(`
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">🔷 ${geozona.nombre}</b>
            ${tieneEventos ? `<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">🔔 ${cantidadEventos}</span>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${geozona.puntos.length} puntos
            </p>
          </div>
        `)

        polygon.on('click', () => {
          console.log('🖱️ Clic en Geozona Poligonal:', geozona.nombre)
          
          window.dispatchEvent(new CustomEvent('seleccionarUbicacionDesdeMapa', {
            detail: {
              poiId: null,
              geozonaId: geozona.id,
              tipo: 'geozona',
              nombre: geozona.nombre,
              tipoGeozona: geozona.tipoGeozona,
              puntos: geozona.puntos
            }
          }))
          
          window.dispatchEvent(new CustomEvent('abrirDrawerGeozonas'))
        })

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
      console.log('✅ window.mapaGlobal disponible:', !!window.mapaGlobal)
      console.log(
        '✅ map-page._mapaAPI disponible:',
        !!document.getElementById('map-page')?._mapaAPI,
      )
      if (window.mapaGlobal) {
        console.log('✅ Funciones disponibles:', Object.keys(window.mapaGlobal))
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

/* 🆕 ESTILOS PARA MARCADORES CON BADGES */
:deep(.custom-marker-with-badge) {
  background: none !important;
  border: none !important;
}

/* 🆕 ANIMACIÓN PARA EL BADGE */
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

/* 🆕 ESTILOS PARA GEOZONAS CON EVENTOS */
:deep(.geozona-con-eventos) {
  animation: pulse-geozona 2s infinite;
}

@keyframes pulse-geozona {
  0%, 100% {
    stroke-width: 3;
    stroke-opacity: 1;
  }
  50% {
    stroke-width: 4;
    stroke-opacity: 0.8;
  }
}
</style>