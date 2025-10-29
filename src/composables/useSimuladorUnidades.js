// src/composables/useSimuladorUnidades.js - Versión 1.0
import { ref } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, set, update, onValue, remove } from 'firebase/database'

export function useSimuladorUnidades() {
  const simulacionActiva = ref(false)
  const intervalos = ref([])
  const unidadesSimuladas = ref([])
  
  // Coordenadas base de Tijuana, BC
  const CENTRO_TIJUANA = {
    lat: 32.5149,
    lng: -117.0382
  }
  
  // Radio aproximado en grados (~10km)
  const RADIO_SIMULACION = 0.09
  
  /**
   * Genera una ubicación aleatoria dentro del radio de Tijuana
   */
  const generarUbicacionAleatoria = () => {
    const angle = Math.random() * 2 * Math.PI
    const radius = Math.random() * RADIO_SIMULACION
    
    return {
      lat: CENTRO_TIJUANA.lat + (radius * Math.cos(angle)),
      lng: CENTRO_TIJUANA.lng + (radius * Math.sin(angle))
    }
  }

  /**
   * Calcula distancia entre dos puntos en metros
   */
  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
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
   * 🔧 CORREGIDO: Mueve una unidad hacia su destino actual
   * Ahora retorna siempre un objeto válido con ubicacion definida
   */
  const moverUnidadHaciaDestino = (unidad, estadoActual) => {
    // 🔧 VALIDACIÓN: Verificar que estadoActual tenga ubicacion
    if (!estadoActual.ubicacion || !estadoActual.ubicacion.lat || !estadoActual.ubicacion.lng) {
      console.error('❌ Estado actual sin ubicación válida:', estadoActual)
      return {
        ubicacion: generarUbicacionAleatoria(),
        direccion: Math.random() * 360,
        estado: 'movimiento',
        velocidad: 40
      }
    }

    if (!unidad.destinoActual || !unidad.ruta || unidad.ruta.length === 0) {
      // Si no hay ruta, usar el movimiento aleatorio original
      return generarMovimiento(
        { ...estadoActual.ubicacion, direccion: estadoActual.direccion },
        estadoActual.velocidad
      )
    }
    
    const ahora = Date.now()
    const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000 // segundos
    
    // Velocidad en metros por segundo
    const velocidadMs = (estadoActual.velocidad * 1000) / 3600
    const distanciaAMover = velocidadMs * tiempoTranscurrido
    
    // Calcular distancia al destino actual
    const distanciaAlDestino = calcularDistancia(
      estadoActual.ubicacion.lat, 
      estadoActual.ubicacion.lng,
      unidad.destinoActual.lat, 
      unidad.destinoActual.lng
    )
    
    // Si llegamos al destino
    if (distanciaAMover >= distanciaAlDestino) {
      // Mover al destino exacto
      const nuevaUbicacion = {
        lat: unidad.destinoActual.lat,
        lng: unidad.destinoActual.lng
      }
      
      console.log(`📍 Unidad ${unidad.unidadNombre} llegó a: ${unidad.destinoActual.nombre} (${unidad.destinoActual.tipo})`)
      
      // Cambiar al siguiente destino
      unidad.indiceRutaActual = (unidad.indiceRutaActual + 1) % unidad.ruta.length
      unidad.destinoActual = unidad.ruta[unidad.indiceRutaActual]
      unidad.ultimoCambioDestino = ahora
      
      // Pequeña pausa en cada destino (simula parada)
      const nuevoEstado = 'detenido'
      const nuevaVelocidad = 0
      
      // Programar reanudación del movimiento después de 3 segundos
      setTimeout(() => {
        // Actualizar a estado de movimiento
        const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidad.unidadId}`)
        update(unidadRef, {
          estado: 'movimiento',
          velocidad: unidad.velocidadBase || 40,
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString()
        })
        
        console.log(`🚗 Unidad ${unidad.unidadNombre} reanudando viaje hacia: ${unidad.destinoActual.nombre}`)
      }, 3000)
      
      return {
        ubicacion: nuevaUbicacion,
        direccion: estadoActual.direccion || 0,
        estado: nuevoEstado,
        velocidad: nuevaVelocidad
      }
    } else {
      // Moverse hacia el destino
      const proporcion = distanciaAMover / distanciaAlDestino
      const nuevaLat = estadoActual.ubicacion.lat + (unidad.destinoActual.lat - estadoActual.ubicacion.lat) * proporcion
      const nuevaLng = estadoActual.ubicacion.lng + (unidad.destinoActual.lng - estadoActual.ubicacion.lng) * proporcion
      
      // Calcular nueva dirección hacia el destino
      const deltaLat = unidad.destinoActual.lat - nuevaLat
      const deltaLng = unidad.destinoActual.lng - nuevaLng
      const nuevaDireccion = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
      
      // Variar velocidad ligeramente
      let nuevaVelocidad = estadoActual.velocidad
      if (Math.random() < 0.1) { // 10% de probabilidad
        nuevaVelocidad = Math.max(30, Math.min(70, nuevaVelocidad + (Math.random() - 0.5) * 10))
      }
      
      return {
        ubicacion: {
          lat: nuevaLat,
          lng: nuevaLng
        },
        direccion: nuevaDireccion,
        estado: 'movimiento',
        velocidad: Math.floor(nuevaVelocidad)
      }
    }
  }

  /**
   * Genera movimiento realista desde una posición
   */
  const generarMovimiento = (ubicacionActual, velocidad) => {
    // Velocidad en km/h convertida a grados por segundo aproximadamente
    const velocidadGrados = (velocidad / 111000) * 5 // 5 segundos
    
    // Dirección aleatoria pero más suave (bias hacia la dirección anterior)
    const variacionAngulo = (Math.random() - 0.5) * (Math.PI / 4) // ±45 grados
    const direccion = (ubicacionActual.direccion || Math.random() * 360) + (variacionAngulo * 180 / Math.PI)
    
    const radianes = (direccion * Math.PI) / 180
    
    return {
      ubicacion: {
        lat: ubicacionActual.lat + (velocidadGrados * Math.cos(radianes)),
        lng: ubicacionActual.lng + (velocidadGrados * Math.sin(radianes))
      },
      direccion: direccion % 360,
      estado: 'movimiento',
      velocidad: velocidad
    }
  }

  /**
   * Obtiene direcciones de calles reales de Tijuana
   */
  const DIRECCIONES_TIJUANA = [
    'Av. Revolución, Centro',
    'Blvd. Agua Caliente',
    'Zona Río',
    'Playas de Tijuana',
    'Mesa de Otay',
    'La Cacho',
    'Otay Constituyentes',
    'Zona Centro',
    'Hipódromo',
    'Colonia Libertad'
  ]

  /**
   * 🔧 CORREGIDO: Inicia la simulación de una unidad específica con rutas inteligentes
   */
  const iniciarSimulacionUnidad = async (conductor, unidad, rutaAsignada = null) => {
    const unidadId = `unidad_${unidad.id}`
    
    // Usar ruta asignada si existe, sino generar ubicación aleatoria
    let ubicacionInicial
    if (rutaAsignada && rutaAsignada.length > 0) {
      ubicacionInicial = {
        lat: rutaAsignada[0].lat,
        lng: rutaAsignada[0].lng
      }
    } else {
      ubicacionInicial = generarUbicacionAleatoria()
    }
    
    // 🔧 VALIDACIÓN: Asegurar que ubicacionInicial sea válida
    if (!ubicacionInicial.lat || !ubicacionInicial.lng) {
      console.error('❌ Ubicación inicial inválida, generando nueva')
      ubicacionInicial = generarUbicacionAleatoria()
    }
    
    // Estado inicial de la unidad
    const estadoInicial = {
      conductorId: conductor.id,
      conductorNombre: `${conductor.Nombre} ${conductor.Apellido}`,
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      ubicacion: ubicacionInicial,
      velocidad: Math.floor(Math.random() * 20) + 40, // 40-60 km/h
      direccion: Math.floor(Math.random() * 360), // 0-360 grados
      estado: 'movimiento',
      direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
      bateria: Math.floor(Math.random() * 30) + 70, // 70-100%
      ignicion: true,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: Math.floor(Math.random() * 20) + 40,
      // Datos de la ruta
      ruta: rutaAsignada || [],
      indiceRutaActual: 0,
      destinoActual: rutaAsignada && rutaAsignada.length > 0 ? rutaAsignada[0] : null
    }

    // Guardar en Realtime Database
    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estadoInicial)
    
    // Crear intervalo para actualizar cada 2 segundos
    const intervalo = setInterval(async () => {
      try {
        // Leer estado actual
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => {
            resolve(snap)
          }, reject, { onlyOnce: true })
        })
        
        const estadoActual = snapshot.val()
        if (!estadoActual) return

        // 🔧 VALIDACIÓN: Verificar que estadoActual tenga datos válidos
        if (!estadoActual.ubicacion || !estadoActual.ubicacion.lat || !estadoActual.ubicacion.lng) {
          console.error('❌ Estado sin ubicación válida, regenerando:', unidadId)
          estadoActual.ubicacion = generarUbicacionAleatoria()
        }

        // Usar movimiento hacia destino si hay ruta
        let nuevoMovimiento
        if (estadoActual.ruta && estadoActual.ruta.length > 0 && estadoActual.destinoActual) {
          nuevoMovimiento = moverUnidadHaciaDestino(estadoActual, estadoActual)
        } else {
          // Movimiento aleatorio original si no hay ruta
          nuevoMovimiento = generarMovimiento(
            { ...estadoActual.ubicacion, direccion: estadoActual.direccion },
            estadoActual.velocidad
          )
        }

        // 🔧 VALIDACIÓN CRÍTICA: Asegurar que ubicacion nunca sea undefined
        if (!nuevoMovimiento.ubicacion || !nuevoMovimiento.ubicacion.lat || !nuevoMovimiento.ubicacion.lng) {
          console.error('❌ Nuevo movimiento sin ubicación válida, usando ubicación actual')
          nuevoMovimiento.ubicacion = estadoActual.ubicacion
        }

        // Actualizar en Firebase con datos validados
        await update(unidadRef, {
          ubicacion: {
            lat: nuevoMovimiento.ubicacion.lat,
            lng: nuevoMovimiento.ubicacion.lng
          },
          velocidad: nuevoMovimiento.velocidad || estadoActual.velocidad || 40,
          direccion: Math.floor(nuevoMovimiento.direccion || estadoActual.direccion || 0),
          estado: nuevoMovimiento.estado || estadoActual.estado || 'movimiento',
          ignicion: nuevoMovimiento.estado !== 'inactivo',
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString(),
          ultimoPuntoTiempo: Date.now(),
          indiceRutaActual: estadoActual.indiceRutaActual || 0,
          destinoActual: estadoActual.destinoActual || null
        })

        console.log(`✅ Unidad ${unidad.Unidad} actualizada - Estado: ${nuevoMovimiento.estado || estadoActual.estado}, Vel: ${nuevoMovimiento.velocidad || estadoActual.velocidad} km/h`)
        
      } catch (error) {
        console.error(`Error actualizando unidad ${unidadId}:`, error)
      }
    }, 2000)

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ 
      conductorId: conductor.id, 
      unidadId,
      unidadNombre: unidad.Unidad
    })
    
    console.log(`🚗 Simulación iniciada para ${conductor.Nombre} en ${unidad.Unidad}`)
  }

  /**
   * Inicia simulación para múltiples conductores con unidades asignadas
   */
  const iniciarSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      console.warn('⚠️ Simulación ya está activa')
      return
    }

    // Filtrar solo conductores que tienen unidad asignada
    const conductoresConUnidad = conductores.filter(c => c.UnidadAsignada)
    
    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ No hay conductores con unidades asignadas')
      return
    }

    simulacionActiva.value = true
    
    // Iniciar simulación para cada conductor
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        const rutaAsignada = unidad.ruta || null
        await iniciarSimulacionUnidad(conductor, unidad, rutaAsignada)
      }
    }
    
    console.log(`✅ Simulación iniciada para ${conductoresConUnidad.length} unidades`)
  }

  /**
   * Detiene la simulación
   */
  const detenerSimulacion = async () => {
    // Detener todos los intervalos
    intervalos.value.forEach(({ intervalo }) => {
      clearInterval(intervalo)
    })
    
    // Limpiar unidades de Firebase
    for (const { unidadId } of unidadesSimuladas.value) {
      const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
      await remove(unidadRef)
    }
    
    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
    
    console.log('🛑 Simulación detenida')
  }

  /**
   * Pausa/reanuda la simulación
   */
  const toggleSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      await detenerSimulacion()
    } else {
      await iniciarSimulacion(conductores, unidades)
    }
  }

  /**
   * Actualiza la ruta de una unidad específica
   */
  const actualizarRutaUnidad = async (unidadId, nuevaRuta) => {
    const unidadRef = dbRef(realtimeDb, `unidades_activas/unidad_${unidadId}`)
    
    await update(unidadRef, {
      ruta: nuevaRuta,
      indiceRutaActual: 0,
      destinoActual: nuevaRuta.length > 0 ? nuevaRuta[0] : null,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString()
    })
    
    console.log(`🛣️ Ruta actualizada para unidad ${unidadId}`)
  }

  return {
    simulacionActiva,
    unidadesSimuladas,
    iniciarSimulacion,
    detenerSimulacion,
    toggleSimulacion,
    actualizarRutaUnidad
  }
}