<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-gradient">
      <q-toolbar class="toolbar-custom">
        <q-toolbar-title class="text-weight-bold">MJ GPS</q-toolbar-title>

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
            @blur="() => setTimeout(() => (mostrarSugerencias = false), 200)"
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

          <!-- Sugerencias de búsqueda - OPTIMIZADO -->
          <q-menu
            v-model="mostrarSugerencias"
            fit
            :offset="[0, 8]"
            class="sugerencias-menu"
            persistent
          >
            <q-list style="min-width: 500px; max-height: 400px" class="scroll">
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
                      <q-item-label>{{ resultado.nombre }}</q-item-label>
                      <q-item-label caption>{{ resultado.detalle }}</q-item-label>
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
          </q-menu>
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
import { ref, computed, watch, onUnmounted } from 'vue'
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

const router = useRouter()
const $q = useQuasar()

// NOTIFICACIONES
const { notifications } = useNotifications()
const notificacionesCount = computed(() => notifications.value.length)

// Control de dialogs abiertos
const dialogAbierto = ref(false)

// ========== BUSCADOR OPTIMIZADO - CORREGIDO ==========
const busqueda = ref('')
const mostrarSugerencias = ref(false)
const mostrarFiltros = ref(false)
const buscando = ref(false)
const resultadosBusqueda = ref([])
const busquedasRecientes = ref([])
const filtrosActivos = ref(['direccion', 'vehiculo', 'conductor', 'poi', 'geozona'])
const searchInput = ref(null) // Referencia ya la tienes

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

// ⚡ WATCH OPTIMIZADO - SOLO UNO
let timeoutBusqueda = null

watch(busqueda, (newVal) => {
  // Limpiar timeout anterior
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }

  // Si está vacío, limpiar todo SIN TOCAR mostrarSugerencias
  if (!newVal) {
    resultadosBusqueda.value = []
    buscando.value = false
    // NO tocar mostrarSugerencias aquí
    return
  }

  // Para texto corto, mostrar recientes
  if (newVal.length < 3) {
    resultadosBusqueda.value = []
    buscando.value = false
    return
  }

  // Debounce para búsqueda
  timeoutBusqueda = setTimeout(() => {
    realizarBusqueda(newVal)
  }, 500) // Reducido a 500ms para mejor UX
})

// 🔍 FUNCIÓN DE BÚSQUEDA SIMPLIFICADA
async function realizarBusqueda(termino) {
  if (busqueda.value !== termino) return

  buscando.value = true
  const promesas = []

  if (filtrosActivos.value.includes('direccion')) {
    promesas.push(buscarDirecciones(termino))
  }
  if (filtrosActivos.value.includes('vehiculo')) {
    promesas.push(buscarVehiculos(termino))
  }
  if (filtrosActivos.value.includes('conductor')) {
    promesas.push(buscarConductores(termino))
  }
  if (filtrosActivos.value.includes('poi')) {
    promesas.push(buscarPOIs())
  }
  if (filtrosActivos.value.includes('geozona')) {
    promesas.push(buscarGeozonas())
  }

  try {
    const resultadosArray = await Promise.all(promesas)

    if (busqueda.value !== termino) return

    const resultados = resultadosArray.flat().filter((r) => r !== undefined)

    resultadosBusqueda.value = resultados
  } catch (error) {
    console.error('Error en búsqueda:', error)
    resultadosBusqueda.value = []
  } finally {
    buscando.value = false
  }
}

// 📍 BÚSQUEDA DE DIRECCIONES
async function buscarDirecciones(termino) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termino)}&limit=5&countrycodes=mx`,
      {
        headers: {
          'User-Agent': 'MJ GPS App/1.0',
        },
      },
    )

    if (!response.ok) throw new Error('Error en la respuesta')
    const data = await response.json()

    return data.map((lugar) => ({
      id: `dir-${lugar.place_id}`,
      tipo: 'direccion',
      nombre: lugar.display_name.split(',')[0],
      detalle: lugar.display_name,
      lat: parseFloat(lugar.lat),
      lng: parseFloat(lugar.lon),
    }))
  } catch (error) {
    console.error('Error buscando direcciones:', error)
    return []
  }
}
async function buscarVehiculos() {
  // TODO: Implementar cuando tengas vehículos en Firebase
  console.log('Búsqueda de vehículos pendiente de implementar')
  return []
}

// 👤 BÚSQUEDA DE CONDUCTORES - Placeholder
async function buscarConductores() {
  // TODO: Implementar cuando tengas conductores en Firebase
  console.log('Búsqueda de conductores pendiente de implementar')
  return []
}

// 📌 BÚSQUEDA DE POIs - Placeholder
async function buscarPOIs() {
  // TODO: Implementar cuando tengas POIs en Firebase
  console.log('Búsqueda de POIs pendiente de implementar')
  return []
}

// 🗺️ BÚSQUEDA DE GEOZONAS - Placeholder
async function buscarGeozonas() {
  // TODO: Implementar cuando tengas geozonas en Firebase
  console.log('Búsqueda de geozonas pendiente de implementar')
  return []
}
// 🔧 FUNCIONES DE EVENTOS - SIMPLIFICADAS
function onFocus() {
  mostrarSugerencias.value = true
}

// ❌ ELIMINAR onBusquedaChange completamente - causa el bug

function limpiarBusqueda() {
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }
  busqueda.value = ''
  resultadosBusqueda.value = []
  mostrarSugerencias.value = false
  buscando.value = false
}

function seleccionarBusquedaReciente(reciente) {
  busqueda.value = reciente
  mostrarSugerencias.value = true
  if (reciente.length >= 3) {
    realizarBusqueda(reciente)
  }
}

function toggleFiltro(filtro) {
  const index = filtrosActivos.value.indexOf(filtro)
  if (index > -1) {
    filtrosActivos.value.splice(index, 1)
  } else {
    filtrosActivos.value.push(filtro)
  }

  if (busqueda.value && busqueda.value.length >= 3) {
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

function ejecutarCentrado(lat, lng, zoom) {
  try {
    // Acceder al mapa a través de la API
    const map = window.mapaGlobal.map

    console.log('🗺️ Mapa encontrado:', map)
    console.log('📌 Métodos disponibles:', {
      flyTo: typeof map.flyTo,
      setView: typeof map.setView,
      panTo: typeof map.panTo,
    })

    // Verificar métodos disponibles
    if (map.flyTo && typeof map.flyTo === 'function') {
      map.flyTo([lat, lng], zoom, {
        duration: 2,
        easeLinearity: 0.25,
      })
      console.log('✅ flyTo ejecutado')
    } else if (map.setView && typeof map.setView === 'function') {
      map.setView([lat, lng], zoom, {
        animate: true,
        duration: 1,
      })
      console.log('✅ setView ejecutado')
    } else {
      console.warn('⚠️ Usando panTo como fallback')
      map.panTo([lat, lng], { duration: 1 })
      map.setZoom(zoom)
    }

    // Agregar marcador después de mover el mapa
    setTimeout(() => {
      agregarMarcadorBusqueda(lat, lng)
    }, 1000)
  } catch (error) {
    console.error('❌ Error al centrar mapa:', error)
    $q.notify({
      message: `Error: ${error.message}`,
      color: 'negative',
      icon: 'error',
      position: 'top',
    })
  }
}
function agregarMarcadorBusqueda(lat, lng) {
  if (!window.mapaGlobal || !window.mapaGlobal.map || !window.L) {
    console.warn('⚠️ Mapa no disponible para agregar marcador')
    return
  }

  const map = window.mapaGlobal.map
  const L = window.L

  // Remover marcador anterior
  if (window.marcadorBusqueda && map.hasLayer(window.marcadorBusqueda)) {
    map.removeLayer(window.marcadorBusqueda)
  }

  // Crear nuevo marcador
  try {
    window.marcadorBusqueda = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(map)

    // Agregar popup
    window.marcadorBusqueda
      .bindPopup(`<b>📍 ${busqueda.value || 'Ubicación buscada'}</b>`)
      .openPopup()

    console.log('✅ Marcador agregado')

    // Remover después de 10 segundos
    setTimeout(() => {
      if (window.marcadorBusqueda && map.hasLayer(window.marcadorBusqueda)) {
        map.removeLayer(window.marcadorBusqueda)
        window.marcadorBusqueda = null
      }
    }, 10000)
  } catch (error) {
    console.error('❌ Error agregando marcador:', error)
  }
}
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

  // Acción según el tipo
  if (resultadoTemp.tipo === 'direccion') {
    console.log('📍 Procesando dirección:', resultadoTemp.lat, resultadoTemp.lng)

    // Verificar que tenemos coordenadas válidas
    if (resultadoTemp.lat && resultadoTemp.lng) {
      centrarMapaEn(resultadoTemp.lat, resultadoTemp.lng)

      $q.notify({
        message: `📍 Mostrando: ${resultadoTemp.nombre}`,
        color: 'positive',
        icon: 'place',
        position: 'top',
        timeout: 3000,
      })
    } else {
      console.error('❌ Coordenadas inválidas:', resultadoTemp)
      $q.notify({
        message: 'Error: Ubicación sin coordenadas válidas',
        color: 'negative',
        icon: 'error',
        position: 'top',
      })
    }
  } else if (resultadoTemp.tipo === 'vehiculo') {
    console.log('🚗 Abriendo estado de flota')
    estadoFlotaDrawerOpen.value = true
    $q.notify({
      message: `🚗 Vehículo: ${resultadoTemp.nombre}`,
      color: 'positive',
      icon: 'directions_car',
      position: 'top',
    })
  } else if (resultadoTemp.tipo === 'conductor') {
    console.log('👤 Abriendo conductores')
    conductoresDrawerOpen.value = true
    $q.notify({
      message: `👤 Conductor: ${resultadoTemp.nombre}`,
      color: 'positive',
      icon: 'person',
      position: 'top',
    })
  } else if (resultadoTemp.tipo === 'poi') {
    console.log('📌 Procesando POI')
    // Si el POI tiene coordenadas, centrar mapa
    if (resultadoTemp.lat && resultadoTemp.lng) {
      centrarMapaEn(resultadoTemp.lat, resultadoTemp.lng)
    }
    geozonaDrawerOpen.value = true
    $q.notify({
      message: `📌 POI: ${resultadoTemp.nombre}`,
      color: 'positive',
      icon: 'location_on',
      position: 'top',
    })
  } else if (resultadoTemp.tipo === 'geozona') {
    console.log('🗺️ Abriendo geozonas')
    geozonaDrawerOpen.value = true
    $q.notify({
      message: `🗺️ Geozona: ${resultadoTemp.nombre}`,
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

onUnmounted(() => {
  if (timeoutBusqueda) {
    clearTimeout(timeoutBusqueda)
  }
})

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
