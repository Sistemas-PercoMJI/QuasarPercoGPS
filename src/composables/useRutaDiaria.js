import { ref } from 'vue'
import { db, auth } from 'src/firebase/firebaseConfig'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useRutasStorage } from './useRutasStorage'

export function useRutaDiaria() {
  const loading = ref(false)
  const error = ref(null)

  const verificarAutenticacion = () => {
    const user = auth.currentUser
    if (!user) {
      console.error('Usuario no autenticado')
      throw new Error('Usuario no autenticado')
    }
    return user
  }

  const obtenerIdRutaDiaria = () => {
    const ahora = new Date()
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  }

  const limpiarNombreConductor = (nombre) => {
    return nombre.replace(/\s+undefined$/i, '').trim()
  }

  /**
   * 🔥 FUNCIÓN PRINCIPAL: Agrega coordenada en formato SIMPLE
   */
  const agregarCoordenadaSimple = async (unidadId, datosCoordenada) => {
    loading.value = true

    try {
      verificarAutenticacion()
      const fecha = obtenerIdRutaDiaria()

      // 🔥 FILTRO: Solo agregar si pasaron al menos 8 segundos
      const MIN_INTERVALO_MS = 8000

      let debeAgregar = true
      let coordenadasExistentes = []

      // 🆕 Obtener coordenadas directamente desde Storage (sin Firestore)
      try {
        const { obtenerCoordenadasDesdeStorage } = useRutasStorage()
        coordenadasExistentes = await obtenerCoordenadasDesdeStorage(unidadId, fecha)

        // Verificar intervalo con última coordenada
        if (coordenadasExistentes.length > 0) {
          const ultimaCoord = coordenadasExistentes[coordenadasExistentes.length - 1]
          const ultimoTimestamp = new Date(ultimaCoord.timestamp).getTime()
          const ahora = Date.now()

          if (ahora - ultimoTimestamp < MIN_INTERVALO_MS) {
            const segundosTranscurridos = Math.round((ahora - ultimoTimestamp) / 1000)
            console.log(`Omitiendo coordenada: Solo ${segundosTranscurridos}s desde la última`)
            debeAgregar = false
          }
        }
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // Si falla (ej: archivo no existe), continuar normalmente
        console.warn('Archivo de rutas no existe aún, creando primera coordenada...')
      }

      if (!debeAgregar) {
        loading.value = false
        return false
      }

      // Preparar nueva coordenada EN FORMATO SIMPLE
      const nuevaCoordenadaSimple = {
        lat: datosCoordenada.nuevaCoordenada?.lat || datosCoordenada.lat || 0,
        lng: datosCoordenada.nuevaCoordenada?.lng || datosCoordenada.lng || 0,
        timestamp:
          datosCoordenada.nuevaCoordenada?.timestamp ||
          datosCoordenada.timestamp ||
          new Date().toISOString(),
      }

      // Agregar al array existente
      const todasLasCoordenadas = [...coordenadasExistentes, nuevaCoordenadaSimple]

      // Subir TODO el array a Storage (SOBRESCRIBIR archivo)
      const { guardarCoordenadasEnStorage } = useRutasStorage()
      const rutaArchivo = await guardarCoordenadasEnStorage(unidadId, fecha, todasLasCoordenadas)

      // 🆕 OPTIMIZACIÓN: Solo actualizar Firestore cada 5 coordenadas o si es la primera
      const debeActualizarFirestore =
        coordenadasExistentes.length === 0 || todasLasCoordenadas.length % 5 === 0

      if (debeActualizarFirestore) {
        // Actualizar Firestore
        const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)

        const datosFirestore = {
          rutas_archivo: rutaArchivo,
          fecha_hora_fin: serverTimestamp(),
          total_coordenadas: todasLasCoordenadas.length,
        }

        // Verificar si el documento existe
        const rutaSnapshot = await getDoc(rutaRef)

        // Agregar info del conductor si es primera coordenada
        if (!rutaSnapshot.exists() || !rutaSnapshot.data().conductor_id) {
          if (datosCoordenada.conductor_id) {
            datosFirestore.conductor_id = datosCoordenada.conductor_id
            datosFirestore.conductor_nombre = limpiarNombreConductor(
              datosCoordenada.conductor_nombre || '',
            )
          }
        }

        // Crear o actualizar documento
        if (rutaSnapshot.exists()) {
          await updateDoc(rutaRef, datosFirestore)
        } else {
          await setDoc(rutaRef, {
            id: fecha,
            fecha_hora_inicio: serverTimestamp(),
            ...datosFirestore,
            duracion_total_minutos: 0,
            paradas: [],
            distancia_recorrida_km: '0',
            conductor_id: datosCoordenada.conductor_id || '',
            conductor_nombre: limpiarNombreConductor(datosCoordenada.conductor_nombre || ''),
            velocidad_maxima: datosCoordenada.velocidad_actual || '0',
            velocidad_promedio: datosCoordenada.velocidad_actual || '0',
            odometro_inicio: '0',
            odometro_fin: '0',
          })
        }
      }

      return true
    } catch (err) {
      console.error('Error agregando coordenada:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Función para iniciar/actualizar ruta (sin agregar coordenada)
   */
  const iniciarOActualizarRutaDiaria = async (unidadId, datosActualizacion = {}) => {
    try {
      verificarAutenticacion()

      const fecha = obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
      const rutaSnapshot = await getDoc(rutaRef)

      if (!rutaSnapshot.exists()) {
        // Crear documento vacío
        await setDoc(rutaRef, {
          id: fecha,
          fecha_hora_inicio: serverTimestamp(),
          fecha_hora_fin: serverTimestamp(),
          duracion_total_minutos: 0,
          paradas: [],
          distancia_recorrida_km: '0',
          conductor_id: datosActualizacion.conductor_id || '',
          conductor_nombre: limpiarNombreConductor(datosActualizacion.conductor_nombre || ''),
          velocidad_maxima: '0',
          velocidad_promedio: '0',
          odometro_inicio: '0',
          odometro_fin: '0',
          rutas_archivo: null,
          total_coordenadas: 0,
        })
      }

      // Si hay coordenada inicial, agregarla
      if (datosActualizacion.nuevaCoordenada) {
        await agregarCoordenadaSimple(unidadId, datosActualizacion)
      }

      return true
    } catch (err) {
      console.error('Error en ruta diaria:', err)
      throw err
    }
  }

  /**
   * Obtiene coordenadas directamente desde Storage
   */
  const obtenerCoordenadas = async (unidadId, fecha = null) => {
    try {
      const fechaBuscar = fecha || obtenerIdRutaDiaria()

      // Obtener directamente desde Storage
      const { obtenerCoordenadasDesdeStorage } = useRutasStorage()
      const coordenadas = await obtenerCoordenadasDesdeStorage(unidadId, fechaBuscar)

      return coordenadas
    } catch (err) {
      console.error('Error obteniendo coordenadas:', err)
      return []
    }
  }

  /**
   * Obtiene estadísticas de la ruta desde Firestore
   */
  const obtenerEstadisticasRuta = async (unidadId, fecha = null) => {
    try {
      const fechaBuscar = fecha || obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fechaBuscar)
      const rutaSnapshot = await getDoc(rutaRef)

      if (rutaSnapshot.exists()) {
        return rutaSnapshot.data()
      }
      return null
    } catch (err) {
      console.error('Error obteniendo estadísticas:', err)
      return null
    }
  }

  /**
   * Limpiar cache de rutas viejas
   */
  const limpiarCacheRutasAntiguas = () => {
    const { limpiarCache } = useRutasStorage()
    limpiarCache()
  }

  return {
    loading,
    error,
    agregarCoordenadaSimple,
    iniciarOActualizarRutaDiaria,
    obtenerCoordenadas,
    obtenerEstadisticasRuta,
    limpiarCacheRutasAntiguas,
    obtenerIdRutaDiaria,
  }
}
