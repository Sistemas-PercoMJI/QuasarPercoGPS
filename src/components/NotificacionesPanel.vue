<template>
  <q-card style="width: 380px; max-height: 500px" class="column no-wrap">
    <!-- Header compacto con gradiente -->
    <q-card-section
      class="row items-center text-white q-pa-sm"
      style="background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%)"
    >
      <q-icon name="notifications" size="20px" class="q-mr-xs" />
      <div class="text-subtitle1 text-weight-bold">Notificaciones</div>
      <q-space />
      <q-btn icon="close" flat round dense size="sm" v-close-popup />
    </q-card-section>

    <q-separator />

    <!-- Contenido scrolleable -->
    <q-scroll-area style="height: 380px">
      <div v-if="notifications.length === 0" class="q-pa-lg text-center text-grey-6">
        <q-icon name="notifications_none" size="64px" class="q-mb-md" />
        <div class="text-body2">No hay notificaciones</div>
      </div>

      <div v-else class="q-pa-sm">
        <NotificationCard
          v-for="(notif, index) in notifications"
          :key="notif.id"
          :type="notif.type"
          :title="notif.title"
          :message="notif.message"
          @close="removeNotification(index)"
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
import { useNotifications } from 'src/composables/useNotifications'
import NotificationCard from './NotificationCard.vue'

const { notifications, removeNotification, clearAll } = useNotifications()
</script>
