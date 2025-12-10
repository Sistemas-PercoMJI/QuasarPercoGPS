// src/composables/useRutasStorage.js - CON REINTENTOS Y MEJOR MANEJO DE ERRORES
import { ref } from 'vue'
import { storage } from 'src/firebase/firebaseConfig'
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage'

export function useRutasStorage() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Genera la ruta del archivo JSON en Storage
   */
  const generarRutaStorage = (unidadId, fecha) => {
    return `rutas/${unidadId}/${fecha}.json`
  }

  /**
   * 🆕 Función auxiliar para reintentar operaciones
   */
  const retryOperation = async (operation, maxRetries = 3, delayMs = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (err) {
        const isLastAttempt = i === maxRetries - 1

        // Si es 403, esperar más tiempo antes de reintentar
        if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
          if (isLastAttempt) {
            console.error(`❌ Error 403 después de ${maxRetries} intentos`)
            throw err
          }
          console.warn(`⚠️ Error 403, reintentando (${i + 1}/${maxRetries})...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1))) // Delay exponencial
        } else {
          throw err // Otros errores no se reintentan
        }
      }
    }
  }

  /**
   * 🔥 Guarda coordenadas en formato SIMPLE
   */
  const guardarCoordenadasEnStorage = async (unidadId, fecha, coordenadas) => {
    loading.value = true
    error.value = null

    try {
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)

      // Validar que sea array
      if (!Array.isArray(coordenadas)) {
        console.error('❌ coordenadas NO es un array:', typeof coordenadas)
        throw new Error('Las coordenadas deben ser un array')
      }

      // Limpiar coordenadas
      const coordenadasLimpias = coordenadas.map((coord) => ({
        lat: coord.lat || 0,
        lng: coord.lng || 0,
        timestamp: coord.timestamp || new Date().toISOString(),
      }))

      console.log(`📤 Guardando ${coordenadasLimpias.length} coordenadas SIMPLES...`)

      // Convertir a JSON
      const jsonString = JSON.stringify(coordenadasLimpias, null, 2)

      // Subir archivo con reintentos
      await retryOperation(async () => {
        await uploadString(archivoRef, jsonString, 'raw', {
          contentType: 'application/json',
        })
      })

      // Obtener URL con reintentos
      const url = await retryOperation(async () => {
        return await getDownloadURL(archivoRef)
      })

      console.log(`✅ Archivo guardado: ${rutaArchivo}`)

      return url
    } catch (err) {
      error.value = err.message
      console.error('❌ Error guardando en Storage:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 🔥 Descarga coordenadas con REINTENTOS automáticos
   */
  const obtenerCoordenadasDesdeStorage = async (url) => {
    loading.value = true
    error.value = null

    try {
      console.log('📥 Descargando coordenadas de Storage...')

      // 🆕 Descargar con reintentos automáticos
      const data = await retryOperation(
        async () => {
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          return await response.json()
        },
        3,
        1500,
      ) // 3 intentos con 1.5s de delay inicial

      console.log('📄 Tipo de dato recibido:', typeof data)
      console.log('📄 Es array?', Array.isArray(data))

      let coordenadas = []

      // CASO 1: Formato SIMPLE
      if (Array.isArray(data)) {
        console.log('✅ Formato SIMPLE detectado')
        coordenadas = data.map((coord) => ({
          lat: coord.lat || 0,
          lng: coord.lng || 0,
          timestamp: coord.timestamp || new Date().toISOString(),
        }))
      }
      // CASO 2: Formato VIEJO (batching)
      else if (data.coordenadas && Array.isArray(data.coordenadas)) {
        console.log('⚠️ Formato VIEJO detectado, migrando...')

        coordenadas = data.coordenadas
          .map((item) => {
            const coord = item.nuevaCoordenada || item.coordenada || item

            if (!coord.lat || !coord.lng) {
              console.warn('⚠️ Coordenada sin lat/lng:', item)
              return null
            }

            return {
              lat: coord.lat,
              lng: coord.lng,
              timestamp: coord.timestamp || new Date().toISOString(),
            }
          })
          .filter((coord) => coord !== null)

        console.log(`✅ ${coordenadas.length} coordenadas migradas`)
      }
      // CASO 3: Objeto simple
      else if (data.lat && data.lng) {
        console.log('✅ Coordenada única detectada')
        coordenadas = [
          {
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        ]
      }
      // CASO 4: Formato desconocido
      else {
        console.warn('⚠️ Formato DESCONOCIDO')
        console.warn('   Keys:', Object.keys(data))
        return []
      }

      console.log(`✅ ${coordenadas.length} coordenadas obtenidas`)
      if (coordenadas.length > 0) {
        console.log('📦 Primera coordenada:', coordenadas[0])
      }

      return coordenadas
    } catch (err) {
      error.value = err.message
      console.error('❌ Error descargando coordenadas:', err)

      // 🆕 Si falla después de todos los reintentos, devolver array vacío
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene la URL del archivo de rutas si existe
   */
  const obtenerUrlRutas = async (unidadId, fecha) => {
    const rutaArchivo = generarRutaStorage(unidadId, fecha)
    const archivoRef = storageRef(storage, rutaArchivo)

    try {
      // 🆕 Usar reintentos también aquí
      return await retryOperation(async () => {
        return await getDownloadURL(archivoRef)
      })
    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        return null
      }
      throw err
    }
  }

  return {
    loading,
    error,
    guardarCoordenadasEnStorage,
    obtenerCoordenadasDesdeStorage,
    obtenerUrlRutas,
  }
}
