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
      console.error('❌ Usuario no autenticado')
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

      // 🔥 FILTRO: Solo agregar si pasaron al menos 15 segundos
      const MIN_INTERVALO_MS = 8000

      // 1. Obtener la ruta actual de Firestore
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
      const rutaSnapshot = await getDoc(rutaRef)

      let debeAgregar = true
      let coordenadasExistentes = []

      // 2. Si existe, descargar coordenadas desde Storage
      if (rutaSnapshot.exists()) {
        const rutaData = rutaSnapshot.data()

        if (rutaData.rutas_url) {
          try {
            const { obtenerCoordenadasDesdeStorage } = useRutasStorage()
            coordenadasExistentes = await obtenerCoordenadasDesdeStorage(rutaData.rutas_url)

            // Verificar intervalo con última coordenada
            if (coordenadasExistentes.length > 0) {
              const ultimaCoord = coordenadasExistentes[coordenadasExistentes.length - 1]
              const ultimoTimestamp = new Date(ultimaCoord.timestamp).getTime()
              const ahora = Date.now()

              if (ahora - ultimoTimestamp < MIN_INTERVALO_MS) {
                const segundosTranscurridos = Math.round((ahora - ultimoTimestamp) / 1000)
                console.log(
                  `⏰ Omitiendo coordenada: Solo ${segundosTranscurridos}s desde la última`,
                )
                debeAgregar = false
              }
            }
          } catch (err) {
            console.warn('⚠️ Error verificando intervalo, continuando...', err)
          }
        }
      }

      if (!debeAgregar) {
        console.log('⏭️ Coordenada omitida por intervalo corto')
        return false
      }

      // 3. Preparar nueva coordenada EN FORMATO SIMPLE
      const nuevaCoordenadaSimple = {
        lat: datosCoordenada.nuevaCoordenada?.lat || datosCoordenada.lat || 0,
        lng: datosCoordenada.nuevaCoordenada?.lng || datosCoordenada.lng || 0,
        timestamp:
          datosCoordenada.nuevaCoordenada?.timestamp ||
          datosCoordenada.timestamp ||
          new Date().toISOString(),
      }

      // 4. Agregar al array existente
      const todasLasCoordenadas = [...coordenadasExistentes, nuevaCoordenadaSimple]

      console.log(`📤 Guardando ${todasLasCoordenadas.length} coordenadas en Storage...`)

      // 5. Subir TODO el array a Storage (SOBRESCRIBIR archivo)
      const { guardarCoordenadasEnStorage } = useRutasStorage()
      const nuevaUrl = await guardarCoordenadasEnStorage(unidadId, fecha, todasLasCoordenadas)

      // 6. Actualizar Firestore
      const datosFirestore = {
        rutas_url: nuevaUrl,
        fecha_hora_fin: serverTimestamp(),
        total_coordenadas: todasLasCoordenadas.length,
      }

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

      console.log(`✅ Coordenada agregada. Total: ${todasLasCoordenadas.length}`)
      return true
    } catch (err) {
      console.error('❌ Error agregando coordenada:', err)
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
          rutas_url: null,
          total_coordenadas: 0,
        })
        console.log('✅ Documento de ruta diaria creado')
      }

      // Si hay coordenada inicial, agregarla
      if (datosActualizacion.nuevaCoordenada) {
        await agregarCoordenadaSimple(unidadId, datosActualizacion)
      }

      return true
    } catch (err) {
      console.error('❌ Error en ruta diaria:', err)
      throw err
    }
  }

  /**
   * Obtiene coordenadas desde Storage
   */
  const obtenerCoordenadas = async (unidadId) => {
    try {
      const fecha = obtenerIdRutaDiaria()
      const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
      const rutaSnapshot = await getDoc(rutaRef)

      if (rutaSnapshot.exists() && rutaSnapshot.data().rutas_url) {
        const url = rutaSnapshot.data().rutas_url
        const { obtenerCoordenadasDesdeStorage } = useRutasStorage()
        return await obtenerCoordenadasDesdeStorage(url)
      }
      return []
    } catch (err) {
      console.error('❌ Error obteniendo coordenadas:', err)
      return []
    }
  }

  return {
    loading,
    error,
    agregarCoordenadaSimple,
    iniciarOActualizarRutaDiaria,
    obtenerCoordenadas,
    obtenerIdRutaDiaria,
  }
}
