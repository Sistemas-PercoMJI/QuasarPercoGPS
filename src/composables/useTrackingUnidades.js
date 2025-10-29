// src/composables/useTrackingUnidades.js - CORREGIDO
import { ref, onUnmounted } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, onValue, off } from 'firebase/database'

export function useTrackingUnidades() {
  const unidadesActivas = ref([])
  const loading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  /**
   * Inicia el tracking en tiempo real de todas las unidades activas
   */
  const iniciarTracking = () => {
    loading.value = true
    error.value = null

    try {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')
      
      // Escuchar cambios en tiempo real
      unsubscribe = onValue(unidadesRef, (snapshot) => {
        const data = snapshot.val()
        
        if (data) {
          // 🔧 FIX: Filtrar solo unidades válidas con ubicación completa
          const unidadesValidas = Object.entries(data)
            .filter(([key, value]) => {
              // Validar que tenga estructura completa
              const esValida = value && 
                              value.ubicacion && 
                              typeof value.ubicacion.lat === 'number' &&
                              typeof value.ubicacion.lng === 'number' &&
                              !isNaN(value.ubicacion.lat) &&
                              !isNaN(value.ubicacion.lng) &&
                              value.conductorNombre &&
                              value.unidadNombre
              
              if (!esValida) {
                console.warn(`⚠️ Unidad inválida ignorada: ${key}`, {
                  key,
                  tieneUbicacion: !!value?.ubicacion,
                  tieneLat: value?.ubicacion?.lat,
                  tieneLng: value?.ubicacion?.lng,
                  tieneConductor: !!value?.conductorNombre,
                  tieneUnidad: !!value?.unidadNombre
                })
              }
              
              return esValida
            })
            .map(([key, value]) => ({
              // 🔧 FIX: Usar el ID correcto del objeto
              id: value.unidadId || value.id || key,
              ...value
            }))
          
          unidadesActivas.value = unidadesValidas
          
          console.log(`📡 ${unidadesValidas.length} unidades válidas detectadas (${Object.keys(data).length} totales en Firebase)`)
          
          // 🔧 DEBUG: Mostrar qué unidades son válidas
          if (unidadesValidas.length > 0) {
            unidadesValidas.forEach(u => {
              console.log(`✅ Unidad válida: ${u.conductorNombre} - ${u.unidadNombre} en [${u.ubicacion.lat.toFixed(4)}, ${u.ubicacion.lng.toFixed(4)}]`)
            })
          }
        } else {
          unidadesActivas.value = []
          console.log('📡 No hay unidades activas')
        }
        
        loading.value = false
      }, (err) => {
        console.error('❌ Error en tracking:', err)
        error.value = err.message
        loading.value = false
      })

      console.log('✅ Tracking iniciado con filtrado de unidades válidas')
      
    } catch (err) {
      console.error('❌ Error al iniciar tracking:', err)
      error.value = err.message
      loading.value = false
    }
  }

  /**
   * Detiene el tracking
   */
  const detenerTracking = () => {
    if (unsubscribe) {
      const unidadesRef = dbRef(realtimeDb, 'unidades_activas')
      off(unidadesRef)
      unsubscribe = null
      console.log('🛑 Tracking detenido')
    }
  }

  /**
   * Obtiene una unidad específica por ID
   */
  const obtenerUnidad = (unidadId) => {
    return unidadesActivas.value.find(u => u.id === unidadId || u.unidadId === unidadId)
  }

  /**
   * Filtra unidades por estado
   */
  const unidadesPorEstado = (estado) => {
    if (estado === 'todos') {
      return unidadesActivas.value
    }
    return unidadesActivas.value.filter(u => u.estado === estado)
  }

  /**
   * Cuenta unidades por estado
   */
  const contarPorEstado = () => {
    const conteo = {
      todos: unidadesActivas.value.length,
      movimiento: 0,
      detenido: 0,
      inactivo: 0
    }

    unidadesActivas.value.forEach(unidad => {
      if (conteo[unidad.estado] !== undefined) {
        conteo[unidad.estado]++
      }
    })

    return conteo
  }

  /**
   * Obtiene estadísticas generales
   */
  const estadisticas = () => {
    const total = unidadesActivas.value.length
    const enMovimiento = unidadesActivas.value.filter(u => u.estado === 'movimiento').length
    const detenidas = unidadesActivas.value.filter(u => u.estado === 'detenido').length
    const inactivas = unidadesActivas.value.filter(u => u.estado === 'inactivo').length
    
    const velocidadPromedio = total > 0
      ? unidadesActivas.value.reduce((acc, u) => acc + (u.velocidad || 0), 0) / total
      : 0

    return {
      total,
      enMovimiento,
      detenidas,
      inactivas,
      velocidadPromedio: Math.round(velocidadPromedio),
      porcentajeActivo: total > 0 ? Math.round((enMovimiento / total) * 100) : 0
    }
  }

  // Limpiar al desmontar componente
  onUnmounted(() => {
    detenerTracking()
  })

  return {
    unidadesActivas,
    loading,
    error,
    iniciarTracking,
    detenerTracking,
    obtenerUnidad,
    unidadesPorEstado,
    contarPorEstado,
    estadisticas
  }
}