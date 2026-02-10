// src/composables/useGruposGeozonas.js
import { ref } from 'vue'
import { collection, addDoc, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useGruposGeozonas(userId) {
  const grupos = ref([])

  const obtenerGrupos = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'Usuarios', userId, 'GruposGeozonas'))

      grupos.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      return grupos.value
    } catch (error) {
      console.error('Error obteniendo grupos:', error)
      throw error
    }
  }

  const crearGrupo = async (nombre, color) => {
    try {
      const docRef = await addDoc(collection(db, 'Usuarios', userId, 'GruposGeozonas'), {
        nombre,
        color,
        fechaCreacion: new Date(),
      })

      const nuevoGrupo = {
        id: docRef.id,
        nombre,
        color,
      }

      grupos.value.push(nuevoGrupo)
      return nuevoGrupo
    } catch (error) {
      console.error('Error creando grupo:', error)
      throw error
    }
  }

  const eliminarGrupo = async (grupoId) => {
    try {
      const batch = writeBatch(db)

      // Cambiar todas las ubicaciones de este grupo a "sin grupo"
      const [pois, geozonas] = await Promise.all([
        getDocs(collection(db, 'Usuarios', userId, 'POIs')),
        getDocs(collection(db, 'Usuarios', userId, 'Geozonas')),
      ])

      pois.forEach((poiDoc) => {
        if (poiDoc.data().grupoId === grupoId) {
          batch.update(poiDoc.ref, { grupoId: null })
        }
      })

      geozonas.forEach((geozonaDoc) => {
        if (geozonaDoc.data().grupoId === grupoId) {
          batch.update(geozonaDoc.ref, { grupoId: null })
        }
      })

      // Eliminar el grupo
      batch.delete(doc(db, 'Usuarios', userId, 'GruposGeozonas', grupoId))

      await batch.commit()

      grupos.value = grupos.value.filter((g) => g.id !== grupoId)

      return true
    } catch (error) {
      console.error('Error eliminando grupo:', error)
      throw error
    }
  }

  return {
    grupos,
    obtenerGrupos,
    crearGrupo,
    eliminarGrupo,
  }
}
