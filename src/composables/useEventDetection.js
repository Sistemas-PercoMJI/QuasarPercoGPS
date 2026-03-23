// src/composables/useEventDetection.js - REFACTORIZADO CON TRACKING CONDICIONAL
import { ref } from 'vue'
import { useNotifications } from './useNotifications'
import { useRutaDiaria } from './useRutaDiaria'
import { useEventoDiario } from './useEventoDiario'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

// Estado del sistema de detección
const eventosActivos = ref([])
const poisMapeados = ref(new Map())
const geozonasMapeadas = ref(new Map())
const ubicacionActual = ref(null)
const eventosDisparados = ref(new Set())
const estadoUbicaciones = ref(new Map())
const notificacionesDisparadas = ref(new Map())

//  Mapa de ubicaciones que tienen eventos configurados (para trackear)
const ubicacionesTrackeadas = ref(new Map())

// Mapa para rastrear eventos de ENTRADA activos (para calcular duración)
const eventosEnCurso = ref(new Map())
const salidasEnCurso = ref(new Map())

//  NUEVO: Throttle para tracking (evita llamadas duplicadas rápidas)
const ultimoTrackingPorUnidad = ref(new Map())
const TRACKING_THROTTLE_MS = 2000 // 2 segundos
let estadoReconstruido = false
let reconstruyendo = false

// Integración con notificaciones y Firebase
const { agregarNotificacion } = useNotifications()
const { iniciarOActualizarRutaDiaria, obtenerIdRutaDiaria } = useRutaDiaria()
const { registrarEventoDiario, finalizarEventoDiario, actualizarDuracionEvento } = useEventoDiario()

export function useEventDetection() {
  /**
   *  Inicializa el sistema con eventos, POIs y geozonas
   * NUEVO: Construye mapa de ubicaciones que tienen eventos (para trackear solo esas)
   */
  function inicializar(eventos, pois, geozonas) {
    console.trace('⚠️ inicializar() llamado - estadoUbicaciones será limpiado')
    eventosActivos.value = eventos.filter((e) => e.activo)

    poisMapeados.value.clear()
    pois.forEach((poi) => poisMapeados.value.set(poi.id, poi))

    geozonasMapeadas.value.clear()
    geozonas.forEach((geozona) => geozonasMapeadas.value.set(geozona.id, geozona))

    ubicacionesTrackeadas.value.clear()
    eventosActivos.value.forEach((evento) => {
      if (!evento.condiciones) return
      evento.condiciones.forEach((condicion) => {
        const key = `${condicion.tipo}-${condicion.ubicacionId}`
        if (!ubicacionesTrackeadas.value.has(key)) {
          ubicacionesTrackeadas.value.set(key, {
            tipo: condicion.tipo,
            ubicacionId: condicion.ubicacionId,
            tieneEventoEntrada: false,
            tieneEventoSalida: false,
            eventos: [],
          })
        }
        const tracking = ubicacionesTrackeadas.value.get(key)
        if (condicion.activacion === 'Entrada') tracking.tieneEventoEntrada = true
        if (condicion.activacion === 'Salida') tracking.tieneEventoSalida = true
        if (!tracking.eventos.includes(evento.id)) tracking.eventos.push(evento.id)
      })
    })

    eventosDisparados.value.clear()
    // ← SOLO limpiar estadoUbicaciones si NO hay estado reconstruido
    if (!estadoReconstruido) {
      estadoUbicaciones.value.clear()
      eventosEnCurso.value.clear()
      salidasEnCurso.value.clear()
    }
  }

  /**
   * Verifica si está dentro de un POI (círculo)
   */
  function estaDentroDelPOI(lat, lng, poi) {
    if (!poi.coordenadas) {
      console.warn(` POI sin coordenadas: ${poi.nombre}`)
      return false
    }

    const { lat: poiLat, lng: poiLng } = poi.coordenadas
    const radio = poi.radio || 100

    const distancia = calcularDistancia(lat, lng, poiLat, poiLng)
    return distancia <= radio
  }

  /**
   * Verifica si está dentro de una geozona (con margen de tolerancia)
   */
  function estaDentroDeGeozona(lat, lng, geozona) {
    if (!geozona.puntos || !Array.isArray(geozona.puntos) || geozona.puntos.length === 0) {
      console.warn(` Geozona sin puntos válidos: ${geozona.nombre}`)
      return false
    }

    const dentro = puntoEnPoligono({ lat, lng }, geozona.puntos)

    if (dentro) {
      return true
    }

    // Verificar proximidad al borde (margen de tolerancia)
    const MARGEN_METROS = 15
    const estaCercaDelBorde = geozona.puntos.some((punto) => {
      const distancia = calcularDistancia(lat, lng, punto.lat, punto.lng)
      return distancia <= MARGEN_METROS
    })

    return estaCercaDelBorde
  }

  /**
   * Calcula distancia entre dos puntos (en metros)
   */
  function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Verifica si un punto está dentro de un polígono (Ray Casting)
   */
  function puntoEnPoligono(punto, poligono) {
    let dentroPoligono = false
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const xi = poligono[i].lat
      const yi = poligono[i].lng
      const xj = poligono[j].lat
      const yj = poligono[j].lng

      const intersect =
        yi > punto.lng !== yj > punto.lng &&
        punto.lat < ((xj - xi) * (punto.lng - yi)) / (yj - yi) + xi
      if (intersect) dentroPoligono = !dentroPoligono
    }
    return dentroPoligono
  }

  /**
   *  Verifica si está dentro de una ubicación (POI o Geozona)
   */
  function verificarSiEstaDentro(unidad, ubicacion, tipo) {
    if (tipo === 'POI') {
      return estaDentroDelPOI(unidad.lat, unidad.lng, ubicacion)
    } else if (tipo === 'Geozona') {
      return estaDentroDeGeozona(unidad.lat, unidad.lng, ubicacion)
    }
    return false
  }

  /**
   *  NUEVO: Gestiona el tracking automático de entrada/salida
   * Solo se ejecuta para ubicaciones que tienen eventos configurados
   */
  async function gestionarTrackingAutomatico(unidad, ubicacion, tipo, estaDentro, tracking) {
    if (reconstruyendo) return
    const claveUbicacion = `${unidad.id}-${tipo}-${ubicacion.id}`
    const estadoActual = estadoUbicaciones.value.get(claveUbicacion)

    // Solo loguear cuando está dentro, para no llenar la consola
    if (estadoActual === 'dentro') {
      console.log(
        `🔄 Evaluando ${unidad.id}-${ubicacion.nombre} | estaDentro:${estaDentro} | estado:${estadoActual}`,
      )
    }
    //  THROTTLE: Evitar procesamiento duplicado rápido
    const ahora = Date.now()
    const ultimaEjecucion = ultimoTrackingPorUnidad.value.get(claveUbicacion) || 0

    if (ahora - ultimaEjecucion < TRACKING_THROTTLE_MS) {
      return
    }

    ultimoTrackingPorUnidad.value.set(claveUbicacion, ahora)

    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // ========================================
    // ENTRADA DETECTADA
    // ========================================
    if (estaDentro && estadoAnterior !== 'dentro') {
      console.warn(
        `⚠️ ENTRADA DISPARADA - unidad:${unidad.id} ubicacion:${ubicacion.nombre} estadoAnterior=${estadoAnterior} timestamp:${new Date().toISOString()}`,
      )

      estadoUbicaciones.value.set(claveUbicacion, 'dentro')

      const nombreConductor = (() => {
        let nombre = unidad.conductorNombre || unidad.nombre || 'Sin nombre'
        nombre = nombre.replace(/\s*undefined\s*/gi, '').trim()
        nombre = nombre.replace(/\s+/g, ' ').trim()
        return nombre || 'Sin nombre'
      })()

      try {
        const idRutaDiaria = obtenerIdRutaDiaria()

        await iniciarOActualizarRutaDiaria(unidad.id, {
          conductor_id: unidad.conductorId || '',
          conductor_nombre: nombreConductor,
          velocidad_actual: String(unidad.velocidad || 0),
          nuevaCoordenada: {
            lat: unidad.lat,
            lng: unidad.lng,
            timestamp: new Date().toISOString(),
            ignicion: unidad.ignicion ?? false,
            velocidad: unidad.velocidad || 0,
          },
        })

        //  PASO 1: Verificar si hay una SALIDA previa de esta ubicación
        const claveSalida = `${unidad.id}-${ubicacion.id}`
        const salidaPrevia = salidasEnCurso.value.get(claveSalida)

        if (salidaPrevia) {
          // Calcular duración FUERA
          const duracionFueraMilisegundos = Date.now() - salidaPrevia.timestampSalida
          const duracionFueraSegundos = Math.floor(duracionFueraMilisegundos / 1000)
          const duracionFueraFinal = Math.max(0, duracionFueraSegundos)

          const formatearDuracion = (segundos) => {
            const horas = Math.floor(segundos / 3600)
            const minutos = Math.floor((segundos % 3600) / 60)
            const segs = segundos % 60
            return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
          }

          try {
            // Actualizar el evento de SALIDA con duración fuera
            await actualizarDuracionEvento(
              unidad.id,
              salidaPrevia.idRutaDiaria,
              salidaPrevia.idEvento,
              duracionFueraSegundos,
            )

            console.log(` Duración FUERA actualizada: ${formatearDuracion(duracionFueraFinal)}`)
          } catch (err) {
            console.error(' Error actualizando duración fuera:', err)
          }

          // Limpiar salida de memoria
          salidasEnCurso.value.delete(claveSalida)
        }

        //  PASO 2: Registrar nueva ENTRADA
        const primerEventoId = tracking.eventos[0] || ''
        const eventosIdsString = tracking.eventos.join(',') || ''

        let nombreEvento = `Entrada a ${ubicacion.nombre}`
        if (primerEventoId) {
          const eventoConfig = eventosActivos.value.find((e) => e.id === primerEventoId)
          if (eventoConfig) {
            nombreEvento = eventoConfig.nombre
          }
        }

        const eventoData = {
          IdEvento: primerEventoId,
          NombreEvento: nombreEvento,
          TipoEvento: 'Entrada',
          lat: unidad.lat,
          lng: unidad.lng,
          Direccion: `${unidad.lat}, ${unidad.lng}`,
          tipoUbicacion: tipo,
          ubicacionId: ubicacion.id,
          eventosRelacionados: eventosIdsString,
          Ignicion: unidad.ignicion ?? false,
          Velocidad: unidad.velocidad || 0,
          Kilometraje: unidad.odometro_km || null,
        }

        if (tipo === 'POI') {
          eventoData.PoiNombre = ubicacion.nombre
        } else if (tipo === 'Geozona') {
          eventoData.GeozonaNombre = ubicacion.nombre
        }

        const eventoRegistrado = await registrarEventoDiario(unidad.id, idRutaDiaria, eventoData)

        // Guardar en memoria para calcular duración DENTRO después
        const claveEntrada = `${unidad.id}-${ubicacion.id}`
        eventosEnCurso.value.set(claveEntrada, {
          idEvento: eventoRegistrado.id,
          idRutaDiaria: idRutaDiaria,
          timestampEntrada: Date.now(),
          ubicacionNombre: ubicacion.nombre,
          ubicacionId: ubicacion.id,
        })
      } catch (err) {
        console.error(' Error en tracking de entrada:', err)
      }

      if (tracking.tieneEventoEntrada) {
        await notificarEventos(unidad, ubicacion, tipo, 'Entrada', tracking.eventos)
      }
    }

    // ========================================
    // SALIDA DETECTADA
    // ========================================
    else if (!estaDentro && estadoAnterior === 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'fuera')

      const nombreConductor = (() => {
        let nombre = unidad.conductorNombre || unidad.nombre || 'Sin nombre'
        nombre = nombre.replace(/\s*undefined\s*/gi, '').trim()
        nombre = nombre.replace(/\s+/g, ' ').trim()
        return nombre || 'Sin nombre'
      })()

      const claveEntrada = `${unidad.id}-${ubicacion.id}`
      const eventoEntrada = eventosEnCurso.value.get(claveEntrada)

      if (eventoEntrada) {
        //  PASO 1: Calcular duración DENTRO
        const duracionDentroMilisegundos = Date.now() - eventoEntrada.timestampEntrada
        const duracionDentroSegundos = Math.floor(duracionDentroMilisegundos / 1000)
        const duracionDentroFinal = Math.max(0, duracionDentroSegundos)

        const formatearDuracion = (segundos) => {
          const horas = Math.floor(segundos / 3600)
          const minutos = Math.floor((segundos % 3600) / 60)
          const segs = segundos % 60
          return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
        }

        try {
          const idRutaDiaria = eventoEntrada.idRutaDiaria

          // Actualizar evento de ENTRADA con duración dentro
          await finalizarEventoDiario(unidad.id, idRutaDiaria, eventoEntrada.idEvento, {
            lat: unidad.lat,
            lng: unidad.lng,
          })

          await actualizarDuracionEvento(
            unidad.id,
            idRutaDiaria,
            eventoEntrada.idEvento,
            duracionDentroFinal,
          )

          console.log(` Duración DENTRO actualizada: ${formatearDuracion(duracionDentroFinal)}`)

          //  PASO 2: Registrar evento de SALIDA
          await iniciarOActualizarRutaDiaria(unidad.id, {
            conductor_id: unidad.conductorId || '',
            conductor_nombre: nombreConductor,
            velocidad_actual: String(unidad.velocidad || 0),
            nuevaCoordenada: {
              lat: unidad.lat,
              lng: unidad.lng,
              timestamp: new Date().toISOString(),
              ignicion: unidad.ignicion ?? false,
              velocidad: unidad.velocidad || 0,
            },
          })

          const primerEventoId = tracking.eventos[0] || ''
          const eventosIdsString = tracking.eventos.join(',') || ''

          let nombreEvento = `Salida de ${ubicacion.nombre}`
          if (primerEventoId) {
            const eventoConfig = eventosActivos.value.find((e) => e.id === primerEventoId)
            if (eventoConfig) {
              nombreEvento = eventoConfig.nombre
            }
          }

          const eventoSalidaData = {
            IdEvento: primerEventoId,
            NombreEvento: nombreEvento,
            TipoEvento: 'Salida',
            lat: unidad.lat,
            lng: unidad.lng,
            Direccion: `${unidad.lat}, ${unidad.lng}`,
            tipoUbicacion: tipo,
            ubicacionId: ubicacion.id,
            eventosRelacionados: eventosIdsString,
            EventoEntradaId: eventoEntrada.idEvento,
            Ignicion: unidad.ignicion ?? false,
            Velocidad: unidad.velocidad || 0,
            Kilometraje: unidad.odometro_km || null,
          }

          if (tipo === 'POI') {
            eventoSalidaData.PoiNombre = ubicacion.nombre
          } else if (tipo === 'Geozona') {
            eventoSalidaData.GeozonaNombre = ubicacion.nombre
          }

          const eventoSalidaRegistrado = await registrarEventoDiario(
            unidad.id,
            idRutaDiaria,
            eventoSalidaData,
          )

          //  PASO 3: Guardar SALIDA en memoria para calcular duración FUERA
          const claveSalida = `${unidad.id}-${ubicacion.id}`
          salidasEnCurso.value.set(claveSalida, {
            idEvento: eventoSalidaRegistrado.id,
            idRutaDiaria: idRutaDiaria,
            timestampSalida: Date.now(),
            ubicacionNombre: ubicacion.nombre,
            ubicacionId: ubicacion.id,
          })

          // Limpiar entrada de memoria
          eventosEnCurso.value.delete(claveEntrada)
        } catch (err) {
          console.error(' Error en tracking de salida:', err)
        }
      } else {
        console.warn(` Salida sin entrada previa: ${ubicacion.nombre}`)
      }

      if (tracking.tieneEventoSalida) {
        await notificarEventos(unidad, ubicacion, tipo, 'Salida', tracking.eventos)
      }
    }

    // Actualizar estado si cambió pero no cruzó umbral
  }

  /**
   *  Envía notificaciones para eventos configurados
   *  ACTUALIZADO: async + coordenadas reales de la ubicación
   */
  async function notificarEventos(unidad, ubicacion, tipo, accion, eventosIds) {
    const eventosUnicos = [...new Set(eventosIds)]
    const hoy = new Date().toISOString().split('T')[0] // "2026-02-27"

    for (const eventoId of eventosUnicos) {
      const evento = eventosActivos.value.find((e) => e.id === eventoId)
      if (!evento) continue

      // Verificar que la condicion coincida con la accion
      const tieneCondicion = evento.condiciones.some(
        (c) => c.ubicacionId === ubicacion.id && c.activacion === accion,
      )
      if (!tieneCondicion) continue

      // Clave unica para este evento + ubicacion + accion + unidad + dia
      const claveBase = `${evento.id}-${ubicacion.id}-${accion}-${unidad.id}`
      const claveHoy = `${claveBase}-${hoy}`

      const frecuencia = evento.activacionAlerta || 'Cada vez'

      // ==========================================
      // CONTROL DE FRECUENCIA
      // ==========================================

      if (frecuencia === 'Al inicio' || frecuencia === 'Una vez al día') {
        // Solo una vez al dia: si ya se disparo hoy, ignorar
        if (notificacionesDisparadas.value.has(claveHoy)) {
          continue
        }
        notificacionesDisparadas.value.set(claveHoy, { timestamp: Date.now() })
      } else if (frecuencia === 'Cada vez') {
        // Una notificacion por entrada/salida individual
        // Se puede volver a disparar solo si la unidad SALIO y VOLVIO a entrar
        // Esto lo controla estadoUbicaciones: si el estado cambio, es un nuevo evento
        // Solo bloqueamos si ya se notifico en los ultimos 30 segundos (evitar duplicados rapidos)
        const registroExistente = notificacionesDisparadas.value.get(claveBase)
        const ahora = Date.now()

        if (registroExistente && ahora - registroExistente.timestamp < 30000) {
          continue
        }
        notificacionesDisparadas.value.set(claveBase, { timestamp: ahora })
      } else if (frecuencia === 'horario') {
        // Verificar si estamos dentro del horario configurado
        if (!verificarHorario(evento)) {
          continue
        }
        // Dentro del horario, aplicar logica de "cada vez"
        const registroExistente = notificacionesDisparadas.value.get(claveBase)
        const ahora = Date.now()

        if (registroExistente && ahora - registroExistente.timestamp < 30000) {
          continue
        }
        notificacionesDisparadas.value.set(claveBase, { timestamp: ahora })
      }

      // ==========================================
      // DISPARAR NOTIFICACION
      // ==========================================
      const accionTexto = accion === 'Entrada' ? 'entró a' : 'salió de'
      const tipoNotificacion = accion === 'Entrada' ? 'positive' : 'warning'

      let latUbicacion, lngUbicacion

      if (tipo === 'POI' && ubicacion.coordenadas) {
        latUbicacion = ubicacion.coordenadas.lat
        lngUbicacion = ubicacion.coordenadas.lng
      } else if (tipo === 'Geozona' && ubicacion.puntos && ubicacion.puntos.length > 0) {
        const sumLat = ubicacion.puntos.reduce((sum, p) => sum + p.lat, 0)
        const sumLng = ubicacion.puntos.reduce((sum, p) => sum + p.lng, 0)
        latUbicacion = sumLat / ubicacion.puntos.length
        lngUbicacion = sumLng / ubicacion.puntos.length
      } else {
        latUbicacion = unidad.lat
        lngUbicacion = unidad.lng
      }

      await agregarNotificacion({
        type: tipoNotificacion,
        title: evento.nombre,
        message: `${unidad.conductorNombre || unidad.nombre} ${accionTexto} ${tipo}: ${ubicacion.nombre}`,
        eventoId: evento.id,
        eventoNombre: evento.nombre,
        ubicacionNombre: ubicacion.nombre,
        tipoUbicacion: tipo,
        accion: accion,
        sujeto: 'unidad',
        unidadId: unidad.id,
        unidadNombre: unidad.unidadNombre || unidad.nombre || 'Sin nombre',
        conductorNombre: unidad.conductorNombre || 'Sin nombre',
        ubicacion: {
          lat: latUbicacion,
          lng: lngUbicacion,
          nombre: ubicacion.nombre,
          tipo: tipo,
        },
      })
    }
  }

  function verificarHorario(evento) {
    if (evento.aplicacion !== 'horario') return true

    const ahora = new Date()
    const diaSemana = ahora.getDay() // 0=domingo, 1=lunes...

    // Verificar dia de la semana
    if (evento.diasSemana && evento.diasSemana.length > 0) {
      if (!evento.diasSemana.includes(diaSemana)) {
        return false
      }
    }

    // Verificar rango de horas
    if (evento.horaInicio && evento.horaFin) {
      const [horaIni, minIni] = evento.horaInicio.split(':').map(Number)
      const [horaFin, minFin] = evento.horaFin.split(':').map(Number)

      const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
      const minutosInicio = horaIni * 60 + minIni
      const minutosFin = horaFin * 60 + minFin

      if (minutosAhora < minutosInicio || minutosAhora > minutosFin) {
        return false
      }
    }

    return true
  }

  /**
   *  Evalúa eventos para todas las unidades activas
   * NUEVO: Solo revisa ubicaciones que tienen eventos configurados
   */
  function evaluarEventosParaUnidadesSimulacion(unidades) {
    if (!unidades || unidades.length === 0) {
      return
    }

    unidades.forEach((unidad) => {
      const lat = unidad.ubicacion?.lat || unidad.lat
      const lng = unidad.ubicacion?.lng || unidad.lng

      if (!lat || !lng) {
        console.warn(` Unidad sin coordenadas válidas:`, unidad)
        return
      }

      // Normalizar unidad
      const unidadNormalizada = {
        ...unidad,
        lat,
        lng,
        nombre: unidad.conductorNombre || unidad.unidadNombre || unidad.nombre || unidad.id,
        conductorNombre: unidad.conductorNombre || unidad.nombre || 'Sin nombre',
      }

      //  NUEVO: Solo revisar ubicaciones que tienen eventos configurados
      ubicacionesTrackeadas.value.forEach((tracking) => {
        const { tipo, ubicacionId } = tracking

        // Obtener la ubicación (POI o Geozona)
        let ubicacion
        if (tipo === 'POI') {
          ubicacion = poisMapeados.value.get(ubicacionId)
        } else if (tipo === 'Geozona') {
          ubicacion = geozonasMapeadas.value.get(ubicacionId)
        }

        if (!ubicacion) return

        // Verificar si está dentro
        const estaDentro = verificarSiEstaDentro(unidadNormalizada, ubicacion, tipo)

        // Gestionar tracking automático
        gestionarTrackingAutomatico(unidadNormalizada, ubicacion, tipo, estaDentro, tracking)
      })
    })
  }

  async function reconstruirEstadoDesdeFirebase(unidadesIds) {
    reconstruyendo = true
    if (!unidadesIds || unidadesIds.length === 0) {
      reconstruyendo = false
      return
    }
    const hoy = new Date().toISOString().split('T')[0]

    for (const unidadId of unidadesIds) {
      try {
        const eventosRef = collection(db, 'Unidades', unidadId, 'RutaDiaria', hoy, 'EventoDiario')

        // Obtener todos los eventos de hoy ordenados por timestamp
        const q = query(eventosRef, orderBy('Timestamp', 'desc'), limit(100))
        const snapshot = await getDocs(q)

        if (snapshot.empty) continue

        const eventos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        // Para cada ubicación, buscar si hay una entrada sin FinEvento
        // (agrupamos por ubicacionId para encontrar el último evento de cada una)
        const ultimoPorUbicacion = {}

        // Iterar en orden cronológico (de más viejo a más nuevo)
        eventos.reverse().forEach((evento) => {
          const ubicacionId = evento.ubicacionId
          if (!ubicacionId) return
          ultimoPorUbicacion[ubicacionId] = evento
        })

        // Reconstruir estado
        Object.entries(ultimoPorUbicacion).forEach(([ubicacionId, ultimoEvento]) => {
          const tipoUbicacion = ultimoEvento.tipoUbicacion || 'Geozona'
          const claveUbicacion = `${unidadId}-${tipoUbicacion}-${ubicacionId}`

          if (ultimoEvento.TipoEvento === 'Entrada' && ultimoEvento.FinEvento === null) {
            // Unidad sigue dentro
            estadoUbicaciones.value.set(claveUbicacion, 'dentro')

            // También reconstruir eventosEnCurso para que la salida funcione bien
            const claveEntrada = `${unidadId}-${ubicacionId}`
            eventosEnCurso.value.set(claveEntrada, {
              idEvento: ultimoEvento.id,
              idRutaDiaria: hoy,
              timestampEntrada: ultimoEvento.Timestamp?.toDate?.()?.getTime() || Date.now(),
              ubicacionNombre: ultimoEvento.GeozonaNombre || ultimoEvento.PoiNombre || '',
              ubicacionId: ubicacionId,
            })

            console.log(`↩️ Estado reconstruido: ${unidadId} DENTRO de ${ubicacionId}`)
          } else if (ultimoEvento.TipoEvento === 'Salida') {
            // Unidad está fuera
            estadoUbicaciones.value.set(claveUbicacion, 'fuera')
          }
        })
      } catch (err) {
        console.warn(`Error reconstruyendo estado para unidad ${unidadId}:`, err)
      }
    }
    reconstruyendo = false // ← agregar al final
  }

  /**
   * Resetea el sistema de detección
   */
  function resetear() {
    eventosActivos.value = []
    poisMapeados.value.clear()
    geozonasMapeadas.value.clear()
    ubicacionActual.value = null
    eventosDisparados.value.clear()
    estadoUbicaciones.value.clear()
    eventosEnCurso.value.clear()
    ubicacionesTrackeadas.value.clear()
    ultimoTrackingPorUnidad.value.clear()
    notificacionesDisparadas.value.clear()
  }

  function recargarConfiguracion(eventos, pois, geozonas) {
    eventosActivos.value = eventos.filter((e) => e.activo)

    poisMapeados.value.clear()
    pois.forEach((poi) => poisMapeados.value.set(poi.id, poi))

    geozonasMapeadas.value.clear()
    geozonas.forEach((geozona) => geozonasMapeadas.value.set(geozona.id, geozona))

    ubicacionesTrackeadas.value.clear()
    eventosActivos.value.forEach((evento) => {
      if (!evento.condiciones) return
      evento.condiciones.forEach((condicion) => {
        const key = `${condicion.tipo}-${condicion.ubicacionId}`
        if (!ubicacionesTrackeadas.value.has(key)) {
          ubicacionesTrackeadas.value.set(key, {
            tipo: condicion.tipo,
            ubicacionId: condicion.ubicacionId,
            tieneEventoEntrada: false,
            tieneEventoSalida: false,
            eventos: [],
          })
        }
        const tracking = ubicacionesTrackeadas.value.get(key)
        if (condicion.activacion === 'Entrada') tracking.tieneEventoEntrada = true
        if (condicion.activacion === 'Salida') tracking.tieneEventoSalida = true
        if (!tracking.eventos.includes(evento.id)) tracking.eventos.push(evento.id)
      })
    })
    // NO toca: estadoUbicaciones, eventosEnCurso, salidasEnCurso, notificacionesDisparadas
  }

  return {
    inicializar,
    recargarConfiguracion,
    evaluarEventosParaUnidadesSimulacion,
    resetear,
    eventosActivos,
    ubicacionActual,
    eventosEnCurso,
    ubicacionesTrackeadas,
    reconstruirEstadoDesdeFirebase,
    resetearEstadoReconstruido: () => {
      estadoReconstruido = false
    },
    yaReconstruido: () => {
      if (estadoReconstruido) return true
      estadoReconstruido = true
      return false
    },
  }
}
