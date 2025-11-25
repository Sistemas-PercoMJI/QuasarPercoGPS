// src/composables/useRutasStorage.js - v3.0 CON MANEJO ROBUSTO DE ERRORES (CORREGIDO)
// ✅ Manejo mejorado de errores de conexión
// ✅ Estrategia de división de archivos para lotes grandes
// ✅ Cola de reintentos para solicitudes fallidas

import { ref } from 'vue'
import { storage } from 'src/firebase/firebaseConfig'
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage'

export function useRutasStorage() {
  const loading = ref(false)
  const error = ref(null)
  
  // 🆕 Cola de reintentos para solicitudes fallidas
  const colaReintentos = ref([])
  
  // 🆕 Estado del procesamiento de la cola
  const procesandoCola = ref(false)

  /**
   * Genera la ruta del archivo JSON en Storage
   */
  const generarRutaStorage = (unidadId, fecha) => {
    // Formato: rutas/unidad_123/2025-11-12.json
    return `rutas/${unidadId}/${fecha}.json`
  }

  /**
   * 🆕 Procesa la cola de reintentos
   */
  const procesarColaReintentos = async () => {
    if (procesandoCola.value || colaReintentos.value.length === 0) {
      return
    }

    procesandoCola.value = true
    console.log(`🔄 Procesando cola de reintentos: ${colaReintentos.value.length} elementos`)

    // Procesar en orden FIFO
    while (colaReintentos.value.length > 0) {
      const item = colaReintentos.value.shift()
      
      try {
        console.log(`🔄 Reintentando: ${item.unidadId}-${item.fecha}`)
        await guardarBatchEnStorage(item.unidadId, item.fecha, item.datos, 0)
        console.log(`✅ Reintento exitoso para: ${item.unidadId}-${item.fecha}`)
      } catch (error) {
        console.error(`❌ Error en reintento para ${item.unidadId}-${item.fecha}:`, error)
        
        // Si el reintento falla, incrementar el contador de reintentos
        item.intentos = (item.intentos || 0) + 1
        
        // Si aún no supera el máximo de reintentos, volver a agregar a la cola
        if (item.intentos < 3) {
          console.log(`⏳ Agregando de nuevo a la cola: ${item.unidadId}-${item.fecha} (intento ${item.intentos})`)
          colaReintentos.value.push(item)
        } else {
          console.error(`🛑 Máximo de reintentos alcanzado para: ${item.unidadId}-${item.fecha}`)
        }
      }
      
      // Pequeña pausa entre reintentos para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    procesandoCola.value = false
    console.log('✅ Cola de reintentos procesada')
  }

  /**
   * 🆕 Verifica si un archivo es demasiado grande y lo divide si es necesario
   */
  const dividirArchivoSiEsNecesario = (datos, maxCoordenadas = 500) => {
    if (!datos.coordenadas || datos.coordenadas.length <= maxCoordenadas) {
      return [datos] // No es necesario dividir
    }

    const partes = []
    const coordenadas = datos.coordenadas
    const totalPartes = Math.ceil(coordenadas.length / maxCoordenadas)

    for (let i = 0; i < totalPartes; i++) {
      const inicio = i * maxCoordenadas
      const fin = Math.min(inicio + maxCoordenadas, coordenadas.length)
      
      partes.push({
        ...datos,
        coordenadas: coordenadas.slice(inicio, fin),
        parte: i + 1,
        totalPartes: totalPartes,
        esParte: true
      })
    }

    console.log(`📂 Archivo dividido en ${totalPartes} partes`)
    return partes
  }

  /**
   * 🆕 Guarda un batch de coordenadas en Storage con reintentos mejorados
   */
  const guardarBatchEnStorage = async (unidadId, fecha, datos, retryCount = 0) => {
    loading.value = true
    error.value = null

    try {
      // 🆕 Verificar si el archivo es demasiado grande y dividirlo si es necesario
      const partes = dividirArchivoSiEsNecesario(datos)
      const urls = []

      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i]
        const rutaArchivo = parte.esParte 
          ? generarRutaStorage(unidadId, `${fecha}_parte${parte.parte}`)
          : generarRutaStorage(unidadId, fecha)
        
        const archivoRef = storageRef(storage, rutaArchivo)
        
        // Convertir datos a JSON con formato legible
        const jsonString = JSON.stringify(parte, null, 2)
        
        console.log(`⬆️ Intentando subir${parte.esParte ? ` parte ${parte.parte}` : ''} a Storage: ${rutaArchivo}`)
        
        // 🆕 Configuración de timeout más generosa
        const uploadTask = uploadString(archivoRef, jsonString, 'raw', {
          contentType: 'application/json'
        })
        
        // 🆕 Manejo explícito del timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 60000) // 60 segundos
        })
        
        // 🆕 Competir entre la subida y el timeout
        // ✅ CORREGIDO: No necesitamos el resultado del Promise.race, solo necesitamos que se complete
        await Promise.race([uploadTask, timeoutPromise])
        
        // Obtener URL de descarga
        const url = await getDownloadURL(archivoRef)
        urls.push(url)
        
        console.log(`✅ Archivo${parte.esParte ? ` parte ${parte.parte}` : ''} subido exitosamente: ${rutaArchivo}`)
      }

      // Si se dividió en partes, crear un archivo índice
      if (partes.length > 1) {
        const rutaIndice = generarRutaStorage(unidadId, `${fecha}_indice`)
        const archivoRefIndice = storageRef(storage, rutaIndice)
        
        const datosIndice = {
          unidadId,
          fecha,
          totalCoordenadas: datos.coordenadas.length,
          partes: partes.map((parte, i) => ({
            parte: parte.parte,
            url: urls[i],
            coordenadas: parte.coordenadas.length
          })),
          timestampGuardado: new Date().toISOString()
        }
        
        await uploadString(archivoRefIndice, JSON.stringify(datosIndice, null, 2), 'raw', {
          contentType: 'application/json'
        })
        
        const urlIndice = await getDownloadURL(archivoRefIndice)
        console.log(`✅ Índice creado: ${rutaIndice}`)
        
        return urlIndice
      }
      
      return urls[0] // Retornar la URL del archivo único o del índice
    } catch (err) {
      error.value = err.message
      console.error(`❌ Error guardando batch en Storage (${retryCount + 1}/3):`, err)
      
      // 🆕 Manejo específico para errores de conexión
      if (
        (err.code === 'storage/retry-limit-exceeded' || 
         err.status === 429 || 
         err.message === 'Tiempo de espera agotado' ||
         err.message.includes('ERR_CONNECTION_CLOSED') ||
         err.message.includes('ERR_NETWORK_CHANGED')) && 
        retryCount < 3
      ) {
        // Calcular delay con backoff exponencial: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000
        console.warn(`⚠️ Error de conexión. Reintentando en ${delay / 1000}s (intento ${retryCount + 1}/3)...`)
        
        // Esperar y reintentar
        await new Promise(resolve => setTimeout(resolve, delay))
        return guardarBatchEnStorage(unidadId, fecha, datos, retryCount + 1)
      } else if (retryCount >= 3) {
        // 🆕 Agregar a la cola de reintentos si falla después de 3 intentos
        console.error(`🛑 Máximo de reintentos alcanzado para ${unidadId}-${fecha}. Agregando a la cola de reintentos.`)
        
        colaReintentos.value.push({
          unidadId,
          fecha,
          datos,
          intentos: 0,
          timestamp: Date.now()
        })
        
        // Procesar la cola después de un tiempo
        setTimeout(() => procesarColaReintentos(), 5000)
        
        throw new Error(`No se pudo guardar el batch después de 3 intentos: ${err.message}`)
      }
      
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 🆕 Obtiene todas las partes de un archivo dividido
   */
  const obtenerCoordenadasDesdeStorageDividido = async (urlIndice) => {
    try {
      // Descargar el índice
      const response = await fetch(urlIndice)
      if (!response.ok) {
        throw new Error('Error al descargar el índice')
      }
      
      const indice = await response.json()
      
      // Descargar todas las partes
      const todasLasCoordenadas = []
      
      for (const parte of indice.partes) {
        const responseParte = await fetch(parte.url)
        if (!responseParte.ok) {
          throw new Error(`Error al descargar la parte ${parte.parte}`)
        }
        
        const datosParte = await responseParte.json()
        todasLasCoordenadas.push(...datosParte.coordenadas)
      }
      
      console.log(`✅ Descargadas ${todasLasCoordenadas.length} coordenadas de ${indice.partes.length} partes`)
      return todasLasCoordenadas
    } catch (err) {
      error.value = err.message
      console.error('❌ Error descargando coordenadas divididas:', err)
      throw err
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
      
      console.log(`✅ Coordenadas guardadas en Storage: ${rutaArchivo}`)
      console.log(`🔗 URL: ${url}`)
      
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
      // 🆕 Verificar si es una URL de índice
      if (url.includes('_indice')) {
        return await obtenerCoordenadasDesdeStorageDividido(url)
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al descargar el archivo')
      }
      
      const coordenadas = await response.json()
      console.log(`✅ Coordenadas descargadas: ${coordenadas.length} puntos`)
      
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
    // 🆕 Primero intentar obtener el índice
    const rutaIndice = generarRutaStorage(unidadId, `${fecha}_indice`)
    const archivoRefIndice = storageRef(storage, rutaIndice)
    
    try {
      return await getDownloadURL(archivoRefIndice)
    } catch {
      // Si no existe el índice, intentar con el archivo normal
      const rutaArchivo = generarRutaStorage(unidadId, fecha)
      const archivoRef = storageRef(storage, rutaArchivo)
      
      try {
        return await getDownloadURL(archivoRef)
      } catch (err) {
        // Si el archivo no existe, retornar null
        if (err.code === 'storage/object-not-found') {
          return null
        }
        throw err
      }
    }
  }

  /**
   * 🆕 Fuerza el procesamiento de la cola de reintentos
   */
  const forzarProcesamientoCola = async () => {
    await procesarColaReintentos()
  }

  return {
    loading,
    error,
    guardarCoordenadasEnStorage,
    guardarBatchEnStorage, // 🆕 Mejorado
    agregarCoordenada,
    obtenerCoordenadasDesdeStorage, // 🆕 Mejorado
    obtenerUrlRutas, // 🆕 Mejorado
    forzarProcesamientoCola, // 🆕 Nuevo
    colaReintentos // 🆕 Exponer para monitoreo
  }
}