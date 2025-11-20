// composables/useReportePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLUMNAS_POR_TIPO } from './useColumnasReportes'

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
        const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
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
            const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
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
        const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
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

  /**
   * 🆕 Genera un PDF con trayectos e incluye mapa
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   * @param {Object} mapaData - Datos del mapa (opcional) { dataURL, rutas }
   */
  const generarPDFTrayectos = (config, datosReales, mapaData = null) => {
    const doc = new jsPDF('landscape')
    let yPosition = 20

    // Título del documento
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Informe de Trayectos', 14, yPosition)
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
    doc.text(`Total de trayectos: ${datosReales.totalTrayectos || 0}`, 14, yPosition)
    yPosition += 10

    // ========================================
    // 🗺️ MAPA DE TRAYECTOS (si está habilitado)
    // ========================================
    if (config.mostrarMapaTrayecto && mapaData && mapaData.dataURL) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Mapa de Trayectos', 14, yPosition)
      yPosition += 8

      try {
        // Agregar imagen del mapa
        // Calcular dimensiones para que quepa en la página
        const pageWidth = doc.internal.pageSize.width
        const maxWidth = pageWidth - 28 // Márgenes de 14 a cada lado

        // Dimensiones de la imagen (proporción 3:2)
        const imgWidth = maxWidth
        const imgHeight = (imgWidth * 2) / 3

        doc.addImage(mapaData.dataURL, 'PNG', 14, yPosition, imgWidth, imgHeight)
        yPosition += imgHeight + 10

        // Leyenda de colores
        if (mapaData.rutas && mapaData.rutas.length > 0) {
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.text('Leyenda:', 14, yPosition)
          yPosition += 6

          doc.setFont(undefined, 'normal')
          mapaData.rutas.forEach((ruta) => {
            // Dibujar cuadrito de color
            const colorHex = ruta.color
            const r = parseInt(colorHex.substring(1, 3), 16)
            const g = parseInt(colorHex.substring(3, 5), 16)
            const b = parseInt(colorHex.substring(5, 7), 16)

            doc.setFillColor(r, g, b)
            doc.rect(14, yPosition - 3, 4, 4, 'F')

            // Nombre de la unidad
            doc.text(`${ruta.nombre} (${ruta.totalPuntos} puntos GPS)`, 20, yPosition)
            yPosition += 5

            // Si llegamos al final de la página, agregar nueva página
            if (yPosition > 180) {
              doc.addPage()
              yPosition = 20
            }
          })

          yPosition += 5
        }

        // Marcadores
        doc.setFontSize(9)
        doc.setFont(undefined, 'italic')
        doc.setFillColor(76, 175, 80) // Verde
        doc.circle(14, yPosition - 1, 1.5, 'F')
        doc.text('Punto de inicio', 18, yPosition)

        doc.setFillColor(244, 67, 54) // Rojo
        doc.circle(60, yPosition - 1, 1.5, 'F')
        doc.text('Punto de fin', 64, yPosition)

        yPosition += 10
      } catch (err) {
        console.error('❌ Error agregando mapa al PDF:', err)
        doc.setFontSize(9)
        doc.setFont(undefined, 'italic')
        doc.text('(No se pudo cargar el mapa)', 14, yPosition)
        yPosition += 10
      }
    }

    // ========================================
    // 📊 RESUMEN ESTADÍSTICO
    // ========================================
    if (config.mostrarResumen && datosReales.resumen) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen Estadístico', 14, yPosition)
      yPosition += 8

      const resumenData = [
        ['Total de trayectos', datosReales.resumen.totalTrayectos || 0],
        ['Unidades únicas', datosReales.resumen.unidadesUnicas || 0],
        ['Kilometraje total', `${datosReales.resumen.kilometrajeTotal || 0} km`],
        ['Duración total', `${datosReales.resumen.duracionTotal || 0} hrs`],
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
    }

    // ========================================
    // 📋 TABLA DE TRAYECTOS
    // ========================================
    if (datosReales.datosColumnas && datosReales.datosColumnas.length > 0) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Detalle de Trayectos', 14, yPosition)
      yPosition += 8

      // Headers de la tabla
      const headers = config.columnasSeleccionadas

      // Filas de la tabla
      const rows = datosReales.datosColumnas.map((fila) => headers.map((col) => fila[col] || 'N/A'))

      // Configurar anchos de columna
      const columnStyles = {}
      headers.forEach((nombreCol, index) => {
        const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
        if (columnaConfig) {
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
    // 📋 TRAYECTOS AGRUPADOS (alternativa)
    // ========================================
    if (datosReales.trayectosAgrupados && Object.keys(datosReales.trayectosAgrupados).length > 0) {
      Object.entries(datosReales.trayectosAgrupados).forEach(([grupo, trayectos], index) => {
        if (index > 0 || yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(grupo.toUpperCase(), 14, yPosition)
        yPosition += 8

        // Información de la unidad
        if (trayectos.length > 0) {
          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          doc.text(`Total de trayectos: ${trayectos.length}`, 14, yPosition)
          yPosition += 6
        }

        // Tabla de trayectos
        const headers = config.columnasSeleccionadas || [
          'Fecha',
          'Inicio',
          'Fin',
          'Duración',
          'Kilometraje',
          'Velocidad Promedio',
        ]

        const tableData = trayectos.map((trayecto) => {
          return headers.map((nombreCol) => {
            const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor) {
              return columnaConfig.obtenerValor(trayecto)
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
    const filename = `Informe_Trayectos_${fecha}.pdf`

    return {
      blob: pdfBlob,
      filename: filename,
    }
  }

  return {
    generarPDFEventos,
    generarPDFSimple,
    generarPDFTrayectos, // 🆕
  }
}
