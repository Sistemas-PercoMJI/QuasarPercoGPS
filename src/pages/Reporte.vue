<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md">Reportes</div>

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
        <!-- 🎯 HEADER CON TÍTULO Y SUBTÍTULO -->
        <div class="q-mb-lg">
          <div class="text-h5 text-weight-bold">
            <q-icon name="description" size="sm" class="q-mr-sm" />
            Generar nuevo informe
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Configura los parámetros de tu reporte personalizado
          </div>
        </div>

        <!-- 📋 CARD: TIPO DE INFORME -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="bg-grey-2">
            <div class="text-h6">
              <q-icon name="assessment" class="q-mr-sm" color="primary" />
              Tipo de informe
            </div>
          </q-card-section>

          <q-card-section>
            <q-select
              v-model="tipoInformeSeleccionado"
              :options="listaTiposInforme"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="cambiarTipoInforme"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-icon :name="scope.opt.icon" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.descripcion }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </q-card-section>
        </q-card>

        <div class="row q-col-gutter-md">
          <!-- COLUMNA IZQUIERDA -->
          <div class="col-12 col-md-6">
            <!-- 🎯 CARD: CONFIGURACIÓN BÁSICA -->
            <q-card flat bordered class="q-mb-md">
              <q-card-section class="bg-grey-2">
                <div class="text-h6">
                  <q-icon name="settings" class="q-mr-sm" color="primary" />
                  Configuración Básica
                </div>
              </q-card-section>

              <q-card-section>
                <!-- Reportar por -->
                <div class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Reportar por</div>
                  <q-select
                    v-model="reportarPor"
                    :options="opcionesReportar"
                    outlined
                    dense
                    label="Unidades"
                    @update:model-value="cargarOpcionesSelector"
                  />
                </div>

                <!-- Selector dinámico -->
                <div class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">{{ etiquetaSelector }}</div>
                  <q-select
                    ref="selectorElementos"
                    v-model="elementosSeleccionados"
                    :options="opcionesSelectorFiltradas"
                    outlined
                    dense
                    use-input
                    use-chips
                    multiple
                    input-debounce="300"
                    :placeholder="`Buscar ${reportarPor.toLowerCase()}...`"
                    :loading="loadingOpciones"
                    @filter="filtrarOpcionesSelector"
                  >
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          No se encontraron resultados
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>

                <!-- Rango de fecha -->
                <div class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Rango de fecha</div>
                  <q-input
                    :model-value="rangoFechaFormateado"
                    outlined
                    dense
                    placeholder="Elegir rango de fechas"
                    readonly
                  >
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer">
                        <q-popup-proxy
                          ref="dateProxy"
                          cover
                          transition-show="scale"
                          transition-hide="scale"
                        >
                          <q-date v-model="rangoFechaTemporal" range>
                            <div class="row items-center justify-end q-gutter-sm">
                              <q-btn label="Cancelar" color="grey-7" flat v-close-popup />
                              <q-btn
                                label="Aceptar"
                                color="primary"
                                flat
                                v-close-popup
                                @click="aplicarRangoFecha"
                              />
                            </div>
                          </q-date>
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </q-card-section>
            </q-card>

            <!-- 🎯 CARD: FILTROS (solo si tiene eventos) -->
            <q-card v-if="tieneOpcion('seleccionarEventos')" flat bordered class="q-mb-md">
              <q-card-section class="bg-grey-2">
                <div class="text-h6">
                  <q-icon name="filter_alt" class="q-mr-sm" color="primary" />
                  Filtros
                </div>
              </q-card-section>

              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Eventos</div>
                <q-select
                  ref="selectorEventos"
                  v-model="eventos"
                  :options="eventosDisponiblesFiltrados"
                  outlined
                  dense
                  use-input
                  use-chips
                  multiple
                  input-debounce="300"
                  placeholder="Buscar eventos..."
                  :loading="loadingEventos"
                  @filter="filtrarEventos"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey"> No se encontraron eventos </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </q-card-section>
            </q-card>

            <!-- 🎯 CARD: OPCIONES ESPECÍFICAS -->
            <q-card
              v-if="
                tieneOpcion('metodoAgrupacion') ||
                tieneOpcion('diasLaborables') ||
                tieneOpcion('horarioLaboral') ||
                tieneOpcion('tipoInformeComercial') ||
                tieneOpcion('tipoDetalle')
              "
              flat
              bordered
              class="q-mb-md"
            >
              <q-card-section class="bg-grey-2">
                <div class="text-h6">
                  <q-icon name="tune" class="q-mr-sm" color="primary" />
                  Opciones Específicas
                </div>
              </q-card-section>

              <q-card-section>
                <!-- Método de agrupación -->
                <div v-if="tieneOpcion('metodoAgrupacion')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Agrupar por</div>
                  <q-select
                    v-model="metodoAgrupacion"
                    :options="METODOS_AGRUPACION"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>

                <!-- Días laborables -->
                <div v-if="tieneOpcion('diasLaborables')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Días laborables</div>
                  <div class="row q-gutter-sm">
                    <q-checkbox
                      v-for="dia in DIAS_SEMANA"
                      :key="dia.value"
                      v-model="diasLaborablesSeleccionados"
                      :val="dia.value"
                      :label="dia.abrev"
                      dense
                    />
                  </div>
                </div>

                <!-- Horario laboral -->
                <div v-if="tieneOpcion('horarioLaboral')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Horario laboral</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <q-input
                        v-model="horarioInicio"
                        outlined
                        dense
                        label="Hora inicio"
                        mask="time"
                        :rules="['time']"
                      >
                        <template v-slot:append>
                          <q-icon name="access_time" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-time v-model="horarioInicio" format24h>
                                <div class="row items-center justify-end">
                                  <q-btn v-close-popup label="Cerrar" color="primary" flat />
                                </div>
                              </q-time>
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                    <div class="col-6">
                      <q-input
                        v-model="horarioFin"
                        outlined
                        dense
                        label="Hora fin"
                        mask="time"
                        :rules="['time']"
                      >
                        <template v-slot:append>
                          <q-icon name="access_time" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-time v-model="horarioFin" format24h>
                                <div class="row items-center justify-end">
                                  <q-btn v-close-popup label="Cerrar" color="primary" flat />
                                </div>
                              </q-time>
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>
                </div>

                <!-- Tipo de informe comercial -->
                <div v-if="tieneOpcion('tipoInformeComercial')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Tipo de informe comercial</div>
                  <q-select
                    v-model="tipoInformeComercial"
                    :options="TIPOS_INFORME_COMERCIAL"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>

                <!-- Tipo de detalle -->
                <div v-if="tieneOpcion('tipoDetalle')">
                  <div class="text-subtitle2 q-mb-sm">Datos del informe proporcionados</div>
                  <q-select
                    v-model="tipoDetalle"
                    :options="TIPOS_DETALLE"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- COLUMNA DERECHA -->
          <div class="col-12 col-md-6">
            <!-- 🎯 CARD: OPCIONES DE VISUALIZACIÓN -->
            <!-- 🎯 CARD: OPCIONES DE VISUALIZACIÓN -->
            <q-card
              v-if="
                (tieneOpcion('mostrarMapaTrayecto') || tieneOpcion('mostrarMapaZona')) &&
                tipoInformeSeleccionado !== 'eventos'
              "
              flat
              bordered
              class="q-mb-md"
            >
              <q-card-section class="bg-grey-2">
                <div class="text-h6">
                  <q-icon name="visibility" class="q-mr-sm" color="primary" />
                  Opciones de Visualización
                </div>
              </q-card-section>

              <q-card-section>
                <!-- Opciones de mapa para Trayectos -->
                <div v-if="tieneOpcion('mostrarMapaTrayecto')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Opciones de mapa</div>
                  <q-checkbox
                    v-model="mostrarMapaTrayecto"
                    label="Mostrar mapa del trayecto"
                    class="q-mb-sm"
                  />
                  <q-checkbox
                    v-model="mostrarUnidadesMapa"
                    label="Mostrar unidades en el mapa"
                    class="q-mb-sm"
                    :disable="!mostrarMapaTrayecto"
                  />
                  <q-checkbox
                    v-model="mostrarPlacaMapa"
                    label="Mostrar número de placa"
                    :disable="!mostrarMapaTrayecto"
                  />
                </div>

                <!-- Opción de mapa para Horas de Trabajo -->
                <div v-if="tieneOpcion('mostrarMapaZona')" class="q-mb-md">
                  <div class="text-subtitle2 q-mb-sm">Opciones del informe</div>
                  <div class="column q-gutter-sm">
                    <q-checkbox v-model="mostrarMapaZona" label="Mostrar mapa de la zona" />
                    <q-checkbox
                      v-if="tipoInformeSeleccionado === 'horas_trabajo'"
                      v-model="remarcarHorasExtra"
                      label="Remarcar horas fuera de horario laboral"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <!-- 🎯 CARD: PERSONALIZACIÓN DE COLUMNAS -->
            <q-card v-if="tieneOpcion('seleccionColumnas')" flat bordered class="q-mb-md">
              <q-card-section class="bg-grey-2">
                <div class="row items-center justify-between">
                  <div class="text-h6">
                    <q-icon name="view_column" class="q-mr-sm" color="primary" />
                    Personalización de Columnas
                  </div>
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="refresh"
                    color="primary"
                    label="Restaurar"
                    @click="onResetearColumnas"
                  >
                    <q-tooltip>Volver a las columnas por defecto</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>

              <q-card-section>
                <!-- Buscador de columnas -->
                <q-select
                  v-model="columnasSeleccionadas"
                  :options="columnasDisponiblesFiltradas"
                  outlined
                  dense
                  use-input
                  multiple
                  input-debounce="0"
                  placeholder="Buscar y agregar columnas..."
                  @filter="filtrarColumnas"
                >
                  <template v-slot:prepend>
                    <q-icon name="add" />
                  </template>

                  <template v-slot:selected>
                    <span></span>
                  </template>
                </q-select>

                <!-- Columnas seleccionadas (chips externos) -->
                <div v-if="columnasSeleccionadas.length > 0" class="q-mt-md">
                  <div class="text-caption text-grey-7 q-mb-sm">
                    {{ columnasSeleccionadas.length }} columnas seleccionadas
                  </div>
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
                </div>

                <q-separator class="q-my-md" />

                <q-checkbox v-model="mostrarResumen" label="Mostrar resumen del informe" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- 🎯 BOTONES DE ACCIÓN (SIEMPRE VISIBLES) -->
        <q-card flat bordered class="q-mt-lg">
          <q-card-section class="bg-grey-1">
            <div class="row q-gutter-md justify-center">
              <q-btn
                color="negative"
                label="Generar PDF"
                icon="picture_as_pdf"
                unelevated
                class="btn-report-action btn-pdf"
                style="min-width: 200px"
                @click="generarReporte"
                :loading="generando"
                :disable="generando"
              />
              <q-btn
                color="positive"
                label="Generar Excel"
                icon="table_chart"
                unelevated
                class="btn-report-action btn-excel"
                style="min-width: 200px"
                @click="generarExcel"
                :loading="generando"
                :disable="generando"
              />
              <q-btn
                outline
                color="grey-7"
                label="Cancelar"
                icon="close"
                class="btn-report-action btn-cancel"
                style="min-width: 200px"
                @click="cancelarReporte"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Tab de Historial -->
      <q-tab-panel name="historial">
        <div class="text-h6 q-mb-md">Historial de Reportes</div>
        <p class="text-grey-7">Lista de reportes generados anteriormente</p>

        <q-table
          flat
          bordered
          :rows="reportesAnteriores"
          :columns="columnasHistorial"
          row-key="id"
          :loading="loading"
          class="q-mt-md"
        >
          <template v-slot:body-cell-tipo="props">
            <q-td :props="props">
              <q-chip
                :color="props.row.tipoArchivo === 'pdf' ? 'red' : 'green'"
                text-color="white"
                size="sm"
              >
                <q-icon
                  :name="props.row.tipoArchivo === 'pdf' ? 'picture_as_pdf' : 'table_chart'"
                  size="xs"
                  class="q-mr-xs"
                />
                {{ props.row.tipo }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-acciones="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                icon="download"
                color="primary"
                size="sm"
                :href="props.row.downloadURL"
                target="_blank"
              >
                <q-tooltip>Descargar</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="open_in_new"
                color="primary"
                size="sm"
                :href="props.row.downloadURL"
                target="_blank"
              >
                <q-tooltip>Ver en nueva pestaña</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { getAuth } from 'firebase/auth'

// 🔥 IMPORTS ACTUALIZADOS
import { useReportes } from 'src/composables/useReportes'
import { useReportePDF } from 'src/composables/useReportePDF'
const { generarPDFEventos, generarPDFTrayectos, generarPDFHorasTrabajo } = useReportePDF()
import { useReporteExcel } from 'src/composables/useReporteExcel'
import { useReportesStorage } from 'src/composables/useReportesStorage'
import { useColumnasReportes } from 'src/composables/useColumnasReportes'
import { useTiposInforme } from 'src/composables/useTiposInforme'
import { useEventos } from 'src/composables/useEventos'

// 🆕 NUEVOS IMPORTS - Para los 3 tipos de informes
import { useReportesEventos } from 'src/composables/useReportesEventos'
import { useReportesTrayectos } from 'src/composables/useReportesTrayectos'
import { useReportesHorasTrabajo } from 'src/composables/useReportesHorasTrabajo'

const $q = useQuasar()
const auth = getAuth()
const userId = ref(null)
const tab = ref('crear')
const remarcarHorasExtra = ref(true)

// Composables
const { subirReporte, obtenerHistorialReportes, formatearTamaño } = useReportesStorage()

const { obtenerGeozonas, obtenerGruposConductores, obtenerUnidades, obtenerConductores } =
  useReportes()

const {
  tipoInformeSeleccionado,
  listaTiposInforme,
  cambiarTipoInforme: cambiarTipoInformeOriginal,
  tieneOpcion,
  METODOS_AGRUPACION,
  TIPOS_INFORME_COMERCIAL,
  TIPOS_DETALLE,
  DIAS_SEMANA,
  setInstanciaColumnas,
} = useTiposInforme()

const instanciaColumnas = useColumnasReportes()
setInstanciaColumnas(instanciaColumnas)
const {
  columnasSeleccionadas,
  mostrarResumen,
  columnasDisponiblesFiltradas,
  removerColumna,
  filtrarColumnas,
  obtenerConfiguracionColumnas,
  procesarNotificacionesParaReporte,
  generarResumen,
  cambiarTipoInforme: cambiarTipoInformeColumnas, // 👈 Nuevo
  guardarColumnasActuales, // 👈 Nuevo
  resetearColumnas, // 👈 Nuevo
} = instanciaColumnas

const { generarExcelEventos } = useReporteExcel()

// Estados
const generando = ref(false)
const loadingOpciones = ref(false)
const loadingEventos = ref(false)
const loading = ref(false)

// Estados adicionales
const metodoAgrupacion = ref('unidad')
const diasLaborablesSeleccionados = ref([1, 2, 3, 4, 5])
const horarioInicio = ref('08:00')
const horarioFin = ref('17:00')
const tipoInformeComercial = ref('todos')
const tipoDetalle = ref('dias_detallados')
const mostrarMapaTrayecto = ref(false)
const mostrarUnidadesMapa = ref(true)
const mostrarPlacaMapa = ref(true)
const mostrarMapaZona = ref(false)

// Datos del formulario
const reportarPor = ref('Unidades')
const elementosSeleccionados = ref([])
const eventos = ref([])

// Opciones
const opcionesReportar = ['Unidades', 'Conductores']
const opcionesSelector = ref([])
const listaEventosDisponibles = ref([])

// 🔥 NUEVOS REFS PARA OPCIONES FILTRADAS
const opcionesSelectorFiltradas = ref([])
const eventosDisponiblesFiltrados = ref([])

const selectorElementos = ref(null)
const selectorEventos = ref(null)

// Fechas
const rangoFecha = ref(null)
const rangoFechaTemporal = ref(null)

const rangoFechaFormateado = computed(() => {
  if (!rangoFecha.value) return ''
  if (typeof rangoFecha.value === 'object' && rangoFecha.value.from && rangoFecha.value.to) {
    return `${rangoFecha.value.from} - ${rangoFecha.value.to}`
  }
  return rangoFecha.value
})

// Historial
const reportesAnteriores = ref([])

const columnasHistorial = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'elementos', label: 'Elementos', field: 'elementos', align: 'left' },
  { name: 'periodo', label: 'Período', field: 'periodo', align: 'left' },
  { name: 'tamaño', label: 'Tamaño', field: 'tamaño', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' },
]

// Computed
const etiquetaSelector = computed(() => {
  const labels = {
    Unidades: 'Unidades',
    Conductores: 'Conductores',
    Grupos: 'Grupos de conductores',
    Geozonas: 'Geozonas',
  }
  return labels[reportarPor.value] || 'Seleccionar'
})

// 🔥 NUEVAS FUNCIONES DE FILTRADO
const filtrarOpcionesSelector = (val, update) => {
  update(() => {
    if (val === '') {
      opcionesSelectorFiltradas.value = opcionesSelector.value
    } else {
      const needle = val.toLowerCase()
      opcionesSelectorFiltradas.value = opcionesSelector.value.filter(
        (v) => v.toLowerCase().indexOf(needle) > -1,
      )
    }
  })
}

const filtrarEventos = (val, update) => {
  update(() => {
    if (val === '') {
      eventosDisponiblesFiltrados.value = listaEventosDisponibles.value
    } else {
      const needle = val.toLowerCase()
      eventosDisponiblesFiltrados.value = listaEventosDisponibles.value.filter(
        (v) => v.toLowerCase().indexOf(needle) > -1,
      )
    }
  })
}
// Métodos
const aplicarRangoFecha = () => {
  rangoFecha.value = rangoFechaTemporal.value
}

// 🆕 NUEVA: Función wrapper para cambiar tipo de informe
const cambiarTipoInforme = (nuevoTipo) => {
  // Cambiar en useTiposInforme (tu lógica existente)
  cambiarTipoInformeOriginal(nuevoTipo)

  // Cambiar en useColumnasReportes (cargar columnas guardadas)
  cambiarTipoInformeColumnas(nuevoTipo)
}

// 🆕 NUEVA: Función para resetear columnas
const onResetearColumnas = () => {
  resetearColumnas()

  $q.notify({
    type: 'info',
    message: 'Columnas restauradas por defecto',
    icon: 'refresh',
    position: 'top',
    timeout: 2000,
  })
}

const cancelarReporte = () => {
  tipoInformeSeleccionado.value = null
  reportarPor.value = 'Unidades'
  elementosSeleccionados.value = []
  eventos.value = []
  rangoFecha.value = null
  rangoFechaTemporal.value = null
  metodoAgrupacion.value = 'unidad'
  diasLaborablesSeleccionados.value = [1, 2, 3, 4, 5]
  horarioInicio.value = '08:00'
  horarioFin.value = '17:00'
  tipoInformeComercial.value = 'todos'
  tipoDetalle.value = 'dias_detallados'
  mostrarMapaTrayecto.value = false
  mostrarUnidadesMapa.value = true
  mostrarPlacaMapa.value = true
  mostrarMapaZona.value = false
  columnasSeleccionadas.value = []
  mostrarResumen.value = false
  opcionesSelector.value = []
  opcionesSelectorFiltradas.value = []

  $q.notify({
    message: 'Formulario reiniciado',
    color: 'info',
    icon: 'refresh',
    position: 'top',
    timeout: 2000,
  })
}

const cargarOpcionesSelector = async () => {
  if (!userId.value) {
    $q.notify({
      type: 'warning',
      message: 'Usuario no autenticado',
      icon: 'warning',
    })
    return
  }

  loadingOpciones.value = true

  try {
    switch (reportarPor.value) {
      case 'Unidades': {
        const unidades = await obtenerUnidades()
        // 🔥 Guardar mapeo de nombre -> ID
        window.unidadesMap = {}
        unidades.forEach((u) => {
          const nombre = u.Unidad || u.id
          window.unidadesMap[nombre] = u.id
        })
        opcionesSelector.value = unidades.map((u) => u.Unidad || u.id)
        opcionesSelectorFiltradas.value = opcionesSelector.value

        break
      }

      case 'Conductores': {
        const grupos = await obtenerGruposConductores(userId.value)
        const conductoresIdsDelUsuario = new Set()
        grupos.forEach((grupo) => {
          if (grupo.conductoresIds) {
            grupo.conductoresIds.forEach((id) => conductoresIdsDelUsuario.add(id))
          }
        })

        const todosConductores = await obtenerConductores()
        const conductoresDelUsuario = todosConductores.filter((c) =>
          conductoresIdsDelUsuario.has(c.id),
        )

        opcionesSelector.value = conductoresDelUsuario.map((c) => c.Nombre || c.id)
        opcionesSelectorFiltradas.value = opcionesSelector.value
        break
      }

      case 'Grupos': {
        const grupos = await obtenerGruposConductores(userId.value)
        opcionesSelector.value = grupos.map((g) => g.nombre || g.id)
        opcionesSelectorFiltradas.value = opcionesSelector.value
        break
      }

      case 'Geozonas': {
        const geozonas = await obtenerGeozonas(userId.value)
        opcionesSelector.value = geozonas.map((g) => g.nombre || g.id)
        opcionesSelectorFiltradas.value = opcionesSelector.value
        break
      }

      default:
        opcionesSelector.value = []
        opcionesSelectorFiltradas.value = []
    }
  } catch (error) {
    console.error('Error al cargar opciones:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al cargar las opciones',
      icon: 'error',
    })
  } finally {
    loadingOpciones.value = false
  }
}

const cargarEventosDisponibles = async () => {
  if (!userId.value) {
    console.warn('⚠️ No hay userId para cargar eventos')
    return
  }

  loadingEventos.value = true

  try {
    // Obtener instancia de useEventos con el userId actual
    const { obtenerEventos } = useEventos(userId.value)

    // Obtener todos los eventos del usuario
    const eventosDelUsuario = await obtenerEventos()

    // Extraer solo los nombres de los eventos para el selector
    listaEventosDisponibles.value = eventosDelUsuario.map((evento) => evento.nombre).filter(Boolean)
    eventosDisponiblesFiltrados.value = listaEventosDisponibles.value

    if (listaEventosDisponibles.value.length === 0) {
      console.warn('⚠️ No se encontraron eventos activos')
    }
  } catch (error) {
    console.error('❌ Error al cargar eventos desde Firebase:', error)
    listaEventosDisponibles.value = []
    eventosDisponiblesFiltrados.value = []

    $q.notify({
      type: 'negative',
      message: 'Error al cargar los eventos disponibles',
      icon: 'error',
      caption: error.message,
    })
  } finally {
    loadingEventos.value = false
  }
}

const validarFormulario = () => {
  if (!rangoFecha.value) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona un rango de fechas',
      icon: 'warning',
    })
    return false
  }

  if (elementosSeleccionados.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: `Por favor selecciona al menos un ${reportarPor.value.toLowerCase()}`,
      icon: 'warning',
    })
    return false
  }

  if (columnasSeleccionadas.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona al menos una columna',
      icon: 'warning',
    })
    return false
  }

  return true
}

// 🔥 FUNCIÓN ACTUALIZADA Y MEJORADA - PARSEO DE FECHAS ROBUSTO
const obtenerDatosReporte = async () => {
  if (!userId.value) {
    throw new Error('Usuario no autenticado')
  }

  if (!rangoFecha.value) {
    throw new Error('No se ha seleccionado ningún rango de fechas')
  }

  // ✅ HELPER PARA PARSEAR FECHAS
  const parsearFechaString = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== 'string') {
      console.error('❌ fechaStr inválido:', fechaStr)
      throw new Error(`Formato de fecha inválido: ${fechaStr}`)
    }

    const partes = fechaStr.trim().split('/').map(Number)

    if (partes.length !== 3 || partes.some(isNaN)) {
      console.error('❌ Partes de fecha inválidas:', partes)
      throw new Error(`No se pudo parsear la fecha: ${fechaStr}`)
    }

    // Detectar formato YYYY/MM/DD vs DD/MM/YYYY
    if (partes[0] > 31) {
      // Formato YYYY/MM/DD
      return new Date(partes[0], partes[1] - 1, partes[2])
    } else {
      // Formato DD/MM/YYYY
      return new Date(partes[2], partes[1] - 1, partes[0])
    }
  }

  // ✅ PARSEAR FECHAS - MANEJA TODOS LOS CASOS
  let fechaInicio, fechaFin

  if (typeof rangoFecha.value === 'object' && rangoFecha.value.from && rangoFecha.value.to) {
    fechaInicio = parsearFechaString(rangoFecha.value.from)
    fechaFin = parsearFechaString(rangoFecha.value.to)

    fechaInicio.setHours(0, 0, 0, 0)
    fechaFin.setHours(23, 59, 59, 999)
  } else if (typeof rangoFecha.value === 'string') {
    if (rangoFecha.value.includes(' - ')) {
      const [inicio, fin] = rangoFecha.value.split(' - ').map((s) => s.trim())

      fechaInicio = parsearFechaString(inicio)
      fechaFin = parsearFechaString(fin)

      fechaInicio.setHours(0, 0, 0, 0)
      fechaFin.setHours(23, 59, 59, 999)
    } else {
      fechaInicio = parsearFechaString(rangoFecha.value)
      fechaFin = parsearFechaString(rangoFecha.value)

      fechaInicio.setHours(0, 0, 0, 0)
      fechaFin.setHours(23, 59, 59, 999)
    }
  } else {
    throw new Error('Formato de fecha inválido')
  }

  // Validar que las fechas sean válidas
  if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    throw new Error('Las fechas no son válidas')
  }

  // Determinar tipo de informe
  const tipoInforme = tipoInformeSeleccionado.value || 'eventos'
  const unidadesIds = elementosSeleccionados.value

  if (unidadesIds.length === 0) {
    throw new Error('Debes seleccionar al menos una unidad')
  }

  let datosInforme = []
  let criterioPrincipal = ''
  let datosAgrupados = {}

  // 🔥 OBTENER DATOS SEGÚN TIPO
  if (tipoInforme === 'eventos') {
    const { obtenerEventosReales } = useReportesEventos()

    // 🔥 DETERMINAR QUÉ IDs PASAR A LA FUNCIÓN
    let idsParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      const todosConductores = await obtenerConductores()

      for (const nombreConductor of unidadesIds) {
        const conductor = todosConductores.find((c) => c.Nombre === nombreConductor)

        if (conductor) {
          if (conductor.UnidadAsignada) {
            idsParaBuscar.push(conductor.UnidadAsignada)
          } else {
            console.warn(`   ⚠️ Conductor sin UnidadAsignada`)
          }
        } else {
          console.warn(`❌ Conductor "${nombreConductor}" no encontrado`)
        }
      }

      if (idsParaBuscar.length === 0) {
        throw new Error('Los conductores seleccionados no tienen unidades asignadas')
      }
    } else if (reportarPor.value === 'Unidades') {
      idsParaBuscar = unidadesIds.map((nombre) => {
        const id = window.unidadesMap?.[nombre] || nombre

        return id
      })
    } else {
      // Grupos o Geozonas
      idsParaBuscar = unidadesIds
    }

    // 🔥 LLAMAR CON LOS IDs CORRECTOS
    datosInforme = await obtenerEventosReales(
      idsParaBuscar,
      fechaInicio,
      fechaFin,
      eventos.value || [],
    )
  } else if (tipoInforme === 'trayectos') {
    const { obtenerTrayectos, enriquecerConDatosUnidades } = useReportesTrayectos()

    // 🔥 NUEVA LÓGICA: Convertir conductores a unidades
    let unidadesParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      const todosConductores = await obtenerConductores()

      for (const nombreConductor of unidadesIds) {
        const conductor = todosConductores.find((c) => c.Nombre === nombreConductor)

        if (conductor) {
          if (conductor.UnidadAsignada) {
            unidadesParaBuscar.push(conductor.UnidadAsignada)
          } else {
            console.warn(`   ⚠️ No tiene UnidadAsignada`)
          }
        } else {
          console.warn(`❌ Conductor "${nombreConductor}" no encontrado en Firebase`)
        }
      }

      if (unidadesParaBuscar.length === 0) {
        throw new Error('Los conductores seleccionados no tienen unidades asignadas')
      }
    } else if (reportarPor.value === 'Unidades') {
      unidadesParaBuscar = unidadesIds.map((nombre) => {
        const id = window.unidadesMap?.[nombre] || nombre

        return id
      })
    } else {
      unidadesParaBuscar = unidadesIds
    }

    datosInforme = await obtenerTrayectos(unidadesParaBuscar, fechaInicio, fechaFin)
    datosInforme = await enriquecerConDatosUnidades(datosInforme)

    // 🔥 AGREGAR: AGRUPAR TRAYECTOS POR UNIDAD/CONDUCTOR
    datosAgrupados = datosInforme.reduce((acc, trayecto) => {
      let clave = ''

      if (reportarPor.value === 'Unidades') {
        clave = trayecto.unidadNombre || trayecto.unidad || 'Sin unidad'
      } else if (reportarPor.value === 'Conductores') {
        clave = trayecto.conductorNombre || trayecto.conductor || 'Sin conductor'
      } else {
        clave = trayecto.unidadNombre || 'Sin unidad'
      }

      if (!acc[clave]) acc[clave] = []
      acc[clave].push(trayecto)
      return acc
    }, {})
  } else if (tipoInforme === 'horas_trabajo') {
    const { calcularHorasTrabajo } = useReportesHorasTrabajo()

    // 🔥 DETERMINAR QUÉ IDs PASAR
    let idsParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      const todosConductores = await obtenerConductores()
      for (const nombreConductor of unidadesIds) {
        const conductor = todosConductores.find((c) => c.Nombre === nombreConductor)
        if (conductor && conductor.UnidadAsignada) {
          idsParaBuscar.push(conductor.UnidadAsignada)
        }
      }

      if (idsParaBuscar.length === 0) {
        throw new Error('Los conductores seleccionados no tienen unidades asignadas')
      }
    } else if (reportarPor.value === 'Unidades') {
      idsParaBuscar = unidadesIds.map((nombre) => window.unidadesMap?.[nombre] || nombre)
    } else {
      idsParaBuscar = unidadesIds
    }

    datosInforme = await calcularHorasTrabajo(idsParaBuscar, fechaInicio, fechaFin, {
      diasLaborables: diasLaborablesSeleccionados.value,
      horarioInicio: horarioInicio.value,
      horarioFin: horarioFin.value,
    })
  }

  if (!datosInforme || datosInforme.length === 0) {
    throw new Error('No se encontraron datos para el período seleccionado')
  }

  // Filtrar por eventos si aplica
  let datosFiltrados = datosInforme
  if (tipoInforme === 'eventos' && eventos.value.length > 0) {
    datosFiltrados = datosInforme.filter((evento) => eventos.value.includes(evento.eventoNombre))
  }

  // Agrupar datos
  if (tipoInforme === 'eventos') {
    // 🔥 PASO 1: Determinar criterio PRINCIPAL (según "Reportar por")
    criterioPrincipal = ''

    if (reportarPor.value === 'Unidades') {
      criterioPrincipal = 'unidad'
    } else if (reportarPor.value === 'Conductores') {
      criterioPrincipal = 'conductor'
    } else if (reportarPor.value === 'Grupos') {
      criterioPrincipal = 'grupo'
    } else if (reportarPor.value === 'Geozonas') {
      criterioPrincipal = 'geozona'
    } else {
      criterioPrincipal = 'unidad'
    }

    // 🔥 PASO 2: Agrupar por criterio principal
    datosAgrupados = datosFiltrados.reduce((acc, dato) => {
      let clavePrincipal = ''

      switch (criterioPrincipal) {
        case 'unidad':
          clavePrincipal = dato.unidadNombre || dato.idUnidad || 'Sin unidad'
          break
        case 'conductor':
          clavePrincipal = dato.conductorNombre || 'Sin conductor'
          break
        case 'grupo':
          clavePrincipal = dato.grupoNombre || 'Sin grupo'
          break
        case 'geozona':
          clavePrincipal = dato.geozonaNombre || 'Sin geozona'
          break
        default:
          clavePrincipal = 'Sin clasificar'
      }

      if (!acc[clavePrincipal]) acc[clavePrincipal] = []
      acc[clavePrincipal].push(dato)
      return acc
    }, {})
  }

  // Elementos sin datos
  let elementosConDatos = []

  if (reportarPor.value === 'Conductores') {
    elementosConDatos = [
      ...new Set(
        datosFiltrados
          .map((d) => (d.conductorNombre || '').replace(' undefined', '').trim())
          .filter(Boolean),
      ),
    ]
  } else if (reportarPor.value === 'Unidades') {
    elementosConDatos = Object.keys(datosAgrupados)
  } else {
    elementosConDatos = Object.keys(datosAgrupados)
  }

  const elementosSinDatos = elementosSeleccionados.value.filter(
    (elem) => !elementosConDatos.includes(elem),
  )

  if (elementosSinDatos.length > 0) {
    console.log('⚠️ Elementos sin datos:', elementosSinDatos)
  }

  // Procesar para columnas
  const datosColumnas = procesarNotificacionesParaReporte(datosFiltrados)

  // Generar resumen
  const resumenMejorado = mostrarResumen.value ? generarResumen(datosFiltrados) : null

  // Estadísticas
  const stats = {
    total: datosFiltrados.length,
    conductoresUnicos: new Set(datosFiltrados.map((d) => d.conductorNombre || 'Sin conductor'))
      .size,
    unidadesUnicas: new Set(datosFiltrados.map((d) => d.unidadNombre || d.idUnidad || 'Sin unidad'))
      .size,
  }

  // Resumen por grupo
  const resumenPorGrupo = {}
  Object.entries(datosAgrupados).forEach(([nombre, registros]) => {
    resumenPorGrupo[nombre] = registros.length
  })

  const configuracion = obtenerConfiguracionColumnas()

  if (tipoInforme === 'horas_trabajo') {
    return {
      registros: datosFiltrados,
      totalRegistros: datosFiltrados.length,
      resumen: resumenMejorado,
      stats: stats,
      elementosSinDatos: elementosSinDatos,
      tipoInforme: 'horas_trabajo',
    }
  }

  return {
    eventosAgrupados: datosAgrupados,
    datosColumnas: datosColumnas,
    resumen: resumenMejorado || resumenPorGrupo,
    stats: stats,
    totalEventos: datosFiltrados.length,
    totalTrayectos: datosFiltrados.length,
    elementosSinDatos: elementosSinDatos,
    configuracionColumnas: configuracion,
    tipoInforme: tipoInforme,
    agrupacionReal: criterioPrincipal,
  }
}

const generarReporte = async () => {
  if (!validarFormulario()) return
  guardarColumnasActuales()
  generando.value = true
  const formatearDuracionHoras = (totalHoras) => {
    const horas = Math.floor(totalHoras)
    const minutos = Math.floor((totalHoras - horas) * 60)
    const segundos = Math.round(((totalHoras - horas) * 60 - minutos) * 60)
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  }

  try {
    const datosReales = await obtenerDatosReporte()

    console.log(
      '🔍 PRIMER TRAYECTO RAW:',
      datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?._raw
        : null,
    )

    console.log('🔍 PRIMER TRAYECTO PROCESADO:', {
      duracion: datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?.duracion
        : null,
      duracionHoras: datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?.duracionHoras
        : null,
      kilometrajeInicio: datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?.kilometrajeInicio
        : null,
      kilometrajeFinal: datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?.kilometrajeFinal
        : null,
      velocidadPromedio: datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados)[0]?.[0]?.velocidadPromedio
        : null,
    })

    const config = {
      rangoFechaFormateado: rangoFechaFormateado.value,
      reportarPor: reportarPor.value,
      agruparPor: metodoAgrupacion.value,
      columnasSeleccionadas: columnasSeleccionadas.value,
      mostrarResumen: mostrarResumen.value,
      nombreUsuario: auth.currentUser?.displayName || auth.currentUser?.email,
      mostrarMapaTrayecto: mostrarMapaTrayecto.value,
      mostrarUnidadesMapa: mostrarUnidadesMapa.value,
      mostrarPlacaMapa: mostrarPlacaMapa.value,
    }

    let pdfResult

    // 🔥 GENERAR PDF SEGÚN TIPO
    if (tipoInformeSeleccionado.value === 'trayectos') {
      console.log('🔍 DATOS QUE LLEGAN AL PDF:')
      console.log('📊 datosReales completo:', datosReales)
      if (datosReales.eventosAgrupados) {
        Object.entries(datosReales.eventosAgrupados).forEach(([nombre, trayectos]) => {
          console.log(
            `📦 ${nombre}:`,
            trayectos.map((t) => ({
              unidad: t.unidadNombre,
              placa: t.Placa,
              todasLasPropiedades: Object.keys(t),
            })),
          )
        })
      }

      pdfResult = await generarPDFTrayectos(config, datosReales)
    } else if (tipoInformeSeleccionado.value === 'eventos') {
      pdfResult = generarPDFEventos(config, datosReales)
    } else if (tipoInformeSeleccionado.value === 'horas_trabajo') {
      const horasArray = Array.isArray(datosReales)
        ? datosReales
        : datosReales.registros || datosReales.datosColumnas || []

      // Preparar resumen general
      const resumenGeneral = {}
      horasArray.forEach((registro) => {
        const nombre = registro.unidadNombre
        if (!resumenGeneral[nombre]) {
          resumenGeneral[nombre] = {
            nombre: nombre,
            duracionTotal: 0,
            duracionDentro: 0,
            duracionFuera: 0,
          }
        }
        resumenGeneral[nombre].duracionTotal += parseFloat(registro.duracionTotal || 0)
        resumenGeneral[nombre].duracionDentro += parseFloat(registro.duracionDentroHorario || 0)
        resumenGeneral[nombre].duracionFuera += parseFloat(registro.duracionFueraHorario || 0)
      })

      // Calcular totales
      const totales = {
        duracionTotal: 0,
        duracionDentro: 0,
        duracionFuera: 0,
      }

      Object.values(resumenGeneral).forEach((item) => {
        totales.duracionTotal += item.duracionTotal
        totales.duracionDentro += item.duracionDentro
        totales.duracionFuera += item.duracionFuera
      })

      // Formatear para tabla
      const resumenGeneralArray = Object.values(resumenGeneral).map((item) => ({
        nombre: item.nombre,
        duracionFuera: formatearDuracionHoras(item.duracionFuera),
        duracionTotal: formatearDuracionHoras(item.duracionTotal),
        duracionDentro: formatearDuracionHoras(item.duracionDentro),
      }))

      const totalesFormateados = {
        duracionFuera: formatearDuracionHoras(totales.duracionFuera),
        duracionTotal: formatearDuracionHoras(totales.duracionTotal),
        duracionDentro: formatearDuracionHoras(totales.duracionDentro),
      }

      const datosParaPDF = {
        registros: horasArray,
        resumenGeneral: resumenGeneralArray,
        totales: totalesFormateados,
      }

      const configHoras = {
        ...config,
        horarioInicio: horarioInicio.value,
        horarioFin: horarioFin.value,
        mostrarMapaZona: mostrarMapaZona.value,
        remarcarHorasExtra: remarcarHorasExtra.value,
        tipoDetalle: tipoDetalle.value,
        tipoInformeComercial: tipoInformeComercial.value,
        diasLaborables: diasLaborablesSeleccionados.value,
      }

      pdfResult = await generarPDFHorasTrabajo(configHoras, datosParaPDF)
    }

    // ✅ VALIDAR QUE SE GENERÓ EL PDF
    if (!pdfResult || !pdfResult.blob) {
      throw new Error('No se pudo generar el archivo PDF')
    }

    // ✅ GUARDAR Y DESCARGAR
    const metadata = {
      nombre: `Reporte ${reportarPor.value}`,
      tipo: 'pdf',
      tipoInforme: tipoInformeSeleccionado.value,
      reportarPor: reportarPor.value,
      elementos: elementosSeleccionados.value,
      rangoFechas: rangoFechaFormateado.value,
      columnas: columnasSeleccionadas.value,
      totalEventos:
        datosReales.totalEventos || datosReales.totalTrayectos || datosReales.length || 0,
    }

    const reporteGuardado = await subirReporte(pdfResult.blob, metadata)

    // Descargar localmente
    const url = window.URL.createObjectURL(pdfResult.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = pdfResult.filename
    link.click()
    window.URL.revokeObjectURL(url)

    $q.notify({
      type: 'positive',
      message: `PDF generado exitosamente`,
      icon: 'cloud_done',
      timeout: 3000,
      actions: [
        {
          label: 'Ver historial',
          color: 'white',
          handler: () => {
            tab.value = 'historial'
          },
        },
      ],
    })

    if (reporteGuardado) {
      reportesAnteriores.value.unshift({
        id: reporteGuardado.id,
        fecha: new Date().toLocaleDateString('es-MX'),
        tipo: reporteGuardado.tipoInforme || 'Reporte',
        elementos: reporteGuardado.elementos.join(', ') || 'N/A',
        periodo: reporteGuardado.rangoFechas || 'N/A',
        tamaño: formatearTamaño(reporteGuardado.tamaño),
        downloadURL: reporteGuardado.storageUrl,
        tipoArchivo: reporteGuardado.tipo,
      })
    }

    await cargarHistorialReportes()
  } catch (error) {
    console.error('Error al generar PDF:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Error al generar el PDF',
      icon: 'error',
    })
  } finally {
    generando.value = false
  }
}

const generarExcel = async () => {
  if (!validarFormulario()) return
  guardarColumnasActuales()
  generando.value = true

  try {
    const datosReales = await obtenerDatosReporte()

    const config = {
      rangoFechaFormateado: rangoFechaFormateado.value,
      reportarPor: reportarPor.value,
      agruparPor: metodoAgrupacion.value,
      columnasSeleccionadas: columnasSeleccionadas.value,
      mostrarResumen: mostrarResumen.value,
      nombreUsuario: auth.currentUser?.displayName || auth.currentUser?.email,
      tipoDetalle: tipoDetalle.value,
      tipoInformeComercial: tipoInformeComercial.value,
      horarioInicio: horarioInicio.value,
      horarioFin: horarioFin.value,
      remarcarHorasExtra: remarcarHorasExtra.value,
      diasLaborables: diasLaborablesSeleccionados.value,
    }

    let blob, filename

    if (tipoInformeSeleccionado.value === 'trayectos') {
      Object.keys(datosReales.datosColumnas[0] || {})
    }

    // 🔥 DECIDIR QUÉ FUNCIÓN USAR SEGÚN EL TIPO
    if (tipoInformeSeleccionado.value === 'horas_trabajo') {
      const { generarExcelHorasTrabajo } = useReporteExcel()
      const resultado = await generarExcelHorasTrabajo(config, datosReales)
      blob = resultado.blob
      filename = resultado.filename
    } else if (tipoInformeSeleccionado.value === 'eventos') {
      const resultado = await generarExcelEventos(config, datosReales)
      blob = resultado.blob
      filename = resultado.filename
    } else if (tipoInformeSeleccionado.value === 'trayectos') {
      const { generarExcelTrayectos } = useReporteExcel()
      const resultado = await generarExcelTrayectos(config, datosReales)
      blob = resultado.blob
      filename = resultado.filename
    } else {
      throw new Error(`Tipo de informe no soportado para Excel: ${tipoInformeSeleccionado.value}`)
    }

    if (!blob) {
      throw new Error('No se pudo generar el archivo Excel')
    }

    const metadata = {
      nombre: filename || `Reporte ${reportarPor.value}`,
      tipo: 'excel',
      tipoInforme: tipoInformeSeleccionado.value,
      reportarPor: reportarPor.value,
      elementos: elementosSeleccionados.value,
      rangoFechas: rangoFechaFormateado.value,
      columnas: columnasSeleccionadas.value,
      totalEventos: datosReales.totalRegistros || datosReales.totalEventos || 0,
    }

    const reporteGuardado = await subirReporte(blob, metadata)

    $q.notify({
      type: 'positive',
      message: `Excel generado exitosamente`,
      icon: 'cloud_done',
      timeout: 3000,
      actions: [
        {
          label: 'Ver historial',
          color: 'white',
          handler: () => {
            tab.value = 'historial'
          },
        },
      ],
    })

    if (reporteGuardado) {
      reportesAnteriores.value.unshift({
        id: reporteGuardado.id,
        fecha: new Date().toLocaleDateString('es-MX'),
        tipo: reporteGuardado.tipoInforme || 'Reporte',
        elementos: reporteGuardado.elementos.join(', ') || 'N/A',
        periodo: reporteGuardado.rangoFechas || 'N/A',
        tamaño: formatearTamaño(reporteGuardado.tamaño),
        downloadURL: reporteGuardado.storageUrl,
        tipoArchivo: reporteGuardado.tipo,
      })
    }

    await cargarHistorialReportes()
  } catch (error) {
    console.error('Error al generar Excel:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Error al generar el Excel',
      icon: 'error',
    })
  } finally {
    generando.value = false
  }
}

const cargarHistorialReportes = async () => {
  if (!userId.value) return

  loading.value = true
  try {
    const reportes = await obtenerHistorialReportes(userId.value)

    reportesAnteriores.value = reportes.map((r) => ({
      id: r.id,
      fecha: r.fechaCreacion?.toLocaleDateString('es-MX') || '',
      tipo: r.tipoInforme || 'Reporte',
      elementos: Array.isArray(r.elementos) ? r.elementos.join(', ') : 'N/A',
      periodo: r.rangoFechas || 'N/A',
      tamaño: formatearTamaño(r.tamaño),
      downloadURL: r.storageUrl,
      tipoArchivo: r.tipo,
    }))
  } catch (error) {
    console.error('Error al cargar historial:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al cargar el historial de reportes',
      icon: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  auth.onAuthStateChanged((user) => {
    userId.value = user?.uid || null

    if (userId.value) {
      cargarHistorialReportes()
      cargarOpcionesSelector()
      cargarEventosDisponibles()
    }
  })
})

watch(reportarPor, (nuevoValor, valorAnterior) => {
  if (nuevoValor !== valorAnterior) {
    elementosSeleccionados.value = []
  }
})

watch(elementosSeleccionados, () => {
  if (selectorElementos.value) {
    selectorElementos.value.updateInputValue('')
  }
})

// 🔥 NUEVO: Limpiar input de eventos cuando se selecciona algo
watch(eventos, () => {
  if (selectorEventos.value) {
    selectorEventos.value.updateInputValue('')
  }
})
</script>

<style scoped>
/*estilos para los tabs*/
:deep(.q-tab) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin: 0 4px;
}

/* Hover en tabs no activos */
:deep(.q-tab):not(.q-tab--active):hover {
  transform: translateY(-2px);
  background-color: rgba(0, 0, 0, 0.05);
}

/* Tab activo con efecto especial */
:deep(.q-tab--active) {
  transform: scale(1.05);
  font-weight: 600;
}

/* Animación del icono al hacer hover */
:deep(.q-tab):hover .q-icon {
  animation: tab-icon-bounce 0.5s ease;
}

/* Animación del indicador inferior */
:deep(.q-tabs__indicator) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 3px !important;
}

/* Animación de rebote para iconos de tabs */
@keyframes tab-icon-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* Efecto al hacer click (active state) */
:deep(.q-tab):active {
  transform: scale(0.98);
}

/* Mejorar la transición del tab activo */
:deep(.q-tab--active):hover {
  transform: scale(1.05) translateY(-1px);
}
/*Estilos para los botones de generar*/
/*Estilos para los botones de generar*/
.btn-report-action {
  border-radius: 10px;
  padding: 12px 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative;
  overflow: hidden;
}

/* Hover general - MÁS ESPECÍFICO */
.btn-report-action.btn-pdf:not(:disabled):hover,
.btn-report-action.btn-excel:not(:disabled):hover,
.btn-report-action.btn-cancel:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

/* Active (al hacer click) */
.btn-report-action.btn-pdf:not(:disabled):active,
.btn-report-action.btn-excel:not(:disabled):active,
.btn-report-action.btn-cancel:active {
  transform: translateY(-1px) scale(0.98) !important;
}

/* Botón PDF - Rojo con sombra específica */
.btn-report-action.btn-pdf:not(:disabled):hover {
  box-shadow: 0 8px 24px rgba(211, 47, 47, 0.4) !important;
}

.btn-report-action.btn-pdf:not(:disabled):hover .q-icon {
  animation: pulse-icon 0.6s ease;
}

/* Botón Excel - Verde con sombra específica */
.btn-report-action.btn-excel:not(:disabled):hover {
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4) !important;
}

.btn-report-action.btn-excel:not(:disabled):hover .q-icon {
  animation: bounce-icon 0.6s ease;
}

/* Botón Cancelar */
.btn-report-action.btn-cancel:hover {
  background-color: rgba(0, 0, 0, 0.05) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

/* Animaciones de iconos */
@keyframes pulse-icon {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

@keyframes bounce-icon {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* Estado de carga - MÁS ESPECÍFICO */
.btn-report-action.q-btn--loading,
.btn-report-action.btn-pdf.q-btn--loading,
.btn-report-action.btn-excel.q-btn--loading {
  transform: none !important;
}

/* Estado deshabilitado - MÁS ESPECÍFICO */
.btn-report-action:disabled,
.btn-report-action.btn-pdf:disabled,
.btn-report-action.btn-excel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Efecto ripple mejorado */
.btn-report-action :deep(.q-focus-helper) {
  background: currentColor;
  opacity: 0.15;
}
/* 🆕 ESTILOS PARA EL HEADER DE COLUMNAS */
.columnas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
