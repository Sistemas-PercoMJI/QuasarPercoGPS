// src/composables/useEventBus.js
// Estado compartido para comunicacion entre componentes

import { ref } from 'vue'

// Estado compartido reactivo
const estadoCompartido = ref({
  abrirGeozonasConPOI: null,
  abrirEstadoFlotaConVehiculo: null,
  abrirConductoresConConductor: null,
  filtroUnidadesActivo: false,
  idsUnidadesFiltradas: null, // null = sin filtro (mostrar todas), [] = filtro activo vacio
  filtroFuente: null,
})

export function useEventBus() {
  const abrirGeozonasConPOI = (item) => {
    estadoCompartido.value.abrirGeozonasConPOI = {
      item,
      timestamp: Date.now(),
    }
  }

  const abrirEstadoFlotaConVehiculo = (vehiculo) => {
    estadoCompartido.value.abrirEstadoFlotaConVehiculo = {
      vehiculo,
      timestamp: Date.now(),
    }
  }

  const abrirConductoresConConductor = (conductor) => {
    estadoCompartido.value.abrirConductoresConConductor = {
      conductor,
      timestamp: Date.now(),
    }
  }

  // Actualizar el filtro de unidades desde el modulo de conductores
  const actualizarFiltroUnidades = (activo, ids, fuente = null) => {
    estadoCompartido.value.filtroUnidadesActivo = activo
    estadoCompartido.value.idsUnidadesFiltradas = activo ? ids : null
    estadoCompartido.value.filtroFuente = activo ? fuente : null
  }

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
    estadoCompartido,
    abrirGeozonasConPOI,
    abrirEstadoFlotaConVehiculo,
    abrirConductoresConConductor,
    actualizarFiltroUnidades,
    resetAbrirGeozonas,
    resetAbrirEstadoFlota,
    resetAbrirConductores,
  }
}
