<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="conductores-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Conductores</div>
      <div>
        <q-btn 
          flat 
          dense 
          round 
          icon="bug_report" 
          color="white" 
          size="sm"
          @click="diagnosticar"
        >
          <q-tooltip>Diagnosticar datos locales</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
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
        icon="person_add"
        size="sm"
        class="q-mr-xs"
        @click="abrirDialogNuevoConductor"
      >
        <q-tooltip>Agregar conductor</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        round
        icon="create_new_folder"
        size="sm"
        class="float-right"
        @click="abrirDialogNuevoGrupo"
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
            <q-icon name="folder" color="blue" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ grupo.Nombre }}</q-item-label>
            <q-item-label caption>
              {{ contarConductoresPorGrupo(grupo.id) }} conductores
            </q-item-label>
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
      <div class="header-item">Conductores</div>
      <div class="header-item text-right">{{ conductoresFiltrados.length }}</div>
    </div>

    <!-- Lista de conductores -->
    <q-scroll-area class="conductores-list">
      <q-list>
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
            <q-avatar color="primary" text-color="white" size="40px">
              {{ obtenerIniciales(conductor.Usuario || conductor.Nombre) }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{ conductor.Usuario }}</q-item-label>
            <q-item-label caption class="text-grey-7">{{ conductor.Telefono }}</q-item-label>
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
        <div v-if="conductoresFiltrados.length === 0 && !loading" class="no-data q-pa-md text-center">
          <q-icon name="person_off" size="48px" color="grey-5" />
          <div class="text-grey-6 q-mt-sm">No hay conductores</div>
          <q-btn 
            flat 
            color="primary" 
            label="Recargar" 
            icon="refresh" 
            class="q-mt-md"
            @click="recargarDatos"
          />
        </div>
      </q-list>
    </q-scroll-area>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <!-- Dialog: Detalles del Conductor -->
    <q-dialog v-model="dialogDetallesConductor" position="right" seamless>
      <q-card style="width: 400px; max-width: 90vw">
        <!-- Header del card -->
        <q-card-section class="bg-gradient text-white row items-center">
          <div class="col">
            <div class="text-h6">{{ conductorSeleccionado?.Nombre }}</div>
          </div>
          <q-btn flat dense round icon="close" @click="dialogDetallesConductor = false" />
        </q-card-section>

        <q-separator />

        <!-- Contenido -->
        <q-card-section style="max-height: 60vh" class="scroll">
          <!-- Nombre completo -->
          <div class="detalle-section">
            <div class="detalle-label">Nombre completo</div>
            <div class="detalle-valor">{{ conductorSeleccionado?.Nombre }}</div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Usuario -->
          <div class="detalle-section">
            <div class="detalle-label">Usuario</div>
            <div class="detalle-valor">{{ conductorSeleccionado?.Usuario }}</div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Teléfono -->
          <div class="detalle-section">
            <div class="detalle-label">Teléfono</div>
            <q-input
              v-model="conductorSeleccionado.Telefono"
              outlined
              dense
              @blur="actualizarCampo('Telefono', conductorSeleccionado.Telefono)"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Licencia de conducir -->
          <div class="detalle-section">
            <div class="detalle-label">Licencia de conducir</div>
            <q-btn
              v-if="conductorSeleccionado?.LicenciaConduccirFoto"
              outline
              color="primary"
              label="Ver licencia"
              icon="image"
              class="full-width"
              @click="verLicencia"
            />
            <q-btn
              v-else
              outline
              color="grey"
              label="Subir licencia"
              icon="upload"
              class="full-width"
              @click="subirLicencia"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Fecha de vencimiento -->
          <div class="detalle-section">
            <div class="detalle-label">Fecha de vencimiento de licencia</div>
            <q-input
              :model-value="fechaVencimientoFormato"
              outlined
              dense
              readonly
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      :model-value="fechaVencimientoFormato"
                      mask="DD/MM/YYYY"
                      @update:model-value="actualizarFechaVencimiento"
                    >
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Cerrar" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
              <template v-slot:after>
                <q-badge 
                  :color="esLicenciaVigente ? 'positive' : 'negative'"
                  :label="esLicenciaVigente ? 'Vigente' : 'Expirada'"
                />
              </template>
            </q-input>
          </div>
        </q-card-section>

        <!-- Botones de acción -->
        <q-card-actions class="q-pa-md q-gutter-sm">
          <q-btn
            outline
            color="negative"
            label="Eliminar conductor"
            icon="delete"
            class="full-width"
            @click="confirmarEliminarConductor"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Nuevo Grupo con selección de conductores -->
    <q-dialog v-model="dialogNuevoGrupo" position="standard">
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ modoEdicion ? 'Editar grupo' : 'Nuevo grupo' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="nuevoGrupo.Nombre"
            label="Nombre del grupo"
            outlined
            dense
            autofocus
            :rules="[(val) => !!val || 'El nombre es requerido']"
          />

          <div class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">Seleccionar conductores</div>
            
            <!-- Búsqueda de conductores -->
            <q-input
              v-model="busquedaConductoresGrupo"
              outlined
              dense
              placeholder="Buscar conductor..."
              class="q-mb-sm"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <!-- Lista de conductores para seleccionar -->
            <q-scroll-area style="height: 300px" class="bordered">
              <q-list>
                <q-item
                  v-for="conductor in conductoresDisponiblesParaGrupo"
                  :key="conductor.id"
                  tag="label"
                  v-ripple
                >
                  <q-item-section avatar>
                    <q-checkbox
                      :model-value="conductoresSeleccionados.includes(conductor.id)"
                      @update:model-value="toggleConductor(conductor.id)"
                    />
                  </q-item-section>
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="32px">
                      {{ obtenerIniciales(conductor.Usuario || conductor.Nombre) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ conductor.Usuario }}</q-item-label>
                    <q-item-label caption>{{ conductor.Nombre }}</q-item-label>
                  </q-item-section>
                </q-item>

                <div
                  v-if="conductoresDisponiblesParaGrupo.length === 0"
                  class="q-pa-md text-center text-grey-6"
                >
                  No hay conductores disponibles
                </div>
              </q-list>
            </q-scroll-area>

            <div class="q-mt-sm text-caption text-grey-7">
              {{ conductoresSeleccionados.length }} conductor(es) seleccionado(s)
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            flat
            :label="modoEdicion ? 'Guardar' : 'Crear'"
            color="primary"
            @click="guardarGrupo"
            :disable="!nuevoGrupo.Nombre"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Nuevo Conductor -->
    <q-dialog v-model="dialogNuevoConductor">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Nuevo conductor</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-md">
          <q-input
            v-model="nuevoConductor.Nombre"
            label="Nombre completo"
            outlined
            dense
            autofocus
            :rules="[(val) => !!val || 'El nombre es requerido']"
          />

          <q-input
            v-model="nuevoConductor.Usuario"
            label="Usuario (nombre corto)"
            outlined
            dense
            :rules="[(val) => !!val || 'El usuario es requerido']"
          />

          <q-input
            v-model="nuevoConductor.Telefono"
            label="Teléfono"
            outlined
            dense
            mask="(###) ### ####"
            placeholder="(664) 123 4567"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            flat
            label="Crear"
            color="primary"
            @click="crearNuevoConductor"
            :disable="!nuevoConductor.Nombre || !nuevoConductor.Usuario"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Ver licencia -->
    <q-dialog v-model="dialogVerLicencia">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Licencia de conducir</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div v-if="conductorSeleccionado?.LicenciaConduccirFoto" class="text-center">
            <q-img
              :src="conductorSeleccionado.LicenciaConduccirFoto"
              style="max-height: 500px"
              fit="contain"
            />
          </div>
          <div v-else class="text-center q-pa-lg">
            <q-icon name="image_not_supported" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">No hay licencia cargada</div>
          </div>
        </q-card-section>
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
        <q-item clickable v-close-popup @click="confirmarEliminarGrupo">
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
        <q-item clickable v-close-popup @click="verDetalles">
          <q-item-section avatar>
            <q-icon name="info" size="xs" />
          </q-item-section>
          <q-item-section>Ver detalles</q-item-section>
        </q-item>
        <q-item 
          clickable 
          v-close-popup 
          @click="quitarDeGrupo"
          v-if="grupoSeleccionado !== 'todos'"
        >
          <q-item-section avatar>
            <q-icon name="remove_circle" size="xs" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Quitar del grupo</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar, date } from 'quasar'
import { useConductoresLocal as useConductores } from 'src/composables/useConductoresLocal.js'

// Emits
const emit = defineEmits(['close', 'conductor-seleccionado'])

const $q = useQuasar()

// Composable
const {
  conductores,
  grupos,
  loading,
  obtenerConductores,
  obtenerGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  agregarConductor,
  actualizarConductor,
  eliminarConductor,
  agregarConductoresAGrupo,
  removerConductorDeGrupo,
  contarConductoresPorGrupo,
  conductoresPorGrupo
} = useConductores()

// Estado local
const todosConductores = ref(true)
const busqueda = ref('')
const busquedaConductoresGrupo = ref('')
const conductorSeleccionado = ref({})
const grupoSeleccionado = ref('todos')
const dialogNuevoGrupo = ref(false)
const dialogNuevoConductor = ref(false)
const dialogDetallesConductor = ref(false)
const dialogVerLicencia = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
const grupoMenu = ref(null)
const conductorMenu = ref(null)
const modoEdicion = ref(false)
const conductoresSeleccionados = ref([])

const nuevoGrupo = ref({
  Nombre: '',
  ConductoresIds: []
})

const nuevoConductor = ref({
  Nombre: '',
  Usuario: '',
  Telefono: ''
})

// Computed
const totalConductores = computed(() => conductores.value.length)

const opcionesGrupos = computed(() => {
  const opciones = [{ label: 'Todos', value: 'todos' }]
  grupos.value.forEach((grupo) => {
    opciones.push({
      label: grupo.Nombre,
      value: grupo.id
    })
  })
  return opciones
})

const conductoresFiltrados = computed(() => {
  let resultado = []

  // Filtrar por grupo
  if (grupoSeleccionado.value === 'todos') {
    resultado = conductores.value
  } else {
    resultado = conductoresPorGrupo(grupoSeleccionado.value)
  }

  // Filtrar por búsqueda
  if (busqueda.value) {
    const busquedaLower = busqueda.value.toLowerCase()
    resultado = resultado.filter(
      (c) =>
        c.Nombre.toLowerCase().includes(busquedaLower) ||
        c.Usuario.toLowerCase().includes(busquedaLower) ||
        c.Telefono.toLowerCase().includes(busquedaLower)
    )
  }

  return resultado
})

const conductoresDisponiblesParaGrupo = computed(() => {
  let disponibles = conductores.value

  // Si estamos editando, mostrar solo los que NO están en el grupo
  if (modoEdicion.value && grupoMenu.value) {
    const idsEnGrupo = grupoMenu.value.ConductoresIds || []
    disponibles = conductores.value.filter(c => !idsEnGrupo.includes(c.id))
  }

  // Filtrar por búsqueda
  if (busquedaConductoresGrupo.value) {
    const busquedaLower = busquedaConductoresGrupo.value.toLowerCase()
    disponibles = disponibles.filter(
      (c) =>
        c.Nombre.toLowerCase().includes(busquedaLower) ||
        c.Usuario.toLowerCase().includes(busquedaLower)
    )
  }

  return disponibles
})

const fechaVencimientoFormato = computed(() => {
  if (!conductorSeleccionado.value?.LicenciaConduccirVFecha) return ''
  const fecha = conductorSeleccionado.value.LicenciaConduccirVFecha
  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esLicenciaVigente = computed(() => {
  if (!conductorSeleccionado.value?.LicenciaConduccirVFecha) return false
  const fechaVencimiento = new Date(conductorSeleccionado.value.LicenciaConduccirVFecha)
  return fechaVencimiento > new Date()
})

// Methods
function obtenerIniciales(nombre) {
  if (!nombre) return '??'
  const palabras = nombre.trim().split(' ')
  if (palabras.length === 1) return palabras[0].substring(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

function seleccionarTodos(valor) {
  grupoSeleccionado.value = valor ? 'todos' : grupoSeleccionado.value
}

function filtrarPorGrupo(grupo) {
  grupoSeleccionado.value = grupo.id
  todosConductores.value = false
}

function seleccionarConductor(conductor) {
  if (conductorSeleccionado.value?.id === conductor.id && dialogDetallesConductor.value) {
    dialogDetallesConductor.value = false
    conductorSeleccionado.value = {}
    return
  }

  conductorSeleccionado.value = { ...conductor }
  dialogDetallesConductor.value = true
  emit('conductor-seleccionado', conductor)
}

function cerrarDrawer() {
  emit('close')
}

async function recargarDatos() {
  try {
    console.log('🔄 Recargando datos locales...')
    await Promise.all([
      obtenerConductores(),
      obtenerGrupos()
    ])
    
    $q.notify({
      type: 'positive',
      message: 'Datos recargados correctamente',
      icon: 'check_circle'
    })
  } catch (error) {
    console.error('❌ Error al recargar:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al recargar: ' + error.message,
      icon: 'error'
    })
  }
}

async function diagnosticar() {
  console.log('🔍 === DIAGNÓSTICO DE DATOS LOCALES ===')
  console.log('📊 Conductores:', conductores.value.length)
  conductores.value.forEach(c => {
    console.log('   👤', c.id, '-', c.Usuario, '-', c.Nombre)
  })
  
  console.log('📁 Grupos:', grupos.value.length)
  grupos.value.forEach(g => {
    console.log('   📂', g.id, '-', g.Nombre, '- Conductores:', g.ConductoresIds?.length || 0)
  })
  
  console.log('🔍 === FIN DEL DIAGNÓSTICO ===')
  
  $q.notify({
    type: 'info',
    message: 'Diagnóstico completado. Revisa la consola (F12)',
    icon: 'info',
    timeout: 3000
  })
}

async function actualizarCampo(campo, valor) {
  if (!conductorSeleccionado.value?.id) return

  try {
    await actualizarConductor(conductorSeleccionado.value.id, { [campo]: valor })
    
    $q.notify({
      type: 'positive',
      message: 'Campo actualizado correctamente',
      icon: 'check_circle'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al actualizar: ' + error.message,
      icon: 'error'
    })
  }
}

async function actualizarFechaVencimiento(fecha) {
  if (!conductorSeleccionado.value?.id) return

  try {
    const fechaTimestamp = new Date(
      fecha.split('/')[2], 
      fecha.split('/')[1] - 1, 
      fecha.split('/')[0]
    )
    
    await actualizarConductor(conductorSeleccionado.value.id, {
      LicenciaConduccirVFecha: fechaTimestamp
    })

    conductorSeleccionado.value.LicenciaConduccirVFecha = fechaTimestamp

    $q.notify({
      type: 'positive',
      message: 'Fecha actualizada correctamente',
      icon: 'check_circle'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al actualizar fecha: ' + error.message,
      icon: 'error'
    })
  }
}

function verLicencia() {
  dialogVerLicencia.value = true
}

function subirLicencia() {
  $q.notify({
    type: 'info',
    message: 'Función de subir licencia en desarrollo',
    icon: 'info'
  })
}

function abrirDialogNuevoGrupo() {
  modoEdicion.value = false
  nuevoGrupo.value = { Nombre: '', ConductoresIds: [] }
  conductoresSeleccionados.value = []
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

function abrirDialogNuevoConductor() {
  nuevoConductor.value = { Nombre: '', Usuario: '', Telefono: '' }
  dialogNuevoConductor.value = true
}

async function crearNuevoConductor() {
  try {
    await agregarConductor({
      Nombre: nuevoConductor.value.Nombre,
      Usuario: nuevoConductor.value.Usuario,
      Telefono: nuevoConductor.value.Telefono,
      LicenciaConduccirFoto: '',
      LicenciaConduccirVFecha: null
    })

    $q.notify({
      type: 'positive',
      message: 'Conductor creado correctamente',
      icon: 'check_circle'
    })

    dialogNuevoConductor.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al crear conductor: ' + error.message,
      icon: 'error'
    })
  }
}

function toggleConductor(conductorId) {
  const index = conductoresSeleccionados.value.indexOf(conductorId)
  if (index > -1) {
    conductoresSeleccionados.value.splice(index, 1)
  } else {
    conductoresSeleccionados.value.push(conductorId)
  }
}

async function guardarGrupo() {
  try {
    if (modoEdicion.value) {
      // Actualizar grupo existente
      await actualizarGrupo(grupoMenu.value.id, {
        Nombre: nuevoGrupo.value.Nombre
      })

      // Agregar nuevos conductores
      if (conductoresSeleccionados.value.length > 0) {
        await agregarConductoresAGrupo(grupoMenu.value.id, conductoresSeleccionados.value)
      }

      $q.notify({
        type: 'positive',
        message: 'Grupo actualizado correctamente',
        icon: 'check_circle'
      })
    } else {
      // Crear nuevo grupo
      await crearGrupo({
        Nombre: nuevoGrupo.value.Nombre,
        ConductoresIds: conductoresSeleccionados.value
      })

      $q.notify({
        type: 'positive',
        message: 'Grupo creado correctamente',
        icon: 'check_circle'
      })
    }

    dialogNuevoGrupo.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error'
    })
  }
}

async function confirmarEliminarConductor() {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar al conductor ${conductorSeleccionado.value?.Nombre}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await eliminarConductor(conductorSeleccionado.value.id)
      dialogDetallesConductor.value = false

      $q.notify({
        type: 'positive',
        message: 'Conductor eliminado',
        icon: 'check_circle'
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar: ' + error.message,
        icon: 'error'
      })
    }
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
  modoEdicion.value = true
  nuevoGrupo.value = { Nombre: grupoMenu.value.Nombre }
  conductoresSeleccionados.value = []
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

async function confirmarEliminarGrupo() {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar el grupo ${grupoMenu.value?.Nombre}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await eliminarGrupo(grupoMenu.value.id)

      $q.notify({
        type: 'positive',
        message: 'Grupo eliminado',
        icon: 'check_circle'
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar: ' + error.message,
        icon: 'error'
      })
    }
  })
}

function verDetalles() {
  seleccionarConductor(conductorMenu.value)
}

async function quitarDeGrupo() {
  if (grupoSeleccionado.value === 'todos') {
    $q.notify({
      type: 'warning',
      message: 'Selecciona un grupo primero',
      icon: 'warning'
    })
    return
  }

  try {
    await removerConductorDeGrupo(grupoSeleccionado.value, conductorMenu.value.id)

    $q.notify({
      type: 'positive',
      message: 'Conductor removido del grupo',
      icon: 'check_circle'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error'
    })
  }
}

// Lifecycle
onMounted(async () => {
  try {
    console.log('🔄 Iniciando carga de datos locales...')
    
    await Promise.all([
      obtenerConductores(),
      obtenerGrupos()
    ])
    
    console.log('✅ Datos cargados:', {
      conductores: conductores.value.length,
      grupos: grupos.value.length
    })
  } catch (error) {
    console.error('❌ Error al cargar datos:', error)
    
    $q.notify({
      type: 'negative',
      message: 'Error al cargar datos: ' + error.message,
      icon: 'error',
      timeout: 5000
    })
  }
})
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

.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
}

.drawer-header .text-h6 {
  color: white;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.search-input {
  background: white;
}

.grupos-lista {
  max-height: 200px;
  overflow-y: auto;
}

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

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
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

.bordered {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
</style>