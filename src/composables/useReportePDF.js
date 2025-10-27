// composables/useReportePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLUMNAS_DISPONIBLES } from './useColumnasReportes'

export function useReportePDF() {
  /**
   * Genera un PDF con eventos agrupados
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   */
  const generarPDFEventos = (config, datosReales) => {
    const doc = new jsPDF('landscape') // Modo horizontal para más columnas
    let yPosition = 20

    // Título del documento
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Informe de Eventos', 14, yPosition)
    yPosition += 10

    // Información del reporte
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Periodo: ${config.rangoFechaFormateado}`, 14, yPosition)
    yPosition += 6
    doc.text(
      `Generado: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      14,
      yPosition,
    )
    yPosition += 6
    doc.text(`Reportar por: ${config.reportarPor}`, 14, yPosition)
    yPosition += 6
    doc.text(`Agrupar por: ${config.agruparPor}`, 14, yPosition)
    yPosition += 6
    doc.text(`Total de eventos: ${datosReales.totalEventos || 0}`, 14, yPosition)
    yPosition += 10

    // ========================================
    // 🔥 NUEVO: Resumen estadístico
    // ========================================
    if (config.mostrarResumen && datosReales.resumen) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen del Informe', 14, yPosition)
      yPosition += 8

      const resumenData = [
        ['Total de eventos', datosReales.resumen.totalEventos],
        ['Conductores únicos', datosReales.resumen.conductoresUnicos],
        ['Vehículos únicos', datosReales.resumen.vehiculosUnicos],
      ]

      autoTable(doc, {
        startY: yPosition,
        head: [['Concepto', 'Valor']],
        body: resumenData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 10 },
      })

      yPosition = doc.lastAutoTable.finalY + 10

      // Tabla de eventos por tipo
      if (
        datosReales.resumen.eventosPorTipo &&
        Object.keys(datosReales.resumen.eventosPorTipo).length > 0
      ) {
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.text('Eventos por Tipo', 14, yPosition)
        yPosition += 6

        const tiposData = Object.entries(datosReales.resumen.eventosPorTipo).map(([tipo, cant]) => [
          tipo,
          cant,
        ])

        autoTable(doc, {
          startY: yPosition,
          head: [['Tipo', 'Cantidad']],
          body: tiposData,
          theme: 'striped',
          headStyles: { fillColor: [76, 175, 80] },
          styles: { fontSize: 9 },
        })

        yPosition = doc.lastAutoTable.finalY + 10
      }
    }

    // ========================================
    // 🔥 NUEVO: Tabla de eventos con columnas dinámicas
    // ========================================
    if (datosReales.datosColumnas && datosReales.datosColumnas.length > 0) {
      // Si hay que agregar nueva página
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Detalle de Eventos', 14, yPosition)
      yPosition += 8

      // 🔥 Headers de la tabla = columnas seleccionadas
      const headers = config.columnasSeleccionadas

      // 🔥 Filas de la tabla = datosColumnas ya procesados
      const rows = datosReales.datosColumnas.map((fila) => headers.map((col) => fila[col] || 'N/A'))

      // 🔥 Configurar anchos de columna según las columnas
      const columnStyles = {}
      headers.forEach((nombreCol, index) => {
        const columnaConfig = COLUMNAS_DISPONIBLES[nombreCol]
        if (columnaConfig) {
          // Convertir ancho de pixels a mm (aproximado)
          columnStyles[index] = { cellWidth: columnaConfig.ancho / 4 }
        }
      })

      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        columnStyles: columnStyles,
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer con número de página
          const pageCount = doc.internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' },
          )
        },
      })

      yPosition = doc.lastAutoTable.finalY + 10
    }

    // ========================================
    // OPCIÓN ALTERNATIVA: Eventos agrupados (si usas agrupación)
    // ========================================
    if (datosReales.eventosAgrupados && Object.keys(datosReales.eventosAgrupados).length > 0) {
      Object.entries(datosReales.eventosAgrupados).forEach(([grupo, eventos], index) => {
        // Agregar nueva página si es necesario
        if (index > 0 || yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(grupo.toUpperCase(), 14, yPosition)
        yPosition += 8

        // 🔥 Usar el sistema de columnas dinámicas
        const headers = config.columnasSeleccionadas

        // Procesar eventos del grupo con las columnas
        const tableData = eventos.map((evento) => {
          return headers.map((nombreCol) => {
            const columnaConfig = COLUMNAS_DISPONIBLES[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor) {
              return columnaConfig.obtenerValor(evento)
            }
            return 'N/A'
          })
        })

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
          styles: { fontSize: 7 },
        })

        yPosition = doc.lastAutoTable.finalY + 15
      })
    }

    // Elementos sin datos
    if (datosReales.elementosSinDatos && datosReales.elementosSinDatos.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(10)
      doc.setFont(undefined, 'italic')
      doc.text(`${config.reportarPor} sin datos en el período seleccionado:`, 14, yPosition)
      yPosition += 6

      datosReales.elementosSinDatos.forEach((elemento) => {
        doc.text(`• ${elemento}`, 20, yPosition)
        yPosition += 5
      })
    }

    // Generar el blob y nombre del archivo
    const pdfBlob = doc.output('blob')
    const fecha = new Date().toISOString().split('T')[0]
    const filename = `Informe_Eventos_${fecha}.pdf`

    return {
      blob: pdfBlob,
      filename: filename,
    }
  }

  /**
   * Genera un PDF simple con una tabla de eventos
   * @param {Array} eventos - Array de eventos (notificaciones)
   * @param {Array} columnas - Nombres de columnas a mostrar
   * @param {string} titulo - Título del reporte
   */
  const generarPDFSimple = (eventos, columnas, titulo = 'Reporte de Eventos') => {
    const doc = new jsPDF('landscape')

    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(titulo, 14, 20)

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 28)
    doc.text(`Total de eventos: ${eventos.length}`, 14, 34)

    // 🔥 NUEVO: Usar sistema de columnas dinámicas
    const tableData = eventos.map((evento) => {
      return columnas.map((nombreCol) => {
        const columnaConfig = COLUMNAS_DISPONIBLES[nombreCol]
        if (columnaConfig && columnaConfig.obtenerValor) {
          return columnaConfig.obtenerValor(evento)
        }
        return 'N/A'
      })
    })

    autoTable(doc, {
      startY: 40,
      head: [columnas],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
    })

    const fecha = new Date().toISOString().split('T')[0]
    const filename = `Reporte_${fecha}.pdf`
    const pdfBlob = doc.output('blob')

    return {
      blob: pdfBlob,
      filename: filename,
    }
  }

  return {
    generarPDFEventos,
    generarPDFSimple,
  }
}
