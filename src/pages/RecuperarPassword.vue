<template>
  <div class="recover-page">
    <!-- Fondo con gradiente igual al login -->
    <div class="bg-gradient-overlay" />

    <!-- Tarjeta principal -->
    <div class="recover-card" :class="{ 'card-success': enviado }">
      <!-- ESTADO ÉXITO -->
      <transition name="fade-up">
        <div v-if="enviado" class="success-state">
          <div class="success-icon-wrapper">
            <q-icon name="check_circle" size="64px" color="positive" />
          </div>
          <h2 class="success-title">¡Solicitud enviada!</h2>
          <p class="success-desc">
            Nuestro equipo de Sistemas revisará tu solicitud y se pondrá en contacto contigo a la
            brevedad al correo proporcionado.
          </p>
          <q-btn
            unelevated
            label="Volver al inicio de sesión"
            class="btn-back-login"
            @click="$router.push('/login')"
            icon-right="arrow_forward"
          />
        </div>
      </transition>

      <!-- FORMULARIO -->
      <transition name="fade-up">
        <div v-if="!enviado" class="form-state">
          <!-- Logo y título -->
          <div class="card-header">
            <div class="pin-icon">
              <q-icon name="location_on" size="48px" color="negative" />
            </div>
            <h1 class="app-title">PercoGPS</h1>
            <p class="app-subtitle">Recuperar contraseña</p>
            <p class="form-hint">Completa el formulario y nuestro equipo procesará tu solicitud.</p>
          </div>

          <!-- Campos -->
          <div class="fields-wrapper">
            <!-- Correo de cuenta -->
            <div class="field-group">
              <label class="field-label">Correo de cuenta</label>
              <q-input
                v-model="form.correocuenta"
                outlined
                dense
                placeholder="correo@registrado.com"
                type="email"
                :error="!!errores.correocuenta"
                :error-message="errores.correocuenta"
                :loading="validandoCorreo"
                @blur="validarCorreoFirebase"
                class="custom-input"
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="grey-6" size="20px" />
                </template>
                <template v-slot:append>
                  <q-icon
                    v-if="correoValido === true"
                    name="check_circle"
                    color="positive"
                    size="20px"
                  />
                  <q-icon
                    v-else-if="correoValido === false"
                    name="cancel"
                    color="negative"
                    size="20px"
                  />
                </template>
              </q-input>
            </div>

            <!-- Empresa -->
            <div class="field-group">
              <label class="field-label">Empresa perteneciente</label>
              <q-input
                v-model="form.empresa"
                outlined
                dense
                :options="empresas"
                placeholder="Escribe la empresa a la que perteneces"
                :error="!!errores.empresa"
                :error-message="errores.empresa"
                class="custom-input"
              >
                <template v-slot:prepend>
                  <q-icon name="business" color="grey-6" size="20px" />
                </template>
              </q-input>
            </div>

            <!-- Nombre solicitante -->
            <div class="field-group">
              <label class="field-label">Nombre del solicitante</label>
              <q-input
                v-model="form.nombre"
                outlined
                dense
                placeholder="Tu nombre completo"
                :error="!!errores.nombre"
                :error-message="errores.nombre"
                class="custom-input"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="grey-6" size="20px" />
                </template>
              </q-input>
            </div>

            <!-- Correo de contacto -->
            <div class="field-group">
              <label class="field-label">Correo de contacto</label>
              <q-input
                v-model="form.correoContacto"
                outlined
                dense
                placeholder="donde.recibirás@respuesta.com"
                type="email"
                :error="!!errores.correoContacto"
                :error-message="errores.correoContacto"
                class="custom-input"
                hide-bottom-space
              >
                <template v-slot:prepend>
                  <q-icon name="forward_to_inbox" color="grey-6" size="20px" />
                </template>
              </q-input>
              <p class="field-hint">
                <q-icon name="info" size="14px" class="q-mr-xs" />
                Aquí recibirás tu nueva contraseña
              </p>
            </div>
          </div>

          <!-- Botón enviar -->
          <q-btn
            unelevated
            label="Enviar solicitud"
            class="btn-submit"
            :loading="enviando"
            :disable="enviando"
            @click="enviarSolicitud"
            icon-right="send"
          />

          <!-- Volver al login -->
          <div class="back-link">
            <router-link to="/login" class="link-login">
              <q-icon name="arrow_back" size="14px" class="q-mr-xs" />
              Volver al inicio de sesión
            </router-link>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useQuasar } from 'quasar'
//import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth'

const $q = useQuasar()

const enviado = ref(false)
const enviando = ref(false)
const validandoCorreo = ref(false)
const correoValido = ref(null) // null = sin validar, true = válido, false = inválido

const form = reactive({
  correocuenta: '',
  empresa: null,
  nombre: '',
  correoContacto: '',
})

const errores = reactive({
  correocuenta: '',
  empresa: '',
  nombre: '',
  correoContacto: '',
})

// Validar contra Firebase Auth si el correo existe
async function validarCorreoFirebase() {
  if (!form.correocuenta || !form.correocuenta.includes('@')) return

  validandoCorreo.value = true
  errores.correocuenta = ''
  correoValido.value = null

  try {
    const response = await fetch(
      'https://us-central1-gpsmjindust.cloudfunctions.net/verificarCorreoExiste',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: form.correocuenta }),
      },
    )

    const data = await response.json()

    if (data.existe) {
      correoValido.value = true
    } else {
      correoValido.value = false
      errores.correocuenta = 'No se encontró una cuenta con ese correo'
    }
  } catch (error) {
    console.error('Error verificando correo:', error)
    correoValido.value = null
  } finally {
    validandoCorreo.value = false
  }
}

function validarFormulario() {
  let valido = true

  errores.correocuenta = ''
  errores.empresa = ''
  errores.nombre = ''
  errores.correoContacto = ''

  if (!form.correocuenta) {
    errores.correocuenta = 'El correo de cuenta es requerido'
    valido = false
  } else if (correoValido.value === false) {
    errores.correocuenta = 'El correo no está registrado en el sistema'
    valido = false
  }

  if (!form.empresa) {
    errores.empresa = 'Escribe la empresa a la que perteneces'
    valido = false
  }

  if (!form.nombre || form.nombre.trim().length < 3) {
    errores.nombre = 'Ingresa tu nombre completo'
    valido = false
  }

  if (!form.correoContacto) {
    errores.correoContacto = 'El correo de contacto es requerido'
    valido = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correoContacto)) {
    errores.correoContacto = 'Ingresa un correo válido'
    valido = false
  }

  return valido
}

async function enviarSolicitud() {
  if (!validarFormulario()) return

  enviando.value = true

  try {
    const response = await fetch(
      'https://us-central1-gpsmjindust.cloudfunctions.net/enviarSolicitudPassword',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoCuenta: form.correocuenta,
          empresa: form.empresa,
          nombre: form.nombre,
          correoContacto: form.correoContacto,
        }),
      },
    )

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    enviado.value = true
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Error al enviar la solicitud. Intenta nuevamente.',
      icon: 'error',
    })
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
.recover-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  padding: 24px;
  font-family: 'Segoe UI', sans-serif;
}

.bg-gradient-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  z-index: 0;
}

.recover-card {
  position: relative;
  z-index: 1;
  background: white;
  border-radius: 24px;
  padding: 40px 36px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.card-success {
  max-width: 400px;
}

/* HEADER */
.card-header {
  text-align: center;
  margin-bottom: 10px;
}

.pin-icon {
  margin-bottom: 0;
}

.app-title {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a1a;
  margin: -30px 0 0px;
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: 20px;
  color: #1a1a1a;
  margin: 0 0 12px;
  font-weight: 550;
}

.form-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
  line-height: 1.5;
}

/* CAMPOS */
.fields-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 2px;
}

.field-hint {
  font-size: 11px;
  color: #aaa;
  margin: 0 0 0 0px;
  display: flex;
  align-items: center;
}

.custom-input :deep(.q-field__control) {
  border-radius: 12px !important;
  background: #fafafa;
}

.custom-input :deep(.q-field__control:hover) {
  background: #f5f5f5;
}

/* BOTÓN SUBMIT */
.btn-submit {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #bb0000 0%, #cc3300 100%) !important;
  color: white !important;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(187, 0, 0, 0.4);
}

.btn-submit:active {
  transform: translateY(0);
}

/* LINK VOLVER */
.back-link {
  text-align: center;
}

.link-login {
  font-size: 13px;
  color: #bb0000;
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.2s;
}

.link-login:hover {
  opacity: 0.7;
}

/* ESTADO ÉXITO */
.success-state {
  text-align: center;
  padding: 16px 0;
}

.success-icon-wrapper {
  margin-bottom: 16px;
  animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-title {
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0 0 12px;
}

.success-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 28px;
}

.btn-back-login {
  background: linear-gradient(135deg, #bb0000 0%, #cc3300 100%) !important;
  color: white !important;
  border-radius: 12px;
  padding: 10px 28px;
  font-weight: 700;
}

/* TRANSICIONES */
.fade-up-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>
