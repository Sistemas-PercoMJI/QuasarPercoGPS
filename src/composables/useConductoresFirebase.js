// src/composables/useConductoresFirebase.js
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { ref as storageRef, listAll, getDownloadURL, getMetadata } from 'firebase/storage'
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

  const eliminarConductor = async (conductorId) => {
    loading.value = true
    error.value = null
    try {
      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        throw new Error('El conductor no existe.')
      }

      const grupos = await obtenerGruposConductores()
      for (const grupo of grupos) {
        if (grupo.ConductoresIds?.includes(conductorId)) {
          await removerConductorDeGrupo(grupo.id, conductorId)
        }
      }

      await deleteDoc(conductorDocRef)
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

  // === FOTOS DE STORAGE ===

  const obtenerFotosLicencia = async (conductorId) => {
    try {
      console.log('📸 Obteniendo fotos de licencia para:', conductorId)
      const folderRef = storageRef(storage, `LicenciaConducirFotos/${conductorId}`)
      const result = await listAll(folderRef)
      
      const fotosPromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef)
        const metadata = await getMetadata(itemRef)
        return {
          name: itemRef.name,
          url: url,
          fullPath: itemRef.fullPath,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
        }
      })

      const fotos = await Promise.all(fotosPromises)
      console.log('✅ Fotos de licencia obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('Error al obtener fotos de licencia:', err)
      return []
    }
  }

  const obtenerFotosSeguroUnidad = async (unidadId) => {
    try {
      console.log('📸 Obteniendo fotos de seguro para:', unidadId)
      const folderRef = storageRef(storage, `SeguroUnidadFotos/${unidadId}`)
      const result = await listAll(folderRef)
      
      const fotosPromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef)
        const metadata = await getMetadata(itemRef)
        return {
          name: itemRef.name,
          url: url,
          fullPath: itemRef.fullPath,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
        }
      })

      const fotos = await Promise.all(fotosPromises)
      console.log('✅ Fotos de seguro obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('Error al obtener fotos de seguro:', err)
      return []
    }
  }

  const obtenerFotosTargetaCirculacion = async (unidadId) => {
    try {
      console.log('📸 Obteniendo fotos de tarjeta para:', unidadId)
      const folderRef = storageRef(storage, `TargetaCirculacionFotos/${unidadId}`)
      const result = await listAll(folderRef)
      
      const fotosPromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef)
        const metadata = await getMetadata(itemRef)
        return {
          name: itemRef.name,
          url: url,
          fullPath: itemRef.fullPath,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
        }
      })

      const fotos = await Promise.all(fotosPromises)
      console.log('✅ Fotos de tarjeta obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('Error al obtener fotos de tarjeta:', err)
      return []
    }
  }

  const descargarFoto = async (url, nombreArchivo) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = nombreArchivo
      link.click()
      window.URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Error al descargar foto:', err)
      throw err
    }
  }

  // === UNIDADES ===

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

  // === GRUPOS ===

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

  const actualizarGrupo = async (grupoId, data) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      const docRef = doc(gruposRef, grupoId)

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(docRef, updateData)

      const grupoIndex = gruposConductores.value.findIndex((g) => g.id === grupoId)
      if (grupoIndex !== -1) {
        gruposConductores.value[grupoIndex] = {
          ...gruposConductores.value[grupoIndex],
          ...updateData,
          id: grupoId,
        }
      }

      return true
    } catch (err) {
      console.error('Error al actualizar grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const eliminarGrupo = async (grupoId) => {
    loading.value = true
    error.value = null
    try {
      const gruposRef = getGruposRef()
      await deleteDoc(doc(gruposRef, grupoId))
      gruposConductores.value = gruposConductores.value.filter((g) => g.id !== grupoId)
      return true
    } catch (err) {
      console.error('Error al eliminar grupo:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

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

      const grupoIndex = gruposConductores.value.findIndex((g) => g.id === grupoId)
      if (grupoIndex !== -1) {
        gruposConductores.value[grupoIndex].ConductoresIds = nuevosIds
      }

      return true
    } catch (err) {
      console.error('Error al remover conductor de grupo:', err)
      error.value = err.message
      throw err
    }
  }

  // === UTILIDADES ===

  const conductoresPorGrupo = (grupoId) => {
    const grupo = gruposConductores.value.find((g) => g.id === grupoId)
    if (!grupo) return []
    return conductores.value.filter((c) => grupo.ConductoresIds?.includes(c.id))
  }

  const contarConductoresPorGrupo = (grupoId) => {
    const grupo = gruposConductores.value.find((g) => g.id === grupoId)
    return grupo?.ConductoresIds?.length || 0
  }

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
    actualizarConductor,
    eliminarConductor,

    // Métodos de fotos
    obtenerFotosLicencia,
    obtenerFotosSeguroUnidad,
    obtenerFotosTargetaCirculacion,
    descargarFoto,

    // Métodos de unidades
    obtenerUnidades,
    asignarUnidad,
    obtenerUnidadDeConductor,

    // Métodos de grupos
    obtenerGruposConductores,
    escucharGrupos,
    actualizarGrupo,
    eliminarGrupo,
    removerConductorDeGrupo,

    // Utilidades
    conductoresPorGrupo,
    contarConductoresPorGrupo,
  }
}