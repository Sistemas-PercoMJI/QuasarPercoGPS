// src/composables/useRutasStorage.js - SOLUCIÓN DEFINITIVA PARA ERROR 403 INTERMITENTE
import { ref } from 'vue'
import { storage, auth } from 'src/firebase/firebaseConfig'
import {
  ref as storageRef,
  uploadString,
  getDownloadURL,
  getBlob,
  getMetadata,
} from 'firebase/storage'

export function useRutasStorage() {
  const loading = ref(false)
  const error = ref(null)

  // Cache para evitar múltiples requests
  const dataCache = new Map()
  const requestInProgress = new Map()
  const CACHE_DURATION = 3 * 60 * 1000 // 3 minutos

  /**
   * Genera la ruta del archivo JSON en Storage
   */
  const generarRutaStorage = (unidadId, fecha) => {
    return `rutas/${unidadId}/${fecha}.json`
  }

  /**
   * 🆕 Verificar si el usuario está autenticado
   */
  const verificarAutenticacion = () => {
    const user = auth.currentUser
    if (!user) {
      throw new Error('Usuario no autenticado')
    }
    return user
  }

  /**
   * 🆕 Esperar a que el token se refresque si es necesario
   */
  const asegurarTokenValido = async () => {
    const user = auth.currentUser
    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    try {
      // Forzar refresco del token si está cerca de expirar
      await user.getIdToken(true) // true = forzar refresco
    } catch (err) {
      console.error('Error refrescando token:', err)
      throw err
    }
  }

  /**
   * 🔥 Guarda coordenadas en formato SIMPLE
   */
  const guardarCoordenadasEnStorage = async (unidadId, fecha, coordenadas) => {
    loading.value = true
    error.value = null

    try {
      // Verificar autenticación
      verificarAutenticacion()

      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)
      const cacheKey = `${unidadId}-${fecha}`

      // Validar que sea array
      if (!Array.isArray(coordenadas)) {
        console.error('coordenadas NO es un array:', typeof coordenadas)
        throw new Error('Las coordenadas deben ser un array')
      }

      // Limpiar coordenadas
      const coordenadasLimpias = coordenadas.map((coord) => ({
        lat: coord.lat || 0,
        lng: coord.lng || 0,
        timestamp: coord.timestamp || new Date().toISOString(),
      }))

      // Convertir a JSON
      const jsonString = JSON.stringify(coordenadasLimpias, null, 2)

      // 🆕 Subir archivo con metadata de autenticación
      await uploadString(archivoRef, jsonString, 'raw', {
        contentType: 'application/json',
        customMetadata: {
          createdBy: auth.currentUser?.uid || 'unknown',
          createdAt: new Date().toISOString(),
        },
      })

      // 🆕 Guardar en cache LOCAL inmediatamente
      dataCache.set(cacheKey, {
        data: coordenadasLimpias,
        timestamp: Date.now(),
      })

      // 🆕 Pequeña pausa para que Firebase actualice permisos
      await new Promise((resolve) => setTimeout(resolve, 100))

      return rutaArchivo
    } catch (err) {
      error.value = err.message
      console.error('Error guardando en Storage:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 🔥 Descarga coordenadas DIRECTAMENTE usando SDK (SIN URLs)
   */
  const obtenerCoordenadasDesdeStorage = async (unidadId, fecha) => {
    const cacheKey = `${unidadId}-${fecha}`

    // 🆕 1. VERIFICAR CACHE PRIMERO
    const cached = dataCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    // 🆕 2. PREVENIR REQUESTS DUPLICADOS
    if (requestInProgress.get(cacheKey)) {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verificar cache de nuevo después de esperar
      const cachedAfterWait = dataCache.get(cacheKey)
      if (cachedAfterWait) {
        return cachedAfterWait.data
      }
    }

    requestInProgress.set(cacheKey, true)
    loading.value = true
    error.value = null

    try {
      // 🆕 3. VERIFICAR AUTENTICACIÓN Y REFRESCAR TOKEN
      verificarAutenticacion()
      await asegurarTokenValido()

      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)

      // 🆕 4. VERIFICAR SI EL ARCHIVO EXISTE (evita 404 innecesarios)
      let existe = true
      try {
        await getMetadata(archivoRef)
      } catch (err) {
        if (err.code === 'storage/object-not-found') {
          existe = false
        } else {
          throw err // Otros errores sí se propagan
        }
      }

      if (!existe) {
        return []
      }

      // 🆕 5. DESCARGAR USANDO getBlob (método más confiable)
      let data
      try {
        const blob = await getBlob(archivoRef)
        const text = await blob.text()
        data = JSON.parse(text)
      } catch (blobError) {
        console.warn('getBlob() falló, intentando con getDownloadURL()...', blobError.message)

        // 🆕 FALLBACK: Si getBlob falla, usar getDownloadURL
        const url = await getDownloadURL(archivoRef)
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        data = await response.json()
      }

      // 🆕 6. PROCESAR DATOS
      let coordenadas = procesarDatos(data)

      // 🆕 7. GUARDAR EN CACHE
      dataCache.set(cacheKey, {
        data: coordenadas,
        timestamp: Date.now(),
      })

      return coordenadas
    } catch (err) {
      // 🆕 MANEJO ESPECÍFICO DE ERRORES
      if (err.code === 'storage/unauthorized' || err.message?.includes('403')) {
        // Intentar refrescar token y reintentar UNA vez
        try {
          await asegurarTokenValido()
          // Limpiar flag y reintentar
          requestInProgress.delete(cacheKey)
          return await obtenerCoordenadasDesdeStorage(unidadId, fecha)
        } catch (retryErr) {
          console.error('Falló incluso después de refrescar token:', retryErr)
        }
      } else if (err.code === 'storage/object-not-found') {
        console.warn('Archivo no existe')
      } else {
        console.error('Error descargando coordenadas:', err)
      }

      error.value = err.message
      return []
    } finally {
      requestInProgress.delete(cacheKey)
      loading.value = false
    }
  }

  /**
   * 🆕 Procesar diferentes formatos de datos
   */
  const procesarDatos = (data) => {
    let coordenadas = []

    // CASO 1: Formato SIMPLE (array directo)
    if (Array.isArray(data)) {
      coordenadas = data.map((coord) => ({
        lat: coord.lat || 0,
        lng: coord.lng || 0,
        timestamp: coord.timestamp || new Date().toISOString(),
      }))
    }
    // CASO 2: Formato VIEJO (batching)
    else if (data.coordenadas && Array.isArray(data.coordenadas)) {
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
    }
    // CASO 3: Objeto simple (una sola coordenada)
    else if (data.lat && data.lng) {
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
      console.warn('Formato DESCONOCIDO')
      console.warn('Keys:', Object.keys(data))
    }

    return coordenadas
  }

  /**
   * 🆕 Obtiene la URL del archivo (solo para visualización, NO para descargar datos)
   */
  const obtenerUrlRutas = async (unidadId, fecha) => {
    const rutaArchivo = generarRutaStorage(unidadId, fecha)
    const archivoRef = storageRef(storage, rutaArchivo)

    try {
      // Asegurar token válido
      await asegurarTokenValido()

      const url = await getDownloadURL(archivoRef)
      return url
    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        return null
      }
      throw err
    }
  }

  /**
   * 🆕 Limpiar cache manualmente
   */
  const limpiarCache = () => {
    //const size = dataCache.size
    dataCache.clear()
    requestInProgress.clear()
  }

  /**
   * 🆕 Limpiar cache de una fecha específica
   */
  const limpiarCacheFecha = (unidadId, fecha) => {
    const cacheKey = `${unidadId}-${fecha}`
    const deleted = dataCache.delete(cacheKey)
    if (deleted) {
      console.log(`Cache eliminado para: ${cacheKey}`)
    }
  }

  /**
   * 🆕 Verificar estado del cache
   */
  const obtenerEstadoCache = () => {
    return {
      entradas: dataCache.size,
      requestsEnProgreso: requestInProgress.size,
      detalles: Array.from(dataCache.entries()).map(([key, value]) => ({
        key,
        coordenadas: value.data.length,
        edad: Math.round((Date.now() - value.timestamp) / 1000) + 's',
      })),
    }
  }

  return {
    loading,
    error,
    guardarCoordenadasEnStorage,
    obtenerCoordenadasDesdeStorage,
    obtenerUrlRutas,
    limpiarCache,
    limpiarCacheFecha,
    obtenerEstadoCache, // 🆕 Para debugging
  }
}
