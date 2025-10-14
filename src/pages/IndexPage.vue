<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useMap } from 'src/composables/useMap'

const { initMap, addMarker, cleanup, map } = useMap()
const mapaListo = ref(false)

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
      console.log('✅ window.L disponible:', !!window.L)
    }, 100)
  } catch (error) {
    console.error('❌ Error inicializando mapa:', error)
  }

  // Redibujado optimizado del mapa
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize(true)
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

  cleanup()

  console.log('🧹 IndexPage desmontado, mapa limpiado')
})
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
</style>
