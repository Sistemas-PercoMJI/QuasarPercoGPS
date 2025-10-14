<template>
  <q-page id="map-page" class="full-height">
    <div id="map" class="full-map"></div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useMap } from 'src/composables/useMap'

const {
  initMap,
  addMarker,
  activarModoSeleccion,
  desactivarModoSeleccion,
  getUbicacionSeleccionada,
  confirmarMarcadorTemporal, // ← Agregar esta
  limpiarMarcadorTemporal,
  cleanup,
  eliminarMarcadorPorCoordenadas, // ← Nueva
  actualizarMarcador,
} = useMap()

onMounted(() => {
  initMap('map', [32.504421823945805, -116.9514484543167], 13)
  addMarker(32.504421823945805, -116.9514484543167, {
    popup: '<b>MJ Industrias</b><br>Ubicación principal',
  })
  const mapPageElement = document.querySelector('#map-page')
  if (mapPageElement) {
    mapPageElement._mapaAPI = {
      activarModoSeleccion,
      desactivarModoSeleccion,
      getUbicacionSeleccionada,
      confirmarMarcadorTemporal,
      limpiarMarcadorTemporal,
      eliminarMarcadorPorCoordenadas,
      actualizarMarcador,
    }
    console.log('✅ API del mapa guardada en el elemento DOM')
  }

  // NUEVO: Forzar redibujado cuando cambia el tamaño de la ventana
  window.addEventListener('resize', () => {
    const { map } = useMap()
    if (map.value) {
      map.value.invalidateSize()
    }
  })
})

onUnmounted(() => {
  // Limpiar la referencia
  const mapPageElement = document.querySelector('#map-page')
  if (mapPageElement) {
    delete mapPageElement._mapaAPI
  }
  cleanup()
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
