// src/composables/useSimuladorUnidades.js - Versión 2.0 CORREGIDA
import { ref } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, set, update, onValue, remove } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection' // 🔧 NUEVO

export function useSimuladorUnidades() {
  const simulacionActiva = ref(false)
  const intervalos = ref([])
  const unidadesSimuladas = ref([])
  
  // 🔧 NUEVO: Obtener función para evaluar eventos
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  
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
   * Mueve una unidad hacia su destino actual
   */
  const moverUnidadHaciaDestino = (unidad, estadoActual) => {
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
      return generarMovimiento(
        { ...estadoActual.ubicacion, direccion: estadoActual.direccion },
        estadoActual.velocidad
      )
    }
    
    const ahora = Date.now()
    const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000
    
    const velocidadMs = (estadoActual.velocidad * 1000) / 3600
    const distanciaAMover = velocidadMs * tiempoTranscurrido
    
    const distanciaAlDestino = calcularDistancia(
      estadoActual.ubicacion.lat, 
      estadoActual.ubicacion.lng,
      unidad.destinoActual.lat, 
      unidad.destinoActual.lng
    )
    
    if (distanciaAMover >= distanciaAlDestino) {
      const nuevaUbicacion = {
        lat: unidad.destinoActual.lat,
        lng: unidad.destinoActual.lng
      }
      
      console.log(`📍 Unidad ${unidad.unidadNombre} llegó a: ${unidad.destinoActual.nombre} (${unidad.destinoActual.tipo})`)
      
      unidad.indiceRutaActual = (unidad.indiceRutaActual + 1) % unidad.ruta.length
      unidad.destinoActual = unidad.ruta[unidad.indiceRutaActual]
      unidad.ultimoCambioDestino = ahora
      
      const nuevoEstado = 'detenido'
      const nuevaVelocidad = 0
      
      setTimeout(() => {
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
      const proporcion = distanciaAMover / distanciaAlDestino
      const nuevaLat = estadoActual.ubicacion.lat + (unidad.destinoActual.lat - estadoActual.ubicacion.lat) * proporcion
      const nuevaLng = estadoActual.ubicacion.lng + (unidad.destinoActual.lng - estadoActual.ubicacion.lng) * proporcion
      
      const deltaLat = unidad.destinoActual.lat - nuevaLat
      const deltaLng = unidad.destinoActual.lng - nuevaLng
      const nuevaDireccion = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
      
      let nuevaVelocidad = estadoActual.velocidad
      if (Math.random() < 0.1) {
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
  
  const generarMovimiento = (ubicacionActual, velocidad) => {
    const velocidadGrados = (velocidad / 111000) * 5
    const variacionAngulo = (Math.random() - 0.5) * (Math.PI / 4)
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
   * 🔧 CORREGIDO: Inicia la simulación de una unidad con DETECCIÓN DE EVENTOS
   */
  const iniciarSimulacionUnidad = async (conductor, unidad, rutaAsignada = null, indiceUnidad = 0) => {
    const unidadId = `unidad_${unidad.id}`
    
    // 🔧 FIX 1: Cada unidad empieza en un punto DIFERENTE de su ruta
    let ubicacionInicial
    if (rutaAsignada && rutaAsignada.length > 0) {
      // Usar el índice de la unidad para determinar punto de inicio
      const puntoInicio = indiceUnidad % rutaAsignada.length
      ubicacionInicial = {
        lat: rutaAsignada[puntoInicio].lat,
        lng: rutaAsignada[puntoInicio].lng
      }
      console.log(`🎯 Unidad ${unidad.Unidad} inicia en punto ${puntoInicio}: ${rutaAsignada[puntoInicio].nombre}`)
    } else {
      ubicacionInicial = generarUbicacionAleatoria()
    }
    
    if (!ubicacionInicial.lat || !ubicacionInicial.lng) {
      console.error('❌ Ubicación inicial inválida, generando nueva')
      ubicacionInicial = generarUbicacionAleatoria()
    }
    
    const estadoInicial = {
      id: unidad.id, // 🔧 AÑADIDO para evitar warnings
      conductorId: conductor.id,
      conductorNombre: `${conductor.Nombre} ${conductor.Apellido}`,
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      ubicacion: ubicacionInicial,
      velocidad: Math.floor(Math.random() * 20) + 40,
      direccion: Math.floor(Math.random() * 360),
      estado: 'movimiento',
      direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
      bateria: Math.floor(Math.random() * 30) + 70,
      ignicion: true,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: Math.floor(Math.random() * 20) + 40,
      ruta: rutaAsignada || [],
      indiceRutaActual: indiceUnidad % (rutaAsignada?.length || 1), // 🔧 Cada uno empieza en índice diferente
      destinoActual: rutaAsignada && rutaAsignada.length > 0 ? 
        rutaAsignada[(indiceUnidad + 1) % rutaAsignada.length] : null // 🔧 Siguiente destino diferente
    }

    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estadoInicial)
    
    // 🔧 FIX 2: Intervalo CON detección de eventos
    const intervalo = setInterval(async () => {
      try {
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => {
            resolve(snap)
          }, reject, { onlyOnce: true })
        })
        
        const estadoActual = snapshot.val()
        if (!estadoActual) return

        if (!estadoActual.ubicacion || !estadoActual.ubicacion.lat || !estadoActual.ubicacion.lng) {
          console.error('❌ Estado sin ubicación válida, regenerando:', unidadId)
          estadoActual.ubicacion = generarUbicacionAleatoria()
        }

        let nuevoMovimiento
        if (estadoActual.ruta && estadoActual.ruta.length > 0 && estadoActual.destinoActual) {
          nuevoMovimiento = moverUnidadHaciaDestino(estadoActual, estadoActual)
        } else {
          nuevoMovimiento = generarMovimiento(
            { ...estadoActual.ubicacion, direccion: estadoActual.direccion },
            estadoActual.velocidad
          )
        }

        if (!nuevoMovimiento.ubicacion || !nuevoMovimiento.ubicacion.lat || !nuevoMovimiento.ubicacion.lng) {
          console.error('❌ Nuevo movimiento sin ubicación válida, usando ubicación actual')
          nuevoMovimiento.ubicacion = estadoActual.ubicacion
        }

        // 🔧 FIX 3: Crear objeto para evaluación de eventos
        const unidadParaEvaluar = {
          id: unidad.id,
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          unidadNombre: estadoActual.unidadNombre,
          ubicacion: {
            lat: nuevoMovimiento.ubicacion.lat,
            lng: nuevoMovimiento.ubicacion.lng
          },
          estado: nuevoMovimiento.estado || estadoActual.estado,
          velocidad: nuevoMovimiento.velocidad || estadoActual.velocidad
        }

        // Actualizar en Firebase
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

        // 🔧 FIX 4: EVALUAR EVENTOS después de actualizar
        try {
          await evaluarEventosParaUnidadesSimulacion([unidadParaEvaluar])
        } catch (errorEvento) {
          console.error('⚠️ Error evaluando eventos para unidad:', errorEvento)
        }

        console.log(`✅ Unidad ${unidad.Unidad} actualizada - ${nuevoMovimiento.estado} - ${nuevoMovimiento.velocidad} km/h - Eventos evaluados`)
        
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
   * Inicia simulación para múltiples conductores
   */
  const iniciarSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      console.warn('⚠️ Simulación ya está activa')
      return
    }

    const conductoresConUnidad = conductores.filter(c => c.UnidadAsignada)
    
    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ No hay conductores con unidades asignadas')
      return
    }

    simulacionActiva.value = true
    
    // 🔧 FIX 5: Pasar índice a cada unidad para que empiecen en puntos diferentes
    let indice = 0
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        const rutaAsignada = unidad.ruta || null
        await iniciarSimulacionUnidad(conductor, unidad, rutaAsignada, indice)
        indice++
      }
    }
    
    console.log(`✅ Simulación iniciada para ${conductoresConUnidad.length} unidades con detección de eventos activa`)
  }

  /**
   * Detiene la simulación
   */
  const detenerSimulacion = async () => {
    intervalos.value.forEach(({ intervalo }) => {
      clearInterval(intervalo)
    })
    
    for (const { unidadId } of unidadesSimuladas.value) {
      const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
      await remove(unidadRef)
    }
    
    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
    
    console.log('🛑 Simulación detenida - Eventos desactivados')
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