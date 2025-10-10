<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-gradient">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">MJ GPS</q-toolbar-title>

        <q-chip outline color="white" text-color="white" icon="bug_report">
          Quasar v{{ $q.version }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <!-- Mini Drawer que se expande al hover -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :mini="!drawerExpanded"
      @mouseenter="drawerExpanded = true"
      @mouseleave="drawerExpanded = false"
      bordered
      :width="350"
      :mini-width="70"
      class="drawer-custom"
      :overlay="!isReportePage"
    >
      <!-- Header del drawer -->
      <div class="drawer-header" :class="{ 'mini-header': !drawerExpanded }">
        <q-avatar :size="drawerExpanded ? '100px' : '40px'" class="q-mb-md">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gpsmjindust.firebasestorage.app/o/iconos%2FLogoGPS.png?alt=media&token=4e08d6e6-40ee-481b-9757-a9b58febc42a"
            alt="Logo"
          />
        </q-avatar>
        <div v-if="drawerExpanded" class="text-h6 text-weight-bold">
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

            <q-item-section v-if="drawerExpanded">
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>

            <q-item-section side v-if="drawerExpanded">
              <q-icon name="open_in_new" size="xs" />
            </q-item-section>

            <!-- Tooltip cuando está minimizado -->
            <q-tooltip v-if="!drawerExpanded" anchor="center right" self="center left" :offset="[10, 0]">
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

            <q-item-section v-if="drawerExpanded">
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>

            <!-- Tooltip cuando está minimizado -->
            <q-tooltip v-if="!drawerExpanded" anchor="center right" self="center left" :offset="[10, 0]">
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
          
          <q-item-section v-if="drawerExpanded">
            <q-item-label class="text-weight-medium">Configuración</q-item-label>
            <q-item-label caption class="text-grey-7">Ajustes del sistema</q-item-label>
          </q-item-section>
          
          <q-item-section side v-if="drawerExpanded">
            <q-icon name="expand_less" color="grey-5" />
          </q-item-section>

          <!-- Tooltip cuando está minimizado -->
          <q-tooltip v-if="!drawerExpanded" anchor="center right" self="center left" :offset="[10, 0]">
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

    <!-- Drawer Estado de la Flota -->
    <q-drawer v-model="estadoFlotaDrawerOpen" side="left" bordered :width="350" overlay elevated>
      <EstadoFlota @close="cerrarEstadoFlota" />
    </q-drawer>

    <!-- Drawer Conductores -->
    <q-drawer v-model="conductoresDrawerOpen" side="left" bordered :width="350" overlay elevated>
      <Conductores @close="cerrarConductores" />
    </q-drawer>

    <!-- Drawer Geozonas -->
    <q-drawer v-model="geozonaDrawerOpen" side="left" bordered :width="350" overlay elevated>
      <GeoZonas @close="cerrarGeozonas" />
    </q-drawer>

    <!-- Drawer Eventos -->
    <q-drawer v-model="EventosDrawerOpen" side="left" bordered :width="350" overlay elevated>
      <Eventos @close="cerrarEventos" />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { signOut } from 'firebase/auth'
import EstadoFlota from 'src/components/EstadoFlota.vue'
import Conductores from 'src/components/Conductores.vue'
import GeoZonas from 'src/components/GeoZonas.vue'
import Eventos from 'src/components/Eventos.vue'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// Detectar si estamos en la página de reportes
const isReportePage = computed(() => {
  return route.path === '/reporte'
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
    title: 'GeoZonas',
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

function handleLinkClick(link) {
  if (link.action === 'logout') {
    logout()
  } else if (link.action === 'open-estado-flota') {
    estadoFlotaDrawerOpen.value = true
  } else if (link.action === 'open-conductores') {
    conductoresDrawerOpen.value = true
  } else if (link.action === 'open-geozonas') {
    geozonaDrawerOpen.value = true
  } else if (link.action === 'open-eventos') {
    EventosDrawerOpen.value = true
  }
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
/* Header con gradiente */
.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
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

/* Animación suave para iconos */
.q-icon {
  transition: transform 0.3s ease;
}

.nav-item:hover .q-icon {
  transform: scale(1.1);
}
</style>