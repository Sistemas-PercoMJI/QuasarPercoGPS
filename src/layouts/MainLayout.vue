<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-gradient">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="menu-btn"
        />

        <q-toolbar-title class="text-weight-bold"> ✨ PERCO GPS </q-toolbar-title>

        <q-chip outline color="white" text-color="white" icon="bug_report">
          Quasar v{{ $q.version }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <!-- Drawer principal -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="350" class="drawer-custom">
      <div class="drawer-header">
        <q-avatar size="100px" class="q-mb-md">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gpsmjindust.firebasestorage.app/o/iconos%2FLogoGPS.png?alt=media&token=4e08d6e6-40ee-481b-9757-a9b58febc42a"
            alt="Logo"
          />
        </q-avatar>
        <div class="text-h6 text-weight-bold">Enlaces Esenciales</div>
        <div class="text-caption text-grey-7">Recursos y proyectos destacados</div>
      </div>

      <q-separator class="q-my-md" />

      <q-list padding>
        <template v-for="link in linksList" :key="link.title">
          <!-- Link externo -->
          <q-item v-if="link.external" clickable :href="link.link" target="_blank" v-ripple>
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-icon name="open_in_new" size="xs" />
            </q-item-section>
          </q-item>

          <!-- Link interno o acción -->
          <q-item
            v-else
            clickable
            :to="link.action ? undefined : link.link"
            @click="handleLinkClick(link)"
            v-ripple
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ link.title }}</q-item-label>
              <q-item-label caption>{{ link.caption }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
      <!-- Botón de configuración en la parte inferior -->
      <!-- Botón de configuración en la parte inferior -->
      <div class="absolute-bottom q-pa-md bg-white">
        <q-separator class="q-mb-md" />
        <q-item clickable v-ripple class="config-item">
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="grey-8" size="40px">
              <q-icon name="settings" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">Configuración</q-item-label>
            <q-item-label caption class="text-grey-7">Ajustes del sistema</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="expand_less" color="grey-5" />
          </q-item-section>

          <!-- Menu que se abre desde este botón -->
          <q-menu
            anchor="top left"
            self="bottom left"
            :offset="[0, 10]"
            transition-show="jump-up"
            transition-hide="jump-down"
          >
            <q-card style="width: 300px; max-width: 90vw">
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6 text-weight-bold">Configuración</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>

              <q-separator class="q-my-sm" />

              <q-list dense>
                <q-item clickable v-ripple @click="irAPerfil" v-close-popup>
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="sm">
                      <q-icon name="person" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Perfil</q-item-label>
                    <q-item-label caption>Ver y editar tu perfil</q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator inset />

                <q-item clickable v-ripple @click="irAConfiguracion" v-close-popup>
                  <q-item-section avatar>
                    <q-avatar color="blue-grey" text-color="white" size="sm">
                      <q-icon name="settings" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Configuración General</q-item-label>
                    <q-item-label caption>Ajustes del sistema</q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator inset />

                <q-item clickable v-ripple @click="cerrarSesionDesdeConfig" v-close-popup>
                  <q-item-section avatar>
                    <q-avatar color="negative" text-color="white" size="sm">
                      <q-icon name="logout" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Cerrar Sesión</q-item-label>
                    <q-item-label caption>Salir de tu cuenta</q-item-label>
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

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { signOut } from 'firebase/auth'
import EstadoFlota from 'src/components/EstadoFlota.vue'
import Conductores from 'src/components/Conductores.vue'
import GeoZonas from 'src/components/GeoZonas.vue'

const router = useRouter()
const $q = useQuasar()

function irAPerfil() {
  router.push('/perfil')
}

function irAConfiguracion() {
  router.push('/configuracion')
}

function cerrarSesionDesdeConfig() {
  logout()
}

const linksList = [
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
    link: '/dashboard',
  },
  {
    title: 'Perco',
    caption: 'Página Web de perco',
    icon: 'language',
    link: 'https://perco.com.mx/',
    external: true,
  },
  {
    title: 'Reportes',
    caption: 'Crear reporte',
    icon: 'description',
    link: '/reporte',
  },
]

const leftDrawerOpen = ref(false)
const estadoFlotaDrawerOpen = ref(false)
const conductoresDrawerOpen = ref(false)
const geozonaDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function handleLinkClick(link) {
  if (link.action === 'logout') {
    logout()
  } else if (link.action === 'open-estado-flota') {
    estadoFlotaDrawerOpen.value = true
  } else if (link.action === 'open-conductores') {
    conductoresDrawerOpen.value = true
  } else if (link.action === 'open-geozonas') {
    geozonaDrawerOpen.value = true
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

.menu-btn {
  transition: transform 0.3s ease;
}

.menu-btn:hover {
  transform: rotate(90deg);
}

/* Drawer personalizado */
.drawer-custom {
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
}

.drawer-header {
  padding: 32px 24px 16px;
  text-align: center;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  border-radius: 0 0 24px 24px;
  margin-bottom: 16px;
}
</style>
