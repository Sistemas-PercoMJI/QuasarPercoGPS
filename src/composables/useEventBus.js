// src/composables/useEventBus.js
// Event Bus para comunicación entre componentes

import { ref } from 'vue'

// Estado compartido
const eventBus = ref({
  abrirGeozonasConPOI: null,
  abrirEstadoFlotaConVehiculo: null,
  abrirConductoresConConductor: null,
})

export function useEventBus() {
  // Función para abrir GeoZonas con un POI específico
  const abrirGeozonasConPOI = (poi) => {
    eventBus.value.abrirGeozonasConPOI = {
      poi,
      timestamp: Date.now()
    }
  }

  // Función para abrir Estado Flota con un vehículo específico
  const abrirEstadoFlotaConVehiculo = (vehiculo) => {
    eventBus.value.abrirEstadoFlotaConVehiculo = {
      vehiculo,
      timestamp: Date.now()
    }
  }

  // Función para abrir Conductores con un conductor específico
  const abrirConductoresConConductor = (conductor) => {
    eventBus.value.abrirConductoresConConductor = {
      conductor,
      timestamp: Date.now()
    }
  }

  // Reset
  const resetAbrirGeozonas = () => {
    eventBus.value.abrirGeozonasConPOI = null
  }

  const resetAbrirEstadoFlota = () => {
    eventBus.value.abrirEstadoFlotaConVehiculo = null
  }

  const resetAbrirConductores = () => {
    eventBus.value.abrirConductoresConConductor = null
  }

  return {
    eventBus,
    abrirGeozonasConPOI,
    abrirEstadoFlotaConVehiculo,
    abrirConductoresConConductor,
    resetAbrirGeozonas,
    resetAbrirEstadoFlota,
    resetAbrirConductores,
  }
}