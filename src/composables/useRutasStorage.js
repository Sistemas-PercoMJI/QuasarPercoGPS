// src/composables/useRutasStorage.js - v2.0 CON BATCHING Y REINTENTO
// ✅ Maneja el error 429 con reintentos automáticos
// ✅ Guarda el JSON del batch en Firebase Storage

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
    // Formato: rutas/unidad_123/2025-11-12.json
    return `rutas/${unidadId}/${fecha}.json`
  }

  /**
   * 🆕 Guarda un batch de coordenadas en Storage con reintentos
   */
  const guardarBatchEnStorage = async (unidadId, fecha, datos, retryCount = 0) => {
    loading.value = true
    error.value = null

    try {
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)
      
      // Convertir datos a JSON con formato legible
      const jsonData = JSON.stringify(datos, null, 2)
      
      console.log(`⬆️ Intentando subir batch a Storage: ${rutaArchivo}`)
      
      // Subir archivo (uploadString permite subir texto directamente)
      await uploadString(archivoRef, jsonData, 'raw', {
        contentType: 'application/json'
      })
      
      // Obtener URL de descarga
      const url = await getDownloadURL(archivoRef)
      
      console.log(`✅ Batch guardado en Storage: ${rutaArchivo}`)
      console.log(`🔗 URL: ${url}`)
      
      return url
    } catch (err) {
      error.value = err.message
      console.error(`❌ Error guardando batch en Storage (${retryCount + 1}/3):`, err)
      
      // Si es un error 429 (Too Many Requests) y no hemos superado los reintentos máximos
      if ((err.code === 'storage/retry-limit-exceeded' || err.status === 429) && retryCount < 3) {
        // Calcular delay con backoff exponencial: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000
        console.warn(`⚠️ Error 429. Reintentando en ${delay / 1000}s (intento ${retryCount + 1}/3)...`)
        
        // Esperar y reintentar
        await new Promise(resolve => setTimeout(resolve, delay))
        return guardarBatchEnStorage(unidadId, fecha, datos, retryCount + 1)
      } else if (retryCount >= 3) {
        console.error(`🛑 Máximo de reintentos alcanzado para ${unidadId}-${fecha}. No se pudo guardar.`)
        throw new Error(`No se pudo guardar el batch después de 3 intentos: ${err.message}`)
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Guarda o actualiza las coordenadas en un archivo JSON
   */
  const guardarCoordenadasEnStorage = async (unidadId, fecha, coordenadas) => {
    loading.value = true
    error.value = null

    try {
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)
      
      // Convertir coordenadas a JSON con formato legible
      const jsonData = JSON.stringify(coordenadas, null, 2)
      
      // Subir archivo (uploadString permite subir texto directamente)
      await uploadString(archivoRef, jsonData, 'raw', {
        contentType: 'application/json'
      })
      
      // Obtener URL de descarga
      const url = await getDownloadURL(archivoRef)
      
      /*console.log(`✅ Coordenadas guardadas en Storage: ${rutaArchivo}`)
      console.log(`🔗 URL: ${url}`)*/
      
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
   * Agrega una nueva coordenada al archivo existente
   */
  const agregarCoordenada = async (unidadId, fecha, nuevaCoordenada, coordenadasExistentes = []) => {
    loading.value = true
    error.value = null

    try {
      // Agregar la nueva coordenada al array
      const coordenadasActualizadas = [...coordenadasExistentes, nuevaCoordenada]
      
      // Guardar todo el array actualizado
      const url = await guardarCoordenadasEnStorage(unidadId, fecha, coordenadasActualizadas)
      
      return {
        url,
        totalCoordenadas: coordenadasActualizadas.length,
        coordenadas: coordenadasActualizadas
      }
    } catch (err) {
      error.value = err.message
      console.error('❌ Error agregando coordenada:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Descarga y lee las coordenadas desde el JSON en Storage
   */
  const obtenerCoordenadasDesdeStorage = async (url) => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al descargar el archivo')
      }
      
      const coordenadas = await response.json()
      //console.log(`✅ Coordenadas descargadas: ${coordenadas.length} puntos`)
      
      return coordenadas
    } catch (err) {
      error.value = err.message
      console.error('❌ Error descargando coordenadas:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene la URL del archivo de rutas si existe
   */
  const obtenerUrlRutas = async (unidadId, fecha) => {
    try {
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)
      const url = await getDownloadURL(archivoRef)
      return url
    } catch (err) {
      // Si el archivo no existe, retornar null
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
    guardarBatchEnStorage, // 🆕
    agregarCoordenada,
    obtenerCoordenadasDesdeStorage,
    obtenerUrlRutas
  }
}