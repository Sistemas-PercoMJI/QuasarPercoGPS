<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="eventos-drawer-compact">
    <!-- Header compacto -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Eventos</div>
      <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
    </div>

    <!-- 🐛 DEBUG: Info temporal - ACTUALIZADO -->
    <div
      v-if="pois.length === 0 && geozonas.length === 0"
      class="q-pa-sm bg-warning text-white text-caption"
    >
      <div>⚠️ No hay ubicaciones cargadas</div>
      <div>POIs: {{ pois.length }} | Geozonas: {{ geozonas.length }}</div>
      <q-btn
        flat
        dense
        label="Recargar"
        icon="refresh"
        color="white"
        @click="cargarDatos"
        class="q-mt-xs"
        size="sm"
      />
    </div>

    <!-- ✅ INFO: Datos cargados - COMPACTO -->
    <div
      v-else-if="pois.length > 0 || geozonas.length > 0"
      class="q-pa-xs bg-positive text-white text-caption text-center"
    >
      ✅ {{ pois.length }} POIs, {{ geozonas.length }} Geozonas
    </div>

    <!-- Stats compactas -->
    <div class="stats-grid q-px-md q-pt-sm q-pb-md">
      <div class="stat-item">
        <q-icon name="notifications_active" size="18px" color="positive" />
        <span class="stat-number">{{ totalEventos }}</span>
        <span class="stat-label">Activos</span>
      </div>
      <div class="stat-item">
        <q-icon name="notifications_off" size="18px" color="grey" />
        <span class="stat-number">{{ eventosInactivos }}</span>
        <span class="stat-label">Inactivos</span>
      </div>
    </div>

    <!-- Barra de acciones compacta -->
    <div class="acciones-row q-px-md q-pb-sm">
      <q-btn
        unelevated
        color="primary"
        icon="add"
        label="Nuevo"
        dense
        class="btn-nuevo"
        @click="abrirDialogoNuevo"
      />
      <q-input v-model="busqueda" outlined dense placeholder="Buscar..." class="search-compact">
        <template v-slot:prepend>
          <q-icon name="search" size="16px" />
        </template>
      </q-input>
    </div>

    <!-- Filtro compacto -->
    <div class="q-px-md q-pb-sm">
      <q-select
        v-model="filtroEstado"
        :options="opcionesFiltro"
        outlined
        dense
        emit-value
        map-options
        class="filtro-compact"
      />
    </div>

    <!-- Lista compacta de eventos -->
    <q-scroll-area class="lista-scroll-compact">
      <div class="q-pa-sm">
        <!-- Loading -->
        <div v-if="loading" class="loading-compact">
          <q-spinner color="primary" size="32px" />
          <div class="text-grey-6 q-mt-sm">Cargando...</div>
        </div>

        <!-- Eventos -->
        <q-item
          v-for="evento in eventosFiltrados"
          :key="evento.id"
          clickable
          v-ripple
          class="evento-item"
          :class="{ 'evento-selected': eventoSeleccionado?.id === evento.id }"
          @click="seleccionarEvento(evento)"
        >
          <q-item-section avatar>
            <q-avatar size="36px" :color="getColorTipoEvento(evento)" text-color="white">
              <q-icon :name="getIconoTipoEvento(evento)" size="18px" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium evento-nombre">{{
              evento.nombre
            }}</q-item-label>
            <q-item-label caption class="evento-ubicacion">
              <q-icon name="location_on" size="12px" />
              {{ obtenerNombreGeozona(evento) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="evento-actions">
              <q-toggle
                :model-value="evento.activo"
                @update:model-value="toggleEventoEstado(evento)"
                color="positive"
                dense
                @click.stop
              />
              <q-btn flat dense round icon="more_vert" size="sm" @click.stop="eventoMenu = evento">
                <q-menu anchor="bottom right" self="top right" :offset="[0, 5]">
                  <q-list dense style="min-width: 150px">
                    <q-item clickable v-close-popup @click="editarEvento">
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>

                    <q-item clickable v-close-popup @click="duplicarEventoSeleccionado">
                      <q-item-section avatar>
                        <q-icon name="content_copy" />
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
              </q-btn>
            </div>
          </q-item-section>
        </q-item>

        <!-- Sin resultados -->
        <div v-if="!loading && eventosFiltrados.length === 0" class="no-data-compact">
          <q-icon name="notifications_off" size="48px" color="grey-4" />
          <div class="text-grey-6 q-mt-sm">No hay eventos</div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Diálogo para Crear/Editar Evento -->
    <q-dialog
      v-model="dialogNuevoEvento"
      persistent
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="dialog-evento" style="width: 600px; max-width: 90vw">
        <!-- Header del Diálogo -->
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <div class="text-h6">{{ modoEdicion ? 'Editar Evento' : 'Nuevo Evento' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="cancelarFormulario" />
        </q-card-section>

        <!-- Cuerpo del Formulario -->
        <q-card-section class="scroll" style="max-height: 70vh">
          <div class="q-gutter-md">
            <!-- Nombre y Descripción -->
            <q-input
              v-model="nuevoEvento.nombre"
              label="Nombre del evento *"
              outlined
              maxlength="100"
              :rules="[(val) => !!val || 'El nombre es obligatorio']"
            />
            <q-input
              v-model="nuevoEvento.descripcion"
              label="Descripción (opcional)"
              outlined
              type="textarea"
              rows="2"
            />

            <!-- Condiciones de Activación -->
            <q-separator />
            <div class="text-subtitle2 q-mt-sm">Condiciones de Activación</div>
            <div v-for="(condicion, index) in nuevoEvento.condiciones" :key="index" class="q-mb-md">
              <div class="row q-gutter-sm items-center">
                <q-select
                  v-model="condicion.tipo"
                  :options="opcionesCondicion"
                  label="Tipo"
                  outlined
                  dense
                  class="col"
                  emit-value
                  map-options
                />
                <q-select
                  v-model="condicion.activacion"
                  :options="opcionesActivacion"
                  label="Activación"
                  outlined
                  dense
                  class="col"
                  emit-value
                  map-options
                />

                <!-- 🆕 SELECTOR MEJORADO CON BÚSQUEDA E ICONOS -->
                <q-select
                  v-model="condicion.ubicacionId"
                  :options="opcionesFiltradas[index] || []"
                  label="Seleccionar ubicación"
                  outlined
                  dense
                  class="col-12"
                  emit-value
                  map-options
                  clearable
                  use-input
                  input-debounce="300"
                  @filter="(val, update) => filtrarUbicaciones(val, update, index)"
                >
                  <template v-slot:prepend>
                    <q-icon :name="getIconoTipoCondicion(condicion.tipo)" />
                  </template>

                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-icon
                          :name="scope.opt.icono"
                          :color="scope.opt.tipo === 'POI' ? 'red' : 'blue'"
                          size="20px"
                        />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.tipo }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                  <template v-slot:selected-item="scope">
                    <div class="row items-center no-wrap q-gutter-xs">
                      <q-icon
                        :name="scope.opt.icono"
                        :color="scope.opt.tipo === 'POI' ? 'red' : 'blue'"
                        size="18px"
                      />
                      <span>{{ scope.opt.label }}</span>
                    </div>
                  </template>

                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey"> </q-item-section>No se encontraron
                      ubicaciones
                    </q-item>
                  </template>
                </q-select>

                <q-btn
                  v-if="nuevoEvento.condiciones.length > 1"
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  @click="eliminarCondicion(index)"
                  class="q-ml-sm"
                />
              </div>
              <!-- Operador Lógico entre condiciones -->
              <div v-if="index < nuevoEvento.condiciones.length - 1" class="q-mt-sm q-ml-sm">
                <q-btn-toggle
                  v-model="nuevoEvento.operadoresLogicos[index]"
                  :options="[
                    { label: 'Y (AND)', value: 'AND' },
                    { label: 'O (OR)', value: 'OR' },
                  ]"
                  unelevated
                  dense
                  toggle-color="primary"
                />
              </div>
            </div>

            <!-- Botón para agregar más condiciones -->
            <q-btn
              flat
              icon="add_circle"
              label="Agregar otra condición"
              color="primary"
              @click="agregarCondicion"
            />

            <!-- Opciones de Alerta y Aplicación -->
            <q-separator class="q-mt-md" />
            <div class="text-subtitle2 q-mt-sm">Opciones de Alerta</div>
            <q-select
              v-model="nuevoEvento.activacionAlerta"
              :options="opcionesActivacionAlerta"
              label="Frecuencia de alerta"
              outlined
              emit-value
              map-options
            />

            <q-select
              v-model="nuevoEvento.aplicacion"
              :options="opcionesAplicacion"
              label="Aplicación del evento"
              outlined
              emit-value
              map-options
            />

            <!-- Configuración de Horario -->
            <div v-if="nuevoEvento.aplicacion === 'horario'" class="q-gutter-sm q-mt-md">
              <div class="text-subtitle2">Días y Horas</div>
              <q-select
                v-model="nuevoEvento.diasSemana"
                :options="opcionesDiasSemana"
                label="Días de la semana"
                outlined
                multiple
                emit-value
                map-options
                use-chips
              />
              <div class="row q-gutter-sm">
                <q-input
                  v-model="nuevoEvento.horaInicio"
                  label="Hora de inicio"
                  outlined
                  dense
                  class="col"
                  mask="time"
                  :rules="['time']"
                >
                  <template v-slot:append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="nuevoEvento.horaInicio" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
                <q-input
                  v-model="nuevoEvento.horaFin"
                  label="Hora de fin"
                  outlined
                  dense
                  class="col"
                  mask="time"
                  :rules="['time']"
                >
                  <template v-slot:append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="nuevoEvento.horaFin" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Footer del Diálogo -->
        <q-card-actions align="right" class="bg-grey-2">
          <q-btn flat label="Cancelar" @click="cancelarFormulario" v-close-popup />
          <q-btn
            color="primary"
            label="Guardar"
            @click="guardarEvento"
            :disable="!esFormularioValido"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const eventoMenu = ref(null)
const modoEdicion = ref(false)

// 🆕 VARIABLE PARA OPCIONES FILTRADAS
const opcionesFiltradas = ref([])

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
]

const opcionesActivacionAlerta = [
  { label: 'Cada vez que ocurra', value: 'Cada vez' },
  { label: 'Al inicio (primera vez)', value: 'Al inicio' },
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
        obtenerNombreGeozona(e).toLowerCase().includes(busqueda.value.toLowerCase()),
    )
  }

  return resultado
})

// 🆕 COMPUTED MEJORADO CON ICONOS (SIN SIDE EFFECTS)
const opcionesUbicaciones = computed(() => {
  const tipos = nuevoEvento.value.condiciones.map((c) => c.tipo)
  const primerTipo = tipos[0]
  const todosMismoTipo = tipos.every((t) => t === primerTipo)

  let opciones = []

  if (!todosMismoTipo) {
    // Mezclar POIs y Geozonas
    opciones = [
      ...pois.value.map((poi) => ({
        label: poi.nombre,
        value: poi.id,
        tipo: 'POI',
        icono: 'place',
      })),
      ...geozonas.value.map((gz) => ({
        label: gz.nombre,
        value: gz.id,
        tipo: 'Geozona',
        icono: 'layers',
      })),
    ]
  } else if (primerTipo === 'POI') {
    opciones = pois.value.map((poi) => ({
      label: poi.nombre,
      value: poi.id,
      tipo: 'POI',
      icono: 'place',
    }))
  } else {
    opciones = geozonas.value.map((gz) => ({
      label: gz.nombre,
      value: gz.id,
      tipo: 'Geozona',
      icono: 'layers',
    }))
  }

  return opciones
})

// 🆕 WATCH para inicializar opciones filtradas cuando cambien las condiciones
watch(
  () => nuevoEvento.value.condiciones.length,
  (newLength) => {
    if (opcionesFiltradas.value.length !== newLength) {
      opcionesFiltradas.value = Array(newLength)
        .fill(null)
        .map(() => opcionesUbicaciones.value)
    }
  },
  { immediate: true },
)

// 🆕 WATCH para actualizar opciones filtradas cuando cambien POIs/Geozonas
watch([pois, geozonas], () => {
  if (opcionesFiltradas.value.length > 0) {
    opcionesFiltradas.value = opcionesFiltradas.value.map(() => opcionesUbicaciones.value)
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

// 🆕 FUNCIÓN PARA FILTRAR UBICACIONES CON BÚSQUEDA
function filtrarUbicaciones(val, update, index) {
  update(() => {
    if (val === '') {
      opcionesFiltradas.value[index] = opcionesUbicaciones.value
    } else {
      const needle = val.toLowerCase()
      opcionesFiltradas.value[index] = opcionesUbicaciones.value.filter(
        (v) => v.label.toLowerCase().indexOf(needle) > -1,
      )
    }
  })
}

// 🆕 FUNCIÓN PARA OBTENER ICONO SEGÚN TIPO
function getIconoTipoCondicion(tipo) {
  return tipo === 'POI' ? 'place' : 'layers'
}

const redibujarMapa = () => {
  window.dispatchEvent(new CustomEvent('redibujarMapa'))
  console.log('🔄 Solicitando redibujado del mapa...')
}

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

    redibujarMapa()

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

// 🆕 FUNCIÓN MEJORADA PARA AGREGAR CONDICIÓN CON AUTO-COMPLETADO
function agregarCondicion() {
  // Obtener la última condición para copiar sus valores
  const ultimaCondicion = nuevoEvento.value.condiciones[nuevoEvento.value.condiciones.length - 1]

  // Alternar la activación: si es "Entrada" -> "Salida", si es "Salida" -> "Entrada"
  const nuevaActivacion = ultimaCondicion.activacion === 'Entrada' ? 'Salida' : 'Entrada'

  // Agregar nueva condición con los mismos valores pero activación alternada
  nuevoEvento.value.condiciones.push({
    tipo: ultimaCondicion.tipo, // Mismo tipo (POI o Geozona)
    activacion: nuevaActivacion, // Activación alternada
    ubicacionId: ultimaCondicion.ubicacionId, // Misma ubicación
  })

  nuevoEvento.value.operadoresLogicos.push('AND')

  // Agregar opciones filtradas para la nueva condición
  opcionesFiltradas.value.push(opcionesUbicaciones.value)

  // Notificar al usuario
  if ($q && $q.notify) {
    $q.notify({
      type: 'info',
      message: `Condición agregada: ${nuevaActivacion}`,
      caption: `Misma ubicación, activación alternada`,
      icon: 'add_circle',
      position: 'top',
      timeout: 2000,
    })
  }
}

function eliminarCondicion(index) {
  if (nuevoEvento.value.condiciones.length > 1) {
    nuevoEvento.value.condiciones.splice(index, 1)
    opcionesFiltradas.value.splice(index, 1)
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

// 🆕 FUNCIÓN MEJORADA PARA RESETEAR FORMULARIO
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
    activacionAlerta: 'Cada vez',
    aplicacion: 'siempre',
    diasSemana: [],
    horaInicio: '',
    horaFin: '',
  }

  // Resetear opciones filtradas
  opcionesFiltradas.value = [opcionesUbicaciones.value]
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
        eventos.value[index] = { ...eventos.value[index], ...eventoData }
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
      eventos.value.unshift({ id: nuevoId, ...eventoData })
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
    redibujarMapa()
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
    activacionAlerta: eventoMenu.value.activacionAlerta || 'Cada vez',
    aplicacion: eventoMenu.value.aplicacion || 'siempre',
    diasSemana: eventoMenu.value.diasSemana || [],
    horaInicio: eventoMenu.value.horaInicio || '',
    horaFin: eventoMenu.value.horaFin || '',
  }

  // Inicializar opciones filtradas con las condiciones existentes
  opcionesFiltradas.value = nuevoEvento.value.condiciones.map(() => opcionesUbicaciones.value)

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
    redibujarMapa()
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
    `¿Estás seguro de eliminar el evento "${eventoMenu.value.nombre}"?`,
  )
  if (!confirmacion) return
  try {
    await eliminarEvento(eventoMenu.value.id)
    const index = eventos.value.findIndex((e) => e.id === eventoMenu.value.id)
    if (index > -1) {
      eventos.value.splice(index, 1)
    }
    redibujarMapa()
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
  console.log('🔟 Eventos: Componente montado')

  await cargarDatos()

  console.log('1️⃣1️⃣ Eventos: Verificando window._ubicacionParaEvento')
  console.log('📦 Valor:', window._ubicacionParaEvento)

  if (window._ubicacionParaEvento) {
    const data = window._ubicacionParaEvento
    console.log('1️⃣2️⃣ Eventos: ¡Ubicación preseleccionada detectada!')
    console.log('📍 Ubicación:', data.ubicacion.nombre)
    console.log('🏷️ Tipo:', data.tipo)

    delete window._ubicacionParaEvento
    console.log('1️⃣3️⃣ Eventos: window._ubicacionParaEvento limpiado')

    setTimeout(() => {
      console.log('1️⃣4️⃣ Eventos: Ejecutando crearEventoConUbicacionPreseleccionada')
      crearEventoConUbicacionPreseleccionada(data)
    }, 500)
  } else {
    console.log('ℹ️ Eventos: No hay ubicación preseleccionada')
  }
})

function crearEventoConUbicacionPreseleccionada(data) {
  console.log('1️⃣5️⃣ Eventos: Configurando evento con ubicación')
  console.log('📦 Data:', data)

  modoEdicion.value = false

  const nombreUbicacion = data.ubicacion.nombre
  const tipoUbicacion = data.tipo

  console.log('1️⃣6️⃣ Eventos: Preparando nuevoEvento.value')

  nuevoEvento.value = {
    nombre: `Evento en ${nombreUbicacion}`,
    descripcion: `Evento automático para ${tipoUbicacion === 'POI' ? 'punto de interés' : 'geozona'} "${nombreUbicacion}"`,
    activo: true,
    condicionTiempo: false,
    condiciones: [
      {
        tipo: tipoUbicacion,
        activacion: 'Entrada',
        ubicacionId: data.ubicacion.id,
      },
    ],
    operadoresLogicos: [],
    activacionAlerta: 'Cada vez',
    aplicacion: 'siempre',
    diasSemana: [],
    horaInicio: '',
    horaFin: '',
  }

  console.log('1️⃣7️⃣ Eventos: nuevoEvento configurado:', nuevoEvento.value)
  console.log('1️⃣8️⃣ Eventos: Abriendo dialogNuevoEvento')

  dialogNuevoEvento.value = true

  console.log('1️⃣9️⃣ Eventos: dialogNuevoEvento.value =', dialogNuevoEvento.value)

  if ($q && $q.notify) {
    $q.notify({
      type: 'positive',
      message: `✅ Evento configurado`,
      caption: `Ubicación: ${nombreUbicacion} (${tipoUbicacion})`,
      icon: 'check_circle',
      position: 'top',
      timeout: 3000,
    })
  }

  console.log('2️⃣0️⃣ Eventos: Proceso completado')
}

async function cargarDatos() {
  try {
    console.log('🔄 Iniciando carga de datos...')
    console.log('👤 UserId:', userId.value)

    if ($q && $q.loading) {
      $q.loading.show({ message: 'Cargando datos...' })
    }

    const [eventosData, poisData, geozonasDa] = await Promise.all([
      obtenerEventos(),
      obtenerPOIs(),
      obtenerGeozonas(),
    ])

    eventos.value = eventosData
    pois.value = poisData
    geozonas.value = geozonasDa

    console.log('✅ Datos cargados correctamente:')
    console.log('  📊 Eventos:', eventosData.length)
    console.log('  📍 POIs:', poisData.length)
    console.log('  🗺️ Geozonas:', geozonasDa.length)

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
</script>

<style scoped>
.eventos-drawer-compact {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.stat-number {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.acciones-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-nuevo {
  min-width: 80px;
  font-size: 12px;
}

.search-compact {
  flex: 1;
  background: white;
}

.search-compact :deep(.q-field__control) {
  min-height: 32px;
}

.filtro-compact :deep(.q-field__control) {
  min-height: 32px;
}

.lista-scroll-compact {
  flex: 1;
  height: 100%;
}

.evento-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 12px;
  min-height: 60px;
}

.evento-item.q-item--active {
  background-color: #e3f2fd;
}

.evento-item:hover {
  background-color: #f5f5f5;
}

.evento-selected {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
}

.evento-nombre {
  font-size: 13px;
  line-height: 1.3;
}

.evento-ubicacion {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.evento-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.no-data-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9e9e9e;
}

.dialog-evento {
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.dialog-evento .q-card__section {
  padding: 16px;
}

.dialog-evento .q-card__section.scroll {
  overflow-y: auto;
}

.dialog-evento .q-card__actions {
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

/* 🆕 ESTILOS PARA EL SELECTOR MEJORADO */
.q-select :deep(.q-field__prepend) {
  padding-right: 8px;
}

.q-item__section--avatar {
  min-width: 40px;
}

.q-item__label--caption {
  font-size: 11px;
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Mejorar la visualización del item seleccionado */
.q-select :deep(.q-field__native) {
  padding-left: 4px;
}

/* Mejorar el dropdown */
.q-menu .q-item {
  padding: 8px 12px;
}

.q-menu .q-item:hover {
  background-color: #f5f5f5;
}
</style>
