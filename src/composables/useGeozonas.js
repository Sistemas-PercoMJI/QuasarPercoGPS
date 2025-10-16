// src/composables/useGeozonas.js
import { ref } from 'vue'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useGeozonas(userId) {
  const geozonas = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ✅ MODIFICAR ESTA FUNCIÓN
  const obtenerGeozonas = async () => {
    loading.value = true
    error.value = null

    try {
      const q = query(
        collection(db, 'Usuarios', userId, 'Geozonas'),
        orderBy('fechaCreacion', 'desc'),
      )

      const querySnapshot = await getDocs(q)
      const geozonasData = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()

        // ✅ CORRECCIÓN: Hacer el spread PRIMERO, luego sobrescribir
        const geozona = {
          ...data, // ← Primero todas las propiedades de Firebase
          id: doc.id, // ← Agregar el ID
          tipoGeozona: data.tipo, // ← Preservar el tipo original (circular/poligono)
          tipo: 'geozona', // ← Sobrescribir con el tipo correcto para filtros
        }

        console.log('📦 Geozona transformada:', geozona)
        geozonasData.push(geozona)
      })

      geozonas.value = geozonasData
      console.log('✅ Geozonas transformadas:', geozonasData)
      return geozonasData
    } catch (err) {
      console.error('Error al obtener geozonas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ TAMBIÉN MODIFICAR crearGeozona para que guarde correctamente
  const crearGeozona = async (geozonaData) => {
    loading.value = true
    error.value = null

    try {
      const dataConUsuario = {
        ...geozonaData,
        fechaCreacion: new Date(),
      }

      const docRef = await addDoc(collection(db, 'Usuarios', userId, 'Geozonas'), dataConUsuario)

      // ✅ CORRECCIÓN: Estructura correcta al agregar localmente
      const nuevaGeozona = {
        ...dataConUsuario, // ← Primero el spread
        id: docRef.id, // ← Agregar ID
        tipoGeozona: dataConUsuario.tipo, // ← Preservar tipo original
        tipo: 'geozona', // ← Sobrescribir con el tipo correcto
      }

      geozonas.value.unshift(nuevaGeozona)
      console.log('✅ Nueva geozona agregada localmente:', nuevaGeozona)

      return docRef.id
    } catch (err) {
      console.error('Error al crear geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const actualizarGeozona = async (id, geozonaData) => {
    loading.value = true
    error.value = null

    try {
      const geozonaRef = doc(db, 'Usuarios', userId, 'Geozonas', id)
      await updateDoc(geozonaRef, geozonaData)

      // Actualizar la geozona en el array local
      const index = geozonas.value.findIndex((g) => g.id === id)
      if (index !== -1) {
        geozonas.value[index] = {
          ...geozonas.value[index],
          ...geozonaData,
          tipo: 'geozona', // ✅ NUEVO: Mantener el tipo
          tipoGeozona: geozonaData.tipo || geozonas.value[index].tipoGeozona, // ✅ NUEVO
        }
      }

      return true
    } catch (err) {
      console.error('Error al actualizar geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const eliminarGeozona = async (id) => {
    loading.value = true
    error.value = null

    try {
      await deleteDoc(doc(db, 'Usuarios', userId, 'Geozonas', id))

      geozonas.value = geozonas.value.filter((g) => g.id !== id)

      return true
    } catch (err) {
      console.error('Error al eliminar geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    geozonas,
    loading,
    error,
    obtenerGeozonas,
    crearGeozona,
    actualizarGeozona,
    eliminarGeozona,
  }
}
