// src/composables/useRutasStorage.js
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
    agregarCoordenada,
    obtenerCoordenadasDesdeStorage,
    obtenerUrlRutas
  }
}