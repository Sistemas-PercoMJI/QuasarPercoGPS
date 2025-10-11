<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="eventos-drawer">
    <!-- Header moderno -->
    <div class="drawer-header">
      <div class="header-content">
        <div class="text-h6 text-weight-medium">Eventos</div>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
    </div>

    <!-- Stats cards -->
    <div class="stats-cards q-pa-md">
      <div class="stat-card">
        <q-icon name="notifications_active" size="24px" color="primary" />
        <div class="stat-info">
          <div class="stat-number">{{ totalEventos }}</div>
          <div class="stat-label">Eventos Activos</div>
        </div>
      </div>
      <div class="stat-card">
        <q-icon name="notifications_off" size="24px" color="grey" />
        <div class="stat-info">
          <div class="stat-number">{{ eventosInactivos }}</div>
          <div class="stat-label">Inactivos</div>
        </div>
      </div>
    </div>

    <!-- Botón nuevo evento -->
    <div class="q-px-md q-pb-md">
      <q-btn
        unelevated
        color="primary"
        icon="add"
        label="Nuevo evento"
        class="full-width"
        @click="dialogNuevoEvento = true"
      />
    </div>

    <!-- Búsqueda -->
    <div class="q-px-md q-pb-md">
      <q-input
        v-model="busqueda"
        outlined
        dense
        placeholder="Buscar eventos..."
        class="modern-search"
      >
        <template v-slot:prepend>
          <q-icon name="search" color="grey-6" />
        </template>
        <template v-slot:append v-if="busqueda">
          <q-icon name="close" class="cursor-pointer" @click="busqueda = ''" />
        </template>
      </q-input>
    </div>

    <!-- Filtro por estado -->
    <div class="q-px-md q-pb-md">
      <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">FILTRAR POR ESTADO</div>
      <q-select
        v-model="filtroEstado"
        :options="opcionesFiltro"
        outlined
        dense
        emit-value
        map-options
      />
    </div>

    <!-- Lista de eventos -->
    <q-scroll-area class="lista-scroll">
      <div class="q-pa-md">
        <q-card
          v-for="evento in eventosFiltrados"
          :key="evento.id"
          flat
          bordered
          class="evento-card q-mb-md"
          :class="{ 'evento-selected': eventoSeleccionado?.id === evento.id }"
          @click="seleccionarEvento(evento)"
        >
          <q-card-section class="row items-center q-pa-md">
            <q-avatar size="48px" :color="getColorTipoEvento(evento.tipo)" text-color="white">
              <q-icon :name="getIconoTipoEvento(evento.tipo)" size="28px" />
            </q-avatar>

            <div class="col q-ml-md">
              <div class="text-subtitle1 text-weight-medium">{{ evento.nombre }}</div>
              <div class="text-caption text-grey-7">
                <q-icon name="location_on" size="14px" />
                {{ evento.geozona }}
              </div>
              <div class="text-caption text-grey-6 q-mt-xs">
                <q-badge
                  :color="evento.activo ? 'positive' : 'grey'"
                  :label="evento.activo ? 'Activo' : 'Inactivo'"
                />
              </div>
            </div>

            <div class="column items-end">
              <q-toggle
                :model-value="evento.activo"
                @update:model-value="toggleEvento(evento)"
                color="positive"
                @click.stop
              />
              <q-btn
                flat
                dense
                round
                icon="more_vert"
                size="sm"
                @click.stop="mostrarMenuContextual(evento)"
              />
            </div>
          </q-card-section>
        </q-card>

        <div v-if="eventosFiltrados.length === 0" class="no-data">
          <q-icon name="notifications_off" size="64px" color="grey-4" />
          <div class="text-grey-6 q-mt-md">No se encontraron eventos</div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Dialog: Nuevo Evento -->
    <q-dialog v-model="dialogNuevoEvento" persistent maximized transition-show="slide-up">
      <q-card class="modern-dialog-full">
        <!-- Header del dialog -->
        <q-card-section class="dialog-header-full bg-primary text-white">
          <div class="row items-center">
            <div class="col">
              <div class="text-h6">Crear Nuevo Evento</div>
              <div class="text-caption">Estado de evento "ON"</div>
            </div>
            <q-toggle v-model="nuevoEvento.activo" color="white" keep-color size="lg" />
            <q-btn flat dense round icon="close" v-close-popup color="white" class="q-ml-md" />
          </div>
        </q-card-section>

        <!-- Contenido del formulario -->
        <q-card-section class="scroll-content q-pa-lg">
          <div class="form-container">
            <!-- Nombre del evento -->
            <div class="form-section">
              <div class="section-title">Información básica</div>
              <q-input
                v-model="nuevoEvento.nombre"
                label="Nombre del Evento"
                outlined
                class="q-mb-md"
              />

              <q-input
                v-model="nuevoEvento.descripcion"
                label="Descripción"
                type="textarea"
                outlined
                rows="3"
              />
            </div>

            <!-- Condición de tiempo -->
            <div class="form-section">
              <div class="section-title">
                <q-icon name="schedule" size="24px" color="primary" class="q-mr-sm" />
                Condición de tiempo
              </div>
              <q-toggle v-model="nuevoEvento.condicionTiempo" label="Apagado" color="positive" />
            </div>

            <!-- Condición geográfica -->
            <div class="form-section">
              <div class="section-title">
                <q-icon name="place" size="24px" color="primary" class="q-mr-sm" />
                Condición geográfica
              </div>

              <!-- Lista de condiciones -->
              <div v-for="(condicion, index) in nuevoEvento.condiciones" :key="index">
                <div class="condicion-item q-mb-md">
                  <div class="condicion-header">
                    <q-badge color="primary" :label="String.fromCharCode(65 + index)" />
                    <q-btn
                      v-if="nuevoEvento.condiciones.length > 1"
                      flat
                      dense
                      round
                      icon="close"
                      size="sm"
                      color="negative"
                      @click="eliminarCondicion(index)"
                    >
                      <q-tooltip>Eliminar condición</q-tooltip>
                    </q-btn>
                  </div>

                  <div class="row q-col-gutter-md q-mt-sm">
                    <div class="col-6">
                      <q-select
                        v-model="condicion.tipo"
                        :options="opcionesCondicion"
                        label="Condición"
                        outlined
                        dense
                        emit-value
                        map-options
                      />
                    </div>
                    <div class="col-6">
                      <q-select
                        v-model="condicion.activacion"
                        :options="opcionesActivacion"
                        label="Activar cuando el vehículo está"
                        outlined
                        dense
                        emit-value
                        map-options
                      />
                    </div>
                  </div>

                  <q-select
                    v-model="condicion.geozona"
                    :options="opcionesGeozonas"
                    label="Geozona"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="q-mt-md"
                    hint="Selecciona una geozona o POI"
                  >
                    <template v-slot:prepend>
                      <q-icon name="layers" />
                    </template>
                  </q-select>
                </div>

                <!-- Operador lógico entre condiciones -->
                <div
                  v-if="index < nuevoEvento.condiciones.length - 1"
                  class="operador-logico q-my-md"
                >
                  <q-btn-toggle
                    v-model="nuevoEvento.operadoresLogicos[index]"
                    toggle-color="primary"
                    :options="[
                      { label: 'Y (AND)', value: 'AND' },
                      { label: 'O (OR)', value: 'OR' },
                    ]"
                    unelevated
                    class="operador-toggle"
                  />
                </div>
              </div>

              <q-btn
                flat
                color="primary"
                icon="add"
                label="Añadir condición"
                @click="agregarCondicion"
                class="q-mt-md"
              />
            </div>

            <!-- Patrón de criterios -->
            <div class="form-section">
              <div class="section-title">Patrón de criterios</div>
              <div class="patron-box">
                {{ patronCriterios }}
              </div>
              <div class="text-caption text-grey-6 q-mt-sm">
                Las condiciones se evalúan con operador AND (todas deben cumplirse)
              </div>
            </div>

            <!-- Activación de alerta -->
            <div class="form-section">
              <div class="section-title">Activación de alerta</div>
              <q-select
                v-model="nuevoEvento.activacionAlerta"
                :options="opcionesActivacionAlerta"
                label="Activación de alerta"
                outlined
                emit-value
                map-options
              />
            </div>

            <!-- Aplicación del evento -->
            <div class="form-section">
              <div class="section-title">Aplicación del evento</div>
              <q-option-group
                v-model="nuevoEvento.aplicacion"
                :options="opcionesAplicacion"
                color="primary"
              />

              <!-- Horario si se selecciona "A los días y horas establecidos" -->
              <div v-if="nuevoEvento.aplicacion === 'horario'" class="q-mt-md">
                <q-input label="Días de la semana" outlined readonly hint="Selecciona los días">
                  <template v-slot:append>
                    <q-icon name="calendar_today" class="cursor-pointer" />
                  </template>
                </q-input>

                <div class="row q-col-gutter-md q-mt-md">
                  <div class="col-6">
                    <q-input
                      v-model="nuevoEvento.horaInicio"
                      label="Hora inicio"
                      outlined
                      type="time"
                    />
                  </div>
                  <div class="col-6">
                    <q-input v-model="nuevoEvento.horaFin" label="Hora fin" outlined type="time" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Botones de acción -->
        <q-card-actions class="dialog-actions q-pa-lg bg-grey-1">
          <q-btn flat label="Cerrar" color="grey-7" v-close-popup size="md" />
          <q-space />
          <q-btn
            unelevated
            label="Crear"
            color="primary"
            @click="guardarEvento"
            :disable="!nuevoEvento.nombre"
            size="md"
            class="q-px-lg"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Menú contextual -->
    <q-menu v-model="menuContextualVisible" context-menu>
      <q-list style="min-width: 180px">
        <q-item clickable v-close-popup @click="editarEvento">
          <q-item-section avatar>
            <q-icon name="edit" color="primary" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="duplicarEvento">
          <q-item-section avatar>
            <q-icon name="content_copy" color="blue" />
          </q-item-section>
          <q-item-section>Duplicar</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-close-popup @click="eliminarEvento">
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Eliminar</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['close', 'evento-seleccionado'])

// Estado
const busqueda = ref('')
const filtroEstado = ref('todos')
const eventoSeleccionado = ref(null)
const dialogNuevoEvento = ref(false)
const menuContextualVisible = ref(false)
const eventoMenu = ref(null)

// Formulario nuevo evento
const nuevoEvento = ref({
  nombre: '',
  descripcion: '',
  activo: true,
  condicionTiempo: false,
  condiciones: [
    {
      tipo: 'Geocerca',
      activacion: 'Dentro',
      geozona: null,
    },
  ],
  operadoresLogicos: [], // Array de operadores entre condiciones
  activacionAlerta: 'Al inicio',
  aplicacion: 'siempre',
  horaInicio: '',
  horaFin: '',
})

// Computed para el patrón de criterios
const patronCriterios = computed(() => {
  if (nuevoEvento.value.condiciones.length === 1) {
    return 'A'
  }

  const letras = nuevoEvento.value.condiciones.map((_, index) => String.fromCharCode(65 + index))
  let patron = letras[0]

  for (let i = 0; i < nuevoEvento.value.operadoresLogicos.length; i++) {
    const operador = nuevoEvento.value.operadoresLogicos[i] || 'AND'
    patron += ` ${operador} ${letras[i + 1]}`
  }

  return patron
})

// Opciones
const opcionesFiltro = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activos' },
  { label: 'Inactivos', value: 'inactivos' },
]

const opcionesCondicion = [
  { label: 'Geocerca', value: 'Geocerca' },
  { label: 'Velocidad', value: 'Velocidad' },
  { label: 'Tiempo', value: 'Tiempo' },
]

const opcionesActivacion = [
  { label: 'Dentro', value: 'Dentro' },
  { label: 'Fuera', value: 'Fuera' },
  { label: 'Entrada', value: 'Entrada' },
  { label: 'Salida', value: 'Salida' },
]

const opcionesGeozonas = [
  { label: 'A&J PROCESSING "MURUA"', value: 'geozona1' },
  { label: 'AGUILAS DEL DESIERTO', value: 'geozona2' },
  { label: 'ALBERTO PESQUEIRA', value: 'geozona3' },
  { label: 'ALLIANCE PLANTA 2', value: 'geozona4' },
]

const opcionesActivacionAlerta = [
  { label: 'Al inicio', value: 'Al inicio' },
  { label: 'Cada vez', value: 'Cada vez' },
  { label: 'Una vez al día', value: 'Una vez al día' },
]

const opcionesAplicacion = [
  { label: 'Siempre', value: 'siempre' },
  { label: 'A los días y horas establecidos', value: 'horario' },
]

// Datos de ejemplo
const eventos = ref([
  {
    id: 1,
    nombre: 'SALIDA OPTI-SOURCE',
    geozona: 'OPTI-SOURCE',
    tipo: 'salida',
    activo: true,
  },
  {
    id: 2,
    nombre: 'ENTRADA OPTI-SOURCE',
    geozona: 'OPTI-SOURCE',
    tipo: 'entrada',
    activo: true,
  },
  {
    id: 3,
    nombre: 'SALIDA CESPT ROSARITO',
    geozona: 'CESPT ROSARITO',
    tipo: 'salida',
    activo: true,
  },
  {
    id: 4,
    nombre: 'ENTRADA CESPT ROSARITO',
    geozona: 'CESPT ROSARITO',
    tipo: 'entrada',
    activo: true,
  },
  {
    id: 5,
    nombre: 'SALIDA CESPT REFORMA',
    geozona: 'CESPT REFORMA',
    tipo: 'salida',
    activo: false,
  },
])

// Computed
const totalEventos = computed(() => eventos.value.filter((e) => e.activo).length)
const eventosInactivos = computed(() => eventos.value.filter((e) => !e.activo).length)

const eventosFiltrados = computed(() => {
  let resultado = eventos.value

  // Filtrar por estado
  if (filtroEstado.value === 'activos') {
    resultado = resultado.filter((e) => e.activo)
  } else if (filtroEstado.value === 'inactivos') {
    resultado = resultado.filter((e) => !e.activo)
  }

  // Filtrar por búsqueda
  if (busqueda.value) {
    resultado = resultado.filter(
      (e) =>
        e.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        e.geozona.toLowerCase().includes(busqueda.value.toLowerCase()),
    )
  }

  return resultado
})

// Methods
function cerrarDrawer() {
  emit('close')
}

function seleccionarEvento(evento) {
  eventoSeleccionado.value = evento
  emit('evento-seleccionado', evento)
}

function getColorTipoEvento(tipo) {
  return tipo === 'entrada' ? 'positive' : 'warning'
}

function getIconoTipoEvento(tipo) {
  return tipo === 'entrada' ? 'login' : 'logout'
}

function toggleEvento(evento) {
  evento.activo = !evento.activo
}

// Agregar nueva condición
function agregarCondicion() {
  nuevoEvento.value.condiciones.push({
    tipo: 'Geocerca',
    activacion: 'Dentro',
    geozona: null,
  })

  // Agregar operador por defecto (AND)
  nuevoEvento.value.operadoresLogicos.push('AND')
}

// Eliminar condición
function eliminarCondicion(index) {
  if (nuevoEvento.value.condiciones.length > 1) {
    nuevoEvento.value.condiciones.splice(index, 1)

    // Ajustar operadores lógicos
    if (index < nuevoEvento.value.operadoresLogicos.length) {
      nuevoEvento.value.operadoresLogicos.splice(index, 1)
    } else if (nuevoEvento.value.operadoresLogicos.length > 0) {
      nuevoEvento.value.operadoresLogicos.splice(index - 1, 1)
    }
  }
}

function guardarEvento() {
  eventos.value.push({
    id: eventos.value.length + 1,
    nombre: nuevoEvento.value.nombre,
    geozona:
      nuevoEvento.value.condiciones[0]?.geozona ||
      opcionesGeozonas.find((g) => g.value === nuevoEvento.value.condiciones[0]?.geozona)?.label ||
      'Sin geozona',
    tipo:
      nuevoEvento.value.condiciones[0]?.activacion === 'Entrada' ||
      nuevoEvento.value.condiciones[0]?.activacion === 'Dentro'
        ? 'entrada'
        : 'salida',
    activo: nuevoEvento.value.activo,
  })

  // Reset form
  nuevoEvento.value = {
    nombre: '',
    descripcion: '',
    activo: true,
    condicionTiempo: false,
    condiciones: [
      {
        tipo: 'Geocerca',
        activacion: 'Dentro',
        geozona: null,
      },
    ],
    operadoresLogicos: [],
    activacionAlerta: 'Al inicio',
    aplicacion: 'siempre',
    horaInicio: '',
    horaFin: '',
  }

  dialogNuevoEvento.value = false
}

function mostrarMenuContextual(evento) {
  eventoMenu.value = evento
  menuContextualVisible.value = true
}

function editarEvento() {
  console.log('Editar:', eventoMenu.value)
}

function duplicarEvento() {
  const eventoDuplicado = {
    ...eventoMenu.value,
    id: eventos.value.length + 1,
    nombre: `${eventoMenu.value.nombre} (Copia)`,
  }
  eventos.value.push(eventoDuplicado)
}

function eliminarEvento() {
  const index = eventos.value.findIndex((e) => e.id === eventoMenu.value.id)
  if (index > -1) {
    eventos.value.splice(index, 1)
  }
}
</script>

<style scoped>
.eventos-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.drawer-header {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.header-content .text-h6 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 4px;
}

.modern-search {
  background: white;
  border-radius: 12px;
}

.lista-scroll {
  flex: 1;
  height: 100%;
}

.evento-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: white;
}

.evento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.evento-selected {
  border: 2px solid #4facfe;
  background: #f0f9ff;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* Dialog fullscreen */
.modern-dialog-full {
  display: flex;
  flex-direction: column;
}

.dialog-header-full {
  padding: 24px;
  flex-shrink: 0;
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.condicion-item {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.condicion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.patron-box {
  background: #f5f5f5;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #666;
}

.operador-logico {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
}

.operador-toggle {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dialog-actions {
  flex-shrink: 0;
  border-top: 1px solid #e0e0e0;
}
</style>
