import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'

export function usePOIs(userId) {
  const loading = ref(false)
  const error = ref(null)

  // Referencia a la subcolección POIS
  const poisRef = collection(db, 'Usuarios', userId, 'POIS')

  // Crear nuevo POI
  const crearPOI = async (poiData) => {
    loading.value = true
    error.value = null

    try {
      const docRef = await addDoc(poisRef, {
        ...poiData,
        tipo: 'poi',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      console.log('✅ POI guardado con ID:', docRef.id)
      return docRef.id
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al guardar POI:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Obtener todos los POIs
  const obtenerPOIs = async () => {
    loading.value = true
    error.value = null

    try {
      const querySnapshot = await getDocs(poisRef)
      const pois = []

      querySnapshot.forEach((doc) => {
        pois.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      return pois
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener POIs:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actualizar POI
  const actualizarPOI = async (poiId, poiData) => {
    loading.value = true
    error.value = null

    try {
      const poiDoc = doc(db, 'Usuarios', userId, 'POIS', poiId)
      await updateDoc(poiDoc, {
        ...poiData,
        updatedAt: serverTimestamp(),
      })

      console.log('✅ POI actualizado:', poiId)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al actualizar POI:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar POI
  const eliminarPOI = async (poiId) => {
    loading.value = true
    error.value = null

    try {
      const poiDoc = doc(db, 'Usuarios', userId, 'POIS', poiId)
      await deleteDoc(poiDoc)

      console.log('✅ POI eliminado:', poiId)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al eliminar POI:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    crearPOI,
    obtenerPOIs,
    actualizarPOI,
    eliminarPOI,
  }
}
