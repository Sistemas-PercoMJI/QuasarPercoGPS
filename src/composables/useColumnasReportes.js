// src/composables/useColumnasReportes.js
// 📊 SISTEMA DE COLUMNAS DINÁMICAS PARA TODOS LOS TIPOS DE REPORTES

import { ref, computed } from 'vue'

/**
 * ============================================
 * COLUMNAS COMPARTIDAS (usadas en múltiples tipos)
 * ============================================
 */
const COLUMNAS_COMPARTIDAS = {
  Conductor: {
    key: 'conductor',
    label: 'Conductor',
    obtenerValor: (dato) => dato.conductorNombre || 'N/A',
    ancho: 180,
    formato: 'texto',
  },

  Vehículo: {
    key: 'vehiculo',
    label: 'Vehículo',
    obtenerValor: (dato) => dato.unidadNombre || 'N/A',
    ancho: 180,
    formato: 'texto',
  },

  Placa: {
    key: 'placa',
    label: 'Placa',
    obtenerValor: (dato) => dato.unidadPlaca || 'N/A',
    ancho: 100,
    formato: 'texto',
  },
}

/**
 * ============================================
 * COLUMNAS PARA INFORME DE EVENTOS
 * ============================================
 */
const COLUMNAS_EVENTOS = {
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
        return `${horas}h ${minutos}m ${segundos}s`
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Condición de evento': {
    key: 'condicion',
    label: 'Condición',
    obtenerValor: (notificacion) => notificacion.accion || 'N/A',
    ancho: 150,
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
    key: 'ubicacion',
    label: 'Ubicación',
    obtenerValor: (notificacion) => notificacion.ubicacionNombre || 'Sin ubicación',
    ancho: 200,
    formato: 'texto',
  },

  'Tipo de ubicación': {
    key: 'tipoUbicacion',
    label: 'Tipo ubicación',
    obtenerValor: (notificacion) => notificacion.tipoUbicacion || 'N/A',
    ancho: 120,
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
        return `${notificacion.ubicacion.lat}, ${notificacion.ubicacion.lng}`
      }
      return 'N/A'
    },
    ancho: 200,
    formato: 'texto',
  },

  Dirección: {
    key: 'direccion',
    label: 'Dirección',
    obtenerValor: (notificacion) => notificacion.direccion || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  // ============ DATOS TÉCNICOS ============
  Velocidad: {
    key: 'velocidad',
    label: 'Velocidad',
    obtenerValor: (notificacion) => {
      return notificacion.velocidad !== null && notificacion.velocidad !== undefined
        ? `${notificacion.velocidad} km/h`
        : 'N/A'
    },
    ancho: 100,
    formato: 'numero',
  },

  Kilometraje: {
    key: 'kilometraje',
    label: 'Kilometraje',
    obtenerValor: (notificacion) => {
      return notificacion.kilometraje !== null && notificacion.kilometraje !== undefined
        ? `${notificacion.kilometraje} km`
        : 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  Batería: {
    key: 'bateria',
    label: 'Batería',
    obtenerValor: (notificacion) => {
      return notificacion.bateria !== null && notificacion.bateria !== undefined
        ? `${notificacion.bateria}%`
        : 'N/A'
    },
    ancho: 100,
    formato: 'numero',
  },

  'Estado del vehículo': {
    key: 'estado',
    label: 'Estado',
    obtenerValor: (notificacion) => notificacion.estado || 'N/A',
    ancho: 150,
    formato: 'texto',
  },

  Ignición: {
    key: 'ignicion',
    label: 'Ignición',
    obtenerValor: (notificacion) => {
      if (notificacion.ignicion === true) return 'Encendida'
      if (notificacion.ignicion === false) return 'Apagada'
      return 'N/A'
    },
    ancho: 100,
    formato: 'texto',
  },

  // Incluir columnas compartidas
  ...COLUMNAS_COMPARTIDAS,
}

/**
 * ============================================
 * COLUMNAS PARA INFORME DE TRAYECTOS
 * ============================================
 */
const COLUMNAS_TRAYECTOS = {
  // ============ INICIO DEL TRAYECTO ============
  'Hora de inicio de trabajo': {
    key: 'horaInicioTrabajo',
    label: 'Hora de inicio de trabajo',
    obtenerValor: (trayecto) => {
      if (!trayecto.inicioTimestamp) return 'N/A'
      const fecha = new Date(trayecto.inicioTimestamp)
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

  'Ubicación de inicio de trabajo': {
    key: 'ubicacionInicio',
    label: 'Ubicación de inicio',
    obtenerValor: (trayecto) => trayecto.inicioDireccion || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Kilometraje al inicio': {
    key: 'kilometrajeInicio',
    label: 'Kilometraje al inicio',
    obtenerValor: (trayecto) => {
      return trayecto.inicioKilometraje !== null && trayecto.inicioKilometraje !== undefined
        ? `${trayecto.inicioKilometraje} km`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  // ============ FIN DEL TRAYECTO ============
  'Hora de fin de trabajo': {
    key: 'horaFinTrabajo',
    label: 'Hora de fin de trabajo',
    obtenerValor: (trayecto) => {
      if (!trayecto.finTimestamp) return 'N/A'
      const fecha = new Date(trayecto.finTimestamp)
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

  'Ubicación de fin de trabajo': {
    key: 'ubicacionFin',
    label: 'Ubicación de fin',
    obtenerValor: (trayecto) => trayecto.finDireccion || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Kilometraje al final': {
    key: 'kilometrajeFinal',
    label: 'Kilometraje al final',
    obtenerValor: (trayecto) => {
      return trayecto.finKilometraje !== null && trayecto.finKilometraje !== undefined
        ? `${trayecto.finKilometraje} km`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  // ============ DATOS CALCULADOS ============
  'Duración del trayecto': {
    key: 'duracionTrayecto',
    label: 'Duración',
    obtenerValor: (trayecto) => {
      if (trayecto.duracion) {
        const duracionMs = trayecto.duracion
        const horas = Math.floor(duracionMs / 3600000)
        const minutos = Math.floor((duracionMs % 3600000) / 60000)
        return `${horas}h ${minutos}m`
      }
      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Kilometraje recorrido': {
    key: 'kilometrajeRecorrido',
    label: 'Kilometraje recorrido',
    obtenerValor: (trayecto) => {
      return trayecto.kilometrajeRecorrido !== null && trayecto.kilometrajeRecorrido !== undefined
        ? `${trayecto.kilometrajeRecorrido} km`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  'Velocidad promedio': {
    key: 'velocidadPromedio',
    label: 'Velocidad promedio',
    obtenerValor: (trayecto) => {
      return trayecto.velocidadPromedio !== null && trayecto.velocidadPromedio !== undefined
        ? `${trayecto.velocidadPromedio} km/h`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  'Velocidad máxima': {
    key: 'velocidadMaxima',
    label: 'Velocidad máxima',
    obtenerValor: (trayecto) => {
      return trayecto.velocidadMaxima !== null && trayecto.velocidadMaxima !== undefined
        ? `${trayecto.velocidadMaxima} km/h`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  'Odómetro virtual': {
    key: 'odometroVirtual',
    label: 'Odómetro virtual',
    obtenerValor: (trayecto) => {
      return trayecto.odometroVirtual !== null && trayecto.odometroVirtual !== undefined
        ? `${trayecto.odometroVirtual} km`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  // Incluir columnas compartidas
  ...COLUMNAS_COMPARTIDAS,
}

/**
 * ============================================
 * COLUMNAS PARA INFORME DE HORAS DE TRABAJO
 * ============================================
 */
const COLUMNAS_HORAS_TRABAJO = {
  // ============ JORNADA LABORAL ============
  Fecha: {
    key: 'fecha',
    label: 'Fecha',
    obtenerValor: (registro) => {
      if (!registro.fecha) return 'N/A'
      const fecha = new Date(registro.fecha)
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    },
    ancho: 120,
    formato: 'fecha',
  },

  'Hora de inicio de trabajo': {
    key: 'horaInicioTrabajo',
    label: 'Hora de inicio',
    obtenerValor: (registro) => registro.horaInicioTrabajo || 'N/A',
    ancho: 120,
    formato: 'texto',
  },

  'Ubicación de inicio de trabajo': {
    key: 'ubicacionInicio',
    label: 'Ubicación de inicio',
    obtenerValor: (registro) => registro.ubicacionInicio || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Hora de fin de trabajo': {
    key: 'horaFinTrabajo',
    label: 'Hora de fin',
    obtenerValor: (registro) => registro.horaFinTrabajo || 'N/A',
    ancho: 120,
    formato: 'texto',
  },

  'Ubicación de fin de trabajo': {
    key: 'ubicacionFin',
    label: 'Ubicación de fin',
    obtenerValor: (registro) => registro.ubicacionFin || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  // ============ DURACIONES ============
  'Duración total de trabajo': {
    key: 'duracionTotal',
    label: 'Duración total',
    obtenerValor: (registro) => {
      return registro.duracionTotal !== null && registro.duracionTotal !== undefined
        ? `${registro.duracionTotal} horas`
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  'Duración dentro del horario comercial': {
    key: 'duracionDentro',
    label: 'Duración dentro horario',
    obtenerValor: (registro) => {
      return registro.duracionDentroHorario !== null && registro.duracionDentroHorario !== undefined
        ? `${registro.duracionDentroHorario} horas`
        : 'N/A'
    },
    ancho: 180,
    formato: 'numero',
  },

  'Duración fuera del horario comercial': {
    key: 'duracionFuera',
    label: 'Duración fuera horario',
    obtenerValor: (registro) => {
      return registro.duracionFueraHorario !== null && registro.duracionFueraHorario !== undefined
        ? `${registro.duracionFueraHorario} horas`
        : 'N/A'
    },
    ancho: 180,
    formato: 'numero',
  },

  // ============ VIAJES ============
  'Total de viajes': {
    key: 'totalViajes',
    label: 'Total de viajes',
    obtenerValor: (registro) => {
      return registro.totalViajes !== null && registro.totalViajes !== undefined
        ? registro.totalViajes
        : 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  'Viajes dentro del horario': {
    key: 'viajesDentro',
    label: 'Viajes dentro horario',
    obtenerValor: (registro) => {
      return registro.viajesDentroHorario !== null && registro.viajesDentroHorario !== undefined
        ? registro.viajesDentroHorario
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  'Viajes fuera del horario': {
    key: 'viajesFuera',
    label: 'Viajes fuera horario',
    obtenerValor: (registro) => {
      return registro.viajesFueraHorario !== null && registro.viajesFueraHorario !== undefined
        ? registro.viajesFueraHorario
        : 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  // Incluir solo Conductor (no vehículo ni placa)
  Conductor: COLUMNAS_COMPARTIDAS['Conductor'],
}

/**
 * ============================================
 * CONFIGURACIÓN DE COLUMNAS POR TIPO
 * ============================================
 */
export const COLUMNAS_POR_TIPO = {
  eventos: COLUMNAS_EVENTOS,
  trayectos: COLUMNAS_TRAYECTOS,
  horas_trabajo: COLUMNAS_HORAS_TRABAJO,
}

/**
 * ============================================
 * COMPOSABLE PRINCIPAL
 * ============================================
 */
export function useColumnasReportes() {
  // Tipo de informe actual
  const tipoInformeActivo = ref('eventos')

  // Columnas seleccionadas por el usuario
  const columnasSeleccionadas = ref([])

  // Columna temporal para agregar
  const columnaAgregar = ref(null)

  // Mostrar resumen
  const mostrarResumen = ref(true)

  // Columnas disponibles filtradas (para el buscador)
  const columnasDisponiblesFiltradas = ref([])

  /**
   * Obtener columnas disponibles según el tipo activo
   */
  const columnasDisponibles = computed(() => {
    return COLUMNAS_POR_TIPO[tipoInformeActivo.value] || COLUMNAS_POR_TIPO.eventos
  })

  /**
   * Lista de nombres de columnas disponibles
   */
  const nombresColumnasDisponibles = computed(() => {
    return Object.keys(columnasDisponibles.value)
  })

  /**
   * Cambiar tipo de informe y resetear columnas
   */
  const cambiarTipoInforme = (nuevoTipo) => {
    tipoInformeActivo.value = nuevoTipo

    // Resetear columnas seleccionadas
    columnasSeleccionadas.value = []

    // Resetear columnas filtradas
    columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value

    console.log(`📊 Tipo de informe cambiado a: ${nuevoTipo}`)
    console.log(`📊 ${nombresColumnasDisponibles.value.length} columnas disponibles`)
  }

  /**
   * Agregar una columna
   */
  const agregarColumna = (nombreColumna) => {
    if (nombreColumna && !columnasSeleccionadas.value.includes(nombreColumna)) {
      columnasSeleccionadas.value.push(nombreColumna)
      columnaAgregar.value = null
      console.log(`✅ Columna agregada: ${nombreColumna}`)
    }
  }

  /**
   * Remover una columna
   */
  const removerColumna = (nombreColumna) => {
    const index = columnasSeleccionadas.value.indexOf(nombreColumna)
    if (index > -1) {
      columnasSeleccionadas.value.splice(index, 1)
      console.log(`❌ Columna removida: ${nombreColumna}`)
    }
  }

  /**
   * Filtrar columnas para el buscador
   */
  const filtrarColumnas = (val, update) => {
    update(() => {
      if (val === '') {
        columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value
      } else {
        const needle = val.toLowerCase()
        columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value.filter(
          (v) => v.toLowerCase().indexOf(needle) > -1,
        )
      }
    })
  }

  /**
   * Obtener configuración de columnas seleccionadas
   */
  const obtenerConfiguracionColumnas = () => {
    return columnasSeleccionadas.value
      .map((nombreCol) => {
        return columnasDisponibles.value[nombreCol]
      })
      .filter((col) => col !== undefined)
  }

  /**
   * Procesar datos con las columnas seleccionadas
   */
  const procesarDatosParaReporte = (datos) => {
    const configuracion = obtenerConfiguracionColumnas()

    return datos.map((dato) => {
      const fila = {}
      configuracion.forEach((col) => {
        fila[col.label] = col.obtenerValor(dato)
      })

      // 🔥 AGREGAR: Incluir datos adicionales necesarios para el mapa
      fila.coordenadas = dato.coordenadas || []
      fila.latitud = dato.latitud || dato.coordenadas?.[0]?.lat
      fila.longitud = dato.longitud || dato.coordenadas?.[0]?.lng
      fila.vehiculoId = dato.idUnidad || dato.vehiculoId
      fila.unidadId = dato.idUnidad || dato.unidadId
      fila.vehiculo = dato.unidadNombre || dato.vehiculo
      fila.unidad = dato.unidadNombre || dato.unidad
      fila.placa = dato.unidadPlaca || dato.placa

      return fila
    })
  }

  /**
   * Alias para compatibilidad con código existente
   */
  const procesarNotificacionesParaReporte = procesarDatosParaReporte

  /**
   * Generar resumen del reporte
   */
  const generarResumen = (datos) => {
    const resumen = {
      totalRegistros: datos.length,
      eventosPorTipo: {},
      eventosPorUbicacion: {},
      conductoresUnicos: new Set(),
      vehiculosUnicos: new Set(),
    }

    datos.forEach((dato) => {
      // Contar por tipo
      const tipo = dato.type || 'Sin tipo'
      resumen.eventosPorTipo[tipo] = (resumen.eventosPorTipo[tipo] || 0) + 1

      // Contar por ubicación
      const ubicacion = dato.ubicacionNombre || 'Sin ubicación'
      resumen.eventosPorUbicacion[ubicacion] = (resumen.eventosPorUbicacion[ubicacion] || 0) + 1

      // Conductores únicos
      if (dato.conductorNombre) {
        resumen.conductoresUnicos.add(dato.conductorNombre)
      }

      // Vehículos únicos
      if (dato.unidadNombre) {
        resumen.vehiculosUnicos.add(dato.unidadNombre)
      }
    })

    return {
      totalEventos: resumen.totalRegistros,
      eventosPorTipo: resumen.eventosPorTipo,
      eventosPorUbicacion: resumen.eventosPorUbicacion,
      conductoresUnicos: resumen.conductoresUnicos.size,
      vehiculosUnicos: resumen.vehiculosUnicos.size,
    }
  }

  /**
   * Resetear columnas a valores por defecto según tipo
   */
  const resetearColumnas = () => {
    const columnasPorDefecto = {
      eventos: ['Nombre de evento', 'Hora de inicio de evento', 'Conductor', 'Vehículo'],
      trayectos: [
        'Hora de inicio de trabajo',
        'Hora de fin de trabajo',
        'Kilometraje recorrido',
        'Conductor',
      ],
      horas_trabajo: [
        'Fecha',
        'Hora de inicio de trabajo',
        'Duración total de trabajo',
        'Conductor',
      ],
    }

    columnasSeleccionadas.value = columnasPorDefecto[tipoInformeActivo.value] || []
    console.log('🔄 Columnas reseteadas a valores por defecto')
  }

  // Inicializar con columnas por defecto
  resetearColumnas()
  columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value

  return {
    // Estado
    tipoInformeActivo,
    columnasSeleccionadas,
    columnaAgregar,
    mostrarResumen,
    columnasDisponiblesFiltradas,

    // Computados
    columnasDisponibles,
    nombresColumnasDisponibles,

    // Métodos
    cambiarTipoInforme,
    agregarColumna,
    removerColumna,
    filtrarColumnas,
    obtenerConfiguracionColumnas,
    procesarDatosParaReporte,
    procesarNotificacionesParaReporte,
    generarResumen,
    resetearColumnas,
  }
}

// Exportar columnas por tipo para uso directo si se necesita
export { COLUMNAS_EVENTOS, COLUMNAS_TRAYECTOS, COLUMNAS_HORAS_TRABAJO, COLUMNAS_COMPARTIDAS }
