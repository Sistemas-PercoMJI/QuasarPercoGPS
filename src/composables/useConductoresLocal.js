// src/composables/useConductoresLocal.js
import { ref, computed } from 'vue'

export function useConductoresLocal() {
  const conductores = ref([])
  const grupos = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Datos de prueba
  const datosPrueba = {
    conductores: [
      {
        id: '1',
        Nombre: 'Juan Pérez García',
        Usuario: 'juanpg',
        Telefono: '6641234567',
        LicenciaConducirFoto: '',
        LicenciaConducirVFecha: new Date('2025-12-31')
      },
      {
        id: '2', 
        Nombre: 'María López Hernández',
        Usuario: 'marialh',
        Telefono: '6647654321',
        LicenciaConducirFoto: '',
        LicenciaConducirVFecha: new Date('2024-06-15')
      },
      {
        id: '3',
        Nombre: 'Carlos Rodríguez',
        Usuario: 'carlosr',
        Telefono: '6645558888',
        LicenciaConducirFoto: '',
        LicenciaConducirVFecha: new Date('2025-08-20')
      },
      {
        id: '4',
        Nombre: 'Ana Martínez',
        Usuario: 'anam',
        Telefono: '6642223333',
        LicenciaConducirFoto: '',
        LicenciaConducirVFecha: new Date('2024-11-30')
      }
    ],
    grupos: [
      {
        id: 'grupo1',
        Nombre: 'Conductores Matutinos',
        ConductoresIds: ['1', '2']
      },
      {
        id: 'grupo2', 
        Nombre: 'Conductores Vespertinos',
        ConductoresIds: ['3', '4']
      },
      {
        id: 'grupo3',
        Nombre: 'Conductores Especiales',
        ConductoresIds: ['1']
      }
    ]
  }

  // Simular delay de red
  const simularDelay = () => new Promise(resolve => setTimeout(resolve, 500))

  // Función para simular subida de imagen (convierte a base64)
  const simularSubidaImagen = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        // Simular procesamiento
        setTimeout(() => {
          resolve(e.target.result)
        }, 1000)
      }
      reader.readAsDataURL(file)
    })
  }

  // ===============================
  // CONDUCTORES
  // ===============================
  
  const obtenerConductores = async () => {
    loading.value = true
    error.value = null
    try {
      await simularDelay()
      conductores.value = [...datosPrueba.conductores]
      console.log('✅ Conductores cargados (local):', conductores.value.length)
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
      await simularDelay()
      
      const nuevoConductor = {
        id: Date.now().toString(),
        Nombre: conductorData.Nombre,
        Usuario: conductorData.Usuario,
        Telefono: conductorData.Telefono || '',
        LicenciaConduccirFoto: conductorData.LicenciaConduccirFoto || '',
        LicenciaConduccirVFecha: conductorData.LicenciaConduccirVFecha || null
      }
      
      conductores.value.push(nuevoConductor)
      console.log('✅ Conductor agregado:', nuevoConductor)
      return nuevoConductor
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
      await simularDelay()
      
      const index = conductores.value.findIndex(c => c.id === conductorId)
      if (index !== -1) {
        conductores.value[index] = {
          ...conductores.value[index],
          ...datos
        }
      }
      
      console.log('✅ Conductor actualizado:', conductores.value[index])
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
      await simularDelay()
      
      const index = conductores.value.findIndex(c => c.id === conductorId)
      if (index !== -1) {
        conductores.value.splice(index, 1)
      }
      
      // También eliminar de todos los grupos
      grupos.value.forEach(grupo => {
        if (grupo.ConductoresIds) {
          grupo.ConductoresIds = grupo.ConductoresIds.filter(id => id !== conductorId)
        }
      })
      
      console.log('✅ Conductor eliminado:', conductorId)
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error al eliminar conductor:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const subirFotoLicencia = async (conductorId, file) => {
    loading.value = true
    error.value = null
    try {
      console.log('📸 Subiendo foto para conductor:', conductorId)
      
      // Simular subida de imagen
      const fotoBase64 = await simularSubidaImagen(file)
      
      // Actualizar conductor con la nueva foto
      const index = conductores.value.findIndex(c => c.id === conductorId)
      if (index !== -1) {
        conductores.value[index].LicenciaConduccirFoto = fotoBase64
      }
      
      console.log('✅ Foto subida correctamente')
      return fotoBase64
    } catch (err) {
      error.value = err.message
      console.error('Error al subir foto:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===============================
  // GRUPOS
  // ===============================
  
  const obtenerGrupos = async () => {
    loading.value = true
    error.value = null
    try {
      await simularDelay()
      grupos.value = [...datosPrueba.grupos]
      console.log('✅ Grupos cargados (local):', grupos.value.length)
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
      await simularDelay()
      
      const nuevoGrupo = {
        id: 'grupo' + Date.now(),
        Nombre: grupoData.Nombre,
        ConductoresIds: grupoData.ConductoresIds || []
      }
      
      grupos.value.push(nuevoGrupo)
      console.log('✅ Grupo creado:', nuevoGrupo)
      return nuevoGrupo
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
      await simularDelay()
      
      const index = grupos.value.findIndex(g => g.id === grupoId)
      if (index !== -1) {
        grupos.value[index] = {
          ...grupos.value[index],
          ...datos
        }
      }
      
      console.log('✅ Grupo actualizado:', grupos.value[index])
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
      await simularDelay()
      
      const index = grupos.value.findIndex(g => g.id === grupoId)
      if (index !== -1) {
        grupos.value.splice(index, 1)
      }
      
      console.log('✅ Grupo eliminado:', grupoId)
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
      await simularDelay()
      
      const grupo = grupos.value.find(g => g.id === grupoId)
      if (grupo) {
        // Combinar sin duplicados
        grupo.ConductoresIds = [...new Set([...grupo.ConductoresIds, ...conductoresIds])]
      }
      
      console.log('✅ Conductores agregados al grupo:', grupoId, conductoresIds)
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
      await simularDelay()
      
      const grupo = grupos.value.find(g => g.id === grupoId)
      if (grupo) {
        grupo.ConductoresIds = grupo.ConductoresIds.filter(id => id !== conductorId)
      }
      
      console.log('✅ Conductor removido del grupo:', grupoId, conductorId)
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
    subirFotoLicencia,
    
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