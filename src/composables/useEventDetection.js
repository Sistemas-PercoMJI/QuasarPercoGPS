// src/composables/useEventDetection.js - REFACTORIZADO CON TRACKING CONDICIONAL
import { ref } from 'vue'
import { useNotifications } from './useNotifications'
import { useRutaDiaria } from './useRutaDiaria'
import { useEventoDiario } from './useEventoDiario'

// Estado del sistema de detección
const eventosActivos = ref([])
const poisMapeados = ref(new Map())
const geozonasMapeadas = ref(new Map())
const ubicacionActual = ref(null)
const eventosDisparados = ref(new Set())
const estadoUbicaciones = ref(new Map())

// 🆕 Mapa de ubicaciones que tienen eventos configurados (para trackear)
const ubicacionesTrackeadas = ref(new Map())

// Mapa para rastrear eventos de ENTRADA activos (para calcular duración)
const eventosEnCurso = ref(new Map())
const salidasEnCurso = ref(new Map())

// Integración con notificaciones y Firebase
const { agregarNotificacion } = useNotifications()
const { iniciarOActualizarRutaDiaria, obtenerIdRutaDiaria } = useRutaDiaria()
const { registrarEventoDiario, finalizarEventoDiario, actualizarDuracionEvento } = useEventoDiario()

export function useEventDetection() {
  /**
   * 🆕 Inicializa el sistema con eventos, POIs y geozonas
   * NUEVO: Construye mapa de ubicaciones que tienen eventos (para trackear solo esas)
   */
  function inicializar(eventos, pois, geozonas) {
    console.log('🚀 Inicializando sistema de detección de eventos...')

    eventosActivos.value = eventos.filter((e) => e.activo)

    poisMapeados.value.clear()
    pois.forEach((poi) => {
      poisMapeados.value.set(poi.id, poi)
    })

    geozonasMapeadas.value.clear()
    geozonas.forEach((geozona) => {
      geozonasMapeadas.value.set(geozona.id, geozona)
    })

    // 🔥 NUEVO: Construir mapa de ubicaciones a trackear
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

        if (condicion.activacion === 'Entrada') {
          tracking.tieneEventoEntrada = true
        }
        if (condicion.activacion === 'Salida') {
          tracking.tieneEventoSalida = true
        }

        if (!tracking.eventos.includes(evento.id)) {
          tracking.eventos.push(evento.id)
        }
      })
    })

    eventosDisparados.value.clear()
    estadoUbicaciones.value.clear()
    eventosEnCurso.value.clear()
    salidasEnCurso.value.clear()

    console.log('✅ Sistema de detección inicializado')
    console.log(`  📊 Eventos activos: ${eventosActivos.value.length}`)
    console.log(`  📍 POIs: ${poisMapeados.value.size}`)
    console.log(`  🗺️ Geozonas: ${geozonasMapeadas.value.size}`)
    console.log(`  🎯 Ubicaciones a trackear: ${ubicacionesTrackeadas.value.size}`)
  }

  /**
   * Verifica si está dentro de un POI (círculo)
   */
  function estaDentroDelPOI(lat, lng, poi) {
    if (!poi.coordenadas) {
      console.warn(`⚠️ POI sin coordenadas: ${poi.nombre}`)
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
      console.warn(`⚠️ Geozona sin puntos válidos: ${geozona.nombre}`)
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
   * 🆕 Verifica si está dentro de una ubicación (POI o Geozona)
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
   * 🔥 NUEVO: Gestiona el tracking automático de entrada/salida
   * Solo se ejecuta para ubicaciones que tienen eventos configurados
   */
  async function gestionarTrackingAutomatico(unidad, ubicacion, tipo, estaDentro, tracking) {
    const claveUbicacion = `${unidad.id}-${tipo}-${ubicacion.id}`
    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // ========================================
    // ENTRADA DETECTADA
    // ========================================
    if (estaDentro && estadoAnterior !== 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'dentro')

      const nombreConductor = (() => {
        let nombre = unidad.conductorNombre || unidad.nombre || 'Sin nombre'
        nombre = nombre.replace(/\s*undefined\s*/gi, '').trim()
        nombre = nombre.replace(/\s+/g, ' ').trim()
        return nombre || 'Sin nombre'
      })()

      console.log(`✅ ENTRADA: ${nombreConductor} → ${tipo} ${ubicacion.nombre}`)

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
          },
        })

        // 🔥 PASO 1: Verificar si hay una SALIDA previa de esta ubicación
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

          console.log(`🕐 Calculando duración FUERA: ${formatearDuracion(duracionFueraFinal)}`)

          try {
            // Actualizar el evento de SALIDA con duración fuera
            await actualizarDuracionEvento(
              unidad.id,
              salidaPrevia.idRutaDiaria,
              salidaPrevia.idEvento,
              duracionFueraSegundos,
            )

            console.log(`✅ Duración FUERA actualizada: ${formatearDuracion(duracionFueraFinal)}`)
          } catch (err) {
            console.error('❌ Error actualizando duración fuera:', err)
          }

          // Limpiar salida de memoria
          salidasEnCurso.value.delete(claveSalida)
        }

        // 🔥 PASO 2: Registrar nueva ENTRADA
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

        console.log(`💾 ENTRADA registrada: ${eventoRegistrado.id}`)
      } catch (err) {
        console.error('❌ Error en tracking de entrada:', err)
      }

      if (tracking.tieneEventoEntrada) {
        notificarEventos(unidad, ubicacion, tipo, 'Entrada', tracking.eventos)
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

      console.log(`🚪 SALIDA: ${nombreConductor} ← ${tipo} ${ubicacion.nombre}`)

      const claveEntrada = `${unidad.id}-${ubicacion.id}`
      const eventoEntrada = eventosEnCurso.value.get(claveEntrada)

      if (eventoEntrada) {
        // 🔥 PASO 1: Calcular duración DENTRO
        const duracionDentroMilisegundos = Date.now() - eventoEntrada.timestampEntrada
        const duracionDentroSegundos = Math.floor(duracionDentroMilisegundos / 1000)
        const duracionDentroFinal = Math.max(0, duracionDentroSegundos)

        const formatearDuracion = (segundos) => {
          const horas = Math.floor(segundos / 3600)
          const minutos = Math.floor((segundos % 3600) / 60)
          const segs = segundos % 60
          return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
        }

        console.log(`🕐 Calculando duración DENTRO: ${formatearDuracion(duracionDentroFinal)}`)

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

          console.log(`✅ Duración DENTRO actualizada: ${formatearDuracion(duracionDentroFinal)}`)

          // 🔥 PASO 2: Registrar evento de SALIDA
          await iniciarOActualizarRutaDiaria(unidad.id, {
            conductor_id: unidad.conductorId || '',
            conductor_nombre: nombreConductor,
            velocidad_actual: String(unidad.velocidad || 0),
            nuevaCoordenada: {
              lat: unidad.lat,
              lng: unidad.lng,
              timestamp: new Date().toISOString(),
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

          // 🔥 PASO 3: Guardar SALIDA en memoria para calcular duración FUERA
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

          console.log(
            `💾 SALIDA registrada: ${eventoSalidaRegistrado.id} (duración fuera pendiente)`,
          )
        } catch (err) {
          console.error('❌ Error en tracking de salida:', err)
        }
      } else {
        console.warn(`⚠️ Salida sin entrada previa: ${ubicacion.nombre}`)
      }

      if (tracking.tieneEventoSalida) {
        notificarEventos(unidad, ubicacion, tipo, 'Salida', tracking.eventos)
      }
    }

    // Actualizar estado si cambió pero no cruzó umbra
  }

  /**
   * 🆕 Envía notificaciones para eventos configurados
   */
  function notificarEventos(unidad, ubicacion, tipo, accion, eventosIds) {
    eventosIds.forEach((eventoId) => {
      const evento = eventosActivos.value.find((e) => e.id === eventoId)
      if (!evento) return

      // Verificar que la condición coincida
      const tieneCondicion = evento.condiciones.some(
        (c) => c.ubicacionId === ubicacion.id && c.activacion === accion,
      )

      if (!tieneCondicion) return

      // Evitar duplicados (debounce de 10 segundos)
      const claveEvento = `${evento.id}-${ubicacion.id}-${accion}-${unidad.id}`
      if (eventosDisparados.value.has(claveEvento)) {
        return
      }

      eventosDisparados.value.add(claveEvento)
      setTimeout(() => {
        eventosDisparados.value.delete(claveEvento)
      }, 10000)

      // Crear notificación
      const accionTexto = accion === 'Entrada' ? 'entró a' : 'salió de'
      const tipoNotificacion = accion === 'Entrada' ? 'positive' : 'warning'

      agregarNotificacion({
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
          lat: 32.1234,
          lng: -116.5678,
          nombre: 'PERCO Insurgentes',
          tipo: 'Geozona', // o "POI"
        },
      })

      console.log(`🔔 Notificación enviada: ${evento.nombre} - ${accionTexto} ${ubicacion.nombre}`)
    })
  }

  /**
   * 🆕 Evalúa eventos para todas las unidades activas
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
        console.warn(`⚠️ Unidad sin coordenadas válidas:`, unidad)
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

      // 🔥 NUEVO: Solo revisar ubicaciones que tienen eventos configurados
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
    console.log('🔄 Sistema de detección reseteado')
  }

  return {
    inicializar,
    evaluarEventosParaUnidadesSimulacion,
    resetear,
    eventosActivos,
    ubicacionActual,
    eventosEnCurso,
    ubicacionesTrackeadas, // 🆕 Exponer para debugging
  }
}
