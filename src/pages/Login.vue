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
      icon: 'check_circle',
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
      <q-page class="flex flex-center login-background">
        <q-card class="login-card">
          <!-- Logo/Header -->
          <q-card-section class="text-center q-pt-lg">
            <div class="logo-container">
              <q-icon name="location_on" size="60px" color="primary" class="logo-pulse" />
            </div>
            <div class="text-h4 text-weight-bold q-mt-md">PercoGPS</div>
            <div class="text-subtitle2 text-grey-7">Sistema de Rastreo Vehicular</div>
          </q-card-section>

          <!-- Formulario -->
          <q-card-section class="q-px-lg q-pt-md">
            <q-input
              v-model="email"
              label="Correo electrónico"
              type="email"
              outlined
              dense
              class="q-mb-md input-modern"
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
              class="input-modern"
              @keyup.enter="login"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
            </q-input>
          </q-card-section>

          <!-- Botones -->
          <q-card-actions class="q-px-lg q-pb-lg q-pt-md">
            <q-btn
              unelevated
              color="primary"
              label="Iniciar Sesión"
              class="full-width btn-login"
              size="md"
              :loading="loading"
              @click="login"
            />
          </q-card-actions>

          <!-- Footer -->
          <q-card-section class="text-center q-pt-none q-pb-lg">
            <a href="#" class="forgot-password">¿Olvidaste tu contraseña?</a>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
/* Fondo con gradiente animado */
.login-background {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  min-height: 100vh;
  animation: gradientShift 15s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Tarjeta de login mejorada */
.login-card {
  width: 400px;
  max-width: 90vw;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.6s ease-out;
  overflow: hidden;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo con animación de pulso */
.logo-container {
  display: inline-block;
}

.logo-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Inputs modernos con efectos */
.input-modern :deep(.q-field__control) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.input-modern :deep(.q-field__control:hover) {
  box-shadow: 0 2px 8px rgba(187, 0, 0, 0.1);
}

.input-modern :deep(.q-field__control):focus-within {
  box-shadow: 0 0 0 3px rgba(187, 0, 0, 0.1);
}

/* Botón de login mejorado */
.btn-login {
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  padding: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-login:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(187, 0, 0, 0.4);
}

.btn-login:active {
  transform: translateY(0) scale(0.98);
}

/* Link de "Olvidaste tu contraseña" mejorado */
.forgot-password {
  color: #bb0000;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
}

.forgot-password::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: -2px;
  left: 50%;
  background-color: #bb0000;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.forgot-password:hover::after {
  width: 100%;
}

.forgot-password:hover {
  color: #8b0000;
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    border-radius: 12px;
  }

  .text-h4 {
    font-size: 1.8rem !important;
  }
}
</style>
