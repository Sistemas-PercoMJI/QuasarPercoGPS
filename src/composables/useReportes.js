// composables/useReportes.js
import { ref } from 'vue'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'
import {
  formatearEventoParaReporte,
  formatearGeozonaParaReporte,
  formatearGrupoConductoresParaReporte,
  formatearPOIParaReporte,
} from 'src/config/configReportes'

export function useReportes() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Obtiene eventos de un usuario en un rango de fechas
   * ACTUALIZADO para usar campos REALES de Firebase
   * @param {string} userId - ID del usuario
   * @param {Date} fechaInicio - Fecha de inicio
   * @param {Date} fechaFin - Fecha de fin
   * @param {Array<string>} nombresEventos - Nombres de eventos a filtrar (opcional)
   * @returns {Promise<Array>} - Array de eventos formateados
   */

  const obtenerUnidades = async () => {
    loading.value = true
    error.value = null

    try {
      const unidadesRef = collection(db, 'Unidades')
      const snapshot = await getDocs(unidadesRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener unidades:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  const obtenerConductores = async () => {
    loading.value = true
    error.value = null

    try {
      const conductoresRef = collection(db, 'Conductores')
      const snapshot = await getDocs(conductoresRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener conductores:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  const obtenerEventos = async (userId, fechaInicio, fechaFin, nombresEventos = []) => {
    loading.value = true
    error.value = null

    try {
      const eventosRef = collection(db, 'Usuarios', userId, 'Eventos')

      // Construir la consulta base usando createdAt (campo real)
      let q = query(
        eventosRef,
        where('createdAt', '>=', Timestamp.fromDate(fechaInicio)),
        where('createdAt', '<=', Timestamp.fromDate(fechaFin)),
        orderBy('createdAt', 'desc'),
      )

      const snapshot = await getDocs(q)
      let eventos = snapshot.docs.map((doc) => {
        const data = doc.data()
        return formatearEventoParaReporte({
          id: doc.id,
          ...data,
        })
      })

      // Filtrar por nombres de eventos si se especifican
      if (nombresEventos.length > 0) {
        eventos = eventos.filter((evento) => nombresEventos.includes(evento.nombre))
      }

      return eventos
    } catch (err) {
      console.error('Error al obtener eventos:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene todas las geozonas de un usuario
   * ACTUALIZADO para usar campos REALES de Firebase
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de geozonas formateadas
   */
  const obtenerGeozonas = async (userId) => {
    loading.value = true
    error.value = null

    try {
      const geozonasRef = collection(db, 'Usuarios', userId, 'Geozonas')
      const snapshot = await getDocs(geozonasRef)

      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return formatearGeozonaParaReporte({
          id: doc.id,
          ...data,
        })
      })
    } catch (err) {
      console.error('Error al obtener geozonas:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene todos los POIs de un usuario
   * ACTUALIZADO para usar campos REALES de Firebase
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de POIs formateados
   */
  const obtenerPOIs = async (userId) => {
    loading.value = true
    error.value = null

    try {
      const poisRef = collection(db, 'Usuarios', userId, 'POIS')
      const snapshot = await getDocs(poisRef)

      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return formatearPOIParaReporte({
          id: doc.id,
          ...data,
        })
      })
    } catch (err) {
      console.error('Error al obtener POIs:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene todos los grupos de conductores de un usuario
   * ACTUALIZADO para usar campos REALES de Firebase
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de grupos de conductores formateados
   */
  const obtenerGruposConductores = async (userId) => {
    loading.value = true
    error.value = null

    try {
      const gruposRef = collection(db, 'Usuarios', userId, 'GruposConductores')
      const snapshot = await getDocs(gruposRef)

      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return formatearGrupoConductoresParaReporte({
          id: doc.id,
          ...data,
        })
      })
    } catch (err) {
      console.error('Error al obtener grupos de conductores:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene conductores de un grupo específico
   * ACTUALIZADO para usar ConductoresIds (campo real)
   * @param {string} userId - ID del usuario
   * @param {string} grupoId - ID del grupo de conductores
   * @returns {Promise<Array>} - Array de IDs de conductores del grupo
   */
  const obtenerConductoresDelGrupo = async (userId, grupoId) => {
    try {
      const gruposRef = collection(db, 'Usuarios', userId, 'GruposConductores')
      const snapshot = await getDocs(gruposRef)

      const grupo = snapshot.docs.find((doc) => doc.id === grupoId)

      if (grupo) {
        const grupoData = grupo.data()
        // Retornar ConductoresIds que es el campo real
        return grupoData.ConductoresIds || []
      }

      return []
    } catch (err) {
      console.error('Error al obtener conductores del grupo:', err)
      return []
    }
  }

  /**
   * Agrupa eventos por criterio
   * NOTA: Actualmente los eventos no tienen campo de vehículo/conductor
   * Esta función está preparada para cuando implementes trackers GPS
   * @param {Array} eventos - Array de eventos
   * @param {string} criterio - Criterio de agrupación
   * @returns {Object} - Objeto con eventos agrupados
   */
  const agruparEventos = (eventos, criterio) => {
    const agrupados = {}

    eventos.forEach((evento) => {
      let clave = ''

      switch (criterio) {
        case 'Objetos':
          // Por ahora agrupar por nombre de evento hasta que tengas trackers
          clave = evento.vehiculo || evento.objeto || evento.nombre || 'Sin asignar'
          break
        case 'Conductores':
          clave = evento.conductor || 'Sin asignar'
          break
        case 'Geozonas':
          // Buscar geozona en las condiciones
          clave = obtenerGeozonaDeCondiciones(evento) || 'Sin geozona'
          break
        case 'Grupos':
          clave = evento.grupo || 'Sin grupo'
          break
        case 'Eventos':
          clave = evento.nombre || 'Sin nombre'
          break
        default:
          clave = 'Sin clasificar'
      }

      if (!agrupados[clave]) {
        agrupados[clave] = []
      }

      agrupados[clave].push(evento)
    })

    return agrupados
  }

  /**
   * Helper para obtener geozona de las condiciones del evento
   * @param {Object} evento - Evento
   * @returns {string|null} - Nombre de geozona o null
   */
  const obtenerGeozonaDeCondiciones = (evento) => {
    if (!evento.condiciones || evento.condiciones.length === 0) {
      return null
    }

    // Buscar condición que tenga ubicacionId
    const condicionConUbicacion = evento.condiciones.find((c) => c.ubicacionId)

    if (condicionConUbicacion) {
      return condicionConUbicacion.ubicacionId
    }

    return null
  }

  /**
   * Calcula estadísticas de eventos
   * @param {Array} eventos - Array de eventos
   * @returns {Object} - Objeto con estadísticas
   */
  const calcularEstadisticas = (eventos) => {
    const stats = {
      total: eventos.length,
      porNombre: {},
      porFecha: {},
      activos: 0,
      inactivos: 0,
      conCondicionTiempo: 0,
    }

    eventos.forEach((evento) => {
      // Contar por nombre
      const nombre = evento.nombre || 'Sin nombre'
      stats.porNombre[nombre] = (stats.porNombre[nombre] || 0) + 1

      // Contar por fecha
      if (evento.fecha) {
        const fecha = new Date(evento.fecha).toLocaleDateString('es-MX')
        stats.porFecha[fecha] = (stats.porFecha[fecha] || 0) + 1
      }

      // Contar activos/inactivos
      if (evento.activo) {
        stats.activos++
      } else {
        stats.inactivos++
      }

      // Contar con condición de tiempo
      if (evento.condicionTiempo) {
        stats.conCondicionTiempo++
      }
    })

    return stats
  }

  /**
   * Filtra eventos por elementos seleccionados
   * @param {Array} eventos - Array de eventos
   * @param {Array} elementosSeleccionados - Elementos a filtrar
   * @param {string} tipoFiltro - Tipo de filtro (Objetos, Conductores, etc.)
   * @returns {Array} - Eventos filtrados
   */
  const filtrarEventosPorElementos = (eventos, elementosSeleccionados, tipoFiltro) => {
    if (elementosSeleccionados.length === 0) {
      return eventos
    }

    return eventos.filter((evento) => {
      let valorEvento = ''

      switch (tipoFiltro) {
        case 'Objetos':
          valorEvento = evento.vehiculo || evento.objeto || evento.nombre || ''
          break
        case 'Conductores':
          valorEvento = evento.conductor || ''
          break
        case 'Geozonas':
          valorEvento = obtenerGeozonaDeCondiciones(evento) || ''
          break
        case 'Grupos':
          valorEvento = evento.grupo || ''
          break
        case 'Eventos':
          valorEvento = evento.nombre || ''
          break
      }

      return elementosSeleccionados.includes(valorEvento)
    })
  }

  /**
   * Obtiene tipos de eventos únicos desde Firebase
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de nombres únicos de eventos
   */
  const obtenerTiposEventosUnicos = async (userId) => {
    try {
      const eventosRef = collection(db, 'Usuarios', userId, 'Eventos')
      const snapshot = await getDocs(eventosRef)

      const nombresUnicos = new Set()

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.nombre) {
          nombresUnicos.add(data.nombre)
        }
      })

      return Array.from(nombresUnicos)
    } catch (err) {
      console.error('Error al obtener tipos de eventos:', err)
      return []
    }
  }

  return {
    loading,
    error,
    obtenerEventos,
    obtenerGeozonas,
    obtenerPOIs,
    obtenerGruposConductores,
    obtenerConductoresDelGrupo,
    obtenerTiposEventosUnicos,
    agruparEventos,
    calcularEstadisticas,
    filtrarEventosPorElementos,
    obtenerUnidades,
    obtenerConductores,
  }
}
