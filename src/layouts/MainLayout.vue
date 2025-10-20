<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-gradient">
      <q-toolbar class="toolbar-custom">
        <q-toolbar-title class="text-weight-bold">MJ GPS</q-toolbar-title>

        <!-- Búsqueda Mejorada -->
        <!-- Búsqueda Mejorada -->
        <div class="search-container">
          <q-input
            ref="searchInput"
            v-model="busqueda"
            outlined
            placeholder="Buscar dirección, vehículo, conductor..."
            class="search-input"
            bg-color="white"
            dense
            @keyup.enter="buscar"
            @focus="onFocus"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="grey-7" />
            </template>

            <template v-slot:append>
              <q-btn v-if="busqueda" flat dense round icon="close" @click="limpiarBusqueda" />
              <q-btn flat dense round icon="tune" @click="mostrarFiltros = !mostrarFiltros">
                <q-tooltip>Filtros</q-tooltip>
              </q-btn>
            </template>
          </q-input>

          <!-- Panel de Filtros -->
          <q-slide-transition>
            <div v-show="mostrarFiltros" class="filtros-panel">
              <q-chip
                v-for="filtro in filtrosDisponibles"
                :key="filtro.value"
                :outline="!filtrosActivos.includes(filtro.value)"
                :color="filtro.color"
                text-color="white"
                clickable
                @click="toggleFiltro(filtro.value)"
                size="sm"
              >
                <q-icon :name="filtro.icon" size="14px" class="q-mr-xs" />
                {{ filtro.label }}
              </q-chip>
            </div>
          </q-slide-transition>

          <!-- Sugerencias de búsqueda - SIN PARPADEO -->
          <div
            v-if="mostrarSugerencias"
            class="sugerencias-container"
            @mouseenter="dentroDelMenu = true"
            @mouseleave="dentroDelMenu = false"
          >
            <q-card class="sugerencias-card">
              <q-list style="max-height: 400px" class="scroll">
                <!-- Mientras escribe -->
                <div
                  v-if="busqueda && resultadosBusqueda.length === 0 && buscando"
                  class="q-pa-md text-center text-grey-6"
                >
                  <q-spinner color="primary" size="24px" />
                  <div class="q-mt-sm text-caption">Buscando...</div>
                </div>

                <!-- Sin resultados -->
                <div
                  v-else-if="busqueda && resultadosBusqueda.length === 0 && !buscando"
                  class="q-pa-md text-center text-grey-6"
                >
                  <q-icon name="search_off" size="48px" />
                  <div class="q-mt-sm">No se encontraron resultados</div>
                </div>

                <!-- Resultados agrupados por tipo -->
                <template v-else-if="resultadosBusqueda.length > 0">
                  <div v-for="(grupo, tipo) in resultadosAgrupados" :key="tipo">
                    <!-- Header del grupo -->
                    <q-item-label header class="text-weight-bold text-primary">
                      <q-icon :name="getIconoTipo(tipo)" size="18px" class="q-mr-xs" />
                      {{ getTituloTipo(tipo) }} ({{ grupo.length }})
                    </q-item-label>

                    <!-- Items del grupo -->
                    <!-- Items del grupo -->
                    <q-item
                      v-for="resultado in grupo"
                      :key="resultado.id"
                      clickable
                      v-ripple
                      @click="seleccionarResultado(resultado)"
                    >
                      <q-item-section avatar>
                        <q-avatar :color="getColorTipo(tipo)" text-color="white" size="40px">
                          <q-icon :name="getIconoTipo(tipo)" />
                        </q-avatar>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label class="text-black">{{ resultado.nombre }}</q-item-label>
                        <q-item-label caption class="text-grey-7">{{
                          resultado.detalle
                        }}</q-item-label>
                      </q-item-section>

                      <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                      </q-item-section>
                    </q-item>

                    <q-separator v-if="Object.keys(resultadosAgrupados).length > 1" />
                  </div>
                </template>

                <!-- Búsquedas recientes (cuando no hay texto) -->
                <template v-else-if="!busqueda && busquedasRecientes.length > 0">
                  <q-item-label header>
                    <q-icon name="history" class="q-mr-xs" />
                    Búsquedas recientes
                  </q-item-label>
                  <q-item
                    v-for="(reciente, index) in busquedasRecientes"
                    :key="index"
                    clickable
                    v-ripple
                    @click="seleccionarBusquedaReciente(reciente)"
                  >
                    <q-item-section avatar>
                      <q-icon name="history" color="grey-6" />
                    </q-item-section>
                    <q-item-section>{{ reciente }}</q-item-section>
                    <q-item-section side>
                      <q-btn
                        flat
                        dense
                        round
                        icon="close"
                        size="sm"
                        @click.stop="eliminarReciente(index)"
                      />
                    </q-item-section>
                  </q-item>
                </template>
              </q-list>
            </q-card>
          </div>
        </div>

        <q-space />

        <!-- BOTÓN DE INFORMACIÓN CON CLASE ESPECÍFICA -->
        <q-btn flat dense round icon="info" class="info-btn q-mr-sm" size="md">
          <q-tooltip>Información</q-tooltip>

          <q-menu
            anchor="bottom middle"
            self="top middle"
            :offset="[0, 8]"
            transition-show="jump-down"
            transition-hide="jump-up"
          >
            <q-card style="width: 300px">
              <q-card-section
                style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
                class="text-white"
              >
                <div class="text-h6 text-weight-bold">MJ GPS</div>
                <div class="text-caption">Sistema de rastreo de flotas</div>
              </q-card-section>

              <q-separator />

              <q-card-section>
                <div class="q-mb-sm">
                  <q-icon name="info" size="20px" class="q-mr-sm" style="color: #bb0000" />
                  <strong>Versión:</strong> 1.0.0
                </div>
                <div class="q-mb-sm">
                  <q-icon name="code" size="20px" class="q-mr-sm" style="color: #bb0000" />
                  <strong>Quasar:</strong> v{{ $q.version }}
                </div>
                <div class="q-mb-sm">
                  <q-icon name="business" size="20px" class="q-mr-sm" style="color: #bb0000" />
                  <strong>Empresa:</strong> MJ Industrias
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions class="q-px-md q-pb-md">
                <q-btn flat label="Tutorial" style="color: #bb0000" v-close-popup />
                <q-space />
                <q-btn flat label="Cerrar" style="color: #bb0000" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-menu>
        </q-btn>

        <!-- BOTÓN DE NOTIFICACIONES CON CLASE ESPECÍFICA -->
        <q-btn
          flat
          dense
          round
          icon="notifications"
          class="notif-btn q-mr-sm"
          ref="notifBtn"
          size="md"
        >
          <q-badge color="red" floating v-if="notificacionesCount > 0">
            {{ notificacionesCount }}
          </q-badge>
          <q-tooltip>Notificaciones</q-tooltip>

          <q-menu anchor="bottom middle" self="top middle" :offset="[0, 8]">
            <NotificacionesPanel />
          </q-menu>
        </q-btn>

        <q-chip outline color="white" text-color="white" icon="bug_report">
          Quasar v{{ $q.version }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <!-- Mini Drawer que se expande al hover -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :mini="!drawerExpanded || dialogAbierto"
      @mouseenter="onDrawerMouseEnter"
      @mouseleave="onDrawerMouseLeave"
      bordered
      :width="350"
      :mini-width="70"
      class="drawer-custom"
      :overlay="drawerExpanded && !dialogAbierto"
      elevated
      mini-to-overlay
    >
      <!-- Header del drawer -->
      <div class="drawer-header" :class="{ 'mini-header': !drawerExpanded || dialogAbierto }">
        <q-avatar :size="drawerExpanded && !dialogAbierto ? '100px' : '40px'" class="q-mb-md">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gpsmjindust.firebasestorage.app/o/iconos%2FLogoGPS.png?alt=media&token=4e08d6e6-40ee-481b-9757-a9b58febc42a"
            alt="Logo"
          />
        </q-avatar>
        <div v-if="drawerExpanded && !dialogAbierto" class="text-h6 text-weight-bold">
          Ubicacion de flotas
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Lista de navegación -->
      <q-list padding>
        <template v-for="link in linksList" :key="link.title">
          <!-- Link externo -->
          <q-item
            v-if="link.external"
            clickable
            :href="link.link"
            target="_blank"
            v-ripple
            class="nav-item"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" size="24px" />
            </q-item-section>

            <q-item-section v-if="drawerExpanded && !dialogAbierto">
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>

            <q-item-section side v-if="drawerExpanded && !dialogAbierto">
              <q-icon name="open_in_new" size="xs" />
            </q-item-section>

            <!-- Tooltip cuando está minimizado -->
            <q-tooltip
              v-if="!drawerExpanded || dialogAbierto"
              anchor="center right"
              self="center left"
              :offset="[10, 0]"
            >
              {{ link.title }}
            </q-tooltip>
          </q-item>

          <!-- Link interno o acción -->
          <q-item
            v-else
            clickable
            :to="link.action ? undefined : link.link"
            @click="handleLinkClick(link)"
            v-ripple
            class="nav-item"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" size="24px" />
            </q-item-section>

            <q-item-section v-if="drawerExpanded && !dialogAbierto">
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>

            <!-- Tooltip cuando está minimizado -->
            <q-tooltip
              v-if="!drawerExpanded || dialogAbierto"
              anchor="center right"
              self="center left"
              :offset="[10, 0]"
            >
              {{ link.title }}
            </q-tooltip>
          </q-item>
        </template>
      </q-list>

      <!-- Botón de configuración en la parte inferior -->
      <div class="absolute-bottom q-pa-md bg-white">
        <q-separator class="q-mb-md" />
        <q-item clickable v-ripple class="config-item">
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="grey-8" size="40px">
              <q-icon name="settings" />
            </q-avatar>
          </q-item-section>

          <q-item-section v-if="drawerExpanded && !dialogAbierto">
            <q-item-label class="text-weight-medium">Configuración</q-item-label>
            <q-item-label caption class="text-grey-7">Ajustes del sistema</q-item-label>
          </q-item-section>

          <q-item-section side v-if="drawerExpanded && !dialogAbierto">
            <q-icon name="expand_less" color="grey-5" />
          </q-item-section>

          <!-- Tooltip cuando está minimizado -->
          <q-tooltip
            v-if="!drawerExpanded || dialogAbierto"
            anchor="center right"
            self="center left"
            :offset="[10, 0]"
          >
            Configuración
          </q-tooltip>

          <!-- Menu de configuración -->
          <q-menu
            anchor="top left"
            self="bottom left"
            :offset="[0, 10]"
            transition-show="jump-up"
            transition-hide="jump-down"
          >
            <q-card style="width: 300px; max-width: 90vw" class="rounded-borders">
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6 text-weight-bold">Configuración</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>

              <q-separator class="q-my-sm" />

              <q-list dense>
                <q-separator class="q-my-sm" />

                <q-item clickable v-ripple @click="cerrarSesionDesdeConfig" v-close-popup>
                  <q-item-section avatar>
                    <q-avatar color="negative" text-color="white" size="sm">
                      <q-icon name="logout" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Cerrar Sesión</q-item-label>
                    <q-item-label class="q-pb-md" caption>Salir de tu cuenta</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item clickable>
                  <q-item-section avatar>
                    <q-avatar color="negative" text-color="white" size="sm">
                      <q-icon name="directions_car" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Estado de la Unidad</q-item-label>
                    <q-item-label class="q-pb-md" caption>Seleccionar Unidad</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </q-menu>
        </q-item>
      </div>
    </q-drawer>

    <!-- DIALOGS PARA COMPONENTES - SOLUCIÓN DEFINITIVA -->
    <!-- Dialog Estado de la Flota -->
    <q-dialog
      v-model="estadoFlotaDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <EstadoFlota @close="cerrarEstadoFlota" />
      </q-card>
    </q-dialog>

    <!-- Dialog EstadoFlota -->
    <q-dialog
      v-model="estadoFlotaDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <EstadoFlota @close="cerrarEstadoFlota" />
      </q-card>
    </q-dialog>

    <!-- Dialog Conductores -->
    <q-dialog
      v-model="conductoresDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <Conductores @close="cerrarConductores" />
      </q-card>
    </q-dialog>

    <!-- Dialog Geozonas -->
    <q-dialog
      v-model="geozonaDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <GeoZonas @close="cerrarGeozonas" />
      </q-card>
    </q-dialog>

    <!-- Dialog Eventos -->
    <q-dialog
      v-model="eventosDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <Eventos @close="cerrarEventos" />
      </q-card>
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { signOut } from 'firebase/auth'
import { useNotifications } from 'src/composables/useNotifications.js'
import EstadoFlota from 'src/components/EstadoFlota.vue'
import Conductores from 'src/components/Conductores.vue'

import GeoZonas from 'src/components/GeoZonas.vue'
import Eventos from 'src/components/Eventos.vue'
import NotificacionesPanel from 'src/components/NotificacionesPanel.vue'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'

const router = useRouter()
const $q = useQuasar()
const { estadoCompartido } = useEventBus()

// ✅ LÍNEA DE SEGURIDAD - ASEGURA QUE EL ESTADO EXISTA
if (!estadoCompartido.value) {
  console.error('❌ Error crítico: estadoCompartido.value no está definido en MainLayout')
}

// NOTIFICACIONES
const { notifications } = useNotifications()
const notificacionesCount = computed(() => notifications.value.length)

// Control de dialogs abiertos
const dialogAbierto = ref(false)

const busqueda = ref('')
const mostrarSugerencias = ref(false)
const mostrarFiltros = ref(false)
const buscando = ref(false)
const resultadosBusqueda = ref([])
const busquedasRecientes = ref([])
const filtrosActivos = ref(['direccion', 'vehiculo', 'conductor', 'poi', 'geozona'])
const searchInput = ref(null)

//conductores
const { gruposConductores, obtenerConductores, obtenerGruposConductores, conductoresPorGrupo } =
  useConductoresFirebase()

const conductoresCargados = ref(false)

// Función para cargar datos de conductores si no están cargados
const cargarDatosConductores = async () => {
  if (!conductoresCargados.value) {
    try {
      await Promise.all([obtenerConductores(), obtenerGruposConductores()])
      conductoresCargados.value = true
      console.log('✅ Datos de conductores cargados para búsqueda')
    } catch (error) {
      console.error('❌ Error al cargar datos de conductores:', error)
    }
  }
}

const filtrosDisponibles = [
  { label: 'Direcciones', value: 'direccion', icon: 'place', color: 'blue' },
  { label: 'Vehículos', value: 'vehiculo', icon: 'directions_car', color: 'green' },
  { label: 'Conductores', value: 'conductor', icon: 'person', color: 'orange' },
  { label: 'POIs', value: 'poi', icon: 'location_on', color: 'red' },
  { label: 'Geozonas', value: 'geozona', icon: 'layers', color: 'purple' },
]

// Agrupar resultados por tipo
const resultadosAgrupados = computed(() => {
  const grupos = {}
  resultadosBusqueda.value.forEach((resultado) => {
    if (!grupos[resultado.tipo]) {
      grupos[resultado.tipo] = []
    }
    grupos[resultado.tipo].push(resultado)
  })
  return grupos
})

// ⚡ WATCH OPTIMIZADO - CORREGIDO PARA EVITAR PARPADEO
let timeoutBusqueda = null

watch(busqueda, (newVal) => {
  // Limpiar timeout anterior
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }

  // Si está vacío, limpiar resultados pero MANTENER sugerencias abiertas
  if (!newVal || newVal.trim() === '') {
    resultadosBusqueda.value = []
    buscando.value = false
    // NO cerrar mostrarSugerencias aquí
    return
  }

  // Para texto corto (menos de 3 caracteres), NO buscar pero tampoco cerrar
  if (newVal.length < 3) {
    resultadosBusqueda.value = []
    buscando.value = false
    return
  }

  // Mostrar indicador de búsqueda inmediatamente
  buscando.value = true

  // Debounce para búsqueda
  timeoutBusqueda = setTimeout(() => {
    realizarBusqueda(newVal)
  }, 300) // Reducido a 300ms
})

// ✅ BLOQUE CORRECTO
watch(
  () => estadoCompartido.value.abrirGeozonasConPOI,
  (newValue) => {
    if (newValue && newValue.item) {
      console.log('🚀 MainLayout: Detectado cambio en estadoCompartido, abriendo GeoZonas')
      console.log('✅ Abriendo GeoZonas con item:', newValue.item)
      cerrarTodosLosDialogs()
      setTimeout(() => {
        geozonaDrawerOpen.value = true
      }, 100)
    }
  }
)

// 🔍 FUNCIÓN DE BÚSQUEDA CORREGIDA
async function realizarBusqueda(termino) {
  console.log('🔍 INICIANDO BÚSQUEDA')
  console.log('  - Término:', termino)
  console.log('  - Filtros activos:', filtrosActivos.value)
  console.log('  - ¿Incluye direccion?:', filtrosActivos.value.includes('direccion'))

  // Verificar que el término sigue siendo el actual
  if (busqueda.value !== termino) {
    buscando.value = false
    return
  }

  const promesas = []

  // Solo buscar en los filtros activos
  if (filtrosActivos.value.includes('direccion')) {
    console.log('  ✅ Agregando búsqueda de direcciones')
    promesas.push(buscarDirecciones(termino))
  } else {
    console.log('  ❌ NO buscando direcciones')
  }
  if (filtrosActivos.value.includes('vehiculo')) {
    console.log('  ✅ Agregando búsqueda de vehículos')
    promesas.push(buscarVehiculos(termino))
  } else {
    console.log('  ❌ NO buscando vehículos')
  }
  if (filtrosActivos.value.includes('conductor')) {
    console.log('  ✅ Agregando búsqueda de conductores')
    promesas.push(buscarConductores(termino))
  } else {
    console.log('  ❌ NO buscando conductores')
  }
  if (filtrosActivos.value.includes('poi')) {
    promesas.push(buscarPOIs(termino))
  }
  if (filtrosActivos.value.includes('geozona')) {
    promesas.push(buscarGeozonas(termino))
  }

  try {
    const resultadosArray = await Promise.all(promesas)

    // Verificar nuevamente que el término sigue siendo el actual
    if (busqueda.value !== termino) {
      return
    }

    const resultados = resultadosArray.flat().filter((r) => r !== null && r !== undefined)

    resultadosBusqueda.value = resultados
    console.log('✅ Resultados encontrados:', resultados.length)
  } catch (error) {
    console.error('❌ Error en búsqueda:', error)
    resultadosBusqueda.value = []
  } finally {
    buscando.value = false
  }
}

// 📍 BÚSQUEDA DE DIRECCIONES - CORREGIDA
async function buscarDirecciones(termino) {
  try {
    console.log('🔍 Buscando direcciones para:', termino)

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termino)}&limit=5&countrycodes=mx`,
      {
        headers: {
          'User-Agent': 'MJ GPS App/1.0',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Error en la respuesta de Nominatim')
    }

    const data = await response.json()
    console.log('📍 Direcciones encontradas:', data.length)

    return data.map((lugar) => ({
      id: `dir-${lugar.place_id}`,
      tipo: 'direccion',
      nombre: lugar.display_name.split(',')[0],
      detalle: lugar.display_name,
      lat: parseFloat(lugar.lat),
      lng: parseFloat(lugar.lon),
    }))
  } catch (error) {
    console.error('❌ Error buscando direcciones:', error)
    return []
  }
}

// 🚗 BÚSQUEDA DE VEHÍCULOS - Placeholder
async function buscarVehiculos(termino) {
  console.log('🚗 Buscando vehículos para:', termino)
  // TODO: Implementar cuando tengas vehículos en Firebase
  return []
}

// 👤 BÚSQUEDA DE CONDUCTORES - IMPLEMENTACIÓN
async function buscarConductores(termino) {
  try {
    console.log('👤 Buscando conductores para:', termino)

    // Asegurarnos de que los datos estén cargados
    await cargarDatosConductores()

    const resultados = []
    const terminoLower = termino.toLowerCase()

    // Buscar en todos los grupos
    for (const grupo of gruposConductores.value) {
      const conductoresDelGrupo = conductoresPorGrupo(grupo.id) || []

      for (const conductor of conductoresDelGrupo) {
        if (
          conductor.Nombre?.toLowerCase().includes(terminoLower) ||
          conductor.Telefono?.toLowerCase().includes(terminoLower)
        ) {
          resultados.push({
            id: `conductor-${conductor.id}`,
            tipo: 'conductor',
            nombre: conductor.Nombre,
            detalle: `${grupo.Nombre} - ${conductor.Telefono || 'Sin teléfono'}`,
            conductorId: conductor.id,
            grupoId: grupo.id,
            grupoNombre: grupo.Nombre,
          })
        }
      }
    }

    console.log('👤 Conductores encontrados:', resultados.length)
    return resultados
  } catch (error) {
    console.error('❌ Error buscando conductores:', error)
    return []
  }
}

// 📌 BÚSQUEDA DE POIs - Placeholder
async function buscarPOIs(termino) {
  console.log('📌 Buscando POIs para:', termino)
  // TODO: Implementar cuando tengas POIs en Firebase
  return []
}

// 🗺️ BÚSQUEDA DE GEOZONAS - Placeholder
async function buscarGeozonas(termino) {
  console.log('🗺️ Buscando geozonas para:', termino)
  // TODO: Implementar cuando tengas geozonas en Firebase
  return []
}

// 🔧 FUNCIONES DE EVENTOS
const dentroDelMenu = ref(false)

// Reemplazar las funciones de eventos
function onFocus() {
  mostrarSugerencias.value = true
}

function limpiarBusqueda() {
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }
  busqueda.value = ''
  resultadosBusqueda.value = []
  mostrarSugerencias.value = false
  buscando.value = false
  console.log('🧹 Búsqueda limpiada')
}

function seleccionarBusquedaReciente(reciente) {
  busqueda.value = reciente
  mostrarSugerencias.value = true
  if (reciente.length >= 3) {
    realizarBusqueda(reciente)
  }
}

function toggleFiltro(filtro) {
  const estaActivo = filtrosActivos.value.includes(filtro)

  if (estaActivo && filtrosActivos.value.length === 1) {
    // Si es el único activo, no hacer nada
    console.log('⚠️ Este filtro ya es el único activo')
    return
  }

  // Activar solo este filtro
  filtrosActivos.value = [filtro]
  console.log(`🎯 Solo filtro "${filtro}" activo`)
  console.log('🎛️ Filtros activos:', [...filtrosActivos.value])

  // Re-buscar si hay texto
  if (busqueda.value && busqueda.value.length >= 3) {
    resultadosBusqueda.value = []
    buscando.value = true
    realizarBusqueda(busqueda.value)
  }
}
function centrarMapaEn(lat, lng, zoom = 18) {
  console.log('🎯 Intentando centrar mapa en:', { lat, lng, zoom })

  // Función para verificar y esperar por el mapa
  const esperarMapa = (intentos = 0) => {
    // Verificar si window.mapaGlobal existe y tiene el mapa
    if (window.mapaGlobal && window.mapaGlobal.map && window.L) {
      console.log('✅ Mapa disponible, centrando...')
      ejecutarCentrado(lat, lng, zoom)
      return true
    } else if (intentos < 10) {
      // Máximo 10 intentos (5 segundos)
      console.log(`⏳ Esperando mapa... intento ${intentos + 1}`)
      setTimeout(() => esperarMapa(intentos + 1), 500)
    } else {
      console.error('❌ Timeout: Mapa no disponible después de 5 segundos')
      $q.notify({
        message: 'El mapa no está disponible. Recarga la página e intenta nuevamente.',
        color: 'negative',
        icon: 'error',
        position: 'top',
        timeout: 5000,
      })
      return false
    }
  }

  return esperarMapa()
}

// En MainLayout.vue

let busquedaEnProgreso = ref(false)

function ejecutarCentrado(lat, lng, zoom) {
  try {
    const map = window.mapaGlobal.map
    if (!map) {
      console.error('❌ Mapa no disponible')
      return
    }

    // Si ya hay una búsqueda en progreso, la ignoramos para evitar solapamientos
    if (busquedaEnProgreso.value) {
      console.log('⏳ Búsqueda ya en progreso, ignorando...')
      return
    }

    busquedaEnProgreso.value = true

    // Mover el mapa de forma instantánea
    map.setView([lat, lng], zoom, {
      animate: false,
      duration: 0,
    })
    console.log('✅ setView ejecutado sin animación')

    // Actualizar o crear el marcador
    actualizarMarcadorBusqueda(lat, lng)

    // Marcar que la búsqueda ha terminado
    setTimeout(() => {
      busquedaEnProgreso.value = false
    }, 300) // Un pequeño retraso para evitar clics múltiples
  } catch (error) {
    console.error('❌ Error al centrar mapa:', error)
    $q.notify({
      message: `Error: ${error.message}`,
      color: 'negative',
      icon: 'error',
      position: 'top',
    })
    busquedaEnProgreso.value = false
  }
}

function actualizarMarcadorBusqueda(lat, lng) {
  if (!window.mapaGlobal || !window.mapaGlobal.map || !window.L) {
    console.warn('⚠️ Mapa no disponible para actualizar marcador')
    return
  }

  const map = window.mapaGlobal.map
  const L = window.L

  try {
    // Si el marcador no existe, créalo
    if (!window.marcadorBusqueda) {
      window.marcadorBusqueda = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl:
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        riseOnHover: true,
      }).addTo(map)

      // Vincular el popup solo una vez
      window.marcadorBusqueda.bindPopup(`<b>📍 Ubicación buscada</b>`, {
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        closeOnEscapeKey: true,
        autoPan: true, // Permitir que el mapa se mueva para mostrar el popup
      })

      console.log('✅ Marcador creado y añadido al mapa')
    } else {
      // Si ya existe, solo actualiza su posición
      window.marcadorBusqueda.setLatLng([lat, lng])
      console.log('✅ Posición del marcador actualizada')
    }

    // Abrir popup
    window.marcadorBusqueda.openPopup()
  } catch (error) {
    console.error('❌ Error al actualizar marcador:', error)
  }
}

// Modificar la función seleccionarResultado para usar el nuevo sistema
function seleccionarResultado(resultado) {
  console.log('🎯 Resultado seleccionado:', resultado)

  // Guardar en búsquedas recientes
  if (busqueda.value && !busquedasRecientes.value.includes(busqueda.value)) {
    busquedasRecientes.value.unshift(busqueda.value)
    if (busquedasRecientes.value.length > 5) {
      busquedasRecientes.value.pop()
    }
  }

  // Cerrar sugerencias y limpiar
  mostrarSugerencias.value = false
  const resultadoTemp = { ...resultado }
  busqueda.value = ''
  resultadosBusqueda.value = []

  // Procesar el resultado
  procesarResultado(resultadoTemp)
}

function procesarResultado(resultado) {
  // Acción según el tipo
  if (resultado.tipo === 'direccion') {
    console.log('📍 Procesando dirección:', resultado.lat, resultado.lng)

    if (resultado.lat && resultado.lng) {
      centrarMapaEn(resultado.lat, resultado.lng)
      $q.notify({
        message: `📍 Mostrando: ${resultado.nombre}`,
        color: 'positive',
        icon: 'place',
        position: 'top',
        timeout: 3000,
      })
    } else {
      console.error('❌ Coordenadas inválidas:', resultado)
      $q.notify({
        message: 'Error: Ubicación sin coordenadas válidas',
        color: 'negative',
        icon: 'error',
        position: 'top',
      })
    }
  } else if (resultado.tipo === 'vehiculo') {
    console.log('🚗 Abriendo estado de flota')
    estadoFlotaDrawerOpen.value = true
    $q.notify({
      message: `🚗 Vehículo: ${resultado.nombre}`,
      color: 'positive',
      icon: 'directions_car',
      position: 'top',
    })
  } else if (resultado.tipo === 'conductor') {
  console.log('👤 Abriendo detalles del conductor:', resultado.conductorId)

    /// Abrir el drawer de conductores
  conductoresDrawerOpen.value = true

  // Guardar la información del conductor seleccionado usando el estado compartido
  estadoCompartido.value.abrirConductoresConConductor = {
    conductor: {
      id: resultado.conductorId,
      grupoId: resultado.grupoId,
    },
    timestamp: Date.now()
  }

    $q.notify({
      message: `👤 Conductor: ${resultado.nombre}`,
      color: 'positive',
      icon: 'person',
      position: 'top',
    })
  } else if (resultado.tipo === 'poi') {
    console.log('📌 Procesando POI')
    if (resultado.lat && resultado.lng) {
      centrarMapaEn(resultado.lat, resultado.lng)
    }
    geozonaDrawerOpen.value = true
    $q.notify({
      message: `📌 POI: ${resultado.nombre}`,
      color: 'positive',
      icon: 'location_on',
      position: 'top',
    })
  } else if (resultado.tipo === 'geozona') {
    console.log('🗺️ Abriendo geozonas')
    geozonaDrawerOpen.value = true
    $q.notify({
      message: `🗺️ Geozona: ${resultado.nombre}`,
      color: 'positive',
      icon: 'layers',
      position: 'top',
    })
  }
}

function eliminarReciente(index) {
  busquedasRecientes.value.splice(index, 1)
}

function buscar() {
  if (busqueda.value && busqueda.value.length >= 3) {
    realizarBusqueda(busqueda.value)
  }
}

// Helper functions sin cambios
function getIconoTipo(tipo) {
  const iconos = {
    direccion: 'place',
    vehiculo: 'directions_car',
    conductor: 'person',
    poi: 'location_on',
    geozona: 'layers',
  }
  return iconos[tipo] || 'search'
}

function getTituloTipo(tipo) {
  const titulos = {
    direccion: 'Direcciones',
    vehiculo: 'Vehículos',
    conductor: 'Conductores',
    poi: 'Puntos de Interés',
    geozona: 'Geozonas',
  }
  return titulos[tipo] || tipo
}

function getColorTipo(tipo) {
  const colores = {
    direccion: 'blue',
    vehiculo: 'green',
    conductor: 'orange',
    poi: 'red',
    geozona: 'purple',
  }
  return colores[tipo] || 'grey'
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (window.marcadorBusqueda && window.marcadorBusqueda.remove) {
    window.marcadorBusqueda.remove()
    window.marcadorBusqueda = null
    console.log('🗑️ Marcador de búsqueda eliminado al desmontar.')
  }
  document.removeEventListener('click', handleClickOutside)
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }
})
function handleClickOutside(event) {
  const searchContainer = document.querySelector('.search-container')
  const sugerenciasContainer = document.querySelector('.sugerencias-container')

  if (!searchContainer || !sugerenciasContainer) return

  // Si el clic fue fuera del contenedor de búsqueda y sugerencias
  if (!searchContainer.contains(event.target) && !sugerenciasContainer.contains(event.target)) {
    mostrarSugerencias.value = false
  }
}
function cerrarSesionDesdeConfig() {
  logout()
}

const linksList = [
  {
    title: 'Mapa',
    caption: 'Mapa',
    icon: 'map',
    link: '/dashboard',
  },
  {
    title: 'Estado de la flota',
    caption: 'Monitoreo en tiempo real',
    icon: 'directions_car',
    action: 'open-estado-flota',
  },
  {
    title: 'Conductores',
    caption: 'Gestión de conductores',
    icon: 'person',
    action: 'open-conductores',
  },
  {
    title: 'GeoZonas y Puntos de interés',
    caption: 'Ubicaciones importantes',
    icon: 'place',
    action: 'open-geozonas',
  },
  {
    title: 'Eventos',
    caption: 'Alertas y notificaciones',
    icon: 'notifications',
    action: 'open-eventos',
  },
  {
    title: 'Reportes',
    caption: 'Crear reporte',
    icon: 'description',
    link: '/reporte',
  },
]

const leftDrawerOpen = ref(true) // Siempre visible
const drawerExpanded = ref(false) // Controla la expansión al hover
const estadoFlotaDrawerOpen = ref(false)
const conductoresDrawerOpen = ref(false)
const geozonaDrawerOpen = ref(false)
const eventosDrawerOpen = ref(false)

// Watch para mantener el drawer abierto al cambiar de ruta
watch(
  [estadoFlotaDrawerOpen, conductoresDrawerOpen, geozonaDrawerOpen, eventosDrawerOpen],
  ([estado, conductores, geozona, eventos]) => {
    const algunDialogAbierto = estado || conductores || geozona || eventos
    dialogAbierto.value = algunDialogAbierto

    // Si algún dialog está abierto, forzar drawer mini
    if (algunDialogAbierto) {
      drawerExpanded.value = false
    }
  },
  { immediate: true }, // Agregar immediate
)

// Watch adicional por si algo intenta cerrarlo
watch(leftDrawerOpen, (newVal) => {
  if (!newVal) {
    leftDrawerOpen.value = true
  }
})

// Control de dialogs
watch(
  [estadoFlotaDrawerOpen, conductoresDrawerOpen, geozonaDrawerOpen, eventosDrawerOpen],
  ([estado, conductores, geozona, eventos]) => {
    dialogAbierto.value = estado || conductores || geozona || eventos
  },
)

function onDrawerMouseEnter() {
  // Verificar explícitamente cada dialog
  if (
    !estadoFlotaDrawerOpen.value &&
    !conductoresDrawerOpen.value &&
    !geozonaDrawerOpen.value &&
    !eventosDrawerOpen.value
  ) {
    drawerExpanded.value = true
  }
}

function onDrawerMouseLeave() {
  // Solo contraer si NO hay dialogs abiertos
  if (
    !estadoFlotaDrawerOpen.value &&
    !conductoresDrawerOpen.value &&
    !geozonaDrawerOpen.value &&
    !eventosDrawerOpen.value
  ) {
    drawerExpanded.value = false
  }
}

function onDialogShow() {
  dialogAbierto.value = true
  drawerExpanded.value = false // Ya lo tienes, bien!
}

function onDialogHide() {
  dialogAbierto.value = false
  drawerExpanded.value = false // Agregar esto para asegurar
}

function handleLinkClick(link) {
  if (link.action === 'logout') {
    logout()
  } else if (link.action === 'open-estado-flota') {
    cerrarTodosLosDialogs()
    estadoFlotaDrawerOpen.value = true
  } else if (link.action === 'open-conductores') {
    cerrarTodosLosDialogs()
    conductoresDrawerOpen.value = true
  } else if (link.action === 'open-geozonas') {
    cerrarTodosLosDialogs()
    geozonaDrawerOpen.value = true
  } else if (link.action === 'open-eventos') {
    cerrarTodosLosDialogs()
    eventosDrawerOpen.value = true
  }
}

// Nueva función para cerrar todos los dialogs
function cerrarTodosLosDialogs() {
  estadoFlotaDrawerOpen.value = false
  conductoresDrawerOpen.value = false
  geozonaDrawerOpen.value = false
  eventosDrawerOpen.value = false
}

function cerrarEstadoFlota() {
  estadoFlotaDrawerOpen.value = false
}

function cerrarConductores() {
  conductoresDrawerOpen.value = false
}

function cerrarGeozonas() {
  geozonaDrawerOpen.value = false
}

function cerrarEventos() {
  eventosDrawerOpen.value = false
}

const logout = async () => {
  try {
    await signOut(auth)

    $q.notify({
      type: 'positive',
      message: 'Sesión cerrada correctamente',
      icon: 'check_circle',
    })

    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)

    $q.notify({
      type: 'negative',
      message: 'Error al cerrar sesión',
      icon: 'error',
    })
  }
}
</script>

<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
}

.sugerencias-container {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  z-index: 9999;
}

.sugerencias-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.search-container {
  position: relative; /* Importante para el posicionamiento absoluto */
}

/* ESTILOS ESPECÍFICOS Y AISLADOS PARA LOS BOTONES DEL HEADER */
.info-btn,
.notif-btn {
  position: relative;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  margin: 0 4px;
  transform: none !important;
  transition: background-color 0.2s ease !important;
}

/* Resetear cualquier transformación heredada */
.info-btn:hover,
.notif-btn:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
  transform: none !important;
}

/* Asegurar que los iconos estén centrados y tengan tamaño consistente */
.info-btn .q-icon,
.notif-btn .q-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  margin: 0 auto;
}

/* Contener el área del badge */
.notif-btn :deep(.q-badge--floating) {
  top: 2px;
  right: 2px;
  transform: scale(0.8);
  pointer-events: none;
}

/* Drawer personalizado */
.drawer-custom {
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
  transition: width 0.3s ease;
}

.drawer-header {
  padding: 32px 24px 16px;
  text-align: center;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  border-radius: 0 0 24px 24px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.mini-header {
  padding: 16px 8px;
}

/* Estilos para los items de navegación */
.nav-item {
  border-radius: 12px;
  margin: 4px 8px;
  transition: all 0.3s ease;
}

.nav-item:hover {
  background-color: rgba(187, 0, 0, 0.1);
  transform: translateX(4px);
}

.config-item {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.config-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Animación solo para iconos del drawer */
.nav-item .q-icon,
.config-item .q-icon {
  transition: transform 0.3s ease;
}

.nav-item:hover .q-icon,
.config-item:hover .q-icon {
  transform: scale(1.1);
}

/* Resetear estilos para otros botones en el toolbar */
:deep(.q-toolbar .q-btn) {
  transform: none !important;
}

:deep(.q-toolbar .q-btn:hover) {
  transform: none !important;
}

.search-input {
  background: white;
  border-radius: 500px;
}

.search-container {
  width: 500px; /* <-- AQUÍ defines el ancho */
  max-width: 60vw; /* <-- Ancho máximo en pantallas pequeñas */
  margin-left: 24px;
  border-radius: 500px;
}

.q-page-container {
  overflow: hidden !important;
}

/* ESTILOS PARA LOS DIALOGS DE COMPONENTES */
.component-dialog {
  z-index: 3000 !important;
}

:deep(.component-dialog .q-dialog__inner) {
  align-items: stretch !important;
  padding: 0 !important;
  justify-content: flex-start !important;
}

:deep(.component-dialog .q-dialog__inner > div) {
  max-height: 100vh !important;
  height: 100vh !important;
  border-radius: 0 !important;
  max-width: none !important;
  margin: 0 !important;
}

/* NUEVO ESTILO PARA LAS TARJETAS DE COMPONENTES Ya de modifico */
.component-card {
  width: 350px;
  height: 100vh !important;
  border-radius: 0 !important;
  margin-left: 70px;
  margin-top: 26px !important;
  display: flex;
  flex-direction: column;
}

/* Asegurar que el componente ocupe todo el espacio disponible */
.component-card :deep(> *) {
  flex: 1;
  min-height: 0; /* Importante para flexbox en algunos navegadores */
}

/* Ajustar posición del dialog para que empiece justo debajo del header */
:deep(.component-dialog .q-dialog__inner) {
  padding-top: 76px !important; /* Altura aproximada del header */
}

:deep(.component-dialog .q-card) {
  margin-top: 0 !important;
}

/* Nuevos estilos para el buscador */
.filtros-panel {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  background: white;
  padding: 8px;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 1000;
}

.sugerencias-menu {
  z-index: 9999 !important;
}
</style>
