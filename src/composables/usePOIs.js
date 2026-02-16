import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  //query,
  //orderBy,
  serverTimestamp,
} from 'firebase/firestore'

export function usePOIs(userId) {
  const pois = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Crear nuevo POI
  const crearPOI = async (poiData) => {
    loading.value = true
    error.value = null

    try {
      const dataConUsuario = {
        ...poiData,
        fechaCreacion: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'Usuarios', userId, 'POIS'), dataConUsuario)

      const nuevoPOI = {
        ...dataConUsuario,
        id: docRef.id,
        tipo: 'poi',
      }

      pois.value.unshift(nuevoPOI)

      return docRef.id
    } catch (err) {
      console.error('❌ Error al crear POI:', err)
      console.error('❌ Código:', err.code)
      console.error('❌ Mensaje:', err.message)
      error.value = err.message
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
      // Intentar primero sin orderBy para verificar si hay datos
      const collectionRef = collection(db, 'Usuarios', userId, 'POIS')
      const querySnapshot = await getDocs(collectionRef)

      if (querySnapshot.empty) {
        //console.warn('⚠️ No se encontraron POIs en la base de datos')
        pois.value = []
        return []
      }

      const poisData = []

      querySnapshot.forEach((documento) => {
        const data = documento.data()

        const poi = {
          ...data,
          id: documento.id,
          tipo: 'poi',
        }

        poisData.push(poi)
      })

      // Ordenar manualmente por fechaCreacion si existe
      poisData.sort((a, b) => {
        if (a.fechaCreacion && b.fechaCreacion) {
          return b.fechaCreacion - a.fechaCreacion
        }
        return 0
      })

      pois.value = poisData

      return poisData
    } catch (err) {
      console.error('❌ Error al obtener POIs:', err)
      console.error('❌ Código:', err.code)
      console.error('❌ Mensaje:', err.message)
      error.value = err.message
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

      const index = pois.value.findIndex((p) => p.id === poiId)
      if (index !== -1) {
        pois.value[index] = {
          ...pois.value[index],
          ...poiData,
          tipo: 'poi',
        }
      }

      return true
    } catch (err) {
      console.error('❌ Error al actualizar POI:', err)
      error.value = err.message
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

      pois.value = pois.value.filter((p) => p.id !== poiId)

      return true
    } catch (err) {
      console.error('❌ Error al eliminar POI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    pois,
    loading,
    error,
    crearPOI,
    obtenerPOIs,
    actualizarPOI,
    eliminarPOI,
  }
}
