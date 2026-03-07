// src/composables/useReportesHorasTrabajo.js

import { ref } from 'vue'
import { useReportesTrayectos } from './useReportesTrayectos'
import { useRutasStorage } from './useRutasStorage'
import { useGeocoding } from './useGeocoding'

// Convierte horas decimales a formato HH:MM:SS
// @param {number} horas - Horas en formato decimal (ej: 1.5 = 1 hora 30 minutos)
//* @returns {string} Formato HH:MM:SS
//*/
function formatearDuracion(horas) {
  if (!horas || horas === 0) return '00:00:00'

  const horasEnteras = Math.floor(horas)
  const minutosDecimales = (horas - horasEnteras) * 60
  const minutosEnteros = Math.floor(minutosDecimales)
  let segundos = Math.round((minutosDecimales - minutosEnteros) * 60)

  //  CORRECCIÓN: Si segundos llega a 60, ajustar
  let minutosFinales = minutosEnteros
  if (segundos >= 60) {
    segundos = 0
    minutosFinales += 1
  }

  //  CORRECCIÓN: Si minutos llega a 60, ajustar
  let horasFinales = horasEnteras
  if (minutosFinales >= 60) {
    minutosFinales = 0
    horasFinales += 1
  }

  return `${String(horasFinales).padStart(2, '0')}:${String(minutosFinales).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}
const { obtenerDireccion } = useGeocoding()

export function useReportesHorasTrabajo() {
  const loading = ref(false)
  const error = ref(null)

  const { obtenerTrayectos, enriquecerConDatosUnidades } = useReportesTrayectos()
  const { obtenerCoordenadasDesdeStorage } = useRutasStorage()

  /**
   *  Detecta viajes basándose en el campo ignicion
   * Un viaje = desde que enciende el motor hasta que lo apaga
   */
  const detectarViajesPorIgnicion = (coordenadas) => {
    if (!coordenadas || coordenadas.length === 0) {
      return []
    }

    const viajes = []
    let viajeActual = []
    let motorEncendido = false

    for (const coord of coordenadas) {
      // Detectar si hay campo ignicion (true/false)
      const ignicion = coord.ignicion !== undefined ? coord.ignicion : null

      if (ignicion === null) {
        // Fallback: si no hay campo ignicion, usar gaps de tiempo
        if (viajeActual.length === 0) {
          viajeActual.push(coord)
          motorEncendido = true
        } else {
          const ultimaCoord = viajeActual[viajeActual.length - 1]
          const tiempoEntrePuntos = new Date(coord.timestamp) - new Date(ultimaCoord.timestamp)

          // Gap > 10 minutos = motor apagado y encendido
          if (tiempoEntrePuntos > 10 * 60 * 1000) {
            // Finalizar viaje anterior
            if (viajeActual.length > 0) {
              viajes.push([...viajeActual])
            }
            // Iniciar nuevo viaje
            viajeActual = [coord]
          } else {
            viajeActual.push(coord)
          }
        }
      } else {
        //  DETECCIÓN CON IGNICIÓN
        if (ignicion && !motorEncendido) {
          // Motor se encendió - iniciar viaje
          motorEncendido = true
          viajeActual = [coord]
        } else if (!ignicion && motorEncendido) {
          // Motor se apagó - finalizar viaje
          motorEncendido = false
          viajeActual.push(coord)
          viajes.push([...viajeActual])
          viajeActual = []
        } else if (motorEncendido) {
          // Motor sigue encendido - continuar viaje
          viajeActual.push(coord)
        }
      }
    }

    // Si quedó un viaje sin cerrar (motor sigue encendido)
    if (viajeActual.length > 0) {
      viajes.push(viajeActual)
    }

    return viajes
  }

  /**
   *  Calcula si un timestamp está dentro del horario comercial
   */
  const estaDentroHorarioComercial = (timestamp, horarioInicio, horarioFin, diasLaborables) => {
    const fecha = new Date(timestamp)
    const diaSemana = fecha.getDay() // 0=Domingo, 1=Lunes, ..., 6=Sábado

    // Verificar si es día laboral
    if (!diasLaborables.includes(diaSemana)) {
      return false
    }

    // Parsear horarios
    const [horaInicio, minInicio] = horarioInicio.split(':').map(Number)
    const [horaFin, minFin] = horarioFin.split(':').map(Number)

    const horaActual = fecha.getHours()
    const minActual = fecha.getMinutes()

    const minutosActuales = horaActual * 60 + minActual
    const minutosInicio = horaInicio * 60 + minInicio
    const minutosFin = horaFin * 60 + minFin

    return minutosActuales >= minutosInicio && minutosActuales <= minutosFin
  }

  /**
   *  Calcula duración dentro y fuera de horario para un viaje
   */
  const calcularDuracionesHorario = (viaje, horarioInicio, horarioFin, diasLaborables) => {
    let duracionDentro = 0
    let duracionFuera = 0

    for (let i = 0; i < viaje.length - 1; i++) {
      const coord = viaje[i]
      const siguienteCoord = viaje[i + 1]

      const tsInicio = new Date(coord.timestamp)
      const tsFin = new Date(siguienteCoord.timestamp)
      const duracionSegmentoMs = tsFin - tsInicio

      const inicioDentro = estaDentroHorarioComercial(
        coord.timestamp,
        horarioInicio,
        horarioFin,
        diasLaborables,
      )
      const finDentro = estaDentroHorarioComercial(
        siguienteCoord.timestamp,
        horarioInicio,
        horarioFin,
        diasLaborables,
      )

      if (inicioDentro === finDentro) {
        // Todo el segmento está del mismo lado
        const duracionHoras = duracionSegmentoMs / 1000 / 60 / 60
        if (inicioDentro) {
          duracionDentro += duracionHoras
        } else {
          duracionFuera += duracionHoras
        }
      } else {
        // El segmento cruza el límite del horario — interpolamos el punto exacto de cruce
        const [horaLimiteH, horaLimiteM] = (inicioDentro ? horarioFin : horarioInicio)
          .split(':')
          .map(Number)

        const fechaBase = new Date(tsInicio)
        fechaBase.setHours(horaLimiteH, horaLimiteM, 0, 0)

        // Si el límite cayó antes del inicio por diferencia de día, ajustar
        let tsCruce = fechaBase.getTime()
        if (tsCruce < tsInicio.getTime()) tsCruce += 24 * 60 * 60 * 1000
        if (tsCruce > tsFin.getTime()) tsCruce = tsFin.getTime()

        const antesHoras = (tsCruce - tsInicio.getTime()) / 1000 / 60 / 60
        const despuesHoras = (tsFin.getTime() - tsCruce) / 1000 / 60 / 60

        if (inicioDentro) {
          duracionDentro += antesHoras
          duracionFuera += despuesHoras
        } else {
          duracionFuera += antesHoras
          duracionDentro += despuesHoras
        }
      }
    }

    return {
      duracionDentro: duracionDentro,
      duracionFuera: duracionFuera,
    }
  }

  /**
   *  Función principal: Calcula horas de trabajo
   */
  const calcularHorasTrabajo = async (unidadesIds, fechaInicio, fechaFin, opciones = {}) => {
    loading.value = true
    error.value = null

    try {
      // Configuración de horario laboral
      const {
        diasLaborables = [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
        horarioInicio = '08:00',
        horarioFin = '17:00',
      } = opciones

      // Obtener trayectos (incluye coordenadas desde Storage)
      let trayectos = await obtenerTrayectos(unidadesIds, fechaInicio, fechaFin)
      trayectos = await enriquecerConDatosUnidades(trayectos)

      if (trayectos.length === 0) {
        return []
      }

      const registrosPorDia = []

      // Procesar cada trayecto (cada trayecto = 1 día de 1 unidad)
      for (const trayecto of trayectos) {
        // Si no hay coordenadas, intentar descargar desde Storage
        let coordenadas = trayecto.coordenadas || []

        if (coordenadas.length === 0 && trayecto._raw?.rutas_url) {
          try {
            coordenadas = await obtenerCoordenadasDesdeStorage(trayecto._raw.rutas_url)
          } catch (err) {
            console.error('Error descargando coordenadas:', err)
          }
        }

        if (coordenadas.length === 0) {
          console.warn(`Sin coordenadas para ${trayecto.unidadNombre} - ${trayecto.fecha}`)
          continue
        }

        //  DETECTAR VIAJES POR IGNICIÓN
        const viajes = detectarViajesPorIgnicion(coordenadas)

        const viajesValidos = viajes.filter((viaje) => {
          if (viaje.length < 2) return false
          const inicio = new Date(viaje[0].timestamp)
          const fin = new Date(viaje[viaje.length - 1].timestamp)
          const duracionMinutos = (fin - inicio) / 1000 / 60
          return duracionMinutos > 0 // Solo viajes con al menos 1 segundo
        })

        const viajesAUsar = viajesValidos

        viajes.forEach((viaje, i) => {
          const inicio = new Date(viaje[0].timestamp)
          const fin = new Date(viaje[viaje.length - 1].timestamp)
          console.log(
            `  Viaje ${i}: ${inicio.toLocaleTimeString()} → ${fin.toLocaleTimeString()} | ignicion en coords: ${viaje[0].ignicion}`,
          )
        })

        if (viajesAUsar.length === 0) {
          console.warn(`No se detectaron viajes`)
          continue
        }

        // Calcular totales del día
        let duracionTotalDia = 0
        let duracionDentroDia = 0
        let duracionFueraDia = 0
        let viajesDentroDia = 0
        let viajesFueraDia = 0

        const detallesViajes = []

        for (const viaje of viajesAUsar) {
          const inicio = viaje[0]
          const fin = viaje[viaje.length - 1]

          const timestampInicio = new Date(inicio.timestamp)
          const timestampFin = new Date(fin.timestamp)
          const duracionViaje = (timestampFin - timestampInicio) / 1000 / 60 / 60 // horas

          // Calcular duración dentro/fuera de horario
          const { duracionDentro, duracionFuera } = calcularDuracionesHorario(
            viaje,
            horarioInicio,
            horarioFin,
            diasLaborables,
          )

          duracionTotalDia += duracionViaje
          duracionDentroDia += duracionDentro
          duracionFueraDia += duracionFuera

          // Clasificar viaje
          if (duracionFuera > 0) {
            viajesFueraDia++
          } else {
            viajesDentroDia++
          }
          const direccionInicio = await obtenerDireccion(inicio)
          const direccionFin = await obtenerDireccion(fin)
          detallesViajes.push({
            horaInicio: timestampInicio.toLocaleString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            horaFin: timestampFin.toLocaleString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            ubicacionInicio: direccionInicio, //  CAMBIO
            ubicacionFin: direccionFin, //  CAMBIO
            duracionDentro: formatearDuracion(duracionDentro), //  CAMBIO
            duracionFuera: formatearDuracion(duracionFuera), //  CAMBIO
            duracionTotal: formatearDuracion(duracionViaje), //  CAMBIO
          })
        }

        //  PRIMER PUNTO Y ÚLTIMO PUNTO DEL DÍA
        const primeraCoordenada = coordenadas[0]
        const ultimaCoordenada = coordenadas[coordenadas.length - 1]
        const ubicacionInicioDia = await obtenerDireccion(primeraCoordenada)
        const ubicacionFinDia = await obtenerDireccion(ultimaCoordenada)
        registrosPorDia.push({
          fecha: trayecto.fecha,
          idUnidad: trayecto.idUnidad,
          conductorNombre: trayecto.conductorNombre || 'Sin conductor',
          unidadNombre: trayecto.unidadNombre,
          Placa: trayecto.Placa || trayecto.placa || trayecto.unidadPlaca || 'Sin placa',
          horaInicioTrabajo: new Date(primeraCoordenada.timestamp).toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          horaFinTrabajo: new Date(ultimaCoordenada.timestamp).toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          ubicacionInicio: ubicacionInicioDia,
          ubicacionFin: ubicacionFinDia,
          duracionTotal: formatearDuracion(duracionTotalDia), //  CAMBIO
          duracionDentroHorario: formatearDuracion(duracionDentroDia), //  CAMBIO
          duracionFueraHorario: formatearDuracion(duracionFueraDia),
          totalViajes: viajesAUsar.length,
          viajesDentroHorario: viajesDentroDia,
          viajesFueraHorario: viajesFueraDia,
          detallesViajes: detallesViajes,
          coordenadas: coordenadas, //  Para el mapa
          _trayecto: trayecto,
          _simulado: trayecto._simulado || false,
        })
      }

      return registrosPorDia
    } catch (err) {
      console.error('Error al calcular horas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    calcularHorasTrabajo,
    detectarViajesPorIgnicion, // Exportar por si se necesita
  }
}
