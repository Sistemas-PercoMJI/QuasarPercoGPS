// composables/useReporteExcel.js
import ExcelJS from 'exceljs'
import { COLUMNAS_POR_TIPO } from './useColumnasReportes'

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

    // ========================================
    // HOJA 1: Información del informe
    // ========================================
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
    infoSheet.addRow([`Total de eventos: ${datosReales.totalEventos || 0}`])
    infoSheet.addRow([])

    // ========================================
    // 🔥 NUEVO: Resumen estadístico mejorado
    // ========================================
    if (config.mostrarResumen && datosReales.resumen) {
      infoSheet.addRow(['RESUMEN DEL INFORME'])
      infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true, size: 12 }
      infoSheet.addRow([])

      // Información general
      infoSheet.addRow(['Estadísticas Generales'])
      infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true }

      const statsHeaderRow = infoSheet.addRow(['Concepto', 'Valor'])
      statsHeaderRow.font = { bold: true }
      statsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      }

      infoSheet.addRow(['Total de eventos', datosReales.resumen.totalEventos])
      infoSheet.addRow(['Conductores únicos', datosReales.resumen.conductoresUnicos])
      infoSheet.addRow(['Vehículos únicos', datosReales.resumen.vehiculosUnicos])
      infoSheet.addRow([])

      // Eventos por tipo
      if (
        datosReales.resumen.eventosPorTipo &&
        Object.keys(datosReales.resumen.eventosPorTipo).length > 0
      ) {
        infoSheet.addRow(['Eventos por Tipo'])
        infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true }

        const tipoHeaderRow = infoSheet.addRow(['Tipo', 'Cantidad'])
        tipoHeaderRow.font = { bold: true }
        tipoHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB8E6B8' },
        }

        Object.entries(datosReales.resumen.eventosPorTipo).forEach(([tipo, count]) => {
          infoSheet.addRow([tipo, count])
        })
        infoSheet.addRow([])
      }

      // Eventos por ubicación (Top 15)
      if (
        datosReales.resumen.eventosPorUbicacion &&
        Object.keys(datosReales.resumen.eventosPorUbicacion).length > 0
      ) {
        infoSheet.addRow(['Eventos por Ubicación (Top 15)'])
        infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true }

        const ubicHeaderRow = infoSheet.addRow(['Ubicación', 'Cantidad'])
        ubicHeaderRow.font = { bold: true }
        ubicHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB8D4E6' },
        }

        Object.entries(datosReales.resumen.eventosPorUbicacion)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .forEach(([ubicacion, count]) => {
            infoSheet.addRow([ubicacion, count])
          })
        infoSheet.addRow([])
      }
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
    infoSheet.getColumn(1).width = 50
    infoSheet.getColumn(2).width = 20

    // ========================================
    // 🔥 HOJA 2: Todos los eventos (sin agrupar)
    // ========================================
    // Siempre crear la hoja, aunque no haya datos
    const todosSheet = workbook.addWorksheet('Todos los Eventos')

    // Título
    todosSheet.addRow(['TODOS LOS EVENTOS'])
    todosSheet.getCell('A1').font = { bold: true, size: 12 }
    todosSheet.addRow([`Total: ${datosReales.totalEventos || 0} eventos`])
    todosSheet.addRow([])

    // 🔥 Headers de columnas = columnas seleccionadas (SIEMPRE mostrar)
    const headerRow = todosSheet.addRow(config.columnasSeleccionadas)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    }

    // Agregar bordes al header
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    // 🔥 Si hay datos, agregarlos
    if (datosReales.datosColumnas && datosReales.datosColumnas.length > 0) {
      datosReales.datosColumnas.forEach((fila) => {
        const rowData = config.columnasSeleccionadas.map((col) => fila[col] || 'N/A')
        const dataRow = todosSheet.addRow(rowData)

        // Agregar bordes
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
      })
    } else {
      // 🔥 Si no hay datos, mostrar mensaje
      const emptyRow = todosSheet.addRow(['No hay eventos en el período seleccionado'])
      emptyRow.getCell(1).alignment = { horizontal: 'center' }
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF999999' } }

      // Combinar celdas para el mensaje
      todosSheet.mergeCells(
        todosSheet.rowCount,
        1,
        todosSheet.rowCount,
        config.columnasSeleccionadas.length,
      )
    }

    // 🔥 Ajustar anchos según configuración de columnas
    config.columnasSeleccionadas.forEach((nombreCol, index) => {
      const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
      if (columnaConfig) {
        todosSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
      } else {
        todosSheet.getColumn(index + 1).width = 15
      }
    })

    // ========================================
    // 🔥 HOJAS 3+: Eventos agrupados (opcional)
    // ========================================
    if (datosReales.eventosAgrupados) {
      Object.entries(datosReales.eventosAgrupados).forEach(([nombreElemento, eventos]) => {
        // Limitar nombre de hoja a 30 caracteres (límite de Excel)
        const sheetName = nombreElemento.substring(0, 30)
        const detalleSheet = workbook.addWorksheet(sheetName)

        // Título con el nombre del elemento
        detalleSheet.addRow([nombreElemento.toUpperCase()])
        detalleSheet.getCell('A1').font = { bold: true, size: 12 }
        detalleSheet.addRow([`Total: ${eventos.length} eventos`])
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

        // 🔥 Datos de eventos usando el sistema de columnas
        eventos.forEach((evento) => {
          const rowData = config.columnasSeleccionadas.map((nombreCol) => {
            const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor) {
              return columnaConfig.obtenerValor(evento)
            }
            return 'N/A'
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

        // 🔥 Ajustar anchos según configuración
        config.columnasSeleccionadas.forEach((nombreCol, index) => {
          const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
          if (columnaConfig) {
            detalleSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
          } else {
            detalleSheet.getColumn(index + 1).width = 15
          }
        })
      })
    }

    // ========================================
    // HOJA FINAL: Configuración del reporte
    // ========================================
    const configSheet = workbook.addWorksheet('Configuración')

    configSheet.addRow(['CONFIGURACIÓN DEL REPORTE'])
    configSheet.getCell('A1').font = { bold: true, size: 12 }
    configSheet.addRow([])

    configSheet.addRow(['Parámetro', 'Valor'])
    configSheet.getRow(3).font = { bold: true }
    configSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    }

    configSheet.addRow(['Fecha de generación', new Date().toLocaleString('es-MX')])
    configSheet.addRow(['Periodo', config.rangoFechaFormateado || 'N/A'])
    configSheet.addRow(['Reportar por', config.reportarPor || 'N/A'])
    configSheet.addRow(['Agrupar por', config.agruparPor || 'N/A'])
    configSheet.addRow(['Usuario', config.nombreUsuario || 'N/A'])
    configSheet.addRow([])

    configSheet.addRow(['COLUMNAS INCLUIDAS'])
    configSheet.getCell(`A${configSheet.rowCount}`).font = { bold: true }
    config.columnasSeleccionadas.forEach((col, index) => {
      configSheet.addRow([`${index + 1}. ${col}`])
    })

    configSheet.getColumn(1).width = 30
    configSheet.getColumn(2).width = 50

    // ========================================
    // Guardar el archivo
    // ========================================
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const fecha = new Date().toISOString().split('T')[0]
    const filename = `Informe_Eventos_${fecha}.xlsx`

    // 🔥 Descargar automáticamente
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)

    // ✅ DEVOLVER BLOB Y FILENAME (para subir a Firebase)
    return {
      blob: blob,
      filename: filename,
    }
  }

  /**
   * Genera un Excel simple con una tabla de eventos
   * @param {Array} eventos - Array de eventos (notificaciones)
   * @param {Array} columnas - Columnas a mostrar
   * @param {string} titulo - Título de la hoja
   */
  const generarExcelSimple = async (eventos, columnas, titulo = 'Eventos') => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(titulo)

    // Título
    sheet.addRow([titulo.toUpperCase()])
    sheet.getCell('A1').font = { bold: true, size: 14 }
    sheet.addRow([`Total: ${eventos.length} eventos`])
    sheet.addRow([])

    // Headers
    const headerRow = sheet.addRow(columnas)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    }
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    })

    // 🔥 NUEVO: Usar sistema de columnas dinámicas
    eventos.forEach((evento) => {
      const rowData = columnas.map((nombreCol) => {
        const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
        if (columnaConfig && columnaConfig.obtenerValor) {
          return columnaConfig.obtenerValor(evento)
        }
        return 'N/A'
      })
      sheet.addRow(rowData)
    })

    // 🔥 Ajustar anchos según configuración
    columnas.forEach((nombreCol, index) => {
      const columnaConfig = COLUMNAS_POR_TIPO[nombreCol]
      if (columnaConfig) {
        sheet.getColumn(index + 1).width = columnaConfig.ancho / 7
      } else {
        sheet.getColumn(index + 1).width = 20
      }
    })

    // Guardar
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const fecha = new Date().toISOString().split('T')[0]
    const filename = `${titulo}_${fecha}.xlsx`

    // 🔥 Descargar automáticamente
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)

    return {
      blob: blob,
      filename: filename,
    }
  }

  return {
    generarExcelEventos,
    generarExcelSimple,
  }
}
