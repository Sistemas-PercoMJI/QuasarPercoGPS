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

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="300" class="drawer-custom">
      <div class="drawer-header">
        <q-avatar size="80px" class="q-mb-md">
          <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" alt="Logo" />
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
            :to="link.action === 'logout' ? undefined : link.link"
            @click="link.action === 'logout' ? logout() : null"
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

const router = useRouter()
const $q = useQuasar()

const linksList = [
  {
    title: 'Estado de la flota',
    caption: 'Monitoreo en tiempo real',
    icon: 'directions_car',
    link: '/dashboard',
  },
  {
    title: 'Conductores',
    caption: 'Gestión de conductores',
    icon: 'person',
    link: '/dashboard',
  },
  {
    title: 'Puntos de Interés',
    caption: 'Ubicaciones importantes',
    icon: 'place',
    link: '/dashboard',
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
    title: 'Salir',
    caption: 'Cerrar sesión',
    icon: 'logout',
    action: 'logout',
  },
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
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

.drawer-header .q-avatar {
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
