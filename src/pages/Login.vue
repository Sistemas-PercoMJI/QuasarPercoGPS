<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

const login = () => {
  loading.value = true

  // Simulación de login (después conectarás tu API)
  setTimeout(() => {
    if (email.value && password.value) {
      // Login exitoso
      router.push('/dashboard')
    }
    loading.value = false
  }, 1000)
}
</script>

<template>
  <q-layout>
    <q-page-container>
      <q-page
        class="flex flex-center"
        style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
      >
        <q-card style="width: 400px; max-width: 90vw">
          <!-- Logo/Header -->
          <q-card-section class="text-center q-pt-lg">
            <q-icon name="location_on" size="60px" color="primary" />
            <div class="text-h4 text-weight-bold q-mt-md">MJ Indsutrial GPS</div>
            <div class="text-subtitle2 text-grey-7">Sistema de Rastreo Vehicular</div>
          </q-card-section>

          <!-- Formulario -->
          <q-card-section class="q-px-lg">
            <q-input
              v-model="email"
              label="Correo electrónico"
              type="email"
              outlined
              dense
              class="q-mb-md"
            >
              <template v-slot:prepend>
                <q-icon name="email" />
              </template>
            </q-input>

            <q-input
              v-model="password"
              label="Contraseña"
              type="password"
              outlined
              dense
              @keyup.enter="login"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
            </q-input>
          </q-card-section>

          <!-- Botones -->
          <q-card-actions class="q-px-lg q-pb-lg">
            <q-btn
              unelevated
              color="primary"
              label="Iniciar Sesión"
              class="full-width"
              size="md"
              :loading="loading"
              @click="login"
            />
          </q-card-actions>

          <!-- Footer -->
          <q-card-section class="text-center q-pt-none">
            <a href="#" class="text-primary text-caption">¿Olvidaste tu contraseña?</a>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>
