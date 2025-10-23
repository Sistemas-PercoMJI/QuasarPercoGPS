// composables/useReporteExcel.js
import ExcelJS from 'exceljs'

export function useReporteExcel() {
  /**
   * Genera un archivo Excel con eventos agrupados
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   */
  const generarExcelEventos = async (config, datosReales) => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MJ GPS'
    workbook.created = new Date()

    // Hoja 1: Información del informe
    const infoSheet = workbook.addWorksheet('Información')

    // Título
    infoSheet.addRow(['Informe de eventos'])
    infoSheet.getCell('A1').font = { bold: true, size: 14 }

    infoSheet.addRow([])
    infoSheet.addRow([`Periodo: ${config.rangoFechaFormateado || 'No especificado'}`])
    infoSheet.addRow(['Informe generado'])
    infoSheet.addRow([
      `por: ${config.nombreUsuario || 'Usuario'} a: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    ])
    infoSheet.addRow([])

    // Resumen del informe
    if (config.mostrarResumen && datosReales.resumen) {
      infoSheet.addRow(['Resumen del informe'])
      infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true }

      const headerRow = infoSheet.addRow([config.reportarPor, 'Eventos'])
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      }

      // Agregar datos del resumen
      Object.entries(datosReales.resumen).forEach(([nombre, count]) => {
        infoSheet.addRow([nombre.toUpperCase(), count])
      })

      const totalesRow = infoSheet.addRow(['Totales:', datosReales.totalEventos || 0])
      totalesRow.font = { bold: true }

      infoSheet.addRow([])
    }

    // Elementos sin datos
    if (datosReales.elementosSinDatos && datosReales.elementosSinDatos.length > 0) {
      infoSheet.addRow(['El informe contiene solo los datos disponibles del período seleccionado.'])
      infoSheet.addRow([])
      infoSheet.addRow([
        `${config.reportarPor} que no contienen ningún dato del período seleccionado:`,
      ])
      datosReales.elementosSinDatos.forEach((elemento) => {
        infoSheet.addRow([elemento.toUpperCase()])
      })
    }

    // Ajustar anchos de columna
    infoSheet.getColumn(1).width = 80
    infoSheet.getColumn(2).width = 15

    // Hojas de detalle: Una hoja por cada elemento (conductor, objeto, etc.)
    if (datosReales.eventosAgrupados) {
      Object.entries(datosReales.eventosAgrupados).forEach(([nombreElemento, eventos]) => {
        // Limitar nombre de hoja a 30 caracteres (límite de Excel)
        const sheetName = nombreElemento.substring(0, 30)
        const detalleSheet = workbook.addWorksheet(sheetName)

        // Título con el nombre del elemento
        detalleSheet.addRow([nombreElemento.toUpperCase()])
        detalleSheet.getCell('A1').font = { bold: true, size: 12 }
        detalleSheet.addRow([])

        // Headers de columnas
        const headerRow = detalleSheet.addRow(config.columnasSeleccionadas)
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
        eventos.forEach((evento) => {
          const rowData = []

          config.columnasSeleccionadas.forEach((col) => {
            switch (col) {
              case 'Nombre de evento':
                rowData.push(evento.nombre || evento.tipoEvento || '-')
                break
              case 'Hora de inicio de evento':
                rowData.push(
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
                rowData.push(evento.duracion || '-')
                break
              case 'Condición de evento':
                rowData.push(evento.condicion || evento.descripcion || '-')
                break
              case 'Ubicación de eventos':
                rowData.push(
                  evento.ubicacion ||
                    (evento.latitud && evento.longitud
                      ? `${evento.latitud}, ${evento.longitud}`
                      : '-'),
                )
                break
              case 'Conductor':
                rowData.push(evento.conductor || '-')
                break
              case 'Vehículo':
                rowData.push(evento.vehiculo || evento.objeto || '-')
                break
              case 'Geozona':
                rowData.push(evento.geozona || '-')
                break
              case 'Velocidad':
                rowData.push(evento.velocidad ? `${evento.velocidad} km/h` : '-')
                break
              case 'Kilometraje':
                rowData.push(evento.kilometraje ? `${evento.kilometraje} km` : '-')
                break
              case 'Dirección':
                rowData.push(evento.direccion || '-')
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

        // Ajustar anchos de columna automáticamente
        detalleSheet.columns.forEach((column, index) => {
          if (index === 0) {
            column.width = 50 // Nombre de evento más ancho
          } else if (index === 1) {
            column.width = 20 // Fecha/hora
          } else if (index === 3) {
            column.width = 60 // Condición más ancha
          } else {
            column.width = 15 // Otros campos tamaño estándar
          }
        })
      })
    }

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

    return link.download
  }

  /**
   * Genera un Excel simple con una tabla de eventos
   * @param {Array} eventos - Array de eventos
   * @param {Array} columnas - Columnas a mostrar
   * @param {string} titulo - Título de la hoja
   */
  const generarExcelSimple = async (eventos, columnas, titulo = 'Eventos') => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(titulo)

    // Headers
    const headerRow = sheet.addRow(columnas)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    }

    // Datos
    eventos.forEach((evento) => {
      const rowData = columnas.map((col) => {
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
      sheet.addRow(rowData)
    })

    // Ajustar anchos
    sheet.columns.forEach((column) => {
      column.width = 20
    })

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `eventos_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    return link.download
  }

  return {
    generarExcelEventos,
    generarExcelSimple,
  }
}
