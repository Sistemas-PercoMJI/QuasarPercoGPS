<template>
  <div class="estado-flota-drawer">
    <!-- Header con título y botón cerrar -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Estado de la flota</div>
      <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
    </div>

    <!-- Selector de todos los vehículos -->
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

    <!-- Filtros por estado con iconos y colores -->
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

    <!-- Búsqueda -->
    <div class="q-px-md q-pb-sm">
      <q-input v-model="busqueda" outlined dense placeholder="Búsqueda" class="search-input">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Headers de la tabla -->
    <div class="tabla-header q-px-md">
      <div class="header-item">Nombre del vehículo</div>
      <div class="header-item text-right">Velocidad</div>
      <q-btn flat dense round icon="more_vert" size="sm" />
    </div>

    <!-- Lista de vehículos -->
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
</template>

<script setup>
import { ref, computed } from 'vue'

// Emits
const emit = defineEmits(['close', 'vehiculo-seleccionado'])

// Estado
const todosVehiculos = ref(true)
const estadoSeleccionado = ref('todos')
const busqueda = ref('')
const vehiculoSeleccionado = ref(null)

// Definición de estados de vehículos
const estadosVehiculos = ref([
  {
    tipo: 'todos',
    nombre: 'Todos',
    icono: 'directions_car',
    color: 'blue',
    cantidad: 6,
  },
  {
    tipo: 'movimiento',
    nombre: 'En movimiento',
    icono: 'navigation',
    color: 'green',
    cantidad: 0,
  },
  {
    tipo: 'inactivo',
    nombre: 'Inactivo',
    icono: 'pause_circle',
    color: 'orange',
    cantidad: 1,
  },
  {
    tipo: 'ignicion_apagada',
    nombre: 'Ignición apagada',
    icono: 'power_settings_new',
    color: 'blue-grey',
    cantidad: 4,
  },
  {
    tipo: 'carga',
    nombre: 'Carga',
    icono: 'local_gas_station',
    color: 'cyan',
    cantidad: 0,
  },
  {
    tipo: 'ignicion_bloqueada',
    nombre: 'Ignición bloqueada',
    icono: 'lock',
    color: 'red',
    cantidad: 1,
  },
])

// Lista de vehículos (datos de ejemplo)
const vehiculos = ref([
  {
    id: 1,
    nombre: 'CRAFTER-VF61428_REV',
    ubicacion: 'MX, Hermosillo, Boulevard E...',
    velocidad: '0 km/h',
    estado: 'inactivo',
  },
  {
    id: 2,
    nombre: 'ELEV TIJ-SOTO-FRONTI...',
    ubicacion: 'MX, Ensenada, Calle Lago de...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
  },
  {
    id: 3,
    nombre: 'PERCO TIJ-CRAFTER-UX...',
    ubicacion: 'MX, Tijuana, Calle Rey Alejan...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
  },
  {
    id: 4,
    nombre: 'SPRINTER-PANEL-1-HF3...',
    ubicacion: 'MX, Tijuana, Boulevard Guad...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
  },
  {
    id: 5,
    nombre: 'TIENDAPERCO-TIJ-NP3...',
    ubicacion: 'MX, Tijuana, Boulevard de lo...',
    velocidad: '0 km/h',
    estado: 'ignicion_apagada',
  },
  {
    id: 6,
    nombre: 'VENTAS_PERCO_INS_N...',
    ubicacion: 'MX, Tijuana, Boulevard de lo...',
    velocidad: '0 km/h',
    estado: 'ignicion_bloqueada',
  },
])

// Computed
const totalVehiculos = computed(() => vehiculos.value.length)

const vehiculosFiltrados = computed(() => {
  let resultado = vehiculos.value

  // Filtrar por estado
  if (estadoSeleccionado.value !== 'todos') {
    resultado = resultado.filter((v) => v.estado === estadoSeleccionado.value)
  }

  // Filtrar por búsqueda
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
  console.log('Todos los vehículos:', valor)
  if (valor) {
    estadoSeleccionado.value = 'todos'
  }
}

function seleccionarEstado(estado) {
  estadoSeleccionado.value = estado.tipo
  todosVehiculos.value = estado.tipo === 'todos'
  console.log('Estado seleccionado:', estado.tipo)
}

function seleccionarVehiculo(vehiculo) {
  vehiculoSeleccionado.value = vehiculo
  emit('vehiculo-seleccionado', vehiculo)
  console.log('Vehículo seleccionado:', vehiculo)
}

function cerrarDrawer() {
  emit('close')
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
.estado-flota-drawer {
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
</style>
