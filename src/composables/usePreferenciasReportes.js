// src/composables/usePreferenciasReportes.js
import { ref, watch } from 'vue'

const STORAGE_KEY = 'preferencias_reportes_columnas'

// Estado reactivo compartido
const preferencias = ref({
  eventos: {
    columnasSeleccionadas: null,
    ultimaActualizacion: null,
  },
  trayectos: {
    columnasSeleccionadas: null,
    ultimaActualizacion: null,
  },
  horas_trabajo: {
    columnasSeleccionadas: null,
    ultimaActualizacion: null,
  },
})

// Cargar preferencias al iniciar
const cargarPreferencias = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      preferencias.value = {
        ...preferencias.value,
        ...parsed,
      }
    }
  } catch (error) {
    console.error('❌ Error cargando preferencias de columnas:', error)
  }
}

// Guardar preferencias automáticamente
const guardarPreferencias = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencias.value))
  } catch (error) {
    console.error('❌ Error guardando preferencias de columnas:', error)
  }
}

// Auto-guardar cuando cambien las preferencias
watch(
  preferencias,
  () => {
    guardarPreferencias()
  },
  { deep: true },
)

export function usePreferenciasReportes() {
  // Cargar al primer uso
  if (!preferencias.value.eventos.ultimaActualizacion) {
    cargarPreferencias()
  }

  const obtenerColumnasGuardadas = (tipoReporte) => {
    return preferencias.value[tipoReporte]?.columnasSeleccionadas || null
  }

  const guardarColumnasSeleccionadas = (tipoReporte, columnas) => {
    if (!preferencias.value[tipoReporte]) {
      preferencias.value[tipoReporte] = {}
    }

    preferencias.value[tipoReporte].columnasSeleccionadas = [...columnas]
    preferencias.value[tipoReporte].ultimaActualizacion = new Date().toISOString()
  }

  const resetearPreferencias = (tipoReporte) => {
    if (tipoReporte) {
      preferencias.value[tipoReporte] = {
        columnasSeleccionadas: null,
        ultimaActualizacion: null,
      }
    } else {
      // Resetear todo
      Object.keys(preferencias.value).forEach((tipo) => {
        preferencias.value[tipo] = {
          columnasSeleccionadas: null,
          ultimaActualizacion: null,
        }
      })
    }
  }

  return {
    obtenerColumnasGuardadas,
    guardarColumnasSeleccionadas,
    resetearPreferencias,
  }
}
