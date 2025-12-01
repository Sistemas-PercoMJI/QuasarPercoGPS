// composables/useReportePDF.js

import { useMapboxStaticImage } from './useMapboxStaticImage'

// Dentro de la función generarPDF, después de crear las instancias existentes:

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLUMNAS_POR_TIPO } from './useColumnasReportes'

const generarHeaderGrupo = (nombreGrupo, eventos, config, datosReales) => {
  // 🔥 Usar la agrupación REAL que se aplicó, no la del selector
  const agruparPor = datosReales?.agrupacionReal || config.agruparPor || 'unidad'

  console.log('🔍 generarHeaderGrupo - agruparPor:', agruparPor)
  console.log('🔍 nombreGrupo:', nombreGrupo)

  // Si agrupamos por DÍA
  if (agruparPor === 'dia') {
    // 🔥 CORREGIDO: Convertir DD/MM/YYYY o YYYY/MM/DD a formato ISO
    let fechaISO = nombreGrupo

    if (nombreGrupo.includes('/')) {
      const partes = nombreGrupo.split('/')

      // Detectar formato: si primer número > 31, es YYYY/MM/DD
      if (parseInt(partes[0]) > 31) {
        // Formato YYYY/MM/DD
        fechaISO = nombreGrupo.replace(/\//g, '-')
      } else {
        // Formato DD/MM/YYYY
        fechaISO = `${partes[2]}-${partes[1]}-${partes[0]}`
      }
    }

    const fecha = new Date(fechaISO + 'T00:00:00')

    // 🔥 Validar que la fecha es válida
    if (isNaN(fecha.getTime())) {
      return {
        titulo: `DÍA: ${nombreGrupo}`,
        subtitulo: '',
        stats: `Total de eventos: ${eventos.length}`,
      }
    }

    const fechaFormateada = fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const unidades = [...new Set(eventos.map((e) => e.unidadNombre).filter(Boolean))]

    return {
      titulo: fechaFormateada.toUpperCase(),
      subtitulo: `Unidades activas: ${unidades.length} (${unidades.slice(0, 3).join(', ')}${unidades.length > 3 ? '...' : ''})`,
      stats: `Total de eventos: ${eventos.length}`,
    }
  }

  // Si agrupamos por EVENTO
  if (agruparPor === 'evento') {
    const unidades = [...new Set(eventos.map((e) => e.unidadNombre).filter(Boolean))]
    const conductores = [...new Set(eventos.map((e) => e.conductorNombre).filter(Boolean))]

    return {
      titulo: `EVENTO: ${nombreGrupo}`,
      subtitulo: `Unidades: ${unidades.length} | Conductores: ${conductores.length}`,
      stats: `Total de ocurrencias: ${eventos.length}`,
    }
  }

  // Si agrupamos por CONDUCTOR
  if (agruparPor === 'conductor') {
    const unidades = [...new Set(eventos.map((e) => e.unidadNombre).filter(Boolean))]
    const dias = [
      ...new Set(
        eventos.map((e) => {
          const fecha = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)
          return fecha.toISOString().split('T')[0]
        }),
      ),
    ]

    return {
      titulo: `CONDUCTOR: ${nombreGrupo}`,
      subtitulo: `Unidades usadas: ${unidades.join(', ')}`,
      stats: `Total de eventos: ${eventos.length} | Días activos: ${dias.length}`,
    }
  }

  // Si agrupamos por UNIDAD (o por defecto)
  if (agruparPor === 'unidad' || config.reportarPor === 'Unidades') {
    const primerEvento = eventos[0]
    const placa = primerEvento?.unidadPlaca || 'Sin placa'
    const conductores = [...new Set(eventos.map((e) => e.conductorNombre).filter(Boolean))]
    const conductorTexto =
      conductores.length > 0 ? conductores.join(', ') : 'Sin conductor asignado'

    return {
      titulo: `UNIDAD: ${nombreGrupo}`,
      subtitulo: `Placa: ${placa} | Conductores: ${conductorTexto}`,
      stats: `Total de eventos: ${eventos.length}`,
    }
  }

  // Fallback genérico
  return {
    titulo: nombreGrupo.toUpperCase(),
    subtitulo: '',
    stats: `Total de eventos: ${eventos.length}`,
  }
}

/**
 * Genera resumen estadístico según tipo de reporte
 */
const generarResumenPorTipo = (datosReales, config) => {
  if (!config.mostrarResumen) return null

  // 🔥 NUEVO: Considerar agruparPor
  const agruparPor = datosReales?.agrupacionReal || config.agruparPor || 'unidad'

  // Si agrupamos por DÍA
  if (agruparPor === 'dia') {
    const resumenPorDia = {}

    Object.entries(datosReales.eventosAgrupados || {}).forEach(([fecha, eventos]) => {
      const unidades = [...new Set(eventos.map((e) => e.unidadNombre).filter(Boolean))]

      resumenPorDia[fecha] = {
        total: eventos.length,
        unidadesActivas: unidades.length,
      }
    })

    return {
      tipo: 'dias',
      headers: ['Fecha', 'Total Eventos', 'Unidades Activas'],
      rows: Object.entries(resumenPorDia).map(([fecha, stats]) => [
        new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX'),
        stats.total,
        stats.unidadesActivas,
      ]),
    }
  }

  // Si agrupamos por EVENTO
  if (agruparPor === 'evento') {
    const resumenPorEvento = {}

    Object.entries(datosReales.eventosAgrupados || {}).forEach(([evento, registros]) => {
      const unidades = [...new Set(registros.map((e) => e.unidadNombre).filter(Boolean))]

      resumenPorEvento[evento] = {
        total: registros.length,
        unidades: unidades.length,
      }
    })

    return {
      tipo: 'eventos',
      headers: ['Tipo de Evento', 'Total Ocurrencias', 'Unidades Involucradas'],
      rows: Object.entries(resumenPorEvento).map(([evento, stats]) => [
        evento,
        stats.total,
        stats.unidades,
      ]),
    }
  }

  if (config.reportarPor === 'Unidades') {
    const resumenPorUnidad = {}

    Object.entries(datosReales.eventosAgrupados || {}).forEach(([unidad, eventos]) => {
      const entradas = eventos.filter(
        (e) => e.tipoEvento === 'Entrada' || e.tipoEvento === 'entrada',
      ).length

      const salidas = eventos.filter(
        (e) => e.tipoEvento === 'Salida' || e.tipoEvento === 'salida',
      ).length

      resumenPorUnidad[unidad] = { total: eventos.length, entradas, salidas }
    })

    return {
      tipo: 'unidades',
      headers: ['Unidad', 'Total Eventos', 'Entradas', 'Salidas'],
      rows: Object.entries(resumenPorUnidad).map(([unidad, stats]) => [
        unidad,
        stats.total,
        stats.entradas,
        stats.salidas,
      ]),
    }
  }

  if (config.reportarPor === 'Conductores') {
    const resumenPorConductor = {}

    Object.entries(datosReales.eventosAgrupados || {}).forEach(([conductor, eventos]) => {
      const unidades = [...new Set(eventos.map((e) => e.unidadNombre).filter(Boolean))]
      const dias = [
        ...new Set(
          eventos.map((e) => {
            const fecha = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)
            return fecha.toISOString().split('T')[0]
          }),
        ),
      ]

      resumenPorConductor[conductor] = {
        total: eventos.length,
        unidadesUsadas: unidades.length,
        diasActivos: dias.length,
      }
    })

    return {
      tipo: 'conductores',
      headers: ['Conductor', 'Total Eventos', 'Unidades Usadas', 'Días Activos'],
      rows: Object.entries(resumenPorConductor).map(([conductor, stats]) => [
        conductor,
        stats.total,
        stats.unidadesUsadas,
        stats.diasActivos,
      ]),
    }
  }

  return null
}

/**
 * Genera metadata del encabezado del reporte
 */
const generarMetadataReporte = (config, datosReales) => {
  const metadata = {
    periodo: config.rangoFechaFormateado,
    generado: new Date().toLocaleString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    totalEventos: datosReales.totalEventos || 0,
  }

  if (config.reportarPor === 'Unidades') {
    const numUnidades = Object.keys(datosReales.eventosAgrupados || {}).length
    const nombresUnidades = Object.keys(datosReales.eventosAgrupados || {})
      .slice(0, 3)
      .join(', ')
    const masUnidades = numUnidades > 3 ? `, +${numUnidades - 3} más` : ''
    metadata.reporteDe = ` ${numUnidades} unidad${numUnidades > 1 ? 'es' : ''} (${nombresUnidades}${masUnidades})`
  } else if (config.reportarPor === 'Conductores') {
    const numConductores = Object.keys(datosReales.eventosAgrupados || {}).length
    const nombresConductores = Object.keys(datosReales.eventosAgrupados || {})
      .slice(0, 2)
      .join(', ')
    const masConductores = numConductores > 2 ? `, +${numConductores - 2} más` : ''
    metadata.reporteDe = `${numConductores} conductor${numConductores > 1 ? 'es' : ''} (${nombresConductores}${masConductores})`
  } else {
    metadata.reporteDe = config.reportarPor
  }

  metadata.agrupacion = `Agrupado por: ${config.agruparPor || 'unidad'}`

  return metadata
}
function subAgruparEventos(eventos, config, datosReales) {
  const criterioSubAgrupacion = config.agruparPor || 'unidad'
  const criterioPrincipal = datosReales?.agrupacionReal || 'unidad'

  // Si el criterio de sub-agrupación es el mismo que el principal, no sub-agrupar
  if (criterioSubAgrupacion === criterioPrincipal) {
    return { 'Todos los eventos': eventos }
  }

  const subGrupos = {}

  eventos.forEach((evento) => {
    let claveSubGrupo = ''

    switch (criterioSubAgrupacion) {
      case 'unidad': {
        claveSubGrupo = evento.unidadNombre || evento.idUnidad || 'Sin unidad'
        break
      }

      case 'conductor': {
        claveSubGrupo = evento.conductorNombre || 'Sin conductor'
        break
      }

      case 'dia': {
        let fechaStr = 'Fecha desconocida'

        // USAR TIMESTAMP EN LUGAR DE horaInicioEvento
        if (evento.timestamp) {
          try {
            const fecha = new Date(evento.timestamp)
            const dia = String(fecha.getDate()).padStart(2, '0')
            const mes = String(fecha.getMonth() + 1).padStart(2, '0')
            const anio = fecha.getFullYear()
            fechaStr = `${dia}/${mes}/${anio}`
          } catch (error) {
            console.error('Error extrayendo fecha:', error)
            fechaStr = 'Fecha desconocida'
          }
        }

        claveSubGrupo = fechaStr
        break
      }
      case 'evento': {
        claveSubGrupo = evento.eventoNombre || evento.mensaje || 'Sin evento'
        break
      }

      case 'geozona': {
        claveSubGrupo = evento.geozona || 'Sin geozona'
        break
      }

      case 'grupo': {
        claveSubGrupo = evento.grupo || 'Sin grupo'
        break
      }

      default: {
        claveSubGrupo = 'Otros'
      }
    }

    if (!subGrupos[claveSubGrupo]) {
      subGrupos[claveSubGrupo] = []
    }
    subGrupos[claveSubGrupo].push(evento)
  })

  return subGrupos
}

/**
 * Genera el header para un sub-grupo
 */
function generarHeaderSubGrupo(nombreSubGrupo, eventos, config) {
  const criterio = config.agruparPor || 'unidad'

  if (nombreSubGrupo === 'Todos los eventos') {
    return null
  }

  let titulo = ''
  let subtitulo = ''
  let stats = ''

  const totalEventos = eventos.length

  switch (criterio) {
    case 'evento': {
      titulo = `EVENTO: ${nombreSubGrupo}`
      const entradas = eventos.filter((e) => e.tipo?.toLowerCase() === 'entrada').length
      const salidas = eventos.filter((e) => e.tipo?.toLowerCase() === 'salida').length
      subtitulo = `Tipo de evento: ${nombreSubGrupo}`
      stats = `Total de ocurrencias: ${totalEventos} | Entradas: ${entradas} | Salidas: ${salidas}`
      break
    }

    case 'dia': {
      let fechaFormateada = nombreSubGrupo
      try {
        if (nombreSubGrupo.includes('/')) {
          const partes = nombreSubGrupo.split('/')
          let dia, mes, anio

          // Detectar formato DD/MM/YYYY vs YYYY/MM/DD
          if (parseInt(partes[0]) > 31) {
            // Es YYYY/MM/DD
            anio = parseInt(partes[0])
            mes = parseInt(partes[1]) - 1 // Mes en JS es 0-11
            dia = parseInt(partes[2])
          } else {
            // Es DD/MM/YYYY
            dia = parseInt(partes[0])
            mes = parseInt(partes[1]) - 1 // Mes en JS es 0-11
            anio = parseInt(partes[2])
          }

          // Crear fecha en HORA LOCAL, no UTC
          const fecha = new Date(anio, mes, dia)

          if (!isNaN(fecha.getTime())) {
            const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            fechaFormateada = fecha.toLocaleDateString('es-ES', opciones)
            // Capitalizar primera letra
            fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)
          }
        }
      } catch (error) {
        console.error('Error formateando fecha:', error)
      }

      titulo = `DÍA: ${fechaFormateada}`
      const unidadesDelDia = [...new Set(eventos.map((e) => e.unidadNombre || e.idUnidad))]
      subtitulo = `Unidades activas: ${unidadesDelDia.join(', ')}`
      stats = `Eventos del día: ${totalEventos}`
      break
    }

    case 'unidad': {
      titulo = `UNIDAD: ${nombreSubGrupo}`
      const placa = eventos[0]?.placa || 'Sin placa'
      const conductoresUnicos = [...new Set(eventos.map((e) => e.conductorNombre).filter(Boolean))]
      subtitulo = `Placa: ${placa}`
      if (conductoresUnicos.length > 0) {
        subtitulo += ` | Conductores: ${conductoresUnicos.join(', ')}`
      }
      stats = `Total de eventos: ${totalEventos}`
      break
    }

    case 'conductor': {
      titulo = `CONDUCTOR: ${nombreSubGrupo}`
      const unidadesUsadas = [
        ...new Set(eventos.map((e) => e.unidadNombre || e.idUnidad).filter(Boolean)),
      ]
      subtitulo = `Unidades usadas: ${unidadesUsadas.join(', ')}`
      stats = `Total de eventos: ${totalEventos}`
      break
    }
    case 'geozona': {
      titulo = `GEOZONA: ${nombreSubGrupo}`
      stats = `Total de eventos: ${totalEventos}`
      break
    }

    case 'grupo': {
      titulo = `GRUPO: ${nombreSubGrupo}`
      stats = `Total de eventos: ${totalEventos}`
      break
    }

    default: {
      titulo = `${nombreSubGrupo}`
      stats = `Total de eventos: ${totalEventos}`
    }
  }

  return { titulo, subtitulo, stats }
}

export function useReportePDF() {
  /**
   *
   * Genera un PDF con eventos agrupados
   * @param {Object} config - Configuración del reporte
   * @param {Object} datosReales - Datos obtenidos de Firebase
   */

  const generarPDFEventos = (config, datosReales) => {
    console.log('🔍 config.reportarPor:', config.reportarPor)
    console.log('🔍 config.agruparPor:', config.agruparPor)
    console.log('🔍 Claves de eventosAgrupados:', Object.keys(datosReales.eventosAgrupados || {}))

    console.log('📊 datosReales en PDF Eventos:', datosReales)
    console.log('📊 eventosAgrupados:', datosReales.eventosAgrupados)
    console.log('📊 Primer evento:', Object.values(datosReales.eventosAgrupados)[0]?.[0])
    console.log('📊 datosColumnas[0]:', datosReales.datosColumnas?.[0])
    const doc = new jsPDF('landscape') // Modo horizontal para más columnas
    let yPosition = 20

    // Título del documento
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Informe de Eventos', 14, yPosition)
    yPosition += 10

    // Información del reporte
    const metadata = generarMetadataReporte(config, datosReales)

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Periodo: ${metadata.periodo}`, 14, yPosition)
    yPosition += 6
    doc.text(`Generado: ${metadata.generado}`, 14, yPosition)
    yPosition += 6
    doc.text(`Reporte de: ${metadata.reporteDe}`, 14, yPosition)
    yPosition += 6
    doc.text(metadata.agrupacion, 14, yPosition)
    yPosition += 6
    doc.text(`Total de eventos: ${metadata.totalEventos}`, 14, yPosition)
    yPosition += 10
    // ========================================
    // 🔥 NUEVO: Resumen estadístico
    // ========================================
    const resumenPorTipo = generarResumenPorTipo(datosReales, config)

    if (resumenPorTipo) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      const tituloResumen =
        resumenPorTipo.tipo === 'unidades'
          ? 'Resumen por Unidad'
          : resumenPorTipo.tipo === 'conductores'
            ? 'Resumen por Conductor'
            : 'Resumen del Informe'

      doc.text(tituloResumen, 14, yPosition)
      yPosition += 8

      autoTable(doc, {
        startY: yPosition,
        head: [resumenPorTipo.headers],
        body: resumenPorTipo.rows,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        styles: { fontSize: 8 },
      })

      yPosition = doc.lastAutoTable.finalY + 10
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
    if (datosReales.eventosAgrupados && Object.keys(datosReales.eventosAgrupados).length > 0) {
      Object.entries(datosReales.eventosAgrupados).forEach(([nombreGrupo, eventos], index) => {
        if (index > 0 || yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        // 🔥 NUEVO: Usar header contextual
        const headerInfo = generarHeaderGrupo(nombreGrupo, eventos, config, datosReales)
        if (headerInfo) {
          const pageWidth = doc.internal.pageSize.width
          doc.addPage()
          yPosition = 20

          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(41, 128, 185)
          doc.text(headerInfo.titulo, 20, yPosition)
          yPosition += 8

          if (headerInfo.subtitulo) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(headerInfo.subtitulo, 20, yPosition)
            yPosition += 6
          }

          if (headerInfo.stats) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(100, 100, 100)
            doc.text(headerInfo.stats, 20, yPosition)
            yPosition += 10
          }

          doc.setDrawColor(200, 200, 200)
          doc.line(20, yPosition, pageWidth - 20, yPosition)
          yPosition += 8
        }

        // ========================================
        // SUB-AGRUPACIÓN DE EVENTOS
        // ========================================
        const subGrupos = subAgruparEventos(eventos, config, datosReales)

        console.log('🔍 Sub-grupos creados:', Object.keys(subGrupos))
        console.log('🔍 Primer evento del primer sub-grupo:', Object.values(subGrupos)[0]?.[0])

        const pageHeight = doc.internal.pageSize.getHeight()
        Object.entries(subGrupos).forEach(([nombreSubGrupo, eventosSubGrupo], indexSubGrupo) => {
          console.log(`🔍 Sub-grupo "${nombreSubGrupo}":`, eventosSubGrupo.length, 'eventos')
          console.log('🔍 Primer evento:', eventosSubGrupo[0])

          if (!eventosSubGrupo || eventosSubGrupo.length === 0) return

          // Header del sub-grupo
          const headerSubGrupo = generarHeaderSubGrupo(nombreSubGrupo, eventosSubGrupo, config)

          if (headerSubGrupo) {
            if (indexSubGrupo > 0) {
              yPosition += 5
            }

            if (yPosition > pageHeight - 40) {
              doc.addPage()
              yPosition = 20
            }

            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(52, 152, 219)
            doc.text(headerSubGrupo.titulo, 25, yPosition)
            yPosition += 6

            if (headerSubGrupo.subtitulo) {
              doc.setFontSize(9)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(120, 120, 120)
              doc.text(headerSubGrupo.subtitulo, 25, yPosition)
              yPosition += 5
            }

            if (headerSubGrupo.stats) {
              doc.setFontSize(8)
              doc.setFont('helvetica', 'italic')
              doc.setTextColor(120, 120, 120)
              doc.text(headerSubGrupo.stats, 25, yPosition)
              yPosition += 8
            }
          }

          const columnasVisibles = config.columnasVisibles || [
            'nombreEvento',
            'horaInicioEvento',
            'conductorNombre',
            'unidadNombre',
            'tipo',
            'hora',
            'fecha',
            'duracion',
          ]

          const headers = columnasVisibles.map((col) => {
            const nombres = {
              nombreEvento: 'Nombre de evento',
              horaInicioEvento: 'Hora de inicio de evento',
              conductorNombre: 'Conductor',
              unidadNombre: 'Vehículo',
              tipo: 'Tipo',
              hora: 'Hora',
              fecha: 'Fecha',
              duracion: 'Duración',
              condicionEvento: 'Condición de evento',
              mensaje: 'Mensaje',
              ubicacion: 'Ubicación',
              tipoUbicacion: 'Tipo de ubicación',
              geozona: 'Geozona',
              poi: 'POI',
              coordenadas: 'Coordenadas',
              direccion: 'Dirección',
              kilometraje: 'Kilometraje',
              velocidad: 'Velocidad',
              bateria: 'Batería',
              estadoVehiculo: 'Estado del vehículo',
              ignicion: 'Ignición',
              placa: 'Placa',
            }
            return nombres[col] || col
          })

          const tableData = eventosSubGrupo.map((evento) => {
            return columnasVisibles.map((col) => {
              let valor = evento[col]

              // MAPEO DE NOMBRES DE PROPIEDADES
              switch (col) {
                case 'nombreEvento':
                  valor = evento.eventoNombre || evento.mensaje
                  break

                case 'horaInicioEvento':
                  if (evento.timestamp) {
                    try {
                      const fecha = new Date(evento.timestamp)
                      valor = fecha.toLocaleString('es-MX', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })
                    } catch (error) {
                      console.error(error)
                      valor = 'N/A'
                    }
                  }
                  break

                case 'fecha':
                  if (evento.timestamp) {
                    try {
                      const fecha = new Date(evento.timestamp)
                      const dia = String(fecha.getDate()).padStart(2, '0')
                      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
                      const anio = fecha.getFullYear()
                      valor = `${dia}/${mes}/${anio}`
                    } catch (error) {
                      valor = 'N/A'
                      console.error(error)
                    }
                  }
                  break

                case 'hora':
                  if (evento.timestamp) {
                    try {
                      const fecha = new Date(evento.timestamp)
                      valor = fecha.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    } catch (error) {
                      console.error(error)
                      valor = 'N/A'
                    }
                  }
                  break

                case 'tipo':
                  valor = evento.tipoEvento
                  break

                case 'placa':
                  valor = evento.unidadPlaca
                  break

                case 'unidadNombre':
                  // Ya existe con este nombre
                  valor = evento.unidadNombre
                  break

                case 'conductorNombre':
                  // Ya existe con este nombre
                  valor = evento.conductorNombre
                  break

                case 'coordenadas':
                  if (evento.coordenadas?.lat && evento.coordenadas?.lng) {
                    valor = `${evento.coordenadas.lat}, ${evento.coordenadas.lng}`
                  }
                  break

                case 'direccion':
                  valor = evento.direccion
                  break

                case 'geozona':
                  valor = evento.geozonaNombre
                  break

                case 'velocidad':
                  valor = evento.velocidad !== undefined ? `${evento.velocidad} km/h` : 'N/A'
                  break

                case 'duracion':
                  if (evento.duracionMinutos !== undefined && evento.duracionMinutos !== null) {
                    valor = `${evento.duracionMinutos} min`
                  }
                  break

                default:
                  // Para cualquier otra columna, usar el valor directo
                  valor = evento[col]
              }

              return valor !== undefined && valor !== null ? String(valor) : 'N/A'
            })
          })
          console.log('Objeto doc antes de autoTable:', doc)
          console.log('¿doc es una instancia de jsPDF?', doc instanceof jsPDF)
          autoTable(doc, {
            startY: yPosition,
            head: [headers],
            body: tableData,
            theme: 'striped',
            styles: {
              fontSize: 7,
              cellPadding: 2,
            },
            headStyles: {
              fillColor: [52, 152, 219],
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245],
            },
            margin: { left: headerSubGrupo ? 25 : 20, right: 20 },
            didDrawPage: function (data) {
              yPosition = data.cursor.y + 5
            },
          })

          yPosition = doc.lastAutoTable.finalY + 10
        })
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
    const trayectosArray = datosReales.eventosAgrupados
      ? Object.values(datosReales.eventosAgrupados).flat()
      : Array.isArray(datosReales)
        ? datosReales
        : []

    console.log('📊 datosReales.resumen:', datosReales.resumen)
    console.log('📊 datosReales.stats:', datosReales.stats)
    console.log('📊 trayectosArray:', trayectosArray)

    console.log('📦 Trayectos en PDF:', trayectosArray.length)
    console.log('📦 Primer trayecto:', trayectosArray[0])
    console.log('📍 Primera coordenada:', trayectosArray[0]?.coordenadas?.[0])
    console.log('📍 Segunda coordenada:', trayectosArray[0]?.coordenadas?.[1])
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
    // ========================================
    // 📊 RESUMEN ESTADÍSTICO (TRAYECTOS)
    // ========================================
    if (config.mostrarResumen && trayectosArray.length > 0) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen Estadístico', 14, yPosition)
      yPosition += 8

      // 🔥 CALCULAR desde trayectosArray
      const totalTrayectos = trayectosArray.length
      const unidadesUnicas = new Set(trayectosArray.map((t) => t.unidadNombre || t.idUnidad)).size
      const kilometrajeTotal = trayectosArray.reduce(
        (sum, t) => sum + (t.kilometrajeRecorrido || 0),
        0,
      )
      const duracionTotalHoras = trayectosArray.reduce(
        (sum, t) => sum + parseFloat(t.duracionHoras || 0),
        0,
      )

      // 🔥 NUEVO: Convertir horas decimales a HH:MM
      const horas = Math.floor(duracionTotalHoras)
      const minutos = Math.round((duracionTotalHoras - horas) * 60)
      const duracionFormateada = `${horas}h ${minutos}m`

      const resumenData = [
        ['Total de trayectos', totalTrayectos],
        ['Unidades únicas', unidadesUnicas],
        ['Kilometraje total', `${kilometrajeTotal.toFixed(2)} km`],
        ['Duración total', duracionFormateada], // 🔥 Usar formato HH:MM
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

      const headers = datosReales.configuracionColumnas
        ? datosReales.configuracionColumnas.map((col) => col.label)
        : Object.keys(datosReales.datosColumnas[0])

      const totalColumnas = headers.length
      const necesitaMultilinea = totalColumnas > 8

      const headersFinales = necesitaMultilinea
        ? headers.map((header) => {
            const palabras = header.split(' ')
            if (palabras.length > 2) {
              const mitad = Math.ceil(palabras.length / 2)
              return palabras.slice(0, mitad).join(' ') + '\n' + palabras.slice(mitad).join(' ')
            }
            return header
          })
        : headers

      const rows = datosReales.datosColumnas.map((fila) => headers.map((col) => fila[col] || 'N/A'))

      // 🔥 NUEVO: Calcular anchos de columnas basados en el ancho de página
      const pageWidth = doc.internal.pageSize.width
      const marginTotal = 20 // left + right margins
      const availableWidth = pageWidth - marginTotal
      const columnWidth = availableWidth / totalColumnas

      // 🔥 Crear columnStyles con anchos fijos
      const columnStyles = {}
      headers.forEach((header, index) => {
        columnStyles[index] = {
          cellWidth: columnWidth,
          overflow: 'linebreak', // 🔥 Forzar wrap en celdas
          halign: 'left',
        }
      })

      autoTable(doc, {
        startY: yPosition,
        head: [headersFinales],
        body: rows,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          fontStyle: 'bold',
          fontSize: necesitaMultilinea ? 7 : 8,
          minCellHeight: necesitaMultilinea ? 10 : 8,
          halign: 'left',
          valign: 'middle',
        },
        styles: {
          fontSize: necesitaMultilinea ? 6 : 7, // 🔥 Más pequeño si hay muchas columnas
          cellPadding: 1.5,
          overflow: 'linebreak', // 🔥 Importante: permite wrap
          cellWidth: 'wrap',
        },
        columnStyles: columnStyles, // 🔥 Aplicar anchos fijos
        margin: { left: 10, right: 10 },
        tableWidth: 'auto', // 🔥 Usar todo el ancho disponible
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

      const resumenData = datosReales.resumenGeneral.map((item) => {
        // Verificar si tiene horas extra (HH:MM:SS)
        const partesFuera = item.duracionFuera.split(':')
        const tieneHorasExtra =
          parseInt(partesFuera[0]) > 0 ||
          parseInt(partesFuera[1]) > 0 ||
          parseInt(partesFuera[2]) > 0

        return [
          { content: item.nombre, styles: {} },
          {
            content: item.duracionFuera,
            styles:
              config.remarcarHorasExtra && tieneHorasExtra
                ? {
                    fillColor: [255, 235, 238], // #ffebee (rosa claro)
                    textColor: [211, 47, 47], // #d32f2f (rojo)
                    fontStyle: 'bold',
                  }
                : {},
          },
          { content: item.duracionTotal, styles: {} },
          { content: item.duracionDentro, styles: {} },
        ]
      })
      if (datosReales.totales) {
        const partesTotales = datosReales.totales.duracionFuera.split(':')
        const tieneTotalesExtra =
          parseInt(partesTotales[0]) > 0 ||
          parseInt(partesTotales[1]) > 0 ||
          parseInt(partesTotales[2]) > 0

        resumenData.push([
          { content: 'TOTALES', styles: { fontStyle: 'bold' } },
          {
            content: datosReales.totales.duracionFuera,
            styles:
              config.remarcarHorasExtra && tieneTotalesExtra
                ? {
                    fillColor: [255, 235, 238],
                    textColor: [211, 47, 47],
                    fontStyle: 'bold',
                  }
                : { fontStyle: 'bold' },
          },
          { content: datosReales.totales.duracionTotal, styles: { fontStyle: 'bold' } },
          { content: datosReales.totales.duracionDentro, styles: { fontStyle: 'bold' } },
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
      // 📋 DETALLES DE LOS TRAYECTOS
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Detalles de los trayectos', 14, yPosition)
      yPosition += 8

      // 🔥 PREPARAR DATOS CON ESTILOS
      const todosLosViajes = []
      registros.forEach((registro) => {
        if (registro.detallesViajes && registro.detallesViajes.length > 0) {
          registro.detallesViajes.forEach((viaje) => {
            const partesFuera = viaje.duracionFuera.split(':')
            const tieneHorasFuera =
              parseInt(partesFuera[0]) > 0 ||
              parseInt(partesFuera[1]) > 0 ||
              parseInt(partesFuera[2]) > 0

            todosLosViajes.push([
              { content: viaje.horaInicio, styles: {} },
              { content: viaje.ubicacionInicio, styles: {} },
              { content: viaje.horaFin, styles: {} },
              { content: viaje.ubicacionFin, styles: {} },
              {
                content: viaje.duracionFuera,
                styles:
                  config.remarcarHorasExtra && tieneHorasFuera
                    ? {
                        fillColor: [255, 235, 238],
                        textColor: [211, 47, 47],
                        fontStyle: 'bold',
                      }
                    : {},
              },
              { content: viaje.duracionDentro, styles: {} },
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
