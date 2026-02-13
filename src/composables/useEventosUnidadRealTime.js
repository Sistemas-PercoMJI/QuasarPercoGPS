// composables/useEventosUnidadRealTime.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore'

export function useEventosUnidadRealTime() {
  const eventosUnidad = ref([])
  const loadingEventos = ref(false)
  const errorEventos = ref(null)
  let unsubscribe = null

  const escucharEventosDia = async (unidadId, fecha = new Date()) => {
    if (unsubscribe) {
      console.log('🛑 Deteniendo listener anterior')
      unsubscribe()
      unsubscribe = null
    }

    if (!unidadId) {
      console.warn('⚠️ No se proporcionó unidadId')
      eventosUnidad.value = []
      return
    }

    loadingEventos.value = true
    errorEventos.value = null

    // 🔥 ASEGURARSE que la fecha esté en la zona horaria correcta
    const fechaLocal = new Date(fecha)
    fechaLocal.setHours(0, 0, 0, 0) // Reset a medianoche

    const fechaStr = fechaLocal.toISOString().split('T')[0]

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 INICIANDO LISTENER DE EVENTOS')
    console.log('   Unidad:', unidadId)
    console.log('   Fecha objeto:', fecha)
    console.log('   Fecha local:', fechaLocal)
    console.log('   Fecha string:', fechaStr)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const eventosRef = collection(
        db,
        'Unidades',
        String(unidadId),
        'RutaDiaria',
        fechaStr,
        'EventoDiario',
      )

      const q = query(eventosRef)

      // 🔍 DEBUG - usar 'q' en lugar de 'eventosRef'
      const testSnapshot = await getDocs(q)
      console.log(`🔍 TEST: ${testSnapshot.size} documentos encontrados en ${fechaStr}`)

      // 🔥 Si no hay docs, mostrar la ruta exacta
      if (testSnapshot.size === 0) {
        console.warn(
          '⚠️ RUTA COMPLETA:',
          `Unidades/${unidadId}/RutaDiaria/${fechaStr}/EventoDiario`,
        )
      }

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log(`✅ ${snapshot.size} eventos recibidos para ${fechaStr}`)

          if (snapshot.size === 0) {
            console.warn('⚠️ No hay eventos en snapshot para', fechaStr)
            eventosUnidad.value = []
            loadingEventos.value = false
            return
          }

          const eventosMap = new Map()

          snapshot.docs.forEach((doc) => {
            const data = doc.data()

            let horaExacta = ''
            if (data.Timestamp) {
              try {
                const fecha = data.Timestamp.toDate()
                horaExacta = fecha.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              } catch (error) {
                console.error('Error formateando hora:', error)
              }
            }

            if (!eventosMap.has(doc.id)) {
              eventosMap.set(doc.id, {
                id: doc.id,
                titulo: data.NombreEvento || data.GeozonaNombre || 'Evento',
                descripcion: data.TipoEvento || '',
                accion: data.TipoEvento || '',
                ubicacion: data.GeozonaNombre || 'Ubicación desconocida',
                ubicacionId: data.ubicacionId || data.IdEvento || null,
                tipoUbicacion: data.tipoUbicacion || 'Geozona',
                coordenadas: data.coordenadas || data.Coordenadas || null,
                conductorId: data.conductorId || null,
                conductorNombre: data.conductorNombre || 'Sin conductor',
                unidadId: data.idUnidad || unidadId,
                timestamp: data.Timestamp,
                fecha: fechaStr,
                hora: horaExacta,
                fechaTexto: formatearFechaHora(data.Timestamp),
                icono: obtenerIconoEvento(data),
                color: obtenerColorEvento(data),
                raw: data,
              })
            }
          })

          let eventosArray = Array.from(eventosMap.values())

          eventosArray.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0
            const fechaA = a.timestamp.toDate()
            const fechaB = b.timestamp.toDate()
            return fechaB - fechaA
          })

          eventosUnidad.value = eventosArray
          loadingEventos.value = false
          console.log('✅ Eventos únicos cargados:', eventosUnidad.value.length)
        },
        (error) => {
          console.error('❌ ERROR EN SNAPSHOT:', error)
          errorEventos.value = error.message
          eventosUnidad.value = []
          loadingEventos.value = false
        },
      )

      console.log('✅ Listener configurado para', fechaStr)
    } catch (error) {
      console.error('❌ ERROR:', error)
      errorEventos.value = error.message
      eventosUnidad.value = []
      loadingEventos.value = false
    }
  }

  const detenerEscucha = () => {
    if (unsubscribe) {
      console.log('🛑 Deteniendo listener')
      unsubscribe()
      unsubscribe = null
    }
    eventosUnidad.value = []
    loadingEventos.value = false
  }

  const formatearFechaHora = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida'
    try {
      const fecha = timestamp.toDate()
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch (error) {
      console.error('Error formateando fecha/hora:', error)
      return 'Fecha inválida'
    }
  }

  const obtenerIconoEvento = (data) => {
    const tipo = (data.TipoEvento || '').toLowerCase()
    if (tipo.includes('entrada') || tipo.includes('entró')) return 'login'
    if (tipo.includes('salida') || tipo.includes('salió')) return 'logout'
    return 'place'
  }

  const obtenerColorEvento = (data) => {
    const tipo = (data.TipoEvento || '').toLowerCase()
    if (tipo.includes('entrada') || tipo.includes('entró')) return 'green'
    if (tipo.includes('salida') || tipo.includes('salió')) return 'orange'
    return 'blue'
  }

  return {
    eventosUnidad,
    loadingEventos,
    errorEventos,
    escucharEventosDia,
    detenerEscucha,
  }
}
