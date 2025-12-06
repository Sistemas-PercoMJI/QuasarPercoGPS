// src/composables/useEventoDiario.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

export function useEventoDiario() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Genera un ID único para el evento
   */
  const generarIdEvento = () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `evento-${timestamp}-${random}`
  }

  /**
   * Registra un evento diario cuando se detecta
   */
  const registrarEventoDiario = async (unidadId, idRutaDiaria, eventoData) => {
    loading.value = true
    error.value = null

    try {
      const idEvento = generarIdEvento()

      // Referencia al documento del evento dentro de RutaDiaria
      const eventoRef = doc(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        idRutaDiaria,
        'EventoDiario',
        idEvento,
      )

      // Determinar el nombre según el tipo de ubicación
      let nombreUbicacion = ''
      if (eventoData.tipoUbicacion === 'POI') {
        nombreUbicacion = eventoData.PoiNombre || 'POI sin nombre'
      } else if (eventoData.tipoUbicacion === 'Geozona') {
        nombreUbicacion = eventoData.GeozonaNombre || 'Geozona sin nombre'
      }

      const nuevoEvento = {
        id: idEvento,
        IdRutaDiaria: idRutaDiaria,
        idUnidad: unidadId,
        IdEvento: eventoData.IdEvento || '',
        NombreEvento: eventoData.NombreEvento || 'Evento sin nombre',
        TipoEvento: eventoData.TipoEvento || 'Entrada', // 'Entrada' o 'Salida'
        Timestamp: serverTimestamp(),
        Coordenadas: {
          lat: eventoData.lat || 0,
          lng: eventoData.lng || 0,
        },
        Direccion: eventoData.Direccion || `${eventoData.lat}, ${eventoData.lng}`,
        // Agregar el campo condicional
        ...(eventoData.tipoUbicacion === 'POI'
          ? { PoiNombre: nombreUbicacion }
          : { GeozonaNombre: nombreUbicacion }),
        DuracionDentro: null, // Se actualiza cuando sale
        FinEvento: null, // Se actualiza cuando sale
        tipoUbicacion: eventoData.tipoUbicacion || 'POI',
        ubicacionId: eventoData.ubicacionId || '',
      }

      await setDoc(eventoRef, nuevoEvento)

      console.log(`✅ Evento diario registrado: ${idEvento} - ${nuevoEvento.NombreEvento}`)
      return { id: idEvento, ...nuevoEvento }
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al registrar evento diario:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Finaliza un evento (cuando sale de la ubicación)
   */
  const finalizarEventoDiario = async (unidadId, idRutaDiaria, idEvento, coordenadasSalida) => {
    loading.value = true
    error.value = null

    try {
      const eventoRef = doc(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        idRutaDiaria,
        'EventoDiario',
        idEvento,
      )

      const ahora = Timestamp.now()

      await updateDoc(eventoRef, {
        FinEvento: ahora,
        CoordenadasSalida: {
          lat: coordenadasSalida.lat || 0,
          lng: coordenadasSalida.lng || 0,
        },
      })

      console.log(`✅ Evento finalizado: ${idEvento}`)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al finalizar evento:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Actualiza la duración de un evento
   */
  const actualizarDuracionEvento = async (unidadId, idRutaDiaria, idEvento, duracionMinutos) => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 actualizarDuracionEvento llamado con:', {
        unidadId,
        idRutaDiaria,
        idEvento,
        duracionMinutos,
        tipo: typeof duracionMinutos,
      })
      const eventoRef = doc(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        idRutaDiaria,
        'EventoDiario',
        idEvento,
      )
      console.log('🔍 Path del documento:', eventoRef.path)

      await updateDoc(eventoRef, {
        DuracionDentro: duracionMinutos,
      })

      console.log(`✅ Duración actualizada para evento: ${idEvento} - ${duracionMinutos} min`)
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al actualizar duración:', err)
      console.error('❌ Detalles del error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene todos los eventos de una ruta diaria
   */
  const obtenerEventosDiarios = async (unidadId, idRutaDiaria) => {
    loading.value = true
    error.value = null

    try {
      const eventosRef = collection(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        idRutaDiaria,
        'EventoDiario',
      )

      const q = query(eventosRef, orderBy('Timestamp', 'desc'))
      const snapshot = await getDocs(q)

      const eventos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`✅ Eventos diarios cargados: ${eventos.length}`)
      return eventos
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener eventos diarios:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene eventos por tipo (Entrada/Salida)
   */
  const obtenerEventosPorTipo = async (unidadId, idRutaDiaria, tipoEvento) => {
    loading.value = true
    error.value = null

    try {
      const eventosRef = collection(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        idRutaDiaria,
        'EventoDiario',
      )

      const q = query(
        eventosRef,
        where('TipoEvento', '==', tipoEvento),
        orderBy('Timestamp', 'desc'),
      )

      const snapshot = await getDocs(q)

      const eventos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log(`✅ Eventos de tipo "${tipoEvento}" cargados: ${eventos.length}`)
      return eventos
    } catch (err) {
      error.value = err.message
      console.error('❌ Error al obtener eventos por tipo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    registrarEventoDiario,
    finalizarEventoDiario,
    actualizarDuracionEvento,
    obtenerEventosDiarios,
    obtenerEventosPorTipo,
    generarIdEvento,
  }
}
