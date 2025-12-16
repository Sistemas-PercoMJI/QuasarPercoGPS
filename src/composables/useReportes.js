// composables/useReportes.js - ACTUALIZADO
import { ref } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'
import { useReportesEventos } from './useReportesEventos'
import { useReportesTrayectos } from './useReportesTrayectos'
import { useReportesHoras } from './useReportesHoras'

/**
 * ============================================
 * COMPOSABLE PRINCIPAL DE REPORTES
 * ============================================
 * Orquesta los 3 tipos de informes
 */
export function useReportes() {
  const loading = ref(false)
  const error = ref(null)

  // Composables especializados
  const reportesEventos = useReportesEventos()
  const reportesTrayectos = useReportesTrayectos()
  const reportesHoras = useReportesHoras()

  /**
   * ============================================
   * OBTENER DATOS SEGÚN TIPO DE INFORME
   * ============================================
   */

  /**
   * Función principal que obtiene datos según el tipo de informe
   * @param {string} tipoInforme - 'eventos', 'trayectos', 'horas_trabajo'
   * @param {Object} configuracion - Configuración del reporte
   * @returns {Promise<Array>} - Datos del informe
   */
  const obtenerDatosInforme = async (tipoInforme, configuracion) => {
    loading.value = true
    error.value = null

    try {
      // Obtener IDs de unidades según el filtro
      const unidadesIds = await obtenerUnidadesSegunFiltro(configuracion)

      let datos = []

      switch (tipoInforme) {
        case 'eventos':
          datos = await reportesEventos.obtenerEventosReales(
            unidadesIds,
            configuracion.fechaInicio,
            configuracion.fechaFin,
            configuracion.eventosNombres || [],
          )
          break

        case 'trayectos':
          datos = await reportesTrayectos.obtenerTrayectos(
            unidadesIds,
            configuracion.fechaInicio,
            configuracion.fechaFin,
          )
          // Enriquecer con datos de unidades
          datos = await reportesTrayectos.enriquecerConDatosUnidades(datos)
          break

        case 'horas_trabajo':
          datos = await reportesHoras.calcularHorasTrabajo(
            unidadesIds,
            configuracion.fechaInicio,
            configuracion.fechaFin,
            {
              diasLaborables: configuracion.diasLaborables,
              horarioInicio: configuracion.horarioInicio,
              horarioFin: configuracion.horarioFin,
            },
          )
          break

        default:
          throw new Error(`Tipo de informe no válido: ${tipoInforme}`)
      }

      return datos
    } catch (err) {
      console.error('❌ Error al obtener datos:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene los IDs de unidades según el tipo de filtro
   * @param {Object} configuracion - { reportarPor, elementosSeleccionados }
   * @returns {Promise<Array<string>>} - IDs de unidades
   */
  const obtenerUnidadesSegunFiltro = async (configuracion) => {
    const { reportarPor, elementosSeleccionados } = configuracion

    switch (reportarPor) {
      case 'Objetos':
        // Los elementos seleccionados son directamente los IDs de unidades
        return elementosSeleccionados

      case 'Conductores':
        // Obtener unidades asignadas a los conductores seleccionados
        return await obtenerUnidadesPorConductores(elementosSeleccionados)

      case 'Grupos':
        // Obtener conductores del grupo y luego sus unidades
        return await obtenerUnidadesPorGrupos(elementosSeleccionados)

      case 'Geozonas':
        // Para geozonas, necesitamos todas las unidades y filtrar después
        return await obtenerTodasLasUnidades()

      default:
        return await obtenerTodasLasUnidades()
    }
  }

  /**
   * ============================================
   * FUNCIONES AUXILIARES DE OBTENCIÓN DE DATOS
   * ============================================
   */

  /**
   * Obtiene todas las unidades de la base de datos
   * @returns {Promise<Array>} - Array de unidades
   */
  const obtenerUnidades = async () => {
    try {
      const unidadesRef = collection(db, 'Unidades')
      const snapshot = await getDocs(unidadesRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener unidades:', err)
      throw err
    }
  }

  /**
   * Obtiene todos los IDs de unidades
   * @returns {Promise<Array<string>>} - Array de IDs
   */
  const obtenerTodasLasUnidades = async () => {
    const unidades = await obtenerUnidades()
    return unidades.map((u) => u.id)
  }

  /**
   * Obtiene todos los conductores
   * @returns {Promise<Array>} - Array de conductores
   */
  const obtenerConductores = async () => {
    try {
      const conductoresRef = collection(db, 'Conductores')
      const snapshot = await getDocs(conductoresRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener conductores:', err)
      throw err
    }
  }

  /**
   * Obtiene las unidades asignadas a un conjunto de conductores
   * @param {Array<string>} conductoresNombres - Nombres de conductores
   * @returns {Promise<Array<string>>} - IDs de unidades
   */
  const obtenerUnidadesPorConductores = async (conductoresNombres) => {
    const unidades = await obtenerUnidades()

    // Filtrar unidades que tienen asignado alguno de los conductores
    const unidadesFiltradas = unidades.filter((unidad) => {
      // Aquí asumimos que tienes un campo como "conductorAsignado" en Unidades
      // Ajusta según tu estructura real
      const conductorAsignado = unidad.ConductorAsignado || unidad.conductorNombre
      return conductoresNombres.includes(conductorAsignado)
    })

    return unidadesFiltradas.map((u) => u.id)
  }

  /**
   * Obtiene las unidades de conductores que pertenecen a grupos específicos
   * @param {Array<string>} gruposNombres - Nombres de grupos
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array<string>>} - IDs de unidades
   */
  const obtenerUnidadesPorGrupos = async (gruposNombres, userId) => {
    // Obtener los grupos de conductores del usuario
    const grupos = await obtenerGruposConductores(userId)

    // Filtrar grupos seleccionados
    const gruposFiltrados = grupos.filter((g) => gruposNombres.includes(g.nombre))

    // Obtener todos los IDs de conductores de esos grupos
    const conductoresIds = new Set()
    gruposFiltrados.forEach((grupo) => {
      if (grupo.conductoresIds) {
        grupo.conductoresIds.forEach((id) => conductoresIds.add(id))
      }
    })

    // Obtener conductores completos
    const todosConductores = await obtenerConductores()
    const conductoresDelGrupo = todosConductores.filter((c) => conductoresIds.has(c.id))

    // Obtener unidades de esos conductores
    const nombresConductores = conductoresDelGrupo.map((c) => c.Nombre)
    return await obtenerUnidadesPorConductores(nombresConductores)
  }

  /**
   * Obtiene grupos de conductores de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de grupos
   */
  const obtenerGruposConductores = async (userId) => {
    try {
      const gruposRef = collection(db, 'Usuarios', userId, 'GruposConductores')
      const snapshot = await getDocs(gruposRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().Nombre,
        conductoresIds: doc.data().ConductoresIds || [],
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener grupos:', err)
      throw err
    }
  }

  /**
   * Obtiene geozonas de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de geozonas
   */
  const obtenerGeozonas = async (userId) => {
    try {
      const geozonasRef = collection(db, 'Usuarios', userId, 'Geozonas')
      const snapshot = await getDocs(geozonasRef)

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
        ...doc.data(),
      }))
    } catch (err) {
      console.error('Error al obtener geozonas:', err)
      throw err
    }
  }

  /**
   * ============================================
   * FUNCIONES DE AGRUPACIÓN Y FILTRADO
   * ============================================
   */

  /**
   * Agrupa datos según un criterio
   * @param {Array} datos - Array de datos
   * @param {string} criterio - 'Objetos', 'Conductores', 'Geozonas', etc.
   * @returns {Object} - Datos agrupados
   */
  const agruparDatos = (datos, criterio) => {
    const agrupados = {}

    datos.forEach((dato) => {
      let clave = ''

      switch (criterio) {
        case 'Objetos':
          clave = dato.unidadNombre || dato.idUnidad || 'Sin unidad'
          break
        case 'Conductores':
          clave = dato.conductorNombre || 'Sin conductor'
          break
        case 'Geozonas':
          clave = dato.geozonaNombre || 'Sin geozona'
          break
        case 'Eventos':
          clave = dato.eventoNombre || 'Sin nombre'
          break
        default:
          clave = 'Sin clasificar'
      }

      if (!agrupados[clave]) {
        agrupados[clave] = []
      }

      agrupados[clave].push(dato)
    })

    return agrupados
  }

  /**
   * Filtra datos por elementos seleccionados
   * @param {Array} datos - Array de datos
   * @param {Array} elementosSeleccionados - Elementos a filtrar
   * @param {string} tipoFiltro - Tipo de filtro
   * @returns {Array} - Datos filtrados
   */
  const filtrarDatosPorElementos = (datos, elementosSeleccionados, tipoFiltro) => {
    if (elementosSeleccionados.length === 0) {
      return datos
    }

    return datos.filter((dato) => {
      let valorDato = ''

      switch (tipoFiltro) {
        case 'Objetos':
          valorDato = dato.unidadNombre || dato.idUnidad || ''
          break
        case 'Conductores':
          valorDato = dato.conductorNombre || ''
          break
        case 'Geozonas':
          valorDato = dato.geozonaNombre || ''
          break
        case 'Eventos':
          valorDato = dato.eventoNombre || ''
          break
      }

      return elementosSeleccionados.includes(valorDato)
    })
  }

  /**
   * Calcula estadísticas generales
   * @param {Array} datos - Array de datos
   * @returns {Object} - Estadísticas
   */
  const calcularEstadisticas = (datos) => {
    return {
      total: datos.length,
      conductoresUnicos: new Set(datos.map((d) => d.conductorNombre)).size,
      unidadesUnicas: new Set(datos.map((d) => d.unidadNombre)).size,
      // Agregar más estadísticas según necesites
    }
  }

  // Exportar todo
  return {
    loading,
    error,
    // Función principal
    obtenerDatosInforme,
    // Obtención de catálogos
    obtenerUnidades,
    obtenerConductores,
    obtenerGruposConductores,
    obtenerGeozonas,
    // Utilidades
    agruparDatos,
    filtrarDatosPorElementos,
    calcularEstadisticas,
    // Re-exportar funciones específicas por si se necesitan
    ...reportesEventos,
    ...reportesTrayectos,
    ...reportesHoras,
  }
}
