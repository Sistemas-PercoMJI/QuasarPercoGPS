// src/composables/useEventos.js
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
  query,
  orderBy,
} from 'firebase/firestore'

export function useEventos(userId) {
  const loading = ref(false)
  const error = ref(null)

  // Referencia a la subcolección Eventos
  const eventosRef = collection(db, 'Usuarios', userId, 'Eventos')

  // Crear nuevo evento
  const crearEvento = async (eventoData) => {
    loading.value = true
    error.value = null

    try {
      const docRef = await addDoc(eventosRef, {
        ...eventoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      console.log('✅ Evento guardado con ID:', docRef.id)
      return docRef.id
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al guardar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Obtener todos los eventos
  const obtenerEventos = async () => {
    loading.value = true
    error.value = null

    try {
      const q = query(eventosRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const eventos = []

      querySnapshot.forEach((doc) => {
        eventos.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      console.log('✅ Eventos cargados:', eventos.length)
      return eventos
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener eventos:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actualizar evento
  const actualizarEvento = async (eventoId, eventoData) => {
    loading.value = true
    error.value = null

    try {
      const eventoDoc = doc(db, 'Usuarios', userId, 'Eventos', eventoId)
      await updateDoc(eventoDoc, {
        ...eventoData,
        updatedAt: serverTimestamp(),
      })

      console.log('✅ Evento actualizado:', eventoId)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al actualizar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar evento
  const eliminarEvento = async (eventoId) => {
    loading.value = true
    error.value = null

    try {
      const eventoDoc = doc(db, 'Usuarios', userId, 'Eventos', eventoId)
      await deleteDoc(eventoDoc)

      console.log('✅ Evento eliminado:', eventoId)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al eliminar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Activar/desactivar evento
  const toggleEvento = async (eventoId, activo) => {
    loading.value = true
    error.value = null

    try {
      const eventoDoc = doc(db, 'Usuarios', userId, 'Eventos', eventoId)
      await updateDoc(eventoDoc, {
        activo,
        updatedAt: serverTimestamp(),
      })

      console.log(`✅ Evento ${activo ? 'activado' : 'desactivado'}:`, eventoId)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al cambiar estado del evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Duplicar evento
  const duplicarEvento = async (eventoData) => {
    loading.value = true
    error.value = null

    try {
      // Crear una copia del evento sin el ID, createdAt y updatedAt
      // eslint-disable-next-line no-unused-vars
      const { id, createdAt, updatedAt, ...dataSinId } = eventoData
      
      const docRef = await addDoc(eventosRef, {
        ...dataSinId,
        nombre: `${dataSinId.nombre} (Copia)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      console.log('✅ Evento duplicado con ID:', docRef.id)
      return docRef.id
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al duplicar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    crearEvento,
    obtenerEventos,
    actualizarEvento,
    eliminarEvento,
    toggleEvento,
    duplicarEvento,
  }
}