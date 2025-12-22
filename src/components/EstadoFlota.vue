<template>
  <div class="estado-flota-wrapper">
    <!-- Header principal -->
    <div class="flota-header">
      <div class="header-content">
        <q-btn
          v-if="vehiculoSeleccionado"
          flat
          dense
          round
          icon="arrow_back"
          color="white"
          @click="volverALista"
          class="back-btn"
        />
        <div class="header-title">
          <span v-if="!vehiculoSeleccionado">Estado de la flota</span>
          <span v-else class="vehiculo-nombre">{{ vehiculoSeleccionado.nombre }}</span>
        </div>
      </div>
      <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" class="close-btn" />
    </div>

    <!-- Vista de Lista de Vehículos -->
    <div v-show="!vehiculoSeleccionado" class="vista-lista">
      <!-- Grid de estados (ahora más compacto) -->
      <div class="estados-container">
        <div class="estados-grid compact-grid">
          <div
            v-for="estado in estadosVehiculos"
            :key="estado.tipo"
            class="estado-card compact-card"
            :class="{ 'estado-activo': estadoSeleccionado === estado.tipo }"
            @click="seleccionarEstado(estado)"
          >
            <q-icon :name="estado.icono" size="20px" :color="estado.color" />
            <div class="estado-badge" :style="{ backgroundColor: getColorHex(estado.color) }">
              {{ estado.cantidad }}
            </div>
          </div>
        </div>
      </div>

      <!-- Búsqueda -->
      <div class="search-container">
        <q-input
          v-model="busqueda"
          outlined
          dense
          placeholder="Buscar vehículo..."
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-6" />
          </template>
          <template v-slot:append v-if="busqueda">
            <q-icon name="close" class="cursor-pointer" @click="busqueda = ''" />
          </template>
        </q-input>
      </div>

      <!-- Header de tabla -->
      <div class="tabla-header">
        <div class="header-col">Vehículo</div>
        <div class="header-col-velocidad">Velocidad</div>
        <div class="header-col-acciones">Acciones</div>
      </div>

      <!-- Lista de vehículos -->
      <q-scroll-area class="vehiculos-scroll-area">
        <q-list class="vehiculos-list">
          <q-item
            v-for="vehiculo in vehiculosFiltrados"
            :key="vehiculo.id"
            clickable
            v-ripple
            @click="seleccionarVehiculoParaMapa(vehiculo)"
            class="vehiculo-item"
          >
            <q-item-section avatar>
              <q-avatar
                :style="{ backgroundColor: getColorHex(getColorEstado(vehiculo.estado)) }"
                text-color="white"
                size="44px"
              >
                <q-icon :name="getIconoEstado(vehiculo.estado)" size="22px" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="vehiculo-nombre-item">
                {{ vehiculo.nombre }}
              </q-item-label>
              <q-item-label caption class="vehiculo-ubicacion">
                <q-icon name="place" size="14px" class="q-mr-xs" />
                {{ vehiculo.ubicacion }}
              </q-item-label>
            </q-item-section>

            <q-item-section side class="velocidad-section">
              <div class="velocidad-badge">
                {{ vehiculo.velocidad }}
              </div>
            </q-item-section>

            <q-item-section side class="acciones-section">
              <q-btn
                flat
                dense
                round
                icon="arrow_forward_ios"
                color="primary"
                @click.stop="seleccionarVehiculo(vehiculo)"
                class="btn-detalles"
              >
                <q-tooltip>Ver detalles</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </div>

    <!-- Vista de Detalles del Vehículo -->
    <transition name="slide-right">
      <div v-if="vehiculoSeleccionado" class="vista-detalles">
        <!-- Tabs de navegación -->
        <q-tabs
          v-model="tabActual"
          dense
          class="tabs-vehiculo"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="resumen" icon="description" class="tab-item" />
          <q-tab name="hoy" icon="schedule" class="tab-item" />
          <q-tab name="notificaciones" icon="notifications" class="tab-item">
            <q-badge
              v-if="vehiculoSeleccionado && vehiculoSeleccionado.notificaciones > 0"
              color="red"
              floating
              rounded
            >
              {{ vehiculoSeleccionado.notificaciones }}
            </q-badge>
          </q-tab>
        </q-tabs>

        <!-- Contenido de las tabs -->
        <q-scroll-area class="tab-content-scroll">
          <q-tab-panels
            v-if="vehiculoSeleccionado"
            v-model="tabActual"
            animated
            class="tab-panels-content"
          >
            <!-- Tab Resumen -->
            <q-tab-panel name="resumen" class="tab-panel-padding">
              <!-- Ubicación actual -->
              <div class="info-card ubicacion-card">
                <div class="info-icon-wrapper">
                  <q-icon name="place" color="primary" size="24px" />
                </div>
                <div class="info-content">
                  <div class="info-label">Ubicación actual</div>
                  <div class="info-valor">{{ vehiculoSeleccionado.ubicacion }}</div>
                  <div class="info-coordenadas">
                    <q-icon name="my_location" size="14px" class="q-mr-xs" />
                    {{ vehiculoSeleccionado.coordenadas }}
                  </div>
                </div>
              </div>

              <!-- Detalles -->
              <div class="detalles-grid">
                <!-- Estado actual -->
                <div class="detalle-row">
                  <span class="detalle-label">Estado actual</span>
                  <q-chip
                    dense
                    :style="{
                      backgroundColor: getColorHex(getColorEstado(vehiculoSeleccionado.estado)),
                    }"
                    text-color="white"
                  >
                    {{ getEstadoTexto(vehiculoSeleccionado.estado) }}
                  </q-chip>
                </div>

                <q-separator class="separator" />

                <!-- 🆕 Indicador de carga mientras se obtienen estadísticas -->
                <div v-if="loadingEstadisticas" class="detalle-row">
                  <q-spinner color="primary" size="20px" />
                  <span class="detalle-label">Cargando estadísticas...</span>
                </div>

                <template v-else>
                  <!-- Tiempo de conducción hoy -->
                  <div class="detalle-row">
                    <span class="detalle-label">Tiempo de conducción hoy: </span>
                    <span class="detalle-valor">
                      {{ estadisticasVehiculo?.tiempoConductionHoy || '0h 0m' }}
                    </span>
                  </div>
                </template>

                <q-separator class="separator" />

                <!-- Última sincronización -->
                <div class="detalle-row">
                  <span class="detalle-label">
                    <q-icon name="sync" size="16px" class="q-mr-xs" />
                    Última sincronización
                  </span>
                  <span class="detalle-valor-small">
                    {{ vehiculoSeleccionado.ultimaSincronizacion }}
                  </span>
                </div>

                <!-- Fecha y hora -->
                <div class="detalle-row">
                  <span class="detalle-label">
                    <q-icon name="schedule" size="16px" class="q-mr-xs" />
                    Fecha y hora
                  </span>
                  <span class="detalle-valor-small">{{ vehiculoSeleccionado.fechaHora }}</span>
                </div>

                <!-- ❌ ELIMINADO: Tipo de trayecto -->
              </div>
            </q-tab-panel>

            <!-- Tab Hoy -->
            <q-tab-panel name="hoy" class="tab-panel-padding">
              <!-- Selector de fecha -->
              <div class="filtro-dia-card">
                <q-btn flat dense round icon="chevron_left" size="sm" @click="cambiarDia(-1)" />
                <div class="dia-actual">
                  <div class="dia-label">
                    {{ fechaSeleccionada.toLocaleDateString('es-MX', { weekday: 'long' }) }}
                  </div>
                  <div class="dia-fecha">
                    {{
                      fechaSeleccionada.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    }}
                  </div>
                </div>
                <q-btn
                  flat
                  dense
                  round
                  icon="chevron_right"
                  size="sm"
                  @click="cambiarDia(1)"
                  :disable="fechaSeleccionada.toDateString() === new Date().toDateString()"
                />
              </div>

              <!-- Loading -->
              <div v-if="loadingHistorial" class="loading-container">
                <q-spinner color="primary" size="40px" />
                <div class="loading-text">Cargando trayectos...</div>
              </div>

              <!-- Resumen del día -->
              <div v-else-if="resumenDia" class="resumen-dia-card">
                <div class="card-title">Resumen del día</div>
                <div class="resumen-grid">
                  <div class="resumen-item-card">
                    <q-icon name="play_circle" color="green" size="20px" />
                    <div class="resumen-content">
                      <div class="resumen-label">Ubicación de inicio</div>
                      <div class="resumen-valor">{{ resumenDia.ubicacionInicio }}</div>
                    </div>
                  </div>

                  <div class="resumen-item-card">
                    <q-icon name="stop_circle" color="red" size="20px" />
                    <div class="resumen-content">
                      <div class="resumen-label">Ubicación de fin</div>
                      <div class="resumen-valor">{{ resumenDia.ubicacionFin }}</div>
                    </div>
                  </div>

                  <div class="resumen-stat">
                    <q-icon name="work" color="blue" size="18px" />
                    <div>
                      <div class="stat-label">Duración de trabajo</div>
                      <div class="stat-valor">{{ resumenDia.duracionTrabajo }}</div>
                    </div>
                  </div>

                  <div class="resumen-stat">
                    <q-icon name="route" color="purple" size="18px" />
                    <div>
                      <div class="stat-label">Kilometraje</div>
                      <div class="stat-valor">{{ resumenDia.kilometraje }}</div>
                    </div>
                  </div>

                  <div class="resumen-stat">
                    <q-icon name="directions_car" color="green" size="18px" />
                    <div>
                      <div class="stat-label">Viajes realizados</div>
                      <div class="stat-valor">{{ resumenDia.numTrayectos }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 🆕 Filtro por rango de horas -->
              <div class="filtro-horas-card">
                <div class="filtro-horas-header">
                  <q-icon name="schedule" size="20px" color="primary" />
                  <span class="filtro-horas-titulo">Filtrar por hora</span>
                  <q-btn
                    flat
                    dense
                    label="Resetear"
                    size="sm"
                    color="primary"
                    @click="resetearFiltroHoras"
                  />
                </div>

                <div class="filtro-horas-inputs">
                  <div class="hora-input-wrapper">
                    <span class="hora-label">Desde</span>
                    <q-input v-model="horaInicio" type="time" outlined dense class="hora-input" />
                  </div>

                  <q-icon name="arrow_forward" size="20px" color="grey-6" />

                  <div class="hora-input-wrapper">
                    <span class="hora-label">Hasta</span>
                    <q-input v-model="horaFin" type="time" outlined dense class="hora-input" />
                  </div>
                </div>

                <div class="filtro-resultados">
                  {{ trayectosFiltradosPorHora.length }} de {{ trayectosDia.length }} viajes
                </div>
              </div>
              <!-- Timeline de trayectos - MÁS COMPACTO -->
              <div v-if="trayectosFiltradosPorHora.length > 0" class="timeline-section-compact">
                <div class="section-title-compact">
                  <q-icon name="route" size="18px" color="primary" />
                  <span>Historial de viajes</span>
                  <q-badge color="primary" :label="trayectosFiltradosPorHora.length" />
                </div>

                <div class="timeline-list">
                  <div
                    v-for="trayecto in trayectosFiltradosPorHora"
                    :key="trayecto.id"
                    class="trayecto-card-compact"
                  >
                    <!-- Header del trayecto -->
                    <div class="trayecto-header">
                      <q-avatar :color="trayecto.color" size="32px" text-color="white">
                        <q-icon :name="trayecto.icono" size="18px" />
                      </q-avatar>

                      <div class="trayecto-info">
                        <div class="trayecto-titulo">{{ trayecto.titulo }}</div>
                        <div class="trayecto-hora">
                          <q-icon name="schedule" size="12px" />
                          {{ trayecto.horaInicio }} - {{ trayecto.horaFin }}
                        </div>
                      </div>
                    </div>

                    <!-- Stats compactos en grid -->
                    <div class="trayecto-stats">
                      <div class="stat-item">
                        <q-icon name="schedule" size="14px" color="grey-7" />
                        <span class="stat-valor">{{ trayecto.duracion }}</span>
                      </div>

                      <div class="stat-item">
                        <q-icon name="straighten" size="14px" color="grey-7" />
                        <span class="stat-valor">{{ trayecto.distancia }}</span>
                      </div>

                      <div class="stat-item">
                        <q-icon name="speed" size="14px" color="grey-7" />
                        <span class="stat-valor">{{ trayecto.velocidadMax }}</span>
                      </div>

                      <div class="stat-item">
                        <q-icon name="trending_flat" size="14px" color="grey-7" />
                        <span class="stat-valor">{{ trayecto.velocidadPromedio }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else-if="!loadingHistorial" class="empty-state">
                <q-icon name="route" size="80px" color="grey-4" />
                <div class="empty-title">Sin trayectos</div>
                <div class="empty-subtitle">No hay viajes registrados en este rango de horas</div>
              </div>
            </q-tab-panel>

            <!-- Tab Notificaciones -->
            <q-tab-panel name="notificaciones" class="tab-panel-padding">
              <!-- Filtro -->
              <div class="filtro-container">
                <q-select
                  v-model="filtroNotificaciones"
                  :options="['Todo', 'Entradas', 'Salidas']"
                  outlined
                  dense
                  label="Mostrar eventos"
                  class="filtro-select"
                />
              </div>

              <!-- Loading -->
              <div v-if="loadingEventos" class="loading-container">
                <q-spinner color="primary" size="40px" />
                <div class="loading-text">Cargando eventos...</div>
              </div>

              <!-- Lista de eventos como tarjetas -->
              <div
                v-else-if="eventosFiltrados && eventosFiltrados.length > 0"
                class="eventos-container"
              >
                <div
                  v-for="evento in eventosFiltrados"
                  :key="evento.id"
                  class="evento-notification-card"
                >
                  <!-- Header con icono y título -->
                  <div class="evento-header">
                    <q-avatar
                      :style="{ backgroundColor: getColorHex(evento.color) }"
                      text-color="white"
                      size="40px"
                    >
                      <q-icon :name="evento.icono" size="20px" />
                    </q-avatar>

                    <div class="evento-main-content">
                      <div class="evento-titulo">{{ evento.titulo }}</div>
                      <div class="evento-descripcion">{{ evento.descripcion }}</div>
                    </div>
                  </div>

                  <!-- Detalles del evento -->
                  <div class="evento-details">
                    <!-- Fecha/Hora -->
                    <div class="detail-item">
                      <q-icon name="schedule" size="14px" color="grey-7" />
                      <span class="detail-text">{{ evento.fechaTexto }}</span>
                    </div>

                    <!-- Ubicación -->
                    <div class="detail-item">
                      <q-icon name="place" size="14px" color="grey-7" />
                      <span class="detail-text">{{ evento.ubicacion }}</span>
                    </div>

                    <!-- Conductor -->
                    <div class="detail-item">
                      <q-icon name="person" size="14px" color="grey-7" />
                      <span class="detail-text">{{ evento.conductorNombre }}</span>
                    </div>

                    <!-- Coordenadas (expandible) -->
                    <div v-if="evento.coordenadas" class="detail-item">
                      <q-icon name="my_location" size="14px" color="grey-7" />
                      <span class="detail-text detail-coords">
                        {{ evento.coordenadas.lat.toFixed(6) }},
                        {{ evento.coordenadas.lng.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="empty-state">
                <q-icon name="notifications_none" size="80px" color="grey-4" />
                <div class="empty-title">Sin eventos</div>
                <div class="empty-subtitle">No hay eventos para mostrar con el filtro actual</div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-scroll-area>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'
import { useEstadisticasUnidad } from 'src/composables/useEstadisticasUnidad'
import { useTrayectosDiarios } from 'src/composables/useTrayectosDiarios'
import { useEventosUnidad } from 'src/composables/useEventosUnidad'

// Composables
const { unidadesActivas, iniciarTracking, contarPorEstado } = useTrackingUnidades()
const { obtenerEstadisticas, calcularDuracionEstado, formatearFechaHora } = useEstadisticasUnidad()
const { obtenerTrayectosDia } = useTrayectosDiarios()
const { obtenerEventosDiarios } = useEventosUnidad()
//, filtrarEventosPorTipo esto va arriba en EventosUnidad

// Props y emits
const emit = defineEmits(['close', 'vehiculo-seleccionado', 'vehiculo-mapa'])

// Estado local - Vista general
const vehiculoSeleccionado = ref(null)
const busqueda = ref('')
const estadoSeleccionado = ref('todos')
const tabActual = ref('resumen')

// Estado - Tab Resumen
const estadisticasVehiculo = ref(null)
const loadingEstadisticas = ref(false)

// Estado - Tab Hoy
const fechaSeleccionada = ref(new Date())
const trayectosDia = ref([])
const resumenDia = ref(null)
const loadingHistorial = ref(false)
const horaInicio = ref('00:00')
const horaFin = ref('23:59')

// Estado - Tab Notificaciones
const filtroNotificaciones = ref('Todo')
const eventosUnidad = ref([])
const loadingEventos = ref(false)

// ==================== COMPUTED ====================

// Computed - Convertir unidades activas a formato de vehículos
const vehiculos = computed(() => {
  return unidadesActivas.value.map((unidad) => ({
    id: unidad.id,
    nombre: unidad.unidadNombre,
    ubicacion: unidad.direccionTexto || 'Ubicación desconocida',
    ubicacionCoords: unidad.ubicacion,
    coordenadas: `${unidad.ubicacion.lat.toFixed(6)}, ${unidad.ubicacion.lng.toFixed(6)}`,
    velocidad: `${unidad.velocidad} km/h`,
    estado: unidad.estado,
    conductor: unidad.conductorNombre,
    conductorFoto: unidad.conductorFoto,
    placa: unidad.unidadPlaca,
    ignicion: unidad.ignicion,
    bateria: unidad.bateria,
    timestamp: unidad.timestamp,
    timestampCambioEstado: unidad.timestamp_cambio_estado,

    // Datos calculados dinámicamente
    tiempoConductionHoy: estadisticasVehiculo.value?.tiempoConductionHoy || 'Cargando...',
    duracionEstado: calcularDuracionEstado(unidad.timestamp_cambio_estado, unidad.timestamp),
    ultimaSincronizacion: formatearFechaHora(unidad.timestamp),
    fechaHora: formatearFechaHora(unidad.timestamp),

    notificaciones: 0,
  }))
})

// Computed para estados
const estadosVehiculos = computed(() => {
  const conteo = contarPorEstado()
  return [
    {
      tipo: 'todos',
      nombre: 'Todos',
      icono: 'directions_car',
      color: 'blue',
      cantidad: conteo.todos,
    },
    {
      tipo: 'movimiento',
      nombre: 'En movimiento',
      icono: 'navigation',
      color: 'green',
      cantidad: conteo.movimiento,
    },
    {
      tipo: 'detenido',
      nombre: 'Detenido',
      icono: 'pause_circle',
      color: 'orange',
      cantidad: conteo.detenido,
    },
    {
      tipo: 'inactivo',
      nombre: 'Inactivo',
      icono: 'power_settings_new',
      color: 'blue-grey',
      cantidad: conteo.inactivo,
    },
  ]
})

// Vehículos filtrados
const vehiculosFiltrados = computed(() => {
  let resultado = vehiculos.value

  if (estadoSeleccionado.value !== 'todos') {
    resultado = resultado.filter((v) => v.estado === estadoSeleccionado.value)
  }

  if (busqueda.value) {
    resultado = resultado.filter(
      (v) =>
        v.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        v.ubicacion.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        v.conductor.toLowerCase().includes(busqueda.value.toLowerCase()),
    )
  }

  return resultado
})

const trayectosFiltradosPorHora = computed(() => {
  if (!trayectosDia.value || trayectosDia.value.length === 0) {
    return []
  }

  // Si no hay filtros de hora, mostrar todos
  if (!horaInicio.value || !horaFin.value) {
    return trayectosDia.value
  }

  const [horaInicioNum, minInicioNum] = horaInicio.value.split(':').map(Number)
  const [horaFinNum, minFinNum] = horaFin.value.split(':').map(Number)

  const minutosInicio = horaInicioNum * 60 + minInicioNum
  const minutosFin = horaFinNum * 60 + minFinNum

  return trayectosDia.value.filter((trayecto) => {
    // Extraer hora del formato "09:24 a.m." o "10:48 a.m."
    const horaStr = trayecto.horaInicio.toLowerCase().trim()

    // Regex para capturar hora:minuto am/pm
    const match = horaStr.match(/(\d+):(\d+)\s*(a\.?m\.?|p\.?m\.?)/i)

    if (!match) {
      console.warn('⚠️ No se pudo parsear la hora:', horaStr)
      return true // Incluir si no se puede parsear
    }

    let hora = parseInt(match[1])
    const minuto = parseInt(match[2])
    const periodo = match[3].toLowerCase().replace(/\./g, '') // 'am' o 'pm'

    // Convertir a formato 24 horas
    if (periodo === 'pm' && hora !== 12) {
      hora += 12
    } else if (periodo === 'am' && hora === 12) {
      hora = 0
    }

    const minutosTrayecto = hora * 60 + minuto

    // Verificar si está en el rango
    const enRango = minutosTrayecto >= minutosInicio && minutosTrayecto <= minutosFin

    return enRango
  })
})

// Computed para eventos filtrados
const eventosFiltrados = computed(() => {
  if (!eventosUnidad.value || eventosUnidad.value.length === 0) {
    return []
  }

  if (filtroNotificaciones.value === 'Todo') {
    return eventosUnidad.value
  }

  if (filtroNotificaciones.value === 'Entradas') {
    return eventosUnidad.value.filter((e) => {
      const accion = e.accion?.toLowerCase() || ''
      return accion.includes('entrada') || accion.includes('entró')
    })
  }

  if (filtroNotificaciones.value === 'Salidas') {
    return eventosUnidad.value.filter((e) => {
      const accion = e.accion?.toLowerCase() || ''
      return accion.includes('salida') || accion.includes('salió')
    })
  }

  return eventosUnidad.value
})

// ==================== FUNCIONES ====================

// Cargar estadísticas
const cargarEstadisticasVehiculo = async (unidadId) => {
  loadingEstadisticas.value = true
  try {
    estadisticasVehiculo.value = await obtenerEstadisticas(unidadId)
  } catch (err) {
    console.error('Error cargando estadísticas:', err)
  } finally {
    loadingEstadisticas.value = false
  }
}

// Cargar trayectos del día
const cargarTrayectosDia = async () => {
  if (!vehiculoSeleccionado.value) return

  loadingHistorial.value = true
  try {
    const resultado = await obtenerTrayectosDia(
      vehiculoSeleccionado.value.id,
      fechaSeleccionada.value,
    )

    trayectosDia.value = resultado.trayectos
    resumenDia.value = resultado.resumen

    console.log('📋 Trayectos del día:', resultado)
  } catch (err) {
    console.error('Error cargando trayectos:', err)
    trayectosDia.value = []
    resumenDia.value = null
  } finally {
    loadingHistorial.value = false
  }
}

// Cargar eventos de la unidad
const cargarEventosUnidad = async (unidadId) => {
  loadingEventos.value = true
  try {
    console.log(`📊 Cargando eventos diarios para unidad ${unidadId}`)
    const eventos = await obtenerEventosDiarios(unidadId, 50) // 👈 Usas la nueva función
    eventosUnidad.value = eventos
    console.log(`✅ ${eventos.length} eventos cargados`)
  } catch (err) {
    console.error('Error cargando eventos:', err)
    eventosUnidad.value = []
  } finally {
    loadingEventos.value = false
  }
}

// Navegación de fechas
const cambiarDia = (dias) => {
  const nuevaFecha = new Date(fechaSeleccionada.value)
  nuevaFecha.setDate(nuevaFecha.getDate() + dias)

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)

  if (nuevaFecha <= hoy) {
    fechaSeleccionada.value = nuevaFecha
  }
}

const resetearFiltroHoras = () => {
  horaInicio.value = '00:00'
  horaFin.value = '23:59'
}

// Funciones de vista
function seleccionarEstado(estado) {
  estadoSeleccionado.value = estado.tipo
}

function seleccionarVehiculo(vehiculo) {
  vehiculoSeleccionado.value = vehiculo
  emit('vehiculo-seleccionado', vehiculo)
}

function seleccionarVehiculoParaMapa(vehiculo) {
  emit('vehiculo-mapa', vehiculo)

  const mapPage = document.getElementById('map-page')
  if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
    const { lat, lng } = vehiculo.ubicacionCoords || { lat: 0, lng: 0 }

    mapPage._mapaAPI.map.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1000,
      essential: true,
    })

    const unidadId = vehiculo.id
    if (mapPage._mapaAPI.centrarEnUnidad) {
      mapPage._mapaAPI.centrarEnUnidad(unidadId)
    }
  }
}

function volverALista() {
  vehiculoSeleccionado.value = null
  tabActual.value = 'resumen'
}

function cerrarDrawer() {
  emit('close')
}

function getColorEstado(estado) {
  const colores = {
    todos: 'blue',
    movimiento: 'green',
    detenido: 'orange',
    inactivo: 'blue-grey',
  }
  return colores[estado] || 'grey'
}

function getIconoEstado(estado) {
  const iconos = {
    todos: 'directions_car',
    movimiento: 'navigation',
    detenido: 'pause_circle',
    inactivo: 'power_settings_new',
  }
  return iconos[estado] || 'directions_car'
}

function getColorHex(color) {
  const colores = {
    blue: '#2196F3',
    green: '#4CAF50',
    orange: '#FF9800',
    'blue-grey': '#607D8B',
    cyan: '#00BCD4',
    red: '#F44336',
    purple: '#9C27B0',
  }
  return colores[color] || '#9E9E9E'
}

function getEstadoTexto(estado) {
  const textos = {
    movimiento: 'En movimiento',
    detenido: 'Detenido',
    inactivo: 'Inactivo',
  }
  return textos[estado] || 'Desconocido'
}

// ==================== WATCHERS ====================

// 🔥 ÚNICO WATCH para vehiculoSeleccionado - Carga todo lo necesario
watch(vehiculoSeleccionado, async (nuevoVehiculo) => {
  if (nuevoVehiculo) {
    // Cargar estadísticas (Tab Resumen)
    await cargarEstadisticasVehiculo(nuevoVehiculo.id)

    // Resetear y cargar trayectos (Tab Hoy)
    fechaSeleccionada.value = new Date()
    horaInicio.value = '00:00'
    horaFin.value = '23:59'
    await cargarTrayectosDia()

    // Cargar eventos (Tab Notificaciones)
    await cargarEventosUnidad(nuevoVehiculo.id)
  } else {
    // Limpiar todo al deseleccionar
    estadisticasVehiculo.value = null
    trayectosDia.value = []
    resumenDia.value = null
    eventosUnidad.value = []
  }
})

// Watch para recargar trayectos cuando cambia la fecha
watch(fechaSeleccionada, () => {
  if (vehiculoSeleccionado.value) {
    cargarTrayectosDia()
  }
})

// ==================== LIFECYCLE ====================

onMounted(() => {
  iniciarTracking()
})
</script>

<style scoped>
/* === LAYOUT PRINCIPAL === */
.estado-flota-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

/* === HEADER === */
.flota-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #c62828 0%, #d84315 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-height: 64px;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.header-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.vehiculo-nombre {
  font-size: 16px;
  font-weight: 500;
}

.back-btn,
.close-btn {
  transition: transform 0.2s ease;
}

.back-btn:hover,
.close-btn:hover {
  transform: scale(1.1);
}

/* === VISTA LISTA === */
.vista-lista {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

/* === ESTADOS GRID === */
.estados-container {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.compact-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 60px;
}

.compact-card:hover {
  border-color: #2196f3;
  background: #f5f9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
}

.compact-card.estado-activo {
  border-color: #2196f3;
  background: #e3f2fd;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
}

.estado-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 11px;
  padding: 0 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* === BÚSQUEDA === */
.search-container {
  padding: 0 20px 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.search-input {
  background: white;
  border-radius: 8px;
}

/* === TABLA HEADER === */
.tabla-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #616161;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-col {
  flex: 1;
}

.header-col-velocidad {
  text-align: right;
  min-width: 80px;
}

.header-col-acciones {
  text-align: center;
  min-width: 60px;
}

/* === LISTA VEHÍCULOS === */
.vehiculos-scroll-area {
  flex: 1;
  height: 100%;
}

.vehiculos-list {
  padding: 0;
}

.vehiculo-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.vehiculo-item:hover {
  background-color: #f5f9ff;
  border-left: 4px solid #2196f3;
}

.vehiculo-nombre-item {
  font-weight: 600;
  font-size: 14px;
  color: #212121;
  margin-bottom: 4px;
}

.vehiculo-ubicacion {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
}

.velocidad-section {
  min-width: 80px;
}

.velocidad-badge {
  padding: 6px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 16px;
  font-weight: 600;
  font-size: 13px;
  text-align: center;
}

.acciones-section {
  min-width: 60px;
}

.btn-detalles {
  transition: all 0.2s ease;
}

.btn-detalles:hover {
  background-color: rgba(33, 150, 243, 0.1);
  transform: scale(1.1);
}

/* === VISTA DETALLES === */
.vista-detalles {
  position: absolute;
  right: 0;
  top: 64px;
  bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  z-index: 100;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
}

/* === ANIMACIÓN SLIDE === */
.slide-right-enter-active {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-leave-active {
  animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* === TABS === */
.tabs-vehiculo {
  background: white;
  border-bottom: 2px solid #e0e0e0;
  min-height: 56px;
}

.tab-item {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.tab-content-scroll {
  flex: 1;
  height: 100%;
  background: #f5f7fa;
}

.tab-panels-content {
  background: transparent;
  height: 100%;
}

.tab-panel-padding {
  padding: 20px;
}

/* === CARDS GENERALES === */
.info-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.ubicacion-card {
  border-left: 4px solid #2196f3;
}

.info-icon-wrapper {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.info-valor {
  font-size: 15px;
  color: #212121;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
}

.info-coordenadas {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #9e9e9e;
  font-family: 'Courier New', monospace;
}

/* === DETALLES GRID === */
.detalles-grid {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.detalle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
}

.detalle-label {
  font-size: 14px;
  color: #616161;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.detalle-valor {
  font-size: 14px;
  color: #212121;
  font-weight: 600;
}

.detalle-valor-small {
  font-size: 13px;
  color: #424242;
  font-weight: 500;
  text-align: right;
}

.separator {
  margin: 8px 0;
  background: #e0e0e0;
}

/* === TAB HOY - SELECTOR DE FECHA === */
.filtro-dia-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.dia-actual {
  text-align: center;
  flex: 1;
}

.dia-label {
  font-size: 12px;
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dia-fecha {
  font-size: 15px;
  color: #212121;
  font-weight: 600;
  margin-top: 4px;
}

/* === FILTRO DE HORAS === */
.filtro-horas-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.filtro-horas-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.filtro-horas-titulo {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  flex: 1;
}

.filtro-horas-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.hora-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hora-label {
  font-size: 12px;
  color: #757575;
  font-weight: 500;
}

.hora-input {
  background: white;
}

.filtro-resultados {
  font-size: 12px;
  color: #2196f3;
  font-weight: 600;
  text-align: center;
  padding: 8px;
  background: #e3f2fd;
  border-radius: 8px;
}

/* === RESUMEN DÍA === */
.resumen-dia-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.resumen-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resumen-item-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid;
}

.resumen-item-card:nth-child(1) {
  border-left-color: #4caf50;
}

.resumen-item-card:nth-child(2) {
  border-left-color: #f44336;
}

.resumen-content {
  flex: 1;
}

.resumen-label {
  font-size: 12px;
  color: #757575;
  margin-bottom: 4px;
}

.resumen-valor {
  font-size: 13px;
  color: #212121;
  font-weight: 600;
}

.resumen-stat {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #757575;
}

.stat-valor {
  font-size: 14px;
  color: #212121;
  font-weight: 600;
  margin-top: 2px;
}

/* === TIMELINE COMPACTO === */
.timeline-section-compact {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.section-title-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.section-title-compact span {
  flex: 1;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trayecto-card-compact {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px;
  border-left: 3px solid #2196f3;
  transition: all 0.2s ease;
}

.trayecto-card-compact:hover {
  background: #f0f4ff;
  border-left-color: #1565c0;
  transform: translateX(4px);
}

.trayecto-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.trayecto-info {
  flex: 1;
  min-width: 0;
}

.trayecto-titulo {
  font-size: 13px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trayecto-hora {
  font-size: 11px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trayecto-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.stat-item .stat-valor {
  color: #424242;
  font-weight: 600;
}

/* === TAB NOTIFICACIONES === */
.filtro-container {
  margin-bottom: 16px;
}

.filtro-select {
  background: white;
  border-radius: 8px;
}

.eventos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evento-card {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  cursor: pointer;
}

.evento-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.evento-content {
  flex: 1;
  min-width: 0;
}

.evento-titulo {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 4px;
}

.evento-descripcion {
  font-size: 13px;
  color: #616161;
  margin-bottom: 6px;
  line-height: 1.4;
}

.evento-fecha {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 4px;
}

.evento-detalles-wrapper {
  width: 100%;
  margin-top: 12px;
}

.eventos-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* === EVENTOS COMO NOTIFICACIONES === */
.evento-detalles {
  width: 100%;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
}

.evento-notification-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.evento-notification-card:hover {
  transform: translateX(4px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Colores de borde según tipo */
.evento-notification-card:has(
  .evento-header .q-avatar[style*='background-color: rgb(76, 175, 80)']
) {
  border-left-color: #4caf50; /* Verde - Entrada */
}

.evento-notification-card:has(
  .evento-header .q-avatar[style*='background-color: rgb(244, 67, 54)']
) {
  border-left-color: #f44336; /* Rojo - Salida */
}

.evento-notification-card:has(
  .evento-header .q-avatar[style*='background-color: rgb(255, 152, 0)']
) {
  border-left-color: #ff9800; /* Naranja - Alerta */
}

.evento-notification-card:has(
  .evento-header .q-avatar[style*='background-color: rgb(0, 188, 212)']
) {
  border-left-color: #00bcd4; /* Cyan - Info */
}

.evento-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.evento-main-content {
  flex: 1;
  min-width: 0;
}

.evento-titulo {
  font-size: 14px;
  font-weight: 700;
  color: #212121;
  margin-bottom: 4px;
  line-height: 1.3;
}

.evento-descripcion {
  font-size: 13px;
  color: #616161;
  line-height: 1.4;
}

.evento-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.detail-text {
  color: #424242;
  flex: 1;
  line-height: 1.4;
}

.detail-coords {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #757575;
}

/* Animación del icono */
.evento-notification-card .q-avatar {
  transition: transform 0.3s ease;
}

.evento-notification-card:hover .q-avatar {
  transform: scale(1.1) rotate(5deg);
}

/*
.evento-detalles {
  width: 100%;
  margin-top: 12px;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
}
  */

.detalle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.detalle-item:last-child {
  margin-bottom: 0;
}

.detalle-label {
  color: #757575;
  font-weight: 500;
}

.detalle-valor {
  color: #212121;
  flex: 1;
}

/* === LOADING & EMPTY STATE === */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-text {
  font-size: 14px;
  color: #757575;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #424242;
  margin-top: 16px;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #9e9e9e;
  max-width: 300px;
}

/* === RESPONSIVE === */
@media (max-width: 600px) {
  .flota-header {
    padding: 12px 16px;
    min-height: 56px;
  }

  .header-title {
    font-size: 16px;
  }

  .compact-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .compact-card {
    min-height: 55px;
    padding: 6px 4px;
  }

  .tab-panel-padding {
    padding: 16px;
  }
}
</style>
