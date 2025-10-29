// src/composables/useSimuladorUnidades.js - MOVIMIENTO ALEATORIO TOTAL
import { ref } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, set, update, onValue, remove } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'

export function useSimuladorUnidades() {
  const simulacionActiva = ref(false)
  const intervalos = ref([])
  const unidadesSimuladas = ref([])
  
  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  
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
      destinoAleatorio: destinoInicialAleatorio // 🔧 Destino aleatorio
    }

    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estadoInicial)
    
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

        // Actualizar en Firebase
        await update(unidadRef, {
          ubicacion: nuevoMovimiento.ubicacion,
          velocidad: nuevoMovimiento.velocidad,
          direccion: Math.floor(nuevoMovimiento.direccion),
          estado: nuevoMovimiento.estado,
          ignicion: true,
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString(),
          ultimoPuntoTiempo: Date.now(),
          destinoAleatorio: nuevoMovimiento.destinoAleatorio, // Guardar destino actual
          direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)]
        })

        // Evaluar eventos
        try {
          const unidadParaEvaluar = {
            id: unidad.id,
            conductorId: estadoActual.conductorId,
            conductorNombre: estadoActual.conductorNombre,
            unidadNombre: estadoActual.unidadNombre,
            ubicacion: nuevoMovimiento.ubicacion,
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
    }, 2000) // Actualizar cada 2 segundos

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ 
      conductorId: conductor.id, 
      unidadId,
      unidadNombre: unidad.Unidad
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
    
    console.log('🎲 Iniciando simulación con MOVIMIENTO ALEATORIO')
    console.log(`📍 Área de movimiento: Tijuana [${LIMITES_TIJUANA.latMin}, ${LIMITES_TIJUANA.lngMin}] a [${LIMITES_TIJUANA.latMax}, ${LIMITES_TIJUANA.lngMax}]`)
    
    let indice = 0
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        await iniciarSimulacionUnidad(conductor, unidad, indice)
        indice++
      }
    }
    
    console.log(`✅ ${conductoresConUnidad.length} unidades moviéndose aleatoriamente por Tijuana`)
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
    
    console.log('🛑 Simulación detenida')
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