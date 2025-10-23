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
                @update:model-value="cargarOpcionesSelector"
              />
            </div>

            <!-- Selector dinámico según "Reportar por" -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">{{ etiquetaSelector }}</div>
              <q-select
                v-model="elementosSeleccionados"
                :options="opcionesSelector"
                outlined
                dense
                use-input
                use-chips
                multiple
                input-debounce="0"
                :placeholder="`Seleccionar ${reportarPor.toLowerCase()}...`"
                :loading="loadingOpciones"
              />
            </div>

            <!-- Eventos -->
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Eventos</div>
              <q-select
                v-model="eventos"
                :options="listaEventosDisponibles"
                outlined
                dense
                use-input
                use-chips
                multiple
                input-debounce="0"
                placeholder="Seleccionar eventos..."
                :loading="loadingEventos"
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
                          <q-btn label="Aceptar" color="primary" flat @click="aplicarRangoFecha" />
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

              <!-- Buscador de columnas -->
              <q-select
                v-model="columnaAgregar"
                :options="columnasDisponiblesFiltradas"
                outlined
                dense
                use-input
                input-debounce="0"
                placeholder="Buscar y agregar columnas..."
                @filter="filtrarColumnas"
                @update:model-value="agregarColumna"
              >
                <template v-slot:prepend>
                  <q-icon name="add" />
                </template>
              </q-select>

              <!-- Columnas seleccionadas -->
              <div class="q-gutter-sm q-mt-md">
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
            label="Generar PDF"
            icon="picture_as_pdf"
            unelevated
            style="width: 200px"
            @click="generarReporte"
            :loading="generando"
            :disable="generando"
          />
          <q-btn
            color="positive"
            label="Generar Excel"
            icon="table_chart"
            unelevated
            style="width: 200px"
            @click="generarExcel"
            :loading="generando"
            :disable="generando"
          />
          <q-btn outline color="grey-7" label="Cancelar" style="width: 200px" />
        </div>
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { getAuth } from 'firebase/auth'
import { useReportes } from 'src/composables/useReportes'
import { useReportePDF } from 'src/composables/useReportePDF'
import { useReporteExcel } from 'src/composables/useReporteExcel'

const $q = useQuasar()
const auth = getAuth()
const userId = auth.currentUser?.uid
const tab = ref('crear')

// Composables
const {
  obtenerEventos,
  obtenerGeozonas,
  obtenerGruposConductores,
  agruparEventos,
  filtrarEventosPorElementos,
  calcularEstadisticas,
  obtenerUnidades,
  obtenerConductores,
} = useReportes()

const { generarPDFEventos } = useReportePDF()
const { generarExcelEventos } = useReporteExcel()

// Estados
const generando = ref(false)
const loadingOpciones = ref(false)
const loadingEventos = ref(false)

// Datos del formulario
const tipoInforme = ref('Informe de eventos')
const reportarPor = ref('Objetos')
const elementosSeleccionados = ref([])
const eventos = ref([])
const agruparPor = ref('Objetos')
const mostrarUnidades = ref(false)
const mostrarResumen = ref(true)

// Opciones disponibles
const tiposInforme = ['Informe de eventos', 'Informe de viajes', 'Informe de geozonas']
const opcionesReportar = ['Objetos', 'Conductores', 'Grupos', 'Geozonas']
const opcionesAgrupar = ['Objetos', 'Conductores', 'Grupos', 'Geozonas']

// Opciones dinámicas cargadas de Firebase
const opcionesSelector = ref([])
const listaEventosDisponibles = ref([])

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

// Columnas
const columnasDisponibles = [
  'Nombre de evento',
  'Hora de inicio de evento',
  'Duración',
  'Condición de evento',
  'Ubicación de eventos',
  'Conductor',
  'Vehículo',
  'Geozona',
  'Velocidad',
  'Kilometraje',
  'Dirección',
]

const columnasSeleccionadas = ref([
  'Nombre de evento',
  'Hora de inicio de evento',
  'Duración',
  'Condición de evento',
])

const columnasDisponiblesFiltradas = ref(columnasDisponibles)
const columnaAgregar = ref(null)

// Historial
const reportesAnteriores = ref([
  {
    id: 1,
    fecha: '15/10/2025',
    tipo: 'Informe de eventos',
    elementos: 'CAMIONETA MX-08, CAMIONETA MX-09',
    periodo: '01/10/2025 - 15/10/2025',
  },
])

const columnasHistorial = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'elementos', label: 'Elementos', field: 'elementos', align: 'left' },
  { name: 'periodo', label: 'Período', field: 'periodo', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'center' },
]

// Computed
const etiquetaSelector = computed(() => {
  const labels = {
    Objetos: 'Objetos',
    Conductores: 'Conductores',
    Grupos: 'Grupos de conductores',
    Geozonas: 'Geozonas',
  }
  return labels[reportarPor.value] || 'Seleccionar'
})

// Métodos
const aplicarRangoFecha = () => {
  rangoFecha.value = rangoFechaTemporal.value
}

const filtrarColumnas = (val, update) => {
  if (val === '') {
    update(() => {
      columnasDisponiblesFiltradas.value = columnasDisponibles
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    columnasDisponiblesFiltradas.value = columnasDisponibles.filter(
      (v) => v.toLowerCase().indexOf(needle) > -1,
    )
  })
}

const agregarColumna = (columna) => {
  if (columna && !columnasSeleccionadas.value.includes(columna)) {
    columnasSeleccionadas.value.push(columna)
  }
  columnaAgregar.value = null
}

const removerColumna = (columna) => {
  const index = columnasSeleccionadas.value.indexOf(columna)
  if (index > -1) {
    columnasSeleccionadas.value.splice(index, 1)
  }
}

/**
 * Carga las opciones del selector según el tipo seleccionado
 */
const cargarOpcionesSelector = async () => {
  console.log('Cargando opciones para:', reportarPor.value)
  if (!userId) {
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
      case 'Objetos':
        {
          const unidades = await obtenerUnidades()
          opcionesSelector.value = unidades.map((u) => u.Unidad || u.id)
        }
        break

      case 'Conductores': {
        // 1. Obtener los grupos del usuario
        const grupos = await obtenerGruposConductores(userId)

        // 2. Extraer todos los IDs de conductores de todos los grupos
        const conductoresIdsDelUsuario = new Set()
        grupos.forEach((grupo) => {
          if (grupo.conductoresIds && Array.isArray(grupo.conductoresIds)) {
            grupo.conductoresIds.forEach((id) => conductoresIdsDelUsuario.add(id))
          }
        })

        // 3. Obtener todos los conductores de Firebase
        const todosConductores = await obtenerConductores()

        // 4. Filtrar solo los que pertenecen al usuario
        const conductoresDelUsuario = todosConductores.filter((c) =>
          conductoresIdsDelUsuario.has(c.id),
        )

        opcionesSelector.value = conductoresDelUsuario.map((c) => c.Nombre || c.id)
        break
      }

      case 'Grupos':
        {
          const grupos = await obtenerGruposConductores(userId)
          opcionesSelector.value = grupos.map((g) => g.nombre || g.id)
        }
        break

      case 'Geozonas':
        {
          const geozonas = await obtenerGeozonas(userId)
          opcionesSelector.value = geozonas.map((g) => g.nombre || g.id)
        }
        break

      default:
        opcionesSelector.value = []
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

/**
 * Carga los tipos de eventos disponibles desde Firebase
 */
const cargarEventosDisponibles = async () => {
  if (!userId) return

  loadingEventos.value = true

  try {
    // Obtener eventos de los últimos 30 días para extraer tipos únicos
    const fechaFin = new Date()
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - 30)

    const eventosRecientes = await obtenerEventos(userId, fechaInicio, fechaFin)

    // Extraer tipos únicos de eventos
    const tiposUnicos = [
      ...new Set(eventosRecientes.map((e) => e.tipoEvento || e.tipo || e.nombre)),
    ].filter(Boolean)

    listaEventosDisponibles.value =
      tiposUnicos.length > 0
        ? tiposUnicos
        : ['Entrada a geozona', 'Salida de geozona', 'Exceso de velocidad', 'Ralentí prolongado']
  } catch (error) {
    console.error('Error al cargar eventos:', error)
    // Valores por defecto
    listaEventosDisponibles.value = [
      'Entrada a geozona',
      'Salida de geozona',
      'Exceso de velocidad',
      'Ralentí prolongado',
    ]
  } finally {
    loadingEventos.value = false
  }
}

/**
 * Valida el formulario antes de generar el reporte
 */
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

/**
 * Obtiene los datos reales de Firebase para el reporte
 */
const obtenerDatosReporte = async () => {
  if (!userId) {
    throw new Error('Usuario no autenticado')
  }

  // Parsear el rango de fechas
  let fechaInicio, fechaFin

  if (typeof rangoFecha.value === 'object') {
    const [inicio, fin] = rangoFecha.value.from.split('/').map(Number)
    fechaInicio = new Date(fin, inicio - 1, fin)
    const [inicioFin, mesFin, añoFin] = rangoFecha.value.to.split('/').map(Number)
    fechaFin = new Date(añoFin, mesFin - 1, inicioFin, 23, 59, 59)
  } else {
    // Formato de string "DD/MM/YYYY - DD/MM/YYYY"
    const [inicio, fin] = rangoFecha.value.split(' - ')
    const [diaInicio, mesInicio, añoInicio] = inicio.split('/').map(Number)
    const [diaFin, mesFin, añoFin] = fin.split('/').map(Number)
    fechaInicio = new Date(añoInicio, mesInicio - 1, diaInicio)
    fechaFin = new Date(añoFin, mesFin - 1, diaFin, 23, 59, 59)
  }

  // Obtener eventos del período
  const eventosDelPeriodo = await obtenerEventos(userId, fechaInicio, fechaFin, eventos.value)

  // Filtrar eventos según elementos seleccionados
  const eventosFiltrados = filtrarEventosPorElementos(
    eventosDelPeriodo,
    elementosSeleccionados.value,
    reportarPor.value,
  )

  // Agrupar eventos según el criterio
  const eventosAgrupados = agruparEventos(eventosFiltrados, agruparPor.value)

  // Calcular estadísticas
  const stats = calcularEstadisticas(eventosFiltrados)

  // Identificar elementos sin datos
  const elementosConDatos = Object.keys(eventosAgrupados)
  const elementosSinDatos = elementosSeleccionados.value.filter(
    (elem) => !elementosConDatos.includes(elem),
  )

  // Preparar resumen
  const resumen = {}
  Object.entries(eventosAgrupados).forEach(([nombre, eventos]) => {
    resumen[nombre] = eventos.length
  })

  return {
    eventosAgrupados,
    resumen,
    totalEventos: eventosFiltrados.length,
    elementosSinDatos,
    stats,
  }
}

/**
 * Genera el reporte en PDF
 */
const generarReporte = async () => {
  if (!validarFormulario()) return

  generando.value = true

  try {
    const datosReales = await obtenerDatosReporte()

    const config = {
      rangoFechaFormateado: rangoFechaFormateado.value,
      reportarPor: reportarPor.value,
      agruparPor: agruparPor.value,
      columnasSeleccionadas: columnasSeleccionadas.value,
      mostrarResumen: mostrarResumen.value,
      nombreUsuario: userId.displayName || userId.email,
    }

    generarPDFEventos(config, datosReales)

    $q.notify({
      type: 'positive',
      message: 'PDF generado exitosamente',
      icon: 'check_circle',
      timeout: 2000,
    })
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

/**
 * Genera el reporte en Excel
 */
const generarExcel = async () => {
  if (!validarFormulario()) return

  generando.value = true

  try {
    const datosReales = await obtenerDatosReporte()

    const config = {
      rangoFechaFormateado: rangoFechaFormateado.value,
      reportarPor: reportarPor.value,
      agruparPor: agruparPor.value,
      columnasSeleccionadas: columnasSeleccionadas.value,
      mostrarResumen: mostrarResumen.value,
      nombreUsuario: userId.displayName || userId.email,
    }

    await generarExcelEventos(config, datosReales)

    $q.notify({
      type: 'positive',
      message: 'Excel generado exitosamente',
      icon: 'check_circle',
      timeout: 2000,
    })
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

// Lifecycle
onMounted(() => {
  cargarOpcionesSelector()
  cargarEventosDisponibles()
})
</script>
