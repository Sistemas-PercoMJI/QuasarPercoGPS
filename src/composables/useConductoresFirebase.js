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

      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de licencia:', err)
      return []
    }
  }

  // Obtener fotos de seguro de unidad desde Firestore
  const obtenerFotosSeguroUnidad = async (unidadId) => {
    try {
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

      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de seguro:', err)
      return []
    }
  }

  // Obtener fotos de tarjeta de circulación desde Firestore
  const obtenerFotosTargetaCirculacion = async (unidadId) => {
    try {
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

      return fotos
    } catch (err) {
      console.error('❌ Error al obtener fotos de tarjeta:', err)
      return []
    }
  }

  // Descargar foto
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
      console.error('❌ Error al descargar foto:', err)
      throw err
    }
  }

  // === SUBIR Y ELIMINAR FOTOS ===

  // Subir foto de licencia de conductor
  const subirFotoLicencia = async (conductorId, file) => {
    loading.value = true
    error.value = null
    try {
      // Importar dinámicamente storage
      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')

      const timestamp = Date.now()
      const fileName = `LicenciaConducirFotos/${conductorId}/${timestamp}_${file.name}`
      const fileRef = storageRef(storage, fileName)

      // Subir archivo
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)

      // Obtener conductor actual
      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        throw new Error('Conductor no encontrado')
      }

      const conductorData = conductorSnap.data()
      const fotosActuales = conductorData.LicenciaConducirFotos || []

      // Agregar nueva URL al array
      const nuevasFotos = [...fotosActuales, downloadURL]

      // Actualizar Firestore
      await updateDoc(conductorDocRef, {
        LicenciaConducirFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      // Actualizar estado local
      await obtenerConductores()

      return downloadURL
    } catch (err) {
      console.error('❌ Error al subir foto de licencia:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Subir foto de seguro de unidad
  const subirFotoSeguroUnidad = async (unidadId, file) => {
    loading.value = true
    error.value = null
    try {
      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')

      const timestamp = Date.now()
      const fileName = `SeguroUnidadFotos/${unidadId}/${timestamp}_${file.name}`
      const fileRef = storageRef(storage, fileName)

      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        throw new Error('Unidad no encontrada')
      }

      const unidadData = unidadSnap.data()
      const fotosActuales = unidadData.SeguroUnidadFotos || []
      const nuevasFotos = [...fotosActuales, downloadURL]

      await updateDoc(unidadDocRef, {
        SeguroUnidadFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      await obtenerUnidades()

      return downloadURL
    } catch (err) {
      console.error('❌ Error al subir foto de seguro:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Subir foto de tarjeta de circulación
  const subirFotoTargetaCirculacion = async (unidadId, file) => {
    loading.value = true
    error.value = null
    try {
      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')

      const timestamp = Date.now()
      const fileName = `TargetaCirculacionFotos/${unidadId}/${timestamp}_${file.name}`
      const fileRef = storageRef(storage, fileName)

      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        throw new Error('Unidad no encontrada')
      }

      const unidadData = unidadSnap.data()
      const fotosActuales = unidadData.TargetaCirculacionFotos || []
      const nuevasFotos = [...fotosActuales, downloadURL]

      await updateDoc(unidadDocRef, {
        TargetaCirculacionFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      await obtenerUnidades()

      return downloadURL
    } catch (err) {
      console.error('❌ Error al subir foto de tarjeta:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar foto de licencia (solo si está expirada)
  const eliminarFotoLicencia = async (conductorId, fotoUrl, fechaVencimiento) => {
    loading.value = true
    error.value = null
    try {
      // Validar si la licencia está expirada
      if (!fechaVencimiento) {
        throw new Error('No se puede eliminar: No hay fecha de vencimiento configurada')
      }

      let fechaVenc
      if (fechaVencimiento.toDate) {
        fechaVenc = fechaVencimiento.toDate()
      } else {
        fechaVenc = new Date(fechaVencimiento)
      }

      const hoy = new Date()
      if (fechaVenc > hoy) {
        throw new Error('No se puede eliminar: La licencia aún está vigente')
      }

      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        throw new Error('Conductor no encontrado')
      }

      const conductorData = conductorSnap.data()
      const fotosActuales = conductorData.LicenciaConducirFotos || []
      const nuevasFotos = fotosActuales.filter((url) => url !== fotoUrl)

      await updateDoc(conductorDocRef, {
        LicenciaConducirFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      // Eliminar del Storage
      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, deleteObject } = await import('firebase/storage')

      // Extraer la ruta del archivo de la URL
      // Formato esperado de la URL: https://firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o/RUTA_ARCHIVO?alt=media&token=TOKEN
      try {
        const urlObj = new URL(fotoUrl)
        const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0])
        const fotoRef = storageRef(storage, filePath)

        await deleteObject(fotoRef)
      } catch (deleteErr) {
        console.warn('⚠️ No se pudo eliminar del Storage:', deleteErr.message)
      }

      await obtenerConductores()

      return true
    } catch (err) {
      console.error('❌ Error al eliminar foto de licencia:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar foto de seguro (solo si está expirado)
  const eliminarFotoSeguroUnidad = async (unidadId, fotoUrl, fechaVencimiento) => {
    loading.value = true
    error.value = null
    try {
      if (!fechaVencimiento) {
        throw new Error('No se puede eliminar: No hay fecha de vencimiento configurada')
      }

      let fechaVenc
      if (fechaVencimiento.toDate) {
        fechaVenc = fechaVencimiento.toDate()
      } else {
        fechaVenc = new Date(fechaVencimiento)
      }

      const hoy = new Date()
      if (fechaVenc > hoy) {
        throw new Error('No se puede eliminar: El seguro aún está vigente')
      }

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        throw new Error('Unidad no encontrada')
      }

      const unidadData = unidadSnap.data()
      const fotosActuales = unidadData.SeguroUnidadFotos || []
      const nuevasFotos = fotosActuales.filter((url) => url !== fotoUrl)

      await updateDoc(unidadDocRef, {
        SeguroUnidadFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, deleteObject } = await import('firebase/storage')

      try {
        const urlObj = new URL(fotoUrl)
        const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0])
        const fotoRef = storageRef(storage, filePath)

        await deleteObject(fotoRef)
      } catch (deleteErr) {
        console.warn('⚠️ No se pudo eliminar del Storage:', deleteErr.message)
      }

      await obtenerUnidades()

      return true
    } catch (err) {
      console.error('❌ Error al eliminar foto de seguro:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Eliminar foto de tarjeta (solo si está expirada)
  const eliminarFotoTargetaCirculacion = async (unidadId, fotoUrl, fechaVencimiento) => {
    loading.value = true
    error.value = null
    try {
      if (!fechaVencimiento) {
        throw new Error('No se puede eliminar: No hay fecha de vencimiento configurada')
      }

      let fechaVenc
      if (fechaVencimiento.toDate) {
        fechaVenc = fechaVencimiento.toDate()
      } else {
        fechaVenc = new Date(fechaVencimiento)
      }

      const hoy = new Date()
      if (fechaVenc > hoy) {
        throw new Error('No se puede eliminar: La tarjeta aún está vigente')
      }

      const unidadDocRef = doc(unidadesRef, unidadId)
      const unidadSnap = await getDoc(unidadDocRef)

      if (!unidadSnap.exists()) {
        throw new Error('Unidad no encontrada')
      }

      const unidadData = unidadSnap.data()
      const fotosActuales = unidadData.TargetaCirculacionFotos || []
      const nuevasFotos = fotosActuales.filter((url) => url !== fotoUrl)

      await updateDoc(unidadDocRef, {
        TargetaCirculacionFotos: nuevasFotos,
        updatedAt: Timestamp.now(),
      })

      const { storage } = await import('src/firebase/firebaseConfig')
      const { ref: storageRef, deleteObject } = await import('firebase/storage')

      try {
        const urlObj = new URL(fotoUrl)
        const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0])
        const fotoRef = storageRef(storage, filePath)

        await deleteObject(fotoRef)
      } catch (deleteErr) {
        console.warn('⚠️ No se pudo eliminar del Storage:', deleteErr.message)
      }

      await obtenerUnidades()

      return true
    } catch (err) {
      console.error('❌ Error al eliminar foto de tarjeta:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
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

  const puedeEditarCampo = (fechaVencimiento) => {
    if (!fechaVencimiento) {
      // Si no hay fecha de vencimiento, no se puede editar
      return false
    }

    let fechaVenc
    if (fechaVencimiento.toDate) {
      fechaVenc = fechaVencimiento.toDate()
    } else if (fechaVencimiento.seconds) {
      fechaVenc = new Date(fechaVencimiento.seconds * 1000)
    } else {
      fechaVenc = new Date(fechaVencimiento)
    }

    const hoy = new Date()
    // Solo se puede editar si está expirado
    return fechaVenc <= hoy
  }

  // Validar campos específicos de conductor
  const puedeEditarLicenciaConducir = (conductor) => {
    return puedeEditarCampo(conductor?.LicenciaConducirFecha)
  }

  // Validar campos específicos de unidad
  const puedeEditarSeguroUnidad = (unidad) => {
    return puedeEditarCampo(unidad?.SeguroUnidadFecha)
  }

  const puedeEditarTargetaCirculacion = (unidad) => {
    return puedeEditarCampo(unidad?.TargetaCirculacionFecha)
  }

  const desasignarUnidadYLimpiarMapa = async (conductorId) => {
    loading.value = true
    error.value = null
    try {
      // 1. Obtener el conductor actual
      const conductorDocRef = doc(conductoresRef, conductorId)
      const conductorSnap = await getDoc(conductorDocRef)

      if (!conductorSnap.exists()) {
        throw new Error('Conductor no encontrado')
      }

      const conductorData = conductorSnap.data()
      const unidadAsignada = conductorData.UnidadAsignada

      // 2. Actualizar Firestore para quitar la unidad
      await updateDoc(conductorDocRef, {
        UnidadAsignada: null,
        updatedAt: Timestamp.now(),
      })

      // 3. Si había una unidad asignada, eliminarla del Realtime Database
      if (unidadAsignada) {
        const { realtimeDb } = await import('src/firebase/firebaseConfig')
        const { ref: dbRef, remove } = await import('firebase/database')

        const unidadId = `unidad_${unidadAsignada}`
        const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)

        // Eliminar de unidades_activas
        await remove(unidadRef)
        console.log(`✅ Unidad ${unidadId} eliminada del mapa`)
      }

      // 4. Actualizar el estado local
      await obtenerConductores()

      return true
    } catch (err) {
      console.error('❌ Error al desasignar unidad:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
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

    // Métodos para subir fotos
    subirFotoLicencia,
    subirFotoSeguroUnidad,
    subirFotoTargetaCirculacion,

    // Métodos para eliminar fotos (con validación de fecha)
    eliminarFotoLicencia,
    eliminarFotoSeguroUnidad,
    eliminarFotoTargetaCirculacion,

    // **NUEVAS FUNCIONES DE VALIDACIÓN**
    puedeEditarCampo,
    puedeEditarLicenciaConducir,
    puedeEditarSeguroUnidad,
    puedeEditarTargetaCirculacion,

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

    // Nueva implementacion
    desasignarUnidadYLimpiarMapa,
  }
}
