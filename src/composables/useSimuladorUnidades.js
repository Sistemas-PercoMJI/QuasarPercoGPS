// src/composables/useSimuladorUnidades.js - v3.4 CON BATCHING (CORREGIDO)
import { ref } from 'vue'
import { realtimeDb } from 'src/firebase/firebaseConfig'
import { ref as dbRef, set, update, onValue, remove } from 'firebase/database'
import { useEventDetection } from 'src/composables/useEventDetection'
import { useRutaDiaria } from 'src/composables/useRutaDiaria'
import { useUnidadesWatcher } from 'src/composables/useUnidadesWatcher'

export function useSimuladorUnidades() {
  const simulacionActiva = ref(false)
  const intervalos = ref([])
  const unidadesSimuladas = ref([])

  const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()
  const { agregarCoordenadaSimple } = useRutaDiaria()
  const { iniciarMonitoreoUnidades, detenerMonitoreo, iniciarMonitoreoConductores } =
    useUnidadesWatcher()

  const LIMITES_TIJUANA = {
    latMin: 32.43,
    latMax: 32.56,
    lngMin: -117.13,
    lngMax: -116.88,
  }

  const MAPBOX_TOKEN =
    'pk.eyJ1Ijoic2lzdGVtYXNtajEyMyIsImEiOiJjbWdwZWpkZTAyN3VlMm5vazkzZjZobWd3In0.0ET-a5pO9xn5b6pZj1_YXA'

  const ESTADOS = {
    MOVIMIENTO: 'movimiento',
    DETENIDO: 'detenido',
    INACTIVO: 'inactivo',
  }

  const DURACION_ESTADO = 30000
  const TIEMPO_ACTUALIZACION_DIRECCION = 30000
  const DISTANCIA_MIN_ACTUALIZACION = 50
  // 🆕 Reducimos la frecuencia de actualización para disminuir la carga
  const INTERVALO_ACTUALIZACION = 10000 // 10 segundos en lugar de 5

  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&types=address,poi,locality&limit=1`,
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const place_name = feature.place_name || ''
        const text = feature.text || ''
        const address = feature.address || ''

        let direccionFinal = ''

        if (address && text) {
          direccionFinal = `${text} ${address}`
        } else if (text) {
          direccionFinal = text
        } else {
          direccionFinal = place_name.split(',')[0] || ''
        }

        direccionFinal = direccionFinal
          .replace(/, Baja California, México/g, '')
          .replace(/, Baja California/g, '')
          .replace(/, Tijuana, Baja California/g, '')
          .replace(/, Tijuana/g, '')
          .replace(/, México/g, '')
          .replace(/22[0-9]{3}/g, '')
          .trim()

        if (direccionFinal && direccionFinal.length > 3) {
          return direccionFinal
        }
      }

      console.warn('Sin resultado específico, intentando búsqueda amplia...')
      const responseAmplia = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`,
      )
      const dataAmplia = await responseAmplia.json()

      if (dataAmplia.features && dataAmplia.features.length > 0) {
        const feature = dataAmplia.features[0]
        const parts = feature.place_name.split(',')
        const direccion = parts[0].trim()
        if (direccion && direccion.length > 3) {
          return direccion
        }
      }
    } catch (error) {
      console.error('Error en geocoding:', error)
    }

    return '📍 Sin nombre de calle'
  }

  const determinarSiguienteEstado = () => {
    const rand = Math.random()
    if (rand < 0.333) return ESTADOS.MOVIMIENTO
    if (rand < 0.666) return ESTADOS.DETENIDO
    return ESTADOS.INACTIVO
  }

  const generarUbicacionAleatoria = () => {
    const lat =
      LIMITES_TIJUANA.latMin + Math.random() * (LIMITES_TIJUANA.latMax - LIMITES_TIJUANA.latMin)
    const lng =
      LIMITES_TIJUANA.lngMin + Math.random() * (LIMITES_TIJUANA.lngMax - LIMITES_TIJUANA.lngMin)
    return { lat, lng }
  }

  const generarDestinoAleatorio = (ubicacionActual) => {
    let nuevoDestino, distancia
    do {
      nuevoDestino = generarUbicacionAleatoria()
      distancia = calcularDistancia(
        ubicacionActual.lat,
        ubicacionActual.lng,
        nuevoDestino.lat,
        nuevoDestino.lng,
      )
    } while (distancia < 1000)
    return nuevoDestino
  }

  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const calcularDireccion = (desde, hacia) => {
    const deltaLng = hacia.lng - desde.lng
    const deltaLat = hacia.lat - desde.lat
    const bearing = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
    return (bearing + 360) % 360
  }

  const procesarMovimientoUnidad = (estadoActual) => {
    const ahora = Date.now()

    if (!estadoActual.ubicacion?.lat || !estadoActual.ubicacion?.lng) {
      const ubicacionInicial = generarUbicacionAleatoria()
      return {
        ubicacion: ubicacionInicial,
        direccion: Math.random() * 360,
        estado: ESTADOS.MOVIMIENTO,
        velocidad: 45,
        ignicion: true,
        destinoAleatorio: generarDestinoAleatorio(ubicacionInicial),
        tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
        ultimaActualizacionDireccion: 0,
      }
    }

    if (ahora >= (estadoActual.tiempoProximoCambioEstado || 0)) {
      const nuevoEstado = determinarSiguienteEstado()

      if (nuevoEstado === ESTADOS.MOVIMIENTO) {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion || Math.random() * 360,
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40,
          ignicion: true,
          destinoAleatorio: generarDestinoAleatorio(estadoActual.ubicacion),
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
        }
      } else if (nuevoEstado === ESTADOS.DETENIDO) {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion,
          estado: ESTADOS.DETENIDO,
          velocidad: 0,
          ignicion: true,
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
        }
      } else {
        return {
          ubicacion: estadoActual.ubicacion,
          direccion: estadoActual.direccion,
          estado: ESTADOS.INACTIVO,
          velocidad: 0,
          ignicion: false,
          destinoAleatorio: estadoActual.ubicacion,
          tiempoProximoCambioEstado: ahora + DURACION_ESTADO,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
        }
      }
    }

    if (estadoActual.estado === ESTADOS.MOVIMIENTO) {
      if (!estadoActual.destinoAleatorio?.lat || !estadoActual.destinoAleatorio?.lng) {
        estadoActual.destinoAleatorio = generarDestinoAleatorio(estadoActual.ubicacion)
      }

      const tiempoTranscurrido = (ahora - (estadoActual.ultimoPuntoTiempo || ahora)) / 1000
      const velocidadMs = (estadoActual.velocidad * 1000) / 3600
      const distanciaAMover = velocidadMs * tiempoTranscurrido

      const distanciaAlDestino = calcularDistancia(
        estadoActual.ubicacion.lat,
        estadoActual.ubicacion.lng,
        estadoActual.destinoAleatorio.lat,
        estadoActual.destinoAleatorio.lng,
      )

      if (distanciaAMover >= distanciaAlDestino || distanciaAlDestino < 100) {
        const nuevoDestino = generarDestinoAleatorio(estadoActual.ubicacion)
        return {
          ubicacion: estadoActual.destinoAleatorio,
          direccion: calcularDireccion(estadoActual.ubicacion, nuevoDestino),
          estado: ESTADOS.MOVIMIENTO,
          velocidad: Math.floor(Math.random() * 20) + 40,
          ignicion: true,
          destinoAleatorio: nuevoDestino,
          tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
          ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
        }
      }

      const proporcion = Math.min(distanciaAMover / distanciaAlDestino, 1)
      const nuevaLat =
        estadoActual.ubicacion.lat +
        (estadoActual.destinoAleatorio.lat - estadoActual.ubicacion.lat) * proporcion
      const nuevaLng =
        estadoActual.ubicacion.lng +
        (estadoActual.destinoAleatorio.lng - estadoActual.ubicacion.lng) * proporcion

      const latFinal = Math.max(LIMITES_TIJUANA.latMin, Math.min(LIMITES_TIJUANA.latMax, nuevaLat))
      const lngFinal = Math.max(LIMITES_TIJUANA.lngMin, Math.min(LIMITES_TIJUANA.lngMax, nuevaLng))

      let nuevaVelocidad = estadoActual.velocidad
      if (Math.random() < 0.15) {
        nuevaVelocidad = Math.max(35, Math.min(65, nuevaVelocidad + (Math.random() - 0.5) * 12))
      }

      return {
        ubicacion: { lat: latFinal, lng: lngFinal },
        direccion: calcularDireccion(estadoActual.ubicacion, estadoActual.destinoAleatorio),
        estado: ESTADOS.MOVIMIENTO,
        velocidad: Math.floor(nuevaVelocidad),
        ignicion: true,
        destinoAleatorio: estadoActual.destinoAleatorio,
        tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
        ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
      }
    }

    return {
      ubicacion: estadoActual.ubicacion,
      direccion: estadoActual.direccion,
      estado: estadoActual.estado,
      velocidad: 0,
      ignicion: estadoActual.estado === ESTADOS.DETENIDO,
      destinoAleatorio: estadoActual.ubicacion,
      tiempoProximoCambioEstado: estadoActual.tiempoProximoCambioEstado,
      ultimaActualizacionDireccion: estadoActual.ultimaActualizacionDireccion || 0,
    }
  }

  const iniciarSimulacionUnidad = async (conductor, unidad) => {
    const unidadId = `unidad_${unidad.id}`
    const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadId}`)

    // ✅ Verificar si ya existe en Firebase
    let estadoExistente = null
    try {
      const snapshot = await new Promise((resolve, reject) => {
        onValue(unidadRef, (snap) => resolve(snap), reject, { onlyOnce: true })
      })
      estadoExistente = snapshot.val()
    } catch {
      console.warn(`${unidad.Unidad}: No hay estado previo`)
    }

    // ✅ SI EXISTE: Restaurar ubicación anterior
    if (estadoExistente && estadoExistente.ubicacion) {
      await update(unidadRef, {
        timestamp: Date.now(),
        ultimaActualizacion: new Date().toISOString(),
        ultimoPuntoTiempo: Date.now(),
        conductorId: conductor.id,
        conductorNombre: [conductor.Nombre, conductor.Apellido].filter(Boolean).join(' '),
        conductorFoto: conductor.LicenciaConducirFoto || null,
        // 🆕 AGREGAR IdEmpresaUnidad
        IdEmpresaUnidad: unidad.IdEmpresaUnidad || 'SIN_EMPRESA',
        IdEmpresaConductor: conductor.IdEmpresaConductor || 'SIN_EMPRESA',
      })
      iniciarIntervaloActualizacion(conductor, unidad, unidadRef)
      return
    }

    // ✅ SI NO EXISTE: Crear nueva posición
    const ubicacionInicial = generarUbicacionAleatoria()
    const destinoInicial = generarDestinoAleatorio(ubicacionInicial)
    const velocidadBase = Math.floor(Math.random() * 20) + 40
    const estadoInicial = determinarSiguienteEstado()
    const direccionReal = await obtenerDireccionDesdeCoordenadas(
      ubicacionInicial.lat,
      ubicacionInicial.lng,
    )

    const estado = {
      id: unidad.id,
      conductorId: conductor.id,
      conductorNombre: [conductor.Nombre, conductor.Apellido].filter(Boolean).join(' '),
      conductorFoto: conductor.LicenciaConducirFoto || null,
      unidadId: unidad.id,
      unidadNombre: unidad.Unidad,
      unidadPlaca: unidad.Placa || 'N/A',
      // 🆕 AGREGAR IdEmpresaUnidad e IdEmpresaConductor
      IdEmpresaUnidad: unidad.IdEmpresaUnidad || 'SIN_EMPRESA',
      IdEmpresaConductor: conductor.IdEmpresaConductor || 'SIN_EMPRESA',
      ubicacion: ubicacionInicial,
      velocidad: estadoInicial === ESTADOS.MOVIMIENTO ? velocidadBase : 0,
      direccion: calcularDireccion(ubicacionInicial, destinoInicial),
      estado: estadoInicial,
      direccionTexto: direccionReal,
      bateria: Math.floor(Math.random() * 30) + 70,
      ignicion: estadoInicial !== ESTADOS.INACTIVO,
      timestamp: Date.now(),
      ultimaActualizacion: new Date().toISOString(),
      ultimoPuntoTiempo: Date.now(),
      velocidadBase: velocidadBase,
      destinoAleatorio: estadoInicial === ESTADOS.MOVIMIENTO ? destinoInicial : ubicacionInicial,
      tiempoProximoCambioEstado: Date.now() + DURACION_ESTADO,
      ultimaActualizacionDireccion: Date.now(),
    }

    await set(unidadRef, estado)

    // (resto del código igual)
    if (estadoInicial === ESTADOS.MOVIMIENTO) {
      try {
        await agregarCoordenadaSimple(unidad.id, {
          conductor_id: conductor.id,
          conductor_nombre: [conductor.Nombre, conductor.Apellido].filter(Boolean).join(' '),
          odometro_inicio: '0',
          velocidad_actual: String(velocidadBase),
          nuevaCoordenada: {
            lat: ubicacionInicial.lat,
            lng: ubicacionInicial.lng,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (err) {
        console.error(`Error agregando coordenada inicial al buffer:`, err)
      }
    }

    iniciarIntervaloActualizacion(conductor, unidad, unidadRef)
  }

  const detenerUnidadEspecifica = async (unidadId) => {
    const unidadKey = `unidad_${unidadId}`

    // Buscar y detener el intervalo
    const indiceIntervalo = intervalos.value.findIndex((i) => i.unidadId === unidadKey)
    if (indiceIntervalo !== -1) {
      clearInterval(intervalos.value[indiceIntervalo].intervalo)
      intervalos.value.splice(indiceIntervalo, 1)
      console.log(`⏸️ Intervalo detenido para ${unidadKey}`)
    }

    // Eliminar de unidadesSimuladas
    const indiceSimulada = unidadesSimuladas.value.findIndex((u) => u.unidadIdReal === unidadId)
    if (indiceSimulada !== -1) {
      unidadesSimuladas.value.splice(indiceSimulada, 1)
    }

    // Eliminar de Realtime Database
    try {
      await remove(dbRef(realtimeDb, `unidades_activas/${unidadKey}`))
      console.log(`🗑️ Unidad ${unidadKey} eliminada de Realtime Database`)
    } catch (err) {
      console.error(`Error eliminando ${unidadKey}:`, err)
    }
  }

  // 🆕 NUEVA FUNCIÓN: Reiniciar una unidad específica
  const reiniciarUnidadEspecifica = async (unidad, conductor) => {
    console.log(`🔄 Reiniciando unidad ${unidad.id} con nuevo IdEmpresa: ${unidad.IdEmpresaUnidad}`)

    // Primero detener la unidad actual
    await detenerUnidadEspecifica(unidad.id)

    // Esperar un momento para asegurar que se limpió
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Reiniciar con los nuevos datos
    await iniciarSimulacionUnidad(conductor, unidad)

    console.log(`✅ Unidad ${unidad.id} reiniciada con éxito`)
  }

  const iniciarIntervaloActualizacion = (conductor, unidad, unidadRef) => {
    const unidadId = `unidad_${unidad.id}`

    const intervalo = setInterval(async () => {
      try {
        const snapshot = await new Promise((resolve, reject) => {
          onValue(unidadRef, (snap) => resolve(snap), reject, { onlyOnce: true })
        })

        const estadoActual = snapshot.val()
        if (!estadoActual) return

        const nuevoMovimiento = procesarMovimientoUnidad(estadoActual)

        let nuevaDireccionTexto = estadoActual.direccionTexto
        let actualizarTimestampDireccion = estadoActual.ultimaActualizacionDireccion || 0

        if (nuevoMovimiento.estado === ESTADOS.MOVIMIENTO) {
          const distanciaCambio = calcularDistancia(
            estadoActual.ubicacion.lat,
            estadoActual.ubicacion.lng,
            nuevoMovimiento.ubicacion.lat,
            nuevoMovimiento.ubicacion.lng,
          )

          if (distanciaCambio > 0.1) {
            const tiempoDesdeUltimaActualizacion =
              Date.now() - (estadoActual.ultimaActualizacionDireccion || 0)
            const debeActualizarDireccion =
              distanciaCambio > DISTANCIA_MIN_ACTUALIZACION ||
              tiempoDesdeUltimaActualizacion > TIEMPO_ACTUALIZACION_DIRECCION

            if (debeActualizarDireccion) {
              try {
                nuevaDireccionTexto = await obtenerDireccionDesdeCoordenadas(
                  nuevoMovimiento.ubicacion.lat,
                  nuevoMovimiento.ubicacion.lng,
                )
                actualizarTimestampDireccion = Date.now()
              } catch (error) {
                console.warn('Error geocoding:', error)
                nuevaDireccionTexto = `${nuevoMovimiento.ubicacion.lat.toFixed(5)}, ${nuevoMovimiento.ubicacion.lng.toFixed(5)}`
              }
            }
          }
        } else {
          nuevoMovimiento.ubicacion = estadoActual.ubicacion
          nuevoMovimiento.direccion = estadoActual.direccion
        }

        // 🔥 AQUÍ ESTÁ EL CAMBIO IMPORTANTE
        await update(unidadRef, {
          ubicacion: nuevoMovimiento.ubicacion,
          velocidad: nuevoMovimiento.velocidad,
          direccion: Math.floor(nuevoMovimiento.direccion),
          estado: nuevoMovimiento.estado,
          ignicion: nuevoMovimiento.ignicion,
          timestamp: Date.now(),
          ultimaActualizacion: new Date().toISOString(),
          ultimoPuntoTiempo: Date.now(),
          destinoAleatorio: nuevoMovimiento.destinoAleatorio,
          tiempoProximoCambioEstado: nuevoMovimiento.tiempoProximoCambioEstado,
          direccionTexto: nuevaDireccionTexto,
          ultimaActualizacionDireccion: actualizarTimestampDireccion,
          conductorId: estadoActual.conductorId,
          conductorNombre: estadoActual.conductorNombre,
          conductorFoto: estadoActual.conductorFoto || null,
          unidadId: estadoActual.unidadId,
          unidadNombre: estadoActual.unidadNombre,
          unidadPlaca: estadoActual.unidadPlaca,
          bateria: estadoActual.bateria,
          // 🆕 MANTENER LOS IdEmpresa EN CADA ACTUALIZACIÓN
          IdEmpresaUnidad: estadoActual.IdEmpresaUnidad || unidad.IdEmpresaUnidad || 'SIN_EMPRESA',
          IdEmpresaConductor:
            estadoActual.IdEmpresaConductor || conductor.IdEmpresaConductor || 'SIN_EMPRESA',
        })

        // (resto del código de guardar rutas y evaluar eventos sin cambios...)
        if (nuevoMovimiento.estado === ESTADOS.MOVIMIENTO) {
          try {
            await agregarCoordenadaSimple(unidad.id, {
              conductor_id: estadoActual.conductorId,
              conductor_nombre: estadoActual.conductorNombre,
              velocidad_actual: String(nuevoMovimiento.velocidad),
              nuevaCoordenada: {
                lat: nuevoMovimiento.ubicacion.lat,
                lng: nuevoMovimiento.ubicacion.lng,
                timestamp: new Date().toISOString(),
              },
            })
          } catch (errRuta) {
            console.error(`Error al agregar al buffer de ruta:`, errRuta)
          }
        }

        try {
          await evaluarEventosParaUnidadesSimulacion([
            {
              id: unidad.id,
              conductorId: estadoActual.conductorId,
              conductorNombre: estadoActual.conductorNombre,
              unidadNombre: estadoActual.unidadNombre,
              nombre: estadoActual.conductorNombre,
              ubicacion: nuevoMovimiento.ubicacion,
              lat: nuevoMovimiento.ubicacion.lat,
              lng: nuevoMovimiento.ubicacion.lng,
              estado: nuevoMovimiento.estado,
              velocidad: nuevoMovimiento.velocidad,
            },
          ])
        } catch (errorEvento) {
          console.error('Error eventos:', errorEvento)
        }
      } catch (error) {
        console.error(`Error actualizando ${unidadId}:`, error)
      }
    }, INTERVALO_ACTUALIZACION)

    intervalos.value.push({ unidadId, intervalo })
    unidadesSimuladas.value.push({
      conductorId: conductor.id,
      unidadId,
      unidadNombre: unidad.Unidad,
      unidadIdReal: unidad.id,
    })
  }
  const iniciarSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      return
    }

    const conductoresConUnidad = conductores.filter((c) => c.UnidadAsignada)

    if (conductoresConUnidad.length === 0) {
      console.warn('⚠️ Sin conductores asignados')
      return
    }

    simulacionActiva.value = true

    // MONITOREAR CAMBIOS EN UNIDADES
    iniciarMonitoreoUnidades(async (cambio) => {
      if (cambio.tipo === 'cambio-empresa-unidad') {
        console.log(`🚨 Detectado cambio de empresa en UNIDAD ${cambio.unidadId}`)

        const conductor = conductoresConUnidad.find((c) => c.UnidadAsignada === cambio.unidadId)

        if (conductor) {
          await reiniciarUnidadEspecifica(cambio.unidad, conductor)
        } else {
          await detenerUnidadEspecifica(cambio.unidadId)
        }
      }
    })

    // MONITOREAR CAMBIOS EN CONDUCTORES
    iniciarMonitoreoConductores(async (cambio) => {
      // Cambio de empresa del conductor
      if (cambio.tipo === 'cambio-empresa-conductor') {
        console.log(`🚨 Detectado cambio de empresa en CONDUCTOR ${cambio.conductorId}`)

        const conductor = cambio.conductor
        if (conductor.UnidadAsignada) {
          const unidad = unidades.find((u) => u.id === conductor.UnidadAsignada)
          if (unidad) {
            await reiniciarUnidadEspecifica(unidad, conductor)
          }
        }
      }

      // 🆕 CAMBIO DE ASIGNACIÓN DE UNIDAD
      if (cambio.tipo === 'cambio-asignacion-unidad') {
        console.log(`🚗 Detectado cambio de asignación en CONDUCTOR ${cambio.conductorId}`)

        // CASO 1: Se quitó la unidad (unidadNueva = null)
        if (!cambio.unidadNueva && cambio.unidadAnterior) {
          console.log(`🗑️ Removiendo unidad ${cambio.unidadAnterior} del conductor`)
          await detenerUnidadEspecifica(cambio.unidadAnterior)
        }
        // CASO 2: Se asignó una unidad nueva
        else if (cambio.unidadNueva) {
          // Si había una unidad anterior, primero detenerla
          if (cambio.unidadAnterior && cambio.unidadAnterior !== cambio.unidadNueva) {
            console.log(`🗑️ Removiendo unidad anterior ${cambio.unidadAnterior}`)
            await detenerUnidadEspecifica(cambio.unidadAnterior)
          }

          // Buscar la nueva unidad en Firestore
          console.log(`🆕 Asignando nueva unidad ${cambio.unidadNueva}`)

          // Recargar unidades desde Firestore para obtener la más reciente
          const { collection, query, where, getDocs } = await import('firebase/firestore')
          const { db } = await import('src/firebase/firebaseConfig')

          const unidadesRef = collection(db, 'Unidades')
          const q = query(unidadesRef, where('__name__', '==', cambio.unidadNueva))
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            const unidadDoc = snapshot.docs[0]
            const unidadData = { id: unidadDoc.id, ...unidadDoc.data() }

            // Iniciar simulación con la nueva unidad
            await iniciarSimulacionUnidad(cambio.conductor, unidadData)

            console.log(`✅ Unidad ${cambio.unidadNueva} iniciada en el simulador`)
          } else {
            console.error(`❌ No se encontró la unidad ${cambio.unidadNueva} en Firestore`)
          }
        }
      }
    })

    // Iniciar simulación normal
    for (const conductor of conductoresConUnidad) {
      const unidad = unidades.find((u) => u.id === conductor.UnidadAsignada)
      if (unidad) {
        await iniciarSimulacionUnidad(conductor, unidad)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  const detenerSimulacion = async () => {
    // 🆕 DETENER MONITOREO
    detenerMonitoreo()

    intervalos.value.forEach(({ intervalo }) => clearInterval(intervalo))

    for (const { unidadId } of unidadesSimuladas.value) {
      try {
        await remove(dbRef(realtimeDb, `unidades_activas/${unidadId}`))
        console.log(`✅ Unidad ${unidadId} eliminada del simulador`)
      } catch (err) {
        console.error(`Error finalizando ${unidadId}:`, err)
      }
    }

    intervalos.value = []
    unidadesSimuladas.value = []
    simulacionActiva.value = false
  }

  const toggleSimulacion = async (conductores, unidades) => {
    if (simulacionActiva.value) {
      await detenerSimulacion()
    } else {
      await iniciarSimulacion(conductores, unidades)
    }
  }

  return {
    simulacionActiva,
    unidadesSimuladas,
    iniciarSimulacion,
    detenerSimulacion,
    toggleSimulacion,
    // 🆕 EXPORTAR NUEVAS FUNCIONES (por si las necesitas)
    detenerUnidadEspecifica,
    reiniciarUnidadEspecifica,
  }
}
