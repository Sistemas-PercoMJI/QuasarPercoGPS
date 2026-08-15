// src/composables/useGruposUnidades.js
import { ref } from 'vue'
import { auth } from 'src/firebase/firebaseConfig'

const gruposUnidades = ref([])

export function useGruposUnidades() {
  let unsubscribe = null

  const obtenerGrupos = async () => {
    const userId = auth.currentUser?.uid
    if (!userId) return []

    try {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('src/firebase/firebaseConfig')

      const q = query(
        collection(db, `Usuarios/${userId}/GruposUnidades`),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      gruposUnidades.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      return gruposUnidades.value
    } catch (error) {
      console.error('Error obteniendo grupos de unidades:', error)
      return []
    }
  }

  const escucharGrupos = () => {
    const userId = auth.currentUser?.uid
    if (!userId) return () => {}

    const setupListener = async () => {
      const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore')
      const { db } = await import('src/firebase/firebaseConfig')

      const q = query(
        collection(db, `Usuarios/${userId}/GruposUnidades`),
        orderBy('createdAt', 'desc'),
      )

      unsubscribe = onSnapshot(q, (snapshot) => {
        gruposUnidades.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      })
    }

    setupListener()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }

  const crearGrupo = async (nombre, unidadesIds) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('No hay usuario autenticado')

    const { collection, addDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    await addDoc(collection(db, `Usuarios/${userId}/GruposUnidades`), {
      Nombre: nombre,
      UnidadesIds: unidadesIds,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    await obtenerGrupos()
  }

  const actualizarGrupo = async (grupoId, datos) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('No hay usuario autenticado')

    const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    await updateDoc(doc(db, `Usuarios/${userId}/GruposUnidades`, grupoId), {
      ...datos,
      updatedAt: Timestamp.now(),
    })

    await obtenerGrupos()
  }

  const eliminarGrupo = async (grupoId) => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error('No hay usuario autenticado')

    const { doc, deleteDoc } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    await deleteDoc(doc(db, `Usuarios/${userId}/GruposUnidades`, grupoId))
    await obtenerGrupos()
  }

  return {
    gruposUnidades,
    obtenerGrupos,
    escucharGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  }
}
