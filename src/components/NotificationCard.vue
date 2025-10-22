<template>
  <q-card
    :class="['notification-card', `bg-${type}`, { 'leida': leida }]"
    class="q-mb-sm q-pa-md shadow-2 rounded-borders"
  >
    <div class="row items-start">
      <q-icon :name="icon" size="md" class="q-mr-sm notification-icon" />
      <div class="col">
        <div class="text-subtitle2 text-weight-medium">{{ title }}</div>
        <div class="text-body2 q-mt-xs">{{ message }}</div>
        <div class="text-caption text-grey-7 q-mt-sm">
          <q-icon name="access_time" size="14px" class="q-mr-xs" />
          {{ tiempoTranscurrido }}
        </div>
      </div>
      <q-btn
        flat
        round
        dense
        icon="close"
        size="sm"
        @click.stop="handleClose"
        class="close-btn"
      />
    </div>
  </q-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  type: { type: String, default: 'info' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  timestamp: { type: Number, default: Date.now },
  leida: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const iconMap = {
  info: 'info',
  positive: 'check_circle',
  negative: 'error',
  warning: 'warning'
}

const icon = computed(() => iconMap[props.type] || 'info')

// Tiempo transcurrido actualizado cada minuto
const tiempoTranscurrido = ref('')
let intervalId = null

function actualizarTiempo() {
  const ahora = Date.now()
  const diferencia = ahora - props.timestamp
  const minutos = Math.floor(diferencia / 60000)
  
  if (minutos < 1) {
    tiempoTranscurrido.value = 'Justo ahora'
  } else if (minutos === 1) {
    tiempoTranscurrido.value = 'Hace 1 minuto'
  } else if (minutos < 60) {
    tiempoTranscurrido.value = `Hace ${minutos} minutos`
  } else {
    const horas = Math.floor(minutos / 60)
    tiempoTranscurrido.value = horas === 1 ? 'Hace 1 hora' : `Hace ${horas} horas`
  }
}

onMounted(() => {
  actualizarTiempo()
  intervalId = setInterval(actualizarTiempo, 60000) // Actualizar cada minuto
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.notification-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-left: 4px solid rgba(0, 0, 0, 0.2);
  opacity: 1;
}

.notification-card.leida {
  opacity: 0.6;
  background: #f5f5f5 !important;
}

.notification-card:hover {
  transform: translateX(4px) scale(1.02);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
}

.notification-icon {
  transition: transform 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.notification-card:hover .notification-icon {
  transform: scale(1.2) rotate(5deg);
  animation: none;
}

.close-btn {
  transition: all 0.3s ease;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
  transform: rotate(90deg) scale(1.1);
  background: rgba(0, 0, 0, 0.1);
}
</style>