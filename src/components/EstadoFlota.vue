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
      <q-btn 
        flat 
        dense 
        round 
        icon="close" 
        color="white" 
        @click="cerrarDrawer"
        class="close-btn"
      />
    </div>

    <!-- Vista de Lista de Vehículos -->
    <div v-show="!vehiculoSeleccionado" class="vista-lista">
      <!-- Selector todos los vehículos -->
      <div class="selector-todos">
        <q-checkbox
          v-model="todosVehiculos"
          label="Todos los vehículos"
          @update:model-value="seleccionarTodos"
          dense
          color="primary"
        />
        <q-chip dense color="grey-3" text-color="grey-8">
          {{ totalVehiculos }}
        </q-chip>
      </div>

      <!-- Grid de estados -->
      <div class="estados-container">
        <div class="estados-grid">
          <div
            v-for="estado in estadosVehiculos"
            :key="estado.tipo"
            class="estado-card"
            :class="{ 'estado-activo': estadoSeleccionado === estado.tipo }"
            @click="seleccionarEstado(estado)"
          >
            <q-icon :name="estado.icono" size="24px" :color="estado.color" />
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
      </div>

      <!-- Lista de vehículos -->
      <q-scroll-area class="vehiculos-scroll-area">
        <q-list class="vehiculos-list">
          <q-item
            v-for="vehiculo in vehiculosFiltrados"
            :key="vehiculo.id"
            clickable
            v-ripple
            @click="seleccionarVehiculo(vehiculo)"
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
          </q-item>
        </q-list>
      </q-scroll-area>
    </div>

    <!-- Vista de Detalles del Vehículo -->
    <div v-show="vehiculoSeleccionado" class="vista-detalles">
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
        <q-tab name="notificaciones" class="tab-item">
          <q-icon name="notifications" />
          <q-badge 
            v-if="vehiculoSeleccionado && vehiculoSeleccionado.notificaciones > 0" 
            color="red" 
            floating
            rounded
          >
            {{ vehiculoSeleccionado.notificaciones }}
          </q-badge>
        </q-tab>
        <q-tab name="combustible" icon="local_gas_station" class="tab-item" />
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

            <div class="detalles-grid">
              <div class="detalle-row">
                <span class="detalle-label">Plan</span>
                <q-chip dense color="blue-1" text-color="primary" class="detalle-chip">
                  {{ vehiculoSeleccionado.plan }}
                </q-chip>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">Estado actual</span>
                <q-chip 
                  dense 
                  :style="{ backgroundColor: getColorHex(getColorEstado(vehiculoSeleccionado.estado)) }" 
                  text-color="white"
                >
                  {{ getEstadoTexto(vehiculoSeleccionado.estado) }}
                </q-chip>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">Bloquear vehículo</span>
                <q-toggle
                  v-model="vehiculoSeleccionado.bloqueado"
                  color="primary"
                  @update:model-value="toggleBloqueo"
                />
              </div>

              <q-separator class="separator" />

              <div class="detalle-row">
                <span class="detalle-label">Tiempo de conducción hoy</span>
                <span class="detalle-valor">{{ vehiculoSeleccionado.tiempoConductionHoy }}</span>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">Tiempo esta semana</span>
                <span class="detalle-valor">{{ vehiculoSeleccionado.tiempoConductionSemana }}</span>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">Duración de estado</span>
                <span class="detalle-valor">{{ vehiculoSeleccionado.duracionEstado }}</span>
              </div>

              <q-separator class="separator" />

              <div class="detalle-row">
                <span class="detalle-label">
                  <q-icon name="sync" size="16px" class="q-mr-xs" />
                  Última sincronización
                </span>
                <span class="detalle-valor-small">
                  {{ vehiculoSeleccionado.ultimaSincronizacion }}
                </span>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">
                  <q-icon name="schedule" size="16px" class="q-mr-xs" />
                  Fecha y hora
                </span>
                <span class="detalle-valor-small">{{ vehiculoSeleccionado.fechaHora }}</span>
              </div>

              <div class="detalle-row">
                <span class="detalle-label">
                  <q-icon name="route" size="16px" class="q-mr-xs" />
                  Tipo de trayecto
                </span>
                <span class="detalle-valor-small">{{ vehiculoSeleccionado.tipoTrayecto }}</span>
              </div>
            </div>

            <q-btn 
              unelevated
              color="primary" 
              label="Ver detalles completos" 
              class="full-width btn-detalles"
              icon="arrow_forward"
              @click="verDetallesCompletos"
            />
          </q-tab-panel>

          <!-- Tab Hoy -->
          <q-tab-panel name="hoy" class="tab-panel-padding">
            <div class="filtro-dia-card">
              <q-btn flat dense round icon="chevron_left" size="sm" />
              <div class="dia-actual">
                <div class="dia-label">Hoy</div>
                <div class="dia-fecha">{{ vehiculoSeleccionado.fechaTimeline }}</div>
              </div>
              <q-btn flat dense round icon="chevron_right" size="sm" />
            </div>

            <div class="resumen-dia-card">
              <div class="card-title">Resumen del día</div>
              <div class="resumen-grid">
                <div class="resumen-item-card">
                  <q-icon name="play_circle" color="green" size="20px" />
                  <div class="resumen-content">
                    <div class="resumen-label">Ubicación de inicio</div>
                    <div class="resumen-valor">{{ vehiculoSeleccionado.ubicacionInicio }}</div>
                  </div>
                </div>

                <div class="resumen-item-card">
                  <q-icon name="stop_circle" color="red" size="20px" />
                  <div class="resumen-content">
                    <div class="resumen-label">Ubicación de fin</div>
                    <div class="resumen-valor">{{ vehiculoSeleccionado.ubicacionFin }}</div>
                  </div>
                </div>

                <div class="resumen-stat">
                  <q-icon name="work" color="blue" size="18px" />
                  <div>
                    <div class="stat-label">Duración de trabajo</div>
                    <div class="stat-valor">{{ vehiculoSeleccionado.duracionTrabajo }}</div>
                  </div>
                </div>

                <div class="resumen-stat">
                  <q-icon name="pause_circle" color="orange" size="18px" />
                  <div>
                    <div class="stat-label">Duración de parada</div>
                    <div class="stat-valor">{{ vehiculoSeleccionado.duracionParada }}</div>
                  </div>
                </div>

                <div class="resumen-stat">
                  <q-icon name="speed" color="purple" size="18px" />
                  <div>
                    <div class="stat-label">Kilometraje</div>
                    <div class="stat-valor">{{ vehiculoSeleccionado.kilometraje }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="timeline-section" v-if="vehiculoSeleccionado.actividades.length > 0">
              <div class="section-title">Actividades</div>
              <q-timeline color="primary" class="timeline-actividades">
                <q-timeline-entry
                  v-for="(actividad, index) in vehiculoSeleccionado.actividades"
                  :key="index"
                  :icon="actividad.icono"
                  :color="actividad.color"
                >
                  <template v-slot:title>
                    <div class="timeline-title">{{ actividad.titulo }}</div>
                  </template>
                  <template v-slot:subtitle>
                    <div class="timeline-hora">{{ actividad.hora }}</div>
                  </template>
                  <div class="timeline-detalle-card">
                    <div class="timeline-info">
                      <span class="timeline-info-label">Duración</span>
                      <span class="timeline-info-valor">{{ actividad.duracion }}</span>
                    </div>
                    <div class="timeline-info">
                      <span class="timeline-info-label">Kilometraje</span>
                      <span class="timeline-info-valor">{{ actividad.kilometraje }}</span>
                    </div>
                  </div>
                </q-timeline-entry>
              </q-timeline>
            </div>

            <div class="info-adicional-card">
              <div class="info-item">
                <q-icon name="person" color="grey-7" size="20px" />
                <div>
                  <div class="info-item-label">Conducido por</div>
                  <div class="info-item-valor">{{ vehiculoSeleccionado.conductor }}</div>
                </div>
              </div>

              <q-separator />

              <div class="info-item">
                <q-icon name="route" color="grey-7" size="20px" />
                <div class="flex-grow">
                  <div class="info-item-label">Tipo de trayecto</div>
                  <div class="info-item-valor">{{ vehiculoSeleccionado.tipoTrayecto }}</div>
                </div>
                <q-btn flat dense color="primary" label="Editar" size="sm" />
              </div>

              <q-separator />

              <div class="info-item-column">
                <div class="info-item-header">
                  <q-icon name="note" color="grey-7" size="20px" />
                  <div class="info-item-label">Notas</div>
                  <q-btn flat dense color="primary" label="Editar" size="sm" />
                </div>
                <q-input 
                  v-model="vehiculoSeleccionado.notas" 
                  outlined 
                  type="textarea" 
                  placeholder="Agregar nota..."
                  rows="3"
                  class="notas-input"
                />
              </div>
            </div>
          </q-tab-panel>

          <!-- Tab Notificaciones -->
          <q-tab-panel name="notificaciones" class="tab-panel-padding">
            <div class="filtro-container">
              <q-select
                v-model="filtroNotificaciones"
                :options="['Todo', 'Alertas', 'Info', 'Eventos']"
                outlined
                dense
                label="Mostrar eventos"
                class="filtro-select"
              />
            </div>

            <div v-if="vehiculoSeleccionado.eventos && vehiculoSeleccionado.eventos.length > 0" class="eventos-list">
              <div
                v-for="(evento, index) in vehiculoSeleccionado.eventos"
                :key="index"
                class="evento-card"
              >
                <q-avatar 
                  :style="{ backgroundColor: getColorHex(evento.color) }" 
                  text-color="white" 
                  size="44px"
                >
                  <q-icon :name="evento.icono" size="22px" />
                </q-avatar>
                <div class="evento-content">
                  <div class="evento-titulo">{{ evento.titulo }}</div>
                  <div class="evento-fecha">
                    <q-icon name="schedule" size="14px" />
                    {{ evento.fecha }}
                  </div>
                </div>
                <q-btn flat dense round icon="expand_more" />
              </div>
            </div>

            <div v-else class="empty-state">
              <q-icon name="notifications_none" size="80px" color="grey-4" />
              <div class="empty-title">Sin notificaciones</div>
              <div class="empty-subtitle">No hay eventos para mostrar en este momento</div>
            </div>
          </q-tab-panel>

          <!-- Tab Combustible -->
          <q-tab-panel name="combustible" class="tab-panel-padding">
            <div class="empty-state">
              <q-icon name="local_gas_station" size="80px" color="grey-4" />
              <div class="empty-title">Sin información</div>
              <div class="empty-subtitle">No hay datos de combustible disponibles</div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['close', 'vehiculo-seleccionado', 'navegar-mapa'])

const todosVehiculos = ref(true)
const estadoSeleccionado = ref('todos')
const busqueda = ref('')
const vehiculoSeleccionado = ref(null)
const tabActual = ref('resumen')
const filtroNotificaciones = ref('Todo')

const estadosVehiculos = ref([
  { tipo: 'todos', nombre: 'Todos', icono: 'directions_car', color: 'blue', cantidad: 6 },
  { tipo: 'movimiento', nombre: 'En movimiento', icono: 'navigation', color: 'green', cantidad: 0 },
  { tipo: 'inactivo', nombre: 'Inactivo', icono: 'pause_circle', color: 'orange', cantidad: 1 },
  { tipo: 'ignicion_apagada', nombre: 'Ignición apagada', icono: 'power_settings_new', color: 'blue-grey', cantidad: 4 },
  { tipo: 'carga', nombre: 'Carga', icono: 'local_gas_station', color: 'cyan', cantidad: 0 },
  { tipo: 'ignicion_bloqueada', nombre: 'Ignición bloqueada', icono: 'lock', color: 'red', cantidad: 1 },
])

const vehiculos = ref([
  {
    id: 1,
    nombre: 'CRAFTER-VF61428_REV',
    ubicacion: 'MX, Hermosillo, Boulevard Enrique Mazón López...',
    velocidad: '1 km/h',
    estado: 'inactivo',
    coordenadas: '29.0990083, -110.921115',
    plan: 'Básico plus',
    bloqueado: false,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '42 min',
    ultimaSincronizacion: 'hace unos segundos',
    fechaHora: '21/10/2025 11:08:53',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Hermosillo, Boulevard Enrique Mazón López',
    ubicacionFin: 'MX, Hermosillo, Boulevard Enrique Mazón López',
    duracionTrabajo: '3 min',
    duracionParada: '11 h 6 min',
    kilometraje: '0,00 km',
    fechaTimeline: '21/10/2025',
    actividades: [
      { titulo: 'Parada', hora: '0:00', tipo: 'parada', duracion: '10 h 18 min', kilometraje: '0,00 km', icono: 'pause_circle', color: 'orange' },
      { titulo: 'Inicio', hora: '10:17', tipo: 'conducción', duracion: '1 min', kilometraje: '0,00 km', icono: 'play_arrow', color: 'green' },
      { titulo: 'Parada', hora: '10:18', tipo: 'parada', duracion: '6 min', kilometraje: '0,00 km', icono: 'pause_circle', color: 'orange' }
    ],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 0,
    eventos: []
  },
  {
    id: 2,
    nombre: 'ELEV TIJ-SOTO-FRONTI...',
    ubicacion: 'MX, Ensenada, Calle Lago de...',
    velocidad: '6 km/h',
    estado: 'ignicion_apagada',
    coordenadas: '31.8667, -116.6000',
    plan: 'Básico plus',
    bloqueado: false,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '2 h 15 min',
    ultimaSincronizacion: 'hace 5 minutos',
    fechaHora: '21/10/2025 10:45:20',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Ensenada, Calle Lago de',
    ubicacionFin: 'MX, Ensenada, Calle Lago de',
    duracionTrabajo: '45 min',
    duracionParada: '8 h 30 min',
    kilometraje: '12,5 km',
    fechaTimeline: '21/10/2025',
    actividades: [],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 0,
    eventos: []
  },
  {
    id: 3,
    nombre: 'PERCO TIJ-CRAFTER-UX...',
    ubicacion: 'MX, Tijuana, Calle Rey Alejan...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
    coordenadas: '32.5149, -117.0382',
    plan: 'Básico plus',
    bloqueado: false,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '1 h 30 min',
    ultimaSincronizacion: 'hace 2 minutos',
    fechaHora: '21/10/2025 10:30:15',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Tijuana, Calle Rey Alejan',
    ubicacionFin: 'MX, Tijuana, Calle Rey Alejan',
    duracionTrabajo: '1 h',
    duracionParada: '9 h',
    kilometraje: '5,2 km',
    fechaTimeline: '21/10/2025',
    actividades: [],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 0,
    eventos: []
  },
  {
    id: 4,
    nombre: 'SPRINTER-PANEL-1-HF3...',
    ubicacion: 'MX, Tijuana, Boulevard Guad...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
    coordenadas: '32.5027, -117.0039',
    plan: 'Básico plus',
    bloqueado: false,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '3 h',
    ultimaSincronizacion: 'hace 10 minutos',
    fechaHora: '21/10/2025 09:49:30',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Tijuana, Boulevard Guad',
    ubicacionFin: 'MX, Tijuana, Boulevard Guad',
    duracionTrabajo: '30 min',
    duracionParada: '10 h',
    kilometraje: '0 km',
    fechaTimeline: '21/10/2025',
    actividades: [],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 1,
    eventos: [
      { titulo: 'SALIDA TALLER MJ INDUSTRIAL', fecha: '21/10/2025 9:49', icono: 'exit_to_app', color: 'blue' }
    ]
  },
  {
    id: 5,
    nombre: 'TIENDAPERCO-TIJ-NP3...',
    ubicacion: 'MX, Tijuana, Boulevard de lo...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
    coordenadas: '32.5149, -117.0382',
    plan: 'Básico plus',
    bloqueado: false,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '5 h',
    ultimaSincronizacion: 'hace 1 hora',
    fechaHora: '21/10/2025 07:00:00',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Tijuana, Boulevard de lo',
    ubicacionFin: 'MX, Tijuana, Boulevard de lo',
    duracionTrabajo: '0 min',
    duracionParada: '12 h',
    kilometraje: '0 km',
    fechaTimeline: '21/10/2025',
    actividades: [],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 0,
    eventos: []
  },
  {
    id: 6,
    nombre: 'VENTAS_PERCO_INS_N...',
    ubicacion: 'MX, Tijuana, Boulevard de lo...',
    velocidad: '0 km/h',
    estado: 'ignicion_bloqueada',
    coordenadas: '32.5149, -117.0382',
    plan: 'Básico plus',
    bloqueado: true,
    tiempoConductionHoy: '—',
    tiempoConductionSemana: '—',
    duracionEstado: '6 h',
    ultimaSincronizacion: 'hace 2 horas',
    fechaHora: '21/10/2025 06:00:00',
    tipoTrayecto: 'Ninguno',
    ubicacionInicio: 'MX, Tijuana, Boulevard de lo',
    ubicacionFin: 'MX, Tijuana, Boulevard de lo',
    duracionTrabajo: '0 min',
    duracionParada: '12 h',
    kilometraje: '0 km',
    fechaTimeline: '21/10/2025',
    actividades: [],
    conductor: 'Sin conductor',
    notas: '',
    notificaciones: 0,
    eventos: []
  },
])

const totalVehiculos = computed(() => vehiculos.value.length)

const vehiculosFiltrados = computed(() => {
  let resultado = vehiculos.value

  if (estadoSeleccionado.value !== 'todos') {
    resultado = resultado.filter((v) => v.estado === estadoSeleccionado.value)
  }

  if (busqueda.value) {
    resultado = resultado.filter(
      (v) =>
        v.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        v.ubicacion.toLowerCase().includes(busqueda.value.toLowerCase()),
    )
  }

  return resultado
})

function seleccionarTodos(valor) {
  if (valor) {
    estadoSeleccionado.value = 'todos'
  }
}

function seleccionarEstado(estado) {
  estadoSeleccionado.value = estado.tipo
  todosVehiculos.value = estado.tipo === 'todos'
}

function seleccionarVehiculo(vehiculo) {
  vehiculoSeleccionado.value = vehiculo
  tabActual.value = 'resumen'
  
  emit('vehiculo-seleccionado', vehiculo)
  emit('navegar-mapa', {
    lat: parseFloat(vehiculo.coordenadas.split(',')[0]),
    lng: parseFloat(vehiculo.coordenadas.split(',')[1]),
    vehiculo: vehiculo
  })
}

function volverALista() {
  vehiculoSeleccionado.value = null
  tabActual.value = 'resumen'
}

function cerrarDrawer() {
  emit('close')
}

function toggleBloqueo(valor) {
  console.log('Bloqueo cambiado:', valor)
}

function verDetallesCompletos() {
  console.log('Ver detalles completos del vehículo')
}

function getColorEstado(estado) {
  const colores = {
    todos: 'blue',
    movimiento: 'green',
    inactivo: 'orange',
    ignicion_apagada: 'blue-grey',
    carga: 'cyan',
    ignicion_bloqueada: 'red',
  }
  return colores[estado] || 'grey'
}

function getIconoEstado(estado) {
  const iconos = {
    todos: 'directions_car',
    movimiento: 'navigation',
    inactivo: 'pause_circle',
    ignicion_apagada: 'power_settings_new',
    carga: 'local_gas_station',
    ignicion_bloqueada: 'lock',
  }
  return iconos[estado] || 'directions_car'
}

function getEstadoTexto(estado) {
  const textos = {
    todos: 'Todos',
    movimiento: 'En movimiento',
    inactivo: 'Inactivo',
    ignicion_apagada: 'Ignición apagada',
    carga: 'Carga',
    ignicion_bloqueada: 'Ignición bloqueada',
  }
  return textos[estado] || 'Desconocido'
}

function getColorHex(color) {
  const colores = {
    blue: '#2196F3',
    green: '#4CAF50',
    orange: '#FF9800',
    'blue-grey': '#607D8B',
    cyan: '#00BCD4',
    red: '#F44336',
  }
  return colores[color] || '#9E9E9E'
}
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

.selector-todos {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

/* === ESTADOS GRID === */
.estados-container {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.estados-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.estado-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 80px;
}

.estado-card:hover {
  border-color: #2196F3;
  background: #f5f9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
}

.estado-card.estado-activo {
  border-color: #2196F3;
  background: #e3f2fd;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
}

.estado-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 12px;
  padding: 0 8px;
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
  border-left: 4px solid #2196F3;
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

/* === VISTA DETALLES === */
.vista-detalles {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
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

/* === INFO CARD === */
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
  border-left: 4px solid #2196F3;
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

.detalle-chip {
  font-weight: 600;
  font-size: 12px;
}

.separator {
  margin: 8px 0;
  background: #e0e0e0;
}

/* === BOTÓN DETALLES === */
.btn-detalles {
  margin-top: 8px;
  height: 48px;
  font-weight: 600;
  font-size: 14px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === TAB HOY === */
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

/* === RESUMEN DIA === */
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
  border-left-color: #4CAF50;
}

.resumen-item-card:nth-child(2) {
  border-left-color: #F44336;
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

/* === TIMELINE === */
.timeline-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.timeline-actividades {
  padding-left: 8px;
}

.timeline-title {
  font-weight: 600;
  font-size: 14px;
  color: #212121;
}

.timeline-hora {
  font-size: 12px;
  color: #757575;
  margin-top: 2px;
}

.timeline-detalle-card {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.timeline-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.timeline-info:last-child {
  margin-bottom: 0;
}

.timeline-info-label {
  font-size: 12px;
  color: #757575;
}

.timeline-info-valor {
  font-size: 13px;
  color: #212121;
  font-weight: 600;
}

/* === INFO ADICIONAL === */
.info-adicional-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 0;
}

.info-item-column {
  padding: 16px 0;
}

.info-item-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.info-item-label {
  font-size: 12px;
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
}

.info-item-valor {
  font-size: 14px;
  color: #212121;
  font-weight: 600;
  margin-top: 4px;
}

.flex-grow {
  flex: 1;
}

.notas-input {
  margin-top: 8px;
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
  display: flex;
  gap: 16px;
  align-items: center;
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
}

.evento-titulo {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 4px;
}

.evento-fecha {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* === EMPTY STATE === */
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

  .estados-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .estado-card {
    min-height: 70px;
    padding: 12px 6px;
  }

  .tab-panel-padding {
    padding: 16px;
  }
}
</style>