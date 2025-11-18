// composables/useReportesHoras.js
import { ref } from 'vue'
import { useReportesTrayectos } from './useReportesTrayectos'

export function useReportesHoras() {
  const loading = ref(false)
  const error = ref(null)

  const { obtenerTrayectos, enriquecerConDatosUnidades } = useReportesTrayectos()

  const calcularHorasTrabajo = async (unidadesIds, fechaInicio, fechaFin, opciones = {}) => {
    loading.value = true
    error.value = null

    try {
      console.log('⏰ Calculando horas de trabajo...')
      console.log('📦 Unidades:', unidadesIds)
      console.log('📅 Desde:', fechaInicio.toLocaleDateString())
      console.log('📅 Hasta:', fechaFin.toLocaleDateString())
      console.log('⚙️ Opciones:', opciones)

      // Obtener trayectos (reales o simulados)
      let trayectos = await obtenerTrayectos(unidadesIds, fechaInicio, fechaFin)
      trayectos = await enriquecerConDatosUnidades(trayectos)

      console.log(`✅ ${trayectos.length} trayectos procesados para calcular horas`)

      if (trayectos.length === 0) {
        console.log('⚠️ No hay trayectos para calcular horas')
        return []
      }

      // Configuración de horario laboral
      const {
        diasLaborables = [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
        horarioInicio = '08:00',
        horarioFin = '17:00'
      } = opciones

      const registros = trayectos.map(trayecto => {
        const duracionHoras = trayecto.duracion 
          ? (trayecto.duracion / (1000 * 60 * 60)).toFixed(2) 
          : trayecto.duracionHoras || 0

        // Calcular si está dentro del horario laboral
        const dentroHorario = calcularDentroHorario(
          trayecto.inicioTimestamp,
          trayecto.finTimestamp,
          horarioInicio,
          horarioFin,
          diasLaborables
        )

        // Calcular horas laborales vs no laborales
        const horasLaborales = dentroHorario.horasLaborales
        const horasNoLaborales = parseFloat(duracionHoras) - horasLaborales

        return {
          fecha: trayecto.fecha,
          idUnidad: trayecto.idUnidad,
          conductorNombre: trayecto.conductorNombre || 'Sin conductor',
          unidadNombre: trayecto.unidadNombre,
          unidadPlaca: trayecto.unidadPlaca || 'N/A',
          horaInicioTrabajo: trayecto.inicioTimestamp 
            ? trayecto.inicioTimestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          horaFinTrabajo: trayecto.finTimestamp
            ? trayecto.finTimestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          duracionTotal: parseFloat(duracionHoras),
          horasLaborales: horasLaborales.toFixed(2),
          horasNoLaborales: horasNoLaborales.toFixed(2),
          kilometraje: trayecto.kilometrajeRecorrido || 0,
          velocidadPromedio: trayecto.velocidadPromedio || 0,
          velocidadMaxima: trayecto.velocidadMaxima || 0,
          paradas: trayecto.paradas || 0,
          combustible: trayecto.combustibleConsumido || 'N/A',
          ubicacionInicio: trayecto.ubicacionInicio || 'N/A',
          ubicacionFin: trayecto.ubicacionFin || 'N/A',
          dentroHorarioLaboral: dentroHorario.esDentroHorario,
          _trayecto: trayecto,
          _simulado: trayecto._simulado || false
        }
      })

      console.log(`✅ ${registros.length} registros de horas calculados`)

      return registros

    } catch (err) {
      console.error('❌ Error al calcular horas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Calcula si un trayecto está dentro del horario laboral
   */
  const calcularDentroHorario = (inicio, fin, horarioInicio, horarioFin, diasLaborables) => {
    if (!inicio || !fin) {
      return { esDentroHorario: false, horasLaborales: 0 }
    }

    // Verificar si es día laboral
    const diaSemana = inicio.getDay()
    const esDiaLaboral = diasLaborables.includes(diaSemana)

    if (!esDiaLaboral) {
      return { esDentroHorario: false, horasLaborales: 0 }
    }

    // Parsear horarios
    const [horaInicioLaboral, minInicioLaboral] = horarioInicio.split(':').map(Number)
    const [horaFinLaboral, minFinLaboral] = horarioFin.split(':').map(Number)

    const inicioLaboral = new Date(inicio)
    inicioLaboral.setHours(horaInicioLaboral, minInicioLaboral, 0, 0)

    const finLaboral = new Date(inicio)
    finLaboral.setHours(horaFinLaboral, minFinLaboral, 0, 0)

    // Calcular solapamiento
    const inicioSolapamiento = new Date(Math.max(inicio, inicioLaboral))
    const finSolapamiento = new Date(Math.min(fin, finLaboral))

    let horasLaborales = 0
    if (inicioSolapamiento < finSolapamiento) {
      horasLaborales = (finSolapamiento - inicioSolapamiento) / (1000 * 60 * 60)
    }

    const duracionTotal = (fin - inicio) / (1000 * 60 * 60)
    const esDentroHorario = horasLaborales > (duracionTotal * 0.5) // Más del 50% dentro

    return {
      esDentroHorario,
      horasLaborales
    }
  }

  return {
    loading,
    error,
    calcularHorasTrabajo
  }
}