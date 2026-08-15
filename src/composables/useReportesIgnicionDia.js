// composables/useReportesIgnicionDia.js
import { ref } from 'vue'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from 'src/firebase/firebaseConfig'
import { useGeocoding } from './useGeocoding'

export function useReportesIgnicionDia() {
  const loading = ref(false)
  const error = ref(null)

  // ─── helpers de fecha ─────────────────────────────────────────────────────

  const generarRangoFechas = (fechaInicio, fechaFin) => {
    const fechas = []
    const actual = new Date(fechaInicio)
    while (actual <= fechaFin) {
      fechas.push(formatearFecha(actual))
      actual.setDate(actual.getDate() + 1)
    }
    return fechas
  }

  const formatearFecha = (fecha) => {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    const d = String(fecha.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const formatearHora = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Tijuana', // ← agregar esto
    })
  }

  // ─── descarga coordenadas desde Storage ──────────────────────────────────

  const descargarCoordenadasDeStorage = async (rutasUrl) => {
    if (!rutasUrl) return []
    try {
      const response = await fetch(rutasUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      let coords = []
      if (Array.isArray(data)) coords = data
      else if (Array.isArray(data.coordenadas)) coords = data.coordenadas
      else if (Array.isArray(data.ruta)) coords = data.ruta
      else if (Array.isArray(data.puntos)) coords = data.puntos

      return coords
        .filter((c) => {
          const lat = c.lat || c.latitude
          const lng = c.lng || c.longitude || c.lon
          const ts = c.timestamp || c.time || ''
          return lat && lng && !/\.\d{3}Z$/.test(ts)
        })
        .map((c) => ({
          lat: c.lat || c.latitude,
          lng: c.lng || c.longitude || c.lon,
          timestamp: c.timestamp || c.time || null,
          ignicion: c.ignicion ?? null,
          velocidad: c.velocidad || 0,
        }))
    } catch (err) {
      console.error('Error descargando coordenadas:', err)
      return []
    }
  }

  // ─── lógica de extracción ─────────────────────────────────────────────────

  const extraerIgnicionesDia = (coordenadas, fecha) => {
    // Filtrar solo coordenadas del día en cuestión
    const coordenadasDelDia = coordenadas.filter((c) => {
      if (!c.timestamp) return false
      return c.timestamp.startsWith(fecha)
    })

    if (coordenadasDelDia.length === 0) return { primeraIgnicion: null, ultimaIgnicion: null }

    const primeraIgnicion = coordenadasDelDia.find((c) => c.ignicion === true) ?? null

    let ultimaIgnicion = null

    for (let i = 1; i < coordenadasDelDia.length; i++) {
      const anterior = coordenadasDelDia[i - 1]
      const actual = coordenadasDelDia[i]

      if (anterior.ignicion !== true || actual.ignicion !== false) continue

      const siguiente = coordenadasDelDia[i + 1]

      if (!siguiente) {
        ultimaIgnicion = actual
        break
      }

      const gap = new Date(siguiente.timestamp).getTime() - new Date(actual.timestamp).getTime()
      const siguienteIgnicion = siguiente.ignicion === true

      if (!siguienteIgnicion || gap >= 2 * 60 * 1000) {
        ultimaIgnicion = actual
      }
    }

    if (primeraIgnicion && !ultimaIgnicion) {
      ultimaIgnicion = coordenadasDelDia[coordenadasDelDia.length - 1]
    }

    return { primeraIgnicion, ultimaIgnicion }
  }

  // ─── función principal ────────────────────────────────────────────────────

  const obtenerIgnicionesDia = async (unidadesIds, fechaInicio, fechaFin) => {
    loading.value = true
    error.value = null

    const { obtenerDireccion } = useGeocoding()

    try {
      // ── 1. Catálogo de unidades (nombre, placa, conductor) ─────────────────
      const unidadesSnapshot = await getDocs(collection(db, 'Unidades'))
      const catalogoUnidades = {}
      unidadesSnapshot.docs.forEach((d) => {
        catalogoUnidades[d.id] = {
          nombre: d.data().Unidad || d.id,
          placa: d.data().Placa || 'Sin placa',
          conductorNombre: d.data().conductor_nombre || d.data().ConductorNombre || 'Sin conductor',
        }
      })

      const fechas = generarRangoFechas(fechaInicio, fechaFin)
      const resultados = []

      // ── 2. Loop unidad × día ───────────────────────────────────────────────
      for (const unidadId of unidadesIds) {
        const infoUnidad = catalogoUnidades[unidadId] || {
          nombre: unidadId,
          placa: 'Sin placa',
          conductorNombre: 'Sin conductor',
        }

        for (const fecha of fechas) {
          try {
            // ── 2a. Leer RutaDiaria de Firestore ──────────────────────────
            const rutaRef = doc(db, 'Unidades', unidadId, 'RutaDiaria', fecha)
            const rutaSnap = await getDoc(rutaRef)

            if (!rutaSnap.exists()) continue

            const data = rutaSnap.data()

            // ── 2b. Descargar coordenadas desde Storage ───────────────────
            let coordenadas = []
            if (data.rutas_url) {
              coordenadas = await descargarCoordenadasDeStorage(data.rutas_url)
            }

            // Fallback a única coordenada del documento
            if (coordenadas.length === 0 && data.nuevaCoordenada) {
              coordenadas = [
                {
                  lat: data.nuevaCoordenada.lat,
                  lng: data.nuevaCoordenada.lng,
                  timestamp: data.nuevaCoordenada.timestamp,
                  ignicion: data.nuevaCoordenada.ignicion ?? null,
                  velocidad: 0,
                },
              ]
            }

            if (coordenadas.length === 0) continue

            // ── 2c. Extraer primera y última ignición ─────────────────────
            const { primeraIgnicion, ultimaIgnicion } = extraerIgnicionesDia(coordenadas, fecha)

            // Si no hubo ningún encendido ese día, omitir el registro
            if (!primeraIgnicion) continue

            // ── 2d. Geocodificar ambos puntos en paralelo ─────────────────
            const [lugarPrimera, lugarUltima] = await Promise.all([
              obtenerDireccion({
                lat: primeraIgnicion.lat,
                lng: primeraIgnicion.lng,
              }),
              ultimaIgnicion
                ? obtenerDireccion({
                    lat: ultimaIgnicion.lat,
                    lng: ultimaIgnicion.lng,
                  })
                : Promise.resolve('N/A'),
            ])

            // ── 2e. Armar registro ────────────────────────────────────────
            resultados.push({
              // Identificación
              idUnidad: unidadId,
              unidadNombre: infoUnidad.nombre,
              placa: infoUnidad.placa,
              // Conductor: dato del día es más fresco que el catálogo
              conductorNombre: data.conductor_nombre || infoUnidad.conductorNombre,
              fecha,

              // Primera ignición
              primeraIgnicionTimestamp: primeraIgnicion.timestamp
                ? new Date(primeraIgnicion.timestamp)
                : null,
              horasPrimeraIgnicion: formatearHora(primeraIgnicion.timestamp),
              latPrimera: primeraIgnicion.lat,
              lngPrimera: primeraIgnicion.lng,
              lugarPrimeraIgnicion: lugarPrimera,

              // Última ignición
              ultimaIgnicionTimestamp: ultimaIgnicion?.timestamp
                ? new Date(ultimaIgnicion.timestamp)
                : null,
              horasUltimaIgnicion: formatearHora(ultimaIgnicion?.timestamp),
              latUltima: ultimaIgnicion?.lat ?? null,
              lngUltima: ultimaIgnicion?.lng ?? null,
              lugarUltimaIgnicion: lugarUltima,
            })
          } catch (err) {
            console.warn(`Error procesando ${unidadId}/${fecha}:`, err.message)
          }
        }
      }

      return resultados
    } catch (err) {
      console.error('Error en obtenerIgnicionesDia:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    obtenerIgnicionesDia,
  }
}
