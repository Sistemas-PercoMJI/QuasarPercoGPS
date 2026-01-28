// composables/useEventosUnidadRealTime.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

export function useEventosUnidadRealTime() {
  const eventosUnidad = ref([])
  const loadingEventos = ref(false)
  const errorEventos = ref(null)
  let unsubscribe = null

  /**
   * Obtener eventos del día en tiempo real para una unidad
   * @param {string} unidadId - ID de la unidad
   * @param {Date} fecha - Fecha para buscar eventos (default: hoy)
   */
  const escucharEventosDia = (unidadId, fecha = new Date()) => {
    // Limpiar listener anterior si existe
    if (unsubscribe) {
      unsubscribe()
    }

    if (!unidadId) {
      console.warn('⚠️ No se proporcionó unidadId')
      eventosUnidad.value = []
      return
    }

    loadingEventos.value = true
    errorEventos.value = null

    try {
      // Formatear fecha como YYYY-MM-DD
      const fechaStr = fecha.toISOString().split('T')[0]

      console.log(`📡 Escuchando eventos para unidad ${unidadId} del día ${fechaStr}`)

      // Ruta: /Unidades/{unidadId}/RutaDiaria/{fechaStr}/EventoDiario
      const eventosRef = collection(
        db,
        'Unidades',
        unidadId,
        'RutaDiaria',
        fechaStr,
        'EventoDiario',
      )

      // Query ordenada por timestamp descendente (más reciente primero)
      const q = query(eventosRef, orderBy('timestamp', 'desc'))

      // Escuchar cambios en tiempo real
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log(`✅ ${snapshot.size} eventos recibidos en tiempo real`)

          eventosUnidad.value = snapshot.docs.map((doc) => {
            const data = doc.data()

            return {
              id: doc.id,

              // Información del evento
              titulo: data.eventoTitulo || data.titulo || 'Evento',
              descripcion: data.accion || data.descripcion || '',
              accion: data.accion || '',

              // Ubicación
              ubicacion: data.ubicacionNombre || data.ubicacion || 'Ubicación desconocida',
              ubicacionId: data.ubicacionId || null,
              tipoUbicacion: data.tipoUbicacion || data.tipo || '',

              // Coordenadas
              coordenadas: data.coordenadas || data.ubicacionCoords || null,

              // Conductor
              conductorId: data.conductorId || null,
              conductorNombre: data.conductorNombre || 'Sin conductor',

              // Timestamps
              timestamp: data.timestamp,
              fecha: data.fecha || fechaStr,
              hora: data.hora || '',
              fechaTexto: formatearFechaHora(data.timestamp),

              // Visuales
              icono: obtenerIconoEvento(data),
              color: obtenerColorEvento(data),

              // Datos raw por si se necesitan
              raw: data,
            }
          })

          loadingEventos.value = false
        },
        (error) => {
          console.error('❌ Error escuchando eventos:', error)
          errorEventos.value = error.message
          eventosUnidad.value = []
          loadingEventos.value = false
        },
      )
    } catch (error) {
      console.error('❌ Error configurando listener:', error)
      errorEventos.value = error.message
      eventosUnidad.value = []
      loadingEventos.value = false
    }
  }

  /**
   * Detener el listener de eventos
   */
  const detenerEscucha = () => {
    if (unsubscribe) {
      console.log('🛑 Deteniendo listener de eventos')
      unsubscribe()
      unsubscribe = null
    }
    eventosUnidad.value = []
  }

  /**
   * Formatear timestamp a texto legible
   */
  const formatearFechaHora = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida'

    try {
      const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)

      const opciones = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }

      return fecha.toLocaleDateString('es-MX', opciones)
    } catch (error) {
      console.warn('Error formateando fecha:', error)
      return 'Fecha inválida'
    }
  }

  /**
   * Obtener icono según el tipo de evento
   */
  const obtenerIconoEvento = (data) => {
    const accion = (data.accion || '').toLowerCase()
    const tipo = (data.tipoUbicacion || data.tipo || '').toLowerCase()

    // Entrada
    if (accion.includes('entrada') || accion.includes('entró')) {
      return 'login'
    }

    // Salida
    if (accion.includes('salida') || accion.includes('salió')) {
      return 'logout'
    }

    // Por tipo de ubicación
    if (tipo === 'poi' || tipo === 'punto') {
      return 'place'
    }

    if (tipo === 'geozona') {
      return 'map'
    }

    // Default
    return 'notification_important'
  }

  /**
   * Obtener color según el tipo de evento
   */
  const obtenerColorEvento = (data) => {
    const accion = (data.accion || '').toLowerCase()

    // Entrada = Verde
    if (accion.includes('entrada') || accion.includes('entró')) {
      return 'green'
    }

    // Salida = Naranja/Rojo
    if (accion.includes('salida') || accion.includes('salió')) {
      return 'orange'
    }

    // Default = Azul
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
