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

        <q-toolbar-title class="text-weight-bold">
          ✨ Mi Portafolio Increíble
        </q-toolbar-title>

        <q-chip 
          outline 
          color="white" 
          text-color="white"
          icon="bug_report"
        >
          Quasar v{{ $q.version }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <q-drawer 
      v-model="leftDrawerOpen" 
      show-if-above 
      bordered
      :width="300"
      class="drawer-custom"
    >
      <div class="drawer-header">
        <q-avatar size="80px" class="q-mb-md">
          <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" alt="Logo">
        </q-avatar>
        <div class="text-h6 text-weight-bold">Enlaces Esenciales</div>
        <div class="text-caption text-grey-7">Recursos y proyectos destacados</div>
      </div>

      <q-separator class="q-my-md" />

      <q-list padding>
        <EssentialLink 
          v-for="link in linksList" 
          :key="link.title" 
          v-bind="link" 
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'

const linksList = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev',
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework',
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev',
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev',
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev',
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev',
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev',
  },
  {
    title: 'Perco',
    caption: 'Página Web de perco',
    icon: 'https://perco.com.mx/wp-content/uploads/2025/01/logo-perco.png',
    link: 'https://perco.com.mx/',
  },
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<style scoped>
/* Header con gradiente */
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0 0 24px 24px;
  margin-bottom: 16px;
}

.drawer-header .q-avatar {
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>