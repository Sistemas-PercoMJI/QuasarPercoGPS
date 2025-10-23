// config/reportesConfig.js

/**
 * Configuración basada en la estructura REAL de Firebase
 *
 * Este archivo mapea los campos reales de Firestore con los campos
 * que necesita el sistema de reportes.
 */

/**
 * Estructura REAL de datos en Firestore
 * Basada en las colecciones actuales del proyecto
 */
export const estructuraFirestore = {
  // Colección principal: Usuarios/{userId}
  Usuarios: {
    // Subcolección: Eventos
    Eventos: {
      campos: {
        activacionAlerta: 'string', // Tipo de activación de alerta
        activo: 'boolean', // Si el evento está activo
        aplicacion: 'string', // Aplicación que generó el evento
        condicionTiempo: 'boolean', // Si tiene condición de tiempo
        condiciones: 'array', // Array de maps con condiciones
        // Estructura de condiciones[]:
        //   - activacion: string
        //   - tipo: string
        //   - ubicacionId: string
        createdAt: 'timestamp', // Fecha de creación
        descripcion: 'string', // Descripción del evento
        diasSemana: 'array', // Días de la semana que aplica
        horaFin: 'string', // Hora de finalización
        horaInicio: 'string', // Hora de inicio
        nombre: 'string', // Nombre del evento
        operadoresLogicos: 'array', // Operadores lógicos entre condiciones
        updatedAt: 'timestamp', // Última actualización
      },
      // Mapeo de campos reales a campos esperados por el sistema de reportes
      mapeoReportes: {
        fecha: 'createdAt', // Usar createdAt como fecha principal
        tipoEvento: 'nombre', // El nombre será el tipo de evento
        descripcion: 'descripcion', // Descripción directa
        activo: 'activo', // Estado del evento
      },
    },

    // Subcolección: Geozonas
    Geozonas: {
      campos: {
        direccion: 'string', // Dirección de la geozona
        fechaCreacion: 'timestamp', // Fecha de creación
        grupoId: 'string', // ID del grupo asociado
        nombre: 'string', // Nombre de la geozona
        notas: 'string', // Notas adicionales
        puntos: 'array', // Array de maps con números (coordenadas)
        tipo: 'string', // Tipo de geozona
      },
      // Mapeo para reportes
      mapeoReportes: {
        nombre: 'nombre',
        tipo: 'tipo',
        coordenadas: 'puntos', // Los puntos son las coordenadas
        direccion: 'direccion',
        notas: 'notas',
      },
    },

    // Subcolección: POIS (Points of Interest)
    POIS: {
      campos: {
        coordenadas: 'map', // Map con números (lat, lng)
        createdAt: 'timestamp', // Fecha de creación
        direccion: 'string', // Dirección del POI
        grupoId: 'string', // ID del grupo asociado
        nombre: 'string', // Nombre del POI
        notas: 'string', // Notas adicionales
        tipo: 'string', // Tipo de POI
        updatedAt: 'timestamp', // Última actualización
      },
      // Mapeo para reportes
      mapeoReportes: {
        nombre: 'nombre',
        tipo: 'tipo',
        coordenadas: 'coordenadas',
        direccion: 'direccion',
        notas: 'notas',
      },
    },

    // Subcolección: GruposConductores
    GruposConductores: {
      campos: {
        ConductoresIds: 'array', // Array de strings con IDs de conductores
        Nombre: 'string', // Nombre del grupo (con mayúscula)
        createdAt: 'timestamp', // Fecha de creación
      },
      // Mapeo para reportes
      mapeoReportes: {
        nombre: 'Nombre', // Nota: campo con mayúscula
        conductores: 'ConductoresIds', // Lista de IDs de conductores
      },
    },
  },
}

/**
 * Mapeo de campos para consultas de eventos
 * Usa los campos REALES de Firebase
 */
export const camposEventos = {
  fecha: 'createdAt', // Campo real de fecha
  nombre: 'nombre', // Campo real de nombre
  descripcion: 'descripcion', // Campo real de descripción
  activo: 'activo', // Campo real de estado
  horaInicio: 'horaInicio', // Hora de inicio
  horaFin: 'horaFin', // Hora de fin
}

/**
 * Función helper para extraer tipos de eventos únicos
 * desde la estructura real de condiciones
 */
export const extraerTiposEventos = (eventos) => {
  const tipos = new Set()

  eventos.forEach((evento) => {
    // Agregar nombre del evento
    if (evento.nombre) tipos.add(evento.nombre)

    // Agregar tipos de condiciones si existen
    if (evento.condiciones && Array.isArray(evento.condiciones)) {
      evento.condiciones.forEach((condicion) => {
        if (condicion.tipo) tipos.add(condicion.tipo)
      })
    }
  })

  return Array.from(tipos)
}

/**
 * Función helper para determinar si un evento ocurrió en cierto día
 * basado en diasSemana
 */
export const eventoAplicaEnDia = (evento, fecha) => {
  if (!evento.diasSemana || evento.diasSemana.length === 0) {
    return true // Si no tiene días específicos, aplica todos los días
  }

  const diasMap = {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
  }

  const diaSemana = diasMap[fecha.getDay()]
  return evento.diasSemana.includes(diaSemana)
}

/**
 * Función helper para verificar si un evento está dentro del horario
 */
export const eventoEnHorario = (evento, hora) => {
  if (!evento.horaInicio || !evento.horaFin) {
    return true // Si no tiene horario, aplica todo el día
  }

  // Convertir strings de hora a números para comparar
  const horaActual = parseInt(hora.replace(':', ''))
  const horaInicioNum = parseInt(evento.horaInicio.replace(':', ''))
  const horaFinNum = parseInt(evento.horaFin.replace(':', ''))

  return horaActual >= horaInicioNum && horaActual <= horaFinNum
}

/**
 * Columnas disponibles para los reportes
 * Adaptadas a los datos reales disponibles
 */
export const columnasDisponibles = {
  basicas: ['Nombre de evento', 'Fecha de creación', 'Descripción', 'Estado'],
  tiempo: ['Hora de inicio', 'Hora de fin', 'Días de la semana'],
  condiciones: ['Condiciones', 'Operadores lógicos', 'Condición de tiempo'],
  ubicacion: ['Geozona', 'Ubicación'],
}

/**
 * Tipos de geozonas comunes
 */
export const tiposGeozonas = ['Circular', 'Polígono', 'Rectángulo', 'Ruta']

/**
 * Tipos de POIs comunes
 */
export const tiposPOIs = [
  'Cliente',
  'Proveedor',
  'Almacén',
  'Punto de carga',
  'Gasolinera',
  'Taller',
  'Oficina',
  'Otro',
]

/**
 * Configuración de exportación (colores de tu marca)
 */
export const configExportacion = {
  pdf: {
    margen: {
      top: 20,
      right: 14,
      bottom: 20,
      left: 14,
    },
    fuente: 'helvetica',
    tamañoTitulo: 16,
    tamañoSubtitulo: 12,
    tamañoTexto: 10,
    colorEncabezado: [66, 139, 202], // RGB - Puedes cambiar al color de tu marca
  },
  excel: {
    colorEncabezado: 'FFD3D3D3', // ARGB - Gris claro
    fuenteEncabezado: {
      bold: true,
      size: 11,
    },
    anchoColumnas: {
      nombreEvento: 50,
      fecha: 20,
      duracion: 12,
      descripcion: 60,
      otros: 15,
    },
  },
}

/**
 * Función helper para formatear un evento de Firebase
 * al formato esperado por los reportes
 */
export const formatearEventoParaReporte = (evento) => {
  return {
    id: evento.id,
    nombre: evento.nombre || 'Sin nombre',
    fecha: evento.createdAt?.toDate?.() || new Date(evento.createdAt),
    descripcion: evento.descripcion || '',
    activo: evento.activo || false,
    horaInicio: evento.horaInicio || '',
    horaFin: evento.horaFin || '',
    diasSemana: evento.diasSemana || [],
    condiciones: evento.condiciones || [],
    operadoresLogicos: evento.operadoresLogicos || [],
    // Campos adicionales para reportes
    tipoEvento: evento.nombre, // Usar nombre como tipo
    condicion: evento.descripcion, // Usar descripción como condición
  }
}

/**
 * Función helper para formatear una geozona
 */
export const formatearGeozonaParaReporte = (geozona) => {
  return {
    id: geozona.id,
    nombre: geozona.nombre || 'Sin nombre',
    tipo: geozona.tipo || 'Desconocido',
    direccion: geozona.direccion || '',
    notas: geozona.notas || '',
    puntos: geozona.puntos || [],
    fechaCreacion: geozona.fechaCreacion?.toDate?.() || new Date(geozona.fechaCreacion),
  }
}

/**
 * Función helper para formatear un POI
 */
export const formatearPOIParaReporte = (poi) => {
  return {
    id: poi.id,
    nombre: poi.nombre || 'Sin nombre',
    tipo: poi.tipo || 'Otro',
    direccion: poi.direccion || '',
    notas: poi.notas || '',
    coordenadas: poi.coordenadas || {},
    fechaCreacion: poi.createdAt?.toDate?.() || new Date(poi.createdAt),
  }
}

/**
 * Función helper para formatear un grupo de conductores
 */
export const formatearGrupoConductoresParaReporte = (grupo) => {
  return {
    id: grupo.id,
    nombre: grupo.Nombre || 'Sin nombre', // Nota: campo con mayúscula
    conductoresIds: grupo.ConductoresIds || [],
    fechaCreacion: grupo.createdAt?.toDate?.() || new Date(grupo.createdAt),
  }
}
