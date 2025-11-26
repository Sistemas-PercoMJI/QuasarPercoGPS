// src/composables/useReportesEventos.js
import { ref } from 'vue'
import { collection, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore'

const db = getFirestore()

export function useReportesEventos() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Genera eventos simulados para pruebas
   */
  const generarEventosSimulados = (unidadNombre, unidadId, fechaInicio, fechaFin) => {
    const eventos = []
    const tiposEvento = [
      'Entrada a geozona',
      'Salida de geozona',
      'Exceso de velocidad',
      'Ralentí prolongado',
    ]

    const geozonas = [
      'Zona Industrial',
      'Centro de Distribución',
      'Almacén Principal',
      'Sucursal Norte',
    ]

    const conductores = [
      'Perez Lopez Pedro',
      'García Martínez Juan',
      'López Hernández María',
      'Rodríguez Sánchez Carlos',
    ]

    // Generar entre 5-15 eventos por día
    const diasEnRango = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1

    for (let dia = 0; dia < diasEnRango; dia++) {
      const fecha = new Date(fechaInicio)
      fecha.setDate(fecha.getDate() + dia)

      const numEventos = Math.floor(Math.random() * 11) + 5 // 5-15 eventos

      for (let i = 0; i < numEventos; i++) {
        const hora = Math.floor(Math.random() * 14) + 6 // Entre 6 AM y 8 PM
        const minuto = Math.floor(Math.random() * 60)

        const timestamp = new Date(fecha)
        timestamp.setHours(hora, minuto, 0, 0)

        const tipoEvento = tiposEvento[Math.floor(Math.random() * tiposEvento.length)]
        const geozona = geozonas[Math.floor(Math.random() * geozonas.length)]
        const conductor = conductores[Math.floor(Math.random() * conductores.length)]

        eventos.push({
          id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          eventoNombre: tipoEvento,
          tipoEvento: tipoEvento.includes('Entrada')
            ? 'entrada'
            : tipoEvento.includes('Salida')
              ? 'salida'
              : tipoEvento.includes('Exceso')
                ? 'velocidad'
                : 'ralenti',
          timestamp: timestamp,
          geozonaNombre: tipoEvento.includes('geozona') ? geozona : 'N/A',
          conductorNombre: conductor,
          unidadNombre: unidadNombre,
          idUnidad: unidadId,
          coordenadas: {
            lat: 32.5149 + (Math.random() - 0.5) * 0.1,
            lng: -117.0382 + (Math.random() - 0.5) * 0.1,
          },
          direccion: `Tijuana, Baja California, México`,
          velocidad: tipoEvento.includes('Exceso')
            ? Math.floor(Math.random() * 40) + 80
            : Math.floor(Math.random() * 60) + 20,
          duracion: tipoEvento.includes('Ralentí') ? Math.floor(Math.random() * 30) + 5 : null,
          mensaje: tipoEvento,
          detalles: `Evento ${tipoEvento.toLowerCase()} registrado`,
        })
      }
    }

    // Ordenar por timestamp
    eventos.sort((a, b) => a.timestamp - b.timestamp)

    return eventos
  }

  /**
   * Obtiene eventos reales de Firebase, con fallback a datos simulados
   */
  const obtenerEventosReales = async (
    unidadesNombres,
    fechaInicio,
    fechaFin,
    filtroEventos = [],
  ) => {
    console.log('🔍 Obteniendo eventos reales...')
    console.log('📦 Unidades:', unidadesNombres)
    console.log('📅 Desde:', fechaInicio.toLocaleDateString())
    console.log('📅 Hasta:', fechaFin.toLocaleDateString())

    loading.value = true
    error.value = null

    try {
      const todosLosEventos = []

      // 🔥 MAPEO DE NOMBRES A IDS
      const unidadesIds = unidadesNombres.map((nombre) => {
        // Intentar obtener el ID del mapeo global
        if (window.unidadesMap && window.unidadesMap[nombre]) {
          return window.unidadesMap[nombre]
        }
        // Si no existe el mapeo, usar el nombre como ID
        return nombre
      })

      console.log('📦 IDs de unidades a consultar:', unidadesIds)

      for (const unidadId of unidadesIds) {
        console.log(`🚗 Procesando unidad: ${unidadId}`)

        // Iterar por cada día en el rango
        const fechaActual = new Date(fechaInicio)
        while (fechaActual <= fechaFin) {
          const fechaStr = fechaActual.toISOString().split('T')[0]

          try {
            // 🔥 PASO 1: OBTENER DATOS DE RUTA DIARIA PRIMERO (para conductor)
            let conductorNombre = 'Sin conductor'

            try {
              const rutaDiariaRef = doc(db, `Unidades/${unidadId}/RutaDiaria/${fechaStr}`)
              const rutaDiariaSnap = await getDoc(rutaDiariaRef)

              if (rutaDiariaSnap.exists()) {
                const rutaData = rutaDiariaSnap.data()

                // 🔥 LIMPIAR "undefined" del nombre si existe
                let nombreLimpio = rutaData.conductor_nombre || 'Sin conductor'
                nombreLimpio = nombreLimpio
                  .replace(/\s*undefined\s*/gi, '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .trim()

                conductorNombre = nombreLimpio || 'Sin conductor'
                console.log(`  👤 Conductor obtenido (limpio): ${conductorNombre}`)
              } else {
                console.log(`  ⚠️ No existe RutaDiaria para ${fechaStr}`)
              }
            } catch (errRuta) {
              console.warn(`  ⚠️ Error al obtener RutaDiaria:`, errRuta.message)
            }

            // 🔥 PASO 2: OBTENER EVENTOS DIARIOS
            const eventosRef = collection(
              db,
              `Unidades/${unidadId}/RutaDiaria/${fechaStr}/EventoDiario`,
            )

            const snapshot = await getDocs(eventosRef)

            if (!snapshot.empty) {
              console.log(`  ✅ ${fechaStr}: ${snapshot.size} eventos encontrados en Firebase`)

              snapshot.forEach((doc) => {
                const data = doc.data()

                // 🔥 CORRECCIÓN 1: Usar DuracionDentro (no Duracion)
                const duracionMinutos = data.DuracionDentro || null

                // Formatear duración como HH:MM:SS si existe
                let duracionFormateada = null
                if (duracionMinutos !== null && duracionMinutos !== undefined) {
                  const horas = Math.floor(duracionMinutos / 60)
                  const minutos = Math.floor(duracionMinutos % 60)
                  const segundos = Math.floor((duracionMinutos % 1) * 60)
                  duracionFormateada = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
                }

                todosLosEventos.push({
                  id: doc.id,
                  eventoNombre: data.NombreEvento || data.eventoNombre || 'Evento sin nombre',
                  tipoEvento: data.TipoEvento || data.tipoEvento || 'desconocido',
                  timestamp:
                    data.Timestamp?.toDate() || data.timestamp?.toDate() || new Date(fechaStr),
                  geozonaNombre:
                    data.GeozonaNombre ||
                    data.geozonaNombre ||
                    data.PoiNombre ||
                    data.poiNombre ||
                    'N/A',
                  // 🔥 CORRECCIÓN 2: Usar conductor obtenido de RutaDiaria
                  conductorNombre: conductorNombre,
                  unidadNombre: window.unidadesMap
                    ? Object.keys(window.unidadesMap).find(
                        (k) => window.unidadesMap[k] === unidadId,
                      ) || unidadId
                    : unidadId,
                  idUnidad: unidadId,
                  coordenadas: data.Coordenadas || data.coordenadas || { lat: 0, lng: 0 },
                  direccion: data.Direccion || data.direccion || 'Sin dirección',
                  velocidad: data.Velocidad || data.velocidad || 0,
                  // 🔥 CORRECCIÓN 1: Usar el campo correcto y formateado
                  duracion: duracionFormateada,
                  duracionMinutos: duracionMinutos, // Mantener el valor numérico también
                  mensaje: data.Mensaje || data.mensaje || data.NombreEvento || 'Sin mensaje',
                  detalles: data.Detalles || data.detalles || '',
                  // 🆕 Campos adicionales útiles
                  idEvento: data.IdEvento || data.idEvento || '',
                  idRutaDiaria: data.IdRutaDiaria || data.idRutaDiaria || fechaStr,
                  tipoUbicacion: data.tipoUbicacion || 'Geozona',
                  ubicacionId: data.ubicacionId || '',
                  finEvento: data.FinEvento?.toDate() || null,
                })
              })
            } else {
              console.log(`  ⚠️ ${fechaStr}: No hay eventos en Firebase`)
            }
          } catch (err) {
            console.error(`  ❌ Error al obtener eventos de ${fechaStr}:`, err)
          }

          fechaActual.setDate(fechaActual.getDate() + 1)
        }
      }

      console.log(`✅ Total de eventos reales obtenidos: ${todosLosEventos.length}`)

      // 🔍 DEBUG: Mostrar nombres únicos de eventos y conductores
      if (todosLosEventos.length > 0) {
        const nombresUnicos = [...new Set(todosLosEventos.map((e) => e.eventoNombre))]
        const conductoresUnicos = [...new Set(todosLosEventos.map((e) => e.conductorNombre))]
        console.log('📋 Nombres de eventos en Firebase:', nombresUnicos)
        console.log('👥 Conductores en eventos:', conductoresUnicos)
      }

      // 🔥 SI NO HAY EVENTOS REALES, GENERAR SIMULADOS
      if (todosLosEventos.length === 0) {
        console.log('⚠️ No se encontraron eventos reales, generando datos simulados...')

        for (let i = 0; i < unidadesNombres.length; i++) {
          const nombre = unidadesNombres[i]
          const id = unidadesIds[i]
          const eventosSimulados = generarEventosSimulados(nombre, id, fechaInicio, fechaFin)
          todosLosEventos.push(...eventosSimulados)
          console.log(`  ✅ Generados ${eventosSimulados.length} eventos simulados para ${nombre}`)
        }

        console.log(`✅ Total de eventos simulados: ${todosLosEventos.length}`)
      }

      // Filtrar por tipos de evento si se especificaron
      let eventosFiltrados = todosLosEventos
      if (filtroEventos && filtroEventos.length > 0) {
        eventosFiltrados = todosLosEventos.filter((evento) =>
          filtroEventos.includes(evento.eventoNombre),
        )
        console.log(`🔍 Filtrados ${eventosFiltrados.length} eventos de ${todosLosEventos.length}`)
      }

      return eventosFiltrados
    } catch (err) {
      console.error('❌ Error al obtener eventos:', err)
      error.value = err.message

      // En caso de error, generar datos simulados como fallback
      console.log('🔄 Generando datos simulados como fallback...')
      const eventosFallback = []
      const unidadesIds = unidadesNombres.map((nombre) => window.unidadesMap?.[nombre] || nombre)

      for (let i = 0; i < unidadesNombres.length; i++) {
        const eventosSimulados = generarEventosSimulados(
          unidadesNombres[i],
          unidadesIds[i],
          fechaInicio,
          fechaFin,
        )
        eventosFallback.push(...eventosSimulados)
      }

      return eventosFallback
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    obtenerEventosReales,
    generarEventosSimulados,
  }
}
