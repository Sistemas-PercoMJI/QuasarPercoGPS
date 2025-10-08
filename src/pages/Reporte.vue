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
      <!-- Tab de Crear Reporte -->
      <q-tab-panel name="crear">
        <div class="text-h5 q-mb-lg">Generar nuevo informe</div>

        <div class="row q-col-gutter-md">
          <!-- Columna izquierda -->
          <div class="col-12 col-md-6">
            <!-- Seleccionar informe -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Seleccionar informe</div>
              <q-select
                v-model="tipoInforme"
                :options="tiposInforme"
                outlined
                dense
                label="Informe de eventos"
              />
            </div>

            <!-- Reportar por -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Reportar por</div>
              <q-select
                v-model="reportarPor"
                :options="opcionesReportar"
                outlined
                dense
                label="Objetos"
              />
            </div>

            <!-- Objetos -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Objetos</div>
              <q-select
                v-model="objetos"
                :options="listaObjetos"
                outlined
                dense
                use-input
                use-chips
                multiple
                input-debounce="0"
                placeholder="Seleccionar objetos..."
              />
            </div>

            <!-- Eventos -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Eventos</div>
              <q-select
                v-model="eventos"
                :options="listaEventos"
                outlined
                dense
                use-input
                use-chips
                multiple
                input-debounce="0"
                placeholder="Seleccionar eventos..."
              />
            </div>

            <!-- Agrupar por -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Agrupar por</div>
              <q-select
                v-model="agruparPor"
                :options="opcionesAgrupar"
                outlined
                dense
                label="Objetos"
              />
              <q-checkbox v-model="mostrarUnidades" label="Mostrar unidades" class="q-mt-sm" />
            </div>
          </div>

          <!-- Columna derecha -->
          <div class="col-12 col-md-6">
            <!-- Rango de fecha -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Rango de fecha</div>
              <q-input v-model="rangoFecha" outlined dense placeholder="Elegir rango de fechas">
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="rangoFecha" range>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Cerrar" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <!-- Lista de columnas -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Lista de columnas</div>
              <div class="q-gutter-sm">
                <q-chip
                  v-for="col in columnasSeleccionadas"
                  :key="col"
                  removable
                  @remove="removerColumna(col)"
                  color="primary"
                  text-color="white"
                >
                  {{ col }}
                </q-chip>
              </div>

              <q-checkbox
                v-model="mostrarResumen"
                label="Mostrar resumen del informe"
                class="q-mt-md"
              />

              <div class="text-subtitle2 q-mt-md q-mb-sm">Columnas en resumen</div>
              <div class="q-gutter-sm">
                <q-btn size="sm" outline color="grey-7" label="Objetos" />
                <q-btn size="sm" outline color="grey-7" label="Recuento de eventos" />
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="row q-gutter-md q-mt-lg">
          <q-btn
            color="primary"
            label="Generar"
            icon="description"
            unelevated
            style="width: 200px"
            @click="generarReporte"
          />
          <q-btn outline color="grey-7" label="Cancelar" style="width: 200px" />
        </div>
      </q-tab-panel>

      <!-- Tab de Historial -->
      <q-tab-panel name="historial">
        <div class="text-h6 q-mb-md">Historial de Reportes</div>
        <p class="text-grey-7">Lista de reportes generados anteriormente</p>

        <!-- Aquí puedes agregar una tabla con los reportes anteriores -->
        <q-table
          flat
          bordered
          :rows="reportesAnteriores"
          :columns="columnasHistorial"
          row-key="id"
          class="q-mt-md"
        >
          <template v-slot:body-cell-acciones="props">
            <q-td :props="props">
              <q-btn flat dense icon="visibility" color="primary" size="sm">
                <q-tooltip>Ver</q-tooltip>
              </q-btn>
              <q-btn flat dense icon="download" color="primary" size="sm">
                <q-tooltip>Descargar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const tab = ref('crear')

// Datos del formulario
const tipoInforme = ref('Informe de eventos')
const reportarPor = ref('Objetos')
const objetos = ref([])
const eventos = ref([])
const agruparPor = ref('Objetos')
const mostrarUnidades = ref(false)
const rangoFecha = ref('')
const columnasSeleccionadas = ref([
  'Nombre de evento',
  'Hora de inicio de evento',
  'Duración',
  'Ubicación de eventos',
])
const mostrarResumen = ref(true)

// Opciones
const tiposInforme = [
  'Informe de eventos',
  'Informe de viajes',
  'Informe de combustible',
  'Informe de velocidad',
]

const opcionesReportar = ['Objetos', 'Grupos', 'Conductores']
const opcionesAgrupar = ['Objetos', 'Eventos', 'Fecha']

const listaObjetos = ['Vehículo 1', 'Vehículo 2', 'Vehículo 3', 'Camión 001', 'Camión 002']

const listaEventos = [
  'Exceso de velocidad',
  'Entrada a gezona',
  'Salida de gezona',
  'Ralentí prolongado',
  'Frenado brusco',
]

// Historial
const columnasHistorial = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left' },
  { name: 'tipo', label: 'Tipo de Reporte', field: 'tipo', align: 'left' },
  { name: 'objetos', label: 'Objetos', field: 'objetos', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'center' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' },
]

const reportesAnteriores = ref([
  {
    id: 1,
    fecha: '2025-10-08 14:30',
    tipo: 'Informe de eventos',
    objetos: 'Camión 001, Camión 002',
    estado: 'Completado',
  },
  {
    id: 2,
    fecha: '2025-10-07 10:15',
    tipo: 'Informe de viajes',
    objetos: 'Todos',
    estado: 'Completado',
  },
  {
    id: 3,
    fecha: '2025-10-06 16:45',
    tipo: 'Informe de velocidad',
    objetos: 'Vehículo 1',
    estado: 'Completado',
  },
])

const removerColumna = (col) => {
  const index = columnasSeleccionadas.value.indexOf(col)
  if (index > -1) {
    columnasSeleccionadas.value.splice(index, 1)
  }
}

const generarReporte = () => {
  $q.notify({
    type: 'positive',
    message: 'Generando reporte...',
    icon: 'description',
  })

  console.log('Generar reporte con:', {
    tipoInforme: tipoInforme.value,
    objetos: objetos.value,
    eventos: eventos.value,
    rangoFecha: rangoFecha.value,
  })
}
</script>
