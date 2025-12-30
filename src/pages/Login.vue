<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useMultiTenancy } from 'src/composables/useMultiTenancy'

const router = useRouter()
const $q = useQuasar()
const email = ref('')
const password = ref('')
const loading = ref(false)
const { cargarUsuarioActual } = useMultiTenancy()

const login = async () => {
  // Validar campos
  if (!email.value || !password.value) {
    $q.notify({
      type: 'negative',
      message: 'Por favor ingresa email y contraseña',
    })
    return
  }

  loading.value = true

  try {
    // Intentar login con Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)
    await cargarUsuarioActual()
    console.log('✅ Usuario y empresa cargados')

    // Login exitoso
    console.log('Usuario logueado:', userCredential.user)

    $q.notify({
      type: 'positive',
      message: 'Bienvenido!',
    })

    // Redirigir al dashboard
    router.push('/dashboard')
  } catch (error) {
    // Manejo de errores
    console.error('Error en login:', error)

    let mensaje = 'Error al iniciar sesión'

    if (error.code === 'auth/user-not-found') {
      mensaje = 'Usuario no encontrado'
    } else if (error.code === 'auth/wrong-password') {
      mensaje = 'Contraseña incorrecta'
    } else if (error.code === 'auth/invalid-email') {
      mensaje = 'Email inválido'
    } else if (error.code === 'auth/invalid-credential') {
      mensaje = 'Credenciales inválidas'
    }

    $q.notify({
      type: 'negative',
      message: mensaje,
    })
  } finally {
    loading.value = false
  }
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
            <div class="text-h4 text-weight-bold q-mt-md">PercoGPS</div>
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
