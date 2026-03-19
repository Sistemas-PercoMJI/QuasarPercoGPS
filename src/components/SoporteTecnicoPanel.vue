<!-- src/components/SoporteTecnicoPanel.vue -->
<template>
  <q-card class="soporte-card">
    <!-- Header -->
    <q-card-section
      class="row items-center q-pa-none"
      style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
    >
      <div class="q-pa-md">
        <p
          style="
            margin: 0;
            font-size: 11px;
            color: #f8c8c8;
            text-transform: uppercase;
            letter-spacing: 1px;
          "
        >
          PercoGPS — Soporte Técnico
        </p>
        <div class="text-h6 text-white text-weight-bold">Nuevo ticket de soporte</div>
      </div>
      <q-space />
      <q-btn flat round dense icon="close" color="white" class="q-mr-sm" @click="$emit('close')" />
    </q-card-section>

    <q-separator />

    <!-- Estado de éxito -->
    <template v-if="enviado">
      <q-card-section class="flex flex-center column q-py-xl" style="min-height: 400px">
        <q-icon name="check_circle" color="positive" size="72px" />
        <div class="text-h6 text-weight-bold q-mt-md">¡Ticket enviado!</div>
        <div class="text-body2 text-grey-7 text-center q-mt-sm q-px-lg">
          Tu solicitud fue recibida. El área de Sistemas te contactará pronto al correo de
          seguimiento que proporcionaste.
        </div>
        <q-btn
          unelevated
          color="primary"
          label="Cerrar"
          class="q-mt-xl btn-soporte"
          @click="$emit('close')"
        />
      </q-card-section>
    </template>

    <!-- Formulario -->
    <template v-else>
      <q-card-section class="scroll q-pa-md" style="max-height: 440px">
        <div class="row q-col-gutter-sm">
          <!-- Nombre -->
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.nombre"
              label="Nombre"
              outlined
              dense
              :error="!!errores.nombre"
              :error-message="errores.nombre"
              class="input-soporte"
            >
              <template #prepend>
                <q-icon name="person" />
              </template>
            </q-input>
          </div>

          <!-- Empresa -->
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.empresa"
              label="Empresa"
              outlined
              dense
              :error="!!errores.empresa"
              :error-message="errores.empresa"
              class="input-soporte"
            >
              <template #prepend>
                <q-icon name="business" />
              </template>
            </q-input>
          </div>

          <!-- Correo de cuenta -->
          <div class="col-12">
            <q-input
              v-model="form.correoCuenta"
              label="Correo de cuenta"
              outlined
              dense
              type="email"
              :error="!!errores.correoCuenta"
              :error-message="errores.correoCuenta"
              class="input-soporte"
              hint="Correo con el que inicias sesión en PercoGPS"
            >
              <template #prepend>
                <q-icon name="manage_accounts" />
              </template>
            </q-input>
          </div>

          <!-- Correo de seguimiento -->
          <div class="col-12">
            <q-input
              v-model="form.correoSeguimiento"
              label="Correo de seguimiento"
              outlined
              dense
              type="email"
              :error="!!errores.correoSeguimiento"
              :error-message="errores.correoSeguimiento"
              class="input-soporte"
              hint="Correo donde Sistemas te contactará para dar seguimiento"
            >
              <template #prepend>
                <q-icon name="forward_to_inbox" />
              </template>
            </q-input>
          </div>

          <!-- Descripción -->
          <div class="col-12">
            <q-input
              v-model="form.descripcion"
              label="Descripción del problema"
              outlined
              dense
              type="textarea"
              rows="4"
              :error="!!errores.descripcion"
              :error-message="errores.descripcion"
              class="input-soporte"
            >
              <template #prepend>
                <q-icon name="description" />
              </template>
            </q-input>
          </div>

          <!-- Adjuntar imágenes -->
          <div class="col-12">
            <div class="text-caption text-grey-7 q-mb-xs">
              Imágenes adjuntas (máx. {{ MAX_IMAGENES }}, 2MB c/u)
            </div>

            <!-- Miniaturas -->
            <div v-if="imagenes.length > 0" class="row q-gutter-sm q-mb-sm">
              <div v-for="(img, index) in imagenes" :key="index" class="miniatura-wrapper">
                <img :src="img.preview" :alt="img.nombre" class="miniatura-img" />
                <q-btn
                  round
                  dense
                  icon="close"
                  size="xs"
                  color="negative"
                  class="miniatura-remove"
                  @click="quitarImagen(index)"
                />
                <q-tooltip>{{ img.nombre }}</q-tooltip>
              </div>
            </div>

            <!-- Error de imágenes -->
            <div v-if="errorImagenes" class="text-negative text-caption q-mb-xs">
              <q-icon name="warning" size="14px" class="q-mr-xs" />
              {{ errorImagenes }}
            </div>

            <!-- Botón clip -->
            <q-btn
              v-if="imagenes.length < MAX_IMAGENES"
              flat
              dense
              icon="attach_file"
              label="Adjuntar imagen"
              color="grey-7"
              size="sm"
              class="btn-adjuntar"
              @click="triggerFileInput"
            />

            <!-- Input file oculto -->
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="onFileChange"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Error de envío -->
      <div v-if="errorEnvio" class="q-px-md q-pt-sm">
        <q-banner dense rounded class="bg-red-1 text-negative">
          <template #avatar>
            <q-icon name="error" />
          </template>
          {{ errorEnvio }}
        </q-banner>
      </div>

      <!-- Acciones -->
      <q-card-actions align="right" class="q-px-md q-pb-md q-pt-sm">
        <q-btn flat label="Cancelar" color="grey-7" class="btn-soporte" @click="$emit('close')" />
        <q-btn
          unelevated
          label="Enviar ticket"
          color="primary"
          icon="send"
          class="btn-soporte"
          :loading="enviando"
          :disable="!formularioValido"
          @click="enviarTicket"
        />
      </q-card-actions>
    </template>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { useSoporteTecnico } from 'src/composables/useSoporteTecnico'

defineEmits(['close'])

const fileInput = ref(null)

const {
  form,
  imagenes,
  enviando,
  enviado,
  errorEnvio,
  errorImagenes,
  errores,
  formularioValido,
  MAX_IMAGENES,
  agregarImagenes,
  quitarImagen,
  enviarTicket,
} = useSoporteTecnico()

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const archivos = event.target.files
  if (archivos?.length) {
    agregarImagenes(archivos)
  }
  // Reset para permitir seleccionar el mismo archivo de nuevo
  event.target.value = ''
}
</script>

<style scoped>
.soporte-card {
  width: 500px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
}

.input-soporte :deep(.q-field__control) {
  border-radius: 8px;
}

.btn-soporte {
  border-radius: 10px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  padding: 8px 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-soporte:hover {
  transform: translateY(-2px);
}

.btn-adjuntar {
  border-radius: 8px;
  border: 1px dashed #bdbdbd;
  padding: 6px 12px;
  transition: all 0.2s ease;
}

.btn-adjuntar:hover {
  border-color: #bb0000;
  color: #bb0000 !important;
  background: rgba(187, 0, 0, 0.05);
}

.miniatura-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: visible;
}

.miniatura-img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.miniatura-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 1;
}
</style>
