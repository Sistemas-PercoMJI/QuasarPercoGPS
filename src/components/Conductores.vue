<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="conductores-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Conductores</div>
      <div>
        <q-btn flat dense round icon="sync" color="white" size="sm" @click="sincronizarDatos">
          <q-tooltip>Sincronizar con Firebase</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
    </div>

    <!-- Botones de acción - Solo en la parte superior -->
    <div class="q-pa-sm q-px-md" style="display: flex; justify-content: flex-end; gap: 4px">
      <q-btn flat dense round icon="person_add" size="sm" @click="abrirDialogNuevoConductor">
        <q-tooltip>Agregar conductor</q-tooltip>
      </q-btn>
      <q-btn flat dense round icon="create_new_folder" size="sm" @click="abrirDialogNuevoGrupo">
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

    <!-- Filtro por grupo - ELIMINADO porque no se necesita -->
    <!-- Los grupos se seleccionan haciendo clic en la lista de carpetas -->

    <!-- Lista de grupos (tipo carpetas) -->
    <div class="grupos-lista q-px-md q-pb-sm" v-if="gruposConductores.length > 0">
      <div class="text-caption text-grey-7 q-mb-xs">GRUPOS</div>
      <q-list dense bordered class="rounded-borders">
        <q-item
          v-for="grupo in gruposConductores"
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
              @click.stop="mostrarMenuGrupo($event, grupo)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Headers de la tabla -->
    <div class="tabla-header q-px-md">
      <div class="header-item">Conductores</div>
      <div class="header-item text-center">Unidad</div>
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
              {{ obtenerIniciales(conductor.Nombre) }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{ conductor.Nombre }}</q-item-label>
            <q-item-label caption class="text-grey-7">{{ conductor.Telefono }}</q-item-label>
          </q-item-section>

          <q-item-section center>
            <q-badge
              v-if="obtenerUnidadDeConductor(conductor.id)"
              color="blue-6"
              :label="obtenerUnidadDeConductor(conductor.id)?.Unidad"
            />
            <span v-else class="text-grey-5 text-caption">Sin unidad</span>
          </q-item-section>

          <q-item-section side>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              @click.stop="mostrarMenuConductor($event, conductor)"
            />
          </q-item-section>
        </q-item>

        <!-- Mensaje si no hay conductores -->
        <div
          v-if="conductoresFiltrados.length === 0 && !loading"
          class="no-data q-pa-md text-center"
        >
          <q-icon name="person_off" size="48px" color="grey-5" />
          <div class="text-grey-6 q-mt-sm">No hay conductores en este grupo</div>
          <q-btn
            flat
            color="primary"
            label="Ver todos"
            icon="folder_open"
            class="q-mt-md"
            @click="verTodosConductores"
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
            <q-input
              v-model="conductorEditando.Nombre"
              outlined
              dense
              @blur="actualizarCampo('Nombre', conductorEditando.Nombre)"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Teléfono -->
          <div class="detalle-section">
            <div class="detalle-label">Teléfono</div>
            <q-input
              v-model="conductorEditando.Telefono"
              outlined
              dense
              mask="(###) ### ####"
              @blur="actualizarCampo('Telefono', conductorEditando.Telefono)"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Código de licencia de conducir -->
          <div class="detalle-section">
            <div class="detalle-label">Código de licencia de conducir</div>
            <q-input
              v-model="conductorEditando.LicenciaConducirCodigo"
              outlined
              dense
              placeholder="Ej: A1234567"
              @blur="
                actualizarCampo('LicenciaConducirCodigo', conductorEditando.LicenciaConducirCodigo)
              "
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Licencia de conducir - SOLO VISUALIZACIÓN -->
          <div class="detalle-section" v-if="conductorEditando?.LicenciaConducirFoto">
            <div class="detalle-label">Licencia de conducir</div>
            <q-btn
              outline
              color="primary"
              label="Ver licencia"
              icon="image"
              class="full-width"
              @click="verLicencia"
            />
          </div>

          <q-separator class="q-my-md" v-if="conductorEditando?.LicenciaConducirFoto" />

          <!-- Fecha de vencimiento -->
          <div class="detalle-section">
            <div class="detalle-label">Fecha de vencimiento de licencia</div>
            <q-input :model-value="fechaVencimientoFormato" outlined dense readonly>
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
                  v-if="conductorEditando?.LicenciaConducirFecha"
                  :color="esLicenciaVigente ? 'positive' : 'negative'"
                  :label="esLicenciaVigente ? 'Vigente' : 'Expirada'"
                />
              </template>
            </q-input>
          </div>

          <q-separator class="q-my-md" />

          <!-- Unidad asignada -->
          <div class="detalle-section">
            <div class="detalle-label">Unidad asignada</div>
            <q-select
              v-model="conductorEditando.UnidadAsignada"
              :options="opcionesUnidades"
              outlined
              dense
              emit-value
              map-options
              clearable
              label="Seleccionar unidad"
              @update:model-value="asignarUnidadAConductor"
            />
          </div>

          <!-- Información de la unidad asignada -->
          <div v-if="unidadAsignadaData" class="q-mt-md">
            <div class="text-subtitle2 text-primary q-mb-sm">Información de la unidad</div>

            <q-separator class="q-my-md" />

            <!-- Seguro de la unidad -->
            <div class="detalle-section">
              <div class="detalle-label">Código de seguro</div>
              <q-input
                :model-value="unidadAsignadaData.SeguroUnidad || 'Sin código'"
                outlined
                dense
                readonly
              />
            </div>

            <q-separator class="q-my-sm" />

            <!-- Fecha de vencimiento del seguro -->
            <div class="detalle-section">
              <div class="detalle-label">Vencimiento del seguro</div>
              <q-input
                :model-value="seguroUnidadFechaFormato || 'Sin fecha'"
                outlined
                dense
                readonly
              >
                <template v-slot:after>
                  <q-badge
                    v-if="unidadAsignadaData.SeguroUnidadFecha"
                    :color="esSeguroUnidadVigente ? 'positive' : 'negative'"
                    :label="esSeguroUnidadVigente ? 'Vigente' : 'Expirado'"
                  />
                </template>
              </q-input>
            </div>

            <q-separator class="q-my-md" />

            <!-- Tarjeta de circulación -->
            <div class="detalle-section">
              <div class="detalle-label">Código de tarjeta de circulación</div>
              <q-input
                :model-value="unidadAsignadaData.TargetaCirculacion || 'Sin código'"
                outlined
                dense
                readonly
              />
            </div>

            <q-separator class="q-my-sm" />

            <!-- Fecha de vencimiento de tarjeta de circulación -->
            <div class="detalle-section">
              <div class="detalle-label">Vencimiento de tarjeta de circulación</div>
              <q-input
                :model-value="tarjetaCirculacionFechaFormato || 'Sin fecha'"
                outlined
                dense
                readonly
              >
                <template v-slot:after>
                  <q-badge
                    v-if="unidadAsignadaData.TargetaCirculacionFecha"
                    :color="esTarjetaCirculacionVigente ? 'positive' : 'negative'"
                    :label="esTarjetaCirculacionVigente ? 'Vigente' : 'Expirada'"
                  />
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>
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
                      {{ obtenerIniciales(conductor.Nombre) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ conductor.Nombre }}</q-item-label>
                    <q-item-label caption>{{ conductor.Telefono }}</q-item-label>
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
            :disable="!nuevoConductor.Nombre"
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
          <div v-if="conductorEditando?.LicenciaConducirFoto" class="text-center">
            <q-img
              :src="conductorEditando.LicenciaConducirFoto"
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
    <q-menu
      v-model="menuGrupoVisible"
      :target="menuGrupoTarget"
      anchor="bottom right"
      self="top right"
      :offset="[0, 5]"
    >
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
    <q-menu
      v-model="menuConductorVisible"
      :target="menuConductorTarget"
      anchor="bottom right"
      self="top right"
      :offset="[0, 5]"
    >
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="verDetalles">
          <q-item-section avatar>
            <q-icon name="info" size="xs" />
          </q-item-section>
          <q-item-section>Ver detalles</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="quitarDeGrupo" v-if="grupoSeleccionado !== 'todos'">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { date, Notify } from 'quasar'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase.js'
import { useEventBus } from 'src/composables/useEventBus.js'
import { watch } from 'vue'

const { estadoCompartido, resetAbrirConductores } = useEventBus()

// ✅ LÍNEA DE SEGURIDAD - ASEGURA QUE EL ESTADO EXISTA
if (!estadoCompartido.value) {
  console.error('❌ Error crítico: estadoCompartido.value no está definido en Conductores')
}

// ✅ CÓDIGO CORRECTO - AÑADIR ESTO
watch(
  () => estadoCompartido.value?.abrirConductoresConConductor,
  (newValue) => {
    if (newValue && newValue.conductor) {
      console.log('🎯 Conductores: Detectado cambio en estadoCompartido, procesando conductor')
      console.log('✅ Conductor recibido:', newValue.conductor)
      
      // Seleccionar el grupo si es necesario
      if (newValue.conductor.grupoId && newValue.conductor.grupoId !== grupoSeleccionado.value) {
        grupoSeleccionado.value = newValue.conductor.grupoId
      }
      
      // Buscar el conductor en la lista
      const conductorEncontrado = conductores.value.find((c) => 
        c.id === newValue.conductor.id && c.grupoId === newValue.conductor.grupoId
      )
      
      if (conductorEncontrado) {
        console.log('✅ Conductor encontrado, seleccionando...')
        seleccionarConductor(conductorEncontrado)
        
        // Hacer scroll y resaltar
        setTimeout(() => {
          const elemento = document.querySelector(`[data-conductor-id="${conductorEncontrado.id}"]`)
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
            elemento.classList.add('flash-highlight')
            setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
          }
        }, 300)
        
        // Mostrar notificación
        Notify.create({
          type: 'positive',
          message: `👤 Conductor seleccionado: ${conductorEncontrado.Nombre}`,
          caption: `Grupo: ${newValue.conductor.grupoNombre || 'Sin grupo'}`,
          icon: 'person',
          timeout: 2500,
          position: 'top'
        })
      } else {
        console.error('❌ No se encontró el conductor con los datos:', newValue.conductor)
        Notify.create({
          type: 'warning',
          message: 'No se encontró el conductor seleccionado',
          icon: 'warning'
        })
      }
      
      // Limpiar después de procesar
      resetAbrirConductores()
    }
  }
)
// Emits
const emit = defineEmits(['close', 'conductor-seleccionado'])

// Composable de Firebase
const {
  conductores,
  unidades,
  gruposConductores,
  loading,
  obtenerConductores,
  escucharConductores,
  obtenerUnidades,
  obtenerGruposConductores,
  escucharGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  agregarConductor,
  actualizarConductor,
  removerConductorDeGrupo,
  contarConductoresPorGrupo,
  conductoresPorGrupo,
  asignarUnidad,
  obtenerUnidadDeConductor,
} = useConductoresFirebase()

// Estado local
const todosConductores = ref(false)
const busqueda = ref('')
const busquedaConductoresGrupo = ref('')
const conductorSeleccionado = ref(null)
const conductorEditando = ref({})
const grupoSeleccionado = ref('todos')
const dialogNuevoGrupo = ref(false)
const dialogNuevoConductor = ref(false)
const dialogDetallesConductor = ref(false)
const dialogVerLicencia = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
const menuGrupoTarget = ref(null)
const menuConductorTarget = ref(null)
const grupoMenu = ref(null)
const conductorMenu = ref(null)
const modoEdicion = ref(false)
const conductoresSeleccionados = ref([])

// Listeners de Firebase
let unsubscribeConductores = null
let unsubscribeGrupos = null

const nuevoGrupo = ref({
  Nombre: '',
  ConductoresIds: [],
})

const nuevoConductor = ref({
  Nombre: '',
  Telefono: '',
})

// Computed
const opcionesUnidades = computed(() => {
  return unidades.value.map((u) => ({
    label: u.Unidad,
    value: u.id,
  }))
})

const conductoresFiltrados = computed(() => {
  let resultado = []

  // Filtrar por grupo
  if (grupoSeleccionado.value === 'todos') {
    resultado = []
  } else {
    resultado = conductoresPorGrupo(grupoSeleccionado.value)
  }

  // Filtrar por búsqueda
  if (busqueda.value) {
    const busquedaLower = busqueda.value.toLowerCase()
    resultado = resultado.filter(
      (c) =>
        c.Nombre?.toLowerCase().includes(busquedaLower) ||
        c.Telefono?.toLowerCase().includes(busquedaLower),
    )
  }

  return resultado
})

const conductoresDisponiblesParaGrupo = computed(() => {
  let disponibles = conductores.value

  // Filtrar por búsqueda
  if (busquedaConductoresGrupo.value) {
    const busquedaLower = busquedaConductoresGrupo.value.toLowerCase()
    disponibles = disponibles.filter(
      (c) =>
        c.Nombre?.toLowerCase().includes(busquedaLower) ||
        c.Telefono?.toLowerCase().includes(busquedaLower),
    )
  }

  return disponibles
})

const fechaVencimientoFormato = computed(() => {
  if (!conductorEditando.value?.LicenciaConducirFecha) return ''

  // Convertir Timestamp de Firebase a Date
  let fecha
  if (conductorEditando.value.LicenciaConducirFecha.toDate) {
    fecha = conductorEditando.value.LicenciaConducirFecha.toDate()
  } else {
    fecha = new Date(conductorEditando.value.LicenciaConducirFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esLicenciaVigente = computed(() => {
  if (!conductorEditando.value?.LicenciaConducirFecha) return false

  let fechaVencimiento
  if (conductorEditando.value.LicenciaConducirFecha.toDate) {
    fechaVencimiento = conductorEditando.value.LicenciaConducirFecha.toDate()
  } else {
    fechaVencimiento = new Date(conductorEditando.value.LicenciaConducirFecha)
  }

  return fechaVencimiento > new Date()
})

// Computed para la unidad asignada
const unidadAsignadaData = computed(() => {
  if (!conductorEditando.value?.UnidadAsignada) return null
  return obtenerUnidadDeConductor(conductorEditando.value.id)
})

const seguroUnidadFechaFormato = computed(() => {
  if (!unidadAsignadaData.value?.SeguroUnidadFecha) return ''

  let fecha
  if (unidadAsignadaData.value.SeguroUnidadFecha.toDate) {
    fecha = unidadAsignadaData.value.SeguroUnidadFecha.toDate()
  } else {
    fecha = new Date(unidadAsignadaData.value.SeguroUnidadFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esSeguroUnidadVigente = computed(() => {
  if (!unidadAsignadaData.value?.SeguroUnidadFecha) return false

  let fechaVencimiento
  if (unidadAsignadaData.value.SeguroUnidadFecha.toDate) {
    fechaVencimiento = unidadAsignadaData.value.SeguroUnidadFecha.toDate()
  } else {
    fechaVencimiento = new Date(unidadAsignadaData.value.SeguroUnidadFecha)
  }

  return fechaVencimiento > new Date()
})

const tarjetaCirculacionFechaFormato = computed(() => {
  if (!unidadAsignadaData.value?.TargetaCirculacionFecha) return ''

  let fecha
  if (unidadAsignadaData.value.TargetaCirculacionFecha.toDate) {
    fecha = unidadAsignadaData.value.TargetaCirculacionFecha.toDate()
  } else {
    fecha = new Date(unidadAsignadaData.value.TargetaCirculacionFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esTarjetaCirculacionVigente = computed(() => {
  if (!unidadAsignadaData.value?.TargetaCirculacionFecha) return false

  let fechaVencimiento
  if (unidadAsignadaData.value.TargetaCirculacionFecha.toDate) {
    fechaVencimiento = unidadAsignadaData.value.TargetaCirculacionFecha.toDate()
  } else {
    fechaVencimiento = new Date(unidadAsignadaData.value.TargetaCirculacionFecha)
  }

  return fechaVencimiento > new Date()
})

// Methods
function obtenerIniciales(nombre) {
  if (!nombre) return '??'
  const palabras = nombre.trim().split(' ')
  if (palabras.length === 1) return palabras[0].substring(0, 2).toUpperCase()
  return (palabras[0][0] + (palabras[1]?.[0] || '')).toUpperCase()
}

function filtrarPorGrupo(grupo) {
  grupoSeleccionado.value = grupo.id
  todosConductores.value = false
}

function verTodosConductores() {
  grupoSeleccionado.value = 'todos'
  todosConductores.value = true
}

function seleccionarConductor(conductor) {
  if (conductorSeleccionado.value?.id === conductor.id && dialogDetallesConductor.value) {
    dialogDetallesConductor.value = false
    conductorSeleccionado.value = null
    conductorEditando.value = {}
    return
  }

  conductorSeleccionado.value = conductor
  conductorEditando.value = { ...conductor }
  dialogDetallesConductor.value = true
  emit('conductor-seleccionado', conductor)
}

function cerrarDrawer() {
  emit('close')
}

async function recargarDatos() {
  try {
    await Promise.all([obtenerConductores(), obtenerUnidades(), obtenerGruposConductores()])

    Notify.create({
      type: 'positive',
      message: 'Datos recargados correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    console.error('Error al recargar:', error)
    Notify.create({
      type: 'negative',
      message: 'Error al recargar: ' + error.message,
      icon: 'error',
    })
  }
}

async function sincronizarDatos() {
  await recargarDatos()
}

async function actualizarCampo(campo, valor) {
  if (!conductorEditando.value?.id) return

  try {
    await actualizarConductor(conductorEditando.value.id, { [campo]: valor })

    Notify.create({
      type: 'positive',
      message: 'Campo actualizado correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar: ' + error.message,
      icon: 'error',
    })
  }
}

async function actualizarFechaVencimiento(fecha) {
  if (!conductorEditando.value?.id) return

  try {
    const [dia, mes, año] = fecha.split('/')
    const fechaDate = new Date(año, mes - 1, dia)

    await actualizarConductor(conductorEditando.value.id, {
      LicenciaConducirFecha: fechaDate,
    })

    conductorEditando.value.LicenciaConducirFecha = fechaDate

    Notify.create({
      type: 'positive',
      message: 'Fecha actualizada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar fecha: ' + error.message,
      icon: 'error',
    })
  }
}

async function asignarUnidadAConductor(unidadId) {
  if (!conductorEditando.value?.id) return

  try {
    await asignarUnidad(conductorEditando.value.id, unidadId)

    Notify.create({
      type: 'positive',
      message: 'Unidad asignada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al asignar unidad: ' + error.message,
      icon: 'error',
    })
  }
}

function verLicencia() {
  dialogVerLicencia.value = true
}

function abrirDialogNuevoGrupo() {
  modoEdicion.value = false
  nuevoGrupo.value = { Nombre: '', ConductoresIds: [] }
  conductoresSeleccionados.value = []
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

function abrirDialogNuevoConductor() {
  nuevoConductor.value = { Nombre: '', Telefono: '' }
  dialogNuevoConductor.value = true
}

async function crearNuevoConductor() {
  try {
    await agregarConductor({
      Nombre: nuevoConductor.value.Nombre,
      Telefono: nuevoConductor.value.Telefono,
      LicenciaConducirFoto: '',
      LicenciaConducirFecha: null,
    })

    Notify.create({
      type: 'positive',
      message: 'Conductor creado correctamente',
      icon: 'check_circle',
    })

    dialogNuevoConductor.value = false
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al crear conductor: ' + error.message,
      icon: 'error',
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
    if (modoEdicion.value && grupoMenu.value) {
      // Actualizar grupo existente
      await actualizarGrupo(grupoMenu.value.id, {
        Nombre: nuevoGrupo.value.Nombre,
        ConductoresIds: conductoresSeleccionados.value,
      })

      Notify.create({
        type: 'positive',
        message: 'Grupo actualizado correctamente',
        icon: 'check_circle',
      })
    } else {
      // Crear nuevo grupo
      await crearGrupo({
        Nombre: nuevoGrupo.value.Nombre,
        ConductoresIds: conductoresSeleccionados.value,
      })

      Notify.create({
        type: 'positive',
        message: 'Grupo creado correctamente',
        icon: 'check_circle',
      })
    }

    dialogNuevoGrupo.value = false
  } catch (error) {
    console.error('Error al guardar grupo:', error)
    Notify.create({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error',
    })
  }
}

function mostrarMenuGrupo(event, grupo) {
  menuGrupoTarget.value = event.target
  grupoMenu.value = grupo
  menuGrupoVisible.value = true
}

function mostrarMenuConductor(event, conductor) {
  menuConductorTarget.value = event.target
  conductorMenu.value = conductor
  menuConductorVisible.value = true
}

function editarGrupo() {
  modoEdicion.value = true
  nuevoGrupo.value = { Nombre: grupoMenu.value.Nombre }
  // Pre-seleccionar los conductores que ya están en el grupo
  conductoresSeleccionados.value = [...(grupoMenu.value.ConductoresIds || [])]
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

async function confirmarEliminarGrupo() {
  try {
    // Eliminar directamente sin confirmación
    await eliminarGrupo(grupoMenu.value.id)

    // Si estábamos viendo este grupo, cambiar a "todos"
    if (grupoSeleccionado.value === grupoMenu.value.id) {
      grupoSeleccionado.value = 'todos'
      todosConductores.value = false
    }

    Notify.create({
      type: 'positive',
      message: 'Grupo eliminado correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    console.error('Error al eliminar grupo:', error)
    Notify.create({
      type: 'negative',
      message: 'Error al eliminar: ' + error.message,
      icon: 'error',
    })
  }
}

function verDetalles() {
  seleccionarConductor(conductorMenu.value)
}

async function quitarDeGrupo() {
  if (grupoSeleccionado.value === 'todos') {
    Notify.create({
      type: 'warning',
      message: 'Selecciona un grupo primero',
      icon: 'warning',
    })
    return
  }

  try {
    await removerConductorDeGrupo(grupoSeleccionado.value, conductorMenu.value.id)

    Notify.create({
      type: 'positive',
      message: 'Conductor removido del grupo',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error',
    })
  }
}

// Lifecycle
onMounted(async () => {
  try {
    console.log('🔄 Iniciando carga de datos de Firebase...')

    // Cargar datos iniciales
    await Promise.all([obtenerConductores(), obtenerUnidades(), obtenerGruposConductores()])

    // Configurar listeners en tiempo real
    unsubscribeConductores = escucharConductores()
    unsubscribeGrupos = escucharGrupos()

    console.log('✅ Conectado a Firebase:', {
      conductores: conductores.value.length,
      unidades: unidades.value.length,
      grupos: gruposConductores.value.length,
    })
  } catch (error) {
    console.error('❌ Error al conectar con Firebase:', error)

    Notify.create({
      type: 'negative',
      message: 'Error al conectar con Firebase: ' + error.message,
      icon: 'error',
      timeout: 5000,
    })
  }
})

onUnmounted(() => {
  // Limpiar listeners de Firebase
  if (unsubscribeConductores) unsubscribeConductores()
  if (unsubscribeGrupos) unsubscribeGrupos()
})
</script>

<style scoped>

/* 🆕 EFECTO FLASH CUANDO SE SELECCIONA DESDE EL MAPA */
.flash-highlight {
  animation: flash 0.6s ease-out 3;
  position: relative;
  z-index: 100;
}

@keyframes flash {
  0% {
    background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%);
    transform: scale(1);
  }
  50% {
    background: linear-gradient(135deg, #ffd4c4 0%, #ffb8a0 100%);
    transform: scale(1.02);
    box-shadow: 0 8px 30px rgba(255, 107, 53, 0.4);
  }
  100% {
    background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%);
    transform: scale(1);
  }
}

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
