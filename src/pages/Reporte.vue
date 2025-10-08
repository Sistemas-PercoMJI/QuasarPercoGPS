<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <q-page padding>
    <div class="text-h4 q-mb-md">Reportes</div>

    <q-tabs
      v-model="tab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="crear" icon="add" label="Crear Reporte" />
      <q-tab name="historial" icon="history" label="Historial" />
    </q-tabs>

    <q-separator class="q-my-md" />

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="crear">
        <div class="text-h6 q-mb-md">Crear Nuevo Reporte</div>
        <p>Aquí irá el formulario para crear reportes</p>

        <q-btn color="primary" label="Generar Reporte" icon="file_download" />
      </q-tab-panel>

      <q-tab-panel name="historial">
        <div class="text-h6 q-mb-md">Historial de Reportes</div>
        <p>Lista de reportes generados anteriormente</p>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const tab = ref('crear')
</script>
