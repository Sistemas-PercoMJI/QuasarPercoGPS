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
          />
          <q-btn
            color="positive"
            label="Generar Excel"
            icon="table_chart"
            unelevated
            style="width: 200px"
            @click="generarExcel"
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
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

const $q = useQuasar()
const tab = ref('crear')

// Datos del formulario
const tipoInforme = ref('Informe de eventos')
const reportarPor = ref('Objetos')
const elementosSeleccionados = ref([])
const eventos = ref([])
const agruparPor = ref('Objetos')
const mostrarUnidades = ref(false)
const rangoFecha = ref(null)
const rangoFechaTemporal = ref(null)
const dateProxy = ref(null)
const mostrarResumen = ref(true)

// Computed para formatear el rango de fechas
const rangoFechaFormateado = computed(() => {
  if (!rangoFecha.value) return ''

  if (typeof rangoFecha.value === 'string') {
    return rangoFecha.value
  }

  if (rangoFecha.value.from && rangoFecha.value.to) {
    return `${rangoFecha.value.from} - ${rangoFecha.value.to}`
  }

  return ''
})

// Función para aplicar el rango de fecha
const aplicarRangoFecha = () => {
  rangoFecha.value = rangoFechaTemporal.value
  dateProxy.value.hide()
}

// Columnas
const columnasSeleccionadas = ref([
  'Nombre de evento',
  'Hora de inicio de evento',
  'Duración',
  'Ubicación de eventos',
])

const columnaAgregar = ref(null)
const columnasDisponiblesFiltradas = ref([])

// Todas las columnas disponibles
const todasLasColumnas = [
  'Nombre de evento',
  'Hora de inicio de evento',
  'Hora de fin de evento',
  'Duración',
  'Ubicación de eventos',
  'Nombre de objeto',
  'Conductor',
  'Ubicación al inicio',
  'Ubicación al final',
  'Velocidad máxima',
  'Velocidad promedio',
  'Distancia recorrida',
  'Combustible consumido',
  'Tiempo de ralentí',
  'Número de frenadas',
  'Temperatura',
]

// Opciones
const tiposInforme = [
  'Informe de eventos',
  'Informe de viajes',
  'Informe de combustible',
  'Informe de velocidad',
]

const opcionesReportar = ['Objetos', 'Grupos', 'Conductores']
const opcionesAgrupar = ['Objetos', 'Eventos', 'Fecha']

// Datos según la selección de "Reportar por"
const datosObjetos = ['Vehículo 1', 'Vehículo 2', 'Vehículo 3', 'Camión 001', 'Camión 002']
const datosGrupos = ['Grupo Norte', 'Grupo Sur', 'Grupo Este', 'Grupo Oeste', 'Flota Principal']
const datosConductores = [
  'Juan Pérez',
  'María González',
  'Carlos Rodríguez',
  'Ana Martínez',
  'Luis Hernández',
]

const listaEventos = [
  'Exceso de velocidad',
  'Entrada a gezona',
  'Salida de gezona',
  'Ralentí prolongado',
  'Frenado brusco',
]

// Computed para etiqueta dinámica
const etiquetaSelector = computed(() => {
  return reportarPor.value
})

// Computed para opciones dinámicas según "Reportar por"
const opcionesSelector = computed(() => {
  switch (reportarPor.value) {
    case 'Objetos':
      return datosObjetos
    case 'Grupos':
      return datosGrupos
    case 'Conductores':
      return datosConductores
    default:
      return []
  }
})

// Computed para columnas disponibles (las que no están seleccionadas)
const columnasDisponibles = computed(() => {
  return todasLasColumnas.filter((col) => !columnasSeleccionadas.value.includes(col))
})

// Filtrar columnas en el buscador
const filtrarColumnas = (val, update) => {
  update(() => {
    if (val === '') {
      columnasDisponiblesFiltradas.value = columnasDisponibles.value
    } else {
      const needle = val.toLowerCase()
      columnasDisponiblesFiltradas.value = columnasDisponibles.value.filter(
        (col) => col.toLowerCase().indexOf(needle) > -1,
      )
    }
  })
}

// Agregar columna seleccionada
const agregarColumna = (val) => {
  if (val && !columnasSeleccionadas.value.includes(val)) {
    columnasSeleccionadas.value.push(val)
    columnaAgregar.value = null // Limpiar el selector
  }
}

// Remover columna
const removerColumna = (col) => {
  const index = columnasSeleccionadas.value.indexOf(col)
  if (index > -1) {
    columnasSeleccionadas.value.splice(index, 1)
  }
}

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

const generarReporte = () => {
  // Validaciones básicas
  if (!rangoFecha.value) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona un rango de fechas',
      icon: 'warning',
    })
    return
  }

  if (elementosSeleccionados.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: `Por favor selecciona al menos un ${reportarPor.value.toLowerCase()}`,
      icon: 'warning',
    })
    return
  }

  // Datos de ejemplo para el PDF
  const datosEjemplo = [
    {
      nombreEvento: 'SALIDA TALLER MJ INDUSTRIAL PINOS',
      horaInicio: '2 de octubre de 2025, 8:27',
      duracion: '03:48:05',
      condicion: 'Vehículo fuera de la geozona MJ INDUSTRIAL TALLER',
    },
    {
      nombreEvento: 'ENTRADA ÁGUILAS DEL DESIERTO CARRETERA LIBRE TECATE',
      horaInicio: '2 de octubre de 2025, 9:40',
      duracion: '01:29:24',
      condicion: 'El vehículo ha entrado en la geozona ÁGUILAS DEL DESIERTO LIBRE-TECATE',
    },
    {
      nombreEvento: 'SALIDA ÁGUILAS DEL DESIERTO CARRETERA LIBRE A TECATE',
      horaInicio: '2 de octubre de 2025, 11:09',
      duracion: '',
      condicion: 'Vehículo fuera de la geozona ÁGUILAS DEL DESIERTO LIBRE-TECATE',
    },
    {
      nombreEvento: 'ENTRADA TALLER MJ INDUSTRIAL PINOS',
      horaInicio: '2 de octubre de 2025, 12:15',
      duracion: '01:48:37',
      condicion: 'El vehículo ha entrado en la geozona MJ INDUSTRIAL TALLER',
    },
    {
      nombreEvento: 'SALIDA TALLER MJ INDUSTRIAL PINOS',
      horaInicio: '2 de octubre de 2025, 14:04',
      duracion: '00:46:37',
      condicion: 'Vehículo fuera de la geozona MJ INDUSTRIAL TALLER',
    },
    {
      nombreEvento: 'ENTRADA TALLER MJ INDUSTRIAL PINOS',
      horaInicio: '2 de octubre de 2025, 14:50',
      duracion: '',
      condicion: 'El vehículo ha entrado en la geozona MJ INDUSTRIAL TALLER',
    },
  ]

  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    let yPos = 20

    // Logo MJ GPS (texto como placeholder)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(187, 0, 0)
    doc.text('MJ GPS', pageWidth - 40, yPos, { align: 'right' })

    // Título del informe
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text('Informe de eventos', 14, yPos)

    yPos += 15

    // Información del período
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const periodoTexto = `Periodo: ${rangoFechaFormateado.value || 'No especificado'}`
    doc.text(periodoTexto, 14, yPos)

    yPos += 5
    const fechaGeneracion = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    doc.text(`Informe generado: ${fechaGeneracion}`, 14, yPos)

    yPos += 10

    // Resumen del informe
    if (mostrarResumen.value) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen del informe', 14, yPos)

      yPos += 8

      // Tabla de resumen
      const conductorEjemplo = elementosSeleccionados.value[0] || 'CHRISTOPHER'
      const resumenData = [[conductorEjemplo, '6']]

      autoTable(doc, {
        startY: yPos,
        head: [[reportarPor.value === 'Conductores' ? 'Conductor' : 'Objeto', 'Eventos']],
        body: resumenData,
        foot: [['Totales:', '6']],
        theme: 'grid',
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 10,
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        bodyStyles: {
          fontSize: 9,
        },
        margin: { left: 14 },
      })

      yPos = doc.lastAutoTable.finalY + 10

      // Nota sobre conductores sin datos
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      const elementosSinDatos = elementosSeleccionados.value.filter((_, i) => i > 0)
      if (elementosSinDatos.length > 0) {
        doc.text(
          `${reportarPor.value} que no contienen ningún dato del período seleccionado:`,
          14,
          yPos,
        )
        yPos += 5
        doc.setFont('helvetica', 'bold')
        doc.text(elementosSinDatos.join(', '), 14, yPos)
        yPos += 10
      }
    }

    // Detalle por conductor/objeto
    elementosSeleccionados.value.forEach((elemento, index) => {
      if (index > 0 && yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(elemento.toUpperCase(), 14, yPos)

      yPos += 8

      // Preparar datos de la tabla según columnas seleccionadas
      const tableData = datosEjemplo.map((evento) => {
        const row = []
        columnasSeleccionadas.value.forEach((col) => {
          switch (col) {
            case 'Nombre de evento':
              row.push(evento.nombreEvento)
              break
            case 'Hora de inicio de evento':
              row.push(evento.horaInicio)
              break
            case 'Duración':
              row.push(evento.duracion)
              break
            case 'Condición de evento':
            case 'Ubicación de eventos':
              row.push(evento.condicion)
              break
            default:
              row.push('-')
          }
        })
        return row
      })

      // Tabla de eventos
      autoTable(doc, {
        startY: yPos,
        head: [columnasSeleccionadas.value],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 45 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Pie de página con número de página
          const pageCount = doc.internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' },
          )
        },
      })

      yPos = doc.lastAutoTable.finalY + 15
    })

    // Guardar el PDF
    const nombreArchivo = `informe_eventos_${Date.now()}.pdf`
    doc.save(nombreArchivo)

    $q.notify({
      type: 'positive',
      message: 'PDF generado exitosamente',
      icon: 'check_circle',
      timeout: 2000,
    })

    console.log('Reporte generado con:', {
      tipoInforme: tipoInforme.value,
      reportarPor: reportarPor.value,
      elementos: elementosSeleccionados.value,
      eventos: eventos.value,
      rangoFecha: rangoFecha.value,
      columnas: columnasSeleccionadas.value,
    })
  } catch (error) {
    console.error('Error al generar PDF:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al generar el PDF',
      icon: 'error',
    })
  }
}

const generarExcel = async () => {
  // Validaciones básicas
  if (!rangoFecha.value) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona un rango de fechas',
      icon: 'warning',
    })
    return
  }

  if (elementosSeleccionados.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: `Por favor selecciona al menos un ${reportarPor.value.toLowerCase()}`,
      icon: 'warning',
    })
    return
  }

  try {
    // Crear un nuevo libro de Excel
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MJ GPS'
    workbook.created = new Date()

    // Datos de ejemplo
    const datosEjemplo = [
      {
        nombreEvento: 'SALIDA TALLER MJ INDUSTRIAL PINOS',
        horaInicio: '02/10/2025 8:27:36',
        duracion: '03:48:05',
        condicion: 'Vehículo fuera de la geozona MJ INDUSTRIAL TALLER',
      },
      {
        nombreEvento: 'ENTRADA ÁGUILAS DEL DESIERTO CARRETERA LIBRE TECATE',
        horaInicio: '02/10/2025 9:40:05',
        duracion: '01:29:24',
        condicion: 'El vehículo ha entrado en la geozona ÁGUILAS DEL DESIERTO LIBRE-TECATE',
      },
      {
        nombreEvento: 'SALIDA ÁGUILAS DEL DESIERTO CARRETERA LIBRE A TECATE',
        horaInicio: '02/10/2025 11:09:30',
        duracion: '',
        condicion: 'Vehículo fuera de la geozona ÁGUILAS DEL DESIERTO LIBRE-TECATE',
      },
      {
        nombreEvento: 'ENTRADA TALLER MJ INDUSTRIAL PINOS',
        horaInicio: '02/10/2025 12:15:41',
        duracion: '01:48:37',
        condicion: 'El vehículo ha entrado en la geozona MJ INDUSTRIAL TALLER',
      },
      {
        nombreEvento: 'SALIDA TALLER MJ INDUSTRIAL PINOS',
        horaInicio: '02/10/2025 14:04:18',
        duracion: '00:46:37',
        condicion: 'Vehículo fuera de la geozona MJ INDUSTRIAL TALLER',
      },
      {
        nombreEvento: 'ENTRADA TALLER MJ INDUSTRIAL PINOS',
        horaInicio: '02/10/2025 14:50:55',
        duracion: '',
        condicion: 'El vehículo ha entrado en la geozona MJ INDUSTRIAL TALLER',
      },
    ]

    // Hoja 1: Información del informe
    const infoSheet = workbook.addWorksheet('Información')

    // Título
    infoSheet.addRow(['Informe de eventos'])
    infoSheet.getCell('A1').font = { bold: true, size: 14 }

    infoSheet.addRow([])
    infoSheet.addRow([`Periodo: ${rangoFechaFormateado.value || 'No especificado'}`])
    infoSheet.addRow(['Informe generado'])
    infoSheet.addRow([
      `por: PERCO-TIJUANA, PERCO a: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    ])
    infoSheet.addRow([])

    // Resumen
    infoSheet.addRow(['Resumen del informe'])
    infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true }

    const headerRow = infoSheet.addRow([
      reportarPor.value === 'Conductores' ? 'Conductor' : 'Conductor',
      'Eventos',
    ])
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    }

    // Agregar datos del resumen
    elementosSeleccionados.value.forEach((elemento) => {
      infoSheet.addRow([elemento.toUpperCase(), 6])
    })

    const totalesRow = infoSheet.addRow(['Totales:', 6])
    totalesRow.font = { bold: true }

    infoSheet.addRow([])
    infoSheet.addRow(['Informe de eventos'])

    // Conductores sin datos
    const conductoresSinDatos = elementosSeleccionados.value.filter((_, i) => i > 0)
    if (conductoresSinDatos.length > 0) {
      infoSheet.addRow([])
      infoSheet.addRow([
        'El informe contiene solo los vehículos que el usuario puede ver. Los conductores seleccionados pueden haber conducido más vehículos de los que se muestran en el informe generado.',
      ])
      infoSheet.addRow([])
      infoSheet.addRow([
        `${reportarPor.value} que no contienen ningún dato del período seleccionado:`,
      ])
      conductoresSinDatos.forEach((conductor) => {
        infoSheet.addRow([conductor.toUpperCase()])
      })
    }

    // Ajustar anchos de columna
    infoSheet.getColumn(1).width = 80
    infoSheet.getColumn(2).width = 15

    // Hoja 2+: Detalle de eventos por conductor/objeto
    elementosSeleccionados.value.forEach((elemento) => {
      const sheetName = elemento.substring(0, 30)
      const detalleSheet = workbook.addWorksheet(sheetName)

      // Título con el nombre del conductor
      detalleSheet.addRow([elemento.toUpperCase()])
      detalleSheet.getCell('A1').font = { bold: true, size: 12 }
      detalleSheet.addRow([])

      // Headers de columnas
      const headerRow = detalleSheet.addRow(columnasSeleccionadas.value)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      }

      // Agregar bordes al header
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })

      // Datos de eventos
      datosEjemplo.forEach((evento) => {
        const rowData = []
        columnasSeleccionadas.value.forEach((col) => {
          switch (col) {
            case 'Nombre de evento':
              rowData.push(evento.nombreEvento)
              break
            case 'Hora de inicio de evento':
              rowData.push(evento.horaInicio)
              break
            case 'Duración':
              rowData.push(evento.duracion)
              break
            case 'Condición de evento':
            case 'Ubicación de eventos':
              rowData.push(evento.condicion)
              break
            default:
              rowData.push('-')
          }
        })

        const dataRow = detalleSheet.addRow(rowData)

        // Agregar bordes a cada celda
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
      })

      // Ajustar anchos de columna
      detalleSheet.getColumn(1).width = 50 // Nombre de evento
      detalleSheet.getColumn(2).width = 20 // Hora
      detalleSheet.getColumn(3).width = 12 // Duración
      detalleSheet.getColumn(4).width = 60 // Condición
    })

    // Guardar el archivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `informe_eventos_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    $q.notify({
      type: 'positive',
      message: 'Excel generado exitosamente',
      icon: 'check_circle',
      timeout: 2000,
    })

    console.log('Excel generado con:', {
      tipoInforme: tipoInforme.value,
      reportarPor: reportarPor.value,
      elementos: elementosSeleccionados.value,
      eventos: eventos.value,
      rangoFecha: rangoFecha.value,
      columnas: columnasSeleccionadas.value,
    })
  } catch (error) {
    console.error('Error al generar Excel:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al generar el Excel',
      icon: 'error',
    })
  }
}
</script>
