// composables/useReportesEventos.js
import { ref } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useReportesEventos() {
  const loading = ref(false)
  const error = ref(null)

  const obtenerEventosReales = async (unidadesIds, fechaInicio, fechaFin, eventosNombres = []) => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Obteniendo eventos reales...')
      console.log('📦 Unidades:', unidadesIds)
      console.log('📅 Desde:', fechaInicio.toLocaleDateString())
      console.log('📅 Hasta:', fechaFin.toLocaleDateString())

      const todosLosEventos = []
      const fechas = generarRangoFechas(fechaInicio, fechaFin)

      for (const unidadId of unidadesIds) {
        console.log(`🚗 Procesando unidad: ${unidadId}`)

        for (const fecha of fechas) {
          try {
            const eventosRef = collection(
              db,
              'Unidades',
              unidadId,
              'RutaDiaria',
              fecha,
              'EventoDiario'
            )

            const snapshot = await getDocs(eventosRef)

            snapshot.docs.forEach((doc) => {
              const data = doc.data()

              const eventoFormateado = {
                id: doc.id,
                idUnidad: data.idUnidad || unidadId,
                idEvento: data.IdEvento || data.idEvento,
                eventoNombre: data.NombreEvento || data.nombreEvento || 'Sin nombre',
                tipoEvento: data.TipoEvento || data.tipoEvento || 'N/A',
                timestamp: data.Timestamp?.toDate?.() || new Date(data.Timestamp || Date.now()),
                geozonaNombre: data.GeozonaNombre || data.geozonaNombre || 'N/A',
                tipoUbicacion: data.tipoUbicacion || 'Geozona',
                ubicacionId: data.ubicacionId || data.IdGeozona || null,
                coordenadas: data.Coordenadas || data.coordenadas || null,
                lat: data.Coordenadas?.lat || data.coordenadas?.lat || null,
                lng: data.Coordenadas?.lng || data.coordenadas?.lng || null,
                direccion: data.Direccion || data.direccion || 'N/A',
                conductorId: data.conductor_id || data.conductorId || null,
                conductorNombre: data.conductor_nombre || data.conductorNombre || 'N/A',
                unidadNombre: data.unidadNombre || unidadId,
                unidadPlaca: data.unidadPlaca || 'N/A',
                velocidad: data.velocidad || null,
                odometroInicio: data.odometro_inicio || null,
                odometroFin: data.odometro_fin || null,
                _raw: data
              }

              todosLosEventos.push(eventoFormateado)
            })

            console.log(`  ✅ ${fecha}: ${snapshot.size} eventos`)
          } catch  {
            console.warn(`  ⚠️ No hay datos para ${unidadId}/${fecha}`)
          }
        }
      }

      console.log(`✅ Total de eventos obtenidos: ${todosLosEventos.length}`)

      let eventosFiltrados = todosLosEventos
      if (eventosNombres.length > 0) {
        eventosFiltrados = todosLosEventos.filter(evento => 
          eventosNombres.includes(evento.eventoNombre)
        )
      }

      eventosFiltrados.sort((a, b) => b.timestamp - a.timestamp)

      return eventosFiltrados

    } catch (err) {
      console.error('❌ Error al obtener eventos:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    obtenerEventosReales
  }
}

function generarRangoFechas(fechaInicio, fechaFin) {
  const fechas = []
  const fechaActual = new Date(fechaInicio)

  while (fechaActual <= fechaFin) {
    fechas.push(formatearFecha(fechaActual))
    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  return fechas
}

function formatearFecha(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}