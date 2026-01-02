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

    <!-- Stats compactas con animación -->
    <div class="stats-grid q-px-md q-pt-sm q-pb-md">
      <div class="stat-item stat-item-animated">
        <q-icon name="notifications_active" size="18px" color="positive" />
        <span class="stat-number">{{ totalEventos }}</span>
        <span class="stat-label">Activos</span>
      </div>
      <div class="stat-item stat-item-animated">
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
        class="btn-nuevo btn-hover-effect"
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

    <!-- Lista compacta de eventos con animaciones -->
    <q-scroll-area class="lista-scroll-compact">
      <div class="q-pa-sm">
        <!-- Loading -->
        <div v-if="loading" class="loading-compact">
          <q-spinner color="primary" size="32px" />
          <div class="text-grey-6 q-mt-sm">Cargando...</div>
        </div>

        <!-- Eventos con animación mejorada -->
        <q-item
          v-for="evento in eventosFiltrados"
          :key="evento.id"
          clickable
          v-ripple
          class="evento-item evento-item-hover"
          :class="{ 'evento-selected': eventoSeleccionado?.id === evento.id }"
          @click="seleccionarEvento(evento)"
        >
          <q-item-section avatar>
            <q-avatar
              size="36px"
              :color="getColorTipoEvento(evento)"
              text-color="white"
              class="avatar-bounce"
            >
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
              <q-btn
                flat
                dense
                round
                icon="more_vert"
                size="sm"
                class="btn-menu-hover"
                @click.stop="eventoMenu = evento"
              >
                <q-menu anchor="bottom right" self="top right" :offset="[0, 5]">
                  <q-list dense style="min-width: 150px">
                    <q-item clickable v-close-popup @click="editarEvento" class="menu-item-hover">
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>

                    <q-item
                      clickable
                      v-close-popup
                      @click="duplicarEventoSeleccionado"
                      class="menu-item-hover"
                    >
                      <q-item-section avatar>
                        <q-icon name="content_copy" />
                      </q-item-section>
                      <q-item-section>Duplicar</q-item-section>
                    </q-item>

                    <q-separator />

                    <q-item
                      clickable
                      v-close-popup
                      @click="eliminarEventoSeleccionado"
                      class="menu-item-hover"
                    >
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
      <q-card class="dialog-evento-moderno">
        <!-- 🎨 Header Moderno con Gradiente -->
        <q-card-section class="evento-header">
          <div class="header-content">
            <div class="header-icon-wrapper">
              <q-icon :name="modoEdicion ? 'edit_notifications' : 'add_alert'" size="32px" />
            </div>
            <div class="header-info">
              <div class="header-title">
                {{ modoEdicion ? 'Editar Evento' : 'Nuevo Evento' }}
              </div>
              <div class="header-subtitle">Configura las alertas para tus ubicaciones</div>
            </div>
          </div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            @click="cancelarFormulario"
            class="header-close-btn"
          />
        </q-card-section>

        <!-- Cuerpo del Formulario con Scroll -->
        <div class="evento-body-scroll">
          <q-card-section class="evento-content">
            <!-- 📝 Información Básica -->
            <div class="form-section">
              <div class="section-header">
                <q-icon name="edit_note" size="20px" color="primary" />
                <span class="section-title">Información Básica</span>
              </div>

              <div class="form-fields">
                <q-input
                  v-model="nuevoEvento.nombre"
                  label="Nombre del evento"
                  outlined
                  dense
                  maxlength="100"
                  :rules="[(val) => !!val || 'El nombre es obligatorio']"
                  class="modern-input"
                >
                  <template v-slot:prepend>
                    <q-icon name="label" />
                  </template>
                </q-input>

                <q-input
                  v-model="nuevoEvento.descripcion"
                  label="Descripción (opcional)"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  class="modern-input"
                >
                  <template v-slot:prepend>
                    <q-icon name="description" />
                  </template>
                </q-input>
              </div>
            </div>

            <!-- 🎯 Condiciones de Activación -->
            <div class="form-section">
              <div class="section-header">
                <q-icon name="rule" size="20px" color="orange" />
                <span class="section-title">Condiciones de Activación</span>
              </div>

              <div class="condiciones-container">
                <div
                  v-for="(condicion, index) in nuevoEvento.condiciones"
                  :key="index"
                  class="condicion-card-modern"
                >
                  <div class="condicion-header">
                    <q-chip dense color="primary" text-color="white" size="sm">
                      Condición {{ index + 1 }}
                    </q-chip>
                    <q-btn
                      v-if="nuevoEvento.condiciones.length > 1"
                      flat
                      dense
                      round
                      icon="delete"
                      color="negative"
                      size="sm"
                      @click="eliminarCondicion(index)"
                    >
                      <q-tooltip>Eliminar condición</q-tooltip>
                    </q-btn>
                  </div>

                  <div class="condicion-fields">
                    <div class="row q-col-gutter-sm">
                      <div class="col-6">
                        <q-select
                          v-model="condicion.tipo"
                          :options="opcionesCondicion"
                          label="Tipo"
                          outlined
                          dense
                          emit-value
                          map-options
                          class="modern-select"
                        >
                          <template v-slot:prepend>
                            <q-icon :name="getIconoTipoCondicion(condicion.tipo)" />
                          </template>
                        </q-select>
                      </div>

                      <div class="col-6">
                        <q-select
                          v-model="condicion.activacion"
                          :options="opcionesActivacion"
                          label="Activación"
                          outlined
                          dense
                          emit-value
                          map-options
                          class="modern-select"
                        >
                          <template v-slot:prepend>
                            <q-icon name="radio_button_checked" />
                          </template>
                        </q-select>
                      </div>
                    </div>

                    <!-- Selector de Ubicación Mejorado -->
                    <q-select
                      v-model="condicion.ubicacionId"
                      :options="opcionesFiltradas[index] || []"
                      label="Seleccionar ubicación"
                      outlined
                      dense
                      emit-value
                      map-options
                      clearable
                      use-input
                      input-debounce="300"
                      @filter="(val, update) => filtrarUbicaciones(val, update, index)"
                      class="modern-select q-mt-sm"
                    >
                      <template v-slot:prepend>
                        <q-icon :name="getIconoTipoCondicion(condicion.tipo)" />
                      </template>

                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section avatar>
                            <q-avatar
                              size="32px"
                              :color="scope.opt.tipo === 'POI' ? 'red' : 'blue'"
                              text-color="white"
                            >
                              <q-icon :name="scope.opt.icono" size="18px" />
                            </q-avatar>
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ scope.opt.label }}</q-item-label>
                            <q-item-label caption>
                              <q-badge
                                :color="scope.opt.tipo === 'POI' ? 'red' : 'blue'"
                                :label="scope.opt.tipo"
                              />
                            </q-item-label>
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
                          <q-item-section class="text-grey">
                            No se encontraron ubicaciones
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>

                  <!-- Operador Lógico -->
                  <div v-if="index < nuevoEvento.condiciones.length - 1" class="operador-logico">
                    <div class="operador-label">Siguiente condición debe cumplir:</div>
                    <q-btn-toggle
                      v-model="nuevoEvento.operadoresLogicos[index]"
                      :options="[
                        { label: 'Y (Todas)', value: 'AND', icon: 'done_all' },
                        { label: 'O (Alguna)', value: 'OR', icon: 'done' },
                      ]"
                      unelevated
                      dense
                      toggle-color="primary"
                      class="operador-toggle"
                    />
                  </div>
                </div>

                <!-- Botón Agregar Condición -->
                <q-btn
                  outline
                  icon="add_circle"
                  label="Agregar otra condición"
                  color="primary"
                  @click="agregarCondicion"
                  class="add-condicion-btn full-width"
                />
              </div>
            </div>

            <!-- 🔔 Opciones de Alerta -->
            <div class="form-section">
              <div class="section-header">
                <q-icon name="notifications_active" size="20px" color="deep-orange" />
                <span class="section-title">Opciones de Alerta</span>
              </div>

              <div class="form-fields">
                <q-select
                  v-model="nuevoEvento.activacionAlerta"
                  :options="opcionesActivacionAlerta"
                  label="Frecuencia de alerta"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="modern-select"
                >
                  <template v-slot:prepend>
                    <q-icon name="repeat" />
                  </template>
                </q-select>

                <q-select
                  v-model="nuevoEvento.aplicacion"
                  :options="opcionesAplicacion"
                  label="Aplicación del evento"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="modern-select"
                >
                  <template v-slot:prepend>
                    <q-icon name="schedule" />
                  </template>
                </q-select>
              </div>
            </div>

            <!-- ⏰ Configuración de Horario (Condicional) -->
            <div v-if="nuevoEvento.aplicacion === 'horario'" class="form-section horario-section">
              <div class="section-header">
                <q-icon name="access_time" size="20px" color="blue" />
                <span class="section-title">Días y Horarios</span>
              </div>

              <div class="form-fields">
                <q-select
                  v-model="nuevoEvento.diasSemana"
                  :options="opcionesDiasSemana"
                  label="Días de la semana"
                  outlined
                  dense
                  multiple
                  emit-value
                  map-options
                  use-chips
                  class="modern-select"
                >
                  <template v-slot:prepend>
                    <q-icon name="calendar_today" />
                  </template>
                </q-select>

                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input
                      v-model="nuevoEvento.horaInicio"
                      label="Hora de inicio"
                      outlined
                      dense
                      mask="time"
                      :rules="['time']"
                      class="modern-input"
                    >
                      <template v-slot:prepend>
                        <q-icon name="schedule" />
                      </template>
                      <template v-slot:append>
                        <q-icon name="access_time" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-time v-model="nuevoEvento.horaInicio" />
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </q-input>
                  </div>

                  <div class="col-6">
                    <q-input
                      v-model="nuevoEvento.horaFin"
                      label="Hora de fin"
                      outlined
                      dense
                      mask="time"
                      :rules="['time']"
                      class="modern-input"
                    >
                      <template v-slot:prepend>
                        <q-icon name="schedule" />
                      </template>
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
            </div>
          </q-card-section>
        </div>

        <!-- Footer con Acciones -->
        <q-card-actions class="evento-footer">
          <q-btn
            flat
            label="Cancelar"
            color="grey-7"
            @click="cancelarFormulario"
            v-close-popup
            class="cancel-btn"
          />
          <q-btn
            unelevated
            label="Guardar Evento"
            color="primary"
            @click="guardarEvento"
            :disable="!esFormularioValido"
            :loading="loading"
            icon-right="save"
            class="save-btn"
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
  await cargarDatos()

  if (window._ubicacionParaEvento) {
    const data = window._ubicacionParaEvento

    delete window._ubicacionParaEvento

    setTimeout(() => {
      crearEventoConUbicacionPreseleccionada(data)
    }, 500)
  }
})

// 🆕 MODIFICADO: Crear evento con ENTRADA y SALIDA automáticamente
function crearEventoConUbicacionPreseleccionada(data) {
  modoEdicion.value = false

  const nombreUbicacion = data.ubicacion.nombre
  const tipoUbicacion = data.tipo

  // 🆕 AUTO-CREAR ENTRADA Y SALIDA
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
      {
        tipo: tipoUbicacion,
        activacion: 'Salida',
        ubicacionId: data.ubicacion.id,
      },
    ],
    operadoresLogicos: ['AND'], // Operador entre las dos condiciones
    activacionAlerta: 'Cada vez',
    aplicacion: 'siempre',
    diasSemana: [],
    horaInicio: '',
    horaFin: '',
  }

  // 🆕 Inicializar opciones filtradas para ambas condiciones
  opcionesFiltradas.value = [opcionesUbicaciones.value, opcionesUbicaciones.value]

  dialogNuevoEvento.value = true

  if ($q && $q.notify) {
    $q.notify({
      type: 'positive',
      message: `✅ Evento configurado con Entrada y Salida`,
      caption: `Ubicación: ${nombreUbicacion} (${tipoUbicacion})`,
      icon: 'check_circle',
      position: 'top',
      timeout: 3000,
    })
  }
}

async function cargarDatos() {
  try {
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
.dialog-evento-moderno {
  width: 650px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}
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
  min-height: 48px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
  color: white;
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
.drawer-header .text-h6 {
  color: white;
  margin: 0;
  font-size: 20px; /* 🔥 Aumentado de 16px a 20px */
  font-weight: 600; /* 🔥 Más bold (era 500) */
  letter-spacing: 0.5px; /* 🔥 Espaciado para mejor legibilidad */
  flex: 1;
}
.drawer-header .q-btn {
  flex-shrink: 0; /* No permite que el botón se encoja */
}

/* 🆕 ANIMACIONES PARA STATS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  position: relative;
  overflow: hidden;
}
.stat-item::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 70%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.stat-item-animated:hover::before {
  transform: translateX(100%);
}
.stat-item-animated:hover .stat-number {
  animation: heartbeat 0.6s ease;
}
@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.15);
  }
  50% {
    transform: scale(1.05);
  }
  75% {
    transform: scale(1.15);
  }
}

/* Icono que pulsa */
.stat-item-animated:hover .q-icon {
  animation: pulse-icon 0.8s ease;
}

@keyframes pulse-icon {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

.stat-item-animated:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #f8f9fa 0%, #e8eaed 100%);
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

/* 🆕 ANIMACIÓN PARA BOTONES */
.acciones-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-nuevo {
  position: relative;
  overflow: hidden;
  border-radius: 12px; /* 🔥 Aumentado para esquinas más curvas */
  min-width: 80px;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 20px; /* 🔥 Más padding horizontal */
}
.btn-nuevo::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: translate(-50%, -50%);
  transition:
    width 0.6s,
    height 0.6s;
}

.btn-hover-effect:hover::after {
  width: 300px;
  height: 300px;
}

.btn-hover-effect:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 24px rgba(25, 118, 210, 0.4);
}

.btn-hover-effect:active {
  transform: translateY(-2px) scale(1.02);
}
.btn-hover-effect:hover .q-icon {
  animation: rotate-icon 0.6s ease;
}

@keyframes rotate-icon {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn-hover-effect {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-hover-effect:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.btn-hover-effect:active {
  transform: translateY(0);
}

.search-compact {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-compact :deep(.q-field__control) {
  min-height: 32px;
}
.search-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.search-compact:focus-within {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(187, 0, 0, 0.2);
}

/* Icono de búsqueda que se agranda */
.search-compact:focus-within .q-icon {
  animation: pulse-search 1.5s ease infinite;
  color: #bb0000;
}

@keyframes pulse-search {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.filtro-compact :deep(.q-field__control) {
  min-height: 32px;
}

.lista-scroll-compact {
  flex: 1;
  height: 100%;
}

/* 🆕 ANIMACIONES PARA ITEMS DE EVENTOS */
.evento-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 12px;
  min-height: 60px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.evento-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: transparent;
  transition: all 0.3s ease;
}

.evento-item-hover {
  transform-style: preserve-3d;
  perspective: 1000px;
}

.evento-item-hover:hover {
  transform: translateY(-5px) rotateX(2deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.evento-item::before {
  background: linear-gradient(180deg, #1976d2 0%, #42a5f5 50%, #90caf9 100%);
  background-size: 100% 200%;
  transition: all 0.3s ease;
}

.evento-item-hover:hover::before {
  width: 4px;
  background-position: 0% 100%;
  box-shadow: 2px 0 8px rgba(25, 118, 210, 0.5);
}

.evento-item.q-item--active {
  background-color: #e3f2fd;
}

.evento-selected {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
}

/* 🆕 ANIMACIÓN PARA AVATAR */
.avatar-bounce {
  position: relative;
}
.evento-item-hover:hover .avatar-bounce {
  animation: bounce-rotate 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounce-rotate {
  0% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.2) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(10deg);
  }
  75% {
    transform: scale(1.15) rotate(-5deg);
  }
  100% {
    transform: scale(1.1) rotate(0deg);
  }
}

/* Sombra que crece */
.evento-item-hover:hover .avatar-bounce {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

/* 7. NOMBRE Y UBICACIÓN QUE SE DESLIZAN */
.evento-nombre,
.evento-ubicacion {
  transition: all 0.3s ease;
}

.evento-item-hover:hover .evento-nombre {
  transform: translateX(8px);
  color: #1976d2;
  font-weight: 600;
}

.evento-item-hover:hover .evento-ubicacion {
  transform: translateX(6px);
}

/* Icono de ubicación que pulsa */
.evento-item-hover:hover .evento-ubicacion .q-icon {
  animation: pulse-location 1s ease infinite;
}

@keyframes pulse-location {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}

/* 8. TOGGLE CON ANIMACIÓN SUAVE */
.evento-actions .q-toggle {
  transition: transform 0.3s ease;
}

.evento-item-hover:hover .q-toggle {
  transform: scale(1.1);
}

/* 9. BOTÓN MENÚ CON ROTACIÓN Y COLOR */
.btn-menu-hover {
  border-radius: 50%;
  background: transparent;
}

.btn-menu-hover:hover {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  transform: rotate(180deg) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-menu-hover:active {
  transform: rotate(180deg) scale(1.05);
}

/* 10. ITEMS DEL MENÚ CON EFECTOS */
.menu-item-hover {
  border-left: 3px solid transparent;
}

.menu-item-hover:hover {
  border-left-color: #1976d2;
  background: linear-gradient(90deg, #f5f8fc 0%, transparent 100%);
  padding-left: 20px;
}

.menu-item-hover:hover .q-icon {
  animation: swing 0.5s ease;
}

@keyframes swing {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(15deg);
  }
  75% {
    transform: rotate(-15deg);
  }
}

/* 11. CONDICIONES CON EFECTOS ESPECIALES */
.condicion-card {
  position: relative;
  overflow: hidden;
}

/* Borde animado */
.condicion-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  padding: 2px;
  background: linear-gradient(45deg, #1976d2, #42a5f5, #90caf9);
  background-size: 200% 200%;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: gradient-border 3s ease infinite;
}

.condicion-card:hover::before {
  opacity: 1;
}

@keyframes gradient-border {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 12. BOTÓN DELETE CON EXPLOSIÓN */
.btn-delete-hover:hover {
  animation: shake-explode 0.5s ease;
  background-color: rgba(244, 67, 54, 0.15);
}

@keyframes shake-explode {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-10deg) scale(1.1);
  }
  50% {
    transform: rotate(10deg) scale(1.15);
  }
  75% {
    transform: rotate(-10deg) scale(1.1);
  }
}

/* 13. SELECT CON ICONOS ANIMADOS */
.q-select:hover :deep(.q-field__prepend .q-icon) {
  animation: bounce-icon 0.6s ease;
}

@keyframes bounce-icon {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* Items del dropdown con efecto */
.q-menu .q-item {
  position: relative;
  overflow: hidden;
}

.q-menu .q-item::before {
  content: '';
  position: absolute;
  left: -100%;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.1), transparent);
  transition: left 0.5s ease;
}

.q-menu .q-item:hover::before {
  left: 100%;
}

/* Iconos del dropdown que rotan */
.q-menu .q-item:hover .q-icon {
  animation: rotate-small 0.6s ease;
}

@keyframes rotate-small {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 14. DIÁLOGO CON ENTRADA DRAMÁTICA */
.dialog-evento {
  animation: dialog-entrance 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes dialog-entrance {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(50px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 15. LOADING CON PULSO */
.loading-compact {
  animation: pulse-loading 2s ease infinite;
}

@keyframes pulse-loading {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.loading-compact .q-spinner {
  animation: rotate-spinner 1s linear infinite;
}

@keyframes rotate-spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 16. NO DATA CON BOUNCE */
.no-data-compact {
  animation: fadeInUp 0.6s ease;
}

.no-data-compact .q-icon {
  animation: float-icon 3s ease-in-out infinite;
}

@keyframes float-icon {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

/* 17. FILTRO CON TRANSFORMACIÓN */
.filtro-compact {
  transition: all 0.3s ease;
}

.filtro-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filtro-compact:focus-within {
  box-shadow: 0 4px 16px rgba(187, 0, 0, 0.2);
}

/* 18. RIPPLE MEJORADO */
.evento-item {
  position: relative;
  overflow: hidden;
}

.evento-item::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(25, 118, 210, 0.3);
  transform: translate(-50%, -50%);
  transition:
    width 0.6s,
    height 0.6s;
}

.evento-item:active::after {
  width: 600px;
  height: 600px;
}

.evento-item-hover:hover .avatar-bounce {
  transform: scale(1.1) rotate(5deg);
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

/* 🆕 ANIMACIÓN PARA BOTÓN DE MENÚ */
.btn-menu-hover {
  transition: all 0.3s ease;
}

.btn-menu-hover:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: rotate(90deg);
}

/* 🆕 ANIMACIÓN PARA ITEMS DEL MENÚ */
.menu-item-hover {
  transition: all 0.2s ease;
}

.menu-item-hover:hover {
  background-color: #f5f5f5;
  padding-left: 16px;
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

/* 🆕 ANIMACIÓN PARA TARJETAS DE CONDICIÓN */
.condicion-card {
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.condicion-card:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 🆕 ANIMACIÓN PARA BOTÓN DELETE */
.btn-delete-hover {
  transition: all 0.3s ease;
}

.btn-delete-hover:hover {
  transform: scale(1.1) rotate(10deg);
  background-color: rgba(244, 67, 54, 0.1);
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
  transition: all 0.2s ease;
}

.q-menu .q-item:hover {
  background-color: #f5f5f5;
  transform: translateX(4px);
}

/* 🆕 ANIMACIONES DE ENTRADA */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.evento-item {
  animation: fadeInUp 0.3s ease;
}

/* 🆕 RIPPLE EFFECT MEJORADO */
.evento-item:active {
  transform: scale(0.98);
}
.evento-header {
  background: linear-gradient(135deg, #91c6bc 0%, #059669 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0; /* 🔥 No se encoge */
}
.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.header-icon-wrapper {
  width: 48px; /* 🔥 Un poco más pequeño */
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  padding-left: 0; /* 🔥 Sin padding extra */
}
.header-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
  color: white;
  text-align: left;
  width: 100%;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 13px;
  opacity: 0.95;
  color: white;
  text-align: left;
  width: 100%;
  line-height: 1.3;
}

.header-close-btn {
  flex-shrink: 0;
  transition: all 0.3s ease;
  margin-left: auto;
}

.header-close-btn:hover {
  transform: scale(1.1) rotate(90deg);
  background: rgba(255, 255, 255, 0.2);
}

/* Scroll Area */
.evento-body-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f5f5f5;
}

.evento-content {
  padding: 24px;
  min-height: 100%; /* 🔥 IMPORTANTE */
}
.form-section {
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.form-section:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-color: #d0d0d0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Inputs y Selects Modernos */
.modern-input,
.modern-select {
  transition: all 0.3s ease;
}

.modern-input:hover,
.modern-select:hover {
  transform: translateX(4px);
}

.modern-input:focus-within,
.modern-select:focus-within {
  transform: translateX(6px);
}

/* Tarjetas de Condición */
.condiciones-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.condicion-card-modern {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid #dee2e6;
  transition: all 0.3s ease;
}

.condicion-card-modern:hover {
  border-color: #1976d2;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
  transform: translateY(-2px);
}

.condicion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.condicion-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Operador Lógico */
.operador-logico {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed #dee2e6;
  text-align: center;
}

.operador-label {
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.operador-toggle {
  display: inline-flex;
}

/* Botón Agregar Condición */
.add-condicion-btn {
  border: 2px dashed #1976d2;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.add-condicion-btn:hover {
  background: rgba(25, 118, 210, 0.08);
  border-style: solid;
  transform: translateY(-2px);
}

/* Sección de Horario */
.horario-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #90caf9;
}

/* Footer */
.evento-footer {
  padding: 16px 24px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  border-radius: 8px;
  padding: 8px 20px;
}

.save-btn {
  border-radius: 8px;
  padding: 8px 24px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

/* Responsive */
@media (max-width: 600px) {
  .dialog-evento-moderno {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
  }

  .evento-content {
    padding: 16px;
  }

  .form-section {
    padding: 16px;
  }

  .header-title {
    font-size: 18px;
  }
}
</style>
