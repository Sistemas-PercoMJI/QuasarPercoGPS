<template>
  <q-card
    style="width: 340px; height: 400px; max-height: 80vh"
    class="column no-wrap notification-panel"
  >
    <!-- Header con gradiente -->
    <q-card-section
      class="row items-center text-white q-pa-sm header-animated"
      style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
    >
      <q-icon name="notifications" size="20px" class="q-mr-xs icon-animated" />
      <div class="text-subtitle1 text-weight-bold">Notificaciones</div>
      <q-badge v-if="totalNoLeidas > 0" color="white" text-color="red" class="q-ml-sm">
        {{ totalNoLeidas }}
      </q-badge>
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
        <q-badge v-if="notificacionesActivas.length > 0" color="red" class="q-ml-xs">
          {{ notificacionesActivas.length }}
        </q-badge>
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
    <q-scroll-area class="scroll-area-animated">
      <div
        v-if="notificacionesFiltradas.length === 0"
        class="q-pa-lg text-center text-grey-6 empty-state"
      >
        <q-icon name="notifications_none" size="64px" class="q-mb-md empty-icon" />
        <div class="text-body2">
          {{ vistaActual === 'leidas' ? 'No hay notificaciones leídas' : 'No hay notificaciones' }}
        </div>
      </div>

      <div v-else class="q-pa-sm">
        <transition-group name="notification-list" tag="div">
          <NotificationCard
            v-for="(notif, index) in notificacionesFiltradas"
            :key="notif.id"
            :type="notif.type"
            :title="notif.title"
            :message="notif.message"
            :timestamp="notif.timestamp"
            :leida="notif.leida"
            :map-image="notif.mapImage"
            :map-url="notif.mapUrl"
            @close="removeNotification(notif.id)"
            @click="!notif.leida && marcarComoLeida(notif.id)"
            :style="{ transitionDelay: `${index * 50}ms` }"
          />
        </transition-group>
      </div>
    </q-scroll-area>

    <q-separator />

    <!-- Footer -->
    <q-card-actions align="right" class="q-pa-sm bg-grey-1 footer-animated">
      <q-btn
        v-if="vistaActual === 'leidas'"
        flat
        dense
        label="Limpiar historial"
        color="negative"
        icon="delete_sweep"
        size="sm"
        @click="limpiarHistorial"
        :disable="notificacionesLeidas.length === 0"
        class="clear-btn"
      />
      <q-btn
        v-else
        flat
        dense
        label="Marcar todas como leídas"
        color="primary"
        icon="done_all"
        size="sm"
        @click="clearAll"
        :disable="notificacionesActivas.length === 0"
        class="clear-btn"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNotifications } from 'src/composables/useNotifications'
import NotificationCard from './NotificationCard.vue'

const {
  notificacionesActivas,
  notificacionesLeidas,
  // notificacionesImportantes,
  totalNoLeidas,
  marcarComoLeida,
  removeNotification,
  clearAll,
  limpiarHistorial,
} = useNotifications()

// Estado del tab activo
const vistaActual = ref('todas')

// Filtrar notificaciones según el tab seleccionado
const notificacionesFiltradas = computed(() => {
  if (vistaActual.value === 'todas') {
    return notificacionesActivas.value
  } else if (vistaActual.value === 'leidas') {
    return notificacionesLeidas.value
  }
  return []
})
</script>

<style scoped>
/* Animación del panel completo */
.notification-panel {
  overflow: hidden !important;
  display: flex;
  flex-direction: column;
}
.notification-panel > * {
  flex-shrink: 0;
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
  padding: 8px 12px;
  gap: 8px;
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
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 🎨 SCROLLBAR MODERNO Y DISCRETO */
.scroll-area-animated :deep(.q-scrollarea__bar) {
  width: 8px;
  right: 0;
  background: transparent;
}

.scroll-area-animated :deep(.q-scrollarea__thumb) {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  border-radius: 4px;
  width: 4px !important;
  right: 2px;
  opacity: 0;
  transition: all 0.3s ease;
}

.scroll-area-animated:hover :deep(.q-scrollarea__thumb) {
  opacity: 0.6;
}

.scroll-area-animated :deep(.q-scrollarea__thumb):hover {
  opacity: 1 !important;
  width: 6px !important;
}

.scroll-area-animated :deep(.q-scrollarea__content) {
  padding-right: 8px;
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
  box-shadow: 0 2px 8px rgba(187, 0, 0, 0.3);
}

.clear-btn:active {
  transform: scale(0.95);
}
</style>
