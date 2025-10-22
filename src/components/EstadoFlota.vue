<template>
  <div class="estado-flota-container">
    <!-- Panel Izquierdo: Contenido completo -->
    <div class="panel-izquierdo">
      <!-- Vista de lista de vehículos -->
      <div v-if="!vehiculoSeleccionado" class="lista-vehiculos">
        <div class="drawer-header">
          <div class="text-h6 text-weight-medium">Estado de la flota</div>
          <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
        </div>

        <div class="q-pa-sm q-px-md">
          <q-checkbox
            v-model="todosVehiculos"
            label="Todos los vehículos"
            @update:model-value="seleccionarTodos"
            dense
          />
          <span class="text-grey-7 q-ml-sm">{{ totalVehiculos }}</span>
          <q-btn flat dense round icon="more_vert" size="sm" class="float-right" />
        </div>

        <div class="estados-grid q-px-md q-pb-sm">
          <q-btn
            v-for="estado in estadosVehiculos"
            :key="estado.tipo"
            flat
            class="estado-btn"
            @click="seleccionarEstado(estado)"
            :class="{ 'estado-activo': estadoSeleccionado === estado.tipo }"
          >
            <div class="estado-contenido">
              <q-icon :name="estado.icono" size="22px" :color="estado.color" class="estado-icono" />
              <div class="estado-numero" :style="{ background: getColorHex(estado.color) }">
                {{ estado.cantidad }}
              </div>
            </div>
          </q-btn>
        </div>

        <div class="q-px-md q-pb-sm">
          <q-input v-model="busqueda" outlined dense placeholder="Búsqueda" class="search-input">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <div class="tabla-header q-px-md">
          <div class="header-item">Nombre del vehículo</div>
          <div class="header-item text-right">Velocidad</div>
          <q-btn flat dense round icon="more_vert" size="sm" />
        </div>

        <q-list class="vehiculos-list">
          <q-item
            v-for="vehiculo in vehiculosFiltrados"
            :key="vehiculo.id"
            clickable
            v-ripple
            @click="seleccionarVehiculo(vehiculo)"
            :active="vehiculoSeleccionado?.id === vehiculo.id"
            class="vehiculo-item"
          >
            <q-item-section avatar>
              <q-avatar :color="getColorEstado(vehiculo.estado)" text-color="white" size="40px">
                <q-icon :name="getIconoEstado(vehiculo.estado)" size="24px" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-medium">{{ vehiculo.nombre }}</q-item-label>
              <q-item-label caption class="text-grey-7">{{ vehiculo.ubicacion }}</q-item-label>
            </q-item-section>

            <q-item-section side class="text-right">
              <q-item-label>{{ vehiculo.velocidad }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Vista de detalles del vehículo -->
      <div v-else class="detalles-vehiculo">
        <div class="drawer-header">
          <q-btn flat dense round icon="arrow_back" color="white" @click="cerrarDetalles" />
          <div class="text-h6 text-weight-medium">{{ vehiculoSeleccionado.nombre }}</div>
          <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
        </div>

        <!-- Tabs de navegación -->
        <q-tabs
          v-model="tabActual"
          dense
          class="text-grey-7 bg-white"
          active-color="primary"
          indicator-color="primary"
          align="justify"
          outside-arrows
          mobile-arrows
        >
          <q-tab name="resumen" icon="description" label="Resumen" />
          <q-tab name="hoy" icon="schedule" label="Hoy" />
          <q-tab name="notificaciones" icon="notifications" label="Notificaciones">
            <q-badge v-if="vehiculoSeleccionado.notificaciones > 0" color="red" floating>
              {{ vehiculoSeleccionado.notificaciones }}
            </q-badge>
          </q-tab>
          <q-tab name="combustible" icon="local_gas_station" label="Combustible" />
        </q-tabs>

        <!-- Contenido de las tabs -->
        <q-tab-panels v-model="tabActual" animated class="tab-panels">
          <!-- Tab Resumen -->
          <q-tab-panel name="resumen" class="q-pa-md">
            <div class="detalle-seccion">
              <div class="detalle-item">
                <q-icon name="place" color="primary" size="20px" />
                <div class="detalle-texto">
                  <div class="detalle-label">Ubicación</div>
                  <div class="detalle-valor">{{ vehiculoSeleccionado.ubicacion }}</div>
                  <div class="detalle-coordenadas">
                    {{ vehiculoSeleccionado.coordenadas }}
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Plan</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.plan }}</div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Bloquear vehículo</div>
                <q-toggle
                  v-model="vehiculoSeleccionado.bloqueado"
                  color="grey-7"
                  @update:model-value="toggleBloqueo"
                />
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Estado actual</div>
                <div class="detalle-valor-derecha">
                  <q-chip :color="getColorEstado(vehiculoSeleccionado.estado)" text-color="white" dense>
                    {{ getEstadoTexto(vehiculoSeleccionado.estado) }}
                  </q-chip>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Tiempo de conducción restante hoy</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.tiempoConductionHoy }}</div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Tiempo de conducción restante esta semana</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.tiempoConductionSemana }}</div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Duración de estado</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.duracionEstado }}</div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Última sincronización de señal</div>
                <div class="detalle-valor-derecha text-grey-7">
                  {{ vehiculoSeleccionado.ultimaSincronizacion }}
                  <q-icon name="info_outline" size="16px" class="q-ml-xs" />
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Fecha y hora</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.fechaHora }}</div>
              </div>

              <q-separator class="q-my-md" />

              <div class="detalle-item">
                <div class="detalle-label-simple">Tipo de trayecto</div>
                <div class="detalle-valor-derecha">{{ vehiculoSeleccionado.tipoTrayecto }}</div>
              </div>
            </div>

            <q-btn 
              color="primary" 
              label="Detalles del vehículo" 
              class="full-width q-mt-md"
              @click="verDetallesCompletos"
            />
          </q-tab-panel>

          <!-- Tab Hoy -->
          <q-tab-panel name="hoy" class="q-pa-md">
            <div class="filtro-dia">
              <q-btn flat dense icon="chevron_left" />
              <span class="text-weight-medium">Hoy</span>
              <q-btn flat dense icon="chevron_right" />
            </div>

            <div class="resumen-dia q-mt-md">
              <div class="resumen-item">
                <div class="resumen-label">Ubicación de inicio</div>
                <div class="resumen-valor">{{ vehiculoSeleccionado.ubicacionInicio }}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Ubicación de fin</div>
                <div class="resumen-valor">{{ vehiculoSeleccionado.ubicacionFin }}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Duración de trabajo</div>
                <div class="resumen-valor">{{ vehiculoSeleccionado.duracionTrabajo }}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Duración de parada</div>
                <div class="resumen-valor">{{ vehiculoSeleccionado.duracionParada }}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Kilometraje</div>
                <div class="resumen-valor">{{ vehiculoSeleccionado.kilometraje }}</div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <div class="timeline-header q-mb-md">
              <span class="text-weight-medium">{{ vehiculoSeleccionado.fechaTimeline }}</span>
            </div>

            <q-timeline color="primary" class="timeline-actividades">
              <q-timeline-entry
                v-for="(actividad, index) in vehiculoSeleccionado.actividades"
                :key="index"
                :title="actividad.titulo"
                :subtitle="actividad.hora"
                :icon="actividad.icono"
                :color="actividad.color"
              >
                <div class="actividad-detalle">
                  <div class="actividad-info">
                    <div>Duración de la {{ actividad.tipo }}</div>
                    <div class="text-weight-medium">{{ actividad.duracion }}</div>
                  </div>
                  <div class="actividad-info">
                    <div>Kilometraje</div>
                    <div class="text-weight-medium">{{ actividad.kilometraje }}</div>
                  </div>
                </div>
              </q-timeline-entry>
            </q-timeline>

            <div class="conducido-por q-mt-md">
              <div class="text-grey-7">Conducido por</div>
              <div class="text-weight-medium">{{ vehiculoSeleccionado.conductor }}</div>
            </div>

            <div class="tipo-trayecto-seccion q-mt-md">
              <div class="text-grey-7">Tipo de trayecto</div>
              <div class="text-weight-medium">{{ vehiculoSeleccionado.tipoTrayecto }}</div>
              <q-btn flat dense color="primary" label="EDITAR" size="sm" />
            </div>

            <div class="notas-seccion q-mt-md">
              <div class="text-grey-7">Notas</div>
              <q-input 
                v-model="vehiculoSeleccionado.notas" 
                outlined 
                type="textarea" 
                placeholder="Agregar nota..."
                class="q-mt-sm"
              />
              <q-btn flat dense color="primary" label="EDITAR" size="sm" class="q-mt-xs" />
            </div>
          </q-tab-panel>

          <!-- Tab Notificaciones -->
          <q-tab-panel name="notificaciones" class="q-pa-md">
            <div class="filtro-notificaciones q-mb-md">
              <q-select
                v-model="filtroNotificaciones"
                :options="['Todo', 'Alertas', 'Info', 'Eventos']"
                outlined
                dense
                label="Mostrar eventos"
              />
            </div>

            <q-list v-if="vehiculoSeleccionado.eventos && vehiculoSeleccionado.eventos.length > 0">
              <q-item 
                v-for="(evento, index) in vehiculoSeleccionado.eventos" 
                :key="index"
                class="evento-item"
              >
                <q-item-section avatar>
                  <q-avatar :color="evento.color" text-color="white" size="40px">
                    <q-icon :name="evento.icono" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ evento.titulo }}</q-item-label>
                  <q-item-label caption>{{ evento.fecha }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-icon name="expand_more" />
                </q-item-section>
              </q-item>
            </q-list>

            <div v-else class="sin-notificaciones">
              <div class="icono-vacio">
                <q-icon name="sentiment_satisfied" size="80px" color="grey-5" />
              </div>
              <div class="texto-vacio text-grey-7">No hay eventos para mostrar</div>
            </div>
          </q-tab-panel>

          <!-- Tab Combustible -->
          <q-tab-panel name="combustible" class="q-pa-md">
            <div class="sin-notificaciones">
              <div class="icono-vacio">
                <q-icon name="sentiment_satisfied" size="80px" color="grey-5" />
              </div>
              <div class="texto-vacio text-grey-7">No hay información de combustible disponible</div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>

    <!-- Panel Derecho: Mapa (opcional, más pequeño) -->
    <div class="panel-derecho">
      <div class="mapa-container">
        <!-- Aquí iría tu componente de mapa -->
        <div class="mapa-placeholder">
          <q-icon name="map" size="60px" color="grey-5" />
          <div class="text-grey-7 q-mt-sm text-caption">Mapa</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Emits
const emit = defineEmits(['close', 'vehiculo-seleccionado', 'navegar-mapa'])

// Estado
const todosVehiculos = ref(true)
const estadoSeleccionado = ref('todos')
const busqueda = ref('')
const vehiculoSeleccionado = ref(null)
const tabActual = ref('resumen')
const filtroNotificaciones = ref('Todo')

// Definición de estados de vehículos
const estadosVehiculos = ref([
  { tipo: 'todos', nombre: 'Todos', icono: 'directions_car', color: 'blue', cantidad: 6 },
  { tipo: 'movimiento', nombre: 'En movimiento', icono: 'navigation', color: 'green', cantidad: 0 },
  { tipo: 'inactivo', nombre: 'Inactivo', icono: 'pause_circle', color: 'orange', cantidad: 1 },
  { tipo: 'ignicion_apagada', nombre: 'Ignición apagada', icono: 'power_settings_new', color: 'blue-grey', cantidad: 4 },
  { tipo: 'carga', nombre: 'Carga', icono: 'local_gas_station', color: 'cyan', cantidad: 0 },
  { tipo: 'ignicion_bloqueada', nombre: 'Ignición bloqueada', icono: 'lock', color: 'red', cantidad: 1 },
])

// Lista de vehículos con información completa
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
      {
        titulo: 'Parada',
        hora: '0:00',
        tipo: 'parada',
        duracion: '10 h 18 min',
        kilometraje: '0,00 km',
        icono: 'pause_circle',
        color: 'orange'
      },
      {
        titulo: 'Inicio',
        hora: '10:17',
        tipo: 'conducción',
        duracion: '1 min',
        kilometraje: '0,00 km',
        icono: 'play_arrow',
        color: 'green'
      },
      {
        titulo: 'Parada',
        hora: '10:18',
        tipo: 'parada',
        duracion: '6 min',
        kilometraje: '0,00 km',
        icono: 'pause_circle',
        color: 'orange'
      }
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
      {
        titulo: 'SALIDA TALLER MJ INDUSTRIAL',
        fecha: '21/10/2025 9:49',
        icono: 'exit_to_app',
        color: 'blue'
      }
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

// Computed
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

// Methods
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
  
  // Emitir evento para navegar en el mapa
  emit('vehiculo-seleccionado', vehiculo)
  emit('navegar-mapa', {
    lat: parseFloat(vehiculo.coordenadas.split(',')[0]),
    lng: parseFloat(vehiculo.coordenadas.split(',')[1]),
    vehiculo: vehiculo
  })
}

function cerrarDrawer() {
  emit('close')
}

function cerrarDetalles() {
  vehiculoSeleccionado.value = null
}

function toggleBloqueo(valor) {
  console.log('Bloqueo cambiado:', valor)
  // Aquí puedes agregar la lógica para bloquear/desbloquear el vehículo en Firebase
}

function verDetallesCompletos() {
  console.log('Ver detalles completos del vehículo')
  // Navegar a una vista completa o abrir un modal con más detalles
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
.estado-flota-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: white;
  position: relative;
  overflow: hidden;
}

.panel-izquierdo {
  width: 100%;
  max-width: 500px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e0e0e0;
}

.panel-derecho {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  border-left: 1px solid #e0e0e0;
}

.lista-vehiculos {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.detalles-vehiculo {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mapa-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mapa-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  min-height: 48px;
}

.drawer-header .text-h6 {
  color: white;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

/* Grid de estados */
.estados-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.estado-btn {
  padding: 8px 6px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  background: white;
  transition: all 0.3s ease;
}

.estado-btn:hover {
  border-color: #1976d2;
  background: #f5f5f5;
}

.estado-btn.estado-activo {
  border-color: #1976d2;
  background: #e3f2fd;
}

.estado-contenido {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.estado-icono {
  font-size: 22px;
}

.estado-numero {
  min-width: 28px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  padding: 0 6px;
}

/* Búsqueda */
.search-input {
  background: white;
}

/* Tabla header */
.tabla-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
  color: #666;
  font-size: 11px;
}

.header-item {
  flex: 1;
}

/* Lista de vehículos */
.vehiculos-list {
  flex: 1;
  overflow-y: auto;
}

.vehiculo-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 10px 12px;
}

.vehiculo-item.q-item--active {
  background-color: #e3f2fd;
}

.vehiculo-item:hover {
  background-color: #f5f5f5;
}

/* Tabs */
.tab-panels {
  flex: 1;
  overflow-y: auto;
  background: white;
}

/* Panel de Resumen */
.detalle-seccion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detalle-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detalle-texto {
  flex: 1;
}

.detalle-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.detalle-valor {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.detalle-coordenadas {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.detalle-label-simple {
  flex: 1;
  font-size: 14px;
  color: #666;
}

.detalle-valor-derecha {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  text-align: right;
}

/* Tab Hoy */
.filtro-dia {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.resumen-dia {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resumen-label {
  font-size: 13px;
  color: #666;
}

.resumen-valor {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.timeline-header {
  font-size: 14px;
  color: #333;
}

.timeline-actividades {
  padding: 0;
}

.actividad-detalle {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.actividad-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.conducido-por {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.tipo-trayecto-seccion {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notas-seccion {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

/* Tab Notificaciones */
.filtro-notificaciones {
  width: 100%;
}

.evento-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 0;
}

.sin-notificaciones {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.icono-vacio {
  margin-bottom: 16px;
}

.texto-vacio {
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .estado-flota-container {
    flex-direction: column;
  }

  .panel-izquierdo {
    width: 100%;
    max-width: 100%;
    height: 100%;
  }

  .panel-derecho {
    display: none;
  }
}

@media (max-width: 1024px) {
  .panel-derecho {
    width: 250px;
  }
}
</style>