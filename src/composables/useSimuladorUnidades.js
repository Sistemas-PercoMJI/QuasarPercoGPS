// src/composables/useSimuladorUnidades.js - CON INTEGRACIÓN FIREBASE
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
  
  // 🗺️ Límites de Tijuana (área de movimiento)
  const LIMITES_TIJUANA = {
    latMin: 32.47,   // Sur
    latMax: 32.55,   // Norte
    lngMin: -117.12, // Oeste
    lngMax: -116.90  // Este
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
    'Colonia Libertad',
    'El Florido',
    'Sánchez Taboada',
    'Camino Verde',
    'Cerro Colorado'
  ]

  /**
   * 🎲 Generar ubicación ALEATORIA dentro de Tijuana
   */
  const generarUbicacionAleatoria = () => {
    const lat = LIMITES_TIJUANA.latMin + 
      Math.random() * (LIMITES_TIJUANA.latMax - LIMITES_TIJUANA.latMin)
    
    const lng = LIMITES_TIJUANA.lngMin + 
      Math.random() * (LIMITES_TIJUANA.lngMax - LIMITES_TIJUANA.lngMin)
    
    return { lat, lng }
  }

  /**
   * 🎲 Generar destino ALEATORIO diferente a la posición actual
   */
  const generarDestinoAleatorio = (ubicacionActual) => {
    let nuevoDestino
    let distancia = 0
    
    // Generar destino que esté al menos a 0.01 grados de distancia (~1km)
    do {
      nuevoDestino = generarUbicacionAleatoria()
      distancia = calcularDistancia(
        ubicacionActual.lat, 
        ubicacionActual.lng,
        nuevoDestino.lat,
        nuevoDestino.lng
      )
    } while (distancia < 1000) // Mínimo 1km de distancia
    
    return nuevoDestino
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
   * 🚗 Mover unidad hacia su destino aleatorio
   */
  const moverUnidadHaciaDestinoAleatorio = (estadoActual) => {
    if (!estadoActual.ubicacion || !estadoActual.ubicacion.lat || !estadoActual.ubicacion.lng) {
      console.error('❌ Estado sin ubicación válida')
      return {
        ubicacion: generarUbicacionAleatoria(),
        direccion: Math.random() * 360,
        estado: 'movimiento',
        velocidad: 45,
        destinoAleatorio: generarUbicacionAleatoria()
      }
    }

    // Si no tiene destino o llegó al destino, generar uno nuevo
    if (!estadoActual.destinoAleatorio) {
      estadoActual.destinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
      console.log(`🎯 Nuevo destino aleatorio generado: [${estadoActual.destinoAleatorio.lat.toFixed(4)}, ${estadoActual.destinoAleatorio.lng.toFixed(4)}]`)
    }
    
    const ahora = Date.now()
    const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000
    
    // Calcular distancia que puede recorrer
    const velocidadMs = (estadoActual.velocidad * 1000) / 3600
    const distanciaAMover = velocidadMs * tiempoTranscurrido
    
    // Distancia al destino
    const distanciaAlDestino = calcularDistancia(
      estadoActual.ubicacion.lat, 
      estadoActual.ubicacion.lng,
      estadoActual.destinoAleatorio.lat, 
      estadoActual.destinoAleatorio.lng
    )
    
    // 🎯 LLEGÓ AL DESTINO - Generar uno nuevo
    if (distanciaAMover >= distanciaAlDestino || distanciaAlDestino < 100) {
      const nuevoDestinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
      
      console.log(`✅ Llegó al destino! Nuevo destino: [${nuevoDestinoAleatorio.lat.toFixed(4)}, ${nuevoDestinoAleatorio.lng.toFixed(4)}]`)
      
      return {
        ubicacion: estadoActual.destinoAleatorio,
        direccion: calcularDireccion(estadoActual.ubicacion, nuevoDestinoAleatorio),
        estado: 'movimiento',
        velocidad: Math.floor(Math.random() * 20) + 40, // 40-60 km/h
        destinoAleatorio: nuevoDestinoAleatorio
      }
    }
    
    // 🚗 EN CAMINO - Mover hacia el destino
    const proporcion = distanciaAMover / distanciaAlDestino
    const nuevaLat = estadoActual.ubicacion.lat + 
      (estadoActual.destinoAleatorio.lat - estadoActual.ubicacion.lat) * proporcion
    const nuevaLng = estadoActual.ubicacion.lng + 
      (estadoActual.destinoAleatorio.lng - estadoActual.ubicacion.lng) * proporcion
    
    // Asegurar que no salga de los límites de Tijuana
    const latFinal = Math.max(LIMITES_TIJUANA.latMin, Math.min(LIMITES_TIJUANA.latMax, nuevaLat))
    const lngFinal = Math.max(LIMITES_TIJUANA.lngMin, Math.min(LIMITES_TIJUANA.lngMax, nuevaLng))
    
    const nuevaDireccion = calcularDireccion(
      estadoActual.ubicacion, 
      estadoActual.destinoAleatorio
    )
    
    // Variación aleatoria de velocidad
    let nuevaVelocidad = estadoActual.velocidad
    if (Math.random() < 0.15) {
      nuevaVelocidad = Math.max(35, Math.min(65, nuevaVelocidad + (Math.random() - 0.5) * 12))
    }
    
    return {
      ubicacion: { lat: latFinal, lng: lngFinal },
      direccion: nuevaDireccion,
      estado: 'movimiento',
      velocidad: Math.floor(nuevaVelocidad),
      destinoAleatorio: estadoActual.destinoAleatorio
    }
  }

  /**
   * Calcular dirección (bearing) entre dos puntos
   */
  const calcularDireccion = (desde, hacia) => {
    const deltaLng = hacia.lng - desde.lng
    const deltaLat = hacia.lat - desde.lat
    const bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  /**
   * 🚀 Inicia simulación de UNA unidad con movimiento aleatorio
   */
  const iniciarSimulacionUnidad = async (conductor, unidad) => {
    const unidadId = `unidad_${unidad.id}`
    
    // Ubicación inicial aleatoria (diferente para cada unidad)
    const ubicacionInicial = generarUbicacionAleatoria()
    const destinoInicialAleatorio = generarDestinoAleatorio(ubicacionInicial)
    const velocidadBase = Math.floor(Math.random() * 20) + 40
    
    console.log(`🚗 ${unidad.Unidad}:`)
    console.log(`   📍 Inicia en: [${ubicacionInicial.lat.toFixed(4)}, ${ubicacionInicial.lng.toFixed(4)}]`)
    console.log(`   🎯 Destino aleatorio: [${destinoInicialAleatorio.lat.toFixed(4)}, ${destinoInicialAleatorio.lng.toFixed(4)}]`)
    console.log(`   ⚡ Velocidad: ${velocidadBase} km/h`)
    
    const estadoInicial = {
      id: unidad.id,
      conductorId: conductor.id,
      conductorNombre: `${conductor.Nombre} ${conductor.Apellido}`,
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      ubicacion: ubicacionInicial,
      velocidad: velocidadBase,
      direccion: calcularDireccion(ubicacionInicial, destinoInicialAleatorio),
      estado: 'movimiento',
      direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
      bateria: Math.floor(Math.random() * 30) + 70,
      ignicion: true,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: velocidadBase,
      destinoAleatorio: destinoInicialAleatorio
    }

    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estadoInicial)
    
    // 🆕 REGISTRAR INICIO DE RUTA DIARIA
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
      console.log(`📝 Ruta diaria iniciada para ${unidad.Unidad}`)
    } catch (err) {
      console.error(`❌ Error al iniciar ruta diaria:`, err)
    }
    
    // Intervalo de actualización
    const intervalo = setInterval(async () => {
      try {
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => resolve(snap), reject, { onlyOnce: true })
        })
        
        const estadoActual = snapshot.val()
        if (!estadoActual) return

        // 🎲 Mover hacia destino aleatorio
        const nuevoMovimiento = moverUnidadHaciaDestinoAleatorio(estadoActual)

        // Actualizar en Firebase Realtime Database
        await update(unidadRef, {
          ubicacion: nuevoMovimiento.ubicacion,
          velocidad: nuevoMovimiento.velocidad,
          direccion: Math.floor(nuevoMovimiento.direccion),
          estado: nuevoMovimiento.estado,
          ignicion: true,
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString(),
          ultimoPuntoTiempo: Date.now(),
          destinoAleatorio: nuevoMovimiento.destinoAleatorio,
          direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)]
        })

        // 🆕 ACTUALIZAR RUTA DIARIA EN FIRESTORE
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
          console.error(`⚠️ Error actualizando ruta diaria:`, errRuta)
        }

        // 🆕 EVALUAR EVENTOS (esto también registra en Firebase automáticamente)
        try {
          const unidadParaEvaluar = {
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
          }
          await evaluarEventosParaUnidadesSimulacion([unidadParaEvaluar])
        } catch (errorEvento) {
          console.error('⚠️ Error evaluando eventos:', errorEvento)
        }

      } catch (error) {
        console.error(`❌ Error actualizando ${unidadId}:`, error)
      }
    }, 10000) // Actualizar cada 10 segundos

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ 
      conductorId: conductor.id, 
      unidadId,
      unidadNombre: unidad.Unidad,
      unidadIdReal: unidad.id // 🆕 Guardar ID real de la unidad
    })
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
    
    console.log('🎲 Iniciando simulación con MOVIMIENTO ALEATORIO + FIREBASE')
    console.log(`📍 Área de movimiento: Tijuana`)
    console.log(`💾 Registrando rutas diarias y eventos en Firebase`)
    
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        await iniciarSimulacionUnidad(conductor, unidad)
        // Pequeño delay entre unidades
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log(`✅ ${conductoresConUnidad.length} unidades activas con registro en Firebase`)
  }

  /**
   * Detiene la simulación
   */
  const detenerSimulacion = async () => {
    console.log('🛑 Deteniendo simulación...')
    
    intervalos.value.forEach(({ intervalo }) => {
      clearInterval(intervalo)
    })
    
    // 🆕 FINALIZAR RUTAS DIARIAS
    for (const { unidadId, unidadIdReal } of unidadesSimuladas.value) {
      try {
        // Actualizar ruta diaria con hora de fin
        await iniciarOActualizarRutaDiaria(unidadIdReal, {
          // La función ya maneja automáticamente fecha_hora_fin y duración
        })
        
        // Eliminar de Realtime Database
        const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
        await remove(unidadRef)
        
        console.log(`✅ Ruta finalizada para unidad ${unidadIdReal}`)
      } catch (err) {
        console.error(`❌ Error finalizando unidad ${unidadId}:`, err)
      }
    }
    
    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
    
    console.log('✅ Simulación detenida y rutas finalizadas')
  }

  /**
   * Toggle simulación
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