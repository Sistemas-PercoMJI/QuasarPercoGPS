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

    <!-- 🐛 DEBUG: Info temporal -->
    <div v-if="pois.length === 0 && geozonas.length === 0" class="q-pa-md bg-warning text-white">
      <div class="text-subtitle2">⚠️ No hay ubicaciones cargadas</div>
      <div class="text-caption">POIs: {{ pois.length }} | Geozonas: {{ geozonas.length }}</div>
      <div class="text-caption">UserId: {{ userId }}</div>
      <q-btn 
        flat 
        dense 
        label="Recargar datos" 
        icon="refresh" 
        color="white"
        @click="recargarDatos"
        class="q-mt-sm"
      />
    </div>

    <!-- ✅ INFO: Datos cargados -->
    <div v-else-if="pois.length > 0 || geozonas.length > 0" class="q-pa-sm bg-positive text-white text-caption">
      ✅ Datos cargados: {{ pois.length }} POIs, {{ geozonas.length }} Geozonas
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
        @click="abrirDialogoNuevo"
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
        <!-- Loading -->
        <div v-if="loading" class="no-data">
          <q-spinner color="primary" size="48px" />
          <div class="text-grey-6 q-mt-md">Cargando eventos...</div>
        </div>

        <!-- Lista de eventos -->
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
            <q-avatar size="48px" :color="getColorTipoEvento(evento)" text-color="white">
              <q-icon :name="getIconoTipoEvento(evento)" size="28px" />
            </q-avatar>

            <div class="col q-ml-md">
              <div class="text-subtitle1 text-weight-medium">{{ evento.nombre }}</div>
              <div class="text-caption text-grey-7">
                <q-icon name="location_on" size="14px" />
                {{ obtenerNombreGeozona(evento) }}
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
                @update:model-value="toggleEventoEstado(evento)"
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

        <div v-if="!loading && eventosFiltrados.length === 0" class="no-data">
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
              <div class="text-h6">{{ modoEdicion ? 'Editar Evento' : 'Crear Nuevo Evento' }}</div>
              <div class="text-caption">
                Estado de evento {{ nuevoEvento.activo ? 'ON' : 'OFF' }}
              </div>
            </div>
            <q-toggle v-model="nuevoEvento.activo" color="white" keep-color size="lg" />
            <q-btn
              flat
              dense
              round
              icon="close"
              v-close-popup
              color="white"
              class="q-ml-md"
              @click="cancelarFormulario"
            />
          </div>
        </q-card-section>

        <!-- Contenido del formulario -->
        <q-card-section class="scroll-content q-pa-lg">
          <div class="form-container">
            <!-- Información básica -->
            <div class="form-section">
              <div class="section-title">Información básica</div>
              <q-input
                v-model="nuevoEvento.nombre"
                label="Nombre del Evento"
                outlined
                class="q-mb-md"
                :rules="[(val) => !!val || 'El nombre es requerido']"
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
              <q-toggle
                v-model="nuevoEvento.condicionTiempo"
                :label="nuevoEvento.condicionTiempo ? 'Activado' : 'Desactivado'"
                color="positive"
              />
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
                        label="Tipo de ubicación"
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
                        label="Activar cuando"
                        outlined
                        dense
                        emit-value
                        map-options
                      />
                    </div>
                  </div>

                  <q-select
                    v-model="condicion.ubicacionId"
                    :options="opcionesUbicaciones"
                    label="Seleccionar ubicación"
                    outlined
                    dense
                    emit-value
                    map-options
                    class="q-mt-md"
                    :hint="opcionesUbicaciones.length === 0 ? 'No hay ubicaciones disponibles. Crea POIs o Geozonas primero.' : `Selecciona ${condicion.tipo === 'POI' ? 'un punto de interés' : 'una geozona'}`"
                    :disable="opcionesUbicaciones.length === 0"
                  >
                    <template v-slot:prepend>
                      <q-icon :name="condicion.tipo === 'POI' ? 'place' : 'layers'" />
                    </template>
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          <q-item-label>No hay {{ condicion.tipo === 'POI' ? 'POIs' : 'Geozonas' }} disponibles</q-item-label>
                          <q-item-label caption>Crea algunas ubicaciones primero</q-item-label>
                        </q-item-section>
                      </q-item>
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
                {{ descripcionPatron }}
              </div>
            </div>

            <!-- Activación de alerta -->
            <div class="form-section">
              <div class="section-title">
                <q-icon name="notifications" size="24px" color="primary" class="q-mr-sm" />
                Activación de alerta
              </div>
              <q-select
                v-model="nuevoEvento.activacionAlerta"
                :options="opcionesActivacionAlerta"
                label="¿Cuándo notificar?"
                outlined
                emit-value
                map-options
                hint="Define la frecuencia de las notificaciones"
              />
            </div>

            <!-- Aplicación del evento -->
            <div class="form-section">
              <div class="section-title">
                <q-icon name="event" size="24px" color="primary" class="q-mr-sm" />
                Aplicación del evento
              </div>
              <q-option-group
                v-model="nuevoEvento.aplicacion"
                :options="opcionesAplicacion"
                color="primary"
              />

              <!-- Horario si se selecciona "A los días y horas establecidos" -->
              <div v-if="nuevoEvento.aplicacion === 'horario'" class="q-mt-md">
                <q-select
                  v-model="nuevoEvento.diasSemana"
                  :options="opcionesDiasSemana"
                  label="Días de la semana"
                  outlined
                  multiple
                  emit-value
                  map-options
                  hint="Selecciona los días en que estará activo"
                >
                  <template v-slot:prepend>
                    <q-icon name="calendar_today" />
                  </template>
                </q-select>

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
          <q-btn
            flat
            label="Cancelar"
            color="grey-7"
            v-close-popup
            size="md"
            @click="cancelarFormulario"
          />
          <q-space />
          <q-btn
            unelevated
            :label="modoEdicion ? 'Actualizar' : 'Crear'"
            color="primary"
            @click="guardarEvento"
            :disable="!esFormularioValido"
            :loading="loading"
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

        <q-item clickable v-close-popup @click="duplicarEventoSeleccionado">
          <q-item-section avatar>
            <q-icon name="content_copy" color="blue" />
          </q-item-section>
          <q-item-section>Duplicar</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-close-popup @click="eliminarEventoSeleccionado">
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { useEventos } from 'src/composables/useEventos'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'

const $q = useQuasar()
const emit = defineEmits(['close', 'evento-seleccionado'])

// Auth
const userId = ref(auth.currentUser?.uid || '')

// Composables
const {
  loading,
  crearEvento,
  obtenerEventos,
  actualizarEvento,
  eliminarEvento,
  toggleEvento,
  duplicarEvento,
} = useEventos(userId.value)

const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)

// Estado
const busqueda = ref('')
const filtroEstado = ref('todos')
const eventoSeleccionado = ref(null)
const dialogNuevoEvento = ref(false)
const menuContextualVisible = ref(false)
const eventoMenu = ref(null)
const modoEdicion = ref(false)

// Datos cargados desde Firebase
const eventos = ref([])
const pois = ref([])
const geozonas = ref([])

// Formulario nuevo evento
const nuevoEvento = ref({
  nombre: '',
  descripcion: '',
  activo: true,
  condicionTiempo: false,
  condiciones: [
    {
      tipo: 'POI',
      activacion: 'Entrada',
      ubicacionId: null,
    },
  ],
  operadoresLogicos: [],
  activacionAlerta: 'Al inicio',
  aplicacion: 'siempre',
  diasSemana: [],
  horaInicio: '',
  horaFin: '',
})

// Opciones
const opcionesFiltro = [
  { label: 'Todos', value: 'todos' },
  { label: 'Activos', value: 'activos' },
  { label: 'Inactivos', value: 'inactivos' },
]

const opcionesCondicion = [
  { label: 'Punto de Interés (POI)', value: 'POI' },
  { label: 'Geozona', value: 'Geozona' },
]

const opcionesActivacion = [
  { label: 'Entrada', value: 'Entrada' },
  { label: 'Salida', value: 'Salida' },
  { label: 'Dentro', value: 'Dentro' },
  { label: 'Fuera', value: 'Fuera' },
]

const opcionesActivacionAlerta = [
  { label: 'Al inicio (primera vez)', value: 'Al inicio' },
  { label: 'Cada vez que ocurra', value: 'Cada vez' },
  { label: 'Una vez al día', value: 'Una vez al día' },
]

const opcionesAplicacion = [
  { label: 'Siempre activo', value: 'siempre' },
  { label: 'A los días y horas establecidos', value: 'horario' },
]

const opcionesDiasSemana = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
]

// Computed
const totalEventos = computed(() => eventos.value.filter((e) => e.activo).length)
const eventosInactivos = computed(() => eventos.value.filter((e) => !e.activo).length)

const eventosFiltrados = computed(() => {
  let resultado = eventos.value

  if (filtroEstado.value === 'activos') {
    resultado = resultado.filter((e) => e.activo)
  } else if (filtroEstado.value === 'inactivos') {
    resultado = resultado.filter((e) => !e.activo)
  }

  if (busqueda.value) {
    resultado = resultado.filter(
      (e) =>
        e.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        obtenerNombreGeozona(e).toLowerCase().includes(busqueda.value.toLowerCase())
    )
  }

  return resultado
})

const opcionesUbicaciones = computed(() => {
  // Obtener todas las condiciones y sus tipos
  const tipos = nuevoEvento.value.condiciones.map(c => c.tipo)
  
  // Si todas las condiciones son del mismo tipo, filtrar por ese tipo
  const primerTipo = tipos[0]
  const todosMismoTipo = tipos.every(t => t === primerTipo)
  
  if (!todosMismoTipo) {
    // Si hay tipos mixtos, mostrar todas las ubicaciones
    const todasOpciones = [
      ...pois.value.map((poi) => ({
        label: `📍 ${poi.nombre}`,
        value: poi.id,
        tipo: 'POI'
      })),
      ...geozonas.value.map((gz) => ({
        label: `🗺️ ${gz.nombre}`,
        value: gz.id,
        tipo: 'Geozona'
      }))
    ]
    return todasOpciones
  }
  
  // Si todas son del mismo tipo, filtrar
  if (primerTipo === 'POI') {
    return pois.value.map((poi) => ({
      label: poi.nombre,
      value: poi.id,
    }))
  } else {
    return geozonas.value.map((gz) => ({
      label: gz.nombre,
      value: gz.id,
    }))
  }
})

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

const descripcionPatron = computed(() => {
  const numCondiciones = nuevoEvento.value.condiciones.length
  if (numCondiciones === 1) {
    return 'Se activará cuando se cumpla la condición A'
  }

  const tieneAND = nuevoEvento.value.operadoresLogicos.includes('AND')
  const tieneOR = nuevoEvento.value.operadoresLogicos.includes('OR')

  if (tieneAND && !tieneOR) {
    return 'Se activará cuando se cumplan TODAS las condiciones'
  } else if (tieneOR && !tieneAND) {
    return 'Se activará cuando se cumpla AL MENOS UNA condición'
  } else {
    return 'Se activará según el patrón de operadores lógicos definido'
  }
})

const esFormularioValido = computed(() => {
  if (!nuevoEvento.value.nombre) return false

  for (const condicion of nuevoEvento.value.condiciones) {
    if (!condicion.ubicacionId) return false
  }

  if (nuevoEvento.value.aplicacion === 'horario') {
    if (nuevoEvento.value.diasSemana.length === 0) return false
    if (!nuevoEvento.value.horaInicio || !nuevoEvento.value.horaFin) return false
  }

  return true
})

// Methods
function cerrarDrawer() {
  emit('close')
}

function seleccionarEvento(evento) {
  eventoSeleccionado.value = evento
  emit('evento-seleccionado', evento)
}

function getColorTipoEvento(evento) {
  if (!evento.condiciones || evento.condiciones.length === 0) return 'grey'

  const primerActivacion = evento.condiciones[0].activacion
  return primerActivacion === 'Entrada' || primerActivacion === 'Dentro' ? 'positive' : 'warning'
}

function getIconoTipoEvento(evento) {
  if (!evento.condiciones || evento.condiciones.length === 0) return 'notifications'

  const primerActivacion = evento.condiciones[0].activacion
  return primerActivacion === 'Entrada' || primerActivacion === 'Dentro' ? 'login' : 'logout'
}

function obtenerNombreGeozona(evento) {
  if (!evento.condiciones || evento.condiciones.length === 0) return 'Sin ubicación'

  const primeraCondicion = evento.condiciones[0]

  if (primeraCondicion.tipo === 'POI') {
    const poi = pois.value.find((p) => p.id === primeraCondicion.ubicacionId)
    return poi ? poi.nombre : 'POI no encontrado'
  } else {
    const geozona = geozonas.value.find((g) => g.id === primeraCondicion.ubicacionId)
    return geozona ? geozona.nombre : 'Geozona no encontrada'
  }
}

async function toggleEventoEstado(evento) {
  try {
    await toggleEvento(evento.id, !evento.activo)
    evento.activo = !evento.activo

    if ($q && $q.notify) {
      $q.notify({
        type: 'positive',
        message: `Evento ${evento.activo ? 'activado' : 'desactivado'}`,
        icon: evento.activo ? 'notifications_active' : 'notifications_off',
      })
    }
  } catch (err) {
    if ($q && $q.notify) {
      $q.notify({
        type: 'negative',
        message: 'Error al cambiar el estado del evento',
        caption: err.message,
      })
    }
  }
}

function agregarCondicion() {
  nuevoEvento.value.condiciones.push({
    tipo: 'POI',
    activacion: 'Entrada',
    ubicacionId: null,
  })
  nuevoEvento.value.operadoresLogicos.push('AND')
}

function eliminarCondicion(index) {
  if (nuevoEvento.value.condiciones.length > 1) {
    nuevoEvento.value.condiciones.splice(index, 1)

    if (index < nuevoEvento.value.operadoresLogicos.length) {
      nuevoEvento.value.operadoresLogicos.splice(index, 1)
    } else if (nuevoEvento.value.operadoresLogicos.length > 0) {
      nuevoEvento.value.operadoresLogicos.splice(index - 1, 1)
    }
  }
}

function abrirDialogoNuevo() {
  modoEdicion.value = false
  resetearFormulario()
  dialogNuevoEvento.value = true
}

function resetearFormulario() {
  nuevoEvento.value = {
    nombre: '',
    descripcion: '',
    activo: true,
    condicionTiempo: false,
    condiciones: [
      {
        tipo: 'POI',
        activacion: 'Entrada',
        ubicacionId: null,
      },
    ],
    operadoresLogicos: [],
    activacionAlerta: 'Al inicio',
    aplicacion: 'siempre',
    diasSemana: [],
    horaInicio: '',
    horaFin: '',
  }
}

function cancelarFormulario() {
  resetearFormulario()
  modoEdicion.value = false
}

async function guardarEvento() {
  try {
    const eventoData = {
      nombre: nuevoEvento.value.nombre,
      descripcion: nuevoEvento.value.descripcion,
      activo: nuevoEvento.value.activo,
      condicionTiempo: nuevoEvento.value.condicionTiempo,
      condiciones: nuevoEvento.value.condiciones,
      operadoresLogicos: nuevoEvento.value.operadoresLogicos,
      activacionAlerta: nuevoEvento.value.activacionAlerta,
      aplicacion: nuevoEvento.value.aplicacion,
      diasSemana: nuevoEvento.value.diasSemana,
      horaInicio: nuevoEvento.value.horaInicio,
      horaFin: nuevoEvento.value.horaFin,
    }

    if (modoEdicion.value && nuevoEvento.value.id) {
      await actualizarEvento(nuevoEvento.value.id, eventoData)

      const index = eventos.value.findIndex((e) => e.id === nuevoEvento.value.id)
      if (index > -1) {
        eventos.value[index] = {
          ...eventos.value[index],
          ...eventoData,
        }
      }

      if ($q && $q.notify) {
        $q.notify({
          type: 'positive',
          message: 'Evento actualizado correctamente',
          icon: 'check_circle',
        })
      }
    } else {
      const nuevoId = await crearEvento(eventoData)

      eventos.value.unshift({
        id: nuevoId,
        ...eventoData,
      })

      if ($q && $q.notify) {
        $q.notify({
          type: 'positive',
          message: 'Evento creado correctamente',
          icon: 'check_circle',
        })
      }
    }

    resetearFormulario()
    dialogNuevoEvento.value = false
    modoEdicion.value = false
  } catch (err) {
    console.error('Error al guardar evento:', err)
    if ($q && $q.notify) {
      $q.notify({
        type: 'negative',
        message: 'Error al guardar el evento',
        caption: err.message,
        icon: 'error',
      })
    }
  }
}

function mostrarMenuContextual(evento) {
  eventoMenu.value = evento
  menuContextualVisible.value = true
}

function editarEvento() {
  if (!eventoMenu.value) return

  modoEdicion.value = true
  nuevoEvento.value = {
    id: eventoMenu.value.id,
    nombre: eventoMenu.value.nombre,
    descripcion: eventoMenu.value.descripcion || '',
    activo: eventoMenu.value.activo,
    condicionTiempo: eventoMenu.value.condicionTiempo || false,
    condiciones: eventoMenu.value.condiciones || [
      {
        tipo: 'POI',
        activacion: 'Entrada',
        ubicacionId: null,
      },
    ],
    operadoresLogicos: eventoMenu.value.operadoresLogicos || [],
    activacionAlerta: eventoMenu.value.activacionAlerta || 'Al inicio',
    aplicacion: eventoMenu.value.aplicacion || 'siempre',
    diasSemana: eventoMenu.value.diasSemana || [],
    horaInicio: eventoMenu.value.horaInicio || '',
    horaFin: eventoMenu.value.horaFin || '',
  }

  dialogNuevoEvento.value = true
}

async function duplicarEventoSeleccionado() {
  if (!eventoMenu.value) return

  try {
    const nuevoId = await duplicarEvento(eventoMenu.value)

    eventos.value.unshift({
      ...eventoMenu.value,
      id: nuevoId,
      nombre: `${eventoMenu.value.nombre} (Copia)`,
    })

    $q.notify({
      type: 'positive',
      message: 'Evento duplicado correctamente',
      icon: 'content_copy',
    })
  } catch (err) {
    console.error('Error al duplicar evento:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al duplicar el evento',
      caption: err.message,
      icon: 'error',
    })
  }
}

async function eliminarEventoSeleccionado() {
  if (!eventoMenu.value) return

  const confirmacion = window.confirm(
    `¿Estás seguro de eliminar el evento "${eventoMenu.value.nombre}"?`
  )

  if (!confirmacion) return

  try {
    await eliminarEvento(eventoMenu.value.id)

    const index = eventos.value.findIndex((e) => e.id === eventoMenu.value.id)
    if (index > -1) {
      eventos.value.splice(index, 1)
    }

    $q.notify({
      type: 'positive',
      message: 'Evento eliminado correctamente',
      icon: 'delete',
    })
  } catch (err) {
    console.error('Error al eliminar evento:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al eliminar el evento',
      caption: err.message,
      icon: 'error',
    })
  }
}

// Cargar datos al montar el componente
onMounted(async () => {
  await cargarDatos()
})

// Función para cargar/recargar datos
async function cargarDatos() {
  try {
    console.log('🔄 Iniciando carga de datos...')
    console.log('👤 UserId:', userId.value)
    
    // CORRECCIÓN: Verificar que $q existe antes de usarlo
    if ($q && $q.loading) {
      $q.loading.show({ message: 'Cargando datos...' })
    }

    // Cargar POIs, Geozonas y Eventos en paralelo
    const [eventosData, poisData, geozonasDa] = await Promise.all([
      obtenerEventos(),
      obtenerPOIs(),
      obtenerGeozonas(),
    ])

    eventos.value = eventosData
    pois.value = poisData
    geozonas.value = geozonasDa

    console.log('✅ Datos cargados correctamente:')
    console.log('  📊 Eventos:', eventosData.length, eventosData)
    console.log('  📍 POIs:', poisData.length, poisData)
    console.log('  🗺️ Geozonas:', geozonasDa.length, geozonasDa)
    
    if (poisData.length === 0 && geozonasDa.length === 0) {
      if ($q && $q.notify) {
        $q.notify({
          type: 'warning',
          message: 'No hay POIs ni Geozonas creados',
          caption: 'Crea primero algunas ubicaciones antes de crear eventos',
          timeout: 5000,
        })
      }
    }
  } catch (err) {
    console.error('❌ Error al cargar datos:', err)
    if ($q && $q.notify) {
      $q.notify({
        type: 'negative',
        message: 'Error al cargar los datos',
        caption: err.message,
      })
    }
  } finally {
    if ($q && $q.loading) {
      $q.loading.hide()
    }
  }
}

// Función para recargar datos manualmente
async function recargarDatos() {
  await cargarDatos()
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