// src/composables/useEventDetection.js - LIMPIO
import { ref } from 'vue'
import { useNotifications } from './useNotifications'

// Estado del sistema de detección
const eventosActivos = ref([])
const poisMapeados = ref(new Map())
const geozonasMapeadas = ref(new Map())
const ubicacionActual = ref(null)
const eventosDisparados = ref(new Set())
const estadoUbicaciones = ref(new Map())


// 🔧 Integración con notificaciones
const { agregarNotificacion } = useNotifications()


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
      if (!poi) return false
      nombreUbicacion = poi.nombre
      estaDentro = estaDentroDelPOI(unidad.lat, unidad.lng, poi)
    } else if (tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(ubicacionId)
      if (!geozona) return false
      nombreUbicacion = geozona.nombre
      estaDentro = estaDentroDeGeozona(unidad.lat, unidad.lng, geozona)
    } else {
      return false
    }

    // Obtenemos el estado anterior
    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // ✅ SOLO LOGS DE DETECCIÓN IMPORTANTE
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
    if (!poi.coordenadas) return false

    const { lat: poiLat, lng: poiLng } = poi.coordenadas
    const radio = poi.radio || 100

    const distancia = calcularDistancia(lat, lng, poiLat, poiLng)
    return distancia <= radio
  }

  /**
   * Verifica si está dentro de una geozona
   */
  function estaDentroDeGeozona(lat, lng, geozona) {
    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      const { lat: centroLat, lng: centroLng } = geozona.centro
      const distancia = calcularDistancia(lat, lng, centroLat, centroLng)
      return distancia <= geozona.radio
    } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos) {
      return puntoEnPoligono({ lat, lng }, geozona.puntos)
    }
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
   * 🔧 NUEVO: Evalúa eventos para todas las unidades activas
   */
  function evaluarEventosParaUnidadesSimulacion(unidades) {
    if (!unidades || unidades.length === 0) {
      return
    }
    
    // ❌ LOGS ELIMINADOS: Ya no mostramos conteos en cada ciclo
    
    unidades.forEach(unidad => {
      // ✅ VALIDACIÓN MEJORADA: Usar ubicacion.lat y ubicacion.lng
      const lat = unidad.ubicacion?.lat || unidad.lat
      const lng = unidad.ubicacion?.lng || unidad.lng
      
      if (!lat || !lng) {
        return
      }
      
      // Crear objeto normalizado para evaluación
      const unidadNormalizada = {
        ...unidad,
        lat,
        lng,
        nombre: unidad.conductorNombre || unidad.nombre || unidad.id
      }
      
      // Evaluar todos los eventos activos para esta unidad
      eventosActivos.value.forEach(evento => {
        evaluarEventoParaUnidadSimulada(evento, unidadNormalizada)
      })
    })
  }

  /**
   * 🔧 NUEVO: Evalúa si un evento debe dispararse para una unidad simulada
   */
  function evaluarEventoParaUnidadSimulada(evento, unidad) {
    if (!evento.condiciones || evento.condiciones.length === 0) {
      return
    }

    let todasCondicionesCumplidas = true

    for (const condicion of evento.condiciones) {
      const cumplida = evaluarCondicionParaUnidad(condicion, unidad)
      
      if (!cumplida) {
        todasCondicionesCumplidas = false
        break
      }
    }

    if (todasCondicionesCumplidas) {
      dispararEventoParaUnidadSimulada(evento, unidad)
    }
  }

  /**
   * 🔧 NUEVO: Dispara el evento para una unidad simulada
   */
  function dispararEventoParaUnidadSimulada(evento, unidad) {
    const claveEvento = `${evento.id}-unidad-${unidad.id}`
    
    if (eventosDisparados.value.has(claveEvento)) {
      return
    }
    
    eventosDisparados.value.add(claveEvento)
    
    setTimeout(() => {
      eventosDisparados.value.delete(claveEvento)
    }, 10000)

    // ✅ LOG IMPORTANTE: Evento disparado
    console.log(`🔔 Evento disparado: "${evento.nombre}" para unidad ${unidad.nombre}`)

    const primeraCondicion = evento.condiciones[0]
    let ubicacionNombre = 'Ubicación desconocida'
    let tipoUbicacion = ''

    if (primeraCondicion.tipo === 'POI') {
      const poi = poisMapeados.value.get(primeraCondicion.ubicacionId)
      ubicacionNombre = poi?.nombre || 'POI'
      tipoUbicacion = 'POI'
    } else if (primeraCondicion.tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(primeraCondicion.ubicacionId)
      ubicacionNombre = geozona?.nombre || 'Geozona'
      tipoUbicacion = 'Geozona'
    }

    const tipoNotificacion = 'positive'
    const accionTexto = primeraCondicion.activacion === 'Entrada' ? 'entró a' : 'salió de'
    const mensaje = `${unidad.nombre} ${accionTexto} ${ubicacionNombre}`

    agregarNotificacion({
      type: tipoNotificacion,
      title: evento.nombre,
      message: mensaje,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      ubicacionNombre: ubicacionNombre,
      tipoUbicacion: tipoUbicacion,
      accion: primeraCondicion.activacion,
      sujeto: 'unidad',
      unidadId: unidad.id,
      unidadNombre: unidad.nombre
    })

    // ✅ LOG IMPORTANTE: Notificación creada
    console.log(`📢 Notificación creada: ${mensaje}`)
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
    console.log('🔄 Sistema de detección reseteado')
  }

  return {
    inicializar,
    evaluarEventosParaUnidadesSimulacion,
    resetear,
    eventosActivos,
    ubicacionActual
  }
}