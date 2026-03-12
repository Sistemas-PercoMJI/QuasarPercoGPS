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
            placeholder="Buscar dirección, conductor..."
            class="search-input"
            bg-color="white"
            dense
            @keyup.enter="buscar"
            @focus="onFocus"
            style="box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="grey-7" />
            </template>

            <template v-slot:append>
              <q-btn v-if="busqueda" flat dense round icon="close" @click="limpiarBusqueda" />
              <q-btn
                flat
                dense
                round
                icon="tune"
                @click="mostrarFiltros = !mostrarFiltros"
                id="filtros-panel"
              >
                <q-tooltip>Filtros</q-tooltip>
              </q-btn>
            </template>
          </q-input>

          <!-- Panel de Filtros -->

          <div class="filtros-panel" :class="{ 'filtros-panel-visible': mostrarFiltros }">
            <q-chip
              v-for="filtro in filtrosDisponibles"
              :key="filtro.value"
              :outline="!filtrosActivos.includes(filtro.value)"
              :color="filtro.color"
              text-color="white"
              clickable
              @click="toggleFiltro(filtro.value)"
              size="12px"
            >
              <q-icon :name="filtro.icon" size="14px" class="q-mr-xs" />
              {{ filtro.label }}
            </q-chip>
          </div>

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
                  <q-separator></q-separator>
                  <q-item
                    class="text-grey"
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

        <!-- BOTÓN DE INFORMACIÓN - CORREGIDO -->
        <q-btn flat dense round icon="info" class="info-btn q-mr-sm" size="md">
          <q-tooltip>Información</q-tooltip>

          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
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
                  <q-icon
                    name="account_circle"
                    size="20px"
                    class="q-mr-sm"
                    style="color: #bb0000"
                  />
                  <strong>Cuenta:</strong> {{ usuarioActual }}
                </div>
                <div class="q-mb-sm">
                  <q-icon name="business" size="20px" class="q-mr-sm" style="color: #bb0000" />
                  <strong>Empresa:</strong>
                  <span v-if="Array.isArray(idEmpresaActual) && idEmpresaActual.length > 1">
                    {{ idEmpresaActual.join(' / ') }}
                  </span>
                  <span v-else>
                    {{
                      Array.isArray(idEmpresaActual)
                        ? idEmpresaActual[0]
                        : idEmpresaActual || 'MJ Industrial'
                    }}
                  </span>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions class="q-px-md q-pb-md">
                <q-btn
                  flat
                  label="Tutorial"
                  style="color: #bb0000"
                  @click="iniciarTutorial"
                  v-close-popup
                  icon="school"
                >
                  <q-tooltip>Iniciar tutorial guiado</q-tooltip>
                </q-btn>
                <q-space />
                <q-btn flat label="Cerrar" style="color: #bb0000" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-menu>
        </q-btn>

        <!-- BOTÓN DE NOTIFICACIONES - CORREGIDO -->
        <q-btn flat dense round icon="notifications" class="notif-btn q-mr-sm" size="md">
          <q-badge color="red" floating v-if="totalNoLeidas > 0">
            {{ totalNoLeidas }}
          </q-badge>
          <q-tooltip>Notificaciones</q-tooltip>

          <q-menu
            anchor="bottom right"
            self="top right"
            :offset="[0, 8]"
            content-class="no-scroll"
            max-height="500px"
          >
            <NotificacionesPanel />
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Mini Drawer que se expande al hover -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :mini="!drawerExpanded || dialogAbierto"
      @mouseenter="onDrawerMouseEnter"
      @mouseleave="onDrawerMouseLeave"
      :width="350"
      :mini-width="70"
      class="drawer-custom"
      elevated
      mini-to-overlay
    >
      <!-- Header del drawer -->
      <div class="drawer-header" :class="{ 'mini-header': !drawerExpanded || dialogAbierto }">
        <q-avatar :size="drawerExpanded && !dialogAbierto ? '100px' : '40px'" class="q-mb-md">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gpsmjindust.firebasestorage.app/o/iconos%2Fseguro_2.png?alt=media&token=6085f543-4e36-4791-8dcd-6709a781f83d"
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
            @click="link.click"
            class="nav-item"
            :id="`nav-${link.action || link.link}`"
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
            :id="`nav-${(link.action || link.link).replace(/[^a-z0-9]/gi, '-')}`"
            :class="{
              'nav-item-active-page': esRutaActiva(link) && !link.action && !link.click,
              'nav-item-active-component': esRutaActiva(link) && (link.action || link.click),
            }"
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
      <!-- Botón de cerrar sesión en la parte inferior -->
      <div class="absolute-bottom q-pa-md bg-white">
        <q-separator class="q-mb-md" />
        <q-item
          clickable
          v-ripple
          class="config-item"
          @click="confirmarCierreSesion"
          id="nav-logout"
        >
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="grey-8" size="40px">
              <q-icon name="logout" />
            </q-avatar>
          </q-item-section>

          <q-item-section v-if="drawerExpanded && !dialogAbierto">
            <q-item-label class="text-weight-medium">Cerrar Sesión</q-item-label>
          </q-item-section>

          <!-- Tooltip cuando está minimizado -->
          <q-tooltip
            v-if="!drawerExpanded || dialogAbierto"
            anchor="center right"
            self="center left"
            :offset="[10, 0]"
          >
            Cerrar Sesión
          </q-tooltip>
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

    <!-- Dialog EstadoFlota shi ya quedo -->
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

    <q-dialog
      v-model="geozonaDrawerOpen"
      position="left"
      seamless
      class="component-dialog"
      @show="onDialogShow"
      @hide="onDialogHide"
    >
      <q-card class="component-card">
        <GeoZonas @close="cerrarGeozonas" @crear-evento-ubicacion="abrirEventosConUbicacion" />
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

    <q-dialog v-model="mostrarConfirmacionSalir" transition-show="scale" transition-hide="scale">
      <q-card style="min-width: 350px; border-radius: 16px; overflow: hidden">
        <!-- Header con gradiente -->
        <q-card-section
          class="row items-center q-pa-md"
          style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
        >
          <q-avatar icon="logout" color="white" text-color="red-7" size="42px" />
          <span class="q-ml-sm text-h6 text-white text-weight-bold">¿Seguro de salir?</span>
          <q-space />
          <q-btn icon="close" flat round dense color="white" v-close-popup />
        </q-card-section>

        <!-- Separador visual -->
        <q-separator />

        <!-- Contenido -->
        <q-card-section class="q-pt-lg q-pb-md">
          <p class="text-body1 text-grey-8 q-mb-none">¿Estás seguro de que deseas cerrar sesión?</p>
        </q-card-section>

        <!-- Acciones -->
        <!-- Acciones -->
        <q-card-actions align="right" class="q-px-md q-pb-md q-gutter-sm">
          <q-btn outline label="Cancelar" color="grey-7" v-close-popup class="btn-dialog-cancel" />
          <q-btn
            unelevated
            label="Cerrar sesión"
            color="negative"
            @click="ejecutarCierreSesion"
            v-close-popup
            class="btn-dialog-confirm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
import { ref, computed, watch, onUnmounted, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { signOut } from 'firebase/auth'
import { useNotifications } from 'src/composables/useNotifications.js'
import EstadoFlota from 'src/components/EstadoFlota.vue'
import Conductores from 'src/components/Conductores.vue'
import { useMultiTenancy } from 'src/composables/useMultiTenancy'

import GeoZonas from 'src/components/GeoZonas.vue'
import Eventos from 'src/components/Eventos.vue'
import NotificacionesPanel from 'src/components/NotificacionesPanel.vue'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'
import { useUnidadesFirebase } from 'src/composables/useUnidadesFirebase'
import { useTutorial } from 'src/composables/useTutorial'
import mapboxgl from 'mapbox-gl'
import { LOCALIZACIONES_INTERNAS } from 'src/data/localizaciones.js'

//const { iniciarTutorial } = useTutorial()
const router = useRouter()
const { iniciarTutorial } = useTutorial(router)

const $q = useQuasar()
const { estadoCompartido } = useEventBus()
const userId = ref(auth.currentUser?.uid || '')

const { cargarUsuarioActual, idEmpresaActual } = useMultiTenancy()

const mapaDragging = ref(false)

//  LÍNEA DE SEGURIDAD - ASEGURA QUE EL ESTADO EXISTA
if (!estadoCompartido.value) {
  console.error('Error crítico: estadoCompartido.value no está definido en MainLayout')
}

// NOTIFICACIONES
const { totalNoLeidas } = useNotifications()
//const notificacionesCount = computed(() => notifications.value.length)

// Control de dialogs abiertos
const dialogAbierto = ref(false)

const busqueda = ref('')
const mostrarSugerencias = ref(false)
const mostrarFiltros = ref(false)
const buscando = ref(false)
const resultadosBusqueda = ref([])
const busquedasRecientes = ref(
  JSON.parse(localStorage.getItem('mjgps_busquedas_recientes') || '[]'),
)
const filtrosActivos = ref(['direccion', 'vehiculo', 'conductor', 'poi', 'geozona'])
const searchInput = ref(null)
const usuarioActual = ref(auth.currentUser?.email || '')

//conductores
const { gruposConductores, obtenerConductores, obtenerGruposConductores, conductoresPorGrupo } =
  useConductoresFirebase()

const { obtenerUnidades, buscarUnidadesPorTermino } = useUnidadesFirebase()
const unidadesCargadas = ref(false)

const conductoresCargados = ref(false)

//para geozonas y pois
const { obtenerPOIs } = usePOIs(userId.value)
const { obtenerGeozonas } = useGeozonas(userId.value)

const poisCargados = ref(false)
const geozonasCargadas = ref(false)
const pois = ref([])
const geozonas = ref([])

// AGREGAR ESTA FUNCIÓN en tu <script setup> de MainLayout.vue

function abrirEventosConUbicacion(data) {
  if (!data || !data.ubicacion || !data.tipo) {
    console.error('Datos incompletos:', data)
    $q.notify({
      type: 'negative',
      message: 'Error: Datos de ubicación incompletos',
      icon: 'error',
    })
    return
  }

  window._ubicacionParaEvento = {
    ubicacion: data.ubicacion,
    tipo: data.tipo,
  }

  geozonaDrawerOpen.value = false

  setTimeout(() => {
    eventosDrawerOpen.value = true
  }, 350)
}

// Función para cargar datos de conductores si no están cargados
const cargarDatosConductores = async () => {
  if (!conductoresCargados.value) {
    try {
      await Promise.all([obtenerConductores(), obtenerGruposConductores()])
      conductoresCargados.value = true
    } catch (error) {
      console.error('Error al cargar datos de conductores:', error)
    }
  }
}

const cargarDatosUnidades = async () => {
  if (!unidadesCargadas.value) {
    try {
      await obtenerUnidades()
      unidadesCargadas.value = true
    } catch (error) {
      console.error('Error al cargar datos de unidades:', error)
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

// En tu <script setup> del MainLayout, agrega:

//  WATCH OPTIMIZADO - CORREGIDO PARA EVITAR PARPADEO
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

//  BLOQUE CORRECTO
watch(
  () => estadoCompartido.value.abrirGeozonasConPOI,
  (newValue) => {
    if (newValue && newValue.item) {
      cerrarTodosLosDialogs()
      setTimeout(() => {
        geozonaDrawerOpen.value = true
      }, 100)
    }
  },
)

//  FUNCIÓN DE BÚSQUEDA CORREGIDA
async function realizarBusqueda(termino) {
  // Verificar que el término sigue siendo el actual
  if (busqueda.value !== termino) {
    buscando.value = false
    return
  }

  const promesas = []

  // Solo buscar en los filtros activos
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
  } catch (error) {
    console.error('Error en búsqueda:', error)
    resultadosBusqueda.value = []
  } finally {
    buscando.value = false
  }
}

//  BÚSQUEDA DE DIRECCIONES - CORREGIDA
async function buscarDirecciones(termino) {
  const terminoLower = termino.toLowerCase()

  // Buscar en localizaciones internas primero
  const internas = LOCALIZACIONES_INTERNAS.filter(
    (loc) =>
      loc.nombre.toLowerCase().includes(terminoLower) ||
      loc.keywords.some((k) => k.includes(terminoLower)),
  ).map((loc) => ({
    id: `dir-interna-${loc.id}`,
    tipo: 'direccion',
    nombre: loc.nombre,
    detalle: loc.direccion,
    lat: loc.lat,
    lng: loc.lng,
  }))

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termino)}&limit=5&countrycodes=mx`,
      { headers: { 'User-Agent': 'MJ GPS App/1.0' } },
    )

    if (!response.ok) throw new Error('Error en Nominatim')

    const data = await response.json()
    const externas = data.map((lugar) => ({
      id: `dir-${lugar.place_id}`,
      tipo: 'direccion',
      nombre: lugar.display_name.split(',')[0],
      detalle: lugar.display_name,
      lat: parseFloat(lugar.lat),
      lng: parseFloat(lugar.lon),
    }))

    // Internas primero, luego externas
    return [...internas, ...externas]
  } catch (error) {
    console.error('Error buscando direcciones:', error)
    return internas // Si falla Nominatim, al menos devuelve las internas
  }
}

async function buscarVehiculos(termino) {
  try {
    // Asegurarnos de que los datos estén cargados
    await cargarDatosUnidades()

    const resultados = []

    // Buscar en todas las unidades
    const unidadesEncontradas = buscarUnidadesPorTermino(termino)

    for (const unidad of unidadesEncontradas) {
      // Formatear la información de la unidad
      let detalle = `ID: ${unidad.Id || 'N/A'}`

      if (unidad.SeguroUnidad) {
        detalle += ` | Seguro: ${unidad.SeguroUnidad}`
      }

      if (unidad.TargetaCirculacion) {
        detalle += ` | Tarjeta: ${unidad.TargetaCirculacion}`
      }

      resultados.push({
        id: `unidad-${unidad.id}`,
        tipo: 'vehiculo',
        nombre: unidad.Unidad || 'Sin nombre',
        detalle: detalle,
        unidadId: unidad.id,
        datosUnidad: unidad,
      })
    }
    return resultados
  } catch (error) {
    console.error('Error buscando vehículos:', error)
    return []
  }
}

//  BÚSQUEDA DE CONDUCTORES - IMPLEMENTACIÓN
async function buscarConductores(termino) {
  try {
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

    return resultados
  } catch (error) {
    console.error('Error buscando conductores:', error)
    return []
  }
}

//  FUNCIONES DE EVENTOS
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
  limpiarMarcadorBusqueda()
}

function seleccionarBusquedaReciente(reciente) {
  busqueda.value = reciente
  mostrarSugerencias.value = true
  if (reciente.length >= 3) {
    realizarBusqueda(reciente)
  }
}

function esRutaActiva(link) {
  const rutaActual = router.currentRoute.value.path

  // Si el link tiene una acción (drawer), verificar si el drawer está abierto
  if (link.action === 'open-estado-flota') {
    return estadoFlotaDrawerOpen.value
  }
  if (link.action === 'open-conductores') {
    return conductoresDrawerOpen.value
  }
  if (link.action === 'open-eventos') {
    return eventosDrawerOpen.value
  }

  // Para el drawer de geozonas (que usa click)
  if (link.title === 'GeoZonas y Puntos de interés') {
    return geozonaDrawerOpen.value
  }

  // Para links normales, comparar con la ruta
  if (link.link) {
    return rutaActual === link.link
  }

  return false
}

// Reemplaza la función toggleFiltro en tu MainLayout.vue con esta versión:

// Reemplaza la función toggleFiltro en tu MainLayout.vue con esta versión:

function toggleFiltro(filtro) {
  const soloEsteActivo = filtrosActivos.value.length === 1 && filtrosActivos.value[0] === filtro

  if (soloEsteActivo) {
    // Si solo este filtro está activo, activar TODOS (búsqueda general)
    filtrosActivos.value = ['direccion', 'vehiculo', 'conductor', 'poi', 'geozona']

    $q.notify({
      message: 'Búsqueda general activada',
      color: 'info',
      icon: 'filter_alt',
      position: 'top',
      timeout: 2000,
    })
  } else {
    // Activar SOLO este filtro
    filtrosActivos.value = [filtro]

    $q.notify({
      message: `Filtrando solo por: ${filtro}`,
      color: 'primary',
      icon: 'filter_alt',
      position: 'top',
      timeout: 2000,
    })
  }

  // Re-buscar si hay texto
  if (busqueda.value && busqueda.value.length >= 3) {
    resultadosBusqueda.value = []
    buscando.value = true
    realizarBusqueda(busqueda.value)
  }
}
function centrarMapaEn(lat, lng, zoom = 15) {
  const mapPage = document.getElementById('map-page')

  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) {
    $q.notify({
      message: 'El mapa no está disponible. Recarga la página.',
      color: 'negative',
      icon: 'error',
      position: 'top',
      timeout: 3000,
    })
    return
  }

  mapPage._mapaAPI.map.flyTo({
    center: [lng, lat],
    zoom: zoom,
    duration: 1500,
    essential: true,
  })

  actualizarMarcadorBusqueda(lat, lng)
}

//let busquedaEnProgreso = ref(false)

/*function ejecutarCentrado(lat, lng, zoom) {
  try {
    const map = window.mapaGlobal.map
    if (!map) {
      console.error('Mapa no disponible')
      return
    }

    // Si ya hay una búsqueda en progreso, la ignoramos para evitar solapamientos
    if (busquedaEnProgreso.value) {
      return
    }

    busquedaEnProgreso.value = true

    // Mover el mapa de forma instantánea
    map.setView([lat, lng], zoom, {
      animate: false,
      duration: 0,
    })
    // Actualizar o crear el marcador
    actualizarMarcadorBusqueda(lat, lng)

    // Marcar que la búsqueda ha terminado
    setTimeout(() => {
      busquedaEnProgreso.value = false
    }, 300) // Un pequeño retraso para evitar clics múltiples
  } catch (error) {
    console.error('Error al centrar mapa:', error)
    $q.notify({
      message: `Error: ${error.message}`,
      color: 'negative',
      icon: 'error',
      position: 'top',
    })
    busquedaEnProgreso.value = false
  }
}*/

function actualizarMarcadorBusqueda(lat, lng) {
  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) {
    console.warn('Mapa no disponible para actualizar marcador')
    return
  }

  const map = mapPage._mapaAPI.map

  // Importar mapboxgl desde el scope global que ya usa IndexPage

  if (!mapboxgl) {
    console.warn('mapboxgl no disponible en window')
    return
  }

  try {
    if (!window.marcadorBusqueda) {
      // Crear elemento del marcador
      const el = document.createElement('div')
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: #4285F4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      `

      window.marcadorBusqueda = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
            className: 'popup-animated',
          }).setHTML(`
      <div class="poi-popup-container">
        <div class="poi-color-band" style="background: #4285F4;">
          <button class="poi-close-btn" onclick="this.closest('.mapboxgl-popup').querySelector('.mapboxgl-popup-close-button').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
          <span class="poi-band-nombre" style="color: white;">Ubicación buscada</span>
        </div>
        <div class="poi-popup-body">
          <div class="address-info">
            <div class="address-text">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
          </div>
        </div>
      </div>
    `),
        )
        .addTo(map)
    } else {
      window.marcadorBusqueda.setLngLat([lng, lat])
    }

    window.marcadorBusqueda.getPopup().addTo(map)
  } catch (error) {
    console.error('Error al actualizar marcador:', error)
  }
}
// Modificar la función seleccionarResultado para usar el nuevo sistema
function seleccionarResultado(resultado) {
  // Guardar en búsquedas recientes
  if (busqueda.value && !busquedasRecientes.value.includes(busqueda.value)) {
    busquedasRecientes.value.unshift(busqueda.value)
    if (busquedasRecientes.value.length > 5) {
      busquedasRecientes.value.pop()
    }
    localStorage.setItem('mjgps_busquedas_recientes', JSON.stringify(busquedasRecientes.value))
  }

  // Cerrar sugerencias y limpiar
  mostrarSugerencias.value = false
  const resultadoTemp = { ...resultado }
  busqueda.value = ''
  resultadosBusqueda.value = []

  // Procesar el resultado
  procesarResultado(resultadoTemp)
}

function eliminarReciente(index) {
  busquedasRecientes.value.splice(index, 1)
  localStorage.setItem('mjgps_busquedas_recientes', JSON.stringify(busquedasRecientes.value))
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
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        // Cargar datos del usuario y su empresa
        await cargarUsuarioActual()
        console.log(' Empresa cargada:', idEmpresaActual.value)
      } catch (error) {
        console.error(' Error cargando usuario:', error)
      }
    }
  })
  window.addEventListener('cerrarTodosDialogs', () => {
    cerrarTodosLosDialogs()
  })

  window.setMapaDragging = (valor) => {
    mapaDragging.value = valor
  }
})

onUnmounted(() => {
  window.removeEventListener('cerrarTodosDialogs', () => {})
})

onUnmounted(() => {
  if (window.marcadorBusqueda && window.marcadorBusqueda.remove) {
    window.marcadorBusqueda.remove()
    window.marcadorBusqueda = null
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
    action: 'open-geozonas', //  Cambiar a action
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
    to: '/dashboard',
  },
]

const leftDrawerOpen = ref(true) // Siempre visible
const drawerExpanded = ref(false) // Controla la expansión al hover
const estadoFlotaDrawerOpen = ref(false)
const conductoresDrawerOpen = ref(false)
const geozonaDrawerOpen = ref(false)
const eventosDrawerOpen = ref(false)
const mostrarConfirmacionSalir = ref(false)

// Watch para mantener el drawer abierto al cambiar de ruta
watch(
  () => estadoCompartido.value?.abrirConductoresConConductor,
  (newValue) => {
    if (newValue && newValue.conductor) {
      // Asegurarse de estar en la ruta correcta
      if (router.currentRoute.value.path !== '/') {
        router.push('/')
      }

      // Cerrar otros dialogs
      cerrarTodosLosDialogs()

      // Esperar para sincronización
      setTimeout(() => {
        conductoresDrawerOpen.value = true

        nextTick(() => {})
      }, 150)
    }
  },
  { deep: true },
)
watch(
  () => router.currentRoute.value.path,
  (newPath, oldPath) => {
    if (newPath !== oldPath) {
      cerrarTodosLosDialogs()
      limpiarBusqueda()
    }
  },
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
  if (mapaDragging.value) return // <- agregar esta linea

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
    nextTick(() => {
      conductoresDrawerOpen.value = true
    })
  } else if (link.action === 'open-geozonas') {
    //  MEJORADO: Mejor sincronización
    cerrarTodosLosDialogs()

    if (router.currentRoute.value.path !== '/') {
      // Si necesitamos cambiar de ruta
      router.push('/').then(() => {
        // Esperar a que Vue termine de renderizar
        nextTick(() => {
          setTimeout(() => {
            geozonaDrawerOpen.value = true
          }, 100) // Pequeño delay adicional para animaciones
        })
      })
    } else {
      // Si ya estamos en la ruta correcta, abrir inmediatamente
      nextTick(() => {
        geozonaDrawerOpen.value = true
      })
    }
  } else if (link.action === 'open-eventos') {
    cerrarTodosLosDialogs()
    eventosDrawerOpen.value = true
  } else if (link.click) {
    link.click()
  }
}

function cerrarTodosLosDialogs() {
  estadoFlotaDrawerOpen.value = false
  conductoresDrawerOpen.value = false
  geozonaDrawerOpen.value = false
  eventosDrawerOpen.value = false
  limpiarMarcadorBusqueda()
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

//  FUNCIÓN PARA MOSTRAR EL DIALOG
function confirmarCierreSesion() {
  mostrarConfirmacionSalir.value = true
}

function ejecutarCierreSesion() {
  logout()
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

//funciones para geozonas y drawer
const cargarDatosPOIs = async () => {
  if (!poisCargados.value) {
    try {
      const poisData = await obtenerPOIs()
      pois.value = poisData
      poisCargados.value = true
    } catch (error) {
      console.error('Error al cargar POIs:', error)
    }
  }
}

// ============================================
// 4. FUNCIÓN PARA CARGAR DATOS DE GEOZONAS
// ============================================
const cargarDatosGeozonas = async () => {
  if (!geozonasCargadas.value) {
    try {
      const geozonasDa = await obtenerGeozonas()
      geozonas.value = geozonasDa
      geozonasCargadas.value = true
    } catch (error) {
      console.error('Error al cargar Geozonas:', error)
    }
  }
}

// ============================================
// 5. FUNCIÓN AUXILIAR: CALCULAR CENTRO DE POLÍGONO
// ============================================
function calcularCentroPoligono(puntos) {
  if (!puntos || puntos.length === 0) return null

  let sumaLat = 0
  let sumaLng = 0

  puntos.forEach((punto) => {
    sumaLat += punto.lat
    sumaLng += punto.lng
  })

  return {
    lat: sumaLat / puntos.length,
    lng: sumaLng / puntos.length,
  }
}

// ============================================
// 6. REEMPLAZAR LA FUNCIÓN buscarPOIs
// ============================================
async function buscarPOIs(termino) {
  try {
    // Asegurarnos de que los datos estén cargados
    await cargarDatosPOIs()

    const resultados = []
    const terminoLower = termino.toLowerCase()

    for (const poi of pois.value) {
      // Buscar en nombre y dirección
      if (
        poi.nombre?.toLowerCase().includes(terminoLower) ||
        poi.direccion?.toLowerCase().includes(terminoLower)
      ) {
        resultados.push({
          id: `poi-${poi.id}`,
          tipo: 'poi',
          nombre: poi.nombre,
          detalle: poi.direccion || 'Sin dirección',
          lat: poi.coordenadas?.lat,
          lng: poi.coordenadas?.lng,
          poiId: poi.id,
        })
      }
    }

    return resultados
  } catch (error) {
    console.error('Error buscando POIs:', error)
    return []
  }
}

// ============================================
// 7. REEMPLAZAR LA FUNCIÓN buscarGeozonas
// ============================================
async function buscarGeozonas(termino) {
  try {
    // Asegurarnos de que los datos estén cargados
    await cargarDatosGeozonas()

    const resultados = []
    const terminoLower = termino.toLowerCase()

    for (const geozona of geozonas.value) {
      // Buscar en nombre y dirección
      if (
        geozona.nombre?.toLowerCase().includes(terminoLower) ||
        geozona.direccion?.toLowerCase().includes(terminoLower)
      ) {
        // Calcular coordenadas del centro según el tipo
        let lat, lng

        if (geozona.tipoGeozona === 'circular' && geozona.centro) {
          // Geozona circular - usar centro directamente
          lat = geozona.centro.lat
          lng = geozona.centro.lng
        } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
          // Geozona polígono - calcular centro
          const centro = calcularCentroPoligono(geozona.puntos)
          if (centro) {
            lat = centro.lat
            lng = centro.lng
          }
        }

        // Solo agregar si tenemos coordenadas válidas
        if (lat && lng) {
          resultados.push({
            id: `geozona-${geozona.id}`,
            tipo: 'geozona',
            nombre: geozona.nombre,
            detalle: `${geozona.direccion || 'Sin dirección'} - ${geozona.tipoGeozona === 'circular' ? 'Circular' : 'Polígono'}`,
            lat: lat,
            lng: lng,
            geozonaId: geozona.id,
            tipoGeozona: geozona.tipoGeozona,
          })
        }
      }
    }

    return resultados
  } catch (error) {
    console.error('Error buscando geozonas:', error)
    return []
  }
}

// ============================================
// 8. ACTUALIZAR LA FUNCIÓN procesarResultado
// ============================================
function procesarResultado(resultado) {
  // Acción según el tipo
  if (resultado.tipo === 'direccion') {
    if (resultado.lat && resultado.lng) {
      centrarMapaEn(resultado.lat, resultado.lng)
      $q.notify({
        message: ` Mostrando: ${resultado.nombre}`,
        color: 'positive',
        icon: 'place',
        position: 'top',
        timeout: 3000,
      })
    } else {
      console.error('Coordenadas inválidas:', resultado)
      $q.notify({
        message: 'Error: Ubicación sin coordenadas válidas',
        color: 'negative',
        icon: 'error',
        position: 'top',
      })
    }
  } else if (resultado.tipo === 'vehiculo') {
    estadoFlotaDrawerOpen.value = true
    $q.notify({
      message: `🚗 Vehículo: ${resultado.nombre}`,
      color: 'positive',
      icon: 'directions_car',
      position: 'top',
    })
  } else if (resultado.tipo === 'conductor') {
    // Abrir el drawer de conductores
    conductoresDrawerOpen.value = true

    // Guardar la información del conductor seleccionado usando el estado compartido
    estadoCompartido.value.abrirConductoresConConductor = {
      conductor: {
        id: resultado.conductorId,
        grupoId: resultado.grupoId,
      },
      timestamp: Date.now(),
    }

    $q.notify({
      message: `Conductor: ${resultado.nombre}`,
      color: 'positive',
      icon: 'person',
      position: 'top',
    })
  } else if (resultado.tipo === 'poi') {
    if (resultado.lat && resultado.lng) {
      // Centrar en el POI con zoom cercano
      centrarMapaEn(resultado.lat, resultado.lng, 18)

      // Abrir drawer de Geozonas con el POI seleccionado
      cerrarTodosLosDialogs()
      setTimeout(() => {
        geozonaDrawerOpen.value = true

        // Pasar información del POI al drawer usando estado compartido
        estadoCompartido.value.abrirGeozonasConPOI = {
          item: {
            id: resultado.poiId,
            tipo: 'poi',
          },
          timestamp: Date.now(),
        }
      }, 100)
    }

    $q.notify({
      message: `📌 POI: ${resultado.nombre}`,
      color: 'red',
      icon: 'location_on',
      position: 'top',
      timeout: 3000,
    })
  } else if (resultado.tipo === 'geozona') {
    if (resultado.lat && resultado.lng) {
      // Centrar en la geozona con zoom medio (para ver todo el área)
      const zoom = resultado.tipoGeozona === 'circular' ? 15 : 14
      centrarMapaEn(resultado.lat, resultado.lng, zoom)

      // Abrir drawer de Geozonas con la geozona seleccionada
      cerrarTodosLosDialogs()
      setTimeout(() => {
        geozonaDrawerOpen.value = true

        // Pasar información de la geozona al drawer usando estado compartido
        estadoCompartido.value.abrirGeozonasConPOI = {
          item: {
            id: resultado.geozonaId,
            tipo: 'geozona',
          },
          timestamp: Date.now(),
        }
      }, 100)
    }

    $q.notify({
      message: ` Geozona: ${resultado.nombre}`,
      color: 'purple',
      icon: 'layers',
      position: 'top',
      timeout: 3000,
    })
  }
}
function limpiarMarcadorBusqueda() {
  if (window.marcadorBusqueda) {
    window.marcadorBusqueda.remove()
    window.marcadorBusqueda = null
  }
}
</script>
<style scoped>
:deep(.q-dialog__inner > .q-card) {
  border-radius: 16px !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
}
.btn-dialog-cancel,
.btn-dialog-confirm {
  border-radius: 10px;
  padding: 8px 24px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: none;
  letter-spacing: 0.3px;
}

.btn-dialog-cancel:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-dialog-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
}

.btn-dialog-cancel:active,
.btn-dialog-confirm:active {
  transform: translateY(0) scale(0.98);
}

.nav-item {
  border-radius: 12px;
  margin: 4px 8px;
  transition: all 0.3s ease;
}

.nav-item:hover {
  background-color: rgba(187, 0, 0, 0.1);
  transform: translateX(4px);
}

/*ESTILO PARA PÁGINAS ACTIVAS (ROJO) */
.nav-item-active-page {
  background-color: rgba(187, 0, 0, 0.15) !important;
  border-left: 4px solid #bb0000;
}

.nav-item-active-page :deep(.q-item__section--avatar) {
  color: #bb0000 !important;
}

.nav-item-active-page :deep(.q-icon) {
  color: #bb0000 !important;
}

.nav-item-active-page :deep(.q-item__label) {
  color: #bb0000 !important;
  font-weight: 600 !important;
}

/*ESTILO PARA COMPONENTES/DRAWERS ACTIVOS (VERDE AZULADO) */
.nav-item-active-component {
  background: linear-gradient(
    90deg,
    rgba(145, 198, 188, 0.2) 0%,
    rgba(5, 150, 105, 0.15) 100%
  ) !important;
  border-left: 4px solid #059669;
}

.nav-item-active-component :deep(.q-item__section--avatar) {
  color: #059669 !important;
}

.nav-item-active-component :deep(.q-icon) {
  color: #059669 !important;
}

.nav-item-active-component :deep(.q-item__label) {
  color: #059669 !important;
  font-weight: 600 !important;
}

/*  RESETEAR COLOR CUANDO NO ESTÁ ACTIVO */
.nav-item:not(.nav-item-active-page):not(.nav-item-active-component)
  :deep(.q-item__section--avatar) {
  color: #616161 !important;
}

.nav-item:not(.nav-item-active-page):not(.nav-item-active-component) :deep(.q-icon) {
  color: #616161 !important;
}

.nav-item:not(.nav-item-active-page):not(.nav-item-active-component) :deep(.q-item__label) {
  color: inherit !important;
}

/* Hover especial para cada tipo */
.nav-item:not(.nav-item-active-page):not(.nav-item-active-component):hover {
  background-color: rgba(187, 0, 0, 0.05);
}

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

.info-btn,
.notif-btn {
  position: relative;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  margin: 0 4px;
  transition: all 0.3s ease !important;
  border-radius: 50%;
}

/*  HOVER mejorado con mayor especificidad */
.info-btn:hover,
.notif-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.15) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

/*  ACTIVE al hacer click */
.info-btn:active,
.notif-btn:active {
  transform: scale(1.05) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

/* Iconos centrados con transición */
.info-btn .q-icon,
.notif-btn .q-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  margin: 0 auto;
  transition: transform 0.3s ease;
}

/*  Rotar icono de info */
.info-btn:hover .q-icon {
  transform: rotate(15deg);
}

/*  Animar icono de notificaciones */
.notif-btn:hover .q-icon {
  animation: swing 0.6s ease;
}

/*  Animación de campana */
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

/* Badge de notificaciones */
.notif-btn :deep(.q-badge--floating) {
  top: 2px;
  right: 2px;
  transform: scale(0.8);
  pointer-events: none;
  transition: transform 0.3s ease;
}

/*  Badge se agranda al hover */
.notif-btn:hover :deep(.q-badge--floating) {
  transform: scale(0.95);
}

/*  IMPORTANTE: Resetear estilos EXCEPTO para info-btn y notif-btn */
:deep(.q-toolbar .q-btn):not(.info-btn):not(.notif-btn) {
  transform: none !important;
}

:deep(.q-toolbar .q-btn):not(.info-btn):not(.notif-btn):hover {
  transform: none !important;
}
.search-input {
  background: white;
  border-radius: 500px;
  transition: all 0.3s ease;
}
.search-input :deep(.q-field__control) {
  border-radius: 500px !important;
}
.search-input:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px);
}

.search-input:focus-within {
  box-shadow: 0 4px 16px rgba(187, 0, 0, 0.2) !important;
  transform: translateY(-1px);
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

.search-input {
  background: white;
  border-radius: 500px;
}

.search-container {
  width: 550px;
  max-width: 60vw;
  margin-left: 24px;
  border-radius: 500px;
  overflow: visible !important;
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
  min-height: 0;
}

/* Ajustar posición del dialog para que empiece justo debajo del header */
:deep(.component-dialog .q-dialog__inner) {
  padding-top: 76px !important;
}

:deep(.component-dialog .q-card) {
  margin-top: 0 !important;
}

/* Nuevos estilos para el buscador */
.filtros-panel {
  position: absolute;
  top: 52px; /* un poco más abajo para que la sombra de arriba sea visible */
  left: 0;
  right: 0;
  background: white;
  padding: 0 8px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 1000;
  /* Animación por visibility + opacity en lugar de max-height */
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease,
    transform 0.2s ease;
}
.filtros-panel-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  padding: 8px;
}
.sugerencias-menu {
  z-index: 9999 !important;
}

/*  FIX SCROLL EXTERNO EN MENU DE NOTIFICACIONES - ACTUALIZADO */
:deep(.notif-menu-custom) {
  overflow: hidden !important;
  max-height: none !important;
  height: auto !important;
}

:deep(.notif-menu-custom .q-card) {
  overflow: hidden !important;
}

:deep(.q-menu__content) {
  overflow: hidden !important;
}

:deep(.q-menu) {
  overflow: hidden !important;
}

:deep(.q-menu .q-card) {
  overflow: hidden !important;
}

.filtros-panel :deep(.q-chip) {
  background-color: #f1f1f1 !important;
  color: #555 !important;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
  border: none !important;
}

/* Hover */
.filtros-panel :deep(.q-chip:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #e0e0e0 !important;
  cursor: pointer;
}

/* Click */
.filtros-panel :deep(.q-chip:active) {
  transform: translateY(0px);
}

/* Activo - rojo corporativo */
.filtros-panel :deep(.q-chip--selected),
.filtros-panel :deep(.q-chip.bg-red),
.filtros-panel :deep(.q-chip.bg-blue),
.filtros-panel :deep(.q-chip.bg-green),
.filtros-panel :deep(.q-chip.bg-orange),
.filtros-panel :deep(.q-chip.bg-purple) {
  background-color: #bb0000 !important;
  color: white !important;
}
</style>
