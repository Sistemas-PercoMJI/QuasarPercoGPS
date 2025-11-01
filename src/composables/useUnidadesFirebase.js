// composables/useUnidadesFirebase.js
import { ref } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db, auth } from 'src/firebase/firebaseConfig'

const unidades = ref([])
const cargando = ref(false)
const error = ref(null)

export function useUnidadesFirebase() {
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || null
  }
  /**
   *
   * Obtener todas las unidades desde Firebase
   */
  const obtenerUnidades = async () => {
    try {
      cargando.value = true
      error.value = null

      const userId = getCurrentUserId()
      if (!userId) {
        console.warn('⚠️ No hay usuario autenticado')
        return []
      }

      const unidadesRef = collection(db, 'Unidades')
      const snapshot = await getDocs(unidadesRef)

      unidades.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log('✅ Unidades cargadas:', unidades.value.length)
      return unidades.value
    } catch (err) {
      console.error('❌ Error al obtener unidades:', err)
      error.value = err.message
      return []
    } finally {
      cargando.value = false
    }
  }

  /**
   * Buscar una unidad por ID
   */
  const obtenerUnidadPorId = (id) => {
    return unidades.value.find((u) => u.id === id)
  }

  /**
   * Buscar unidades por término de búsqueda
   */
  const buscarUnidadesPorTermino = (termino) => {
    if (!termino) return []

    const terminoLower = termino.toLowerCase()

    return unidades.value.filter((unidad) => {
      return (
        unidad.Unidad?.toLowerCase().includes(terminoLower) ||
        unidad.Id?.toLowerCase().includes(terminoLower) ||
        unidad.SeguroUnidad?.toLowerCase().includes(terminoLower) ||
        unidad.TargetaCirculacion?.toLowerCase().includes(terminoLower)
      )
    })
  }

  /**
   * Verificar si una unidad tiene documentos vigentes
   */
  const documentosVigentes = (unidadId) => {
    const unidad = obtenerUnidadPorId(unidadId)
    if (!unidad) return { seguro: false, tarjeta: false }

    const ahora = new Date()

    const seguroVigente = unidad.SeguroUnidadFecha
      ? new Date(unidad.SeguroUnidadFecha.seconds * 1000) > ahora
      : false

    const tarjetaVigente = unidad.TargetaCirculacionFecha
      ? new Date(unidad.TargetaCirculacionFecha.seconds * 1000) > ahora
      : false

    return {
      seguro: seguroVigente,
      tarjeta: tarjetaVigente,
      ambos: seguroVigente && tarjetaVigente,
    }
  }

  return {
    // Estado
    unidades,
    cargando,
    error,

    // Métodos
    obtenerUnidades,
    obtenerUnidadPorId,
    buscarUnidadesPorTermino,
    documentosVigentes,
  }
}
