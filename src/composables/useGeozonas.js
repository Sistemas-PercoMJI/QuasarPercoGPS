// src/composables/useGeozonas.js
import { ref } from 'vue'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  // where,
  orderBy,
} from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useGeozonas(userId) {
  const geozonas = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Obtener todas las geozonas del usuario
  const obtenerGeozonas = async () => {
    loading.value = true
    error.value = null

    try {
      // CORRECCIÓN: Usar la subcolección de Geozonas dentro del documento del usuario
      const q = query(
        collection(db, 'Usuarios', userId, 'Geozonas'),
        orderBy('fechaCreacion', 'desc'),
      )

      const querySnapshot = await getDocs(q)
      const geozonasData = []

      querySnapshot.forEach((doc) => {
        geozonasData.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      geozonas.value = geozonasData
      return geozonasData
    } catch (err) {
      console.error('Error al obtener geozonas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Crear una nueva geozona
  const crearGeozona = async (geozonaData) => {
    loading.value = true
    error.value = null

    try {
      const dataConUsuario = {
        ...geozonaData,
        fechaCreacion: new Date(),
      }

      // CORRECCIÓN: Usar la subcolección de Geozonas dentro del documento del usuario
      const docRef = await addDoc(collection(db, 'Usuarios', userId, 'Geozonas'), dataConUsuario)

      // Agregar la nueva geozona al array local
      geozonas.value.unshift({
        id: docRef.id,
        ...dataConUsuario,
      })

      return docRef.id
    } catch (err) {
      console.error('Error al crear geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actualizar una geozona existente
  const actualizarGeozona = async (id, geozonaData) => {
    loading.value = true
    error.value = null

    try {
      // CORRECCIÓN: Usar la subcolección de Geozonas dentro del documento del usuario
      const geozonaRef = doc(db, 'Usuarios', userId, 'Geozonas', id)
      await updateDoc(geozonaRef, geozonaData)

      // Actualizar la geozona en el array local
      const index = geozonas.value.findIndex((g) => g.id === id)
      if (index !== -1) {
        geozonas.value[index] = {
          ...geozonas.value[index],
          ...geozonaData,
        }
      }

      return true
    } catch (err) {
      console.error('Error al actualizar geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar una geozona
  const eliminarGeozona = async (id) => {
    loading.value = true
    error.value = null

    try {
      // CORRECCIÓN: Usar la subcolección de Geozonas dentro del documento del usuario
      await deleteDoc(doc(db, 'Usuarios', userId, 'Geozonas', id))

      // Eliminar la geozona del array local
      geozonas.value = geozonas.value.filter((g) => g.id !== id)

      return true
    } catch (err) {
      console.error('Error al eliminar geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    geozonas,
    loading,
    error,
    obtenerGeozonas,
    crearGeozona,
    actualizarGeozona,
    eliminarGeozona,
  }
}
