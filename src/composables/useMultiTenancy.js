// src/composables/useMultiTenancy.js - VERSIÓN SIMPLIFICADA (SOLO FILTRADO)
import { ref, computed } from 'vue'
import { auth, db } from 'src/firebase/firebaseConfig'
import { doc, collection, query, where } from 'firebase/firestore'

// Estado global compartido
const usuarioActual = ref(null)
const idEmpresaActual = ref(null)
const cargandoUsuario = ref(false)

export function useMultiTenancy() {
  /**
   * Obtener el ID del usuario autenticado
   */
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || null
  }

  /**
   * Cargar datos del usuario actual desde Firestore
   */
  /**
   * Cargar datos del usuario actual desde Firestore Y escuchar cambios
   */
  const cargarUsuarioActual = async () => {
    cargandoUsuario.value = true
    try {
      const userId = getCurrentUserId()
      if (!userId) {
        console.warn('⚠️ No hay usuario autenticado')
        usuarioActual.value = null
        idEmpresaActual.value = null
        return null
      }

      const userDocRef = doc(db, 'Usuarios', userId)

      // 🆕 LISTENER: Escuchar cambios en tiempo real
      const { onSnapshot } = await import('firebase/firestore')

      onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const userData = { id: snapshot.id, ...snapshot.data() }
            usuarioActual.value = userData
            idEmpresaActual.value = userData.IdEmpresaUsuario || null

            console.log('✅ Usuario actualizado:', userData.Usuario)
            console.log('🏢 Empresa(s):', idEmpresaActual.value)

            // 🆕 Emitir evento global cuando cambia la empresa
            window.dispatchEvent(
              new CustomEvent('empresa-cambiada', {
                detail: { empresas: idEmpresaActual.value },
              }),
            )
          } else {
            console.error('❌ Usuario no encontrado en Firestore')
            usuarioActual.value = null
            idEmpresaActual.value = null
          }
          cargandoUsuario.value = false
        },
        (error) => {
          console.error('❌ Error escuchando usuario:', error)
          cargandoUsuario.value = false
        },
      )
    } catch (error) {
      console.error('❌ Error cargando usuario:', error)
      usuarioActual.value = null
      idEmpresaActual.value = null
      cargandoUsuario.value = false
      throw error
    }
  }

  /**
   * Obtener IdEmpresa del usuario actual
   */
  const getIdEmpresaActual = () => {
    return idEmpresaActual.value
  }

  /**
   * Verificar si el usuario tiene empresa asignada
   */
  const tieneEmpresaAsignada = computed(() => {
    return !!idEmpresaActual.value && idEmpresaActual.value.trim() !== ''
  })

  /**
   * 🔥 FUNCIÓN PRINCIPAL - Crear query con filtro de empresa
   * @param {string} coleccion - Nombre de la colección ('Conductores', 'Unidades')
   * @param {string} campoEmpresa - Campo de empresa a filtrar
   */
  // src/composables/useMultiTenancy.js

  const crearQueryConEmpresa = (coleccion, campoEmpresa) => {
    const idEmpresa = getIdEmpresaActual()

    // Sin empresa = sin filtro (super admin)
    if (!idEmpresa || (Array.isArray(idEmpresa) && idEmpresa.length === 0)) {
      console.warn('⚠️ No hay empresa asignada, mostrando TODO')
      return query(collection(db, coleccion))
    }

    // Array de empresas = filtro múltiple
    if (Array.isArray(idEmpresa)) {
      console.log(`🔍 Filtrando ${coleccion} por ${campoEmpresa} in [${idEmpresa.join(', ')}]`)

      // ⚠️ Firebase 'in' soporta máximo 10 valores
      if (idEmpresa.length > 10) {
        console.warn('⚠️ Solo se pueden filtrar hasta 10 empresas a la vez')
        return query(collection(db, coleccion), where(campoEmpresa, 'in', idEmpresa.slice(0, 10)))
      }

      return query(collection(db, coleccion), where(campoEmpresa, 'in', idEmpresa))
    }

    // String simple = filtro único
    console.log(`🔍 Filtrando ${coleccion} por ${campoEmpresa} = ${idEmpresa}`)
    return query(collection(db, coleccion), where(campoEmpresa, '==', idEmpresa))
  }

  /**
   * Filtrar array de documentos por empresa (para datos ya cargados)
   * @param {Array} documentos - Array de documentos
   * @param {string} campoEmpresa - Campo que contiene el IdEmpresa
   */
  const filtrarPorEmpresa = (documentos, campoEmpresa) => {
    const idEmpresa = getIdEmpresaActual()

    if (!idEmpresa) {
      console.warn('⚠️ No hay empresa asignada, devolviendo array vacío')
      return []
    }

    return documentos.filter((doc) => doc[campoEmpresa] === idEmpresa)
  }

  return {
    // Estado
    usuarioActual,
    idEmpresaActual,
    cargandoUsuario,
    tieneEmpresaAsignada,

    // Métodos
    cargarUsuarioActual,
    getIdEmpresaActual,
    crearQueryConEmpresa,
    filtrarPorEmpresa,
  }
}
