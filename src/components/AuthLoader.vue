/*AuthLoader.vue*/
<template>
  <div v-if="loading" class="fullscreen flex flex-center bg-primary">
    <q-spinner-gears size="80px" color="white" />
    <div class="text-h6 text-white q-mt-md">Verificando sesión...</div>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from 'src/firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'

const loading = ref(true)
const router = useRouter()

onMounted(() => {
  // Esperar a que Firebase verifique la sesión
  onAuthStateChanged(auth, (user) => {
    loading.value = false

    // Si hay usuario y está en login, redirigir al dashboard
    if (user && router.currentRoute.value.path === '/login') {
      router.push('/dashboard')
    }

    // Si no hay usuario y NO está en login, redirigir al login
    if (!user && router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  })
})
</script>
