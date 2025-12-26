// composables/useReportesTrayectos.js
import { ref } from 'vue'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'
import { useProcesamientoTrayectos } from './useProcesamientoTrayectos'

export function useReportesTrayectos() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * 🆕 Descarga las coordenadas del archivo JSON en Firebase Storage
   */
  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) {
      console.warn('No hay URL de rutas')
      return []
    }

    try {
      const response = await fetch(rutasUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // El archivo puede tener diferentes estructuras, intentar varias
      let coordenadas = []

      if (Array.isArray(data)) {
        // Caso 1: Array directo de coordenadas
        coordenadas = data
      } else if (data.coordenadas && Array.isArray(data.coordenadas)) {
        // Caso 2: Objeto con propiedad coordenadas
        coordenadas = data.coordenadas
      } else if (data.ruta && Array.isArray(data.ruta)) {
        // Caso 3: Objeto con propiedad ruta
        coordenadas = data.ruta
      } else if (data.puntos && Array.isArray(data.puntos)) {
        // Caso 4: Objeto con propiedad puntos
        coordenadas = data.puntos
      }

      // Normalizar formato de coordenadas
      const coordenadasNormalizadas = coordenadas
        .filter((coord) => {
          const lat = coord.lat || coord.latitude
          const lng = coord.lng || coord.longitude || coord.lon
          return lat && lng
        })
        .map((coord) => ({
          lat: coord.lat || coord.latitude,
          lng: coord.lng || coord.longitude || coord.lon,
          timestamp: coord.timestamp || coord.time || null,
        }))

      return coordenadasNormalizadas
    } catch (err) {
      console.error('Error descargando coordenadas del Storage:', err)
      return []
    }
  }

  /**
   * Genera trayectos simulados para pruebas
   */
  const generarTrayectosSimulados = (unidadNombre, unidadId, fechaInicio, fechaFin) => {
    const trayectos = []
    const fechas = generarRangoFechas(fechaInicio, fechaFin)

    const conductores = [
      'Perez Lopez Pedro',
      'García Martínez Juan',
      'López Hernández María',
      'Rodríguez Sánchez Carlos',
    ]

    // Coordenadas base en Tijuana
    const baseLatTJ = 32.5149
    const baseLngTJ = -117.0382

    for (const fecha of fechas) {
      // Generar entre 1-3 trayectos por día
      const numTrayectos = Math.floor(Math.random() * 3) + 1

      for (let i = 0; i < numTrayectos; i++) {
        const horaInicio = 6 + Math.floor(Math.random() * 4) // 6-10 AM
        const duracionHoras = 2 + Math.floor(Math.random() * 6) // 2-8 horas

        const inicioTimestamp = new Date(fecha)
        inicioTimestamp.setHours(horaInicio, Math.floor(Math.random() * 60), 0, 0)

        const finTimestamp = new Date(inicioTimestamp)
        finTimestamp.setHours(
          inicioTimestamp.getHours() + duracionHoras,
          Math.floor(Math.random() * 60),
          0,
          0,
        )

        const duracionMs = finTimestamp - inicioTimestamp
        const kilometraje = Math.floor(Math.random() * 150) + 50 // 50-200 km
        const velocidadPromedio = Math.floor(kilometraje / (duracionHoras + 0.5)) // km/h
        const velocidadMaxima = velocidadPromedio + Math.floor(Math.random() * 30) + 10

        // 🔥 GENERAR COORDENADAS SIMULADAS
        const numCoordenadas = 20 + Math.floor(Math.random() * 30) // 20-50 puntos
        const coordenadas = []

        for (let j = 0; j < numCoordenadas; j++) {
          coordenadas.push({
            lat: baseLatTJ + (Math.random() - 0.5) * 0.05, // ~5km de variación
            lng: baseLngTJ + (Math.random() - 0.5) * 0.05,
            timestamp: new Date(
              inicioTimestamp.getTime() + (j * duracionMs) / numCoordenadas,
            ).toISOString(),
          })
        }

        trayectos.push({
          id: `${fecha}_${i}`,
          idUnidad: unidadId,
          fecha: fecha,
          conductorId: `conductor_${Math.floor(Math.random() * 4)}`,
          conductorNombre: conductores[Math.floor(Math.random() * conductores.length)],
          unidadNombre: unidadNombre,
          Placa: `ABC-${Math.floor(Math.random() * 900) + 100}`,
          inicioTimestamp: inicioTimestamp,
          finTimestamp: finTimestamp,
          duracion: duracionMs,
          duracionHoras: (duracionMs / (1000 * 60 * 60)).toFixed(2),
          kilometrajeRecorrido: kilometraje,
          velocidadPromedio: velocidadPromedio,
          velocidadMaxima: velocidadMaxima,
          paradas: Math.floor(Math.random() * 5) + 1,
          combustibleConsumido: (kilometraje / 12).toFixed(2), // Aprox 12 km/litro
          ubicacionInicio: 'Tijuana, BC, México',
          ubicacionFin: 'Tijuana, BC, México',
          coordenadas: coordenadas, // 🔥 COORDENADAS SIMULADAS
          latitud: coordenadas[0].lat,
          longitud: coordenadas[0].lng,
          coordenadasInicio: {
            lat: coordenadas[0].lat,
            lng: coordenadas[0].lng,
          },
          coordenadasFin: {
            lat: coordenadas[coordenadas.length - 1].lat,
            lng: coordenadas[coordenadas.length - 1].lng,
          },
          _simulado: true,
        })
      }
    }

    return trayectos
  }

  const obtenerTrayectos = async (unidadesNombres, fechaInicio, fechaFin) => {
    loading.value = true
    error.value = null

    try {
      const todosTrayectos = []
      const fechas = generarRangoFechas(fechaInicio, fechaFin)

      // 🔥 MAPEO DE NOMBRES A IDS
      const unidadesIds = unidadesNombres.map((nombre) => {
        if (window.unidadesMap && window.unidadesMap[nombre]) {
          return window.unidadesMap[nombre]
        }
        return nombre
      })

      for (let i = 0; i < unidadesIds.length; i++) {
        const unidadId = unidadesIds[i]
        const unidadNombre = unidadesNombres[i]

        for (const fecha of fechas) {
          try {
            const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
            const rutaSnap = await getDoc(rutaRef)

            if (rutaSnap.exists()) {
              const data = rutaSnap.data()

              // 🔥 DESCARGAR COORDENADAS DEL STORAGE
              let coordenadas = []
              if (data.rutas_url) {
                coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)
              }

              // Si no hay coordenadas del storage, intentar con nuevaCoordenada
              if (coordenadas.length === 0 && data.nuevaCoordenada) {
                coordenadas = [
                  {
                    lat: data.nuevaCoordenada.lat,
                    lng: data.nuevaCoordenada.lng,
                    timestamp: data.nuevaCoordenada.timestamp,
                  },
                ]
              }

              const trayecto = {
                id: fecha,
                idUnidad: unidadId,
                fecha: fecha,
                conductorId: data.conductor_id || null,
                conductorNombre: data.conductor_nombre || 'N/A',
                unidadNombre: unidadNombre,
                Placa: 'N/A',
                inicioTimestamp: data.fecha_hora_inicio?.toDate?.() || null,
                finTimestamp: data.fecha_hora_fin?.toDate?.() || null,
                duracion: (data.duracion_total_minutos || 0) * 60000,
                duracionHoras: ((data.duracion_total_minutos || 0) / 60).toFixed(2),
                kilometrajeRecorrido: parseFloat(data.distancia_recorrida_km) || 0,
                velocidadPromedio: parseFloat(data.velocidad_promedio) || 0,
                velocidadMaxima: parseFloat(data.velocidad_maxima) || 0,
                paradas: data.paradas?.length || 0,
                ubicacionInicio: data.ubicacion_inicio || 'N/A',
                ubicacionFin: data.ubicacion_fin || 'N/A',
                coordenadas: coordenadas, // 🔥 COORDENADAS PARA EL MAPA
                latitud: coordenadas[0]?.lat, // Primera coordenada
                longitud: coordenadas[0]?.lng,
                _raw: data,
                _simulado: false,
              }

              todosTrayectos.push(trayecto)
            } else {
              console.warn(`${fecha}: No hay datos en Firebase`)
            }
          } catch (err) {
            console.warn(`Error en ${unidadId}/${fecha}:`, err.message)
          }
        }
      }

      // 🔥 SI NO HAY TRAYECTOS REALES, GENERAR SIMULADOS
      if (todosTrayectos.length === 0) {
        for (let i = 0; i < unidadesNombres.length; i++) {
          const trayectosSimulados = generarTrayectosSimulados(
            unidadesNombres[i],
            unidadesIds[i],
            fechaInicio,
            fechaFin,
          )
          todosTrayectos.push(...trayectosSimulados)
        }
      }

      // 🔥 PROCESAR TRAYECTOS (ya sea reales o simulados)
      const { procesarTrayectosParaPDF } = useProcesamientoTrayectos()
      const trayectosProcesados = await procesarTrayectosParaPDF(todosTrayectos)

      return trayectosProcesados
    } catch (err) {
      console.error('Error al obtener trayectos:', err)
      error.value = err.message

      // En caso de error, generar datos simulados como fallback
      const trayectosFallback = []
      const unidadesIds = unidadesNombres.map((nombre) => window.unidadesMap?.[nombre] || nombre)

      for (let i = 0; i < unidadesNombres.length; i++) {
        const trayectosSimulados = generarTrayectosSimulados(
          unidadesNombres[i],
          unidadesIds[i],
          fechaInicio,
          fechaFin,
        )
        trayectosFallback.push(...trayectosSimulados)
      }

      const { procesarTrayectosParaPDF } = useProcesamientoTrayectos()
      const trayectosFallbackProcesados = await procesarTrayectosParaPDF(trayectosFallback)

      return trayectosFallbackProcesados
    } finally {
      loading.value = false
    }
  }

  const enriquecerConDatosUnidades = async (trayectos) => {
    try {
      // Si ya tienen nombre de unidad (simulados), no hace falta enriquecer
      if (trayectos.length > 0 && trayectos[0]._simulado) {
        console.log('🔍 Trayectos simulados, saltando enriquecimiento')
        return trayectos
      }

      const unidadesRef = collection(db, 'Unidades')
      const unidadesSnapshot = await getDocs(unidadesRef)

      console.log('🔍 Total de unidades en Firebase:', unidadesSnapshot.size)

      const unidadesMap = {}
      unidadesSnapshot.docs.forEach((doc) => {
        const data = doc.data()

        // 🔥 DEBUG: Ver qué campos tiene cada unidad
        console.log(`🔍 Unidad ${doc.id}:`, {
          Unidad: data.Unidad,
          Placa: data.Placa,
          SeguroUnidad: data.SeguroUnidad,
          todosLosCampos: Object.keys(data),
        })

        unidadesMap[doc.id] = {
          nombre: data.Unidad || doc.id,
          placa: data.Placa || 'Sin placa',
        }
      })

      console.log('🔍 Mapa de unidades creado:', unidadesMap)

      const trayectosEnriquecidos = trayectos.map((trayecto) => {
        const unidadInfo = unidadesMap[trayecto.idUnidad]

        console.log(`🔍 Enriqueciendo trayecto:`, {
          idUnidad: trayecto.idUnidad,
          unidadInfo: unidadInfo,
          placaFinal: unidadInfo?.placa || trayecto.Placa || 'Sin placa',
        })

        return {
          ...trayecto,
          unidadNombre: unidadInfo?.nombre || trayecto.unidadNombre || trayecto.idUnidad,
          Placa: unidadInfo?.placa || trayecto.Placa || 'Sin placa',
        }
      })

      console.log(
        '🔍 Trayectos enriquecidos:',
        trayectosEnriquecidos.map((t) => ({
          unidad: t.unidadNombre,
          placa: t.Placa,
        })),
      )

      return trayectosEnriquecidos
    } catch (err) {
      console.error('❌ Error al enriquecer unidades:', err)
      return trayectos
    }
  }
  return {
    loading,
    error,
    obtenerTrayectos,
    enriquecerConDatosUnidades,
    generarTrayectosSimulados,
    descargarCoordenadasDeStorage, // 🆕 Exportar por si se necesita
  }
}

function generarRangoFechas(fechaInicio, fechaFin) {
  const fechas = []
  const fechaActual = new Date(fechaInicio)

  while (fechaActual <= fechaFin) {
    fechas.push(formatearFecha(fechaActual))
    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  return fechas
}

function formatearFecha(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}
