// src/composables/useSimuladorUnidades.js
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

  // Estados posibles de las unidades
  const ESTADOS = ['movimiento', 'detenido', 'inactivo']
  
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
      lat: ubicacionActual.lat + (velocidadGrados * Math.cos(radianes)),
      lng: ubicacionActual.lng + (velocidadGrados * Math.sin(radianes)),
      direccion: direccion % 360
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
   * Inicia la simulación de una unidad específica
   */
  const iniciarSimulacionUnidad = async (conductor, unidad) => {
    const unidadId = `unidad_${unidad.id}`
    const ubicacionInicial = generarUbicacionAleatoria()
    
    // Estado inicial de la unidad
    const estadoInicial = {
      conductorId: conductor.id,
      conductorNombre: `${conductor.Nombre} ${conductor.Apellido}`,
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      ubicacion: {
        lat: ubicacionInicial.lat,
        lng: ubicacionInicial.lng
      },
      velocidad: Math.floor(Math.random() * 80) + 10, // 10-90 km/h
      direccion: Math.floor(Math.random() * 360), // 0-360 grados
      estado: ESTADOS[Math.floor(Math.random() * ESTADOS.length)],
      direccionTexto: DIRECCIONES_TIJUANA[Math.floor(Math.random() * DIRECCIONES_TIJUANA.length)],
      bateria: Math.floor(Math.random() * 30) + 70, // 70-100%
      ignicion: Math.random() > 0.3, // 70% probabilidad de estar encendido
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString()
    }

    // Guardar en Realtime Database
    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)
    await set(unidadRef, estadoInicial)
    
    // Crear intervalo para actualizar cada 5 segundos
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

        // Calcular nuevo estado
        let nuevaUbicacion = estadoActual.ubicacion
        let nuevaVelocidad = estadoActual.velocidad
        let nuevoEstado = estadoActual.estado

        // Simular cambios de estado ocasionales
        if (Math.random() > 0.9) { // 10% de cambiar estado
          nuevoEstado = ESTADOS[Math.floor(Math.random() * ESTADOS.length)]
        }

        // Si está en movimiento, actualizar ubicación
        if (nuevoEstado === 'movimiento') {
          const movimiento = generarMovimiento(
            { ...nuevaUbicacion, direccion: estadoActual.direccion },
            nuevaVelocidad
          )
          nuevaUbicacion = {
            lat: movimiento.lat,
            lng: movimiento.lng
          }
          
          // Variar velocidad ligeramente
          nuevaVelocidad = Math.max(10, Math.min(90, 
            nuevaVelocidad + (Math.random() - 0.5) * 10
          ))
          
          // Actualizar dirección
          estadoActual.direccion = movimiento.direccion
        } else {
          nuevaVelocidad = 0
        }

        // Actualizar en Firebase
        await update(unidadRef, {
          ubicacion: nuevaUbicacion,
          velocidad: Math.floor(nuevaVelocidad),
          direccion: Math.floor(estadoActual.direccion),
          estado: nuevoEstado,
          ignicion: nuevoEstado !== 'inactivo',
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString()
        })

        console.log(`✅ Unidad ${unidad.Unidad} actualizada - Estado: ${nuevoEstado}, Vel: ${Math.floor(nuevaVelocidad)} km/h`)
        
      } catch (error) {
        console.error(`Error actualizando unidad ${unidadId}:`, error)
      }
    }, 5000) // Actualizar cada 5 segundos

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({ conductorId: conductor.id, unidadId })
    
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
        await iniciarSimulacionUnidad(conductor, unidad)
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

  return {
    simulacionActiva,
    unidadesSimuladas,
    iniciarSimulacion,
    detenerSimulacion,
    toggleSimulacion
  }
}