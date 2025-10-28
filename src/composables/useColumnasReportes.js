// src/composables/useColumnasReportes.js
// 📊 SISTEMA DE COLUMNAS DINÁMICAS PARA REPORTES DE EVENTOS

import { ref, computed } from 'vue'

/**
 * Define todas las columnas disponibles para los reportes
 * Cada columna tiene:
 * - key: identificador único
 * - label: nombre para mostrar
 * - obtenerValor: función que extrae el valor de una notificación
 * - ancho: ancho sugerido para Excel/PDF
 * - formato: tipo de dato (texto, numero, fecha)
 */
export const COLUMNAS_DISPONIBLES = {
  // ============ INFORMACIÓN DEL EVENTO ============
  'Nombre de evento': {
    key: 'nombreEvento',
    label: 'Nombre de evento',
    obtenerValor: (notificacion) => notificacion.eventoNombre || 'Sin nombre',
    ancho: 200,
    formato: 'texto',
  },

  'Tipo de evento': {
    key: 'tipoEvento',
    label: 'Tipo',
    obtenerValor: (notificacion) => {
      const tipos = {
        positive: 'Entrada',
        warning: 'Salida',
        info: 'Dentro',
        negative: 'Fuera',
      }
      return tipos[notificacion.type] || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Hora de inicio de evento': {
    key: 'horaInicio',
    label: 'Hora de inicio',
    obtenerValor: (notificacion) => {
      if (!notificacion.timestamp) return 'N/A'
      const fecha = new Date(notificacion.timestamp)
      return fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    },
    ancho: 180,
    formato: 'fecha',
  },

  Fecha: {
    key: 'fecha',
    label: 'Fecha',
    obtenerValor: (notificacion) => {
      if (!notificacion.timestamp) return 'N/A'
      const fecha = new Date(notificacion.timestamp)
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    },
    ancho: 120,
    formato: 'fecha',
  },

  Hora: {
    key: 'hora',
    label: 'Hora',
    obtenerValor: (notificacion) => {
      if (!notificacion.timestamp) return 'N/A'
      const fecha = new Date(notificacion.timestamp)
      return fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    },
    ancho: 100,
    formato: 'texto',
  },

  Duración: {
    key: 'duracion',
    label: 'Duración',
    obtenerValor: (notificacion) => {
      if (notificacion.timestampInicio && notificacion.timestampFin) {
        const duracionMs = notificacion.timestampFin - notificacion.timestampInicio
        const horas = Math.floor(duracionMs / 3600000)
        const minutos = Math.floor((duracionMs % 3600000) / 60000)
        const segundos = Math.floor((duracionMs % 60000) / 1000)

        if (horas > 0) {
          return `${horas}h ${minutos}m ${segundos}s`
        } else if (minutos > 0) {
          return `${minutos}m ${segundos}s`
        } else {
          return `${segundos}s`
        }
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Condición de evento': {
    key: 'condicionEvento',
    label: 'Condición',
    obtenerValor: (notificacion) => {
      const accion = notificacion.accion || 'N/A'
      const tipo = notificacion.tipoUbicacion || ''
      return `${accion}${tipo ? ' en ' + tipo : ''}`
    },
    ancho: 180,
    formato: 'texto',
  },

  Mensaje: {
    key: 'mensaje',
    label: 'Mensaje',
    obtenerValor: (notificacion) => notificacion.message || 'Sin mensaje',
    ancho: 250,
    formato: 'texto',
  },

  // ============ UBICACIÓN ============
  'Ubicación de eventos': {
    key: 'ubicacionEvento',
    label: 'Ubicación',
    obtenerValor: (notificacion) => notificacion.ubicacionNombre || 'Sin ubicación',
    ancho: 200,
    formato: 'texto',
  },

  'Tipo de ubicación': {
    key: 'tipoUbicacion',
    label: 'Tipo ubicación',
    obtenerValor: (notificacion) => notificacion.tipoUbicacion || 'N/A',
    ancho: 130,
    formato: 'texto',
  },

  Geozona: {
    key: 'geozona',
    label: 'Geozona',
    obtenerValor: (notificacion) => {
      if (notificacion.tipoUbicacion === 'Geozona') {
        return notificacion.ubicacionNombre || 'N/A'
      }
      return 'N/A'
    },
    ancho: 180,
    formato: 'texto',
  },

  POI: {
    key: 'poi',
    label: 'POI',
    obtenerValor: (notificacion) => {
      if (notificacion.tipoUbicacion === 'POI') {
        return notificacion.ubicacionNombre || 'N/A'
      }
      return 'N/A'
    },
    ancho: 180,
    formato: 'texto',
  },

  Coordenadas: {
    key: 'coordenadas',
    label: 'Coordenadas',
    obtenerValor: (notificacion) => {
      if (notificacion.ubicacion?.lat && notificacion.ubicacion?.lng) {
        return `${notificacion.ubicacion.lat.toFixed(6)}, ${notificacion.ubicacion.lng.toFixed(6)}`
      }
      return 'N/A'
    },
    ancho: 200,
    formato: 'texto',
  },

  Latitud: {
    key: 'latitud',
    label: 'Latitud',
    obtenerValor: (notificacion) => {
      if (notificacion.ubicacion?.lat) {
        return notificacion.ubicacion.lat.toFixed(6)
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  Longitud: {
    key: 'longitud',
    label: 'Longitud',
    obtenerValor: (notificacion) => {
      if (notificacion.ubicacion?.lng) {
        return notificacion.ubicacion.lng.toFixed(6)
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  Dirección: {
    key: 'direccion',
    label: 'Dirección',
    obtenerValor: (notificacion) => notificacion.direccion || 'N/A',
    ancho: 300,
    formato: 'texto',
  },

  // ============ CONDUCTOR Y VEHÍCULO ============
  Conductor: {
    key: 'conductor',
    label: 'Conductor',
    obtenerValor: (notificacion) => {
      return notificacion.conductorNombre || notificacion.conductor || 'N/A'
    },
    ancho: 150,
    formato: 'texto',
  },

  Vehículo: {
    key: 'vehiculo',
    label: 'Vehículo',
    obtenerValor: (notificacion) => {
      return notificacion.unidadNombre || notificacion.vehiculo || 'N/A'
    },
    ancho: 150,
    formato: 'texto',
  },

  Placa: {
    key: 'placa',
    label: 'Placa',
    obtenerValor: (notificacion) => {
      return notificacion.unidadPlaca || notificacion.placa || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  // ============ DATOS DE VELOCIDAD Y MOVIMIENTO ============
  Velocidad: {
    key: 'velocidad',
    label: 'Velocidad',
    obtenerValor: (notificacion) => {
      if (notificacion.velocidad !== undefined && notificacion.velocidad !== null) {
        return `${notificacion.velocidad} km/h`
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Velocidad (número)': {
    key: 'velocidadNumero',
    label: 'Velocidad',
    obtenerValor: (notificacion) => {
      if (notificacion.velocidad !== undefined && notificacion.velocidad !== null) {
        return notificacion.velocidad
      }
      return 0
    },
    ancho: 100,
    formato: 'numero',
  },

  Kilometraje: {
    key: 'kilometraje',
    label: 'Kilometraje',
    obtenerValor: (notificacion) => {
      if (notificacion.kilometraje !== undefined && notificacion.kilometraje !== null) {
        return `${notificacion.kilometraje.toFixed(2)} km`
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  Batería: {
    key: 'bateria',
    label: 'Batería',
    obtenerValor: (notificacion) => {
      if (notificacion.bateria !== undefined && notificacion.bateria !== null) {
        return `${notificacion.bateria}%`
      }
      return 'N/A'
    },
    ancho: 100,
    formato: 'texto',
  },

  Estado: {
    key: 'estado',
    label: 'Estado',
    obtenerValor: (notificacion) => {
      const estados = {
        movimiento: 'En movimiento',
        detenido: 'Detenido',
        inactivo: 'Inactivo',
      }
      return estados[notificacion.estado] || 'N/A'
    },
    ancho: 130,
    formato: 'texto',
  },

  // ============ INFORMACIÓN ADICIONAL ============
  'ID de evento': {
    key: 'idEvento',
    label: 'ID Evento',
    obtenerValor: (notificacion) => notificacion.eventoId || 'N/A',
    ancho: 200,
    formato: 'texto',
  },

  'ID de notificación': {
    key: 'idNotificacion',
    label: 'ID Notificación',
    obtenerValor: (notificacion) => notificacion.id || 'N/A',
    ancho: 200,
    formato: 'texto',
  },

  Leído: {
    key: 'leido',
    label: 'Leído',
    obtenerValor: (notificacion) => (notificacion.leido ? 'Sí' : 'No'),
    ancho: 80,
    formato: 'texto',
  },
}

/**
 * Composable para gestionar columnas de reportes
 */
export function useColumnasReportes() {
  // Columnas por defecto
  const columnasSeleccionadas = ref([
    'Nombre de evento',
    'Hora de inicio de evento',
    'Tipo de evento',
    'Condición de evento',
    'Ubicación de eventos',
  ])

  const columnaAgregar = ref(null)
  const mostrarResumen = ref(true)

  // Obtener lista de nombres de columnas disponibles
  const nombresColumnasDisponibles = computed(() => {
    return Object.keys(COLUMNAS_DISPONIBLES)
  })

  // Filtrar columnas que no están seleccionadas
  const columnasDisponiblesFiltradas = computed(() => {
    return nombresColumnasDisponibles.value.filter(
      (col) => !columnasSeleccionadas.value.includes(col),
    )
  })

  /**
   * Agregar una columna
   */
  const agregarColumna = (nombreColumna) => {
    if (nombreColumna && !columnasSeleccionadas.value.includes(nombreColumna)) {
      columnasSeleccionadas.value.push(nombreColumna)
      columnaAgregar.value = null
    }
  }

  /**
   * Remover una columna
   */
  const removerColumna = (nombreColumna) => {
    const index = columnasSeleccionadas.value.indexOf(nombreColumna)
    if (index > -1) {
      columnasSeleccionadas.value.splice(index, 1)
    }
  }

  /**
   * Filtrar columnas para el buscador
   */
  const filtrarColumnas = (val, update) => {
    update(() => {
      if (val === '') {
        return columnasDisponiblesFiltradas.value
      }

      const needle = val.toLowerCase()
      return columnasDisponiblesFiltradas.value.filter((col) => col.toLowerCase().includes(needle))
    })
  }

  /**
   * Obtener configuración de columnas seleccionadas
   */
  const obtenerConfiguracionColumnas = () => {
    return columnasSeleccionadas.value.map((nombre) => COLUMNAS_DISPONIBLES[nombre])
  }

  /**
   * Procesar notificaciones para reporte
   * Retorna array de objetos con solo las columnas seleccionadas
   */
  const procesarNotificacionesParaReporte = (notificaciones) => {
    const configuracion = obtenerConfiguracionColumnas()

    return notificaciones.map((notificacion) => {
      const fila = {}
      configuracion.forEach((col) => {
        fila[col.label] = col.obtenerValor(notificacion)
      })
      return fila
    })
  }

  /**
   * Generar resumen del reporte
   */
  const generarResumen = (notificaciones) => {
    const resumen = {
      totalEventos: notificaciones.length,
      eventosPorTipo: {},
      eventosPorUbicacion: {},
      conductoresUnicos: new Set(),
      vehiculosUnicos: new Set(),
    }

    notificaciones.forEach((notif) => {
      // Contar por tipo
      const tipo = notif.type || 'Sin tipo'
      resumen.eventosPorTipo[tipo] = (resumen.eventosPorTipo[tipo] || 0) + 1

      // Contar por ubicación
      const ubicacion = notif.ubicacionNombre || 'Sin ubicación'
      resumen.eventosPorUbicacion[ubicacion] = (resumen.eventosPorUbicacion[ubicacion] || 0) + 1

      // Conductores únicos
      if (notif.conductorNombre) {
        resumen.conductoresUnicos.add(notif.conductorNombre)
      }

      // Vehículos únicos
      if (notif.unidadNombre) {
        resumen.vehiculosUnicos.add(notif.unidadNombre)
      }
    })

    return {
      ...resumen,
      conductoresUnicos: resumen.conductoresUnicos.size,
      vehiculosUnicos: resumen.vehiculosUnicos.size,
    }
  }

  /**
   * Resetear a columnas por defecto
   */
  const resetearColumnas = () => {
    columnasSeleccionadas.value = [
      'Nombre de evento',
      'Hora de inicio de evento',
      'Tipo de evento',
      'Condición de evento',
      'Ubicación de eventos',
    ]
  }

  return {
    // Estado
    columnasSeleccionadas,
    columnaAgregar,
    mostrarResumen,
    nombresColumnasDisponibles,
    columnasDisponiblesFiltradas,

    // Métodos
    agregarColumna,
    removerColumna,
    filtrarColumnas,
    obtenerConfiguracionColumnas,
    procesarNotificacionesParaReporte,
    generarResumen,
    resetearColumnas,
  }
}
