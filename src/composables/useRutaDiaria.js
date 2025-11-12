// src/composables/useRutaDiaria.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
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

export function useRutaDiaria() {
  const loading = ref(false)
  const error = ref(null)

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
   * Crea o actualiza la ruta diaria de una unidad
   */
  const iniciarOActualizarRutaDiaria = async (unidadId, datosActualizacion = {}) => {
    loading.value = true
    error.value = null

    try {
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
          rutas: datosActualizacion.rutas || [],
          ...datosActualizacion
        }
        
        await setDoc(rutaRef, nuevaRuta)
        console.log('✅ Nueva ruta diaria creada:', idRuta)
        return { id: idRuta, ...nuevaRuta }
      } else {
        // ✅ ACTUALIZAR RUTA EXISTENTE
        const datosActuales = rutaSnapshot.data()
        
        const actualizacion = {
          fecha_hora_fin: serverTimestamp(),
          ...datosActualizacion
        }

        // Calcular duración si hay fecha de inicio
        if (datosActuales.fecha_hora_inicio && datosActuales.fecha_hora_inicio.seconds) {
          const inicio = datosActuales.fecha_hora_inicio.toDate()
          const fin = new Date()
          const duracionMinutos = Math.floor((fin - inicio) / (1000 * 60))
          actualizacion.duracion_total_minutos = duracionMinutos
        }

        // Actualizar velocidad máxima si es necesaria
        if (datosActualizacion.velocidad_actual) {
          const velActual = parseFloat(datosActualizacion.velocidad_actual)
          const velMaxima = parseFloat(datosActuales.velocidad_maxima || '0')
          if (velActual > velMaxima) {
            actualizacion.velocidad_maxima = String(velActual)
          }
        }

        // Agregar coordenadas a la ruta si se proporcionan
        if (datosActualizacion.nuevaCoordenada) {
          const rutasActuales = datosActuales.rutas || []
          actualizacion.rutas = [...rutasActuales, datosActualizacion.nuevaCoordenada]
        }

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

  return {
    loading,
    error,
    obtenerIdRutaDiaria,
    iniciarOActualizarRutaDiaria,
    obtenerRutaDiariaActual,
    obtenerHistorialRutas,
    agregarParada
  }
}