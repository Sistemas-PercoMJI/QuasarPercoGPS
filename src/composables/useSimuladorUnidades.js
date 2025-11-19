// src/composables/useSimuladorUnidades.js - v3.0 ESTADOS CORREGIDOS
// CAMBIOS:
// ✅ Probabilidades iguales (33.33%) para cada estado
// ✅ Cambio de estado cada 20 segundos EXACTOS
// ✅ Sincronización perfecta con iconos del mapa
// ✅ Actualización precisa del estado visual

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
  
  // 🗺️ Límites de Tijuana
  const LIMITES_TIJUANA = {
    latMin: 32.47,
    latMax: 32.55,
    lngMin: -117.12,
    lngMax: -116.90
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

  // 🎯 CONFIGURACIÓN DE ESTADOS
  const ESTADOS = {
    MOVIMIENTO: 'movimiento',
    DETENIDO: 'detenido',
    INACTIVO: 'inactivo'
  }

  // ⏱️ Cambio de estado cada 20 segundos EXACTOS
  const DURACION_ESTADO = 20000 // 20 segundos

  /**
   * 🔄 Determinar siguiente estado con PROBABILIDADES IGUALES (33.33% cada uno)
   */
  const determinarSiguienteEstado = () => {
    const rand = Math.random()
    
    // Dividir en 3 partes iguales
    if (rand < 0.333) {
      return ESTADOS.MOVIMIENTO
    } else if (rand < 0.666) {
      return ESTADOS.DETENIDO
    } else {
      return ESTADOS.INACTIVO
    }
  }

  /**
   * 🎲 Generar ubicación aleatoria dentro de Tijuana
   */
  const generarUbicacionAleatoria = () => {
    const lat = LIMITES_TIJUANA.latMin + 
      Math.random() * (LIMITES_TIJUANA.latMax - LIMITES_TIJUANA.latMin)
    
    const lng = LIMITES_TIJUANA.lngMin + 
      Math.random() * (LIMITES_TIJUANA.lngMax - LIMITES_TIJUANA.lngMin)
    
    return { lat, lng }
  }

  /**
   * 🎲 Generar destino aleatorio diferente a la posición actual
   */
  const generarDestinoAleatorio = (ubicacionActual) => {
    let nuevoDestino
    let distancia = 0
    
    do {
      nuevoDestino = generarUbicacionAleatoria()
      distancia = calcularDistancia(
        ubicacionActual.lat, 
        ubicacionActual.lng,
        nuevoDestino.lat,
        nuevoDestino.lng
      )
    } while (distancia < 1000)
    
    return nuevoDestino
  }

  /**
   * 📏 Calcular distancia entre dos puntos en metros
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
   * 🧭 Calcular dirección (bearing) entre dos puntos
   */
  const calcularDireccion = (desde, hacia) => {
    const deltaLng = hacia.lng - desde.lng
    const deltaLat = hacia.lat - desde.lat
    const bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  /**
   * 🚗 LÓGICA DE MOVIMIENTO según estado
   */
  const procesarMovimientoUnidad = (estadoActual) => {
    const ahora = Date.now()
    
    // Validar ubicación
    if (!estadoActual.ubicacion?.lat || !estadoActual.ubicacion?.lng) {
      console.error('❌ Estado sin ubicación válida')
      return {
        ubicacion: generarUbicacionAleatoria(),
        direccion: Math.random() * 360,
        estado: ESTADOS.MOVIMIENTO,
        velocidad: 45,
        ignicion: true,
        destinoAleatorio: generarUbicacionAleatoria(),
        tiempoProximoCambioEstado: ahora + DURACION_ESTADO
      }
    }

    // 🔄 VERIFICAR SI DEBE CAMBIAR DE ESTADO (cada 20 segundos exactos)
    if (ahora >= (estadoActual.tiempoProximoCambioEstado || 0)) {
      const nuevoEstado = determinarSiguienteEstado()
      
      console.log(`🔄 ${estadoActual.unidadNombre}: ${estadoActual.estado} → ${nuevoEstado} (${DURACION_ESTADO/1000}s)`)
      
      // ✅ Configurar nuevo estado con datos completos
      if (nuevoEstado === ESTADOS.MOVIMIENTO) {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion || Math.random() * 360,
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40, // 40-60 km/h
          ignicion: true,
          destinoAleatorio: generarDestinoAleatorio(estadoActual.ubicacion),
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          // ✅ Datos esenciales para sincronización
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca
        }
      } 
      else if (nuevoEstado === ESTADOS.DETENIDO) {
        return {
          ubicacion: estadoActual.ubicacion, // NO SE MUEVE
          direccion: estadoActual.direccion,
          estado: ESTADOS.DETENIDO,
          velocidad: 0,
          ignicion: true, // Motor encendido pero detenido
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca
        }
      } 
      else { // INACTIVO
        return {
          ubicacion: estadoActual.ubicacion, // NO SE MUEVE
          direccion: estadoActual.direccion,
          estado: ESTADOS.INACTIVO,
          velocidad: 0,
          ignicion: false, // Motor apagado
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca
        }
      }
    }

    // ✅ MANTENER ESTADO ACTUAL

    // Si está en MOVIMIENTO, actualizar posición
    if (estadoActual.estado === ESTADOS.MOVIMIENTO) {
      if (!estadoActual.destinoAleatorio) {
        estadoActual.destinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
      }
      
      const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000
      const velocidadMs = (estadoActual.velocidad * 1000) / 3600
      const distanciaAMover = velocidadMs * tiempoTranscurrido
      
      const distanciaAlDestino = calcularDistancia(
        estadoActual.ubicacion.lat, 
        estadoActual.ubicacion.lng,
        estadoActual.destinoAleatorio.lat, 
        estadoActual.destinoAleatorio.lng
      )
      
      // Llegó al destino - generar uno nuevo
      if (distanciaAMover >= distanciaAlDestino || distanciaAlDestino < 100) {
        const nuevoDestinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
        
        return {
          ubicacion: estadoActual.destinoAleatorio,
          direccion: calcularDireccion(estadoActual.ubicacion, nuevoDestinoAleatorio),
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40,
          ignicion: true,
          destinoAleatorio: nuevoDestinoAleatorio,
          tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado
        }
      }
      
      // En camino - mover hacia el destino
      const proporcion = distanciaAMover / distanciaAlDestino
      const nuevaLat = estadoActual.ubicacion.lat + 
        (estadoActual.destinoAleatorio.lat - estadoActual.ubicacion.lat) * proporcion
      const nuevaLng = estadoActual.ubicacion.lng + 
        (estadoActual.destinoAleatorio.lng - estadoActual.ubicacion.lng) * proporcion
      
      const latFinal = Math.max(LIMITES_TIJUANA.latMin, Math.min(LIMITES_TIJUANA.latMax, nuevaLat))
      const lngFinal = Math.max(LIMITES_TIJUANA.lngMin, Math.min(LIMITES_TIJUANA.lngMax, nuevaLng))
      
      // Variación aleatoria de velocidad
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
        tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado
      }
    }

    // Si está DETENIDO o INACTIVO, no mover
    return {
      ubicacion: estadoActual.ubicacion,
      direccion: estadoActual.direccion,
      estado: estadoActual.estado,
      velocidad: 0,
      ignicion: estadoActual.estado === ESTADOS.DETENIDO,
      destinoAleatorio: estadoActual.ubicacion,
      tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado
    }
  }

  /**
   * 🚀 Inicia simulación de UNA unidad
   */
  const iniciarSimulacionUnidad = async (conductor, unidad) => {
    const unidadId = `unidad_${unidad.id}`
    
    const ubicacionInicial = generarUbicacionAleatoria()
    const destinoInicialAleatorio = generarDestinoAleatorio(ubicacionInicial)
    const velocidadBase = Math.floor(Math.random() * 20) + 40
    
    // ✅ Estado inicial aleatorio con probabilidades iguales
    const estadoInicial = determinarSiguienteEstado()
    
    console.log(`🚗 ${unidad.Unidad}:`)
    console.log(`   📍 Inicia en: [${ubicacionInicial.lat.toFixed(4)}, ${ubicacionInicial.lng.toFixed(4)}]`)
    console.log(`   🎯 Estado inicial: ${estadoInicial}`)
    console.log(`   ⏱️ Cambio de estado cada: ${DURACION_ESTADO/1000}s`)
    
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
      direccion: calcularDireccion(ubicacionInicial, destinoInicialAleatorio),
      estado: estadoInicial,
      direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
      bateria: Math.floor(Math.random() * 30) + 70,
      ignicion: estadoInicial !== ESTADOS.INACTIVO,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: velocidadBase,
      destinoAleatorio: estadoInicial === ESTADOS.MOVIMIENTO ? destinoInicialAleatorio : ubicacionInicial,
      tiempoProximoCambioEstado: Date.now() + DURACION_ESTADO
    }

    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estado)
    
    // Ruta diaria solo si está en movimiento
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
        console.error(`❌ Error al iniciar ruta diaria:`, err)
      }
    }
    
    // ✅ Intervalo de actualización cada 5 segundos para movimiento suave
    const intervalo = setInterval(async () => {
      try {
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => resolve(snap), reject, { onlyOnce: true })
        })
        
        const estadoActual = snapshot.val()
        if (!estadoActual) return

        // 🎯 PROCESAR MOVIMIENTO CON ESTADOS
        const nuevoMovimiento = procesarMovimientoUnidad(estadoActual)

        // ✅ ACTUALIZACIÓN COMPLETA con todos los campos
        const actualizacion = {
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
          direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
          // ✅ Mantener datos esenciales
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca,
          bateria: estadoActual.bateria
        }

        await update(unidadRef, actualizacion)

        // Actualizar ruta diaria solo si está en movimiento
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
            console.error(`⚠️ Error actualizando ruta diaria:`, errRuta)
          }
        }

        // Evaluar eventos
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
    }, 5000) // ✅ Actualización cada 5 segundos para movimiento fluido

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ 
      conductorId: conductor.id, 
      unidadId,
      unidadNombre: unidad.Unidad,
      unidadIdReal: unidad.id
    })
  }

  /**
   * 🎬 Inicia simulación para múltiples conductores
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
    
    console.log('🎲 Iniciando simulación con ESTADOS REALISTAS v3.0')
    console.log(`📍 Área: Tijuana`)
    console.log(`🔄 Estados: ${ESTADOS.MOVIMIENTO}, ${ESTADOS.DETENIDO}, ${ESTADOS.INACTIVO}`)
    console.log(`⏱️ Cambio de estado: cada ${DURACION_ESTADO/1000} segundos`)
    console.log(`🎯 Probabilidades: 33.33% cada estado`)
    
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        await iniciarSimulacionUnidad(conductor, unidad)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    console.log(`✅ ${conductoresConUnidad.length} unidades activas con estados independientes`)
  }

  /**
   * 🛑 Detiene la simulación
   */
  const detenerSimulacion = async () => {
    console.log('🛑 Deteniendo simulación...')
    
    intervalos.value.forEach(({ intervalo }) => {
      clearInterval(intervalo)
    })
    
    for (const { unidadId, unidadIdReal } of unidadesSimuladas.value) {
      try {
        await iniciarOActualizarRutaDiaria(unidadIdReal, {})
        
        const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
        await remove(unidadRef)
      } catch (err) {
        console.error(`❌ Error finalizando unidad ${unidadId}:`, err)
      }
    }
    
    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
    
    console.log('✅ Simulación detenida')
  }

  /**
   * 🔄 Toggle simulación
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