// src/composables/useConductoresFirebase.js
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage, auth } from 'src/firebase/firebaseConfig'

export function useConductoresFirebase() {
  // Estado reactivo
  const conductores = ref([])
  const unidades = ref([])
  const gruposConductores = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Referencias de Firebase
  const conductoresRef = collection(db, 'Conductores')
  const unidadesRef = collection(db, 'Unidades')

  // Obtener el ID del usuario actual
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || null
  }

  // Obtener referencia a grupos del usuario
  const getGruposRef = () => {
    const userId = getCurrentUserId()
    if (!userId) throw new Error('Usuario no autenticado')
    return collection(db, 'Usuarios', userId, 'GruposConductores')
  }

  // === CONDUCTORES ===

  // Obtener todos los conductores
  const obtenerConductores = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(conductoresRef, orderBy('Nombre'))
      const snapshot = await getDocs(q)
      conductores.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      return conductores.value
    } catch (err) {
      console.error('Error al obtener conductores:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Escuchar cambios en tiempo real de conductores
  const escucharConductores = () => {
    const q = query(conductoresRef, orderBy('Nombre'))
    return onSnapshot(
      q,
      (snapshot) => {
        conductores.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      },
      (err) => {
        console.error('Error en listener de conductores:', err)
        error.value = err.message
      },
    )
  }

  // Agregar conductor
  // Agregar conductor
  const agregarConductor = async (conductorData) => {
    loading.value = true
    error.value = null
    try {
      // 1️⃣ Obtener el ID máximo actual
      const snapshot = await getDocs(conductoresRef)
      let maxId = 0
      snapshot.docs.forEach((docItem) => {
        const data = docItem.data()
        const currentId = parseInt(data.Id) || 0
        if (currentId > maxId) maxId = currentId
      })

      const nuevoId = (maxId + 1).toString() // id secuencial como string

      // 2️⃣ Crear documento con ese ID como documentId
      const docRef = doc(conductoresRef, nuevoId)

      await setDoc(docRef, {
        ...conductorData,
        Id: nuevoId,
        createdAt: Timestamp.now(),
      })

      console.log('✅ Conductor creado con Id como documentId:', nuevoId)

      await obtenerConductores()
      return nuevoId
    } catch (err) {
      console.error('Error al agregar conductor:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actualizar conductor
  const actualizarConductor = async (conductorId, data) => {
    loading.value = true
    error.value = null
    try {
      const docRef = doc(conductoresRef, conductorId)
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      })
      await obtenerConductores()
    } catch (err) {
      console.error('Error al actualizar conductor:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar conductor
  const eliminarConductor = async (conductorId) => {
    loading.value = true
    error.value = null
    try {
      // 1. Obtener los datos del conductor para encontrar la URL de la foto
      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        throw new Error('El conductor no existe.')
      }

      const conductorData = conductorSnap.data()

      // 2. Eliminar la foto de licencia de Storage si existe
      if (conductorData.LicenciaConducirFoto) {
        try {
          const fotoRef = storageRef(storage, conductorData.LicenciaConducirFoto)
          await deleteObject(fotoRef)
          console.log('Foto de licencia eliminada de Storage.')
        } catch (storageError) {
          console.warn('Error al eliminar foto (puede que ya no exista):', storageError)
        }
      }

      // 3. Eliminar al conductor de todos los grupos donde esté asignado
      const grupos = await obtenerGruposConductores()
      for (const grupo of grupos) {
        if (grupo.ConductoresIds?.includes(conductorId)) {
          await removerConductorDeGrupo(grupo.id, conductorId)
        }
      }

      // 4. Eliminar el documento del conductor de Firestore
      await deleteDoc(conductorDocRef)

      // 5. Actualizar el estado local de forma eficiente (sin recargar todo)
      conductores.value = conductores.value.filter((c) => c.id !== conductorId)

      console.log('Conductor eliminado correctamente.')
      return true
    } catch (err) {
      console.error('Error al eliminar conductor:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Subir foto de licencia
  const subirFotoLicencia = async (conductorId, file) => {
    loading.value = true
    error.value = null
    try {
      // Crear referencia en Storage
      const timestamp = Date.now()
      const fileName = `licencias/${conductorId}_${timestamp}.${file.name.split('.').pop()}`
      const fileRef = storageRef(storage, fileName)

      // Subir archivo
      const snapshot = await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Actualizar conductor con la URL
      await actualizarConductor(conductorId, {
        LicenciaConducirFoto: downloadURL,
      })

      return downloadURL
    } catch (err) {
      console.error('Error al subir foto:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // === UNIDADES ===

  // Obtener todas las unidades
  const obtenerUnidades = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(unidadesRef, orderBy('Unidad'))
      const snapshot = await getDocs(q)
      unidades.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      return unidades.value
    } catch (err) {
      console.error('Error al obtener unidades:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Asignar unidad a conductor
  const asignarUnidad = async (conductorId, unidadId) => {
    loading.value = true
    error.value = null
    try {
      await actualizarConductor(conductorId, {
        UnidadAsignada: unidadId,
      })
    } catch (err) {
      console.error('Error al asignar unidad:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // === GRUPOS DE CONDUCTORES ===

  // Obtener grupos del usuario
  const obtenerGruposConductores = async () => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const q = query(gruposRef, orderBy('Nombre'))
      const snapshot = await getDocs(q)
      gruposConductores.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      return gruposConductores.value
    } catch (err) {
      console.error('Error al obtener grupos:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Escuchar cambios en grupos
  const escucharGrupos = () => {
    try {
      const gruposRef = getGruposRef()
      const q = query(gruposRef, orderBy('Nombre'))
      return onSnapshot(
        q,
        (snapshot) => {
          gruposConductores.value = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        },
        (err) => {
          console.error('Error en listener de grupos:', err)
          error.value = err.message
        },
      )
    } catch (err) {
      console.error('Error al configurar listener:', err)
      return null
    }
  }

  // Crear grupo
  const crearGrupo = async (grupoData) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const docRef = await addDoc(gruposRef, {
        Nombre: grupoData.Nombre,
        ConductoresIds: grupoData.ConductoresIds || [],
        createdAt: Timestamp.now(),
      })
      await obtenerGruposConductores()
      return docRef.id
    } catch (err) {
      console.error('Error al crear grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actualizar grupo
  const actualizarGrupo = async (grupoId, data) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const docRef = doc(gruposRef, grupoId)

      // Preparar datos para actualizar
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(docRef, updateData)

      // Actualizar el estado local inmediatamente
      const grupoIndex = gruposConductores.value.findIndex((g) => g.id === grupoId)
      if (grupoIndex !== -1) {
        gruposConductores.value[grupoIndex] = {
          ...gruposConductores.value[grupoIndex],
          ...updateData,
          id: grupoId,
        }
      }

      console.log('Grupo actualizado correctamente')
      return true
    } catch (err) {
      console.error('Error al actualizar grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar grupo
  const eliminarGrupo = async (grupoId) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      await deleteDoc(doc(gruposRef, grupoId))

      // Actualizar el estado local inmediatamente
      gruposConductores.value = gruposConductores.value.filter((g) => g.id !== grupoId)

      console.log('Grupo eliminado correctamente')
      return true
    } catch (err) {
      console.error('Error al eliminar grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Agregar conductores a grupo
  const agregarConductoresAGrupo = async (grupoId, conductoresIds) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const docRef = doc(gruposRef, grupoId)
      const grupoDoc = await getDoc(docRef)

      if (!grupoDoc.exists()) {
        throw new Error('Grupo no encontrado')
      }

      const conductoresActuales = grupoDoc.data().ConductoresIds || []
      const nuevosIds = [...new Set([...conductoresActuales, ...conductoresIds])]

      await updateDoc(docRef, {
        ConductoresIds: nuevosIds,
        updatedAt: Timestamp.now(),
      })

      // Actualizar el estado local inmediatamente
      const grupoIndex = gruposConductores.value.findIndex((g) => g.id === grupoId)
      if (grupoIndex !== -1) {
        gruposConductores.value[grupoIndex].ConductoresIds = nuevosIds
      }

      return true
    } catch (err) {
      console.error('Error al agregar conductores a grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remover conductor de grupo
  const removerConductorDeGrupo = async (grupoId, conductorId) => {
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const docRef = doc(gruposRef, grupoId)
      const grupoDoc = await getDoc(docRef)

      if (!grupoDoc.exists()) {
        throw new Error('Grupo no encontrado')
      }

      const conductoresActuales = grupoDoc.data().ConductoresIds || []
      const nuevosIds = conductoresActuales.filter((id) => id !== conductorId)

      await updateDoc(docRef, {
        ConductoresIds: nuevosIds,
        updatedAt: Timestamp.now(),
      })

      // Actualizar el estado local inmediatamente
      const grupoIndex = gruposConductores.value.findIndex((g) => g.id === grupoId)
      if (grupoIndex !== -1) {
        gruposConductores.value[grupoIndex].ConductoresIds = nuevosIds
      }

      console.log('Conductor removido del grupo correctamente')
      return true
    } catch (err) {
      console.error('Error al remover conductor de grupo:', err)
      error.value = err.message
      throw err
    }
  }

  // === UTILIDADES ===

  // Obtener conductores de un grupo
  const conductoresPorGrupo = (grupoId) => {
    const grupo = gruposConductores.value.find((g) => g.id === grupoId)
    if (!grupo) return []

    return conductores.value.filter((c) => grupo.ConductoresIds?.includes(c.id))
  }

  // Contar conductores por grupo
  const contarConductoresPorGrupo = (grupoId) => {
    const grupo = gruposConductores.value.find((g) => g.id === grupoId)
    return grupo?.ConductoresIds?.length || 0
  }

  // Obtener unidad asignada a conductor
  const obtenerUnidadDeConductor = (conductorId) => {
    const conductor = conductores.value.find((c) => c.id === conductorId)
    if (!conductor?.UnidadAsignada) return null

    return unidades.value.find((u) => u.id === conductor.UnidadAsignada)
  }

  return {
    // Estado
    conductores,
    unidades,
    gruposConductores,
    loading,
    error,

    // Métodos de conductores
    obtenerConductores,
    escucharConductores,
    agregarConductor,
    actualizarConductor,
    eliminarConductor,
    subirFotoLicencia,

    // Métodos de unidades
    obtenerUnidades,
    asignarUnidad,
    obtenerUnidadDeConductor,

    // Métodos de grupos
    obtenerGruposConductores,
    escucharGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
    agregarConductoresAGrupo,
    removerConductorDeGrupo,

    // Utilidades
    conductoresPorGrupo,
    contarConductoresPorGrupo,
  }
}
