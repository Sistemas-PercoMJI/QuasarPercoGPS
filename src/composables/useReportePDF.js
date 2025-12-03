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
      const entradas = eventos.filter((e) => e.tipoEvento?.toLowerCase() === 'entrada').length
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
    console.log('🔍 CONFIG COMPLETO:', config)
    console.log('🔍 columnasVisibles en config:', config.columnasVisibles)
    //  console.log('🔍 config.reportarPor:', config.reportarPor)
    // console.log('🔍 config.agruparPor:', config.agruparPor)
    //console.log('🔍 Claves de eventosAgrupados:', Object.keys(datosReales.eventosAgrupados || {}))

    //console.log('📊 datosReales en PDF Eventos:', datosReales)
    //console.log('📊 eventosAgrupados:', datosReales.eventosAgrupados)
    //console.log('📊 Primer evento:', Object.values(datosReales.eventosAgrupados)[0]?.[0])
    //console.log('📊 datosColumnas[0]:', datosReales.datosColumnas?.[0])
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
          console.log('🔍 Columnas visibles:', config.columnasVisibles)
          console.log('🔍 Número de columnas:', config.columnasVisibles?.length)

          // ========================================
          // TABLA DE EVENTOS DEL SUB-GRUPO
          // ========================================

          // Mapeo de nombres en español a nombres de propiedades
          const nombreColumnaAPropiedad = {
            'Nombre de evento': 'nombreEvento',
            'Hora de inicio de evento': 'horaInicioEvento',
            Conductor: 'conductorNombre',
            Vehículo: 'unidadNombre',
            Tipo: 'tipo',
            Hora: 'hora',
            Fecha: 'fecha',
            Duración: 'duracion',
            'Condición de evento': 'condicionEvento',
            Mensaje: 'mensaje',
            Ubicación: 'ubicacion',
            'Tipo de ubicación': 'tipoUbicacion',
            Geozona: 'geozona',
            POI: 'poi',
            Coordenadas: 'coordenadas',
            Dirección: 'direccion',
            Kilometraje: 'kilometraje',
            Velocidad: 'velocidad',
            Batería: 'bateria',
            'Estado del vehículo': 'estadoVehiculo',
            Ignición: 'ignicion',
            Placa: 'placa',
          }

          // Convertir columnasSeleccionadas (español) a nombres de propiedades (inglés)
          let columnasVisibles
          if (config.columnasSeleccionadas && config.columnasSeleccionadas.length > 0) {
            columnasVisibles = config.columnasSeleccionadas.map((nombreEspanol) => {
              return nombreColumnaAPropiedad[nombreEspanol] || nombreEspanol
            })
          } else {
            // Fallback: todas las columnas
            columnasVisibles = [
              'nombreEvento',
              'horaInicioEvento',
              'conductorNombre',
              'unidadNombre',
              'tipo',
              'hora',
              'fecha',
              'duracion',
              'condicionEvento',
              'mensaje',
              'ubicacion',
              'tipoUbicacion',
              'geozona',
              'poi',
              'coordenadas',
              'direccion',
              'kilometraje',
              'velocidad',
              'bateria',
              'estadoVehiculo',
              'ignicion',
              'placa',
            ]
          }

          // Preparar datos para la tabla
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
                case 'nombreEvento': {
                  valor = evento.eventoNombre || evento.mensaje
                  break
                }

                case 'horaInicioEvento': {
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
                      valor = 'N/A'
                      console.error(error)
                    }
                  }
                  break
                }

                case 'fecha': {
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
                }

                case 'hora': {
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
                }

                case 'tipo': {
                  valor = evento.tipoEvento
                  break
                }

                case 'placa': {
                  valor = evento.unidadPlaca
                  break
                }

                case 'unidadNombre': {
                  valor = evento.unidadNombre
                  break
                }

                case 'conductorNombre': {
                  valor = evento.conductorNombre
                  break
                }

                case 'coordenadas': {
                  if (evento.coordenadas?.lat && evento.coordenadas?.lng) {
                    valor = `${evento.coordenadas.lat}, ${evento.coordenadas.lng}`
                  }
                  break
                }

                case 'direccion': {
                  valor = evento.direccion
                  break
                }

                case 'geozona': {
                  valor = evento.geozonaNombre
                  break
                }

                case 'velocidad': {
                  valor = evento.velocidad !== undefined ? `${evento.velocidad} km/h` : 'N/A'
                  break
                }

                case 'duracion': {
                  if (evento.duracionMinutos !== undefined && evento.duracionMinutos !== null) {
                    valor = `${evento.duracionMinutos} min`
                  }
                  break
                }

                case 'mensaje': {
                  valor = evento.mensaje
                  break
                }

                case 'ubicacion': {
                  valor = evento.geozonaNombre
                  break
                }

                case 'tipoUbicacion': {
                  valor = evento.tipoUbicacion
                  break
                }

                case 'poi': {
                  valor = evento.poi
                  break
                }

                case 'kilometraje': {
                  valor = evento.kilometraje
                  break
                }

                case 'bateria': {
                  valor = evento.bateria
                  break
                }

                case 'estadoVehiculo': {
                  valor = evento.estadoVehiculo
                  break
                }

                case 'ignicion': {
                  valor = evento.ignicion
                  break
                }

                case 'condicionEvento': {
                  valor = evento.condicionEvento
                  break
                }

                default: {
                  valor = evento[col]
                }
              }

              return valor !== undefined && valor !== null ? String(valor) : 'N/A'
            })
          })

          // Generar tabla
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
    let yPos = 20

    // ========================================
    // ENCABEZADO DEL DOCUMENTO
    // ========================================
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Informe de Horas de Trabajo', 14, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Periodo: ${config.rangoFechaFormateado}`, 14, yPos)
    yPos += 6
    doc.text(
      `Generado: ${new Date().toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      14,
      yPos,
    )
    yPos += 6
    doc.text(`Reportar por: ${config.reportarPor}`, 14, yPos)
    yPos += 6
    doc.text(`Horario comercial: ${config.horarioInicio} - ${config.horarioFin}`, 14, yPos)
    yPos += 10

    // ========================================
    // RESUMEN GENERAL (si está activo)
    // ========================================
    if (config.mostrarResumen && datosReales.resumenGeneral) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen del Informe', 14, yPos)
      yPos += 8

      const resumenData = datosReales.resumenGeneral.map((item) => {
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
                    fillColor: [255, 235, 238],
                    textColor: [211, 47, 47],
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
        startY: yPos,
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

      yPos = doc.lastAutoTable.finalY + 10
    }

    // ========================================
    // AGRUPAR REGISTROS POR UNIDAD/CONDUCTOR
    // ========================================
    const registrosPorEntidad = {}

    datosReales.registros.forEach((registro) => {
      const clave =
        config.reportarPor === 'Unidades' ? registro.unidadNombre : registro.conductorNombre

      if (!registrosPorEntidad[clave]) {
        registrosPorEntidad[clave] = []
      }
      registrosPorEntidad[clave].push(registro)
    })

    console.log('📊 Registros agrupados por:', config.reportarPor)
    console.log('📊 Grupos creados:', Object.keys(registrosPorEntidad))

    // ========================================
    // MAPEO DE COLUMNAS (español → propiedades)
    // ========================================
    const nombreColumnaAPropiedad = {
      Fecha: 'fecha',
      'Hora de inicio de trabajo': 'horaInicioTrabajo',
      'Hora de fin de trabajo': 'horaFinTrabajo',
      'Ubicación de inicio de trabajo': 'ubicacionInicio',
      'Ubicación de fin de trabajo': 'ubicacionFin',
      'Duración total de trabajo': 'duracionTotal',
      'Duración dentro del horario comercial': 'duracionDentroHorario',
      'Duración fuera del horario comercial': 'duracionFueraHorario',
      'Total de viajes': 'totalViajes',
      'Viajes dentro del horario': 'viajesDentroHorario',
      'Viajes fuera del horario': 'viajesFueraHorario',
      Conductor: 'conductorNombre',
    }

    const columnasVisiblesViajes = config.columnasSeleccionadas
      .map((nombreEspanol) => nombreColumnaAPropiedad[nombreEspanol])
      .filter(Boolean) // Eliminar undefined

    console.log('🔍 Columnas para viajes:', columnasVisiblesViajes)

    // Preparar headers en español
    const headersViajes = config.columnasSeleccionadas.filter((col) => nombreColumnaAPropiedad[col])

    console.log('🔍 Headers para tabla:', headersViajes)
    // Convertir columnas seleccionadas de español a propiedades
    const columnasVisibles = config.columnasSeleccionadas.map((nombreEspanol) => {
      return nombreColumnaAPropiedad[nombreEspanol] || nombreEspanol
    })

    console.log('🔍 Columnas convertidas:', columnasVisibles)

    // ========================================
    // LOOP POR CADA UNIDAD/CONDUCTOR
    // ========================================
    const { generarURLMapaTrayectos, descargarImagenMapaBase64, prepararDatosTrayectos } =
      useMapboxStaticImage()

    for (const [nombreEntidad, registros] of Object.entries(registrosPorEntidad)) {
      // Nueva página para cada entidad
      doc.addPage()
      yPos = 20

      // ========================================
      // HEADER DE LA ENTIDAD (NIVEL 1)
      // ========================================
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(41, 128, 185) // Azul oscuro

      const headerTitulo =
        config.reportarPor === 'Unidades'
          ? `UNIDAD: ${nombreEntidad}`
          : `CONDUCTOR: ${nombreEntidad}`

      doc.text(headerTitulo, 20, yPos)
      yPos += 8

      // Subtítulo con info adicional
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100)

      const primerRegistro = registros[0]
      if (config.reportarPor === 'Unidades') {
        const placa = primerRegistro.unidadPlaca || 'Sin placa'
        const conductores = [...new Set(registros.map((r) => r.conductorNombre).filter(Boolean))]
        doc.text(`Placa: ${placa} | Conductores: ${conductores.join(', ')}`, 20, yPos)
      } else {
        const unidades = [...new Set(registros.map((r) => r.unidadNombre).filter(Boolean))]
        doc.text(`Unidades usadas: ${unidades.join(', ')}`, 20, yPos)
      }
      yPos += 6

      // Stats de la entidad
      const totalViajes = registros.reduce((sum, r) => sum + (r.totalViajes || 0), 0)
      doc.setFontSize(9)
      doc.setFont(undefined, 'italic')
      doc.text(`Total de viajes: ${totalViajes}`, 20, yPos)
      yPos += 10

      // Línea separadora
      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPos, doc.internal.pageSize.getWidth() - 20, yPos)
      yPos += 8

      // ========================================
      // DECIDIR QUÉ MOSTRAR SEGÚN tipoDetalle
      // ========================================
      if (config.tipoDetalle === 'dias_detallados') {
        // ==========================================
        // OPCIÓN 1: DÍAS DETALLADOS (resumen + viajes)
        // ==========================================
        console.log('📅 Generando días detallados...')

        // Agrupar por fecha
        const registrosPorFecha = {}
        registros.forEach((registro) => {
          const fecha = registro.fecha
          if (!registrosPorFecha[fecha]) {
            registrosPorFecha[fecha] = []
          }
          registrosPorFecha[fecha].push(registro)
        })

        // Loop por cada día
        for (const [fecha, registrosDelDia] of Object.entries(registrosPorFecha)) {
          // Header del día (NIVEL 2)
          if (yPos > 230) {
            doc.addPage()
            yPos = 20
          }

          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.setTextColor(52, 152, 219) // Azul claro

          const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          const fechaTitulo = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)

          doc.text(`  DÍA: ${fechaTitulo}`, 25, yPos)
          yPos += 6

          // Stats del día
          const viajesDelDia = registrosDelDia.reduce((sum, r) => sum + (r.totalViajes || 0), 0)
          doc.setFontSize(8)
          doc.setFont(undefined, 'italic')
          doc.setTextColor(120, 120, 120)
          doc.text(`  Viajes del día: ${viajesDelDia}`, 25, yPos)
          yPos += 8

          // Mapa del día (si está activo)
          if (config.mostrarMapaZona && registrosDelDia.length > 0) {
            try {
              const trayectosParaMapa = prepararDatosTrayectos(registrosDelDia)

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

                doc.addImage(imagenBase64, 'PNG', mapX, yPos, mapWidth, mapHeight)
                yPos += mapHeight + 10
              }
            } catch (error) {
              console.error('Error generando mapa del día:', error)
            }
          }

          // Tabla de viajes del día
          if (yPos > 230) {
            doc.addPage()
            yPos = 20
          }

          // Preparar datos de viajes
          const todosLosViajes = []

          registros.forEach((registro) => {
            if (registro.detallesViajes && registro.detallesViajes.length > 0) {
              registro.detallesViajes.forEach((viaje) => {
                // Aplicar filtro
                const [hD, mD, sD] = viaje.duracionDentro.split(':').map(Number)
                const tieneDentro = hD > 0 || mD > 0 || sD > 0

                const [hF, mF, sF] = viaje.duracionFuera.split(':').map(Number)
                const tieneFuera = hF > 0 || mF > 0 || sF > 0

                let incluirViaje = false
                if (config.tipoInformeComercial === 'todos') {
                  incluirViaje = true
                } else if (config.tipoInformeComercial === 'dentro') {
                  incluirViaje = tieneDentro
                } else if (config.tipoInformeComercial === 'fuera') {
                  incluirViaje = tieneFuera
                }

                if (!incluirViaje) return

                // 🔥 MAPEAR VALORES SEGÚN COLUMNAS SELECCIONADAS
                const fila = columnasVisiblesViajes.map((prop) => {
                  let valor = viaje[prop] || registro[prop] || 'N/A'

                  if (prop === 'duracionFuera') {
                    return {
                      content: valor,
                      styles:
                        config.remarcarHorasExtra && tieneFuera
                          ? {
                              fillColor: [255, 235, 238],
                              textColor: [211, 47, 47],
                              fontStyle: 'bold',
                            }
                          : {},
                    }
                  }

                  return { content: valor, styles: {} }
                })

                todosLosViajes.push(fila)
              })
            }
          })

          if (todosLosViajes.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [headersViajes], // 🔥 USAR HEADERS CONFIGURABLES
              body: todosLosViajes,
              theme: 'grid',
              headStyles: { fillColor: [76, 175, 80], fontSize: 8 },
              styles: { fontSize: 7, cellPadding: 2 },
              margin: { left: 20, right: 20 },
            })

            yPos = doc.lastAutoTable.finalY + 10
          }
        }
      } else if (config.tipoDetalle === 'dias_resumidos') {
        // ==========================================
        // OPCIÓN 3: DÍAS RESUMIDOS (solo resumen, sin tabla de viajes)
        // ==========================================
        console.log('📊 Generando días resumidos...')

        // Agrupar por fecha
        const registrosPorFecha = {}
        registros.forEach((registro) => {
          const fecha = registro.fecha
          if (!registrosPorFecha[fecha]) {
            registrosPorFecha[fecha] = []
          }
          registrosPorFecha[fecha].push(registro)
        })

        // Preparar resumen por día
        const resumenPorDia = []

        Object.entries(registrosPorFecha).forEach(([fecha, registrosDelDia]) => {
          const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })

          const viajesDelDia = registrosDelDia.reduce((sum, r) => sum + (r.totalViajes || 0), 0)

          // Calcular duraciones totales del día
          let duracionTotalDia = '00:00:00'
          let duracionDentroDia = '00:00:00'
          let duracionFueraDia = '00:00:00'

          // Sumar duraciones (aquí necesitarías una función helper para sumar tiempos HH:MM:SS)
          // Por simplicidad, mostrar el del primer registro
          if (registrosDelDia[0]) {
            duracionTotalDia = registrosDelDia[0].duracionTotal || '00:00:00'
            duracionDentroDia = registrosDelDia[0].duracionDentroHorario || '00:00:00'
            duracionFueraDia = registrosDelDia[0].duracionFueraHorario || '00:00:00'
          }

          const tieneFuera = duracionFueraDia !== '00:00:00'

          resumenPorDia.push([
            { content: fechaFormateada, styles: {} },
            { content: viajesDelDia.toString(), styles: {} },
            { content: duracionTotalDia, styles: {} },
            { content: duracionDentroDia, styles: {} },
            {
              content: duracionFueraDia,
              styles:
                config.remarcarHorasExtra && tieneFuera
                  ? {
                      fillColor: [255, 235, 238],
                      textColor: [211, 47, 47],
                      fontStyle: 'bold',
                    }
                  : {},
            },
          ])
        })

        if (resumenPorDia.length > 0) {
          doc.setFontSize(12)
          doc.setFont(undefined, 'bold')
          doc.text('Resumen por Día', 20, yPos)
          yPos += 8

          autoTable(doc, {
            startY: yPos,
            head: [['Fecha', 'Viajes', 'Duración Total', 'Dentro Hor.', 'Fuera Hor.']],
            body: resumenPorDia,
            theme: 'grid',
            headStyles: { fillColor: [76, 175, 80], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 30 }, // Viajes
              2: { cellWidth: 40 }, // Duración Total
              3: { cellWidth: 40 }, // Dentro
              4: { cellWidth: 40 }, // Fuera
            },
            margin: { left: 20, right: 20 },
          })

          yPos = doc.lastAutoTable.finalY + 10
        }
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
