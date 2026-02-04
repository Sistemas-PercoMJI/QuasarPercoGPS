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

    const fechaStr = fecha.toISOString().split('T')[0]

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 INICIANDO LISTENER DE EVENTOS')
    console.log('   Unidad:', unidadId)
    console.log('   Fecha:', fechaStr)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const eventosRef = collection(
        db,
        'Unidades',
        String(unidadId), // 🔥 Convertir a string
        'RutaDiaria',
        fechaStr,
        'EventoDiario',
      )

      const q = query(eventosRef)

      console.log('✅ Query creada')

      // 🔍 DEBUG
      const testSnapshot = await getDocs(eventosRef)
      console.log(`🔍 TEST: ${testSnapshot.size} documentos encontrados`)

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log(`✅ ${snapshot.size} eventos recibidos`)

          if (snapshot.size === 0) {
            console.warn('⚠️ No hay eventos')
            eventosUnidad.value = []
            loadingEventos.value = false
            return
          }

          // 🔥 Usar Set para evitar duplicados por ID
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

            // 🔥 Solo agregar si no existe en el Map
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

          // Convertir Map a Array y ordenar
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

      console.log('✅ Listener configurado')
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
