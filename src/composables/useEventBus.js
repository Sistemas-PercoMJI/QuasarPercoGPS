// src/composables/useEventBus.js
// Estado compartido para comunicación entre componentes

import { ref } from 'vue'

// Estado compartido reactivo
const estadoCompartido = ref({
  abrirGeozonasConPOI: null,
  abrirEstadoFlotaConVehiculo: null,
  abrirConductoresConConductor: null,
})

export function useEventBus() {
  // Función para abrir GeoZonas con un POI/Geozona específico
  const abrirGeozonasConPOI = (item) => {
    estadoCompartido.value.abrirGeozonasConPOI = {
      item, // Renombrado de 'poi' a 'item' para mayor claridad
      timestamp: Date.now(),
    }
  }

  // Función para abrir Estado Flota con un vehículo específico
  const abrirEstadoFlotaConVehiculo = (vehiculo) => {
    estadoCompartido.value.abrirEstadoFlotaConVehiculo = {
      vehiculo,
      timestamp: Date.now(),
    }
  }

  // Función para abrir Conductores con un conductor específico
  const abrirConductoresConConductor = (conductor) => {
    estadoCompartido.value.abrirConductoresConConductor = {
      conductor,
      timestamp: Date.now(),
    }
  }

  // Funciones para resetear el estado
  const resetAbrirGeozonas = () => {
    estadoCompartido.value.abrirGeozonasConPOI = null
  }

  const resetAbrirEstadoFlota = () => {
    estadoCompartido.value.abrirEstadoFlotaConVehiculo = null
  }

  const resetAbrirConductores = () => {
    estadoCompartido.value.abrirConductoresConConductor = null
  }

  return {
    estadoCompartido, // Exponemos el estado directamente
    abrirGeozonasConPOI,
    abrirEstadoFlotaConVehiculo,
    abrirConductoresConConductor,
    resetAbrirGeozonas,
    resetAbrirEstadoFlota,
    resetAbrirConductores,
  }
}
