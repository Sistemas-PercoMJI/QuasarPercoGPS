<template>
  <q-card
    :class="['notification-card', `bg-${type}`, { leida: leida }]"
    class="q-mb-sm q-pa-sm shadow-2 rounded-borders"
  >
    <div class="row items-start">
      <q-icon :name="icon" size="md" class="q-mr-sm notification-icon" />
      <div class="col">
        <div class="text-subtitle2 text-weight-medium">{{ title }}</div>
        <div class="text-body2 q-mt-xs">{{ message }}</div>

        <!-- 🆕 MAPA ESTÁTICO SI EXISTE -->
        <div v-if="mapImage" class="map-preview q-mt-sm" @click="abrirMapaCompleto">
          <img
            :src="mapImage"
            alt="Mapa del evento"
            class="map-image"
            crossorigin="anonymous"
            @error="handleImageError"
          />
          <div class="map-overlay">
            <q-icon name="place" size="16px" />
            <span class="text-caption">Ver ubicación</span>
          </div>
        </div>

        <div class="text-caption text-grey-7 q-mt-sm">
          <q-icon name="access_time" size="14px" class="q-mr-xs" />
          {{ tiempoTranscurrido }}
        </div>
      </div>
      <q-btn flat round dense icon="close" size="sm" @click.stop="handleClose" class="close-btn" />
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
  leida: { type: Boolean, default: false },
  mapImage: { type: String, default: null }, // 🆕 IMAGEN DEL MAPA EN BASE64
  mapUrl: { type: String, default: null }, // 🆕 URL DEL MAPA COMPLETO
})

const emit = defineEmits(['close'])

const iconMap = {
  info: 'info',
  positive: 'check_circle',
  negative: 'error',
  warning: 'warning',
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

// 🆕 FUNCIÓN PARA ABRIR MAPA EN NUEVA PESTAÑA
function abrirMapaCompleto() {
  if (props.mapUrl) {
    window.open(props.mapUrl, '_blank')
  }
}

// 🆕 FUNCIÓN PARA MANEJAR ERRORES DE CARGA DE IMAGEN
function handleImageError(event) {
  console.warn('⚠️ Error cargando imagen del mapa, intentando URL directa')
  // Si falla, intentar con la URL directa con timestamp
  if (props.mapUrl && event.target.src !== props.mapUrl) {
    event.target.src = `${props.mapUrl}&t=${Date.now()}`
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
/* 🎨 COLORES PERSONALIZADOS SUTILES - CON !important */
.notification-card.bg-positive {
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%) !important;
  border-left-color: #66bb6a !important;
  color: #2e7d32 !important;
}

.notification-card.bg-positive .notification-icon {
  color: #4caf50 !important;
}

.notification-card.bg-warning {
  background: linear-gradient(135deg, #fff3e0 0%, #fef8f1 100%) !important;
  border-left-color: #ffa726 !important;
  color: #e65100 !important;
}

.notification-card.bg-warning .notification-icon {
  color: #ff9800 !important;
}

.notification-card.bg-negative {
  background: linear-gradient(135deg, #ffebee 0%, #fef5f5 100%) !important;
  border-left-color: #ef5350 !important;
  color: #c62828 !important;
}

.notification-card.bg-negative .notification-icon {
  color: #f44336 !important;
}

.notification-card.bg-info {
  background: linear-gradient(135deg, #e3f2fd 0%, #f1f7fc 100%) !important;
  border-left-color: #42a5f5 !important;
  color: #1565c0 !important;
}

.notification-card.bg-info .notification-icon {
  color: #2196f3 !important;
}

/* Notificación leída - más tenue */
.notification-card.leida {
  opacity: 0.5;
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%) !important;
  border-left-color: #bdbdbd !important;
}

.notification-card.leida .notification-icon {
  color: #9e9e9e !important;
}

/* Asegurar que el texto sea visible */
.notification-card :deep(.text-subtitle2),
.notification-card :deep(.text-body2),
.notification-card :deep(.text-caption) {
  color: inherit !important;
}

/* Hover effect */
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
    opacity: 0.7;
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

.notification-card {
  padding: 8px 10px !important;
}

.notification-card :deep(.text-subtitle2) {
  font-size: 12px !important;
  line-height: 1.2 !important;
}

.notification-card :deep(.text-body2) {
  font-size: 11px !important;
  line-height: 1.3 !important;
}

.notification-card :deep(.text-caption) {
  font-size: 10px !important;
}

.notification-icon {
  font-size: 24px !important;
  width: 24px !important;
  height: 24px !important;
}

/* 🆕 ESTILOS PARA EL MAPA ESTÁTICO */
.map-preview {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-preview:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.map-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-weight: 600;
}

.map-preview:hover .map-overlay {
  opacity: 1;
}

.map-overlay .q-icon {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
</style>
