// composables/useTiposInforme.js
import { ref, computed } from 'vue'

export const TIPOS_INFORME = {
  EVENTOS: {
    id: 'eventos',
    label: 'Informe de Eventos',
    icon: 'event',
    descripcion: 'Reporte de eventos ocurridos en un período',
    opciones: {
      tipoReporte: true,
      seleccionarElementos: true,
      seleccionarEventos: true,
      metodoAgrupacion: true,
      seleccionFechas: true,
      seleccionColumnas: true,
      generarArchivos: true,
      diasLaborables: false,
      horarioLaboral: false,
      tipoInformeComercial: false,
      tipoDetalle: false,
      mostrarMapaTrayecto: false,
      mostrarMapaZona: false,
      mostrarMapaIgnicion: false,
    },
  },

  TRAYECTOS: {
    id: 'trayectos',
    label: 'Informe de Trayectos',
    icon: 'route',
    descripcion: 'Reporte de rutas y recorridos realizados',
    opciones: {
      tipoReporte: true,
      seleccionarElementos: true,
      seleccionFechas: true,
      seleccionColumnas: true,
      mostrarMapaTrayecto: true,
      mostrarUnidadesMapa: true,
      mostrarPlacaMapa: true,
      generarArchivos: true,
      seleccionarEventos: false,
      metodoAgrupacion: false,
      diasLaborables: false,
      horarioLaboral: false,
      tipoInformeComercial: false,
      tipoDetalle: false,
      mostrarMapaZona: false,
      mostrarMapaIgnicion: false,
    },
  },

  HORAS_TRABAJO: {
    id: 'horas_trabajo',
    label: 'Informe de Horas de Trabajo',
    icon: 'schedule',
    descripcion: 'Reporte de horas laborales y productividad',
    opciones: {
      tipoReporte: true,
      seleccionarElementos: true,
      diasLaborables: true,
      horarioLaboral: true,
      tipoInformeComercial: true,
      seleccionFechas: true,
      tipoDetalle: true,
      seleccionColumnas: true,
      mostrarMapaZona: true,
      generarArchivos: true,
      seleccionarEventos: false,
      metodoAgrupacion: false,
      mostrarMapaTrayecto: false,
      mostrarUnidadesMapa: false,
      mostrarPlacaMapa: false,
      mostrarMapaIgnicion: false,
    },
  },

  IGNICION_DIA: {
    id: 'ignicion_dia',
    label: 'Informe de Primera/Última Ignición',
    icon: 'power_settings_new',
    descripcion: 'Primera y última ignición del vehículo por día',
    opciones: {
      tipoReporte: true,
      seleccionarElementos: true,
      seleccionFechas: true,
      seleccionColumnas: true,
      mostrarMapaIgnicion: true,
      generarArchivos: true,
      // Opciones no disponibles
      seleccionarEventos: false,
      metodoAgrupacion: false,
      diasLaborables: false,
      horarioLaboral: false,
      tipoInformeComercial: false,
      tipoDetalle: false,
      mostrarMapaTrayecto: false,
      mostrarUnidadesMapa: false,
      mostrarPlacaMapa: false,
      mostrarMapaZona: false,
    },
  },
}

export const METODOS_AGRUPACION = [
  { label: 'Por Evento', value: 'evento' },
  { label: 'Por Día', value: 'dia' },
  { label: 'Por Unidad', value: 'unidad' },
]

export const TIPOS_INFORME_COMERCIAL = [
  { label: 'Mostrar todos los viajes', value: 'todos' },
  { label: 'Solo viajes dentro del horario comercial', value: 'dentro' },
  { label: 'Viajes fuera del horario comercial', value: 'fuera' },
]

export const TIPOS_DETALLE = [
  { label: 'Días detallados (resumen + viajes)', value: 'dias_detallados' },
  { label: 'Viajes detallados', value: 'viajes_detallados' },
  { label: 'Días resumidos', value: 'dias_resumidos' },
]

export const DIAS_SEMANA = [
  { label: 'Lunes', value: 1, abrev: 'L' },
  { label: 'Martes', value: 2, abrev: 'M' },
  { label: 'Miércoles', value: 3, abrev: 'X' },
  { label: 'Jueves', value: 4, abrev: 'J' },
  { label: 'Viernes', value: 5, abrev: 'V' },
  { label: 'Sábado', value: 6, abrev: 'S' },
  { label: 'Domingo', value: 0, abrev: 'D' },
]

export function useTiposInforme() {
  const tipoInformeSeleccionado = ref(TIPOS_INFORME.EVENTOS.id)

  let instanciaColumnas = null

  const setInstanciaColumnas = (instancia) => {
    instanciaColumnas = instancia
  }

  const cambiarTipoInforme = (nuevoTipo) => {
    tipoInformeSeleccionado.value = nuevoTipo
    if (instanciaColumnas && instanciaColumnas.cambiarTipoInforme) {
      instanciaColumnas.cambiarTipoInforme(nuevoTipo)
    }
  }

  const configuracionActual = computed(() => {
    return Object.values(TIPOS_INFORME).find((tipo) => tipo.id === tipoInformeSeleccionado.value)
  })

  const opcionesDisponibles = computed(() => {
    return configuracionActual.value?.opciones || {}
  })

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

  const iconoTipoActual = computed(() => {
    return configuracionActual.value?.icon || 'description'
  })

  return {
    tipoInformeSeleccionado,
    configuracionActual,
    opcionesDisponibles,
    listaTiposInforme,
    labelTipoActual,
    iconoTipoActual,
    cambiarTipoInforme,
    tieneOpcion,
    TIPOS_INFORME,
    METODOS_AGRUPACION,
    TIPOS_INFORME_COMERCIAL,
    TIPOS_DETALLE,
    DIAS_SEMANA,
    setInstanciaColumnas,
  }
}
