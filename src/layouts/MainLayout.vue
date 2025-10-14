<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-gradient">
      <q-toolbar class="toolbar-custom">
        <q-toolbar-title class="text-weight-bold">MJ GPS</q-toolbar-title>

        <!-- Búsqueda - Más grande y a la izquierda -->
        <div class="search-container">
          <q-input
            v-model="busqueda"
            outlined
            placeholder="Buscar vehículos, conductores..."
            class="search-input"
            bg-color="white"
            dense
          >
            <template v-slot:prepend>
              <q-icon name="search" color="grey-7" />
            </template>
          </q-input>
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
        <q-avatar :size="(drawerExpanded && !dialogAbierto) ? '100px' : '40px'" class="q-mb-md">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gpsmjindust.firebasestorage.app/o/iconos%2FLogoGPS.png?alt=media&token=4e08d6e6-40ee-481b-9757-a9b58febc42a"
            alt="Logo"
          />
        </q-avatar>
        <div v-if="drawerExpanded && !dialogAbierto" class="text-h6 text-weight-bold">Ubicacion de flotas</div>
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
      v-model="EventosDrawerOpen" 
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
import { ref, computed, watch } from 'vue'
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
const EventosDrawerOpen = ref(false)

// Watch para mantener el drawer abierto al cambiar de ruta
watch([estadoFlotaDrawerOpen, conductoresDrawerOpen, geozonaDrawerOpen, EventosDrawerOpen], 
  ([estado, conductores, geozona, eventos]) => {
    const algunDialogAbierto = estado || conductores || geozona || eventos
    dialogAbierto.value = algunDialogAbierto
    
    // Si algún dialog está abierto, forzar drawer mini
    if (algunDialogAbierto) {
      drawerExpanded.value = false
    }
  },
  { immediate: true } // Agregar immediate
)

// Watch adicional por si algo intenta cerrarlo
watch(leftDrawerOpen, (newVal) => {
  if (!newVal) {
    leftDrawerOpen.value = true
  }
})

// Control de dialogs
watch([estadoFlotaDrawerOpen, conductoresDrawerOpen, geozonaDrawerOpen, EventosDrawerOpen], 
  ([estado, conductores, geozona, eventos]) => {
    dialogAbierto.value = estado || conductores || geozona || eventos
  }
)

function onDrawerMouseEnter() {
  // Verificar explícitamente cada dialog
  if (!estadoFlotaDrawerOpen.value && 
      !conductoresDrawerOpen.value && 
      !geozonaDrawerOpen.value && 
      !EventosDrawerOpen.value) {
    drawerExpanded.value = true
  }
}

function onDrawerMouseLeave() {
  // Solo contraer si NO hay dialogs abiertos
  if (!estadoFlotaDrawerOpen.value && 
      !conductoresDrawerOpen.value && 
      !geozonaDrawerOpen.value && 
      !EventosDrawerOpen.value) {
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
    EventosDrawerOpen.value = true
  }
}

// Nueva función para cerrar todos los dialogs
function cerrarTodosLosDialogs() {
  estadoFlotaDrawerOpen.value = false
  conductoresDrawerOpen.value = false
  geozonaDrawerOpen.value = false
  EventosDrawerOpen.value = false
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
  EventosDrawerOpen.value = false
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
</style>