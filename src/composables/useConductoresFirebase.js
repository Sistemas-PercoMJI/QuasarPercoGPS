// src/composables/useConductoresFirebase.js
import { ref as storageRef, getBlob } from 'firebase/storage'
import { storage } from 'src/firebase/firebaseConfig' // ✅ Importar storage
import { ref } from 'vue'
//import { ref as storageRef, getBlob } from 'firebase/storage'
//import { storage } from 'src/firebase/firebaseConfig' // Ajusta la ruta según tu proyecto
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
import { db, auth } from 'src/firebase/firebaseConfig'

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

  // === OBTENER FOTOS DESDE FIRESTORE ===

  // Obtener fotos de licencia de conductor desde Firestore
  const obtenerFotosLicencia = async (conductorId) => {
    try {
      console.log('📸 Obteniendo fotos de licencia para conductor:', conductorId)

      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        console.warn('⚠️ Conductor no encontrado')
        return []
      }

      const conductorData = conductorSnap.data()
      const fotosArray = conductorData.LicenciaConducirFotos || []

      // Convertir el array de URLs a objetos con más información
      const fotos = fotosArray
        .filter((url) => url && url.trim() !== '') // Filtrar URLs vacías
        .map((url, index) => ({
          name: `licencia_${index + 1}`,
          url: url,
          fullPath: url,
          index: index,
        }))

      console.log('✅ Fotos de licencia obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de licencia:', err)
      return []
    }
  }

  // Obtener fotos de seguro de unidad desde Firestore
  const obtenerFotosSeguroUnidad = async (unidadId) => {
    try {
      console.log('📸 Obteniendo fotos de seguro para unidad:', unidadId)

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        console.warn('⚠️ Unidad no encontrada')
        return []
      }

      const unidadData = unidadSnap.data()
      const fotosArray = unidadData.SeguroUnidadFotos || []

      // Convertir el array de URLs a objetos con más información
      const fotos = fotosArray
        .filter((url) => url && url.trim() !== '') // Filtrar URLs vacías
        .map((url, index) => ({
          name: `seguro_${index + 1}`,
          url: url,
          fullPath: url,
          index: index,
        }))

      console.log('✅ Fotos de seguro obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de seguro:', err)
      return []
    }
  }

  // Obtener fotos de tarjeta de circulación desde Firestore
  const obtenerFotosTargetaCirculacion = async (unidadId) => {
    try {
      console.log('📸 Obteniendo fotos de tarjeta para unidad:', unidadId)

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        console.warn('⚠️ Unidad no encontrada')
        return []
      }

      const unidadData = unidadSnap.data()
      const fotosArray = unidadData.TargetaCirculacionFotos || []

      // Convertir el array de URLs a objetos con más información
      const fotos = fotosArray
        .filter((url) => url && url.trim() !== '') // Filtrar URLs vacías
        .map((url, index) => ({
          name: `tarjeta_${index + 1}`,
          url: url,
          fullPath: url,
          index: index,
        }))

      console.log('✅ Fotos de tarjeta obtenidas:', fotos.length)
      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de tarjeta:', err)
      return []
    }
  }

  // Descargar foto

  const descargarFoto = async (url, nombreArchivo) => {
    try {
      console.log('⬇️ Descargando foto:', nombreArchivo)
      console.log('🔗 URL completa:', url)

      // Extraer la ruta del archivo desde la URL de Firebase
      const urlObj = new URL(url)
      console.log('📋 pathname:', urlObj.pathname)

      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/)
      console.log('🔍 pathMatch:', pathMatch)

      if (!pathMatch) {
        // ✅ NUEVA FORMA: Extraer directamente del pathname
        // Firebase Storage URL format: /v0/b/BUCKET/o/PATH
        const pathParts = urlObj.pathname.split('/o/')
        console.log('📂 pathParts:', pathParts)

        if (pathParts.length < 2) {
          throw new Error('URL de Firebase Storage inválida')
        }

        const filePath = decodeURIComponent(pathParts[1])
        console.log('📂 Ruta del archivo (método alternativo):', filePath)

        // Obtener referencia al archivo
        const fileRef = storageRef(storage, filePath)

        // Descargar como blob
        const blob = await getBlob(fileRef)

        // Crear URL temporal y descargar
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = nombreArchivo || 'licencia.jpg'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Limpiar URL temporal
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

        console.log('✅ Foto descargada correctamente')
        return
      }

      const filePath = decodeURIComponent(pathMatch[1])
      console.log('📂 Ruta del archivo:', filePath)

      // Obtener referencia al archivo
      const fileRef = storageRef(storage, filePath)

      // Descargar como blob
      const blob = await getBlob(fileRef)

      // Crear URL temporal y descargar
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = nombreArchivo || 'licencia.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Limpiar URL temporal
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

      console.log('✅ Foto descargada correctamente')
    } catch (err) {
      console.error('❌ Error al descargar foto:', err)
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

    // Métodos de fotos (ahora desde Firestore)
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
