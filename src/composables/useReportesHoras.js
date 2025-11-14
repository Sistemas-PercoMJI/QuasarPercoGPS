// composables/useReportesHoras.js
import { ref } from 'vue'
import { useReportesTrayectos } from './useReportesTrayectos'

export function useReportesHoras() {
  const loading = ref(false)
  const error = ref(null)

  const { obtenerTrayectos, enriquecerConDatosUnidades } = useReportesTrayectos()

  const calcularHorasTrabajo = async (unidadesIds, fechaInicio, fechaFin = {}) => {
    loading.value = true
    error.value = null

    try {
      console.log('⏰ Calculando horas de trabajo...')

      let trayectos = await obtenerTrayectos(unidadesIds, fechaInicio, fechaFin)
      trayectos = await enriquecerConDatosUnidades(trayectos)

      const registros = trayectos.map(trayecto => {
        const duracionHoras = trayecto.duracion ? (trayecto.duracion / (1000 * 60 * 60)).toFixed(2) : 0

        return {
          fecha: trayecto.fecha,
          idUnidad: trayecto.idUnidad,
          conductorNombre: trayecto.conductorNombre,
          unidadNombre: trayecto.unidadNombre,
          unidadPlaca: trayecto.unidadPlaca,
          horaInicioTrabajo: trayecto.inicioTimestamp 
            ? trayecto.inicioTimestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          horaFinTrabajo: trayecto.finTimestamp
            ? trayecto.finTimestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          duracionTotal: parseFloat(duracionHoras),
          kilometraje: trayecto.kilometrajeRecorrido,
          velocidadPromedio: trayecto.velocidadPromedio,
          _trayecto: trayecto
        }
      })

      return registros

    } catch (err) {
      console.error('❌ Error al calcular horas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    calcularHorasTrabajo
  }
}