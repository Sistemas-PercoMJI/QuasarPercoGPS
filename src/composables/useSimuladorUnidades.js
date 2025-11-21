// src/composables/useSimuladorUnidades.js - v3.2 DIRECCIONES ACTUALIZADAS
// ✅ Actualización de direcciones cada 30 segundos O 50 metros
// ✅ Logs detallados para debugging
// ✅ Mejor experiencia en popups del mapa

import { ref } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, set, update, onValue, remove } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'
import { useRutaDiaria } from 'src/composables/useRutaDiaria'

export function useSimuladorUnidades() {
  const simulacionActiva = ref(false)
  const intervalos = ref([])
  const unidadesSimuladas = ref([])
  
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  const { iniciarOActualizarRutaDiaria } = useRutaDiaria()
  
  // 🗺️ Límites PRECISOS de Tijuana, BC
  const LIMITES_TIJUANA = {
    latMin: 32.43,
    latMax: 32.56,
    lngMin: -117.13,
    lngMax: -116.88
  }
  
  // 🔑 API key de Mapbox
  const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

  // 🎯 ESTADOS
  const ESTADOS = {
    MOVIMIENTO: 'movimiento',
    DETENIDO: 'detenido',
    INACTIVO: 'inactivo'
  }

  // ⏱️ Configuración de actualizaciones
  const DURACION_ESTADO = 20000 // Cambio de estado cada 20 segundos
  const TIEMPO_ACTUALIZACION_DIRECCION = 30000 // ✅ Actualizar dirección cada 30 segundos
  const DISTANCIA_MIN_ACTUALIZACION = 50 // ✅ O cuando se mueva 50+ metros

  /**
   * 🌐 Obtener dirección COMPLETA desde coordenadas
   * SIEMPRE retorna un nombre de calle legible
   */
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,poi,locality&limit=1`
      )
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        
        // 🔍 Extraer información estructurada
        const place_name = feature.place_name || ''
        const text = feature.text || ''
        const address = feature.address || ''
        
        // ✅ Construir dirección completa
        let direccionFinal = ''
        
        // Si tiene número de dirección
        if (address && text) {
          direccionFinal = `${text} ${address}`
        } else if (text) {
          direccionFinal = text
        } else {
          // Usar place_name como último recurso
          direccionFinal = place_name.split(',')[0] || ''
        }
        
        // Limpiar texto redundante
        direccionFinal = direccionFinal
          .replace(/, Baja California, México/g, '')
          .replace(/, Baja California/g, '')
          .replace(/, Tijuana, Baja California/g, '')
          .replace(/, Tijuana/g, '')
          .replace(/, México/g, '')
          .replace(/22[0-9]{3}/g, '') // Remover códigos postales
          .trim()
        
        // ✅ Si obtuvimos algo válido, retornar
        if (direccionFinal && direccionFinal.length > 3) {
          console.log(`🗺️ Geocoding exitoso: ${direccionFinal}`)
          return direccionFinal
        }
      }
      
      // Si no se obtuvo nada, intentar con tipos más amplios
      console.warn('⚠️ Sin resultado específico, intentando búsqueda amplia...')
      const responseAmplia = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`
      )
      const dataAmplia = await responseAmplia.json()
      
      if (dataAmplia.features && dataAmplia.features.length > 0) {
        const feature = dataAmplia.features[0]
        const parts = feature.place_name.split(',')
        
        // Retornar la primera parte (usualmente calle o zona)
        const direccion = parts[0].trim()
        console.log(`🗺️ Geocoding amplio: ${direccion}`)
        return direccion
      }
      
    } catch (error) {
      console.error('❌ Error en geocoding:', error)
    }
    
    // ✅ Último fallback: formato legible de coordenadas
    return `Ubicación ${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°O`
  }

  /**
   * 🔄 Probabilidades iguales 33.33%
   */
  const determinarSiguienteEstado = () => {
    const rand = Math.random()
    if (rand < 0.333) return ESTADOS.MOVIMIENTO
    if (rand < 0.666) return ESTADOS.DETENIDO
    return ESTADOS.INACTIVO
  }

  /**
   * 🎲 Ubicación aleatoria en Tijuana
   */
  const generarUbicacionAleatoria = () => {
    const lat = LIMITES_TIJUANA.latMin + Math.random() * (LIMITES_TIJUANA.latMax - LIMITES_TIJUANA.latMin)
    const lng = LIMITES_TIJUANA.lngMin + Math.random() * (LIMITES_TIJUANA.lngMax - LIMITES_TIJUANA.lngMin)
    return { lat, lng }
  }

  /**
   * 🎲 Destino aleatorio >1km
   */
  const generarDestinoAleatorio = (ubicacionActual) => {
    let nuevoDestino, distancia
    do {
      nuevoDestino = generarUbicacionAleatoria()
      distancia = calcularDistancia(
        ubicacionActual.lat, ubicacionActual.lng,
        nuevoDestino.lat, nuevoDestino.lng
      )
    } while (distancia < 1000)
    return nuevoDestino
  }

  /**
   * 📏 Distancia entre puntos
   */
  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * 🧭 Dirección bearing
   */
  const calcularDireccion = (desde, hacia) => {
    const deltaLng = hacia.lng - desde.lng
    const deltaLat = hacia.lat - desde.lat
    const bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  /**
   * 🚗 Procesar movimiento según estado
   */
  const procesarMovimientoUnidad = (estadoActual) => {
    const ahora = Date.now()
    
    if (!estadoActual.ubicacion?.lat || !estadoActual.ubicacion?.lng) {
      const ubicacionInicial = generarUbicacionAleatoria()
      return {
        ubicacion: ubicacionInicial,
        direccion: Math.random() * 360,
        estado: ESTADOS.MOVIMIENTO,
        velocidad: 45,
        ignicion: true,
        destinoAleatorio: generarDestinoAleatorio(ubicacionInicial),
        tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
        ultimaActualizacionDireccion: 0 // ✅ NUEVO
      }
    }

    // Cambio de estado cada 20s
    if (ahora >= (estadoActual.tiempoProximoCambioEstado || 0)) {
      const nuevoEstado = determinarSiguienteEstado()
      console.log(`🔄 ${estadoActual.unidadNombre}: ${estadoActual.estado} → ${nuevoEstado}`)
      
      if (nuevoEstado === ESTADOS.MOVIMIENTO) {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion || Math.random() * 360,
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40,
          ignicion: true,
          destinoAleatorio: generarDestinoAleatorio(estadoActual.ubicacion),
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
        }
      } 
      else if (nuevoEstado === ESTADOS.DETENIDO) {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion,
          estado: ESTADOS.DETENIDO,
          velocidad: 0,
          ignicion: true,
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
        }
      } 
      else {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion,
          estado: ESTADOS.INACTIVO,
          velocidad: 0,
          ignicion: false,
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
        }
      }
    }

    // Solo mover si está en MOVIMIENTO
    if (estadoActual.estado === ESTADOS.MOVIMIENTO) {
      if (!estadoActual.destinoAleatorio?.lat || !estadoActual.destinoAleatorio?.lng) {
        estadoActual.destinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
      }
      
      const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000
      const velocidadMs = (estadoActual.velocidad * 1000) / 3600
      const distanciaAMover = velocidadMs * tiempoTranscurrido
      
      const distanciaAlDestino = calcularDistancia(
        estadoActual.ubicacion.lat, estadoActual.ubicacion.lng,
        estadoActual.destinoAleatorio.lat, estadoActual.destinoAleatorio.lng
      )
      
      if (distanciaAMover >= distanciaAlDestino || distanciaAlDestino < 100) {
        const nuevoDestino = generarDestinoAleatorio(estadoActual.ubicacion)
        return {
          ubicacion: estadoActual.destinoAleatorio,
          direccion: calcularDireccion(estadoActual.ubicacion, nuevoDestino),
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40,
          ignicion: true,
          destinoAleatorio: nuevoDestino,
          tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
        }
      }
      
      const proporcion = Math.min(distanciaAMover / distanciaAlDestino, 1)
      const nuevaLat = estadoActual.ubicacion.lat + 
        (estadoActual.destinoAleatorio.lat - estadoActual.ubicacion.lat) * proporcion
      const nuevaLng = estadoActual.ubicacion.lng + 
        (estadoActual.destinoAleatorio.lng - estadoActual.ubicacion.lng) * proporcion
      
      const latFinal = Math.max(LIMITES_TIJUANA.latMin, Math.min(LIMITES_TIJUANA.latMax, nuevaLat))
      const lngFinal = Math.max(LIMITES_TIJUANA.lngMin, Math.min(LIMITES_TIJUANA.lngMax, nuevaLng))
      
      let nuevaVelocidad = estadoActual.velocidad
      if (Math.random() < 0.15) {
        nuevaVelocidad = Math.max(35, Math.min(65, nuevaVelocidad + (Math.random() - 0.5) * 12))
      }
      
      return {
        ubicacion: { lat: latFinal, lng: lngFinal },
        direccion: calcularDireccion(estadoActual.ubicacion, estadoActual.destinoAleatorio),
        estado: ESTADOS.MOVIMIENTO,
        velocidad: Math.floor(nuevaVelocidad),
        ignicion: true,
        destinoAleatorio: estadoActual.destinoAleatorio,
        tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
        ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
      }
    }

    // DETENIDO o INACTIVO: no mover
    return {
      ubicacion: estadoActual.ubicacion,
      direccion: estadoActual.direccion,
      estado: estadoActual.estado,
      velocidad: 0,
      ignicion: estadoActual.estado === ESTADOS.DETENIDO,
      destinoAleatorio: estadoActual.ubicacion,
      tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
      ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0
    }
  }

  /**
   * 🚀 Iniciar simulación de una unidad
   */
  const iniciarSimulacionUnidad = async (conductor, unidad) => {
    const unidadId = `unidad_${unidad.id}`
    const ubicacionInicial = generarUbicacionAleatoria()
    const destinoInicial = generarDestinoAleatorio(ubicacionInicial)
    const velocidadBase = Math.floor(Math.random() * 20) + 40
    const estadoInicial = determinarSiguienteEstado()
    
    const direccionReal = await obtenerDireccionDesdeCoordenadas(
      ubicacionInicial.lat, 
      ubicacionInicial.lng
    )
    
    console.log(`🚗 ${unidad.Unidad}: ${direccionReal} - Estado: ${estadoInicial}`)
    
    const estado = {
      id: unidad.id,
      conductorId: conductor.id,
      conductorNombre: `${conductor.Nombre} ${conductor.Apellido}`,
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      ubicacion: ubicacionInicial,
      velocidad: estadoInicial === ESTADOS.MOVIMIENTO ? velocidadBase : 0,
      direccion: calcularDireccion(ubicacionInicial, destinoInicial),
      estado: estadoInicial,
      direccionTexto: direccionReal,
      bateria: Math.floor(Math.random() * 30) + 70,
      ignicion: estadoInicial !== ESTADOS.INACTIVO,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: velocidadBase,
      destinoAleatorio: estadoInicial === ESTADOS.MOVIMIENTO ? destinoInicial : ubicacionInicial,
      tiempoProximoCambioEstado: Date.now() + DURACION_ESTADO,
      ultimaActualizacionDireccion: Date.now() // ✅ NUEVO: Guardar timestamp de última actualización
    }

    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estado)
    
    if (estadoInicial === ESTADOS.MOVIMIENTO) {
      try {
        await iniciarOActualizarRutaDiaria(unidad.id, {
          conductor_id: conductor.id,
          conductor_nombre: `${conductor.Nombre} ${conductor.Apellido}`,
          odometro_inicio: '0',
          velocidad_actual: String(velocidadBase),
          nuevaCoordenada: {
            lat: ubicacionInicial.lat,
            lng: ubicacionInicial.lng,
            timestamp: new Date().toISOString()
          }
        })
      } catch (err) {
        console.error(`❌ Error ruta diaria:`, err)
      }
    }
    
    const intervalo = setInterval(async () => {
      try {
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => resolve(snap), reject, { onlyOnce: true })
        })
        
        const estadoActual = snapshot.val()
        if (!estadoActual) return

        const nuevoMovimiento = procesarMovimientoUnidad(estadoActual)

        let nuevaDireccionTexto = estadoActual.direccionTexto
        let actualizarTimestampDireccion = estadoActual.ultimaActualizacionDireccion || 0
        
        // ✅ NUEVA LÓGICA: Actualizar dirección si está en movimiento Y (pasaron 30s O se movió 50m)
        if (nuevoMovimiento.estado === ESTADOS.MOVIMIENTO) {
          const distanciaCambio = calcularDistancia(
            estadoActual.ubicacion.lat, estadoActual.ubicacion.lng,
            nuevoMovimiento.ubicacion.lat, nuevoMovimiento.ubicacion.lng
          )
          
          const tiempoDesdeUltimaActualizacion = Date.now() - (estadoActual.ultimaActualizacionDireccion || 0)
          const debeActualizarDireccion = distanciaCambio > DISTANCIA_MIN_ACTUALIZACION || 
                                         tiempoDesdeUltimaActualizacion > TIEMPO_ACTUALIZACION_DIRECCION
          
          if (debeActualizarDireccion) {
            try {
              nuevaDireccionTexto = await obtenerDireccionDesdeCoordenadas(
                nuevoMovimiento.ubicacion.lat,
                nuevoMovimiento.ubicacion.lng
              )
              actualizarTimestampDireccion = Date.now()
              
              // ✅ Log detallado para debugging
              console.log('📍 Dirección actualizada:', {
                unidad: estadoActual.unidadNombre,
                direccionAnterior: estadoActual.direccionTexto?.substring(0, 40) + '...',
                direccionNueva: nuevaDireccionTexto.substring(0, 40) + '...',
                distanciaMovida: `${distanciaCambio.toFixed(0)}m`,
                tiempoTranscurrido: `${Math.floor(tiempoDesdeUltimaActualizacion / 1000)}s`,
                motivo: distanciaCambio > DISTANCIA_MIN_ACTUALIZACION ? 'Distancia' : 'Tiempo'
              })
            } catch (error) {
              console.warn('⚠️ Error geocoding:', error)
              nuevaDireccionTexto = `${nuevoMovimiento.ubicacion.lat.toFixed(5)}, ${nuevoMovimiento.ubicacion.lng.toFixed(5)}`
            }
          }
        }

        await update(unidadRef, {
          ubicacion: nuevoMovimiento.ubicacion,
          velocidad: nuevoMovimiento.velocidad,
          direccion: Math.floor(nuevoMovimiento.direccion),
          estado: nuevoMovimiento.estado,
          ignicion: nuevoMovimiento.ignicion,
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString(),
          ultimoPuntoTiempo: Date.now(),
          destinoAleatorio: nuevoMovimiento.destinoAleatorio,
          tiempoProximoCambioEstado: nuevoMovimiento.tiempoProximoCambioEstado,
          direccionTexto: nuevaDireccionTexto, // ✅ Dirección actualizada
          ultimaActualizacionDireccion: actualizarTimestampDireccion, // ✅ NUEVO timestamp
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto || null,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca,
          bateria: estadoActual.bateria
        })

        if (nuevoMovimiento.estado === ESTADOS.MOVIMIENTO) {
          try {
            await iniciarOActualizarRutaDiaria(unidad.id, {
              conductor_id: estadoActual.conductorId,
              conductor_nombre: estadoActual.conductorNombre,
              velocidad_actual: String(nuevoMovimiento.velocidad),
              nuevaCoordenada: {
                lat: nuevoMovimiento.ubicacion.lat,
                lng: nuevoMovimiento.ubicacion.lng,
                timestamp: new Date().toISOString()
              }
            })
          } catch (errRuta) {
            console.error(`⚠️ Error ruta:`, errRuta)
          }
        }

        try {
          await evaluarEventosParaUnidadesSimulacion([{
            id: unidad.id,
            conductorId: estadoActual.conductorId,
            conductorNombre: estadoActual.conductorNombre,
            unidadNombre: estadoActual.unidadNombre,
            nombre: estadoActual.conductorNombre,
            ubicacion: nuevoMovimiento.ubicacion,
            lat: nuevoMovimiento.ubicacion.lat,
            lng: nuevoMovimiento.ubicacion.lng,
            estado: nuevoMovimiento.estado,
            velocidad: nuevoMovimiento.velocidad
          }])
        } catch (errorEvento) {
          console.error('⚠️ Error eventos:', errorEvento)
        }

      } catch (error) {
        console.error(`❌ Error actualizando ${unidadId}:`, error)
      }
    }, 5000)

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ 
      conductorId: conductor.id, 
      unidadId,
      unidadNombre: unidad.Unidad,
      unidadIdReal: unidad.id
    })
  }

  /**
   * 🎬 Iniciar simulación
   */
  const iniciarSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      console.warn('⚠️ Simulación activa')
      return
    }

    const conductoresConUnidad = conductores.filter(c => c.UnidadAsignada)
    
    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ Sin conductores asignados')
      return
    }

    simulacionActiva.value = true
    
    console.log('🎲 Simulación v3.2 - Direcciones actualizadas cada 30s o 50m')
    
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        await iniciarSimulacionUnidad(conductor, unidad)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log(`✅ ${conductoresConUnidad.length} unidades activas con direcciones dinámicas`)
  }

  /**
   * 🛑 Detener simulación
   */
  const detenerSimulacion = async () => {
    console.log('🛑 Deteniendo...')
    
    intervalos.value.forEach(({ intervalo }) => clearInterval(intervalo))
    
    for (const { unidadId, unidadIdReal } of unidadesSimuladas.value) {
      try {
        await iniciarOActualizarRutaDiaria(unidadIdReal, {})
        await remove(dbRef(realtimeDb, `unidades_activas/${unidadId}`))
      } catch (err) {
        console.error(`❌ Error finalizando ${unidadId}:`, err)
      }
    }
    
    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
    
    console.log('✅ Simulación detenida')
  }

  /**
   * 🔄 Toggle
   */
  const toggleSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      await detenerSimulacion()
    } else {
      await iniciarSimulacion(conductores, unidades)
    }
  }

  return {
    simulacionActiva,
    unidadesSimuladas,
    iniciarSimulacion,
    detenerSimulacion,
    toggleSimulacion
  }
}