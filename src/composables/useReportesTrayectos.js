// composables/useReportesTrayectos.js
import { ref } from 'vue'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'

export function useReportesTrayectos() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Genera trayectos simulados para pruebas
   */
  const generarTrayectosSimulados = (unidadNombre, unidadId, fechaInicio, fechaFin) => {
    const trayectos = []
    const fechas = generarRangoFechas(fechaInicio, fechaFin)

    const conductores = [
      'Perez Lopez Pedrooooo',
      'García Martínez Juan',
      'López Hernández María',
      'Rodríguez Sánchez Carlos',
    ]

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

        trayectos.push({
          id: `${fecha}_${i}`,
          idUnidad: unidadId,
          fecha: fecha,
          conductorId: `conductor_${Math.floor(Math.random() * 4)}`,
          conductorNombre: conductores[Math.floor(Math.random() * conductores.length)],
          unidadNombre: unidadNombre,
          unidadPlaca: `ABC-${Math.floor(Math.random() * 900) + 100}`,
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
          coordenadasInicio: {
            lat: 32.5149 + (Math.random() - 0.5) * 0.1,
            lng: -117.0382 + (Math.random() - 0.5) * 0.1,
          },
          coordenadasFin: {
            lat: 32.5149 + (Math.random() - 0.5) * 0.1,
            lng: -117.0382 + (Math.random() - 0.5) * 0.1,
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
      console.log('🗺️ Obteniendo trayectos...')
      console.log('📦 Unidades:', unidadesNombres)
      console.log('📅 Desde:', fechaInicio.toLocaleDateString())
      console.log('📅 Hasta:', fechaFin.toLocaleDateString())

      const todosTrayectos = []
      const fechas = generarRangoFechas(fechaInicio, fechaFin)

      // 🔥 MAPEO DE NOMBRES A IDS
      const unidadesIds = unidadesNombres.map((nombre) => {
        if (window.unidadesMap && window.unidadesMap[nombre]) {
          return window.unidadesMap[nombre]
        }
        return nombre
      })

      console.log('📦 IDs de unidades a consultar:', unidadesIds)

      for (let i = 0; i < unidadesIds.length; i++) {
        const unidadId = unidadesIds[i]
        const unidadNombre = unidadesNombres[i]

        console.log(`🚗 Procesando unidad: ${unidadId}`)

        for (const fecha of fechas) {
          try {
            const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
            const rutaSnap = await getDoc(rutaRef)

            if (rutaSnap.exists()) {
              const data = rutaSnap.data()
              console.log(`  ✅ ${fecha}: Datos encontrados en Firebase`)

              const trayecto = {
                id: fecha,
                idUnidad: unidadId,
                fecha: fecha,
                conductorId: data.conductor_id || null,
                conductorNombre: data.conductor_nombre || 'N/A',
                unidadNombre: unidadNombre,
                unidadPlaca: 'N/A',
                inicioTimestamp: data.fecha_hora_inicio?.toDate?.() || null,
                finTimestamp: data.fecha_hora_fin?.toDate?.() || null,
                duracion: (data.duracion_total_minutos || 0) * 60000,
                duracionHoras: ((data.duracion_total_minutos || 0) / 60).toFixed(2),
                kilometrajeRecorrido: data.distancia_recorrida_km || 0,
                velocidadPromedio: data.velocidad_promedio || 0,
                velocidadMaxima: data.velocidad_maxima || 0,
                paradas: data.numero_paradas || 0,
                ubicacionInicio: data.ubicacion_inicio || 'N/A',
                ubicacionFin: data.ubicacion_fin || 'N/A',
                _raw: data,
                _simulado: false,
              }

              todosTrayectos.push(trayecto)
            } else {
              console.log(`  ⚠️ ${fecha}: No hay datos en Firebase`)
            }
          } catch (err) {
            console.warn(`  ❌ Error en ${unidadId}/${fecha}:`, err.message)
          }
        }
      }

      console.log(`✅ Total de trayectos reales obtenidos: ${todosTrayectos.length}`)

      // 🔥 SI NO HAY TRAYECTOS REALES, GENERAR SIMULADOS
      if (todosTrayectos.length === 0) {
        console.log('⚠️ No se encontraron trayectos reales, generando datos simulados...')

        for (let i = 0; i < unidadesNombres.length; i++) {
          const trayectosSimulados = generarTrayectosSimulados(
            unidadesNombres[i],
            unidadesIds[i],
            fechaInicio,
            fechaFin,
          )
          todosTrayectos.push(...trayectosSimulados)
          console.log(
            `  ✅ Generados ${trayectosSimulados.length} trayectos simulados para ${unidadesNombres[i]}`,
          )
        }

        console.log(`✅ Total de trayectos simulados: ${todosTrayectos.length}`)
      }

      return todosTrayectos
    } catch (err) {
      console.error('❌ Error al obtener trayectos:', err)
      error.value = err.message

      // En caso de error, generar datos simulados como fallback
      console.log('🔄 Generando datos simulados como fallback...')
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

      return trayectosFallback
    } finally {
      loading.value = false
    }
  }

  const enriquecerConDatosUnidades = async (trayectos) => {
    try {
      // Si ya tienen nombre de unidad (simulados), no hace falta enriquecer
      if (trayectos.length > 0 && trayectos[0]._simulado) {
        console.log('📦 Trayectos simulados, no es necesario enriquecer')
        return trayectos
      }

      const unidadesRef = collection(db, 'Unidades')
      const unidadesSnapshot = await getDocs(unidadesRef)

      const unidadesMap = {}
      unidadesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        unidadesMap[doc.id] = {
          nombre: data.Unidad || doc.id,
          placa: data.SeguroUnidad || 'N/A',
        }
      })

      return trayectos.map((trayecto) => ({
        ...trayecto,
        unidadNombre:
          unidadesMap[trayecto.idUnidad]?.nombre || trayecto.unidadNombre || trayecto.idUnidad,
        unidadPlaca: unidadesMap[trayecto.idUnidad]?.placa || trayecto.unidadPlaca || 'N/A',
      }))
    } catch (err) {
      console.error('Error al enriquecer unidades:', err)
      return trayectos
    }
  }

  return {
    loading,
    error,
    obtenerTrayectos,
    enriquecerConDatosUnidades,
    generarTrayectosSimulados,
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
