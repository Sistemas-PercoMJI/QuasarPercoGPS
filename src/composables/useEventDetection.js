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
    console.log('  📊 Eventos activos:', eventos.value.filter((e) => e.activo).length)
    console.log('  📍 POIs:', pois.value.length)
    console.log('  🗺️ Geozonas:', geozonas.value.length)
  }

  /**
   * Actualiza la ubicación y evalúa eventos
   */
  function actualizarUbicacion(lat, lng) {
    // 🔧 VALIDACIÓN 1: Verificar que las coordenadas son números válidos
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('⚠️ Coordenadas inválidas recibidas:', { lat, lng })
      return
    }

    // 🔧 VALIDACIÓN 2: Verificar rangos válidos
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('⚠️ Coordenadas fuera de rango:', { lat, lng })
      return
    }

    ubicacionActual.value = { lat, lng }
    evaluarEventos()
  }

  /**
   * Evalúa todos los eventos activos
   */
  function evaluarEventos() {
    if (!ubicacionActual.value) return

    const eventosActivos = eventos.value.filter((e) => e.activo)

    eventosActivos.forEach((evento) => {
      try {
        if (!estaEnHorario(evento)) return

        const cumpleCondiciones = evaluarCondiciones(evento)

        if (cumpleCondiciones) {
          dispararAlerta(evento)
        }
      } catch (error) {
        console.error(`❌ Error evaluando evento "${evento.nombre}":`, error.message)
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

    try {
      const resultados = evento.condiciones.map((condicion) =>
        evaluarCondicionIndividual(evento, condicion),
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
    } catch (error) {
      console.error('❌ Error evaluando condiciones:', error.message)
      return false
    }
  }

  /**
   * Evalúa una condición individual
   */
  function evaluarCondicionIndividual(evento, condicion) {
    // 🔧 VALIDACIÓN: Verificar ubicación actual
    if (
      !ubicacionActual.value ||
      typeof ubicacionActual.value.lat !== 'number' ||
      typeof ubicacionActual.value.lng !== 'number'
    ) {
      console.warn('⚠️ Sin ubicación válida para evaluar condición')
      return false
    }

    const { lat, lng } = ubicacionActual.value
    const ubicacion = obtenerUbicacion(condicion)

    if (!ubicacion) {
      console.warn(`⚠️ Ubicación no encontrada para condición:`, condicion)
      return false
    }

    try {
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
    } catch (error) {
      console.error('❌ Error en evaluarCondicionIndividual:', error.message)
      console.error('   Ubicación:', ubicacion)
      console.error('   Condición:', condicion)
      return false
    }
  }

  /**
   * Obtiene la ubicación (POI o Geozona)
   */
  function obtenerUbicacion(condicion) {
    if (condicion.tipo === 'POI') {
      return pois.value.find((p) => p.id === condicion.ubicacionId)
    } else {
      return geozonas.value.find((g) => g.id === condicion.ubicacionId)
    }
  }

  /**
   * Verifica si está dentro de una ubicación
   * 🔧 FUNCIÓN COMPLETAMENTE CORREGIDA
   */
  function verificarDentro(lat, lng, ubicacion, tipo) {
    // 🔧 VALIDACIÓN 1: Coordenadas del punto actual
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('⚠️ Coordenadas inválidas en verificarDentro:', { lat, lng })
      return false
    }

    // 🔧 VALIDACIÓN 2: Ubicación existe
    if (!ubicacion) {
      console.warn('⚠️ Ubicación no definida en verificarDentro')
      return false
    }

    try {
      const punto = turf.point([lng, lat])

      if (tipo === 'POI') {
        // 🔧 FIX PRINCIPAL: Soportar múltiples formatos de POI
        let poiLng, poiLat

        // Intentar diferentes formatos de coordenadas
        if (ubicacion.ubicacion) {
          // Formato: { ubicacion: { lat, lng } }
          poiLat = ubicacion.ubicacion.lat || ubicacion.ubicacion.latitud
          poiLng = ubicacion.ubicacion.lng || ubicacion.ubicacion.longitud
        } else {
          // Formato directo: { lat, lng } o { latitud, longitud }
          poiLat = ubicacion.lat || ubicacion.latitud
          poiLng = ubicacion.lng || ubicacion.longitud
        }

        // 🔧 VALIDACIÓN 3: Verificar coordenadas del POI
        if (
          typeof poiLat !== 'number' ||
          typeof poiLng !== 'number' ||
          isNaN(poiLat) ||
          isNaN(poiLng)
        ) {
          console.warn('⚠️ POI con coordenadas inválidas:', ubicacion)
          return false
        }

        const poiPunto = turf.point([poiLng, poiLat])
        const distancia = turf.distance(punto, poiPunto, { units: 'meters' })
        const radio = ubicacion.radio || 100

        return distancia <= radio
      } else {
        // Geozona (polígono o círculo)

        // 🔧 Soporte para geozonas circulares
        if (ubicacion.tipo === 'circular' || ubicacion.tipo === 'circulo') {
          let centroLat, centroLng

          if (ubicacion.centro) {
            centroLat = ubicacion.centro.lat || ubicacion.centro.latitud
            centroLng = ubicacion.centro.lng || ubicacion.centro.longitud
          } else {
            centroLat = ubicacion.lat || ubicacion.latitud
            centroLng = ubicacion.lng || ubicacion.longitud
          }

          // 🔧 VALIDACIÓN 4: Centro de geozona circular
          if (
            typeof centroLat !== 'number' ||
            typeof centroLng !== 'number' ||
            isNaN(centroLat) ||
            isNaN(centroLng)
          ) {
            console.warn('⚠️ Geozona circular con centro inválido:', ubicacion)
            return false
          }

          const centroPunto = turf.point([centroLng, centroLat])
          const distancia = turf.distance(punto, centroPunto, { units: 'meters' })
          const radio = ubicacion.radio || 100

          return distancia <= radio
        }

        // 🔧 Geozona poligonal
        let coordenadas

        // Soportar diferentes formatos de coordenadas
        if (ubicacion.coordenadas) {
          coordenadas = ubicacion.coordenadas
        } else if (ubicacion.puntos) {
          coordenadas = ubicacion.puntos
        } else {
          console.warn('⚠️ Geozona sin coordenadas:', ubicacion)
          return false
        }

        // 🔧 VALIDACIÓN 5: Verificar que hay suficientes puntos
        if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
          console.warn('⚠️ Geozona poligonal con puntos insuficientes:', coordenadas)
          return false
        }

        // Convertir coordenadas al formato de Turf [lng, lat]
        const puntosPoligono = coordenadas.map((c) => {
          const cLng = c.lng || c.longitud || c[0]
          const cLat = c.lat || c.latitud || c[1]

          // 🔧 VALIDACIÓN 6: Cada punto debe ser válido
          if (typeof cLng !== 'number' || typeof cLat !== 'number' || isNaN(cLng) || isNaN(cLat)) {
            throw new Error(`Coordenada inválida en polígono: ${JSON.stringify(c)}`)
          }

          return [cLng, cLat]
        })

        // Cerrar el polígono si no está cerrado
        const primerPunto = puntosPoligono[0]
        const ultimoPunto = puntosPoligono[puntosPoligono.length - 1]
        if (primerPunto[0] !== ultimoPunto[0] || primerPunto[1] !== ultimoPunto[1]) {
          puntosPoligono.push([...primerPunto])
        }

        const poligono = turf.polygon([puntosPoligono])
        return turf.booleanPointInPolygon(punto, poligono)
      }
    } catch (error) {
      console.error('❌ Error en verificarDentro:', error.message)
      console.error('   Tipo:', tipo)
      console.error('   Ubicación:', ubicacion)
      console.error('   Coordenadas actuales:', { lat, lng })
      return false
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
      case 'Una vez al día': {
        const hace24h = ahora - 24 * 60 * 60 * 1000
        if (ultimaAlerta < hace24h) debeAlertar = true
        break
      }
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
      Entrada: { type: 'positive', icon: '🟢', texto: 'Entrada detectada' },
      Salida: { type: 'warning', icon: '🟠', texto: 'Salida detectada' },
      Dentro: { type: 'info', icon: '🔵', texto: 'Dentro de zona' },
      Fuera: { type: 'negative', icon: '🔴', texto: 'Fuera de zona' },
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
      accion: primeraCondicion.activacion,
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
    geozonas,
  }
}
