// src/composables/useEventDetection.js
import { ref } from 'vue'
import * as turf from '@turf/turf'
import { useNotifications } from './useNotifications'

export function useEventDetection() {
  const { agregarNotificacion } = useNotifications()
  
  const eventos = ref([])
  const pois = ref([])
  const geozonas = ref([])
  const ubicacionActual = ref(null)
  const estadosAnteriores = ref({}) // Estado anterior: dentro/fuera de cada ubicación
  const ultimasAlertas = ref({}) // Control de frecuencia de alertas

  /**
   * Inicializa el sistema con datos
   */
  function inicializar(eventosData, poisData, geozonaData) {
    eventos.value = eventosData || []
    pois.value = poisData || []
    geozonas.value = geozonaData || []
    
    console.log('🎯 Detección de eventos inicializada')
    console.log('  📊 Eventos activos:', eventos.value.filter(e => e.activo).length)
    console.log('  📍 POIs:', pois.value.length)
    console.log('  🗺️ Geozonas:', geozonas.value.length)
  }

  /**
   * Actualiza la ubicación y evalúa eventos
   */
  function actualizarUbicacion(lat, lng) {
    if (!lat || !lng) return

    ubicacionActual.value = { lat, lng }
    evaluarEventos()
  }

  /**
   * Evalúa todos los eventos activos
   */
  function evaluarEventos() {
    if (!ubicacionActual.value) return

    const eventosActivos = eventos.value.filter(e => e.activo)

    eventosActivos.forEach(evento => {
      if (!estaEnHorario(evento)) return

      const cumpleCondiciones = evaluarCondiciones(evento)
      
      if (cumpleCondiciones) {
        dispararAlerta(evento)
      }
    })
  }

  /**
   * Verifica horario del evento
   */
  function estaEnHorario(evento) {
    if (evento.aplicacion === 'siempre') return true

    const ahora = new Date()
    const diaActual = ahora.getDay()
    
    if (!evento.diasSemana || !evento.diasSemana.includes(diaActual)) {
      return false
    }

    if (evento.horaInicio && evento.horaFin) {
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes()
      const [hi, mi] = evento.horaInicio.split(':').map(Number)
      const [hf, mf] = evento.horaFin.split(':').map(Number)
      const inicio = hi * 60 + mi
      const fin = hf * 60 + mf

      if (horaActual < inicio || horaActual > fin) {
        return false
      }
    }

    return true
  }

  /**
   * Evalúa las condiciones del evento con operadores lógicos
   */
  function evaluarCondiciones(evento) {
    if (!evento.condiciones || evento.condiciones.length === 0) return false

    const resultados = evento.condiciones.map(condicion => 
      evaluarCondicionIndividual(evento, condicion)
    )

    // Si solo hay una condición
    if (resultados.length === 1) {
      return resultados[0]
    }

    // Evaluar con operadores lógicos
    let resultado = resultados[0]
    for (let i = 0; i < evento.operadoresLogicos.length; i++) {
      const operador = evento.operadoresLogicos[i] || 'AND'
      if (operador === 'AND') {
        resultado = resultado && resultados[i + 1]
      } else if (operador === 'OR') {
        resultado = resultado || resultados[i + 1]
      }
    }

    return resultado
  }

  /**
   * Evalúa una condición individual
   */
  function evaluarCondicionIndividual(evento, condicion) {
    const { lat, lng } = ubicacionActual.value
    const ubicacion = obtenerUbicacion(condicion)
    
    if (!ubicacion) return false

    const estaDentro = verificarDentro(lat, lng, ubicacion, condicion.tipo)
    const keyEstado = `${evento.id}_${condicion.ubicacionId}`
    const estadoAnterior = estadosAnteriores.value[keyEstado]

    // Actualizar estado
    estadosAnteriores.value[keyEstado] = estaDentro

    // Evaluar según tipo de activación
    switch (condicion.activacion) {
      case 'Entrada':
        return !estadoAnterior && estaDentro
      case 'Salida':
        return estadoAnterior && !estaDentro
      case 'Dentro':
        return estaDentro
      case 'Fuera':
        return !estaDentro
      default:
        return false
    }
  }

  /**
   * Obtiene la ubicación (POI o Geozona)
   */
  function obtenerUbicacion(condicion) {
    if (condicion.tipo === 'POI') {
      return pois.value.find(p => p.id === condicion.ubicacionId)
    } else {
      return geozonas.value.find(g => g.id === condicion.ubicacionId)
    }
  }

  /**
   * Verifica si está dentro de una ubicación
   */
  function verificarDentro(lat, lng, ubicacion, tipo) {
    const punto = turf.point([lng, lat])

    if (tipo === 'POI') {
      const poiPunto = turf.point([ubicacion.longitud, ubicacion.latitud])
      const distancia = turf.distance(punto, poiPunto, { units: 'meters' })
      return distancia <= (ubicacion.radio || 100)
    } else {
      // Geozona (polígono)
      const coordenadas = ubicacion.coordenadas.map(c => [c.lng, c.lat])
      coordenadas.push(coordenadas[0]) // Cerrar polígono
      const poligono = turf.polygon([coordenadas])
      return turf.booleanPointInPolygon(punto, poligono)
    }
  }

  /**
   * Dispara la alerta si cumple con la frecuencia
   */
  function dispararAlerta(evento) {
    const ahora = Date.now()
    const ultimaAlerta = ultimasAlertas.value[evento.id] || 0
    
    // Control de frecuencia
    let debeAlertar = false
    switch (evento.activacionAlerta) {
      case 'Al inicio':
        if (ultimaAlerta === 0) debeAlertar = true
        break
      case 'Cada vez':
        debeAlertar = true
        break
      case 'Una vez al día':
        { const hace24h = ahora - (24 * 60 * 60 * 1000)
        if (ultimaAlerta < hace24h) debeAlertar = true
        break }
    }

    if (debeAlertar) {
      crearNotificacion(evento)
      ultimasAlertas.value[evento.id] = ahora
    }
  }

  /**
   * Crea la notificación del evento
   */
  function crearNotificacion(evento) {
    const primeraCondicion = evento.condiciones[0]
    const ubicacion = obtenerUbicacion(primeraCondicion)
    
    const tipoMap = {
      'Entrada': { type: 'positive', icon: '🟢', texto: 'Entrada detectada' },
      'Salida': { type: 'warning', icon: '🟠', texto: 'Salida detectada' },
      'Dentro': { type: 'info', icon: '🔵', texto: 'Dentro de zona' },
      'Fuera': { type: 'negative', icon: '🔴', texto: 'Fuera de zona' }
    }

    const config = tipoMap[primeraCondicion.activacion] || tipoMap['Entrada']

    agregarNotificacion({
      type: config.type,
      title: `${config.icon} ${evento.nombre}`,
      message: `${config.texto} en ${ubicacion?.nombre || 'ubicación desconocida'}`,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      ubicacionNombre: ubicacion?.nombre || '',
      tipoUbicacion: primeraCondicion.tipo,
      accion: primeraCondicion.activacion
    })

    console.log(`🔔 Alerta disparada: ${evento.nombre}`)
  }

  /**
   * Resetea el sistema
   */
  function resetear() {
    estadosAnteriores.value = {}
    ultimasAlertas.value = {}
    console.log('🔄 Sistema de detección reseteado')
  }

  return {
    inicializar,
    actualizarUbicacion,
    resetear,
    eventos,
    pois,
    geozonas
  }
}