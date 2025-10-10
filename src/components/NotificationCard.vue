<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <q-card :class="`bg-${type}`" class="q-mb-md q-pa-md shadow-2 rounded-borders notification-card">
    <div class="row items-center">
      <q-icon :name="icon" size="md" class="q-mr-sm" />
      <div class="col">
        <div class="text-subtitle1">{{ title }}</div>
        <div class="text-body2">{{ message }}</div>
      </div>
      <q-btn flat round icon="close" @click="$emit('close')" class="q-ml-md" />
    </div>
  </q-card>
</template>

<script setup>
const props = defineProps({
  type: { type: String, default: 'info' }, // info, positive, negative, warning
  title: { type: String, default: '' },
  message: { type: String, default: '' },
})

const iconMap = {
  info: 'info',
  positive: 'check_circle',
  negative: 'error',
  warning: 'warning',
}
const icon = iconMap[props.type] || 'info'
</script>

<style scoped>
.notification-card {
  transition: opacity 0.3s;
  opacity: 1;
}
</style>
