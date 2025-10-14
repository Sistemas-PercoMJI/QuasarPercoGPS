import { ref, computed } from 'vue'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db, auth } from 'src/firebase/firebaseConfig'

export function useConductores() {
  const conductores = ref([])
  const grupos = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Obtener el ID del usuario actual
  const getUserId = () => {
    const user = auth.currentUser
    if (!user) throw new Error('Usuario no autenticado')
    return user.uid
  }

  // ===============================
  // CONDUCTORES (Global)
  // ===============================
  
  const obtenerConductores = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(collection(db, 'Conductores'), orderBy('Nombre'))
      const querySnapshot = await getDocs(q)
      
      conductores.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return conductores.value
    } catch (err) {
      error.value = err.message
      console.error('Error al obtener conductores:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const agregarConductor = async (conductorData) => {
    loading.value = true
    error.value = null
    try {
      const nuevoConductor = {
        Nombre: conductorData.Nombre,
        Usuario: conductorData.Usuario,
        Telefono: conductorData.Telefono || '',
        LicenciaConduccirFoto: conductorData.LicenciaConduccirFoto || '',
        LicenciaConduccirVFecha: conductorData.LicenciaConduccirVFecha || null
      }
      
      const docRef = await addDoc(collection(db, 'Conductores'), nuevoConductor)
      
      const conductorCreado = {
        id: docRef.id,
        ...nuevoConductor
      }
      
      conductores.value.push(conductorCreado)
      return conductorCreado
    } catch (err) {
      error.value = err.message
      console.error('Error al agregar conductor:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const actualizarConductor = async (conductorId, datos) => {
    loading.value = true
    error.value = null
    try {
      const conductorRef = doc(db, 'Conductores', conductorId)
      await updateDoc(conductorRef, datos)
      
      const index = conductores.value.findIndex(c => c.id === conductorId)
      if (index !== -1) {
        conductores.value[index] = {
          ...conductores.value[index],
          ...datos
        }
      }
      
      return conductores.value[index]
    } catch (err) {
      error.value = err.message
      console.error('Error al actualizar conductor:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const eliminarConductor = async (conductorId) => {
    loading.value = true
    error.value = null
    try {
      await deleteDoc(doc(db, 'Conductores', conductorId))
      
      const index = conductores.value.findIndex(c => c.id === conductorId)
      if (index !== -1) {
        conductores.value.splice(index, 1)
      }
         
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error al eliminar conductor:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===============================
  // GRUPOS (Subcolección por usuario)
  // ===============================
  
  const obtenerGrupos = async () => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      const gruposRef = collection(db, 'Usuarios', userId, 'GruposConductores')
      const querySnapshot = await getDocs(gruposRef)
      
      grupos.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ConductoresIds: doc.data().ConductoresIds || []
      }))
      
      return grupos.value
    } catch (err) {
      error.value = err.message
      console.error('Error al obtener grupos:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const crearGrupo = async (grupoData) => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      const gruposRef = collection(db, 'Usuarios', userId, 'GruposConductores')
      
      const nuevoGrupo = {
        Nombre: grupoData.Nombre,
        ConductoresIds: grupoData.ConductoresIds || []
      }
      
      const docRef = await addDoc(gruposRef, nuevoGrupo)
      
      const grupoCreado = {
        id: docRef.id,
        ...nuevoGrupo
      }
      
      grupos.value.push(grupoCreado)
      return grupoCreado
    } catch (err) {
      error.value = err.message
      console.error('Error al crear grupo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const actualizarGrupo = async (grupoId, datos) => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      const grupoRef = doc(db, 'Usuarios', userId, 'GruposConductores', grupoId)
      await updateDoc(grupoRef, datos)
      
      const index = grupos.value.findIndex(g => g.id === grupoId)
      if (index !== -1) {
        grupos.value[index] = {
          ...grupos.value[index],
          ...datos
        }
      }
      
      return grupos.value[index]
    } catch (err) {
      error.value = err.message
      console.error('Error al actualizar grupo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const eliminarGrupo = async (grupoId) => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      await deleteDoc(doc(db, 'Usuarios', userId, 'GruposConductores', grupoId))
      
      const index = grupos.value.findIndex(g => g.id === grupoId)
      if (index !== -1) {
        grupos.value.splice(index, 1)
      }
      
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error al eliminar grupo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const agregarConductoresAGrupo = async (grupoId, conductoresIds) => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      const grupoRef = doc(db, 'Usuarios', userId, 'GruposConductores', grupoId)
      
      const grupoDoc = await getDoc(grupoRef)
      const grupoData = grupoDoc.data()
      const conductoresActuales = grupoData.ConductoresIds || []
      
      // Combinar sin duplicados
      const nuevosConductores = [...new Set([...conductoresActuales, ...conductoresIds])]
      
      await updateDoc(grupoRef, {
        ConductoresIds: nuevosConductores
      })
      
      // Actualizar local
      const grupo = grupos.value.find(g => g.id === grupoId)
      if (grupo) {
        grupo.ConductoresIds = nuevosConductores
      }
      
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error al agregar conductores a grupo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const removerConductorDeGrupo = async (grupoId, conductorId) => {
    loading.value = true
    error.value = null
    try {
      const userId = getUserId()
      const grupoRef = doc(db, 'Usuarios', userId, 'GruposConductores', grupoId)
      
      const grupoDoc = await getDoc(grupoRef)
      const grupoData = grupoDoc.data()
      const conductoresActuales = grupoData.ConductoresIds || []
      
      const nuevosConductores = conductoresActuales.filter(id => id !== conductorId)
      
      await updateDoc(grupoRef, {
        ConductoresIds: nuevosConductores
      })
      
      // Actualizar local
      const grupo = grupos.value.find(g => g.id === grupoId)
      if (grupo) {
        grupo.ConductoresIds = nuevosConductores
      }
      
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error al remover conductor de grupo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===============================
  // COMPUTED
  // ===============================
  
  const conductoresSinGrupo = computed(() => {
    const todosLosIds = grupos.value.flatMap(g => g.ConductoresIds || [])
    return conductores.value.filter(c => !todosLosIds.includes(c.id))
  })

  const conductoresPorGrupo = (grupoId) => {
    const grupo = grupos.value.find(g => g.id === grupoId)
    if (!grupo) return []
    
    return conductores.value.filter(c => grupo.ConductoresIds.includes(c.id))
  }

  const contarConductoresPorGrupo = (grupoId) => {
    const grupo = grupos.value.find(g => g.id === grupoId)
    return grupo ? (grupo.ConductoresIds?.length || 0) : 0
  }

  return {
    // State
    conductores,
    grupos,
    loading,
    error,
    
    // Conductores
    obtenerConductores,
    agregarConductor,
    actualizarConductor,
    eliminarConductor,
    
    // Grupos
    obtenerGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
    agregarConductoresAGrupo,
    removerConductorDeGrupo,
    
    // Computed
    conductoresSinGrupo,
    conductoresPorGrupo,
    contarConductoresPorGrupo
  }
}