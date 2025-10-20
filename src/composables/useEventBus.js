// src/composables/useEventBus.js
// Event Bus para comunicación entre componentes

import { ref } from 'vue'
import { EventBus } from 'quasar'

// Crear una instancia de EventBus de Quasar
const eventBus = ref(new EventBus())

// Estado compartido para otros casos de uso
const estadoCompartido = ref({
  abrirGeozonasConPOI: null,
  abrirEstadoFlotaConVehiculo: null,
  abrirConductoresConConductor: null,
})

export function useEventBus() {
  // Función para emitir evento de ver detalles
  const emitirVerDetalles = (data) => {
    console.log('🚀 Emitiendo evento ver-detalles:', data)
    eventBus.value.emit('ver-detalles', data)
  }

  // Función para abrir GeoZonas con un POI específico
  const abrirGeozonasConPOI = (poi) => {
    console.log('📍 Abriendo GeoZonas con POI:', poi)
    
    // Actualizar estado compartido
    estadoCompartido.value.abrirGeozonasConPOI = {
      poi,
      timestamp: Date.now()
    }
    
    // Emitir evento usando el EventBus
    emitirVerDetalles({
      tipo: poi.coordenadas && !poi.tipoGeozona ? 'poi' : 'geozona',
      id: poi.id,
      datos: poi
    })
  }

  // Función para abrir Estado Flota con un vehículo específico
  const abrirEstadoFlotaConVehiculo = (vehiculo) => {
    estadoCompartido.value.abrirEstadoFlotaConVehiculo = {
      vehiculo,
      timestamp: Date.now()
    }
  }

  // Función para abrir Conductores con un conductor específico
  const abrirConductoresConConductor = (conductor) => {
    estadoCompartido.value.abrirConductoresConConductor = {
      conductor,
      timestamp: Date.now()
    }
  }

  // Funciones para resetear
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
    eventBus,
    estadoCompartido,
    emitirVerDetalles,
    abrirGeozonasConPOI,
    abrirEstadoFlotaConVehiculo,
    abrirConductoresConConductor,
    resetAbrirGeozonas,
    resetAbrirEstadoFlota,
    resetAbrirConductores,
  }
}