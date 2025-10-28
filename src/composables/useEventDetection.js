// src/composables/useEventDetection.js
import { ref } from 'vue'
import { useNotifications } from './useNotifications'

// Estado del sistema de detección
const eventosActivos = ref([])
const poisMapeados = ref(new Map())
const geozonasMapeadas = ref(new Map())
const ubicacionActual = ref(null)
const eventosDisparados = ref(new Set()) // Para evitar duplicados

// 🔧 NUEVO: Estado para saber si ya estamos dentro de una ubicación (para detectar salidas correctamente)
const estadoUbicaciones = ref(new Map()) // Almacena 'dentro' o 'fuera' para cada ubicaciónId

// 🔧 NUEVO: Integración con notificaciones
const { agregarNotificacion } = useNotifications()

export function useEventDetection() {
  /**
   * Inicializa el sistema con eventos, POIs y geozonas
   */
  function inicializar(eventos, pois, geozonas) {
    console.log('🚀 Inicializando sistema de detección de eventos...')
    
    // Filtrar solo eventos activos
    eventosActivos.value = eventos.filter(e => e.activo)
    
    // Mapear POIs por ID para búsqueda rápida
    poisMapeados.value.clear()
    pois.forEach(poi => {
      poisMapeados.value.set(poi.id, poi)
    })
    
    // Mapear Geozonas por ID
    geozonasMapeadas.value.clear()
    geozonas.forEach(geozona => {
      geozonasMapeadas.value.set(geozona.id, geozona)
    })
    
    // Limpiar estados al reinicializar
    eventosDisparados.value.clear()
    estadoUbicaciones.value.clear() // Limpiar también el nuevo estado
    
    console.log('✅ Sistema de detección inicializado')
    console.log(`  📊 Eventos activos: ${eventosActivos.value.length}`)
    console.log(`  📍 POIs: ${poisMapeados.value.size}`)
    console.log(`  🗺️ Geozonas: ${geozonasMapeadas.value.size}`)
  }

  /**
   * Actualiza la ubicación actual y evalúa eventos
   */
  function actualizarUbicacion(lat, lng) {
    ubicacionActual.value = { lat, lng }
    
    // Evaluar todos los eventos activos
    eventosActivos.value.forEach(evento => {
      evaluarEvento(evento, lat, lng)
    })
  }

  /**
   * Evalúa si un evento debe dispararse
   */
  function evaluarEvento(evento, lat, lng) {
    if (!evento.condiciones || evento.condiciones.length === 0) {
      return
    }

    let todasCondicionesCumplidas = true

    // Evaluar cada condición del evento
    for (const condicion of evento.condiciones) {
      const cumplida = evaluarCondicion(condicion, lat, lng)
      
      if (!cumplida) {
        todasCondicionesCumplidas = false
        break
      }
    }

    // Si todas las condiciones se cumplen, disparar el evento
    if (todasCondicionesCumplidas) {
      dispararEvento(evento)
    }
  }

  /**
   * ✨ MEJORADA: Evalúa una condición específica, detectando correctamente la entrada y salida.
   */
  function evaluarCondicion(condicion, lat, lng) {
    const { tipo, ubicacionId, accion } = condicion
    // Creamos una clave única para el estado (ej: "POI-123" o "Geozona-456")
    const claveUbicacion = `${tipo}-${ubicacionId}`

    let estaDentro = false
    if (tipo === 'POI') {
      const poi = poisMapeados.value.get(ubicacionId)
      if (!poi) return false
      estaDentro = estaDentroDelPOI(lat, lng, poi)
    } else if (tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(ubicacionId)
      if (!geozona) return false
      estaDentro = estaDentroDeGeozona(lat, lng, geozona)
    } else {
      return false
    }

    // Obtenemos el estado anterior de esta ubicación
    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // Lógica para ENTRADA: debe estar dentro ahora y antes no estarlo.
    if (accion === 'entrada' && estaDentro && estadoAnterior !== 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'dentro')
      return true
    }
    
    // Lógica para SALIDA: debe estar fuera ahora y antes estar dentro.
    if (accion === 'salida' && !estaDentro && estadoAnterior === 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'fuera')
      return true
    }

    return false
  }

  /**
   * Verifica si está dentro de un POI (círculo)
   */
  function estaDentroDelPOI(lat, lng, poi) {
    if (!poi.coordenadas) return false

    const { lat: poiLat, lng: poiLng } = poi.coordenadas
    const radio = poi.radio || 100 // Radio en metros

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
    const R = 6371e3 // Radio de la Tierra en metros
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
   * ✨ CORREGIDA: Dispara el evento y crea notificación (sin la variable no usada).
   */
  function dispararEvento(evento) {
    // Evitar disparar el mismo evento múltiples veces en poco tiempo
    if (eventosDisparados.value.has(evento.id)) {
      return
    }
    
    eventosDisparados.value.add(evento.id)
    
    // Remover después de 10 segundos para permitir re-disparado
    setTimeout(() => {
      eventosDisparados.value.delete(evento.id)
    }, 10000)

    console.log('🔔 Evento disparado:', evento.nombre)

    // Obtener información de la primera condición para el mensaje
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

    // 🔧 CREAR NOTIFICACIÓN
    const tipoNotificacion = obtenerTipoNotificacion(evento.tipo)
    const mensaje = construirMensaje(evento, ubicacionNombre, primeraCondicion.accion)

    agregarNotificacion({
      type: tipoNotificacion,
      title: evento.nombre,
      message: mensaje,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      ubicacionNombre: ubicacionNombre,
      tipoUbicacion: tipoUbicacion,
      accion: primeraCondicion.accion
    })

    console.log(`📢 Notificación creada para evento: ${evento.nombre}`)
  }

  function obtenerTipoNotificacion(tipoEvento) {
    switch (tipoEvento) {
      case 'alerta':
        return 'negative'
      case 'advertencia':
        return 'warning'
      case 'informacion':
        return 'info'
      default:
        return 'positive'
    }
  }

  /**
   * Construye el mensaje de la notificación
   */
  function construirMensaje(evento, ubicacionNombre, accion) {
    const accionTexto = accion === 'entrada' ? 'entró a' : 'salió de'
    return `Un vehículo ${accionTexto} ${ubicacionNombre}`
  }

  // 🔧 NUEVAS FUNCIONES PARA UNIDADES SIMULADAS 🔧

  /**
   * 🔧 NUEVO: Evalúa eventos para todas las unidades activas (solo simulación)
   */
  function evaluarEventosParaUnidadesSimulacion(unidades) {
    if (!unidades || unidades.length === 0) return
    
    console.log(`🎮 Evaluando eventos para ${unidades.length} unidades simuladas...`)
    
    unidades.forEach(unidad => {
      if (!unidad.lat || !unidad.lng) return
      
      // Evaluar todos los eventos activos para esta unidad
      eventosActivos.value.forEach(evento => {
        evaluarEventoParaUnidadSimulada(evento, unidad)
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
   * 🔧 NUEVO: Evalúa una condición para una unidad simulada
   */
  function evaluarCondicionParaUnidad(condicion, unidad) {
    const { tipo, ubicacionId, accion } = condicion
    
    // Creamos una clave única para esta unidad y ubicación
    const claveUbicacion = `unidad-${unidad.id}-${tipo}-${ubicacionId}`

    let estaDentro = false
    if (tipo === 'POI') {
      const poi = poisMapeados.value.get(ubicacionId)
      if (!poi) return false
      estaDentro = estaDentroDelPOI(unidad.lat, unidad.lng, poi)
    } else if (tipo === 'Geozona') {
      const geozona = geozonasMapeadas.value.get(ubicacionId)
      if (!geozona) return false
      estaDentro = estaDentroDeGeozona(unidad.lat, unidad.lng, geozona)
    } else {
      return false
    }

    // Obtenemos el estado anterior
    const estadoAnterior = estadoUbicaciones.value.get(claveUbicacion)

    // Lógica para ENTRADA
    if (accion === 'entrada' && estaDentro && estadoAnterior !== 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'dentro')
      return true
    }
    
    // Lógica para SALIDA
    if (accion === 'salida' && !estaDentro && estadoAnterior === 'dentro') {
      estadoUbicaciones.value.set(claveUbicacion, 'fuera')
      return true
    }

    return false
  }

  /**
   * 🔧 NUEVO: Dispara el evento para una unidad simulada
   */
  function dispararEventoParaUnidadSimulada(evento, unidad) {
    // Crear clave única para evitar duplicados
    const claveEvento = `${evento.id}-unidad-${unidad.id}`
    
    // Evitar disparar el mismo evento múltiples veces
    if (eventosDisparados.value.has(claveEvento)) {
      return
    }
    
    eventosDisparados.value.add(claveEvento)
    
    // Remover después de 10 segundos
    setTimeout(() => {
      eventosDisparados.value.delete(claveEvento)
    }, 10000)

    console.log('🎮 Evento simulado disparado:', evento.nombre, `para unidad ${unidad.nombre || unidad.id}`)

    // Obtener información de la primera condición
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

    // Crear notificación
    const tipoNotificacion = obtenerTipoNotificacion(evento.tipo)
    const accionTexto = primeraCondicion.accion === 'entrada' ? 'entró a' : 'salió de'
    const mensaje = `Unidad ${unidad.nombre || unidad.id} ${accionTexto} ${ubicacionNombre}`

    agregarNotificacion({
      type: tipoNotificacion,
      title: evento.nombre,
      message: mensaje,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      ubicacionNombre: ubicacionNombre,
      tipoUbicacion: tipoUbicacion,
      accion: primeraCondicion.accion,
      sujeto: 'unidad',
      unidadId: unidad.id,
      unidadNombre: unidad.nombre
    })

    console.log(`📢 Notificación de simulación creada: ${mensaje}`)
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
    estadoUbicaciones.value.clear() // Limpiar también el nuevo estado
    console.log('🔄 Sistema de detección reseteado')
  }

  return {
    inicializar,
    actualizarUbicacion,
    evaluarEventosParaUnidadesSimulacion, // 🔧 NUEVO: Exponer función para simulación
    resetear,
    eventosActivos,
    ubicacionActual
  }
}