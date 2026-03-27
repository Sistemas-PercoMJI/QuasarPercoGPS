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
  getDoc,
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

      //  NUEVO: Actualizamos el documento para agregar el ID como campo
      await updateDoc(docRef, {
        id: docRef.id,
      })
      await sincronizarEventoEnUbicaciones(docRef.id, eventoData, 'agregar')
      return docRef.id
    } catch (err) {
      error.value = err.message
      console.error(' Error al guardar evento:', err)
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
      console.error(' Error al obtener eventos:', err)
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
      await sincronizarEventoEnUbicaciones(eventoId, eventoData, 'agregar')
    } catch (err) {
      error.value = err.message
      console.error(' Error al actualizar evento:', err)
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

      // Leer antes de eliminar
      const eventoSnap = await getDoc(eventoDoc)
      const eventoData = eventoSnap.exists() ? eventoSnap.data() : null

      await deleteDoc(eventoDoc)

      // Sincronizar después de eliminar
      if (eventoData) {
        await sincronizarEventoEnUbicaciones(eventoId, eventoData, 'eliminar')
      }
    } catch (err) {
      error.value = err.message
      console.error(' Error al eliminar evento:', err)
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
      const eventoSnap = await getDoc(eventoDoc)
      if (eventoSnap.exists()) {
        await sincronizarEventoEnUbicaciones(eventoId, { ...eventoSnap.data(), activo }, 'agregar')
      }
    } catch (err) {
      error.value = err.message
      console.error(' Error al cambiar estado del evento:', err)
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

      //  Generar referencia con ID automático
      const nuevoDocRef = doc(collection(db, 'Usuarios', userId, 'Eventos'))

      // Guardar con el ID incluido
      await setDoc(nuevoDocRef, {
        id: nuevoDocRef.id, //  El ID como campo
        ...dataSinId,
        nombre: `${dataSinId.nombre} (Copia)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return nuevoDocRef.id
    } catch (err) {
      error.value = err.message
      console.error(' Error al duplicar evento:', err)
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
      console.error(' Error al eliminar eventos:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  // Sincronizar evento con UbicacionesGlobal
  const sincronizarEventoEnUbicaciones = async (eventoId, eventoData, accion) => {
    if (!eventoData.condiciones || eventoData.condiciones.length === 0) return

    // Obtener ubicaciones únicas que referencia este evento
    const ubicacionesIds = [...new Set(eventoData.condiciones.map((c) => c.ubicacionId))]

    for (const ubicacionId of ubicacionesIds) {
      const ubicacionRef = doc(db, 'UbicacionesGlobal', ubicacionId)
      const ubicacionDoc = await getDoc(ubicacionRef)

      if (!ubicacionDoc.exists()) continue

      const eventosActuales = ubicacionDoc.data().eventos || []

      if (accion === 'agregar') {
        // Quitar versión anterior si existe y agregar la nueva
        const eventoFiltrado = eventosActuales.filter((e) => e.eventoId !== eventoId)
        const nuevoEvento = {
          eventoId,
          activo: eventoData.activo ?? true,
          nombre: eventoData.nombre || '',
          activacionAlerta: eventoData.activacionAlerta || 'Cada vez',
          aplicacion: eventoData.aplicacion || 'siempre',
          horaInicio: eventoData.horaInicio || null,
          horaFin: eventoData.horaFin || null,
          diasSemana: eventoData.diasSemana || [],
          condiciones: eventoData.condiciones || [],
          operadoresLogicos: eventoData.operadoresLogicos || [],
        }
        await updateDoc(ubicacionRef, { eventos: [...eventoFiltrado, nuevoEvento] })
      } else if (accion === 'eliminar') {
        const eventoFiltrado = eventosActuales.filter((e) => e.eventoId !== eventoId)
        await updateDoc(ubicacionRef, { eventos: eventoFiltrado })
      }
    }
  }

  //  MODIFICAR el return para incluir la nueva función:
  return {
    loading,
    error,
    crearEvento,
    obtenerEventos,
    actualizarEvento,
    eliminarEvento,
    toggleEvento,
    duplicarEvento,
    eliminarEventosPorUbicacion,
  }
}
