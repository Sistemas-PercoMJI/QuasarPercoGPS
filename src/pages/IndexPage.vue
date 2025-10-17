<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>

    <!-- ✅ NUEVO: Botón flotante para confirmar geozona -->
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

const { initMap, addMarker, cleanup } = useMap()
const mapaListo = ref(false)
const mostrarBotonConfirmarGeozona = ref(false)

onMounted(async () => {
  try {
    console.log('🗺️ Iniciando mapa Mapbox satelital...')

    // Inicializar mapa
    await initMap('map', [32.504421823945805, -116.9514484543167], 13)

    // Pequeño delay para asegurar que el mapa esté completamente renderizado
    setTimeout(() => {
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
    }, 100)

    // ✅ NUEVO: Escuchar evento para mostrar/ocultar botón
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
})

onUnmounted(() => {
  // Limpiar event listener
  if (window._resizeHandler) {
    window.removeEventListener('resize', window._resizeHandler)
    delete window._resizeHandler
  }

  // ✅ NUEVO: Limpiar evento del botón
  window.removeEventListener('mostrarBotonConfirmarGeozona', handleMostrarBoton)

  cleanup()

  console.log('🧹 IndexPage desmontado, mapa limpiado')
})

// ✅ NUEVO: Manejar evento para mostrar/ocultar botón
const handleMostrarBoton = (e) => {
  console.log('🔘 Evento mostrarBotonConfirmarGeozona:', e.detail)
  mostrarBotonConfirmarGeozona.value = e.detail.mostrar
}

// ✅ NUEVO: Confirmar y volver al diálogo
const confirmarYVolverADialogo = () => {
  console.log('✅ Botón confirmar geozona presionado')

  // Emitir evento para que GeoZonas.vue lo capture
  const evento = new CustomEvent('confirmarGeozonaDesdeBoton', {
    detail: { confirmed: true },
  })
  window.dispatchEvent(evento)

  // Ocultar el botón
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

/* ✅ NUEVO: Estilos para el botón flotante */
.floating-confirm-btn {
  position: fixed !important;
  bottom: 100px;
  right: 24px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* Animación para el botón */
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
