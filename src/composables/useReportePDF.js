// composables/useReportePDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function useReportePDF() {
  /**
   * Genera un PDF con eventos agrupados
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   */
  const generarPDFEventos = (config, datosReales) => {
    const doc = new jsPDF()
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
    yPosition += 10

    // Resumen del informe
    if (config.mostrarResumen && datosReales.resumen) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen del Informe', 14, yPosition)
      yPosition += 8

      const resumenData = Object.entries(datosReales.resumen).map(([nombre, count]) => [
        nombre,
        count,
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [[config.reportarPor, 'Eventos']],
        body: resumenData,
        foot: [['Total', datosReales.totalEventos || 0]],
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        footStyles: { fillColor: [211, 211, 211], fontStyle: 'bold' },
      })

      yPosition = doc.lastAutoTable.finalY + 10
    }

    // Detalle de eventos por grupo
    if (datosReales.eventosAgrupados) {
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

        // Preparar datos para la tabla
        const tableData = eventos.map((evento) => {
          const row = []

          config.columnasSeleccionadas.forEach((columna) => {
            switch (columna) {
              case 'Nombre de evento':
                row.push(evento.nombre || evento.tipoEvento || '-')
                break
              case 'Hora de inicio de evento':
                row.push(
                  evento.fecha
                    ? new Date(evento.fecha).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '-',
                )
                break
              case 'Duración':
                row.push(evento.duracion || '-')
                break
              case 'Condición de evento':
                row.push(evento.condicion || evento.descripcion || '-')
                break
              case 'Ubicación de eventos':
                row.push(
                  evento.ubicacion ||
                    (evento.latitud && evento.longitud
                      ? `${evento.latitud}, ${evento.longitud}`
                      : '-'),
                )
                break
              case 'Conductor':
                row.push(evento.conductor || '-')
                break
              case 'Vehículo':
                row.push(evento.vehiculo || evento.objeto || '-')
                break
              case 'Geozona':
                row.push(evento.geozona || '-')
                break
              case 'Velocidad':
                row.push(evento.velocidad ? `${evento.velocidad} km/h` : '-')
                break
              default:
                row.push('-')
            }
          })

          return row
        })

        autoTable(doc, {
          startY: yPosition,
          head: [config.columnasSeleccionadas],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 50 }, // Nombre de evento
            1: { cellWidth: 35 }, // Hora
            2: { cellWidth: 20 }, // Duración
          },
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

    // Guardar el PDF
    const filename = `informe_eventos_${Date.now()}.pdf`
    doc.save(filename)

    return filename
  }

  /**
   * Genera un PDF simple con una tabla de eventos
   * @param {Array} eventos - Array de eventos
   * @param {Array} columnas - Columnas a mostrar
   * @param {string} titulo - Título del reporte
   */
  const generarPDFSimple = (eventos, columnas, titulo = 'Reporte de Eventos') => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(titulo, 14, 20)

    const tableData = eventos.map((evento) => {
      return columnas.map((col) => {
        switch (col) {
          case 'Nombre de evento':
            return evento.nombre || evento.tipoEvento || '-'
          case 'Fecha':
            return evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-MX') : '-'
          case 'Hora':
            return evento.fecha ? new Date(evento.fecha).toLocaleTimeString('es-MX') : '-'
          case 'Conductor':
            return evento.conductor || '-'
          case 'Vehículo':
            return evento.vehiculo || evento.objeto || '-'
          default:
            return '-'
        }
      })
    })

    autoTable(doc, {
      startY: 30,
      head: [columnas],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
    })

    const filename = `reporte_${Date.now()}.pdf`
    doc.save(filename)

    return filename
  }

  return {
    generarPDFEventos,
    generarPDFSimple,
  }
}
