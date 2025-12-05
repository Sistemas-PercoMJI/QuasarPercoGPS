// src/composables/useRutasStorage.js - VERSIÓN SIMPLE CORREGIDA
// ✅ Guarda SOLO arrays simples: [{lat, lng, timestamp}]
// ✅ Lee AMBOS formatos (migración automática)

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
   * 🔥 Guarda coordenadas en formato SIMPLE
   * @param {string} unidadId - ID de la unidad
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @param {Array} coordenadas - Array simple [{lat, lng, timestamp}]
   */
  const guardarCoordenadasEnStorage = async (unidadId, fecha, coordenadas) => {
    loading.value = true
    error.value = null

    try {
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)

      // 🔥 VALIDAR que sea array
      if (!Array.isArray(coordenadas)) {
        console.error('❌ coordenadas NO es un array:', typeof coordenadas)
        throw new Error('Las coordenadas deben ser un array')
      }

      // 🔥 LIMPIAR: asegurar que cada elemento sea {lat, lng, timestamp}
      const coordenadasLimpias = coordenadas.map((coord) => ({
        lat: coord.lat || 0,
        lng: coord.lng || 0,
        timestamp: coord.timestamp || new Date().toISOString(),
      }))

      console.log(`📤 Guardando ${coordenadasLimpias.length} coordenadas SIMPLES...`)
      console.log('📦 Primera coordenada:', coordenadasLimpias[0])

      // 🔥 CONVERTIR A JSON (ARRAY DIRECTO, SIN ENVOLVER)
      const jsonString = JSON.stringify(coordenadasLimpias, null, 2)

      // DEBUG: Ver primeros 200 caracteres
      console.log('📄 JSON a guardar (primeros 200 chars):', jsonString.substring(0, 200))

      // Subir archivo
      await uploadString(archivoRef, jsonString, 'raw', {
        contentType: 'application/json',
      })

      // Obtener URL
      const url = await getDownloadURL(archivoRef)
      console.log(`✅ Archivo SIMPLE guardado: ${rutaArchivo}`)

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
   * 🔥 Descarga coordenadas con MIGRACIÓN AUTOMÁTICA de formato viejo
   * @param {string} url - URL del archivo en Storage
   * @returns {Array} Array simple [{lat, lng, timestamp}]
   */
  const obtenerCoordenadasDesdeStorage = async (url) => {
    loading.value = true
    error.value = null

    try {
      console.log('📥 Descargando coordenadas de Storage...')
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('📄 Tipo de dato recibido:', typeof data)
      console.log('📄 Es array?', Array.isArray(data))

      let coordenadas = []

      // 🔥 CASO 1: Formato SIMPLE (correcto) - Array directo
      if (Array.isArray(data)) {
        console.log('✅ Formato SIMPLE detectado')
        coordenadas = data.map((coord) => ({
          lat: coord.lat || 0,
          lng: coord.lng || 0,
          timestamp: coord.timestamp || new Date().toISOString(),
        }))
      }
      // 🔥 CASO 2: Formato VIEJO (batching) - Objeto con .coordenadas
      else if (data.coordenadas && Array.isArray(data.coordenadas)) {
        console.log('⚠️ Formato VIEJO detectado, migrando...')

        coordenadas = data.coordenadas
          .map((item) => {
            // Extraer coordenada de la estructura anidada
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

        console.log(`✅ ${coordenadas.length} coordenadas migradas a formato simple`)
      }
      // 🔥 CASO 3: Objeto simple con lat/lng
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
      // 🔥 CASO 4: Formato desconocido
      else {
        console.warn('⚠️ Formato DESCONOCIDO')
        console.warn('   Keys del objeto:', Object.keys(data))
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
      return await getDownloadURL(archivoRef)
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
