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

        <!-- 🔥 NUEVO: Selector de tipo de informe -->
        <div class="q-mb-lg">
          <div class="text-subtitle2 q-mb-sm">Tipo de informe</div>
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
        </div>

        <div class="row q-col-gutter-md">
          <!-- Columna izquierda -->
          <div class="col-12 col-md-6">
            <!-- Reportar por (SIEMPRE visible) -->
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

            <!-- Selector dinámico (SIEMPRE visible) -->
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

            <!-- 🔥 Eventos (solo para Informe de Eventos) -->
            <div v-if="tieneOpcion('seleccionarEventos')" class="q-mb-md">
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

            <!-- 🔥 Método de agrupación (solo para Informe de Eventos) -->
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

            <!-- 🔥 Días laborables (solo para Horas de Trabajo) -->
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

            <!-- 🔥 Horario laboral (solo para Horas de Trabajo) -->
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

            <!-- 🔥 Tipo de informe comercial (solo para Horas de Trabajo) -->
            <div v-if="tieneOpcion('tipoInformeComercial')" class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Tipo de informe</div>
              <q-select
                v-model="tipoInformeComercial"
                :options="TIPOS_INFORME_COMERCIAL"
                outlined
                dense
                emit-value
                map-options
              />
            </div>

            <!-- 🔥 Tipo de detalle (solo para Horas de Trabajo) -->
            <div v-if="tieneOpcion('tipoDetalle')" class="q-mb-md">
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
          </div>

          <!-- Columna derecha -->
          <div class="col-12 col-md-6">
            <!-- Rango de fecha (SIEMPRE visible) -->
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

            <!-- 🔥 Opciones de mapa para Trayectos -->
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

            <!-- 🔥 Opción de mapa para Horas de Trabajo -->
            <div v-if="tieneOpcion('mostrarMapaZona')" class="q-mb-md">
              <q-checkbox v-model="mostrarMapaZona" label="Mostrar mapa de la zona" />

              <q-checkbox
                v-if="tipoInformeSeleccionado === 'horas_trabajo'"
                v-model="remarcarHorasExtra"
                label="Remarcar horas fuera de horario laboral"
                dense
                class="q-mb-sm"
              />
            </div>

            <!-- 🔥 Lista de columnas (para Eventos, Trayectos y Horas de Trabajo) -->
            <div v-if="tieneOpcion('seleccionColumnas')" class="q-mb-md">
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
            </div>
          </div>
        </div>

        <!-- Botones de acción (SIEMPRE visibles) -->
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
          <q-btn
            outline
            color="grey-7"
            label="Cancelar"
            style="width: 200px"
            @click="cancelarReporte"
          />
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
  cambiarTipoInforme,
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
  columnaAgregar,
  mostrarResumen,
  columnasDisponiblesFiltradas,
  agregarColumna,
  removerColumna,
  filtrarColumnas,
  obtenerConfiguracionColumnas,
  procesarNotificacionesParaReporte,
  generarResumen,
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
const opcionesReportar = ['Unidades', 'Conductores', 'Grupos', 'Geozonas']
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

// Métodos
const aplicarRangoFecha = () => {
  rangoFecha.value = rangoFechaTemporal.value
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
  columnaAgregar.value = null
  mostrarResumen.value = false
  opcionesSelector.value = []

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
        console.log('📦 Mapeo de unidades:', window.unidadesMap)
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
        break
      }

      case 'Grupos': {
        const grupos = await obtenerGruposConductores(userId.value)
        opcionesSelector.value = grupos.map((g) => g.nombre || g.id)
        break
      }

      case 'Geozonas': {
        const geozonas = await obtenerGeozonas(userId.value)
        opcionesSelector.value = geozonas.map((g) => g.nombre || g.id)
        break
      }

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

const cargarEventosDisponibles = async () => {
  if (!userId.value) {
    console.warn('⚠️ No hay userId para cargar eventos')
    return
  }

  loadingEventos.value = true

  try {
    console.log('📥 Cargando eventos desde Firebase...')

    // Obtener instancia de useEventos con el userId actual
    const { obtenerEventos } = useEventos(userId.value)

    // Obtener todos los eventos del usuario
    const eventosDelUsuario = await obtenerEventos()

    console.log('✅ Eventos obtenidos:', eventosDelUsuario.length)
    console.log('📋 Eventos:', eventosDelUsuario)

    // Extraer solo los nombres de los eventos para el selector
    // Filtrar solo eventos activos (opcional)
    listaEventosDisponibles.value = eventosDelUsuario
      .filter((evento) => evento.activo) // 🔹 Opcional: solo eventos activos
      .map((evento) => evento.nombre)
      .filter(Boolean) // Eliminar nombres vacíos o undefined

    // 🔹 Si quieres mostrar TODOS los eventos (activos e inactivos):
    listaEventosDisponibles.value = eventosDelUsuario.map((evento) => evento.nombre).filter(Boolean)

    console.log('✅ Eventos disponibles para selector:', listaEventosDisponibles.value)

    if (listaEventosDisponibles.value.length === 0) {
      console.warn('⚠️ No se encontraron eventos activos')
    }
  } catch (error) {
    console.error('❌ Error al cargar eventos desde Firebase:', error)
    listaEventosDisponibles.value = []

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
  console.log('🔍 Obteniendo datos del reporte...')
  console.log('📊 Tipo de informe:', tipoInformeSeleccionado.value)
  console.log('📅 Rango crudo:', rangoFecha.value)
  console.log('📅 Tipo de dato:', typeof rangoFecha.value)
  console.log('📅 Es null?:', rangoFecha.value === null)
  console.log('📅 Es undefined?:', rangoFecha.value === undefined)

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
    // Caso 1: Formato object del date picker { from: "YYYY/MM/DD", to: "YYYY/MM/DD" }
    console.log('🔍 Formato object detectado')
    console.log('  from:', rangoFecha.value.from)
    console.log('  to:', rangoFecha.value.to)

    fechaInicio = parsearFechaString(rangoFecha.value.from)
    fechaFin = parsearFechaString(rangoFecha.value.to)

    fechaInicio.setHours(0, 0, 0, 0)
    fechaFin.setHours(23, 59, 59, 999)
  } else if (typeof rangoFecha.value === 'string') {
    // Caso 2: Formato string
    console.log('🔍 Formato string detectado:', rangoFecha.value)

    if (rangoFecha.value.includes(' - ')) {
      // Caso 2a: Rango con separador "YYYY/MM/DD - YYYY/MM/DD"
      console.log('🔍 Rango de fechas detectado')
      const [inicio, fin] = rangoFecha.value.split(' - ').map((s) => s.trim())

      fechaInicio = parsearFechaString(inicio)
      fechaFin = parsearFechaString(fin)

      fechaInicio.setHours(0, 0, 0, 0)
      fechaFin.setHours(23, 59, 59, 999)
    } else {
      // Caso 2b: Fecha única "YYYY/MM/DD" - usar todo el día
      console.log('🔍 Fecha única detectada, usando el día completo')

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

  console.log('✅ Fechas parseadas correctamente:')
  console.log(
    '  📅 Inicio:',
    fechaInicio.toLocaleDateString('es-MX'),
    fechaInicio.toLocaleTimeString('es-MX'),
  )
  console.log(
    '  📅 Fin:',
    fechaFin.toLocaleDateString('es-MX'),
    fechaFin.toLocaleTimeString('es-MX'),
  )

  // Determinar tipo de informe
  const tipoInforme = tipoInformeSeleccionado.value || 'eventos'
  const unidadesIds = elementosSeleccionados.value

  if (unidadesIds.length === 0) {
    throw new Error('Debes seleccionar al menos una unidad')
  }

  let datosInforme = []

  // 🔥 OBTENER DATOS SEGÚN TIPO
  // 🔥 OBTENER DATOS SEGÚN TIPO
  if (tipoInforme === 'eventos') {
    console.log('📊 Obteniendo eventos reales...')
    const { obtenerEventosReales } = useReportesEventos()

    // 🔥 DETERMINAR QUÉ IDs PASAR A LA FUNCIÓN
    let idsParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      console.log('🚗 Reportar por conductores, convirtiendo a IDs de unidades...')

      const todosConductores = await obtenerConductores()
      console.log('👥 Total conductores en Firebase:', todosConductores.length)

      for (const nombreConductor of unidadesIds) {
        console.log(`🔍 Buscando conductor: "${nombreConductor}"`)

        const conductor = todosConductores.find((c) => c.Nombre === nombreConductor)

        if (conductor) {
          console.log(`✅ Conductor encontrado:`, {
            id: conductor.id,
            nombre: conductor.Nombre,
            unidadAsignada: conductor.UnidadAsignada,
          })

          if (conductor.UnidadAsignada) {
            idsParaBuscar.push(conductor.UnidadAsignada)
            console.log(`   → Agregando unidad: ${conductor.UnidadAsignada}`)
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

      console.log('📍 IDs de unidades a buscar:', idsParaBuscar)
    } else if (reportarPor.value === 'Unidades') {
      console.log('🚙 Reportar por unidades, convirtiendo nombres a IDs...')

      idsParaBuscar = unidadesIds.map((nombre) => {
        const id = window.unidadesMap?.[nombre] || nombre
        console.log(`   ${nombre} → ${id}`)
        return id
      })

      console.log('📍 IDs de unidades:', idsParaBuscar)
    } else {
      // Grupos o Geozonas
      idsParaBuscar = unidadesIds
    }

    // 🔥 LLAMAR CON LOS IDs CORRECTOS
    datosInforme = await obtenerEventosReales(
      idsParaBuscar, // 🔥 Pasar IDs de unidades, no nombres de conductores
      fechaInicio,
      fechaFin,
      eventos.value || [],
    )
  } else if (tipoInforme === 'trayectos') {
    console.log('🗺️ Obteniendo trayectos...')
    const { obtenerTrayectos, enriquecerConDatosUnidades } = useReportesTrayectos()

    // 🔥 NUEVA LÓGICA: Convertir conductores a unidades
    let unidadesParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      console.log('🚗 Reportar por conductores, obteniendo unidades asignadas...')

      // Obtener todos los conductores de Firebase
      const todosConductores = await obtenerConductores()
      console.log('👥 Total conductores:', todosConductores.length)

      // Para cada conductor seleccionado, obtener su UnidadAsignada
      for (const nombreConductor of unidadesIds) {
        console.log(`🔍 Buscando: "${nombreConductor}"`)

        const conductor = todosConductores.find((c) => c.Nombre === nombreConductor)

        if (conductor) {
          console.log(`✅ Conductor encontrado:`, conductor)

          if (conductor.UnidadAsignada) {
            unidadesParaBuscar.push(conductor.UnidadAsignada)
            console.log(`   → Unidad asignada: ${conductor.UnidadAsignada}`)
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

      console.log('📍 Unidades finales a buscar:', unidadesParaBuscar)
    } else if (reportarPor.value === 'Unidades') {
      // Si seleccionó unidades directamente, convertir nombres a IDs
      console.log('🚙 Reportar por unidades directamente')
      console.log('📝 Nombres seleccionados:', unidadesIds)

      unidadesParaBuscar = unidadesIds.map((nombre) => {
        const id = window.unidadesMap?.[nombre] || nombre
        console.log(`   ${nombre} → ${id}`)
        return id
      })

      console.log('📍 IDs de unidades:', unidadesParaBuscar)
    } else {
      // Grupos o Geozonas (implementar si es necesario)
      unidadesParaBuscar = unidadesIds
    }

    // Llamar a obtenerTrayectos con los IDs correctos
    datosInforme = await obtenerTrayectos(unidadesParaBuscar, fechaInicio, fechaFin)
    datosInforme = await enriquecerConDatosUnidades(datosInforme)
  } else if (tipoInforme === 'horas_trabajo') {
    console.log('⏰ Calculando horas de trabajo...')
    const { calcularHorasTrabajo } = useReportesHorasTrabajo()

    // 🔥 DETERMINAR QUÉ IDs PASAR
    let idsParaBuscar = []

    if (reportarPor.value === 'Conductores') {
      console.log('🚗 Reportar por conductores, convirtiendo a IDs de unidades...')

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

  console.log('✅ Datos obtenidos:', datosInforme.length)

  if (!datosInforme || datosInforme.length === 0) {
    throw new Error('No se encontraron datos para el período seleccionado')
  }

  // Filtrar por eventos si aplica
  let datosFiltrados = datosInforme
  if (tipoInforme === 'eventos' && eventos.value.length > 0) {
    datosFiltrados = datosInforme.filter((evento) => eventos.value.includes(evento.eventoNombre))
    console.log(`🔍 Filtrados ${datosFiltrados.length} eventos de ${datosInforme.length} totales`)
  }

  // Agrupar datos
  let datosAgrupados = {}
  if (tipoInforme === 'eventos') {
    const criterio = metodoAgrupacion.value || 'unidad'
    console.log('📊 Agrupando por:', criterio)

    datosAgrupados = datosFiltrados.reduce((acc, dato) => {
      let clave = ''
      switch (criterio) {
        case 'unidad':
          clave = dato.unidadNombre || dato.idUnidad || 'Sin unidad'
          break
        case 'conductor':
          clave = dato.conductorNombre || 'Sin conductor'
          break
        case 'evento':
          clave = dato.eventoNombre || 'Sin nombre'
          break
        case 'dia':
          clave = new Date(dato.timestamp).toLocaleDateString('es-MX')
          break
        default:
          clave = 'Sin clasificar'
      }
      if (!acc[clave]) acc[clave] = []
      acc[clave].push(dato)
      return acc
    }, {})
  } else {
    datosAgrupados = datosFiltrados.reduce((acc, dato) => {
      const clave = dato.unidadNombre || dato.idUnidad || 'Sin unidad'
      if (!acc[clave]) acc[clave] = []
      acc[clave].push(dato)
      return acc
    }, {})
  }

  console.log('✅ Datos agrupados en', Object.keys(datosAgrupados).length, 'grupos')

  // Elementos sin datos
  let elementosConDatos = []

  // 🔍 DEBUG: Ver qué campos tienen los datos
  console.log('🔍 Primer dato de ejemplo:', datosFiltrados[0])
  console.log('🔍 Campos disponibles:', Object.keys(datosFiltrados[0] || {}))
  if (reportarPor.value === 'Conductores') {
    // Para conductores, extraer los conductores que SÍ tienen datos
    elementosConDatos = [
      ...new Set(
        datosFiltrados
          .map((d) => (d.conductorNombre || '').replace(' undefined', '').trim())
          .filter(Boolean),
      ),
    ]
    console.log('👥 Conductores con datos encontrados:', elementosConDatos)
  } else if (reportarPor.value === 'Unidades') {
    // Para unidades, usar las claves de datosAgrupados
    elementosConDatos = Object.keys(datosAgrupados)
  } else {
    // Otros casos
    elementosConDatos = Object.keys(datosAgrupados)
  }

  const elementosSinDatos = elementosSeleccionados.value.filter(
    (elem) => !elementosConDatos.includes(elem),
  )

  if (elementosSinDatos.length > 0) {
    console.log('⚠️ Elementos sin datos:', elementosSinDatos)
  }

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

  console.log('📊 Estadísticas finales:', stats)

  // Resumen por grupo
  const resumenPorGrupo = {}
  Object.entries(datosAgrupados).forEach(([nombre, registros]) => {
    resumenPorGrupo[nombre] = registros.length
  })
  const configuracion = obtenerConfiguracionColumnas()
  console.log('🔍 Columnas seleccionadas:', columnasSeleccionadas.value)
  console.log('🔍 Configuración obtenida:', configuracion)
  console.log(
    '🔍 Labels en configuración:',
    configuracion.map((c) => c.label),
  )
  if (tipoInforme === 'horas_trabajo') {
    return datosFiltrados // Array de registros por día
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
  }
}

const generarReporte = async () => {
  if (!validarFormulario()) return

  generando.value = true
  const formatearDuracionHoras = (totalHoras) => {
    const horas = Math.floor(totalHoras)
    const minutos = Math.floor((totalHoras - horas) * 60)
    const segundos = Math.round(((totalHoras - horas) * 60 - minutos) * 60)
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  }
  try {
    const datosReales = await obtenerDatosReporte()

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

    console.log('🔍 datosReales completo:', datosReales)
    console.log('🔍 configuracionColumnas:', datosReales.configuracionColumnas)

    let pdfResult

    // 🔥 GENERAR PDF SEGÚN TIPO
    if (tipoInformeSeleccionado.value === 'trayectos') {
      console.log('🗺️ Generando PDF de trayectos...')

      if (mostrarMapaTrayecto.value) {
        $q.notify({
          type: 'info',
          message: 'Generando mapa de trayectos...',
          icon: 'map',
          timeout: 2000,
        })
      }

      pdfResult = await generarPDFTrayectos(config, datosReales)
    } else if (tipoInformeSeleccionado.value === 'eventos') {
      console.log('📊 Generando PDF de eventos...')
      pdfResult = generarPDFEventos(config, datosReales)
    } else if (tipoInformeSeleccionado.value === 'horas_trabajo') {
      console.log('⏰ Generando PDF de horas de trabajo...')

      // 🔥 EXTRAER EL ARRAY DE DATOS:
      const horasArray = Array.isArray(datosReales) ? datosReales : datosReales.datosColumnas || []

      console.log('📊 Datos de horas extraídos:', {
        longitud: horasArray.length,
        primerItem: horasArray[0],
      })

      // Preparar resumen general
      const resumenGeneral = {}
      horasArray.forEach((registro) => {
        // ← Cambiar de datosReales.registros a horasArray
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
        duracionFuera: formatearDuracionHoras(item.duracionFuera), // 🔥 CAMBIO
        duracionTotal: formatearDuracionHoras(item.duracionTotal), // 🔥 CAMBIO
        duracionDentro: formatearDuracionHoras(item.duracionDentro), // 🔥 CAMBIO
      }))

      const totalesFormateados = {
        duracionFuera: formatearDuracionHoras(totales.duracionFuera), // 🔥 CAMBIO
        duracionTotal: formatearDuracionHoras(totales.duracionTotal), // 🔥 CAMBIO
        duracionDentro: formatearDuracionHoras(totales.duracionDentro), // 🔥 CAMBIO
      }

      const datosParaPDF = {
        registros: horasArray, // ← Cambiar aquí también
        resumenGeneral: resumenGeneralArray,
        totales: totalesFormateados,
      }

      const configHoras = {
        ...config,
        horarioInicio: horarioInicio.value,
        horarioFin: horarioFin.value,
        mostrarMapaZona: mostrarMapaZona.value,
        remarcarHorasExtra: remarcarHorasExtra.value,
      }

      pdfResult = await generarPDFHorasTrabajo(configHoras, datosParaPDF)
    }

    // ✅ VALIDAR QUE SE GENERÓ EL PDF
    if (!pdfResult || !pdfResult.blob) {
      throw new Error('No se pudo generar el archivo PDF')
    }

    // ✅ GUARDAR Y DESCARGAR (FUERA DE LOS IFs)
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
    }

    const { blob } = await generarExcelEventos(config, datosReales)

    if (!blob) {
      throw new Error('No se pudo generar el archivo Excel')
    }

    const metadata = {
      nombre: `Reporte ${reportarPor.value}`,
      tipo: 'excel',
      tipoInforme: tipoInformeSeleccionado.value,
      reportarPor: reportarPor.value,
      elementos: elementosSeleccionados.value,
      rangoFechas: rangoFechaFormateado.value,
      columnas: columnasSeleccionadas.value,
      totalEventos: datosReales.totalEventos,
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
</script>
