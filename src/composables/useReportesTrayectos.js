// composables/useReportesTrayectos.js
import { ref } from 'vue'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useReportesTrayectos() {
  const loading = ref(false)
  const error = ref(null)

  const obtenerTrayectos = async (unidadesIds, fechaInicio, fechaFin) => {
    loading.value = true
    error.value = null

    try {
      console.log('🗺️ Obteniendo trayectos...')

      const todosTrayectos = []
      const fechas = generarRangoFechas(fechaInicio, fechaFin)

      for (const unidadId of unidadesIds) {
        for (const fecha of fechas) {
          try {
            const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
            const rutaSnap = await getDoc(rutaRef)

            if (!rutaSnap.exists()) {
              continue
            }

            const data = rutaSnap.data()

            const trayecto = {
              id: fecha,
              idUnidad: unidadId,
              fecha: fecha,
              conductorId: data.conductor_id || null,
              conductorNombre: data.conductor_nombre || 'N/A',
              unidadNombre: unidadId,
              unidadPlaca: 'N/A',
              inicioTimestamp: data.fecha_hora_inicio?.toDate?.() || null,
              finTimestamp: data.fecha_hora_fin?.toDate?.() || null,
              duracion: data.duracion_total_minutos * 60000 || 0,
              kilometrajeRecorrido: data.distancia_recorrida_km || 0,
              velocidadPromedio: data.velocidad_promedio || 0,
              velocidadMaxima: data.velocidad_maxima || 0,
              _raw: data
            }

            todosTrayectos.push(trayecto)
          } catch {
            console.warn(`⚠️ Error en ${unidadId}/${fecha}`)
          }
        }
      }

      return todosTrayectos

    } catch (err) {
      console.error('❌ Error al obtener trayectos:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const enriquecerConDatosUnidades = async (trayectos) => {
    try {
      const unidadesRef = collection(db, 'Unidades')
      const unidadesSnapshot = await getDocs(unidadesRef)
      
      const unidadesMap = {}
      unidadesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        unidadesMap[doc.id] = {
          nombre: data.Unidad || doc.id,
          placa: data.SeguroUnidad || 'N/A'
        }
      })

      return trayectos.map(trayecto => ({
        ...trayecto,
        unidadNombre: unidadesMap[trayecto.idUnidad]?.nombre || trayecto.idUnidad,
        unidadPlaca: unidadesMap[trayecto.idUnidad]?.placa || 'N/A'
      }))
    } catch (err) {
      console.error('Error al enriquecer unidades:', err)
      return trayectos
    }
  }

  return {
    loading,
    error,
    obtenerTrayectos,
    enriquecerConDatosUnidades
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