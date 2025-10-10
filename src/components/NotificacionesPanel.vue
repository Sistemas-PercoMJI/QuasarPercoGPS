<template>
  <q-card style="width: 380px; max-height: 500px" class="column no-wrap notification-panel">
    <!-- Header con gradiente -->
    <q-card-section
      class="row items-center text-white q-pa-sm header-animated"
      style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
    >
      <q-icon name="notifications" size="20px" class="q-mr-xs icon-animated" />
      <div class="text-subtitle1 text-weight-bold">Notificaciones</div>
      <q-space />
      <q-btn icon="close" flat round dense size="sm" v-close-popup class="close-btn-animated" />
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
    <q-scroll-area style="height: 380px" class="scroll-area-animated">
      <div
        v-if="notificacionesFiltradas.length === 0"
        class="q-pa-lg text-center text-grey-6 empty-state"
      >
        <q-icon name="notifications_none" size="64px" class="q-mb-md empty-icon" />
        <div class="text-body2">No hay notificaciones</div>
      </div>

      <div v-else class="q-pa-sm">
        <transition-group name="notification-list" tag="div">
          <NotificationCard
            v-for="(notif, index) in notificacionesFiltradas"
            :key="notif.id"
            :type="notif.type"
            :title="notif.title"
            :message="notif.message"
            @close="removeNotification(notif.id)"
            :style="{ transitionDelay: `${index * 50}ms` }"
          />
        </transition-group>
      </div>
    </q-scroll-area>

    <q-separator />

    <!-- Footer -->
    <q-card-actions align="right" class="q-pa-sm bg-grey-1 footer-animated">
      <q-btn
        flat
        dense
        label="Limpiar todas"
        color="negative"
        icon="delete_sweep"
        size="sm"
        @click="clearAll"
        :disable="notifications.length === 0"
        class="clear-btn"
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
    return notifications.value.filter((n) => n.type === 'warning' || n.type === 'negative')
  } else if (vistaActual.value === 'leidas') {
    return []
  }
  return notifications.value
})
</script>

<style scoped>
/* Animación del panel completo */
.notification-panel {
  animation: slideDown 0.3s ease-out;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animación del header */
.header-animated {
  transition: all 0.3s ease;
}

.icon-animated {
  animation: bellRing 1s ease-in-out;
}

@keyframes bellRing {
  0%,
  100% {
    transform: rotate(0deg);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: rotate(-10deg);
  }
  20%,
  40%,
  60%,
  80% {
    transform: rotate(10deg);
  }
}

.close-btn-animated {
  transition: all 0.3s ease;
}

.close-btn-animated:hover {
  transform: rotate(90deg);
  background: rgba(255, 255, 255, 0.1);
}

/* Tabs modernos con animación */
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  font-weight: 500;
  font-size: 12px;
  position: relative;
  overflow: hidden;
}

.tab-item::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.tab-item:hover {
  background: #e0e0e0;
  color: #333;
  transform: translateY(-2px);
}

.tab-item:hover::before {
  width: 80%;
}

.tab-item.active {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(187, 0, 0, 0.3);
  transform: scale(1.05);
}

.tab-item.active::before {
  width: 0;
}

/* Animación del área de scroll */
.scroll-area-animated {
  transition: all 0.3s ease;
}

/* Estado vacío animado */
.empty-state {
  animation: fadeIn 0.5s ease-out;
}

.empty-icon {
  animation: float 3s ease-in-out infinite;
  opacity: 0.5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Animación de lista de notificaciones */
.notification-list-enter-active {
  animation: slideInRight 0.4s ease-out;
}

.notification-list-leave-active {
  animation: slideOutLeft 0.3s ease-in;
}

.notification-list-move {
  transition: transform 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutLeft {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-30px) scale(0.8);
  }
}

/* Footer animado */
.footer-animated {
  transition: all 0.3s ease;
}

.clear-btn {
  transition: all 0.3s ease;
}

.clear-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.clear-btn:active {
  transform: scale(0.95);
}
</style>
