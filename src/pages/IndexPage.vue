<template>
  <q-page class="full-height">
    <div id="map" class="full-map">
      <!-- Selector de estilos -->
      <div class="map-controls">
        <q-btn-group unelevated>
          <q-btn
            label="Calles"
            color="white"
            text-color="black"
            @click="changeStyle('streets')"
            size="sm"
          />
          <q-btn
            label="Satélite"
            color="white"
            text-color="black"
            @click="changeStyle('satellite')"
            size="sm"
          />
          <q-btn
            label="Oscuro"
            color="white"
            text-color="black"
            @click="changeStyle('dark')"
            size="sm"
          />
        </q-btn-group>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useMap } from 'src/composables/useMap'

const { initMap, addMarker, changeStyle, cleanup } = useMap()

onMounted(() => {
  initMap('map', [32.5149, -117.0382], 13)
  addMarker(32.5149, -117.0382, {
    popup: '<b>MJ Industrias</b><br>Ubicación principal',
  })
})

onUnmounted(() => {
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

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
</style>
