// src/composables/useEventDetection.js - CON INTEGRACIÓN FIREBASE
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

// 🆕 Mapa para rastrear eventos de ENTRADA activos (para calcular duración)
const eventosEnCurso = ref(new Map())

// 🔧 Integración con notificaciones y Firebase
const { agregarNotificacion } = useNotifications()
const { iniciarOActualizarRutaDiaria, obtenerIdRutaDiaria } = useRutaDiaria()
const { registrarEventoDiario, finalizarEventoDiario, actualizarDuracionEvento } = useEventoDiario()

export function useEventDetection() {
  /**
   * Inicializa el sistema con eventos, POIs y geozonas
   */
  function inicializar(eventos, pois, geozonas) {
    console.log('🚀 Inicializando sistema de detección de eventos...')
    
    eventosActivos.value = eventos.filter(e => e.activo)
    
    poisMapeados.value.clear()
    pois.forEach(poi => {
      poisMapeados.value.set(poi.id, poi)
    })
    
    geozonasMapeadas.value.clear()
    geozonas.forEach(geozona => {
      geozonasMapeadas.value.set(geozona.id, geozona)
    })
    
    eventosDisparados.value.clear()
    estadoUbicaciones.value.clear()
    eventosEnCurso.value.clear() // 🆕 Limpiar eventos en curso
    
    console.log('✅ Sistema de detección inicializado')
    console.log(`  📊 Eventos activos: ${eventosActivos.value.length}`)
    console.log(`  📍 POIs: ${poisMapeados.value.size}`)
    console.log(`  🗺️ Geozonas: ${geozonasMapeadas.value.size}`)
  }

  /**
   * 🔧 CORREGIDO: Evalúa una condición específica
   */
  function evaluarCondicionParaUnidad(condicion, unidad) {
    const { tipo, ubicacionId, activacion } = condicion
    
    // Creamos una clave única para esta unidad y ubicación
    const claveUbicacion = `unidad-${unidad.id}-${tipo}-${ubicacionId}`

    let estaDentro = false
    let nombreUbicacion = 'Ubicación'
    
    if (tipo === 'POI') {
      const poi = poisMapeados.value.get(ubicacionId)
      if (!poi) {
        console.warn(`⚠️ POI no encontrado: ${ubicacionId}`)
        return false
      }
      nombreUbicacion = poi.nombre
      estaDentro = estaDentroDelPOI(unidad.lat, unidad.lng, poi)
    } else if (tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(ubicacionId)
      if (!geozona) {
        console.warn(`⚠️ Geozona no encontrada: ${ubicacionId}`)
        return false
      }
      nombreUbicacion = geozona.nombre
      estaDentro = estaDentroDeGeozona(unidad.lat, unidad.lng, geozona)
    } else {
      return false
    }

    // Obtenemos el estado anterior
    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // ✅ CORREGIDO: Usar 'Entrada' y 'Salida' con mayúscula inicial
    if (activacion === 'Entrada' && estaDentro && estadoAnterior !== 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'dentro')
      console.log(`✅ ENTRADA detectada: Unidad ${unidad.nombre || unidad.id} → ${tipo} ${nombreUbicacion}`)
      return true
    }
    
    if (activacion === 'Salida' && !estaDentro && estadoAnterior === 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'fuera')
      console.log(`🚪 SALIDA detectada: Unidad ${unidad.nombre || unidad.id} ← ${tipo} ${nombreUbicacion}`)
      return true
    }

    // Actualizar estado actual aunque no se dispare evento
    if (estaDentro && estadoAnterior !== 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'dentro')
    } else if (!estaDentro && estadoAnterior !== 'fuera') {
      estadoUbicaciones.value.set(claveUbicacion, 'fuera')
    }

    return false
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
    const dentro = distancia <= radio
    
    if (dentro) {
      console.log(`📍 Unidad dentro de POI "${poi.nombre}" (distancia: ${Math.round(distancia)}m, radio: ${radio}m)`)
    }
    
    return dentro
  }

  /**
   * ✅ CORREGIDO: Verifica si está dentro de una geozona (solo poligonales)
   */
  function estaDentroDeGeozona(lat, lng, geozona) {
    // ✅ SIMPLIFICADO: Todas las geozonas son poligonales
    if (geozona.puntos && Array.isArray(geozona.puntos) && geozona.puntos.length > 0) {
      const dentro = puntoEnPoligono({ lat, lng }, geozona.puntos)
      
      if (dentro) {
        console.log(`🔷 Unidad dentro de Geozona poligonal "${geozona.nombre}"`)
      }
      
      return dentro
    }
    
    console.warn(`⚠️ Geozona sin puntos válidos: ${geozona.nombre}`, geozona)
    return false
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
   * 🔧 CORREGIDO: Evalúa eventos para todas las unidades activas
   */
  function evaluarEventosParaUnidadesSimulacion(unidades) {
    if (!unidades || unidades.length === 0) {
      return
    }
    
    unidades.forEach(unidad => {
      // ✅ VALIDACIÓN MEJORADA: Usar ubicacion.lat y ubicacion.lng
      const lat = unidad.ubicacion?.lat || unidad.lat
      const lng = unidad.ubicacion?.lng || unidad.lng
      
      if (!lat || !lng) {
        console.warn(`⚠️ Unidad sin coordenadas válidas:`, unidad)
        return
      }
      
      // Crear objeto normalizado para evaluación
      const unidadNormalizada = {
        ...unidad,
        lat,
        lng,
        nombre: unidad.conductorNombre || unidad.unidadNombre || unidad.nombre || unidad.id
      }
      
      // Evaluar todos los eventos activos para esta unidad
      eventosActivos.value.forEach(evento => {
        evaluarEventoParaUnidadSimulada(evento, unidadNormalizada)
      })
    })
  }

  /**
   * 🔧 CORREGIDO: Evalúa cada condición INDEPENDIENTEMENTE
   */
  function evaluarEventoParaUnidadSimulada(evento, unidad) {
    if (!evento.condiciones || evento.condiciones.length === 0) {
      return
    }

    // 🔧 CAMBIO CRÍTICO: Evaluar cada condición por separado
    // En lugar de requerir que TODAS se cumplan, cada una dispara el evento independientemente
    evento.condiciones.forEach(condicion => {
      const cumplida = evaluarCondicionParaUnidad(condicion, unidad)
      
      if (cumplida) {
        console.log(`🎯 Condición cumplida para evento "${evento.nombre}" (${condicion.tipo} - ${condicion.activacion})`)
        dispararEventoParaUnidadSimulada(evento, unidad, condicion)
      }
    })
  }

  /**
   * 🔧 MEJORADO: Dispara el evento Y lo registra en Firebase
   */
  async function dispararEventoParaUnidadSimulada(evento, unidad, condicion) {
    // Crear clave única que incluya la condición específica
    const claveEvento = `${evento.id}-${condicion.tipo}-${condicion.ubicacionId}-${condicion.activacion}-unidad-${unidad.id}`
    
    if (eventosDisparados.value.has(claveEvento)) {
      return
    }
    
    eventosDisparados.value.add(claveEvento)
    
    // Remover después de 10 segundos para permitir re-disparo
    setTimeout(() => {
      eventosDisparados.value.delete(claveEvento)
    }, 10000)

    // Obtener información de la ubicación
    let ubicacionNombre = 'Ubicación desconocida'
    let tipoUbicacion = ''

    if (condicion.tipo === 'POI') {
      const poi = poisMapeados.value.get(condicion.ubicacionId)
      ubicacionNombre = poi?.nombre || 'POI'
      tipoUbicacion = 'POI'
    } else if (condicion.tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(condicion.ubicacionId)
      ubicacionNombre = geozona?.nombre || 'Geozona'
      tipoUbicacion = 'Geozona'
    }

    const tipoNotificacion = 'positive'
    const accionTexto = condicion.activacion === 'Entrada' ? 'entró a' : 'salió de'
    const mensaje = `${unidad.nombre} ${accionTexto} ${tipoUbicacion}: ${ubicacionNombre}`

    // ✅ LOG IMPORTANTE: Evento disparado
    console.log(`🔔 EVENTO DISPARADO: "${evento.nombre}" - ${mensaje}`)

    // 🆕 ==========================================
    // REGISTRO EN FIREBASE
    // ==========================================
    try {
      const idRutaDiaria = obtenerIdRutaDiaria()
      
      // 🆕 PASO 1: Crear o actualizar la ruta diaria
      await iniciarOActualizarRutaDiaria(unidad.id, {
        conductor_id: unidad.conductorId || '',
        conductor_nombre: unidad.conductorNombre || unidad.nombre || '',
        velocidad_actual: unidad.velocidad || '0',
        nuevaCoordenada: {
          lat: unidad.lat,
          lng: unidad.lng,
          timestamp: new Date().toISOString()
        }
      })

      console.log(`💾 Ruta diaria actualizada para unidad ${unidad.id}`)

      // 🆕 PASO 2: Preparar datos del evento
      const eventoData = {
        IdEvento: evento.id,
        NombreEvento: evento.nombre,
        TipoEvento: condicion.activacion, // 'Entrada' o 'Salida'
        lat: unidad.lat,
        lng: unidad.lng,
        Direccion: `${unidad.lat}, ${unidad.lng}`, // Puedes mejorar con geocodificación
        tipoUbicacion: tipoUbicacion,
        ubicacionId: condicion.ubicacionId
      }

      // Agregar el campo condicional según el tipo
      if (tipoUbicacion === 'POI') {
        eventoData.PoiNombre = ubicacionNombre
      } else if (tipoUbicacion === 'Geozona') {
        eventoData.GeozonaNombre = ubicacionNombre
      }

      // 🆕 PASO 3: Manejar eventos de ENTRADA y SALIDA
      if (condicion.activacion === 'Entrada') {
        // Registrar evento de entrada
        const eventoRegistrado = await registrarEventoDiario(unidad.id, idRutaDiaria, eventoData)
        
        // Guardar en memoria para calcular duración cuando salga
        const claveEntrada = `${unidad.id}-${condicion.ubicacionId}`
        eventosEnCurso.value.set(claveEntrada, {
          idEvento: eventoRegistrado.id,
          idRutaDiaria: idRutaDiaria,
          timestampEntrada: Date.now(),
          ubicacionNombre: ubicacionNombre,
          ubicacionId: condicion.ubicacionId
        })
        
        console.log(`📍 Evento de ENTRADA registrado: ${eventoRegistrado.id}`)
      } 
      else if (condicion.activacion === 'Salida') {
        // Buscar si hay una entrada previa
        const claveEntrada = `${unidad.id}-${condicion.ubicacionId}`
        const eventoEntrada = eventosEnCurso.value.get(claveEntrada)
        
        if (eventoEntrada) {
          // Calcular duración en minutos
          const duracionMinutos = Math.floor((Date.now() - eventoEntrada.timestampEntrada) / 60000)
          
          // Finalizar el evento de entrada
          await finalizarEventoDiario(
            unidad.id,
            eventoEntrada.idRutaDiaria,
            eventoEntrada.idEvento,
            { lat: unidad.lat, lng: unidad.lng }
          )
          
          // Actualizar duración
          await actualizarDuracionEvento(
            unidad.id,
            eventoEntrada.idRutaDiaria,
            eventoEntrada.idEvento,
            duracionMinutos
          )
          
          // Limpiar de eventos en curso
          eventosEnCurso.value.delete(claveEntrada)
          
          console.log(`🚪 Evento finalizado. Duración: ${duracionMinutos} min en ${eventoEntrada.ubicacionNombre}`)
        } else {
          // Si no hay entrada previa, igual registrar la salida
          await registrarEventoDiario(unidad.id, idRutaDiaria, eventoData)
          console.log(`⚠️ Salida sin entrada previa registrada para ${ubicacionNombre}`)
        }
      }

      console.log(`✅ Evento registrado en Firebase`)
    } catch (err) {
      console.error('❌ Error al registrar en Firebase:', err)
    }
    // ==========================================

    // Crear notificación
    agregarNotificacion({
      type: tipoNotificacion,
      title: evento.nombre,
      message: mensaje,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      ubicacionNombre: ubicacionNombre,
      tipoUbicacion: tipoUbicacion,
      accion: condicion.activacion,
      sujeto: 'unidad',
      unidadId: unidad.id,
      unidadNombre: unidad.nombre
    })

    // ✅ LOG IMPORTANTE: Notificación creada
    console.log(`📢 NOTIFICACIÓN CREADA: ${mensaje}`)
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
    eventosEnCurso.value.clear() // 🆕 Limpiar eventos en curso
    console.log('🔄 Sistema de detección reseteado')
  }

  return {
    inicializar,
    evaluarEventosParaUnidadesSimulacion,
    resetear,
    eventosActivos,
    ubicacionActual,
    eventosEnCurso // 🆕 Exponer eventos en curso
  }
}