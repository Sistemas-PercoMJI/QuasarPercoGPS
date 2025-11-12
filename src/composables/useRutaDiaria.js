// src/composables/useRutaDiaria.js - CON STORAGE
import { ref } from 'vue'
import { db, auth } from 'src/firebase/firebaseConfig'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { useRutasStorage } from './useRutasStorage'

export function useRutaDiaria() {
  const loading = ref(false)
  const error = ref(null)
  
  // 🆕 Usar composable de Storage
  const { agregarCoordenada, obtenerUrlRutas, obtenerCoordenadasDesdeStorage } = useRutasStorage()
  
  // 🆕 Cache en memoria para coordenadas (evita leer Storage constantemente)
  const coordenadasCache = ref(new Map())

  /**
   * Verificar autenticación
   */
  const verificarAutenticacion = () => {
    const user = auth.currentUser
    if (!user) {
      console.error('❌ Usuario no autenticado')
      throw new Error('Usuario no autenticado')
    }
    return user
  }

  /**
   * Obtiene el ID de la ruta diaria actual (formato: YYYY-MM-DD)
   */
  const obtenerIdRutaDiaria = () => {
    const ahora = new Date()
    const year = ahora.getFullYear()
    const month = String(ahora.getMonth() + 1).padStart(2, '0')
    const day = String(ahora.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 🆕 Obtiene las coordenadas del caché o las descarga
   */
  const obtenerCoordenadasCache = async (unidadId, fecha) => {
    const cacheKey = `${unidadId}-${fecha}`
    
    // Si está en caché, retornar
    if (coordenadasCache.value.has(cacheKey)) {
      return coordenadasCache.value.get(cacheKey)
    }
    
    // Si no está en caché, intentar cargar desde Storage
    try {
      const url = await obtenerUrlRutas(unidadId, fecha)
      if (url) {
        const coordenadas = await obtenerCoordenadasDesdeStorage(url)
        coordenadasCache.value.set(cacheKey, coordenadas)
        return coordenadas
      }
    } catch (err) {
      console.warn('⚠️ No se pudieron cargar coordenadas previas:', err)
    }
    
    // Si no existe, retornar array vacío
    return []
  }

  /**
   * Crea o actualiza la ruta diaria de una unidad
   */
  const iniciarOActualizarRutaDiaria = async (unidadId, datosActualizacion = {}) => {
    loading.value = true
    error.value = null

    try {
      verificarAutenticacion()
      
      const idRuta = obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', idRuta)
      
      // Verificar si ya existe la ruta del día
      const rutaSnapshot = await getDoc(rutaRef)
      
      if (!rutaSnapshot.exists()) {
        // ✅ CREAR NUEVA RUTA DIARIA
        const nuevaRuta = {
          id: idRuta,
          fecha_hora_inicio: serverTimestamp(),
          fecha_hora_fin: null,
          duracion_total_minutos: 0,
          paradas: [],
          distancia_recorrida_km: '0',
          tiempo_motor_encendido_minutos: 0,
          tiempo_motor_apagado_minutos: 0,
          conductor_id: datosActualizacion.conductor_id || '',
          conductor_nombre: datosActualizacion.conductor_nombre || '',
          velocidad_maxima: '0',
          velocidad_promedio: '0',
          odometro_inicio: datosActualizacion.odometro_inicio || '0',
          odometro_fin: datosActualizacion.odometro_fin || '0',
          rutas_url: null, // 🆕 URL del archivo JSON en Storage
          total_coordenadas: 0 // 🆕 Contador de coordenadas
        }
        
        // 🆕 Si hay coordenada inicial, guardarla en Storage
        if (datosActualizacion.nuevaCoordenada) {
          const resultado = await agregarCoordenada(
            unidadId, 
            idRuta, 
            datosActualizacion.nuevaCoordenada,
            []
          )
          nuevaRuta.rutas_url = resultado.url
          nuevaRuta.total_coordenadas = 1
          
          // Actualizar caché
          coordenadasCache.value.set(`${unidadId}-${idRuta}`, resultado.coordenadas)
        }
        
        await setDoc(rutaRef, nuevaRuta)
        console.log('✅ Nueva ruta diaria creada:', idRuta)
        return { id: idRuta, ...nuevaRuta }
      } else {
        // ✅ ACTUALIZAR RUTA EXISTENTE
        const datosActuales = rutaSnapshot.data()
        
        const actualizacion = {
          fecha_hora_fin: serverTimestamp()
        }

        // Calcular duración
        if (datosActuales.fecha_hora_inicio && datosActuales.fecha_hora_inicio.seconds) {
          const inicio = datosActuales.fecha_hora_inicio.toDate()
          const fin = new Date()
          const duracionMinutos = Math.floor((fin - inicio) / (1000 * 60))
          actualizacion.duracion_total_minutos = duracionMinutos
        }

        // Actualizar velocidad máxima
        if (datosActualizacion.velocidad_actual) {
          const velActual = parseFloat(datosActualizacion.velocidad_actual)
          const velMaxima = parseFloat(datosActuales.velocidad_maxima || '0')
          if (velActual > velMaxima) {
            actualizacion.velocidad_maxima = String(velActual)
          }
        }

        // 🆕 GUARDAR COORDENADA EN STORAGE (en lugar de array en Firestore)
        if (datosActualizacion.nuevaCoordenada) {
          // Obtener coordenadas existentes del caché
          const coordenadasExistentes = await obtenerCoordenadasCache(unidadId, idRuta)
          
          // Agregar nueva coordenada
          const resultado = await agregarCoordenada(
            unidadId,
            idRuta,
            datosActualizacion.nuevaCoordenada,
            coordenadasExistentes
          )
          
          actualizacion.rutas_url = resultado.url
          actualizacion.total_coordenadas = resultado.totalCoordenadas
          
          // Actualizar caché
          coordenadasCache.value.set(`${unidadId}-${idRuta}`, resultado.coordenadas)
          
          console.log(`📍 Coordenada agregada. Total: ${resultado.totalCoordenadas}`)
        }

        // Actualizar otros campos si se proporcionan
        if (datosActualizacion.conductor_id) actualizacion.conductor_id = datosActualizacion.conductor_id
        if (datosActualizacion.conductor_nombre) actualizacion.conductor_nombre = datosActualizacion.conductor_nombre
        if (datosActualizacion.odometro_fin) actualizacion.odometro_fin = datosActualizacion.odometro_fin

        await updateDoc(rutaRef, actualizacion)
        console.log('✅ Ruta diaria actualizada:', idRuta)
        return { id: idRuta, ...datosActuales, ...actualizacion }
      }
    } catch (err) {
      error.value = err.message
      console.error('❌ Error en ruta diaria:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene la ruta diaria actual de una unidad
   */
  const obtenerRutaDiariaActual = async (unidadId) => {
    loading.value = true
    error.value = null

    try {
      const idRuta = obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', idRuta)
      const rutaSnapshot = await getDoc(rutaRef)

      if (rutaSnapshot.exists()) {
        return { id: rutaSnapshot.id, ...rutaSnapshot.data() }
      }
      
      return null
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener ruta diaria:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 🆕 Obtiene la ruta completa con coordenadas desde Storage
   */
  const obtenerRutaDiariaConCoordenadas = async (unidadId) => {
    try {
      const rutaDiaria = await obtenerRutaDiariaActual(unidadId)
      
      if (rutaDiaria && rutaDiaria.rutas_url) {
        // Descargar coordenadas desde Storage
        const coordenadas = await obtenerCoordenadasDesdeStorage(rutaDiaria.rutas_url)
        return {
          ...rutaDiaria,
          coordenadas
        }
      }
      
      return rutaDiaria
    } catch (err) {
      console.error('❌ Error al obtener ruta con coordenadas:', err)
      throw err
    }
  }

  /**
   * Obtiene todas las rutas diarias de una unidad
   */
  const obtenerHistorialRutas = async (unidadId) => {
    loading.value = true
    error.value = null

    try {
      const rutasRef = collection(db, 'Unidades', unidadId, 'RutaDiaria')
      const q = query(rutasRef, orderBy('fecha_hora_inicio', 'desc'))
      const snapshot = await getDocs(q)

      const rutas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      console.log('✅ Historial de rutas cargado:', rutas.length)
      return rutas
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener historial:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Agregar una parada a la ruta diaria
   */
  const agregarParada = async (unidadId, paradaData) => {
    loading.value = true
    error.value = null

    try {
      const idRuta = obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', idRuta)
      const rutaSnapshot = await getDoc(rutaRef)

      if (rutaSnapshot.exists()) {
        const datosActuales = rutaSnapshot.data()
        const paradasActuales = datosActuales.paradas || []

        const nuevaParada = {
          timestamp: Timestamp.now(),
          coordenadas: paradaData.coordenadas,
          duracion_minutos: paradaData.duracion_minutos || 0,
          direccion: paradaData.direccion || '',
          ...paradaData
        }

        await updateDoc(rutaRef, {
          paradas: [...paradasActuales, nuevaParada]
        })

        console.log('✅ Parada agregada a la ruta:', idRuta)
      }
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al agregar parada:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 🆕 Limpiar caché de coordenadas
   */
  const limpiarCache = () => {
    coordenadasCache.value.clear()
    console.log('🧹 Caché de coordenadas limpiado')
  }

  return {
    loading,
    error,
    obtenerIdRutaDiaria,
    iniciarOActualizarRutaDiaria,
    obtenerRutaDiariaActual,
    obtenerRutaDiariaConCoordenadas, // 🆕
    obtenerHistorialRutas,
    agregarParada,
    limpiarCache // 🆕
  }
}
