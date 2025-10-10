<template>
  <q-card style="width: 400px; max-width: 90vw; max-height: 600px" class="column">
    <q-card-section class="row items-center q-pb-none bg-primary text-white">
      <div class="text-h6 text-weight-bold">Notificaciones</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-separator />

    <q-card-section class="col scroll q-pa-none">
      <q-scroll-area style="height: 500px">
        <div v-if="notifications.length === 0" class="q-pa-lg text-center text-grey-6">
          <q-icon name="notifications_none" size="64px" class="q-mb-md" />
          <div>No hay notificaciones</div>
        </div>

        <div v-else class="q-pa-md">
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
    </q-card-section>

    <q-separator />

    <q-card-actions align="right" class="q-pa-md">
      <q-btn
        flat
        label="Limpiar todas"
        color="negative"
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
