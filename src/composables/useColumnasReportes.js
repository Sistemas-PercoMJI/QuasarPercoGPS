// src/composables/useColumnasReportes.js
// 📊 SISTEMA DE COLUMNAS DINÁMICAS PARA TODOS LOS TIPOS DE REPORTES

import { ref, computed } from 'vue'
import { usePreferenciasReportes } from './usePreferenciasReportes'

/**
 * ============================================
 * COLUMNAS COMPARTIDAS (usadas en múltiples tipos)
 * ============================================
 */
const COLUMNAS_COMPARTIDAS = {
  Conductor: {
    key: 'conductor',
    label: 'Conductor',
    obtenerValor: (dato) => dato.conductorNombre || dato.conductor_nombre || 'Sin conductor', // 🔥 AGREGADO conductor_nombre
    ancho: 180,
    formato: 'texto',
  },

  Vehículo: {
    key: 'vehiculo',
    label: 'Vehículo',
    obtenerValor: (dato) => {
      // 🔥 CORREGIDO: Buscar en múltiples campos posibles
      return (
        dato.unidadNombre || dato.vehiculoNombre || dato.vehiculo || dato.unidad || 'Sin vehículo'
      )
    },
    ancho: 180,
    formato: 'texto',
  },

  Placa: {
    key: 'placa',
    label: 'Placa',
    obtenerValor: (dato) => {
      // 🔥 BUSCAR EN MÚLTIPLES PROPIEDADES
      return dato.Placa || dato.placa || dato.unidadPlaca || 'Sin placa'
    },
    ancho: 100,
    formato: 'texto',
  },
}

export const COLUMNAS_DEFAULT = {
  eventos: ['Nombre de evento', 'Hora de inicio de evento', 'Conductor', 'Vehículo', 'Tipo'],
  trayectos: [
    'Hora de inicio de trabajo',
    'Ubicación de inicio de trabajo',
    'Hora de fin de trabajo',
    'Ubicación de fin de trabajo',
    'Duración del trayecto',
    'Kilometraje recorrido',
  ],
  horas_trabajo: [
    'Fecha',
    'Hora de inicio de trabajo',
    'Hora de fin de trabajo',
    'Duración total de trabajo',
    'Duración dentro del horario comercial',
    'Duración fuera del horario comercial',
  ],
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

  Tipo: {
    // 🔥 KEY = label
    key: 'tipoEvento',
    label: 'Tipo',
    obtenerValor: (notificacion) => {
      const tipo = notificacion.tipoEvento || notificacion.TipoEvento

      if (!tipo || tipo === 'desconocido') return 'N/A'

      if (tipo === 'Entrada' || tipo === 'Salida') {
        return tipo
      }

      const tiposMap = {
        positive: 'Entrada',
        warning: 'Salida',
        info: 'Dentro',
        negative: 'Fuera',
        entrada: 'Entrada',
        salida: 'Salida',
      }

      return tiposMap[tipo.toLowerCase()] || tipo
    },
    ancho: 120,
    formato: 'texto',
  },
  'Hora de inicio de evento': {
    key: 'horaInicio',
    label: 'Hora de inicio de evento',
    obtenerValor: (notificacion) => {
      const timestamp = notificacion.timestamp

      if (!timestamp) {
        return 'N/A'
      }

      try {
        if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
          return timestamp.toLocaleTimeString('es-MX', {
            // ← 🔥 CAMBIADO
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        }

        return 'N/A'
      } catch (error) {
        console.error('❌ Error al formatear hora:', error)
        return 'N/A'
      }
    },
    ancho: 120, // ← 🔥 También reduje el ancho (era 180)
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
      // 🔥 Buscar duración en segundos
      const segundos = notificacion.duracionSegundos ?? notificacion.DuracionDentro ?? null

      if (segundos !== null && segundos !== undefined && segundos > 0) {
        const horas = Math.floor(segundos / 3600)
        const minutos = Math.floor((segundos % 3600) / 60)
        const segs = segundos % 60

        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
      }

      return 'N/A'
    },
    align: 'center',
    sortable: true,
  },

  'Condición de evento': {
    key: 'condicion',
    label: 'Condición',
    obtenerValor: (notificacion) => {
      // Si ya tiene una acción definida, usarla
      if (notificacion.accion && notificacion.accion !== 'N/A') {
        return notificacion.accion
      }

      // Obtener valores
      const tipo = notificacion.tipoEvento || notificacion.TipoEvento
      const tipoUbicacion = notificacion.tipoUbicacion
      const nombreUbicacion =
        notificacion.geozonaNombre || notificacion.ubicacionNombre || notificacion.eventoNombre

      // Normalizar tipo de evento
      let tipoTexto = tipo
      if (tipo === 'Entrada' || tipo === 'entrada' || tipo === 'positive') {
        tipoTexto = 'Entrada'
      } else if (tipo === 'Salida' || tipo === 'salida' || tipo === 'warning') {
        tipoTexto = 'Salida'
      }
      // 🔥 DEBUG PASO A PASO
      // 🔥 CONSTRUCCIÓN PASO A PASO (más seguro)
      if (!tipoTexto) return 'N/A'
      if (!nombreUbicacion) return 'N/A'

      // Con tipo de ubicación
      if (tipoUbicacion) {
        return `${tipoTexto} a ${tipoUbicacion}: ${nombreUbicacion}`
      }

      // Sin tipo de ubicación (fallback)
      return `${tipoTexto}: ${nombreUbicacion}`
    },
    ancho: 250,
    formato: 'texto',
  },
  Mensaje: {
    key: 'mensaje',
    label: 'Mensaje',
    obtenerValor: (notificacion) => {
      return (
        notificacion.mensaje || notificacion.message || notificacion.eventoNombre || 'Sin mensaje'
      )
    },
    ancho: 250,
    formato: 'texto',
  },
  // ============ UBICACIÓN ============
  Ubicación: {
    // 🔥 KEY = label
    key: 'ubicacion',
    label: 'Ubicación',
    obtenerValor: (notificacion) => {
      return notificacion.geozonaNombre || notificacion.ubicacionNombre || 'Sin ubicación'
    },
    ancho: 200,
    formato: 'texto',
  },
  'Tipo de ubicación': {
    key: 'tipoUbicacion',
    label: 'Tipo de ubicación',
    obtenerValor: (notificacion) => {
      // 🔥 Verificar múltiples campos
      return notificacion.tipoUbicacion || notificacion.tipo_ubicacion || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },
  Geozona: {
    key: 'geozona',
    label: 'Geozona',
    obtenerValor: (notificacion) => {
      // 🔥 CORREGIDO: Soportar múltiples campos
      return (
        notificacion.geozonaNombre ||
        notificacion.GeozonaNombre ||
        notificacion.ubicacionNombre ||
        (notificacion.tipoUbicacion === 'Geozona' ? notificacion.ubicacionNombre : null) ||
        'N/A'
      )
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
      // 🔥 CORREGIDO:
      if (notificacion.coordenadas?.lat && notificacion.coordenadas?.lng) {
        return `${notificacion.coordenadas.lat.toFixed(6)}, ${notificacion.coordenadas.lng.toFixed(6)}`
      }
      return 'N/A'
    },
    ancho: 200,
    formato: 'texto',
  },

  Dirección: {
    key: 'direccion',
    label: 'Dirección',
    obtenerValor: (notificacion) => {
      // 🔥 CAMBIA ESTO:
      if (notificacion.direccion && notificacion.direccion !== 'Sin dirección') {
        return notificacion.direccion
      }

      // Si solo tiene coordenadas, mostrarlas
      if (notificacion.coordenadas?.lat && notificacion.coordenadas?.lng) {
        return `${notificacion.coordenadas.lat.toFixed(6)}, ${notificacion.coordenadas.lng.toFixed(6)}`
      }

      return 'N/A'
    },
    ancho: 250,
    formato: 'texto',
  },

  // ============ DATOS TÉCNICOS ============
  Velocidad: {
    key: 'velocidad',
    label: 'Velocidad',
    obtenerValor: (notificacion) => {
      // 🔥 CAMBIA ESTO:
      const velocidad = notificacion.velocidad ?? 0 // Usar ?? en lugar de ||
      return velocidad !== null && velocidad !== undefined ? `${velocidad} km/h` : 'N/A'
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
    oculta: true,
  },

  Ignición: {
    key: 'ignicion',
    label: 'Ignición',
    obtenerValor: (notificacion) => {
      if (notificacion.ignicion === true) return 'Encendida'
      if (notificacion.ignicion === false) return 'Apagada'

      // 🔥 INFERIR por velocidad
      const velocidad = notificacion.velocidad ?? 0
      if (velocidad > 0) return 'Encendida'
      return 'Apagada' // 🔥 En lugar de N/A
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

      // Manejar si es Date object o timestamp
      const fecha =
        trayecto.inicioTimestamp instanceof Date
          ? trayecto.inicioTimestamp
          : new Date(trayecto.inicioTimestamp)

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
    label: 'Ubicación de inicio de trabajo',
    obtenerValor: (trayecto) => trayecto.ubicacionInicio || trayecto.inicioDireccion || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Kilometraje al inicio': {
    key: 'kilometrajeInicio',
    label: 'Kilometraje al inicio',
    obtenerValor: (trayecto) => {
      // 🔥 PRIORIDAD 1: Usar odómetro del hardware si existe
      if (
        trayecto.odometroInicio !== null &&
        trayecto.odometroInicio !== undefined &&
        trayecto.odometroInicio > 0
      ) {
        return `${trayecto.odometroInicio} km`
      }

      // 🔥 PRIORIDAD 2: Usar odómetro virtual como fallback
      if (trayecto.odometroVirtual !== null && trayecto.odometroVirtual !== undefined) {
        return `${trayecto.odometroVirtual} km`
      }

      return 'N/A'
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

      // Manejar si es Date object o timestamp
      const fecha =
        trayecto.finTimestamp instanceof Date
          ? trayecto.finTimestamp
          : new Date(trayecto.finTimestamp)

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
    label: 'Ubicación de fin de trabajo',
    obtenerValor: (trayecto) => trayecto.ubicacionFin || trayecto.finDireccion || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Kilometraje al final': {
    key: 'kilometrajeFinal',
    label: 'Kilometraje al final',
    obtenerValor: (trayecto) => {
      // 🔥 PRIORIDAD 1: Usar odómetro del hardware si existe
      if (
        trayecto.odometroFin !== null &&
        trayecto.odometroFin !== undefined &&
        trayecto.odometroFin > 0
      ) {
        return `${trayecto.odometroFin} km`
      }

      // 🔥 PRIORIDAD 2: Calcular con odómetro virtual
      if (
        trayecto.odometroVirtual !== null &&
        trayecto.odometroVirtual !== undefined &&
        trayecto.kilometrajeRecorrido !== null &&
        trayecto.kilometrajeRecorrido !== undefined
      ) {
        const kmFinal = trayecto.odometroVirtual + trayecto.kilometrajeRecorrido
        return `${kmFinal.toFixed(2)} km`
      }

      return 'N/A'
    },
    ancho: 150,
    formato: 'numero',
  },

  // ============ DATOS CALCULADOS ============
  'Duración del trayecto': {
    key: 'duracionTrayecto',
    label: 'Duración del trayecto',
    obtenerValor: (trayecto) => {
      // 🔥 PRIORIDAD 1: duracion en milisegundos
      if (trayecto.duracion && trayecto.duracion > 0) {
        const duracionMs = trayecto.duracion
        const horas = Math.floor(duracionMs / 3600000)
        const minutos = Math.floor((duracionMs % 3600000) / 60000)
        const segundos = Math.floor((duracionMs % 60000) / 1000)
        return `${horas}h ${minutos}m ${segundos}s`
      }

      // 🔥 PRIORIDAD 2: duracionHoras
      if (trayecto.duracionHoras) {
        const horas = Math.floor(parseFloat(trayecto.duracionHoras))
        const minutos = Math.floor((parseFloat(trayecto.duracionHoras) - horas) * 60)
        return `${horas}h ${minutos}m`
      }

      // 🔥 PRIORIDAD 3: calcular desde timestamps
      if (trayecto.inicioTimestamp && trayecto.finTimestamp) {
        const inicio =
          trayecto.inicioTimestamp instanceof Date
            ? trayecto.inicioTimestamp
            : new Date(trayecto.inicioTimestamp)
        const fin =
          trayecto.finTimestamp instanceof Date
            ? trayecto.finTimestamp
            : new Date(trayecto.finTimestamp)

        const duracionMs = fin - inicio
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

  'Tipo de odómetro': {
    key: 'tipoOdometro',
    label: 'Tipo de odómetro',
    obtenerValor: (trayecto) => {
      // 🔥 Detectar si tiene datos del hardware
      if (trayecto.odometroInicio > 0 && trayecto.odometroFin > 0) {
        return 'Hardware'
      }

      // 🔥 Si no, es virtual
      if (trayecto.odometroVirtual !== null && trayecto.odometroVirtual !== undefined) {
        return 'Virtual'
      }

      return 'N/A'
    },
    ancho: 120,
    formato: 'texto',
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
  // ============ JORNADA LABORAL (para registros de día completo) ============
  Fecha: {
    key: 'fecha',
    label: 'Fecha',
    obtenerValor: (item) => {
      // Funciona tanto para registro como para viaje (hereda del padre)
      const fecha = item.fecha
      if (!fecha) return 'N/A'

      // Si es string formato YYYY-MM-DD
      if (typeof fecha === 'string') {
        const [year, month, day] = fecha.split('-')
        return `${day}/${month}/${year}`
      }

      // Si es Date object
      const fechaObj = new Date(fecha)
      return fechaObj.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    },
    ancho: 100,
    formato: 'fecha',
  },

  // ============ VIAJE INDIVIDUAL ============
  'Hora de inicio de trabajo': {
    key: 'horaInicio',
    label: 'Hora de inicio de trabajo',
    obtenerValor: (item) => {
      // Prioridad: horaInicio (viaje) > horaInicioTrabajo (registro día)
      return item.horaInicio || item.horaInicioTrabajo || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Ubicación de inicio de trabajo': {
    key: 'ubicacionInicio',
    label: 'Ubicación de inicio de trabajo',
    obtenerValor: (item) => item.ubicacionInicio || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  'Hora de fin de trabajo': {
    key: 'horaFin',
    label: 'Hora de fin de trabajo',
    obtenerValor: (item) => {
      // Prioridad: horaFin (viaje) > horaFinTrabajo (registro día)
      return item.horaFin || item.horaFinTrabajo || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Ubicación de fin de trabajo': {
    key: 'ubicacionFin',
    label: 'Ubicación de fin de trabajo',
    obtenerValor: (item) => item.ubicacionFin || 'N/A',
    ancho: 250,
    formato: 'texto',
  },

  // ============ DURACIONES (funcionan para ambos) ============
  'Duración total de trabajo': {
    key: 'duracionTotal',
    label: 'Duración total de trabajo',
    obtenerValor: (item) => {
      // Funciona tanto para viaje como para registro de día
      return item.duracionTotal || 'N/A'
    },
    ancho: 120,
    formato: 'texto',
  },

  'Duración dentro del horario comercial': {
    key: 'duracionDentro',
    label: 'Duración dentro del horario comercial',
    obtenerValor: (item) => {
      // Prioridad: duracionDentro (viaje) > duracionDentroHorario (registro día)
      return item.duracionDentro || item.duracionDentroHorario || 'N/A'
    },
    ancho: 150,
    formato: 'texto',
  },

  'Duración fuera del horario comercial': {
    key: 'duracionFuera',
    label: 'Duración fuera del horario comercial',
    obtenerValor: (item) => {
      // Prioridad: duracionFuera (viaje) > duracionFueraHorario (registro día)
      return item.duracionFuera || item.duracionFueraHorario || 'N/A'
    },
    ancho: 150,
    formato: 'texto',
  },

  // ============ MÉTRICAS AGREGADAS (solo para registros de día) ============
  'Total de viajes': {
    key: 'totalViajes',
    label: 'Total de viajes',
    obtenerValor: (item) => {
      const total = item.totalViajes
      return total !== null && total !== undefined ? total : 'N/A'
    },
    ancho: 100,
    formato: 'numero',
  },

  'Viajes dentro del horario': {
    key: 'viajesDentroHorario',
    label: 'Viajes dentro del horario',
    obtenerValor: (item) => {
      const viajes = item.viajesDentroHorario
      return viajes !== null && viajes !== undefined ? viajes : 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  'Viajes fuera del horario': {
    key: 'viajesFueraHorario',
    label: 'Viajes fuera del horario',
    obtenerValor: (item) => {
      const viajes = item.viajesFueraHorario
      return viajes !== null && viajes !== undefined ? viajes : 'N/A'
    },
    ancho: 120,
    formato: 'numero',
  },

  // Incluir solo Conductor (no vehículo ni placa, se agregan en headers)
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
  const { obtenerColumnasGuardadas, guardarColumnasSeleccionadas, resetearPreferencias } =
    usePreferenciasReportes()

  // Tipo de informe actual
  const tipoInformeActivo = ref('eventos')

  // Columnas seleccionadas por el usuario
  const columnasSeleccionadas = ref([])

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
    const todasLasColumnas = columnasDisponibles.value

    return Object.entries(todasLasColumnas)
      .filter(([, config]) => !config.oculta)
      .map(([nombre]) => nombre)
  })

  /**
   * 🆕 Cargar columnas guardadas o usar defaults
   */
  const cargarColumnasIniciales = (tipo) => {
    const columnasGuardadas = obtenerColumnasGuardadas(tipo)

    if (columnasGuardadas && columnasGuardadas.length > 0) {
      return [...columnasGuardadas]
    } else {
      return [...COLUMNAS_DEFAULT[tipo]]
    }
  }

  /**
   * Cambiar tipo de informe y cargar columnas apropiadas
   */
  const cambiarTipoInforme = (nuevoTipo) => {
    tipoInformeActivo.value = nuevoTipo
    columnasSeleccionadas.value = cargarColumnasIniciales(nuevoTipo)
    columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value
  }

  /**
   * 🆕 Guardar columnas seleccionadas actuales
   */
  const guardarColumnasActuales = () => {
    if (columnasSeleccionadas.value.length > 0) {
      guardarColumnasSeleccionadas(tipoInformeActivo.value, columnasSeleccionadas.value)
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
      const tipo = dato.tipoEvento || dato.TipoEvento || 'Sin tipo'
      resumen.eventosPorTipo[tipo] = (resumen.eventosPorTipo[tipo] || 0) + 1

      const ubicacion =
        dato.ubicacionNombre || dato.geozonaNombre || dato.GeozonaNombre || 'Sin ubicación'
      resumen.eventosPorUbicacion[ubicacion] = (resumen.eventosPorUbicacion[ubicacion] || 0) + 1

      if (dato.conductorNombre) {
        const nombreLimpio = dato.conductorNombre.replace(/\s*undefined\s*/gi, '').trim()
        if (nombreLimpio) {
          resumen.conductoresUnicos.add(nombreLimpio)
        }
      }

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
   * 🔄 Resetear columnas a valores por defecto
   */
  const resetearColumnas = () => {
    columnasSeleccionadas.value = [...COLUMNAS_DEFAULT[tipoInformeActivo.value]]
    resetearPreferencias(tipoInformeActivo.value)
  }

  // 🚀 INICIALIZACIÓN (solo una vez)
  columnasSeleccionadas.value = cargarColumnasIniciales(tipoInformeActivo.value)
  columnasDisponiblesFiltradas.value = nombresColumnasDisponibles.value

  return {
    // Estado
    tipoInformeActivo,
    columnasSeleccionadas,
    mostrarResumen,
    columnasDisponiblesFiltradas,

    // Computados
    columnasDisponibles,
    nombresColumnasDisponibles,

    // Métodos
    cambiarTipoInforme,
    removerColumna,
    filtrarColumnas,
    obtenerConfiguracionColumnas,
    procesarDatosParaReporte,
    procesarNotificacionesParaReporte,
    generarResumen,
    resetearColumnas,
    guardarColumnasActuales, // 👈 Para guardar al generar reporte
  }
}

// Exportar columnas por tipo para uso directo si se necesita
export { COLUMNAS_EVENTOS, COLUMNAS_TRAYECTOS, COLUMNAS_HORAS_TRABAJO, COLUMNAS_COMPARTIDAS }
