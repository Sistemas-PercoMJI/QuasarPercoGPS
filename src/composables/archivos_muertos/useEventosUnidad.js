// src/composables/useEventosUnidad.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { useGeocoding } from '../useGeocoding' //  Importar geocoding

export function useEventosUnidad() {
  const loading = ref(false)
  const error = ref(null)

  //  Inicializar geocoding
  const { obtenerDireccion } = useGeocoding()

  // ========================================
  // FUNCIÓN ORIGINAL - Sin cambios
  // ========================================
  /**
   * Obtiene los eventos de una unidad específica desde /Eventos
   * @param {string} unidadId - ID de la unidad
   * @param {number} limite - Número máximo de eventos (por defecto 50)
   * @returns {Array} - Lista de eventos
   */
  const obtenerEventosUnidad = async (unidadId, limite = 50) => {
    loading.value = true
    error.value = null

    try {
      const eventosRef = collection(db, 'Eventos')
      const q = query(
        eventosRef,
        where('unidad_id', '==', unidadId),
        orderBy('timestamp', 'desc'),
        limit(limite),
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
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

      return eventos
    } catch (err) {
      console.error(' Error obteniendo eventos:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // ========================================
  //  NUEVA FUNCIÓN - Para eventos diarios con GEOCODING
  // ========================================
  /**
   * Obtiene eventos diarios de /Unidades/{id}/RutaDiaria/{fecha}/EventoDiario
   * @param {string} unidadId - ID de la unidad
   * @param {number} limiteCantidad - Cantidad máxima de eventos (default: 50)
   * @returns {Array} - Lista de eventos formateados
   */
  const obtenerEventosDiarios = async (unidadId, limiteCantidad = 50) => {
    loading.value = true
    error.value = null

    try {
      // Fecha de hoy en formato YYYY-MM-DD
      const hoy = new Date()
      const fechaStr = hoy.toISOString().split('T')[0]

      // Ruta: /Unidades/{idUnidad}/RutaDiaria/{fecha}/EventoDiario
      const eventosRef = collection(
        db,
        'Unidades',
        String(unidadId),
        'RutaDiaria',
        fechaStr,
        'EventoDiario',
      )

      const q = query(eventosRef, orderBy('Timestamp', 'desc'), limit(limiteCantidad))

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return []
      }

      //  Mapear y hacer geocoding en paralelo
      const eventosPromesas = snapshot.docs.map(async (doc) => {
        const data = doc.data()

        // Determinar color e icono según TipoEvento
        let color = 'cyan'
        let icono = 'info'

        if (data.TipoEvento === 'Entrada') {
          color = 'green'
          icono = 'login'
        } else if (data.TipoEvento === 'Salida') {
          color = 'red'
          icono = 'logout'
        }

        // Formatear timestamp
        const timestamp = data.Timestamp?.toDate()
        const fechaTexto = formatearTiempoRelativo(timestamp)

        // Coordenadas
        const lat = data.Coordenadas?.lat || 0
        const lng = data.Coordenadas?.lng || 0

        //  GEOCODING: Obtener dirección si no existe o está en formato de coordenadas
        let direccion = data.Direccion || ''

        // Si la dirección parece ser coordenadas (contiene números decimales largos)
        const esFormatoCoordenadas = /^\d+\.\d{6,}/.test(direccion)

        if (!direccion || esFormatoCoordenadas) {
          try {
            direccion = await obtenerDireccion({ lat, lng })
          } catch (err) {
            console.warn(' Error en geocoding, usando coordenadas:', err)
            direccion = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          }
        }

        // Generar URL de mapa estático
        const mapaUrl = generarMapaEstatico(lat, lng, color)

        return {
          id: doc.id,
          titulo: data.NombreEvento || 'Evento sin nombre',
          descripcion: `${data.TipoEvento} en ${data.GeozonaNombre || 'ubicación'}`,
          ubicacion: direccion, //  Dirección geocodificada
          coordenadas: { lat, lng },
          fechaTexto,
          conductorNombre: data.conductorNombre || 'Conductor', // también este está hardcodeado
          color,
          icono,
          mapaUrl,
          accion: data.TipoEvento, // Para filtrar
          geozonaNombre: data.GeozonaNombre,
          tipoUbicacion: data.tipoUbicacion,
          ignicion: data.Ignicion ?? false,
          velocidad: data.Velocidad || 0,
          kilometraje: data.Kilometraje || null,
          _raw: data,
        }
      })

      // Esperar a que todos los eventos se procesen (incluyendo geocoding)
      const eventos = await Promise.all(eventosPromesas)

      return eventos
    } catch (err) {
      console.error(' Error obteniendo eventos diarios:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // ========================================
  // FUNCIONES AUXILIARES - Sin cambios
  // ========================================

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

  // ========================================
  //  FUNCIONES AUXILIARES NUEVAS
  // ========================================

  const generarMapaEstatico = (lat, lng, color) => {
    const accessToken =
      'pk.eyJ1IjoiY29uY2F6ZWQiLCJhIjoiY200MnE0cnNkMGduNzJrczhtZzh4c2JiNSJ9.3x7HwvZNxr4Tsr6KGLCWeg'

    const pinColor = color === 'green' ? '4CAF50' : color === 'red' ? 'F44336' : '00BCD4'

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${lng},${lat})/${lng},${lat},15,0/350x150@2x?access_token=${accessToken}`
  }

  /**
   * Formatea timestamp a texto relativo ("Justo ahora", "Hace 5 min")
   */
  const formatearTiempoRelativo = (fecha) => {
    if (!fecha) return 'Desconocido'

    const ahora = new Date()
    const diffMs = ahora - fecha
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Justo ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`

    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return {
    loading,
    error,
    obtenerEventosUnidad, //  Original
    obtenerEventosDiarios, //  Nueva con geocoding
    filtrarEventosPorTipo, //  Original
  }
}
