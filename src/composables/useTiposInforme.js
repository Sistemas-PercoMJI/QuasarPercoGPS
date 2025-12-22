// composables/useTiposInforme.js
import { ref, computed } from 'vue'
/**
 * Configuración de tipos de informe
 * Define qué opciones mostrar para cada tipo
 */
export const TIPOS_INFORME = {
  EVENTOS: {
    id: 'eventos',
    label: 'Informe de Eventos',
    icon: 'event',
    descripcion: 'Reporte de eventos ocurridos en un período',
    opciones: {
      tipoReporte: true, // Por unidad / Por conductor
      seleccionarElementos: true, // Lista de unidades o conductores
      seleccionarEventos: true, // Lista de eventos
      metodoAgrupacion: true, // Por Evento / Por Día / Por Unidad
      seleccionFechas: true, // Rango de fechas
      seleccionColumnas: true, // Columnas del reporte
      generarArchivos: true, // PDF / Excel

      // Opciones NO disponibles
      diasLaborables: false,
      horarioLaboral: false,
      tipoInformeComercial: false,
      tipoDetalle: false,
      mostrarMapaTrayecto: false,
      mostrarMapaZona: false,
    },
  },

  TRAYECTOS: {
    id: 'trayectos',
    label: 'Informe de Trayectos',
    icon: 'route',
    descripcion: 'Reporte de rutas y recorridos realizados',
    opciones: {
      tipoReporte: true, // Por unidad / Por conductor
      seleccionarElementos: true, // Lista de unidades o conductores
      seleccionFechas: true, // Rango de fechas
      seleccionColumnas: true, // Columnas del reporte
      mostrarMapaTrayecto: true, // Toggle: Mostrar mapa
      mostrarUnidadesMapa: true, // Toggle: Mostrar unidades
      mostrarPlacaMapa: true, // Toggle: Mostrar placas
      generarArchivos: true, // PDF / Excel

      // Opciones NO disponibles
      seleccionarEventos: false,
      metodoAgrupacion: false,
      diasLaborables: false,
      horarioLaboral: false,
      tipoInformeComercial: false,
      tipoDetalle: false,
      mostrarMapaZona: false,
    },
  },

  HORAS_TRABAJO: {
    id: 'horas_trabajo',
    label: 'Informe de Horas de Trabajo',
    icon: 'schedule',
    descripcion: 'Reporte de horas laborales y productividad',
    opciones: {
      tipoReporte: true, // Por conductor / Por unidad
      seleccionarElementos: true, // Lista de unidades o conductores
      diasLaborables: true, // Lunes a Domingo (checkboxes)
      horarioLaboral: true, // Hora inicio - Hora fin
      tipoInformeComercial: true, // Todos / Dentro / Fuera horario
      seleccionFechas: true, // Rango de fechas
      tipoDetalle: true, // Días detallados / Viajes / Resumido
      seleccionColumnas: true, // Columnas del reporte
      mostrarMapaZona: true, // Toggle: Mostrar mapa
      generarArchivos: true, // PDF / Excel

      // Opciones NO disponibles
      seleccionarEventos: false,
      metodoAgrupacion: false,
      mostrarMapaTrayecto: false,
      mostrarUnidadesMapa: false,
      mostrarPlacaMapa: false,
    },
  },
}

/**
 * Opciones para método de agrupación (solo Eventos)
 */
export const METODOS_AGRUPACION = [
  { label: 'Por Evento', value: 'evento' },
  { label: 'Por Día', value: 'dia' },
  { label: 'Por Unidad', value: 'unidad' },
]

/**
 * Opciones para tipo de informe comercial (solo Horas de Trabajo)
 */
export const TIPOS_INFORME_COMERCIAL = [
  { label: 'Mostrar todos los viajes', value: 'todos' },
  { label: 'Solo viajes dentro del horario comercial', value: 'dentro' },
  { label: 'Viajes fuera del horario comercial', value: 'fuera' },
]

/**
 * Opciones para tipo de detalle (solo Horas de Trabajo)
 */
export const TIPOS_DETALLE = [
  { label: 'Días detallados (resumen + viajes)', value: 'dias_detallados' },
  { label: 'Viajes detallados', value: 'viajes_detallados' },
  { label: 'Días resumidos', value: 'dias_resumidos' },
]

/**
 * Días de la semana
 */
export const DIAS_SEMANA = [
  { label: 'Lunes', value: 1, abrev: 'L' },
  { label: 'Martes', value: 2, abrev: 'M' },
  { label: 'Miércoles', value: 3, abrev: 'X' },
  { label: 'Jueves', value: 4, abrev: 'J' },
  { label: 'Viernes', value: 5, abrev: 'V' },
  { label: 'Sábado', value: 6, abrev: 'S' },
  { label: 'Domingo', value: 0, abrev: 'D' },
]

/**
 * Composable para manejar tipos de informe
 */
export function useTiposInforme() {
  // Estado actual del tipo de informe seleccionado
  const tipoInformeSeleccionado = ref(TIPOS_INFORME.EVENTOS.id)

  let instanciaColumnas = null

  const setInstanciaColumnas = (instancia) => {
    instanciaColumnas = instancia
  }
  const cambiarTipoInforme = (nuevoTipo) => {
    tipoInformeSeleccionado.value = nuevoTipo

    // 🔥 AGREGAR: Cambiar columnas también
    if (instanciaColumnas && instanciaColumnas.cambiarTipoInforme) {
      instanciaColumnas.cambiarTipoInforme(nuevoTipo)
    }
  }

  // Configuración del tipo actual
  const configuracionActual = computed(() => {
    return Object.values(TIPOS_INFORME).find((tipo) => tipo.id === tipoInformeSeleccionado.value)
  })

  // Opciones disponibles para el tipo actual
  const opcionesDisponibles = computed(() => {
    return configuracionActual.value?.opciones || {}
  })

  // Lista de tipos de informe para el selector
  const listaTiposInforme = computed(() => {
    return Object.values(TIPOS_INFORME).map((tipo) => ({
      label: tipo.label,
      value: tipo.id,
      icon: tipo.icon,
      descripcion: tipo.descripcion,
    }))
  })

  const tieneOpcion = (nombreOpcion) => {
    return opcionesDisponibles.value[nombreOpcion] === true
  }

  const labelTipoActual = computed(() => {
    return configuracionActual.value?.label || ''
  })

  /**
   * Obtener icono del tipo actual
   */
  const iconoTipoActual = computed(() => {
    return configuracionActual.value?.icon || 'description'
  })

  return {
    // Estado
    tipoInformeSeleccionado,
    configuracionActual,
    opcionesDisponibles,
    listaTiposInforme,

    // Computados
    labelTipoActual,
    iconoTipoActual,

    // Métodos
    cambiarTipoInforme,
    tieneOpcion,

    // Constantes
    TIPOS_INFORME,
    METODOS_AGRUPACION,
    TIPOS_INFORME_COMERCIAL,
    TIPOS_DETALLE,
    DIAS_SEMANA,
    setInstanciaColumnas,
  }
}
