<template>
  <q-card style="width: 380px; max-height: 500px" class="column no-wrap">
    <!-- Header con gradiente -->
    <q-card-section
      class="row items-center text-white q-pa-sm"
      style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
    >
      <q-icon name="notifications" size="20px" class="q-mr-xs" />
      <div class="text-subtitle1 text-weight-bold">Notificaciones</div>
      <q-space />
      <q-btn icon="close" flat round dense size="sm" v-close-popup />
    </q-card-section>

    <!-- TABS MODERNOS -->
    <div class="modern-tabs">
      <div
        class="tab-item"
        :class="{ active: vistaActual === 'todas' }"
        @click="vistaActual = 'todas'"
      >
        <q-icon name="notifications" size="18px" />
        <span>Todas</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: vistaActual === 'importantes' }"
        @click="vistaActual = 'importantes'"
      >
        <q-icon name="priority_high" size="18px" />
        <span>Importantes</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: vistaActual === 'leidas' }"
        @click="vistaActual = 'leidas'"
      >
        <q-icon name="done_all" size="18px" />
        <span>Leídas</span>
      </div>
    </div>

    <q-separator />

    <!-- Contenido scrolleable según tab seleccionado -->
    <q-scroll-area style="height: 380px">
      <div v-if="notificacionesFiltradas.length === 0" class="q-pa-lg text-center text-grey-6">
        <q-icon name="notifications_none" size="64px" class="q-mb-md" />
        <div class="text-body2">No hay notificaciones</div>
      </div>

      <div v-else class="q-pa-sm">
        <NotificationCard
          v-for="notif in notificacionesFiltradas"
          :key="notif.id"
          :type="notif.type"
          :title="notif.title"
          :message="notif.message"
          @close="removeNotification(notif.id)"
        />
      </div>
    </q-scroll-area>

    <q-separator />

    <!-- Footer -->
    <q-card-actions align="right" class="q-pa-sm bg-grey-1">
      <q-btn
        flat
        dense
        label="Limpiar todas"
        color="negative"
        icon="delete_sweep"
        size="sm"
        @click="clearAll"
        :disable="notifications.length === 0"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotifications } from 'src/composables/useNotifications'
import NotificationCard from './NotificationCard.vue'

const { notifications, removeNotification, clearAll } = useNotifications()

// Estado del tab activo
const vistaActual = ref('todas')

// Filtrar notificaciones según el tab seleccionado
const notificacionesFiltradas = computed(() => {
  if (vistaActual.value === 'todas') {
    return notifications.value
  } else if (vistaActual.value === 'importantes') {
    // Filtrar solo las de tipo warning o negative
    return notifications.value.filter((n) => n.type === 'warning' || n.type === 'negative')
  } else if (vistaActual.value === 'leidas') {
    // Por ahora retorna vacío, luego puedes agregar lógica de "leídas"
    return []
  }
  return notifications.value
})
</script>

<style scoped>
/* Tabs modernos */
.modern-tabs {
  display: flex;
  background: #f5f5f5;
  padding: 4px;
  gap: 4px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  font-weight: 500;
  font-size: 12px;
}

.tab-item:hover {
  background: #e0e0e0;
  color: #333;
}

.tab-item.active {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(187, 0, 0, 0.3);
}
</style>
