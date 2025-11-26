// composables/useReportePDF.js

import { useMapboxStaticImage } from './useMapboxStaticImage'

// Dentro de la función generarPDF, después de crear las instancias existentes:

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLUMNAS_POR_TIPO } from './useColumnasReportes'

export function useReportePDF() {
  /**
   *
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
    // ========================================
    // 🔥 TABLA DE EVENTOS CON COLUMNAS DINÁMICAS
    // ========================================
    if (datosReales.datosColumnas && datosReales.datosColumnas.length > 0) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Detalle de Eventos', 14, yPosition)
      yPosition += 8

      const headers = config.columnasSeleccionadas
      const configuracionColumnas = datosReales.configuracionColumnas || []

      // 🔥 CORREGIDO: Usar los datos ORIGINALES, no los procesados
      const rows = datosReales.eventosAgrupados
        ? Object.values(datosReales.eventosAgrupados).flat()
        : datosReales.datosColumnas

      const tableData = rows.map((evento) => {
        return headers.map((nombreCol) => {
          const columnaConfig = configuracionColumnas.find((c) => c.label === nombreCol)

          if (columnaConfig && columnaConfig.obtenerValor) {
            try {
              const valor = columnaConfig.obtenerValor(evento)
              return valor !== null && valor !== undefined ? valor : 'N/A'
            } catch (error) {
              console.error(`Error al obtener valor de columna "${nombreCol}":`, error)
              return 'N/A'
            }
          }

          return evento[nombreCol] || 'N/A'
        })
      })

      const columnStyles = {}
      configuracionColumnas.forEach((col, index) => {
        if (col.ancho) {
          columnStyles[index] = { cellWidth: col.ancho / 4 }
        }
      })

      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: tableData,
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

        // 🔥 Headers de la tabla
        const headers = config.columnasSeleccionadas

        // 🔥 CORREGIDO: Procesar eventos CON las funciones de columnas
        const tableData = eventos.map((evento) => {
          return headers.map((nombreCol) => {
            const columnaConfig = datosReales.configuracionColumnas?.find(
              (c) => c.label === nombreCol,
            )

            if (columnaConfig && columnaConfig.obtenerValor) {
              try {
                const valor = columnaConfig.obtenerValor(evento)
                return valor !== null && valor !== undefined ? valor : 'N/A'
              } catch (error) {
                console.error(`Error al obtener valor de columna "${nombreCol}":`, error)
                return 'N/A'
              }
            }

            // Fallback: buscar directamente en el evento
            return evento[nombreCol] || 'N/A'
          })
        })

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
          styles: { fontSize: 7, cellPadding: 2 },
          margin: { left: 14, right: 14 },
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
  const generarPDFTrayectos = async (config, datosReales) => {
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

      const headers = config.columnasSeleccionadas
      const rows = datosReales.datosColumnas.map((fila) => headers.map((col) => fila[col] || 'N/A'))

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

    // ========================================
    // 🗺️ MAPAS DE TRAYECTOS (AL FINAL)
    // ========================================
    if (
      config.mostrarMapaTrayecto &&
      datosReales.datosColumnas &&
      datosReales.datosColumnas.length > 0
    ) {
      try {
        const { generarURLMapaTrayectos, descargarImagenMapaBase64, prepararDatosTrayectos } =
          useMapboxStaticImage()

        const todosTrayectos = prepararDatosTrayectos(datosReales.datosColumnas)

        // 🔥 GENERAR UN MAPA POR CADA VEHÍCULO
        for (let i = 0; i < todosTrayectos.length; i++) {
          const trayecto = todosTrayectos[i]

          if (trayecto.coordenadas.length === 0) continue

          // Nueva página para cada mapa
          doc.addPage()
          let yPosition = 20
          const margin = 14

          // Título del mapa
          doc.setFontSize(16)
          doc.setFont(undefined, 'bold')
          doc.text(`Mapa de Trayecto - ${trayecto.vehiculoNombre}`, margin, yPosition)
          yPosition += 12

          // Generar URL del mapa (solo este vehículo)
          const urlMapa = generarURLMapaTrayectos([trayecto], {
            width: 1200,
            height: 800,
            padding: 50,
            mostrarMarcadores: true,
          })

          const imagenBase64 = await descargarImagenMapaBase64(urlMapa)

          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()
          const availableWidth = pageWidth - margin * 2
          const availableHeight = pageHeight - yPosition - margin - 40

          const aspectRatio = 1.5
          let mapWidth = availableWidth
          let mapHeight = mapWidth / aspectRatio

          if (mapHeight > availableHeight) {
            mapHeight = availableHeight
            mapWidth = mapHeight * aspectRatio
          }

          const mapX = (pageWidth - mapWidth) / 2

          doc.addImage(imagenBase64, 'PNG', mapX, yPosition, mapWidth, mapHeight)
          yPosition += mapHeight + 10

          doc.setFontSize(10)
          doc.setFont(undefined, 'normal')
          doc.text(`Placa: ${trayecto.placa || 'N/A'}`, margin, yPosition)
          yPosition += 6
          doc.text(`Total de puntos GPS: ${trayecto.coordenadas.length}`, margin, yPosition)
          yPosition += 6

          doc.setFontSize(9)
          doc.setFillColor(76, 175, 80)
          doc.circle(margin + 2, yPosition - 2, 2, 'F')
          doc.text('Punto de inicio', margin + 6, yPosition)

          doc.setFillColor(244, 67, 54)
          doc.rect(margin + 80, yPosition - 3, 4, 4, 'F')
          doc.text('Punto de fin', margin + 87, yPosition)
        }
      } catch (error) {
        console.error('Error generando mapas en PDF:', error)
      }
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

    const pdfBlob = doc.output('blob')
    const fecha = new Date().toISOString().split('T')[0]
    const filename = `Informe_Trayectos_${fecha}.pdf`

    return {
      blob: pdfBlob,
      filename: filename,
    }
  }

  /**
   * 🆕 Genera un PDF con reporte de horas de trabajo
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos calculados de horas
   */
  const generarPDFHorasTrabajo = async (config, datosReales) => {
    const doc = new jsPDF('landscape')
    let yPosition = 20

    // Título del documento
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Informe de Horas de Trabajo', 14, yPosition)
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
    doc.text(`Horario comercial: ${config.horarioInicio} - ${config.horarioFin}`, 14, yPosition)
    yPosition += 10

    // ========================================
    // 📊 RESUMEN GENERAL
    // ========================================
    if (config.mostrarResumen && datosReales.resumenGeneral) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen del Informe', 14, yPosition)
      yPosition += 8

      const resumenData = datosReales.resumenGeneral.map((item) => [
        item.nombre,
        item.duracionFuera,
        item.duracionTotal,
        item.duracionDentro,
      ])

      // Agregar fila de totales
      if (datosReales.totales) {
        resumenData.push([
          'TOTALES',
          datosReales.totales.duracionFuera,
          datosReales.totales.duracionTotal,
          datosReales.totales.duracionDentro,
        ])
      }

      autoTable(doc, {
        startY: yPosition,
        head: [
          [
            'Nombre de objeto',
            'Duración fuera horario comercial',
            'Duración trabajo total',
            'Duración dentro horario comercial',
          ],
        ],
        body: resumenData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60 },
          2: { cellWidth: 60 },
          3: { cellWidth: 60 },
        },
      })

      yPosition = doc.lastAutoTable.finalY + 10
    }

    // ========================================
    // 📅 POR CADA DÍA
    // ========================================
    const { generarURLMapaTrayectos, descargarImagenMapaBase64, prepararDatosTrayectos } =
      useMapboxStaticImage()

    // Agrupar registros por fecha
    const registrosPorFecha = {}
    datosReales.registros.forEach((registro) => {
      if (!registrosPorFecha[registro.fecha]) {
        registrosPorFecha[registro.fecha] = []
      }
      registrosPorFecha[registro.fecha].push(registro)
    })

    for (const [fecha, registros] of Object.entries(registrosPorFecha)) {
      // Nueva página para cada día
      doc.addPage()
      yPosition = 20

      // 🔥 Título del día
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      doc.text(fechaFormateada, 14, yPosition)
      yPosition += 10

      // 🗺️ MAPA DEL DÍA (si mostrarMapaZona está activo)
      if (config.mostrarMapaZona && registros.length > 0) {
        try {
          const trayectosParaMapa = prepararDatosTrayectos(registros)

          if (trayectosParaMapa.length > 0 && trayectosParaMapa[0].coordenadas.length > 0) {
            const urlMapa = generarURLMapaTrayectos(trayectosParaMapa, {
              width: 1200,
              height: 800,
              padding: 50,
              mostrarPins: true,
            })

            const imagenBase64 = await descargarImagenMapaBase64(urlMapa)

            const pageWidth = doc.internal.pageSize.getWidth()
            const margin = 14
            const availableWidth = pageWidth - margin * 2
            const aspectRatio = 1.5
            let mapWidth = availableWidth
            let mapHeight = mapWidth / aspectRatio

            const mapX = (pageWidth - mapWidth) / 2

            doc.addImage(imagenBase64, 'PNG', mapX, yPosition, mapWidth, mapHeight)
            yPosition += mapHeight + 10
          }
        } catch (error) {
          console.error('Error generando mapa del día:', error)
        }
      }

      // 📊 RESUMEN DEL DÍA
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen del día', 14, yPosition)
      yPosition += 8

      const resumenDiaData = registros.map((r) => [
        r.unidadNombre,
        r.duracionFueraHorario,
        r.duracionTotal,
        r.duracionDentroHorario,
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [
          [
            'Nombre de objeto',
            'Duración fuera horario comercial',
            'Duración trabajo total',
            'Duración dentro horario comercial',
          ],
        ],
        body: resumenDiaData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        styles: { fontSize: 8 },
      })

      yPosition = doc.lastAutoTable.finalY + 10

      // 📋 DETALLES DE LOS TRAYECTOS
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Detalles de los trayectos', 14, yPosition)
      yPosition += 8

      // Combinar todos los detalles de viajes de todas las unidades del día
      const todosLosViajes = []
      registros.forEach((registro) => {
        if (registro.detallesViajes && registro.detallesViajes.length > 0) {
          registro.detallesViajes.forEach((viaje) => {
            todosLosViajes.push([
              viaje.horaInicio,
              viaje.ubicacionInicio,
              viaje.horaFin,
              viaje.ubicacionFin,
              viaje.duracionFuera,
              viaje.duracionDentro,
            ])
          })
        }
      })

      if (todosLosViajes.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [
            [
              'Hora inicio',
              'Ubicación inicio',
              'Hora fin',
              'Ubicación fin',
              'Duración fuera horario',
              'Duración dentro horario',
            ],
          ],
          body: todosLosViajes,
          theme: 'grid',
          headStyles: { fillColor: [76, 175, 80], fontSize: 8 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 60 },
            2: { cellWidth: 25 },
            3: { cellWidth: 60 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
          },
        })
      }
    }

    // Generar el blob y nombre del archivo
    const pdfBlob = doc.output('blob')
    const fechaGeneracion = new Date().toISOString().split('T')[0]
    const filename = `Informe_Horas_Trabajo_${fechaGeneracion}.pdf`

    return {
      blob: pdfBlob,
      filename: filename,
    }
  }
  return {
    generarPDFEventos,
    generarPDFSimple,
    generarPDFTrayectos,
    generarPDFHorasTrabajo, // 🆕
  }
}
