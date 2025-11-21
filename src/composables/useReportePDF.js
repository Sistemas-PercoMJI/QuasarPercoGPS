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
  const generarPDFTrayectos = async (config, datosReales) => {
    const doc = new jsPDF('landscape')
    const {
      generarURLMapaTrayectos,
      descargarImagenMapaBase64,
      prepararDatosTrayectos,
      generarLeyendaMapa,
    } = useMapboxStaticImage()
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
    if (
      config.mostrarMapaTrayecto &&
      datosReales.datosColumnas &&
      datosReales.datosColumnas.length > 0
    ) {
      try {
        // Nueva página para el mapa
        doc.addPage()
        yPosition = 20
        const margin = 14

        // Título de la sección
        doc.setFontSize(16)
        doc.setFont(undefined, 'bold')
        doc.text('Mapa de Trayectos', margin, yPosition)
        yPosition += 12

        // Preparar datos de trayectos
        const trayectos = prepararDatosTrayectos(datosReales.datosColumnas)

        if (trayectos.length > 0 && trayectos.some((t) => t.coordenadas.length > 0)) {
          // Generar URL del mapa
          const urlMapa = generarURLMapaTrayectos(trayectos, {
            width: 1200,
            height: 800,
            padding: 50,
            mostrarMarcadores: true,
          })

          // Descargar imagen y convertir a base64
          const imagenBase64 = await descargarImagenMapaBase64(urlMapa)

          // Calcular dimensiones para el PDF
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()
          const availableWidth = pageWidth - margin * 2
          const availableHeight = pageHeight - yPosition - margin - 60 // Espacio para leyenda

          // Mantener aspect ratio de la imagen (1200x800 = 1.5)
          const aspectRatio = 1.5
          let mapWidth = availableWidth
          let mapHeight = mapWidth / aspectRatio

          // Si la altura es muy grande, ajustar por altura
          if (mapHeight > availableHeight) {
            mapHeight = availableHeight
            mapWidth = mapHeight * aspectRatio
          }

          // Centrar el mapa
          const mapX = (pageWidth - mapWidth) / 2

          // Agregar la imagen del mapa
          doc.addImage(imagenBase64, 'PNG', mapX, yPosition, mapWidth, mapHeight)
          yPosition += mapHeight + 10

          // Generar leyenda
          const leyenda = generarLeyendaMapa(trayectos)

          // Dibujar leyenda en dos columnas
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.text('Leyenda:', margin, yPosition)
          yPosition += 6

          doc.setFont(undefined, 'normal')

          const columnas = 2
          const itemsPorColumna = Math.ceil(leyenda.length / columnas)
          const anchoColumna = availableWidth / columnas

          leyenda.forEach((item, index) => {
            const columna = Math.floor(index / itemsPorColumna)
            const filaEnColumna = index % itemsPorColumna

            const x = margin + columna * anchoColumna
            const y = yPosition + filaEnColumna * 6

            // Dibujar línea de color
            doc.setDrawColor(item.color)
            doc.setLineWidth(2)
            doc.line(x, y - 1, x + 15, y - 1)

            // Texto
            doc.setTextColor(0, 0, 0)
            const textoVehiculo = `${item.vehiculo} (${item.puntos} puntos GPS)`
            doc.text(textoVehiculo, x + 18, y)
          })

          yPosition += itemsPorColumna * 6 + 10

          // Agregar marcadores de inicio/fin
          doc.setFontSize(9)
          doc.setFont(undefined, 'normal')
          const markerY = yPosition

          // Marcador de inicio (verde)
          doc.setFillColor(76, 175, 80) // Verde
          doc.circle(margin + 2, markerY - 2, 2, 'F')
          doc.text('Punto de inicio', margin + 6, markerY)

          // Marcador de fin (rojo)
          doc.setFillColor(244, 67, 54) // Rojo
          doc.rect(margin + 80, markerY - 3, 4, 4, 'F')
          doc.text('Punto de fin', margin + 87, markerY)

          yPosition += 10
        } else {
          doc.setFontSize(10)
          doc.setFont(undefined, 'italic')
          doc.setTextColor(150, 150, 150)
          doc.text(
            'No hay datos de coordenadas disponibles para mostrar el mapa',
            margin,
            yPosition,
          )
          yPosition += 10
        }
      } catch (error) {
        console.error('Error generando mapa en PDF:', error)
        doc.setFontSize(10)
        doc.setFont(undefined, 'italic')
        doc.setTextColor(200, 0, 0)
        doc.text('Error al generar el mapa. Continúa con el resto del reporte...', 14, yPosition)
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
