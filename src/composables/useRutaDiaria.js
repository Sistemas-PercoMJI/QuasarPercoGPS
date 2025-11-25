// src/composables/useRutaDiaria.js - v2.0 CON BATCHING (CORREGIDO)
// ✅ Acumula coordenadas para evitar el error 429
// ✅ Envía datos en lotes (batches) en lugar de individualmente

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

// Buffer global para acumular coordenadas de todas las unidades
// Map<unidadId, Array<coordenadas>>
const coordenadasBuffer = new Map()

// Configuración del batch
const BATCH_SIZE = 10 // Enviar después de 10 coordenadas
const BATCH_INTERVAL_MS = 30000 // O enviar después de 30 segundos (incluso si no hay 10)

// Temporizadores para cada unidad, para asegurar el envío por tiempo
const batchTimers = new Map()

export function useRutaDiaria() {
  const loading = ref(false)
  const error = ref(null)
  
  // 🆕 Usar composable de Storage (sin agregarCoordenada que no se usa)
  const { obtenerCoordenadasDesdeStorage, guardarBatchEnStorage } = useRutasStorage()
  
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
   * 🆕 Agrega una nueva coordenada al buffer de una unidad específica.
   * Esta función ahora es la principal, reemplaza a la llamada directa a Storage.
   * @param {string|number} unidadId - El ID de la unidad.
   * @param {object} datosCoordenada - Los datos de la coordenada a guardar.
   */
  const agregarCoordenadaAlBuffer = async (unidadId, datosCoordenada) => {
    // Si no existe un buffer para esta unidad, créalo
    if (!coordenadasBuffer.has(unidadId)) {
      coordenadasBuffer.set(unidadId, [])
    }

    // Agregar la nueva coordenada al buffer
    const buffer = coordenadasBuffer.get(unidadId)
    buffer.push(datosCoordenada)

    console.log(`📦 Buffer[${unidadId}]: ${buffer.length} coordenadas.`)

    // Si el buffer alcanza el tamaño límite, enviarlo inmediatamente
    if (buffer.length >= BATCH_SIZE) {
      console.log(`✅ Límite de batch alcanzado para unidad ${unidadId}. Enviando...`)
      await enviarBatch(unidadId)
    } else {
      // Si no, programar un envío futuro si no hay uno ya programado
      if (!batchTimers.has(unidadId)) {
        const timerId = setTimeout(() => {
          console.log(`⏰ Tiempo de batch cumplido para unidad ${unidadId}. Enviando...`)
          enviarBatch(unidadId)
        }, BATCH_INTERVAL_MS)
        batchTimers.set(unidadId, timerId)
      }
    }
  }

  /**
   * Función interna que envía las coordenadas acumuladas a Storage.
   * @param {string|number} unidadId - El ID de la unidad cuyo batch se va a enviar.
   */
// En la función enviarBatch, reemplaza la llamada a guardarBatchEnStorage con esta versión mejorada:

const enviarBatch = async (unidadId) => {
  // Limpiar el temporizador si existe
  if (batchTimers.has(unidadId)) {
    clearTimeout(batchTimers.get(unidadId))
    batchTimers.delete(unidadId)
  }

  const coordenadas = coordenadasBuffer.get(unidadId)
  if (!coordenadas || coordenadas.length === 0) {
    return // Nada que enviar
  }

  // Limpiar el buffer inmediatamente para que se puedan acumular nuevos puntos
  coordenadasBuffer.set(unidadId, [])

  try {
    const idRuta = obtenerIdRutaDiaria()
    
    // Preparar los datos para el archivo JSON
    const datosParaStorage = {
      unidadId,
      fecha: idRuta,
      coordenadas: coordenadas, // Enviamos todo el array
      timestampGuardado: new Date().toISOString()
    }

    // 🆕 Llamar a la función de Storage mejorada con el batch completo
    const url = await guardarBatchEnStorage(unidadId, idRuta, datosParaStorage)
    console.log(`🚀 Batch de ${coordenadas.length} coordenadas guardado para unidad ${unidadId}.`)

    // Actualizar el documento en Firestore con la nueva URL y el contador
    const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', idRuta)
    const rutaSnapshot = await getDoc(rutaRef)
    
    if (rutaSnapshot.exists()) {
      // Actualizar ruta existente
      await updateDoc(rutaRef, {
        rutas_url: url,
        total_coordenadas: (rutaSnapshot.data().total_coordenadas || 0) + coordenadas.length,
        fecha_hora_fin: serverTimestamp()
      })
    } else {
      // Crear nueva ruta si no existe
      await setDoc(rutaRef, {
        id: idRuta,
        fecha_hora_inicio: serverTimestamp(),
        fecha_hora_fin: serverTimestamp(),
        duracion_total_minutos: 0,
        paradas: [],
        distancia_recorrida_km: '0',
        tiempo_motor_encendido_minutos: 0,
        tiempo_motor_apagado_minutos: 0,
        conductor_id: coordenadas[0].conductor_id || '',
        conductor_nombre: coordenadas[0].conductor_nombre || '',
        velocidad_maxima: '0',
        velocidad_promedio: '0',
        odometro_inicio: coordenadas[0].odometro_inicio || '0',
        odometro_fin: coordenadas[0].odometro_fin || '0',
        rutas_url: url,
        total_coordenadas: coordenadas.length
      })
    }

    // Actualizar caché
    const cacheKey = `${unidadId}-${idRuta}`
    const coordenadasExistentes = coordenadasCache.value.get(cacheKey) || []
    coordenadasCache.value.set(cacheKey, [...coordenadasExistentes, ...coordenadas])

  } catch (error) {
    console.error(`❌ Error al enviar batch para unidad ${unidadId}:`, error)
    // 🆕 El sistema de reintentos ahora maneja esto automáticamente
    
    // Opcional: podrías intentar reponer las coordenadas en el buffer para reintentar más tarde
    const bufferActual = coordenadasBuffer.get(unidadId) || [];
    coordenadasBuffer.set(unidadId, [...coordenadas, ...bufferActual]);
  }
}

  /**
   * Fuerza el envío de todos los buffers pendientes.
   * Útil al detener la simulación para no perder datos.
   */
  const forzarEnvioDeTodosLosBatches = async () => {
    console.log('🔄 Forzando envío de todos los buffers pendientes...')
    const unidadesEnBuffer = Array.from(coordenadasBuffer.keys())
    await Promise.all(unidadesEnBuffer.map(unidadId => enviarBatch(unidadId)))
    console.log('✅ Todos los buffers forzados a enviarse.')
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
        
        // 🆕 Si hay coordenada inicial, agregarla al buffer en lugar de guardarla directamente
        if (datosActualizacion.nuevaCoordenada) {
          await agregarCoordenadaAlBuffer(unidadId, {
            ...datosActualizacion,
            coordenada: datosActualizacion.nuevaCoordenada
          })
        }
        
        await setDoc(rutaRef, nuevaRuta)
        //console.log('✅ Nueva ruta diaria creada:', idRuta)
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

        // 🆕 AGREGAR COORDENADA AL BUFFER (en lugar de guardarla directamente)
        if (datosActualizacion.nuevaCoordenada) {
          await agregarCoordenadaAlBuffer(unidadId, {
            ...datosActualizacion,
            coordenada: datosActualizacion.nuevaCoordenada
          })
        }

        // Actualizar otros campos si se proporcionan
        if (datosActualizacion.conductor_id) actualizacion.conductor_id = datosActualizacion.conductor_id
        if (datosActualizacion.conductor_nombre) actualizacion.conductor_nombre = datosActualizacion.conductor_nombre
        if (datosActualizacion.odometro_fin) actualizacion.odometro_fin = datosActualizacion.odometro_fin

        await updateDoc(rutaRef, actualizacion)
        //console.log('✅ Ruta diaria actualizada:', idRuta)
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

      //console.log('✅ Historial de rutas cargado:', rutas.length)
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

        //console.log('✅ Parada agregada a la ruta:', idRuta)
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
    //console.log('🧹 Caché de coordenadas limpiado')
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
    limpiarCache, // 🆕
    agregarCoordenadaAlBuffer, // 🆕
    forzarEnvioDeTodosLosBatches // 🆕
  }
}