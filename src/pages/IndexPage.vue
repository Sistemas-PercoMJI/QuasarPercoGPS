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
import { auth } from 'src/firebase/firebaseConfig'

const { initMap, addMarker, cleanup } = useMap()
const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)

// ✅ NUEVO: Obtener userId
const userId = ref(auth.currentUser?.uid || '')

// ✅ NUEVO: Usar composables para cargar datos
const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)

// ✅ NUEVO: Función para dibujar todos los POIs y Geozonas
const dibujarTodosEnMapa = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.warn('⚠️ Mapa no disponible para dibujar items')
    return
  }

  const mapaAPI = mapPage._mapaAPI

  try {
    console.log('🎨 Cargando y dibujando items en el mapa...')

    // Cargar POIs
    const pois = await obtenerPOIs()
    console.log('✅ POIs cargados:', pois.length)

    // Dibujar POIs
    pois.forEach((poi) => {
      if (poi.coordenadas) {
        const { lat, lng } = poi.coordenadas

        const popupContent = `
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">📍 ${poi.nombre}</b>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${poi.direccion}
            </p>
          </div>
        `

        const marker = mapaAPI.L.marker([lat, lng], {
          icon: mapaAPI.L.icon({
            iconUrl:
              'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl:
              'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        }).addTo(mapaAPI.map)

        marker.bindPopup(popupContent)
        console.log('📍 POI dibujado:', poi.nombre)
      }
    })

    // Cargar Geozonas
    const geozonas = await obtenerGeozonas()
    console.log('✅ Geozonas cargadas:', geozonas.length)

    // Dibujar Geozonas
    geozonas.forEach((geozona) => {
      if (geozona.tipoGeozona === 'circular' && geozona.centro) {
        const { lat, lng } = geozona.centro

        const circle = mapaAPI.L.circle([lat, lng], {
          radius: geozona.radio,
          color: '#FF6B6B',
          fillColor: '#FF6B6B',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapaAPI.map)

        circle.bindPopup(`
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">🔵 ${geozona.nombre}</b>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              Radio: ${geozona.radio}m
            </p>
          </div>
        `)

        console.log('🔵 Geozona circular dibujada:', geozona.nombre)
      } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
        const puntos = geozona.puntos.map((p) => [p.lat, p.lng])

        const polygon = mapaAPI.L.polygon(puntos, {
          color: '#4ECDC4',
          fillColor: '#4ECDC4',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapaAPI.map)

        polygon.bindPopup(`
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">🔷 ${geozona.nombre}</b>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${geozona.puntos.length} puntos
            </p>
          </div>
        `)

        console.log('🔷 Geozona poligonal dibujada:', geozona.nombre)
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

    // Inicializar mapa
    await initMap('map', [32.504421823945805, -116.9514484543167], 13)

    // Pequeño delay para asegurar que el mapa esté completamente renderizado
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

      // ✅ NUEVO: Dibujar todos los POIs y Geozonas
      await dibujarTodosEnMapa()
    }, 100)

    // Event listener para el botón flotante
    window.addEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
  }

  // Redibujado optimizado del mapa
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

  // Guardar referencia para limpiar después
  window._resizeHandler = handleResize

  window.addEventListener('redibujarMapa', async () => {
    console.log('🔄 Redibujando mapa...')

    // Limpiar capas existentes (excepto el tile layer y el marcador principal)
    const mapPage = document.getElementById('map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.eachLayer((layer) => {
        // No eliminar el tile layer (mapa base) ni el marcador de MJ Industrias
        if (
          layer instanceof mapPage._mapaAPI.L.Marker ||
          layer instanceof mapPage._mapaAPI.L.Circle ||
          layer instanceof mapPage._mapaAPI.L.Polygon
        ) {
          // Solo eliminar si no es el marcador principal
          if (layer.getPopup()?.getContent() !== '<b>MJ Industrias</b><br>Ubicación principal') {
            mapPage._mapaAPI.map.removeLayer(layer)
          }
        }
      })
    }

    // Redibujar todo
    await dibujarTodosEnMapa()
  })
})

onUnmounted(() => {
  // Limpiar event listener
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
</style>
