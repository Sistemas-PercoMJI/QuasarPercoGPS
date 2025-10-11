<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="conductores-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Conductores</div>
      <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
    </div>

    <!-- Selector de todos los conductores -->
    <div class="q-pa-sm q-px-md">
      <q-checkbox
        v-model="todosConductores"
        label="Todos los conductores"
        @update:model-value="seleccionarTodos"
        dense
      />
      <span class="text-grey-7 q-ml-sm">{{ totalConductores }}</span>
      <q-btn
        flat
        dense
        round
        icon="create_new_folder"
        size="sm"
        class="float-right"
        @click="dialogNuevoGrupo = true"
      >
        <q-tooltip>Crear grupo</q-tooltip>
      </q-btn>
    </div>

    <!-- Búsqueda -->
    <div class="q-px-md q-pb-sm">
      <q-input v-model="busqueda" outlined dense placeholder="Búsqueda" class="search-input">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Filtro por grupo -->
    <div class="q-px-md q-pb-sm">
      <q-select
        v-model="grupoSeleccionado"
        outlined
        dense
        :options="opcionesGrupos"
        label="Mostrar conductores"
        emit-value
        map-options
        class="filter-select"
      />
    </div>

    <!-- Lista de grupos (tipo carpetas) -->
    <div class="grupos-lista q-px-md q-pb-sm" v-if="grupos.length > 0">
      <div class="text-caption text-grey-7 q-mb-xs">GRUPOS</div>
      <q-list dense bordered class="rounded-borders">
        <q-item
          v-for="grupo in grupos"
          :key="grupo.id"
          clickable
          v-ripple
          @click="filtrarPorGrupo(grupo)"
          :active="grupoSeleccionado === grupo.id"
        >
          <q-item-section avatar>
            <q-icon name="folder" :color="grupo.color || 'blue-grey'" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ grupo.nombre }}</q-item-label>
            <q-item-label caption
              >{{ contarConductoresPorGrupo(grupo.id) }} conductores</q-item-label
            >
          </q-item-section>

          <q-item-section side>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              @click.stop="mostrarMenuGrupo(grupo)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Headers de la tabla -->
    <div class="tabla-header q-px-md">
      <div class="header-item">Mostrar conductores</div>
      <div class="header-item text-right">Todo</div>
    </div>

    <!-- Lista de conductores -->
    <q-list class="conductores-list">
      <q-item
        v-for="conductor in conductoresFiltrados"
        :key="conductor.id"
        clickable
        v-ripple
        @click="seleccionarConductor(conductor)"
        :active="conductorSeleccionado?.id === conductor.id"
        class="conductor-item"
      >
        <q-item-section avatar>
          <q-avatar :color="getColorGrupo(conductor.grupoId)" text-color="white" size="40px">
            {{ conductor.iniciales }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-medium">{{ conductor.nombre }}</q-item-label>
          <q-item-label caption class="text-grey-7">{{ conductor.vehiculo }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-btn
            flat
            dense
            round
            icon="more_vert"
            size="sm"
            @click.stop="mostrarMenuConductor(conductor)"
          />
        </q-item-section>
      </q-item>

      <!-- Mensaje si no hay conductores -->
      <div v-if="conductoresFiltrados.length === 0" class="no-data q-pa-md text-center">
        <q-icon name="person_off" size="48px" color="grey-5" />
        <div class="text-grey-6 q-mt-sm">No hay conductores</div>
      </div>
    </q-list>

    <!-- Dialog: Detalles del Conductor -->
    <q-dialog v-model="dialogDetallesConductor" seamless position="standard" class="detalle-dialog">
      <q-card
        style="
          position: fixed;
          left: 350px;
          top: 0;
          bottom: 0;
          width: 400px;
          margin: 0;
          border-radius: 0;
        "
      >
        <!-- Header del card -->
        <q-card-section
          style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
          class="text-white row items-center"
        >
          <div class="col">
            <div class="text-h6">{{ conductorSeleccionado?.nombre }}</div>
          </div>
          <q-btn
            flat
            dense
            round
            icon="close"
            @click="dialogDetallesConductor = false"
            color="white"
          />
        </q-card-section>

        <q-separator />

        <!-- Contenido -->
        <q-card-section class="q-pa-md" style="height: calc(100vh - 200px); overflow-y: auto">
          <!-- Asignación de vehículo -->
          <div class="detalle-section">
            <div class="detalle-label">Nombre del vehículo asignado</div>
            <div class="detalle-campo">
              <q-btn
                flat
                no-caps
                color="primary"
                :label="conductorSeleccionado?.vehiculo || 'Asignar vehículo'"
                icon-right="add"
                class="full-width text-left"
                align="left"
                @click="dialogAsignarVehiculo = true"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Teléfono -->
          <div class="detalle-section">
            <div class="detalle-label">Teléfono</div>
            <div class="detalle-valor">{{ conductorSeleccionado?.telefono || '—' }}</div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Fecha de expiración del carnet -->
          <div class="detalle-section">
            <div class="detalle-label">Fecha de expiración del carnet de conducir</div>
            <div class="detalle-campo">
              <q-btn
                flat
                no-caps
                color="grey-7"
                :label="conductorSeleccionado?.fechaExpiracion || '—'"
                icon-right="edit"
                class="full-width text-left"
                align="left"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Notas -->
          <div class="detalle-section">
            <div class="detalle-label">Notas</div>
            <div class="detalle-valor">{{ conductorSeleccionado?.notas || '—' }}</div>
          </div>
        </q-card-section>

        <!-- Botones de acción -->
        <q-card-actions
          class="q-pa-md q-gutter-sm"
          style="position: absolute; bottom: 0; left: 0; right: 0; background: white"
        >
          <q-btn
            unelevated
            color="primary"
            label="Editar"
            icon="edit"
            class="full-width"
            @click="editarConductor"
          />
          <q-btn
            outline
            color="negative"
            label="Borrar"
            icon="delete"
            class="full-width"
            @click="confirmarEliminarConductor"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Asignar Vehículo -->
    <q-dialog v-model="dialogAsignarVehiculo">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Asignar vehículo</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="vehiculoAsignado"
            :options="vehiculosDisponibles"
            label="Seleccionar vehículo"
            outlined
            emit-value
            map-options
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="directions_car" />
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Asignar" color="primary" @click="asignarVehiculoAConductor" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Nuevo Grupo -->
    <q-dialog v-model="dialogNuevoGrupo">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Nuevo grupo</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input v-model="nuevoGrupo.nombre" label="Nombre del grupo" outlined dense autofocus />

          <div class="q-mt-md">
            <div class="text-caption q-mb-sm">Color del grupo</div>
            <div class="color-picker">
              <q-btn
                v-for="color in coloresDisponibles"
                :key="color.value"
                round
                :color="color.value"
                size="sm"
                class="q-mr-sm q-mb-sm"
                @click="nuevoGrupo.color = color.value"
                :outline="nuevoGrupo.color !== color.value"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            flat
            label="Crear"
            color="primary"
            @click="crearGrupo"
            :disable="!nuevoGrupo.nombre"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Menú contextual para grupos -->
    <q-menu v-model="menuGrupoVisible" context-menu>
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="editarGrupo">
          <q-item-section avatar>
            <q-icon name="edit" size="xs" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="eliminarGrupo">
          <q-item-section avatar>
            <q-icon name="delete" size="xs" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Eliminar</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Menú contextual para conductores -->
    <q-menu v-model="menuConductorVisible" context-menu>
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="asignarGrupo">
          <q-item-section avatar>
            <q-icon name="folder" size="xs" />
          </q-item-section>
          <q-item-section>Asignar a grupo</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="verDetalles">
          <q-item-section avatar>
            <q-icon name="info" size="xs" />
          </q-item-section>
          <q-item-section>Ver detalles</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

// Emits
const emit = defineEmits(['close', 'conductor-seleccionado'])

const $q = useQuasar()

// Estado
const todosConductores = ref(true)
const busqueda = ref('')
const conductorSeleccionado = ref(null)
const grupoSeleccionado = ref('todos')
const dialogNuevoGrupo = ref(false)
const dialogDetallesConductor = ref(false)
const dialogAsignarVehiculo = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
const grupoMenu = ref(null)
const conductorMenu = ref(null)
const vehiculoAsignado = ref(null)

const nuevoGrupo = ref({
  nombre: '',
  color: 'blue',
})

const coloresDisponibles = [
  { label: 'Azul', value: 'blue' },
  { label: 'Verde', value: 'green' },
  { label: 'Naranja', value: 'orange' },
  { label: 'Rojo', value: 'red' },
  { label: 'Púrpura', value: 'purple' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Rosa', value: 'pink' },
  { label: 'Gris', value: 'blue-grey' },
]

// Lista de vehículos disponibles (vendrá de Firebase)
const vehiculosDisponibles = [
  { label: 'SPRINTER-PANEL-1-HF3500C', value: 'vehiculo1' },
  { label: 'PERCO TIJ-CRAFTER-UX23465A', value: 'vehiculo2' },
  { label: 'Camión 001', value: 'vehiculo3' },
  { label: 'Camión 002', value: 'vehiculo4' },
  { label: 'Vehículo no asignado', value: null },
]

// Grupos de conductores
const grupos = ref([
  {
    id: 'grupo1',
    nombre: 'Flota Principal',
    color: 'blue',
  },
  {
    id: 'grupo2',
    nombre: 'Distribución',
    color: 'green',
  },
  {
    id: 'grupo3',
    nombre: 'Ventas',
    color: 'orange',
  },
])

// Lista de conductores (ejemplo - vendrán de Firebase)
const conductores = ref([
  {
    id: 1,
    nombre: 'Antonio Soto',
    iniciales: 'AS',
    vehiculo: 'Vehículo no asignado',
    telefono: '+52 1 663 203 0458',
    fechaExpiracion: '—',
    notas: '—',
    grupoId: null,
  },
  {
    id: 2,
    nombre: 'BRANDON',
    iniciales: 'BR',
    vehiculo: 'SPRINTER-PANEL-1-HF3500C',
    telefono: '+52 664 123 4567',
    fechaExpiracion: '15/06/2026',
    notas: 'Conductor experimentado',
    grupoId: 'grupo1',
  },
  {
    id: 3,
    nombre: 'CHRISTOPHER',
    iniciales: 'CH',
    vehiculo: 'PERCO TIJ-CRAFTER-UX23465A',
    telefono: '+52 664 987 6543',
    fechaExpiracion: '20/12/2025',
    notas: 'Disponible para rutas largas',
    grupoId: 'grupo1',
  },
  {
    id: 4,
    nombre: 'Josue Corona',
    iniciales: 'JC',
    vehiculo: 'Vehículo no asignado',
    telefono: '+52 664 555 1234',
    fechaExpiracion: '—',
    notas: '—',
    grupoId: 'grupo2',
  },
])

// Computed
const totalConductores = computed(() => conductores.value.length)

const opcionesGrupos = computed(() => {
  const opciones = [{ label: 'Todos', value: 'todos' }]
  grupos.value.forEach((grupo) => {
    opciones.push({
      label: grupo.nombre,
      value: grupo.id,
    })
  })
  opciones.push({ label: 'Sin grupo', value: 'sin-grupo' })
  return opciones
})

const conductoresFiltrados = computed(() => {
  let resultado = conductores.value

  // Filtrar por grupo
  if (grupoSeleccionado.value === 'sin-grupo') {
    resultado = resultado.filter((c) => !c.grupoId)
  } else if (grupoSeleccionado.value !== 'todos') {
    resultado = resultado.filter((c) => c.grupoId === grupoSeleccionado.value)
  }

  // Filtrar por búsqueda
  if (busqueda.value) {
    resultado = resultado.filter(
      (c) =>
        c.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        c.vehiculo.toLowerCase().includes(busqueda.value.toLowerCase()),
    )
  }

  return resultado
})

// Methods
function seleccionarTodos(valor) {
  grupoSeleccionado.value = valor ? 'todos' : grupoSeleccionado.value
}

function filtrarPorGrupo(grupo) {
  grupoSeleccionado.value = grupo.id
  todosConductores.value = false
}

function seleccionarConductor(conductor) {
  // Si es el mismo conductor, cerrar el dialog
  if (conductorSeleccionado.value?.id === conductor.id && dialogDetallesConductor.value) {
    dialogDetallesConductor.value = false
    conductorSeleccionado.value = null
    return
  }

  // Si es otro conductor, abrir sus detalles
  conductorSeleccionado.value = conductor
  vehiculoAsignado.value = conductor.vehiculo
  dialogDetallesConductor.value = true
  emit('conductor-seleccionado', conductor)
}

function cerrarDrawer() {
  emit('close')
}

function contarConductoresPorGrupo(grupoId) {
  return conductores.value.filter((c) => c.grupoId === grupoId).length
}

function getColorGrupo(grupoId) {
  if (!grupoId) return 'grey'
  const grupo = grupos.value.find((g) => g.id === grupoId)
  return grupo ? grupo.color : 'grey'
}

function asignarVehiculoAConductor() {
  if (conductorSeleccionado.value) {
    const conductor = conductores.value.find((c) => c.id === conductorSeleccionado.value.id)
    if (conductor) {
      conductor.vehiculo = vehiculoAsignado.value || 'Vehículo no asignado'
      conductorSeleccionado.value.vehiculo = conductor.vehiculo
    }

    $q.notify({
      type: 'positive',
      message: 'Vehículo asignado correctamente',
      icon: 'check_circle',
    })

    dialogAsignarVehiculo.value = false
  }
}

function editarConductor() {
  $q.notify({
    type: 'info',
    message: 'Función de edición en desarrollo',
    icon: 'info',
  })
}

function confirmarEliminarConductor() {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar al conductor ${conductorSeleccionado.value?.nombre}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    const index = conductores.value.findIndex((c) => c.id === conductorSeleccionado.value.id)
    if (index > -1) {
      conductores.value.splice(index, 1)
      dialogDetallesConductor.value = false

      $q.notify({
        type: 'positive',
        message: 'Conductor eliminado',
        icon: 'check_circle',
      })
    }
  })
}

function crearGrupo() {
  const nuevoId = `grupo${grupos.value.length + 1}`
  grupos.value.push({
    id: nuevoId,
    nombre: nuevoGrupo.value.nombre,
    color: nuevoGrupo.value.color,
  })

  // Reset form
  nuevoGrupo.value = { nombre: '', color: 'blue' }
  dialogNuevoGrupo.value = false

  $q.notify({
    type: 'positive',
    message: 'Grupo creado correctamente',
    icon: 'check_circle',
  })
}

function mostrarMenuGrupo(grupo) {
  grupoMenu.value = grupo
  menuGrupoVisible.value = true
}

function mostrarMenuConductor(conductor) {
  conductorMenu.value = conductor
  menuConductorVisible.value = true
}

function editarGrupo() {
  console.log('Editar grupo:', grupoMenu.value)
  // Aquí implementarías la lógica de edición
}

function eliminarGrupo() {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar el grupo ${grupoMenu.value?.nombre}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    const index = grupos.value.findIndex((g) => g.id === grupoMenu.value.id)
    if (index > -1) {
      grupos.value.splice(index, 1)

      $q.notify({
        type: 'positive',
        message: 'Grupo eliminado',
        icon: 'check_circle',
      })
    }
  })
}

function asignarGrupo() {
  console.log('Asignar grupo a:', conductorMenu.value)
  // Aquí mostrarías un diálogo para asignar el conductor a un grupo
}

function verDetalles() {
  seleccionarConductor(conductorMenu.value)
}
</script>

<style scoped>
.conductores-drawer {
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

/* Búsqueda */
.search-input {
  background: white;
}

/* Grupos */
.grupos-lista {
  max-height: 200px;
  overflow-y: auto;
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

/* Lista de conductores */
.conductores-list {
  flex: 1;
  overflow-y: auto;
}

.conductor-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 10px 12px;
}

.conductor-item.q-item--active {
  background-color: #e3f2fd;
}

.conductor-item:hover {
  background-color: #f5f5f5;
}

/* Sin datos */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* Color picker */
.color-picker {
  display: flex;
  flex-wrap: wrap;
}

/* Detalles del conductor */
.detalle-dialog :deep(.q-dialog__backdrop) {
  background: transparent !important;
}

.detalle-section {
  margin-bottom: 16px;
}

.detalle-label {
  font-size: 12px;
  color: #757575;
  margin-bottom: 8px;
  font-weight: 500;
}

.detalle-valor {
  font-size: 14px;
  color: #212121;
  padding: 8px 0;
}

.detalle-campo {
  margin-top: 4px;
}

.detalle-campo .q-btn {
  justify-content: space-between;
  padding: 8px 12px;
}
</style>
