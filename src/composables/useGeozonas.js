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

// ⚡ CONSTANTES PARA MAPBOX
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

// ⚡ FUNCIÓN AUXILIAR: Obtener dirección de Mapbox
const obtenerDireccionPunto = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&language=es&limit=1&access_token=${MAPBOX_TOKEN}`,
    )
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const address = data.features[0]
      const placeName = address.place_name || ''
      const parts = placeName.split(',')

      if (parts.length > 0) {
        const streetPart = parts[0].trim()
        const streetOnly = streetPart.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '')
        return streetOnly || 'Calle desconocida'
      }
    }

    return 'Dirección no disponible'
  } catch (error) {
    console.error('❌ Error obteniendo dirección:', error)
    return 'Error al obtener dirección'
  }
}

// ⚡ FUNCIÓN: Agregar direcciones a los puntos
const agregarDireccionesAPuntos = async (puntos) => {
  if (!puntos || puntos.length === 0) {
    return []
  }

  const puntosConDireccion = await Promise.all(
    puntos.map(async (punto) => {
      // Si ya tiene dirección, no hacer nada
      if (punto.direccion) {
        return punto
      }

      // Si no tiene, obtenerla de Mapbox

      const direccion = await obtenerDireccionPunto(punto.lat, punto.lng)

      return {
        ...punto,
        direccion,
      }
    }),
  )

  return puntosConDireccion
}

export function useGeozonas(userId) {
  const geozonas = ref([])
  const loading = ref(false)
  const error = ref(null)

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

        const geozona = {
          ...data,
          id: doc.id,
          tipoGeozona: data.tipo,
          tipo: 'geozona',
        }

        geozonasData.push(geozona)
      })

      geozonas.value = geozonasData

      return geozonasData
    } catch (err) {
      console.error('Error al obtener geozonas:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ MODIFICADA: crearGeozona ahora agrega direcciones automáticamente
  const crearGeozona = async (geozonaData) => {
    loading.value = true
    error.value = null

    try {
      // ⚡ AGREGAR DIRECCIONES A LOS PUNTOS ANTES DE GUARDAR
      if (geozonaData.tipo === 'poligono' && geozonaData.puntos && geozonaData.puntos.length > 0) {
        geozonaData.puntos = await agregarDireccionesAPuntos(geozonaData.puntos)
      }

      const dataConUsuario = {
        ...geozonaData,
        color: geozonaData.color || '#4ECDC4',
        fechaCreacion: new Date(),
      }

      const docRef = await addDoc(collection(db, 'Usuarios', userId, 'Geozonas'), dataConUsuario)

      const nuevaGeozona = {
        ...dataConUsuario,
        id: docRef.id,
        tipoGeozona: dataConUsuario.tipo,
        tipo: 'geozona',
      }

      geozonas.value.unshift(nuevaGeozona)

      return docRef.id
    } catch (err) {
      console.error('Error al crear geozona:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ MODIFICADA: actualizarGeozona también agrega direcciones si faltan
  const actualizarGeozona = async (id, geozonaData) => {
    loading.value = true
    error.value = null

    try {
      // ⚡ AGREGAR DIRECCIONES A LOS PUNTOS SI FALTAN
      if (geozonaData.tipo === 'poligono' && geozonaData.puntos && geozonaData.puntos.length > 0) {
        geozonaData.puntos = await agregarDireccionesAPuntos(geozonaData.puntos)
      }

      const geozonaRef = doc(db, 'Usuarios', userId, 'Geozonas', id)
      await updateDoc(geozonaRef, geozonaData)

      // Actualizar la geozona en el array local
      const index = geozonas.value.findIndex((g) => g.id === id)
      if (index !== -1) {
        geozonas.value[index] = {
          ...geozonas.value[index],
          ...geozonaData,
          tipo: 'geozona',
          tipoGeozona: geozonaData.tipo || geozonas.value[index].tipoGeozona,
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

  // ⚡ NUEVA: Función para migrar geozonas existentes (ejecutar una sola vez)
  const migrarGeozonasExistentes = async () => {
    try {
      const geozonasRef = collection(db, 'Usuarios', userId, 'Geozonas')
      const snapshot = await getDocs(geozonasRef)

      let actualizadas = 0
      let sinCambios = 0

      for (const docSnap of snapshot.docs) {
        const geozona = docSnap.data()

        // Solo migrar geozonas poligonales
        if (geozona.tipo === 'poligono' && geozona.puntos && geozona.puntos.length > 0) {
          // Verificar si los puntos ya tienen direcciones
          const necesitaMigracion = geozona.puntos.some((p) => !p.direccion)

          if (necesitaMigracion) {
            const puntosConDireccion = await agregarDireccionesAPuntos(geozona.puntos)

            await updateDoc(docSnap.ref, {
              puntos: puntosConDireccion,
            })

            actualizadas++
          } else {
            sinCambios++
          }
        }
      }

      return { actualizadas, sinCambios }
    } catch (error) {
      console.error('❌ Error en migración:', error)
      throw error
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
    migrarGeozonasExistentes, // ⬅️ NUEVA FUNCIÓN
  }
}
