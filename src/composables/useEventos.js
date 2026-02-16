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
  setDoc,
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
      // Primero creamos el documento sin el ID
      const docRef = await addDoc(eventosRef, {
        ...eventoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 🆕 NUEVO: Actualizamos el documento para agregar el ID como campo
      await updateDoc(docRef, {
        id: docRef.id,
      })

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

      // 🆕 Generar referencia con ID automático
      const nuevoDocRef = doc(collection(db, 'Usuarios', userId, 'Eventos'))

      // Guardar con el ID incluido
      await setDoc(nuevoDocRef, {
        id: nuevoDocRef.id, // 🆕 El ID como campo
        ...dataSinId,
        nombre: `${dataSinId.nombre} (Copia)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return nuevoDocRef.id
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al duplicar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const eliminarEventosPorUbicacion = async (ubicacionId, tipo) => {
    loading.value = true
    error.value = null

    try {
      const eventosSnapshot = await getDocs(eventosRef)
      const eventosAEliminar = []

      eventosSnapshot.forEach((doc) => {
        const evento = doc.data()

        if (evento.condiciones && Array.isArray(evento.condiciones)) {
          const tieneUbicacion = evento.condiciones.some(
            (condicion) => condicion.ubicacionId === ubicacionId && condicion.tipo === tipo,
          )

          if (tieneUbicacion) {
            eventosAEliminar.push({
              id: doc.id,
              nombre: evento.nombre,
            })
          }
        }
      })

      // Eliminar todos los eventos encontrados
      const promesas = eventosAEliminar.map((evento) => {
        const eventoDoc = doc(db, 'Usuarios', userId, 'Eventos', evento.id)
        return deleteDoc(eventoDoc)
      })

      await Promise.all(promesas)

      return {
        cantidad: eventosAEliminar.length,
        nombres: eventosAEliminar.map((e) => e.nombre),
      }
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al eliminar eventos:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 🔧 MODIFICAR el return para incluir la nueva función:
  return {
    loading,
    error,
    crearEvento,
    obtenerEventos,
    actualizarEvento,
    eliminarEvento,
    toggleEvento,
    duplicarEvento,
    eliminarEventosPorUbicacion, // 🆕 AGREGAR ESTA LÍNEA
  }
}
