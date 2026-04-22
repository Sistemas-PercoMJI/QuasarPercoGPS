// src/composables/useReportesEventos.js
import { ref } from 'vue'
import { collection, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore'
import { useGeocoding } from './useGeocoding'
import { auth } from 'src/firebase/firebaseConfig'

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
          ignicion: true,
          kilometraje: null,
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

  const procesarEventosParaPDF = async (eventos) => {
    if (!eventos || eventos.length === 0) {
      return []
    }

    const { obtenerDireccionDesdeCoordenadas } = useGeocoding()

    const eventosProcesados = await Promise.all(
      eventos.map(async (evento) => {
        try {
          let direccionGeocoded = evento.direccion || 'Sin dirección'

          if (evento.coordenadas?.lat && evento.coordenadas?.lng) {
            const direccion = await obtenerDireccionDesdeCoordenadas(
              evento.coordenadas.lat,
              evento.coordenadas.lng,
            )

            if (direccion && direccion !== 'Dirección no disponible') {
              direccionGeocoded = direccion
            }
          }

          return {
            ...evento,
            direccion: direccionGeocoded,
          }
        } catch (error) {
          console.error(`Error geocodificando evento:`, error)
          return evento
        }
      }),
    )
    return eventosProcesados
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
    loading.value = true
    error.value = null

    try {
      const todosLosEventos = []

      //  MAPEO DE NOMBRES A IDS
      const unidadesIds = unidadesNombres.map((nombre) => {
        // Intentar obtener el ID del mapeo global
        if (window.unidadesMap && window.unidadesMap[nombre]) {
          return window.unidadesMap[nombre]
        }
        // Si no existe el mapeo, usar el nombre como ID
        return nombre
      })

      for (const unidadId of unidadesIds) {
        let unidadPlaca = 'Sin placa'
        try {
          const unidadRef = doc(db, `Unidades/${unidadId}`)
          const unidadSnap = await getDoc(unidadRef)
          if (unidadSnap.exists()) {
            unidadPlaca = unidadSnap.data().Placa || unidadSnap.data().placa || 'Sin placa'
          }
        } catch (errUnidad) {
          console.warn(`Error al obtener datos de unidad:`, errUnidad.message)
        }
        // Iterar por cada día en el rango
        const fechaActual = new Date(fechaInicio)
        while (fechaActual <= fechaFin) {
          const fechaStr = fechaActual.toISOString().split('T')[0]

          try {
            //  PASO 1: OBTENER DATOS DE RUTA DIARIA PRIMERO (para conductor)
            let conductorNombre = 'Sin conductor'

            try {
              const rutaDiariaRef = doc(db, `Unidades/${unidadId}/RutaDiaria/${fechaStr}`)
              const rutaDiariaSnap = await getDoc(rutaDiariaRef)

              if (rutaDiariaSnap.exists()) {
                const rutaData = rutaDiariaSnap.data()

                //  LIMPIAR "undefined" del nombre si existe
                let nombreLimpio = rutaData.conductor_nombre || 'Sin conductor'
                nombreLimpio = nombreLimpio
                  .replace(/\s*undefined\s*/gi, '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .trim()

                conductorNombre = nombreLimpio || 'Sin conductor'
              } else {
                console.warn(`No existe RutaDiaria para ${fechaStr}`)
              }
            } catch (errRuta) {
              console.warn(`Error al obtener RutaDiaria:`, errRuta.message)
            }

            //  PASO 2: OBTENER EVENTOS DIARIOS
            const eventosRef = collection(
              db,
              `Unidades/${unidadId}/RutaDiaria/${fechaStr}/EventoDiario`,
            )

            const snapshot = await getDocs(eventosRef)

            if (!snapshot.empty) {
              snapshot.forEach((doc) => {
                const data = doc.data()
                if (data.userId && data.userId !== auth.currentUser?.uid) return
                //  CORRECCIÓN 1: Usar DuracionDentro (no Duracion)
                const duracionSegundos = data.DuracionSegundos ?? data.DuracionDentro ?? null

                // Formatear duración como HH:MM:SS si existe
                let duracionFormateada = null
                if (
                  duracionSegundos !== null &&
                  duracionSegundos !== undefined &&
                  duracionSegundos > 0
                ) {
                  const horas = Math.floor(duracionSegundos / 3600)
                  const minutos = Math.floor((duracionSegundos % 3600) / 60)
                  const segundos = duracionSegundos % 60
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
                  //  CORRECCIÓN 2: Usar conductor obtenido de RutaDiaria
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
                  ignicion: data.Ignicion ?? null,
                  kilometraje: data.Kilometraje || null,
                  //  CORRECCIÓN 1: Usar el campo correcto y formateado
                  duracion: duracionFormateada,
                  duracionSegundos: duracionSegundos, // Mantener el valor numérico también
                  mensaje: data.Mensaje || data.mensaje || data.NombreEvento || 'Sin mensaje',
                  detalles: data.Detalles || data.detalles || '',
                  //  Campos adicionales útiles
                  idEvento: data.IdEvento || data.idEvento || '',
                  idRutaDiaria: data.IdRutaDiaria || data.idRutaDiaria || fechaStr,
                  tipoUbicacion: data.tipoUbicacion || 'Geozona',
                  ubicacionId: data.ubicacionId || '',
                  finEvento: data.FinEvento?.toDate() || null,
                  unidadPlaca: unidadPlaca,
                })
              })
            } else {
              console.warn(`${fechaStr}: No hay eventos en Firebase`)
            }
          } catch (err) {
            console.error(`Error al obtener eventos de ${fechaStr}:`, err)
          }

          fechaActual.setDate(fechaActual.getDate() + 1)
        }
      }

      // Filtrar por tipos de evento si se especificaron
      let eventosFiltrados = todosLosEventos
      if (filtroEventos && filtroEventos.length > 0) {
        if (!filtroEventos.includes('Todos los eventos')) {
          eventosFiltrados = todosLosEventos.filter((evento) =>
            filtroEventos.includes(evento.eventoNombre),
          )
        }
      }

      const eventosProcesados = await procesarEventosParaPDF(eventosFiltrados)
      return eventosProcesados
    } catch (err) {
      console.error('Error al obtener eventos:', err)
      error.value = err.message
      return []
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
