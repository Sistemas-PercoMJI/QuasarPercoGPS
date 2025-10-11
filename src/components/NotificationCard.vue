<template>
  <q-card :class="`bg-${type}`" class="q-mb-md q-pa-md shadow-2 rounded-borders notification-card">
    <div class="row items-center">
      <q-icon :name="icon" size="md" class="q-mr-sm notification-icon" />
      <div class="col">
        <div class="text-subtitle1">{{ title }}</div>
        <div class="text-body2">{{ message }}</div>
      </div>
      <q-btn flat round icon="close" @click="handleClose" class="q-ml-md close-btn" />
    </div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'info' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const iconMap = {
  info: 'info',
  positive: 'check_circle',
  negative: 'error',
  warning: 'warning',
}

const icon = computed(() => iconMap[props.type] || 'info')

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.notification-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-left: 4px solid rgba(0, 0, 0, 0.2);
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
