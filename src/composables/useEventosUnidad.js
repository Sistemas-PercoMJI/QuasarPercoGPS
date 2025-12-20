// src/composables/useEventosUnidad.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'

export function useEventosUnidad() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Obtiene los eventos de una unidad específica
   * @param {string} unidadId - ID de la unidad
   * @param {number} limite - Número máximo de eventos (por defecto 50)
   * @returns {Array} - Lista de eventos
   */
  const obtenerEventosUnidad = async (unidadId, limite = 50) => {
    loading.value = true
    error.value = null

    try {
      console.log(`📊 Obteniendo eventos para unidad: ${unidadId}`)

      const eventosRef = collection(db, 'Eventos')
      const q = query(
        eventosRef,
        where('unidad_id', '==', unidadId),
        orderBy('timestamp', 'desc'),
        limit(limite),
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        console.log('⚠️ No hay eventos para esta unidad')
        return []
      }

      const eventos = snapshot.docs.map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,
          tipo: data.tipo || 'desconocido',
          titulo: generarTituloEvento(data),
          descripcion: generarDescripcionEvento(data),
          fecha: data.timestamp?.toDate?.() || new Date(data.timestamp),
          fechaTexto: formatearFecha(data.timestamp?.toDate?.() || new Date(data.timestamp)),
          ubicacion: data.ubicacion_nombre || 'Ubicación desconocida',
          coordenadas: data.coordenadas || null,
          icono: getIconoEvento(data.tipo, data.accion),
          color: getColorEvento(data.tipo, data.accion),
          unidadNombre: data.unidad_nombre || 'N/A',
          conductorNombre: data.conductor_nombre || 'N/A',
          accion: data.accion || 'N/A',
          tipoUbicacion: data.tipo_ubicacion || 'POI',
          _raw: data,
        }
      })

      console.log(`✅ ${eventos.length} eventos encontrados`)
      return eventos
    } catch (err) {
      console.error('❌ Error obteniendo eventos:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Filtra eventos por tipo
   */
  const filtrarEventosPorTipo = (eventos, filtro) => {
    if (filtro === 'todos' || filtro === 'Todo') {
      return eventos
    }

    const tiposMap = {
      alertas: ['salida_geozona', 'exceso_velocidad', 'parada_no_autorizada'],
      info: ['entrada_geozona', 'llegada_poi'],
      eventos: ['entrada_geozona', 'salida_geozona'],
    }

    const tiposFiltro = tiposMap[filtro.toLowerCase()] || []

    if (tiposFiltro.length === 0) {
      return eventos
    }

    return eventos.filter((evento) => tiposFiltro.includes(evento.tipo))
  }

  /**
   * Genera título del evento
   */
  const generarTituloEvento = (data) => {
    const accion = data.accion || ''
    const tipoUbicacion = data.tipo_ubicacion || 'ubicación'
    const nombreUbicacion = data.ubicacion_nombre || 'Zona'

    if (accion.includes('ENTRADA') || accion.includes('entró')) {
      return `${nombreUbicacion} ENTRADA`
    } else if (accion.includes('SALIDA') || accion.includes('salió')) {
      return `${nombreUbicacion} SALIDA`
    } else if (data.tipo === 'exceso_velocidad') {
      return 'Exceso de velocidad'
    } else if (data.tipo === 'parada_no_autorizada') {
      return 'Parada no autorizada'
    }

    return `${tipoUbicacion}: ${nombreUbicacion}`
  }

  /**
   * Genera descripción del evento
   */
  const generarDescripcionEvento = (data) => {
    const conductor = data.conductor_nombre || 'Conductor desconocido'
    const unidad = data.unidad_nombre || 'Unidad desconocida'
    const accion = data.accion || ''

    if (accion.includes('ENTRADA') || accion.includes('entró')) {
      const ubicacion = data.ubicacion_nombre || 'zona'
      return `${conductor} entró a ${data.tipo_ubicacion || 'ubicación'}: ${ubicacion}`
    } else if (accion.includes('SALIDA') || accion.includes('salió')) {
      const ubicacion = data.ubicacion_nombre || 'zona'
      return `${conductor} salió de ${data.tipo_ubicacion || 'ubicación'}: ${ubicacion}`
    }

    return `${conductor} - ${unidad}`
  }

  /**
   * Obtiene el icono según el tipo y acción
   */
  const getIconoEvento = (tipo, accion) => {
    if (accion?.includes('ENTRADA') || accion?.includes('entró')) {
      return 'login'
    } else if (accion?.includes('SALIDA') || accion?.includes('salió')) {
      return 'logout'
    }

    const iconos = {
      entrada_geozona: 'login',
      salida_geozona: 'logout',
      exceso_velocidad: 'speed',
      parada_no_autorizada: 'warning',
      llegada_poi: 'place',
    }

    return iconos[tipo] || 'notifications'
  }

  /**
   * Obtiene el color según el tipo y acción
   */
  const getColorEvento = (tipo, accion) => {
    if (accion?.includes('ENTRADA') || accion?.includes('entró')) {
      return 'green'
    } else if (accion?.includes('SALIDA') || accion?.includes('salió')) {
      return 'red'
    }

    const colores = {
      entrada_geozona: 'green',
      salida_geozona: 'red',
      exceso_velocidad: 'orange',
      parada_no_autorizada: 'orange',
      llegada_poi: 'blue',
    }

    return colores[tipo] || 'cyan'
  }

  /**
   * Formatea la fecha del evento
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha desconocida'

    const ahora = new Date()
    const diff = ahora - fecha
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(minutos / 60)
    const dias = Math.floor(horas / 24)

    if (minutos < 1) {
      return 'Justo ahora'
    } else if (minutos < 60) {
      return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`
    } else if (horas < 24) {
      return `Hace ${horas} hora${horas > 1 ? 's' : ''}`
    } else if (dias < 7) {
      return `Hace ${dias} día${dias > 1 ? 's' : ''}`
    } else {
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  return {
    loading,
    error,
    obtenerEventosUnidad,
    filtrarEventosPorTipo,
  }
}
