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

// Emits
const emit = defineEmits(['close', 'conductor-seleccionado'])

// Estado
const todosConductores = ref(true)
const busqueda = ref('')
const conductorSeleccionado = ref(null)
const grupoSeleccionado = ref('todos')
const dialogNuevoGrupo = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
const grupoMenu = ref(null)
const conductorMenu = ref(null)

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
    grupoId: null,
  },
  {
    id: 2,
    nombre: 'BRANDON',
    iniciales: 'BR',
    vehiculo: 'SPRINTER-PANEL-1-HF3500C*',
    grupoId: 'grupo1',
  },
  {
    id: 3,
    nombre: 'CHRISTOPHER',
    iniciales: 'CH',
    vehiculo: 'PERCO TIJ-CRAFTER-UX23465A*',
    grupoId: 'grupo1',
  },
  {
    id: 4,
    nombre: 'Josue Corona',
    iniciales: 'JC',
    vehiculo: 'Vehículo no asignado',
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
  conductorSeleccionado.value = conductor
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

  console.log('Grupo creado:', grupos.value[grupos.value.length - 1])
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
  console.log('Eliminar grupo:', grupoMenu.value)
  // Aquí implementarías la lógica de eliminación
}

function asignarGrupo() {
  console.log('Asignar grupo a:', conductorMenu.value)
  // Aquí mostrarías un diálogo para asignar el conductor a un grupo
}

function verDetalles() {
  console.log('Ver detalles de:', conductorMenu.value)
  emit('conductor-seleccionado', conductorMenu.value)
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
</style>
