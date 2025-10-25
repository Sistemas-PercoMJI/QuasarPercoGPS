// composables/useReportesStorage.js
import { ref } from 'vue'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export function useReportesStorage() {
  const uploading = ref(false)
  const error = ref(null)

  /**
   * Sube un reporte a Firebase Storage y guarda metadata en Firestore
   * @param {Blob} blob - El archivo (PDF o Excel) como Blob
   * @param {Object} metadata - Información del reporte
   * @returns {Promise<Object>} - Información del reporte guardado
   */
  const subirReporte = async (blob, metadata) => {
    uploading.value = true
    error.value = null

    try {
      // 1. Inicializar servicios de Firebase y autenticación al principio
      const auth = getAuth()
      const userId = auth.currentUser?.uid
      const storage = getStorage()
      const db = getFirestore()

      // 2. Validar que el usuario esté autenticado
      if (!userId) {
        throw new Error('Usuario no autenticado')
      }

      // 3. Generar un nombre de archivo y una ruta únicos
      const timestamp = Date.now()
      const extension = metadata.tipo === 'pdf' ? 'pdf' : 'xlsx'
      const nombreArchivo = `${metadata.nombre || 'reporte'}_${timestamp}.${extension}`
      const rutaArchivo = `reportes/${userId}/${nombreArchivo}`

      // 4. Crear la referencia al archivo en Storage usando la ruta correcta
      const fileRef = storageRef(storage, rutaArchivo)

      // 5. Subir archivo a Storage
      await uploadBytes(fileRef, blob)

      // 6. Obtener URL de descarga
      const downloadURL = await getDownloadURL(fileRef)

      // 7. Guardar metadata en Firestore
      const reporteData = {
        userId,
        nombre: metadata.nombre || 'Reporte sin nombre',
        tipo: metadata.tipo || 'pdf',
        tipoInforme: metadata.tipoInforme || 'Informe de eventos',
        reportarPor: metadata.reportarPor || 'Objetos',
        elementos: metadata.elementos || [],
        rangoFechas: metadata.rangoFechas || '',
        columnas: metadata.columnas || [],
        totalEventos: metadata.totalEventos || 0,
        storageUrl: downloadURL,
        storagePath: rutaArchivo, // Guardamos la ruta para referencia futura
        tamaño: blob.size,
        fechaCreacion: Timestamp.now(),
      }

      // Guardamos en la subcolección del usuario
      const reportesRef = collection(db, 'Usuarios', userId, 'HistorialReportes')
      const docRef = await addDoc(reportesRef, reporteData)

      return {
        id: docRef.id,
        downloadURL,
        ...reporteData,
      }
    } catch (err) {
      console.error('Error al subir reporte:', err)
      error.value = err.message
      throw err
    } finally {
      uploading.value = false
    }
  }

  /**
   * Obtiene el historial de reportes del usuario
   * @param {string} userId - ID del usuario
   * @param {number} cantidad - Cantidad de reportes a obtener
   * @returns {Promise<Array>} - Lista de reportes
   */
  const obtenerHistorialReportes = async (userId, cantidad = 20) => {
    try {
      const db = getFirestore()
      const reportesRef = collection(db, 'Usuarios', userId, 'HistorialReportes')
      const q = query(reportesRef, orderBy('fechaCreacion', 'desc'), limit(cantidad))

      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate(),
      }))
    } catch (err) {
      console.error('Error al obtener historial:', err)
      error.value = err.message
      return []
    }
  }

  /**
   * Formatea el tamaño del archivo
   */
  const formatearTamaño = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return {
    uploading,
    error,
    subirReporte,
    obtenerHistorialReportes,
    formatearTamaño,
  }
}
