<template>
  <q-page>
    <div id="map" style="height: 100vh; width: 100%; position: relative">
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

      <!-- Toggle de tráfico -->
      <div class="traffic-control">
        <q-btn
          :color="trafficVisible ? 'negative' : 'white'"
          :text-color="trafficVisible ? 'white' : 'black'"
          icon="traffic"
          label="TRÁFICO"
          unelevated
          size="sm"
          @click="toggleTrafficLayer"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMap } from 'src/composables/useMap'

const { initMap, addMarker, changeStyle, toggleTraffic, cleanup } = useMap()
const trafficVisible = ref(false)

const toggleTrafficLayer = () => {
  trafficVisible.value = !trafficVisible.value
  toggleTraffic(trafficVisible.value)
}

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
.map-controls {
  position: absolute;
  top: 80px;
  right: 10px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.traffic-control {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
</style>
