// composables/useReporteExcel.js
import ExcelJS from 'exceljs'
import { COLUMNAS_POR_TIPO } from './useColumnasReportes'
import { useMapboxStaticImage } from './useMapboxStaticImage'

async function agregarHojaMapas(workbook, entidades, config, etiqueta = 'Unidad') {
  const { generarURLMapaTrayectos, descargarImagenMapaBase64, prepararDatosTrayectos } =
    useMapboxStaticImage()

  const mapaSheet = workbook.addWorksheet('Mapas')
  let filaActual = 1

  // Título de la hoja
  mapaSheet.addRow(['MAPAS DE TRAYECTOS'])
  mapaSheet.getCell('A1').font = { bold: true, size: 14 }
  mapaSheet.addRow([`Generado: ${new Date().toLocaleString('es-MX')}`])
  mapaSheet.addRow([])
  filaActual = 4

  for (const [nombreEntidad, registros] of Object.entries(entidades)) {
    try {
      const trayectosParaMapa = prepararDatosTrayectos(registros)

      if (!trayectosParaMapa.length || !trayectosParaMapa[0].coordenadas.length) {
        // Sin coordenadas - poner aviso
        const avisoRow = mapaSheet.addRow([`${etiqueta}: ${nombreEntidad} — Sin datos de mapa`])
        avisoRow.font = { italic: true, color: { argb: 'FF999999' } }
        filaActual++
        mapaSheet.addRow([])
        filaActual++
        continue
      }

      // Título de la entidad
      const tituloRow = mapaSheet.addRow([`${etiqueta.toUpperCase()}: ${nombreEntidad}`])
      tituloRow.font = { bold: true, size: 12, color: { argb: 'FF2980B9' } }
      tituloRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
      mapaSheet.mergeCells(filaActual, 1, filaActual, 10)
      filaActual++

      // Generar imagen del mapa
      const urlMapa = generarURLMapaTrayectos(trayectosParaMapa, {
        width: 1200,
        height: 800,
        padding: 50,
        mostrarPins: true,
      })

      const imagenBase64 = await descargarImagenMapaBase64(urlMapa)

      if (!imagenBase64) {
        const errorRow = mapaSheet.addRow([`No se pudo generar el mapa para ${nombreEntidad}`])
        errorRow.font = { italic: true, color: { argb: 'FFCC0000' } }
        filaActual++
        mapaSheet.addRow([])
        filaActual++
        continue
      }

      // Insertar imagen en ExcelJS
      // La imagen viene como "data:image/png;base64,..." - extraer solo el base64
      const base64Data = imagenBase64.split(',')[1]

      const imageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      })

      // Cada celda de Excel es aprox 20px de alto y 64px de ancho por defecto
      // Queremos la imagen de aprox 600px ancho x 400px alto
      // En unidades de ExcelJS: col width en chars, row height en pts
      const IMAGEN_COLS = 10 // ancho en columnas
      const IMAGEN_FILAS = 20 // alto en filas

      // Ajustar alto de las filas de la imagen
      for (let i = filaActual; i < filaActual + IMAGEN_FILAS; i++) {
        mapaSheet.getRow(i).height = 20
      }
      // Ajustar ancho de columnas
      for (let c = 1; c <= IMAGEN_COLS; c++) {
        mapaSheet.getColumn(c).width = 12
      }

      mapaSheet.addImage(imageId, {
        tl: { col: 0, row: filaActual - 1 },
        br: { col: IMAGEN_COLS, row: filaActual - 1 + IMAGEN_FILAS },
        editAs: 'oneCell',
      })

      filaActual += IMAGEN_FILAS

      // Leyenda de trayectos
      const COLORES_LEYENDA = [
        'e74c3c',
        '2980b9',
        '27ae60',
        'f39c12',
        '8e44ad',
        '16a085',
        'd35400',
        '2c3e50',
      ]

      trayectosParaMapa.forEach((trayecto, idx) => {
        const color = COLORES_LEYENDA[idx % COLORES_LEYENDA.length]
        const trayectoRaw = registros[idx]
        const horaInicio =
          trayectoRaw?.horaInicioTrabajo || trayectoRaw?.inicioTimestamp
            ? new Date(
                trayectoRaw.inicioTimestamp || trayectoRaw.horaInicioTrabajo,
              ).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
            : 'N/A'
        const horaFin =
          trayectoRaw?.horaFinTrabajo || trayectoRaw?.finTimestamp
            ? new Date(trayectoRaw.finTimestamp || trayectoRaw.horaFinTrabajo).toLocaleTimeString(
                'es-MX',
                { hour: '2-digit', minute: '2-digit', hour12: false },
              )
            : 'N/A'

        const leyendaRow = mapaSheet.addRow([
          `  ■ Trayecto ${idx + 1}`,
          `Inicio: ${horaInicio}`,
          `Fin: ${horaFin}`,
          trayectoRaw?.ubicacionInicio || '',
          trayectoRaw?.ubicacionFin || '',
        ])
        leyendaRow.getCell(1).font = { bold: true, color: { argb: `FF${color.toUpperCase()}` } }
        leyendaRow.font = { size: 9 }
        filaActual++
      })

      // Espacio entre entidades
      mapaSheet.addRow([])
      mapaSheet.addRow([])
      filaActual += 2
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } catch (error) {
      console.error(`Error generando mapa para ${nombreEntidad}:`, error)
      const errorRow = mapaSheet.addRow([`Error al generar mapa: ${nombreEntidad}`])
      errorRow.font = { italic: true, color: { argb: 'FFCC0000' } }
      filaActual++
    }
  }
}
export function useReporteExcel() {
  /**
   * Genera un archivo Excel con eventos agrupados
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   */
  const generarExcelEventos = async (config, datosReales, filenameOverride = null) => {
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
    //  NUEVO: Resumen estadístico mejorado
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
    //  HOJA 2: Todos los eventos (sin agrupar)
    // ========================================
    // Siempre crear la hoja, aunque no haya datos
    const todosSheet = workbook.addWorksheet('Todos los Eventos')

    // Título
    todosSheet.addRow(['TODOS LOS EVENTOS'])
    todosSheet.getCell('A1').font = { bold: true, size: 12 }
    todosSheet.addRow([`Total: ${datosReales.totalEventos || 0} eventos`])
    todosSheet.addRow([])

    //  Headers de columnas = columnas seleccionadas (SIEMPRE mostrar)
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

    //  Si hay datos, agregarlos
    if (datosReales.eventosAgrupados) {
      // Extraer todos los eventos originales de los grupos
      const todosLosEventos = Object.values(datosReales.eventosAgrupados).flat()

      todosLosEventos.forEach((evento) => {
        //  USAR obtenerValor() igual que en las hojas individuales
        const rowData = config.columnasSeleccionadas.map((nombreCol) => {
          const columnaConfig = COLUMNAS_POR_TIPO.eventos[nombreCol]
          if (columnaConfig && columnaConfig.obtenerValor) {
            return columnaConfig.obtenerValor(evento) //  AQUÍ está la clave
          }
          return 'N/A'
        })

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
      //  Si no hay datos, mostrar mensaje
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

    //  Ajustar anchos según configuración de columnas
    config.columnasSeleccionadas.forEach((nombreCol, index) => {
      const columnaConfig = COLUMNAS_POR_TIPO.eventos[nombreCol]
      if (columnaConfig) {
        todosSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
      } else {
        todosSheet.getColumn(index + 1).width = 15
      }
    })

    // ========================================
    //  HOJAS 3+: Eventos agrupados (opcional)
    // ========================================
    if (datosReales.eventosAgrupados) {
      Object.entries(datosReales.eventosAgrupados).forEach(([nombreElemento, eventos]) => {
        // Limitar nombre de hoja a 30 caracteres (límite de Excel)
        const sheetName = nombreElemento.substring(0, 30)
        const detalleSheet = workbook.addWorksheet(sheetName)

        let currentRow = 1

        // ========================================
        // HEADER DE ENTIDAD (NIVEL 1)
        // ========================================
        const headerEntidad = detalleSheet.addRow([nombreElemento.toUpperCase()])
        headerEntidad.font = { bold: true, size: 14, color: { argb: 'FF2980B9' } }
        headerEntidad.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' },
        }
        detalleSheet.mergeCells(
          currentRow,
          1,
          currentRow,
          Math.max(config.columnasSeleccionadas.length, 6),
        )
        currentRow++

        // Subtítulo con total
        const subtituloRow = detalleSheet.addRow([`Total: ${eventos.length} eventos`])
        subtituloRow.font = { size: 10, color: { argb: 'FF646464' } }
        detalleSheet.mergeCells(
          currentRow,
          1,
          currentRow,
          Math.max(config.columnasSeleccionadas.length, 6),
        )
        currentRow++

        detalleSheet.addRow([]) // Espacio
        currentRow++

        // ========================================
        // SUB-AGRUPAR EVENTOS SEGÚN config.agruparPor
        // ========================================
        let eventosAgrupados = {}

        if (config.agruparPor === 'evento') {
          // Agrupar por nombre de evento
          eventos.forEach((evento) => {
            const clave = evento.eventoNombre || 'Sin nombre'
            if (!eventosAgrupados[clave]) eventosAgrupados[clave] = []
            eventosAgrupados[clave].push(evento)
          })
        } else if (config.agruparPor === 'dia') {
          // Agrupar por día
          eventos.forEach((evento) => {
            if (!evento.timestamp) return
            const fecha = new Date(evento.timestamp)
            const fechaStr = fecha.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
            const clave = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)
            if (!eventosAgrupados[clave]) eventosAgrupados[clave] = []
            eventosAgrupados[clave].push(evento)
          })
        } else if (config.agruparPor === 'tipo') {
          // Agrupar por tipo de evento
          eventos.forEach((evento) => {
            const tipo = evento.tipoEvento || 'Sin tipo'
            if (!eventosAgrupados[tipo]) eventosAgrupados[tipo] = []
            eventosAgrupados[tipo].push(evento)
          })
        } else if (config.agruparPor === 'geozona') {
          // Agrupar por geozona
          eventos.forEach((evento) => {
            const geozona = evento.geozonaNombre || evento.ubicacionNombre || 'Sin geozona'
            if (!eventosAgrupados[geozona]) eventosAgrupados[geozona] = []
            eventosAgrupados[geozona].push(evento)
          })
        } else {
          // Sin sub-agrupación - mostrar todos juntos
          eventosAgrupados['Todos'] = eventos
        }

        // ========================================
        // LOOP POR CADA SUB-GRUPO
        // ========================================
        Object.entries(eventosAgrupados).forEach(([nombreSubGrupo, eventosSubGrupo]) => {
          // Header del sub-grupo (NIVEL 2)
          let tituloSubGrupo = ''

          if (config.agruparPor === 'evento') {
            // Contar entradas y salidas
            const entradas = eventosSubGrupo.filter(
              (e) => e.tipoEvento?.toLowerCase() === 'entrada',
            ).length
            const salidas = eventosSubGrupo.filter(
              (e) => e.tipoEvento?.toLowerCase() === 'salida',
            ).length
            tituloSubGrupo = `EVENTO: ${nombreSubGrupo} (Entradas: ${entradas} | Salidas: ${salidas})`
          } else if (config.agruparPor === 'dia') {
            tituloSubGrupo = `DÍA: ${nombreSubGrupo}`
          } else if (config.agruparPor === 'tipo') {
            tituloSubGrupo = `TIPO: ${nombreSubGrupo}`
          } else if (config.agruparPor === 'geozona') {
            tituloSubGrupo = `GEOZONA: ${nombreSubGrupo}`
          } else {
            tituloSubGrupo = nombreSubGrupo
          }

          const headerSubGrupo = detalleSheet.addRow([tituloSubGrupo])
          headerSubGrupo.font = { bold: true, size: 12, color: { argb: 'FF3498DB' } }
          headerSubGrupo.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F8FF' },
          }

          // Borde grueso
          for (let i = 1; i <= Math.max(config.columnasSeleccionadas.length, 6); i++) {
            headerSubGrupo.getCell(i).border = {
              top: { style: 'medium' },
              bottom: { style: 'medium' },
            }
          }
          detalleSheet.mergeCells(
            currentRow,
            1,
            currentRow,
            Math.max(config.columnasSeleccionadas.length, 6),
          )
          currentRow++

          // Headers de columnas
          const headerRow = detalleSheet.addRow(config.columnasSeleccionadas)
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' },
          }

          headerRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            }
          })
          currentRow++

          // Datos de eventos del sub-grupo
          eventosSubGrupo.forEach((evento) => {
            const rowData = config.columnasSeleccionadas.map((nombreCol) => {
              const columnaConfig = COLUMNAS_POR_TIPO.eventos[nombreCol]
              if (columnaConfig && columnaConfig.obtenerValor) {
                return columnaConfig.obtenerValor(evento)
              }
              return 'N/A'
            })

            const dataRow = detalleSheet.addRow(rowData)

            // Agregar bordes
            dataRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              }
            })

            currentRow++
          })

          // Fila de totales del sub-grupo
          const totalRow = detalleSheet.addRow([`TOTAL: ${eventosSubGrupo.length} eventos`])
          totalRow.font = { bold: true, size: 10 }
          totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB3B' },
          }
          totalRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'medium' },
              left: { style: 'thin' },
              bottom: { style: 'medium' },
              right: { style: 'thin' },
            }
          })
          detalleSheet.mergeCells(
            currentRow,
            1,
            currentRow,
            Math.max(config.columnasSeleccionadas.length, 6),
          )
          currentRow++

          // Espacio entre sub-grupos
          detalleSheet.addRow([])
          currentRow++
        })

        // Ajustar anchos de columnas
        config.columnasSeleccionadas.forEach((nombreCol, index) => {
          const columnaConfig = COLUMNAS_POR_TIPO.eventos[nombreCol]
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
    const filename = filenameOverride || `Informe_Eventos_${fecha}.xlsx` // ← CAMBIO

    //  Descargar automáticamente
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)

    //  DEVOLVER BLOB Y FILENAME (para subir a Firebase)
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

    //  NUEVO: Usar sistema de columnas dinámicas
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

    //  Ajustar anchos según configuración
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

    //  Descargar automáticamente
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

  const generarExcelHorasTrabajo = async (config, datosReales, filenameOverride = null) => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MJ GPS'
    workbook.created = new Date()

    // ========================================
    // HOJA 1: Información del informe
    // ========================================
    const infoSheet = workbook.addWorksheet('Información')

    // Título
    infoSheet.addRow(['Informe de Horas de Trabajo'])
    infoSheet.getCell('A1').font = { bold: true, size: 14 }

    infoSheet.addRow([])
    infoSheet.addRow([`Periodo: ${config.rangoFechaFormateado || 'No especificado'}`])
    infoSheet.addRow([`Reportar por: ${config.reportarPor || 'N/A'}`])
    infoSheet.addRow([`Horario comercial: ${config.horarioInicio} - ${config.horarioFin}`])
    infoSheet.addRow([
      `Generado: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    ])
    infoSheet.addRow([])

    // Resumen general (si está activo)
    if (config.mostrarResumen && datosReales.registros) {
      infoSheet.addRow(['RESUMEN DEL INFORME'])
      infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true, size: 12 }
      infoSheet.addRow([])

      // Calcular totales
      let totalDuracionDentro = 0
      let totalDuracionFuera = 0
      const entidadesUnicas = new Set()

      datosReales.registros.forEach((registro) => {
        // Sumar duraciones
        const parsearDuracion = (duracion) => {
          if (!duracion || duracion === 'N/A') return 0
          const [h, m, s] = duracion.split(':').map(Number)
          return h * 3600 + m * 60 + s
        }

        totalDuracionDentro += parsearDuracion(registro.duracionDentroHorario)
        totalDuracionFuera += parsearDuracion(registro.duracionFueraHorario)

        // Contar entidades únicas
        const entidad =
          config.reportarPor === 'Unidades' ? registro.unidadNombre : registro.conductorNombre
        if (entidad) entidadesUnicas.add(entidad)
      })

      // Formatear duraciones totales
      const formatearSegundos = (segundos) => {
        const h = Math.floor(segundos / 3600)
        const m = Math.floor((segundos % 3600) / 60)
        const s = segundos % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      }

      const statsHeaderRow = infoSheet.addRow(['Concepto', 'Valor'])
      statsHeaderRow.font = { bold: true }
      statsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      }

      infoSheet.addRow(['Total de registros', datosReales.registros.length])
      infoSheet.addRow([
        `${config.reportarPor === 'Unidades' ? 'Unidades' : 'Conductores'} únicos`,
        entidadesUnicas.size,
      ])
      infoSheet.addRow(['Duración total dentro de horario', formatearSegundos(totalDuracionDentro)])
      infoSheet.addRow(['Duración total fuera de horario', formatearSegundos(totalDuracionFuera)])
      infoSheet.addRow([])
    }

    // Ajustar anchos de columna
    infoSheet.getColumn(1).width = 50
    infoSheet.getColumn(2).width = 20

    // ========================================
    // COLUMNAS AGREGADAS (excluir de tablas)
    // ========================================
    const columnasAgregadas = [
      'Total de viajes',
      'Viajes dentro del horario',
      'Viajes fuera del horario',
    ]

    // Filtrar columnas seleccionadas
    const columnasParaTabla = config.columnasSeleccionadas.filter(
      (col) => !columnasAgregadas.includes(col),
    )

    // ========================================
    // HOJA 2: Todos los registros (sin agrupar)
    // ========================================
    const todosSheet = workbook.addWorksheet('Todos los Registros')

    todosSheet.addRow(['TODOS LOS REGISTROS'])
    todosSheet.getCell('A1').font = { bold: true, size: 12 }
    todosSheet.addRow([`Total: ${datosReales.registros?.length || 0} registros`])
    todosSheet.addRow([])

    // Headers
    const headerRowTodos = todosSheet.addRow(columnasParaTabla)
    headerRowTodos.font = { bold: true }
    headerRowTodos.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    }
    headerRowTodos.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    // Datos - Expandir todos los viajes
    let hayDatos = false

    if (datosReales.registros && datosReales.registros.length > 0) {
      datosReales.registros.forEach((registro) => {
        if (registro.detallesViajes && registro.detallesViajes.length > 0) {
          registro.detallesViajes.forEach((viaje) => {
            // Aplicar filtro comercial
            const [hD, mD, sD] = (viaje.duracionDentro || '00:00:00').split(':').map(Number)
            const tieneDentro = hD > 0 || mD > 0 || sD > 0

            const [hF, mF, sF] = (viaje.duracionFuera || '00:00:00').split(':').map(Number)
            const tieneFuera = hF > 0 || mF > 0 || sF > 0

            let incluirViaje = false
            if (config.tipoInformeComercial === 'todos') {
              incluirViaje = true
            } else if (config.tipoInformeComercial === 'dentro') {
              incluirViaje = tieneDentro
            } else if (config.tipoInformeComercial === 'fuera') {
              incluirViaje = tieneFuera
            }

            if (!incluirViaje) {
              return
            }

            hayDatos = true //  Marcamos que sí hay datos

            // Combinar datos del registro padre con el viaje
            const itemCombinado = {
              ...viaje,
              fecha: registro.fecha,
              conductorNombre: registro.conductorNombre,
              unidadNombre: registro.unidadNombre,
              Placa: registro.Placa,
              totalViajes: registro.totalViajes,
              viajesDentroHorario: registro.viajesDentroHorario,
              viajesFueraHorario: registro.viajesFueraHorario,
            }

            const rowData = columnasParaTabla.map((nombreCol) => {
              const columnaConfig = COLUMNAS_POR_TIPO.horas_trabajo[nombreCol]
              if (columnaConfig && columnaConfig.obtenerValor) {
                return columnaConfig.obtenerValor(itemCombinado)
              }
              return 'N/A'
            })

            const dataRow = todosSheet.addRow(rowData)

            // Resaltar horas extra
            if (config.remarcarHorasExtra && tieneFuera) {
              const colIndex = columnasParaTabla.indexOf('Duración fuera del horario comercial')
              if (colIndex !== -1) {
                dataRow.getCell(colIndex + 1).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFE6E6' },
                }
                dataRow.getCell(colIndex + 1).font = {
                  color: { argb: 'FFD32F2F' },
                  bold: true,
                }
              }
            }

            // Bordes
            dataRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              }
            })
          })
        }
      })
    }

    // Si no hay datos después de aplicar filtros
    if (!hayDatos) {
      console.warn(' No hay datos para mostrar después de aplicar filtros')

      const emptyRow = todosSheet.addRow(['No hay viajes que coincidan con los filtros aplicados'])
      emptyRow.getCell(1).alignment = { horizontal: 'center' }
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF999999' } }
      todosSheet.mergeCells(todosSheet.rowCount, 1, todosSheet.rowCount, columnasParaTabla.length)
    }

    // Ajustar anchos
    columnasParaTabla.forEach((nombreCol, index) => {
      const columnaConfig = COLUMNAS_POR_TIPO.horas_trabajo[nombreCol]
      if (columnaConfig) {
        todosSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
      } else {
        todosSheet.getColumn(index + 1).width = 15
      }
    })

    // ========================================
    // HOJAS 3+: Agrupadas por Unidad/Conductor
    // ========================================

    // Agrupar registros
    const registrosPorEntidad = {}
    datosReales.registros.forEach((registro) => {
      const clave =
        config.reportarPor === 'Unidades' ? registro.unidadNombre : registro.conductorNombre

      if (!registrosPorEntidad[clave]) {
        registrosPorEntidad[clave] = []
      }
      registrosPorEntidad[clave].push(registro)
    })

    // Crear una hoja por entidad
    Object.entries(registrosPorEntidad).forEach(([nombreEntidad, registros]) => {
      const sheetName = nombreEntidad.substring(0, 30)
      const detalleSheet = workbook.addWorksheet(sheetName)

      let currentRow = 1

      // ========================================
      // HEADER DE ENTIDAD (NIVEL 1)
      // ========================================
      const headerEntidad = detalleSheet.addRow([nombreEntidad.toUpperCase()])
      headerEntidad.font = { bold: true, size: 14, color: { argb: 'FF2980B9' } }
      headerEntidad.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' },
      }
      detalleSheet.mergeCells(currentRow, 1, currentRow, Math.max(columnasParaTabla.length, 6))
      currentRow++

      // Subtítulo
      const primerRegistro = registros[0]
      let subtitulo = ''
      if (config.reportarPor === 'Unidades') {
        const placa = primerRegistro.Placa || 'Sin placa'
        const conductores = [...new Set(registros.map((r) => r.conductorNombre).filter(Boolean))]
        subtitulo = `Placa: ${placa} | Conductores: ${conductores.join(', ')}`
      } else {
        const unidades = [...new Set(registros.map((r) => r.unidadNombre).filter(Boolean))]
        subtitulo = `Unidades usadas: ${unidades.join(', ')}`
      }

      const subtituloRow = detalleSheet.addRow([subtitulo])
      subtituloRow.font = { size: 9, color: { argb: 'FF646464' } }
      detalleSheet.mergeCells(currentRow, 1, currentRow, Math.max(columnasParaTabla.length, 6))
      currentRow++

      // Stats
      const totalViajes = registros.reduce((sum, r) => sum + (r.totalViajes || 0), 0)
      const statsRow = detalleSheet.addRow([`Total de viajes: ${totalViajes}`])
      statsRow.font = { size: 9, italic: true, color: { argb: 'FF787878' } }
      detalleSheet.mergeCells(currentRow, 1, currentRow, Math.max(columnasParaTabla.length, 6))
      currentRow++

      detalleSheet.addRow([]) // Espacio
      currentRow++

      // ========================================
      // VERIFICAR MODO DE VISUALIZACIÓN
      // ========================================
      if (config.tipoDetalle === 'dias_detallados') {
        const registrosPorFecha = {}
        registros.forEach((registro) => {
          if (!registrosPorFecha[registro.fecha]) {
            registrosPorFecha[registro.fecha] = []
          }
          registrosPorFecha[registro.fecha].push(registro)
        })

        // ✅ parsearDur y formatSeg se definen UNA VEZ aquí arriba, fuera del loop
        const parsearDur = (dur) => {
          if (!dur || dur === 'N/A') return 0
          const [h, m, s] = (dur || '00:00:00').split(':').map(Number)
          return h * 3600 + m * 60 + s
        }
        const formatSeg = (seg) => {
          const h = Math.floor(seg / 3600)
          const m = Math.floor((seg % 3600) / 60)
          const s = seg % 60
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        }

        Object.entries(registrosPorFecha).forEach(([fecha, registrosDelDia]) => {
          const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          const fechaTitulo = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)

          const headerDia = detalleSheet.addRow([`DÍA: ${fechaTitulo}`])
          headerDia.font = { bold: true, size: 12, color: { argb: 'FF3498DB' } }
          headerDia.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } }
          for (let i = 1; i <= Math.max(columnasParaTabla.length, 6); i++) {
            headerDia.getCell(i).border = { top: { style: 'medium' }, bottom: { style: 'medium' } }
          }
          detalleSheet.mergeCells(currentRow, 1, currentRow, Math.max(columnasParaTabla.length, 6))
          currentRow++

          const headerRow = detalleSheet.addRow(columnasParaTabla)
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }
          headerRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            }
          })
          currentRow++

          // ✅ Acumuladores del día se definen aquí, dentro del forEach del día
          let totalViajesDelDia = 0
          let viajesDentroDelDia = 0
          let viajesFueraDelDia = 0
          let totalSegDentroDelDia = 0
          let totalSegFueraDelDia = 0
          let totalSegTotalDelDia = 0

          registrosDelDia.forEach((registro) => {
            totalViajesDelDia += registro.totalViajes || 0
            viajesDentroDelDia += registro.viajesDentroHorario || 0
            viajesFueraDelDia += registro.viajesFueraHorario || 0

            if (registro.detallesViajes && registro.detallesViajes.length > 0) {
              registro.detallesViajes.forEach((viaje) => {
                const [hD, mD, sD] = (viaje.duracionDentro || '00:00:00').split(':').map(Number)
                const tieneDentro = hD > 0 || mD > 0 || sD > 0
                const [hF, mF, sF] = (viaje.duracionFuera || '00:00:00').split(':').map(Number)
                const tieneFuera = hF > 0 || mF > 0 || sF > 0

                // ✅ Acumular SIEMPRE, independiente del filtro
                totalSegDentroDelDia += parsearDur(viaje.duracionDentro)
                totalSegFueraDelDia += parsearDur(viaje.duracionFuera)
                totalSegTotalDelDia += parsearDur(viaje.duracionTotal)

                let incluirViaje = false
                if (config.tipoInformeComercial === 'todos') incluirViaje = true
                else if (config.tipoInformeComercial === 'dentro') incluirViaje = tieneDentro
                else if (config.tipoInformeComercial === 'fuera') incluirViaje = tieneFuera

                if (!incluirViaje) return

                const itemCombinado = {
                  ...viaje,
                  fecha: registro.fecha,
                  conductorNombre: registro.conductorNombre,
                  unidadNombre: registro.unidadNombre,
                  Placa: registro.Placa,
                }

                const rowData = columnasParaTabla.map((nombreCol) => {
                  const columnaConfig = COLUMNAS_POR_TIPO.horas_trabajo[nombreCol]
                  if (columnaConfig && columnaConfig.obtenerValor)
                    return columnaConfig.obtenerValor(itemCombinado)
                  return 'N/A'
                })

                const dataRow = detalleSheet.addRow(rowData)

                if (config.remarcarHorasExtra && tieneFuera) {
                  const colIndex = columnasParaTabla.indexOf('Duración fuera del horario comercial')
                  if (colIndex !== -1) {
                    dataRow.getCell(colIndex + 1).fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFFFE6E6' },
                    }
                    dataRow.getCell(colIndex + 1).font = { color: { argb: 'FFD32F2F' }, bold: true }
                  }
                }

                dataRow.eachCell((cell) => {
                  cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                  }
                })
                currentRow++
              })
            }
          })

          // ✅ Mini tablita — aquí ya existen todas las variables necesarias
          const resumenDelDia = {
            fecha: registrosDelDia[0]?.fecha,
            conductorNombre: [
              ...new Set(registrosDelDia.map((r) => r.conductorNombre).filter(Boolean)),
            ].join(', '),
            unidadNombre: registrosDelDia[0]?.unidadNombre,
            Placa: registrosDelDia[0]?.Placa,
            totalViajes: totalViajesDelDia,
            viajesDentroHorario: viajesDentroDelDia,
            viajesFueraHorario: viajesFueraDelDia,
            duracionDentroHorario: formatSeg(totalSegDentroDelDia),
            duracionFueraHorario: formatSeg(totalSegFueraDelDia),
            duracionTotal: formatSeg(totalSegTotalDelDia),
            horaInicio:
              registrosDelDia[0]?.horaInicioTrabajo ||
              registrosDelDia[0]?.detallesViajes?.[0]?.horaInicio ||
              '—',
            horaFin:
              registrosDelDia[registrosDelDia.length - 1]?.horaFinTrabajo ||
              (() => {
                const ultimoReg = registrosDelDia[registrosDelDia.length - 1]
                const viajes = ultimoReg?.detallesViajes
                return viajes?.[viajes.length - 1]?.horaFin || '—'
              })(),
            ubicacionInicio: registrosDelDia[0]?.ubicacionInicio || '—',
            ubicacionFin: registrosDelDia[registrosDelDia.length - 1]?.ubicacionFin || '—',
          }

          detalleSheet.addRow([])
          currentRow++

          const tituloMini = detalleSheet.addRow(['RESUMEN DEL DÍA'])
          tituloMini.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
          tituloMini.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF91C6BC' } }
          detalleSheet.mergeCells(currentRow, 1, currentRow, columnasParaTabla.length)
          tituloMini.getCell(1).alignment = { horizontal: 'center' }
          tituloMini.getCell(1).border = {
            top: { style: 'medium' },
            left: { style: 'medium' },
            bottom: { style: 'thin' },
            right: { style: 'medium' },
          }
          currentRow++

          const miniHeader = detalleSheet.addRow(columnasParaTabla)
          miniHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
          miniHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF607D8B' } }
          miniHeader.eachCell((cell, colNum) => {
            cell.alignment = { horizontal: 'center', wrapText: true }
            cell.border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: colNum === 1 ? 'medium' : 'thin' },
              right: { style: colNum === columnasParaTabla.length ? 'medium' : 'thin' },
            }
          })
          currentRow++

          const miniDataValues = columnasParaTabla.map((nombreCol) => {
            const columnaConfig = COLUMNAS_POR_TIPO.horas_trabajo[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor)
              return columnaConfig.obtenerValor(resumenDelDia)
            return 'N/A'
          })

          const miniDataRow = detalleSheet.addRow(miniDataValues)
          miniDataRow.font = { size: 9, bold: true }
          miniDataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
          miniDataRow.eachCell((cell, colNum) => {
            cell.alignment = { horizontal: 'center' }
            cell.border = {
              top: { style: 'thin' },
              bottom: { style: 'medium' },
              left: { style: colNum === 1 ? 'medium' : 'thin' },
              right: { style: colNum === columnasParaTabla.length ? 'medium' : 'thin' },
            }
          })

          if (config.remarcarHorasExtra && totalSegFueraDelDia > 0) {
            const colIdx = columnasParaTabla.indexOf('Duración fuera del horario comercial')
            if (colIdx !== -1) {
              miniDataRow.getCell(colIdx + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE6E6' },
              }
              miniDataRow.getCell(colIdx + 1).font = {
                size: 9,
                bold: true,
                color: { argb: 'FFD32F2F' },
              }
            }
          }
          currentRow++

          detalleSheet.addRow([])
          currentRow++
        })
      } else if (config.tipoDetalle === 'dias_resumidos') {
        const registrosPorFecha = {}
        registros.forEach((registro) => {
          if (!registrosPorFecha[registro.fecha]) {
            registrosPorFecha[registro.fecha] = []
          }
          registrosPorFecha[registro.fecha].push(registro)
        })

        const parsearDur = (dur) => {
          if (!dur || dur === 'N/A') return 0
          const [h, m, s] = (dur || '00:00:00').split(':').map(Number)
          return h * 3600 + m * 60 + s
        }
        const formatSeg = (seg) => {
          const h = Math.floor(seg / 3600)
          const m = Math.floor((seg % 3600) / 60)
          const s = seg % 60
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        }

        // Header de columnas UNA SOLA VEZ
        const headerRow = detalleSheet.addRow(columnasParaTabla)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF607D8B' } }
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
        currentRow++

        Object.entries(registrosPorFecha).forEach(([, registrosDelDia]) => {
          let totalViajesDelDia = 0
          let viajesDentroDelDia = 0
          let viajesFueraDelDia = 0
          let totalSegDentroDelDia = 0
          let totalSegFueraDelDia = 0
          let totalSegTotalDelDia = 0

          registrosDelDia.forEach((registro) => {
            totalViajesDelDia += registro.totalViajes || 0
            viajesDentroDelDia += registro.viajesDentroHorario || 0
            viajesFueraDelDia += registro.viajesFueraHorario || 0
            ;(registro.detallesViajes || []).forEach((viaje) => {
              totalSegDentroDelDia += parsearDur(viaje.duracionDentro)
              totalSegFueraDelDia += parsearDur(viaje.duracionFuera)
              totalSegTotalDelDia += parsearDur(viaje.duracionTotal)
            })
          })

          const resumenDelDia = {
            fecha: registrosDelDia[0]?.fecha,
            conductorNombre: [
              ...new Set(registrosDelDia.map((r) => r.conductorNombre).filter(Boolean)),
            ].join(', '),
            unidadNombre: registrosDelDia[0]?.unidadNombre,
            Placa: registrosDelDia[0]?.Placa,
            totalViajes: totalViajesDelDia,
            viajesDentroHorario: viajesDentroDelDia,
            viajesFueraHorario: viajesFueraDelDia,
            duracionDentroHorario: formatSeg(totalSegDentroDelDia),
            duracionFueraHorario: formatSeg(totalSegFueraDelDia),
            duracionTotal: formatSeg(totalSegTotalDelDia),
            horaInicio:
              registrosDelDia[0]?.horaInicioTrabajo ||
              registrosDelDia[0]?.detallesViajes?.[0]?.horaInicio ||
              '—',
            horaFin: (() => {
              const ultimo = registrosDelDia[registrosDelDia.length - 1]
              const viajes = ultimo?.detallesViajes
              return ultimo?.horaFinTrabajo || viajes?.[viajes.length - 1]?.horaFin || '—'
            })(),
            ubicacionInicio: registrosDelDia[0]?.ubicacionInicio || '—',
            ubicacionFin: registrosDelDia[registrosDelDia.length - 1]?.ubicacionFin || '—',
          }

          const rowData = columnasParaTabla.map((nombreCol) => {
            const columnaConfig = COLUMNAS_POR_TIPO.horas_trabajo[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor)
              return columnaConfig.obtenerValor(resumenDelDia)
            return 'N/A'
          })

          const dataRow = detalleSheet.addRow(rowData)
          dataRow.font = { size: 9 }
          dataRow.eachCell((cell, colNum) => {
            cell.border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: colNum === 1 ? 'medium' : 'thin' },
              right: { style: colNum === columnasParaTabla.length ? 'medium' : 'thin' },
            }
          })

          if (config.remarcarHorasExtra && totalSegFueraDelDia > 0) {
            const colIdx = columnasParaTabla.indexOf('Duración fuera del horario comercial')
            if (colIdx !== -1) {
              dataRow.getCell(colIdx + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE6E6' },
              }
              dataRow.getCell(colIdx + 1).font = {
                size: 9,
                bold: true,
                color: { argb: 'FFD32F2F' },
              }
            }
          }

          currentRow++
        })
      }
    })

    if (config.mostrarMapaZona) {
      await agregarHojaMapas(
        workbook,
        registrosPorEntidad,
        config,
        config.reportarPor === 'Unidades' ? 'Unidad' : 'Conductor',
      )
    }
    // ========================================
    // Guardar el archivo
    // ========================================
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const fecha = new Date().toISOString().split('T')[0]
    const filename = filenameOverride || `Informe_Horas_Trabajo_${fecha}.xlsx`

    // Descargar automáticamente
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

  const generarExcelTrayectos = async (config, datosReales, filenameOverride = null) => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MJ GPS'
    workbook.created = new Date()

    // ========================================
    // HOJA 1: Información del informe
    // ========================================
    const infoSheet = workbook.addWorksheet('Información')

    // Título
    infoSheet.addRow(['Informe de Trayectos'])
    infoSheet.getCell('A1').font = { bold: true, size: 14 }

    infoSheet.addRow([])
    infoSheet.addRow([`Periodo: ${config.rangoFechaFormateado || 'No especificado'}`])
    infoSheet.addRow([`Reportar por: ${config.reportarPor || 'N/A'}`])
    infoSheet.addRow([
      `Generado: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    ])
    infoSheet.addRow([])

    // Resumen general (si está activo)
    if (config.mostrarResumen && datosReales.resumen) {
      infoSheet.addRow(['RESUMEN DEL INFORME'])
      infoSheet.getCell(`A${infoSheet.rowCount}`).font = { bold: true, size: 12 }
      infoSheet.addRow([])

      // Calcular totales
      let totalKilometros = 0
      let totalDuracion = 0
      let velocidadesPromedio = []
      let velocidadMaximaGlobal = 0

      // Extraer trayectos de eventosAgrupados
      const todosTrayectos = Object.values(datosReales.eventosAgrupados || {}).flat()

      todosTrayectos.forEach((trayecto) => {
        totalKilometros += trayecto.kilometrajeRecorrido || 0
        totalDuracion += trayecto.duracion || 0
        if (trayecto.velocidadPromedio) velocidadesPromedio.push(trayecto.velocidadPromedio)
        if (trayecto.velocidadMaxima > velocidadMaximaGlobal) {
          velocidadMaximaGlobal = trayecto.velocidadMaxima
        }
      })

      const velocidadPromedioGlobal =
        velocidadesPromedio.length > 0
          ? (velocidadesPromedio.reduce((a, b) => a + b, 0) / velocidadesPromedio.length).toFixed(2)
          : 0

      const duracionTotal = Math.floor(totalDuracion / 3600000) // Convertir ms a horas
      const minutosTotal = Math.floor((totalDuracion % 3600000) / 60000)

      const statsHeaderRow = infoSheet.addRow(['Concepto', 'Valor'])
      statsHeaderRow.font = { bold: true }
      statsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      }

      infoSheet.addRow(['Total de trayectos', todosTrayectos.length])
      infoSheet.addRow(['Kilómetros totales recorridos', `${totalKilometros.toFixed(2)} km`])
      infoSheet.addRow(['Duración total de manejo', `${duracionTotal}h ${minutosTotal}m`])
      infoSheet.addRow(['Velocidad promedio general', `${velocidadPromedioGlobal} km/h`])
      infoSheet.addRow(['Velocidad máxima registrada', `${velocidadMaximaGlobal} km/h`])
      infoSheet.addRow([
        `${config.reportarPor === 'Unidades' ? 'Unidades' : 'Conductores'} únicos`,
        Object.keys(datosReales.eventosAgrupados || {}).length,
      ])
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
    infoSheet.getColumn(1).width = 50
    infoSheet.getColumn(2).width = 20

    // ========================================
    // HOJA 2: Todos los Trayectos
    // ========================================
    const todosSheet = workbook.addWorksheet('Todos los Trayectos')

    todosSheet.addRow(['TODOS LOS TRAYECTOS'])
    todosSheet.getCell('A1').font = { bold: true, size: 12 }
    todosSheet.addRow([`Total: ${datosReales.totalTrayectos || 0} trayectos`])
    todosSheet.addRow([])

    // Headers
    const headerRowTodos = todosSheet.addRow(config.columnasSeleccionadas)
    headerRowTodos.font = { bold: true }
    headerRowTodos.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    }
    headerRowTodos.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    // Datos
    if (datosReales.datosColumnas && datosReales.datosColumnas.length > 0) {
      datosReales.datosColumnas.forEach((fila) => {
        const rowData = config.columnasSeleccionadas.map((col) => fila[col] || 'N/A')
        const dataRow = todosSheet.addRow(rowData)

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
      const emptyRow = todosSheet.addRow(['No hay trayectos en el período seleccionado'])
      emptyRow.getCell(1).alignment = { horizontal: 'center' }
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF999999' } }
      todosSheet.mergeCells(
        todosSheet.rowCount,
        1,
        todosSheet.rowCount,
        config.columnasSeleccionadas.length,
      )
    }

    // Ajustar anchos
    config.columnasSeleccionadas.forEach((nombreCol, index) => {
      const columnaConfig = COLUMNAS_POR_TIPO.trayectos[nombreCol]
      if (columnaConfig) {
        todosSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
      } else {
        todosSheet.getColumn(index + 1).width = 15
      }
    })

    // ========================================
    // HOJAS 3+: Agrupadas por Unidad/Conductor
    // ========================================
    if (datosReales.eventosAgrupados) {
      Object.entries(datosReales.eventosAgrupados).forEach(([nombreEntidad, trayectos]) => {
        const sheetName = nombreEntidad.substring(0, 30)
        const detalleSheet = workbook.addWorksheet(sheetName)

        let currentRow = 1

        // ========================================
        // HEADER DE ENTIDAD (NIVEL 1)
        // ========================================
        const headerEntidad = detalleSheet.addRow([nombreEntidad.toUpperCase()])
        headerEntidad.font = { bold: true, size: 14, color: { argb: 'FF2980B9' } }
        headerEntidad.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' },
        }
        detalleSheet.mergeCells(
          currentRow,
          1,
          currentRow,
          Math.max(config.columnasSeleccionadas.length, 6),
        )
        currentRow++

        // Subtítulo
        const primerTrayecto = trayectos[0]
        let subtitulo = ''
        if (config.reportarPor === 'Unidades') {
          const placa = primerTrayecto.Placa || 'Sin placa'
          const conductores = [...new Set(trayectos.map((t) => t.conductorNombre).filter(Boolean))]
          subtitulo = `Placa: ${placa} | Conductores: ${conductores.join(', ')}`
        } else {
          const unidades = [...new Set(trayectos.map((t) => t.unidadNombre).filter(Boolean))]
          subtitulo = `Unidades usadas: ${unidades.join(', ')}`
        }

        const subtituloRow = detalleSheet.addRow([subtitulo])
        subtituloRow.font = { size: 9, color: { argb: 'FF646464' } }
        detalleSheet.mergeCells(
          currentRow,
          1,
          currentRow,
          Math.max(config.columnasSeleccionadas.length, 6),
        )
        currentRow++

        // Stats
        const totalKm = trayectos
          .reduce((sum, t) => sum + (t.kilometrajeRecorrido || 0), 0)
          .toFixed(2)
        const statsRow = detalleSheet.addRow([
          `Total de trayectos: ${trayectos.length} | Kilómetros: ${totalKm} km`,
        ])
        statsRow.font = { size: 9, italic: true, color: { argb: 'FF787878' } }
        detalleSheet.mergeCells(
          currentRow,
          1,
          currentRow,
          Math.max(config.columnasSeleccionadas.length, 6),
        )
        currentRow++

        detalleSheet.addRow([]) // Espacio
        currentRow++

        // Headers de columnas
        const headerRow = detalleSheet.addRow(config.columnasSeleccionadas)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' },
        }
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
        currentRow++

        // Datos de trayectos
        trayectos.forEach((trayecto) => {
          const rowData = config.columnasSeleccionadas.map((nombreCol) => {
            const columnaConfig = COLUMNAS_POR_TIPO.trayectos[nombreCol]
            if (columnaConfig && columnaConfig.obtenerValor) {
              return columnaConfig.obtenerValor(trayecto)
            }
            return 'N/A'
          })

          const dataRow = detalleSheet.addRow(rowData)

          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            }
          })

          currentRow++
        })

        // Ajustar anchos
        config.columnasSeleccionadas.forEach((nombreCol, index) => {
          const columnaConfig = COLUMNAS_POR_TIPO.trayectos[nombreCol]
          if (columnaConfig) {
            detalleSheet.getColumn(index + 1).width = columnaConfig.ancho / 7
          } else {
            detalleSheet.getColumn(index + 1).width = 15
          }
        })
      })
    }

    if (datosReales.eventosAgrupados && config.mostrarMapaTrayecto) {
      await agregarHojaMapas(
        workbook,
        datosReales.eventosAgrupados,
        config,
        config.reportarPor === 'Unidades' ? 'Unidad' : 'Conductor',
      )
    }

    // ========================================
    // Guardar el archivo
    // ========================================
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const fecha = new Date().toISOString().split('T')[0]
    const filename = filenameOverride || `Informe_Trayectos_${fecha}.xlsx`

    // Descargar automáticamente
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
    generarExcelHorasTrabajo,
    generarExcelTrayectos,
  }
}
