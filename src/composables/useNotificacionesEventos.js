// src/composables/useNotificacionesEventos.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore'
import { useNotifications } from './useNotifications'
import { useMultiTenancy } from './useMultiTenancy'

const listeners = [] // Guardar referencias para limpiar
const eventosYaProcesados = new Set() // Evitar duplicados

export function useNotificacionesEventos() {
  const { agregarNotificacion } = useNotifications()
  const { idEmpresaActual } = useMultiTenancy()
  const iniciado = ref(false)

  const obtenerFechaHoy = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
  }

  const eventoANotificacion = (evento, unidadNombre, esNuevo = false) => {
    const esEntrada = evento.TipoEvento === 'Entrada'
    const nombreUbicacion = evento.PoiNombre || evento.GeozonaNombre || 'Ubicación'
    const tipoUbicacion = evento.tipoUbicacion || 'POI'

    return {
      type: esEntrada ? 'positive' : 'warning',
      title: nombreUbicacion,
      message: `${unidadNombre} ${esEntrada ? 'entró a' : 'salió de'} ${tipoUbicacion === 'POI' ? 'POI' : 'Geozona'}: ${nombreUbicacion}`,
      eventoId: evento.id,
      ubicacionNombre: nombreUbicacion,
      tipoUbicacion,
      accion: esEntrada ? 'Entrada' : 'Salida',
      // Solo generar mapa si es nuevo
      ubicacion:
        esNuevo && evento.Coordenadas
          ? {
              lat: evento.Coordenadas.lat,
              lng: evento.Coordenadas.lng,
              nombre: nombreUbicacion,
              tipo: tipoUbicacion,
            }
          : null,
    }
  }

  const iniciarEscucha = async () => {
    if (iniciado.value) return
    iniciado.value = true

    // Esperar a que la empresa esté cargada
    const esperarEmpresa = () =>
      new Promise((resolve) => {
        if (idEmpresaActual.value) return resolve()
        const interval = setInterval(() => {
          if (idEmpresaActual.value) {
            clearInterval(interval)
            resolve()
          }
        }, 500)
        // Timeout de 5 segundos
        setTimeout(() => {
          clearInterval(interval)
          resolve()
        }, 5000)
      })

    await esperarEmpresa()

    if (!idEmpresaActual.value) {
      console.warn('No hay empresa asignada para escuchar notificaciones')
      return
    }

    // Obtener unidades de la empresa
    const unidadesRef = collection(db, 'Unidades')
    const idEmpresa = idEmpresaActual.value

    let qUnidades
    if (Array.isArray(idEmpresa)) {
      qUnidades = query(unidadesRef, where('IdEmpresaUnidad', 'in', idEmpresa.slice(0, 10)))
    } else {
      qUnidades = query(unidadesRef, where('IdEmpresaUnidad', '==', idEmpresa))
    }

    const unidadesSnap = await getDocs(qUnidades)
    if (unidadesSnap.empty) return

    const fechaHoy = obtenerFechaHoy()

    // Por cada unidad, escuchar EventoDiario del día actual
    unidadesSnap.forEach((unidadDoc) => {
      const unidad = { id: unidadDoc.id, ...unidadDoc.data() }
      const unidadNombre = unidad.Unidad || `Unidad ${unidad.id}`

      const eventosRef = collection(
        db,
        'Unidades',
        unidad.id,
        'RutaDiaria',
        fechaHoy,
        'EventoDiario',
      )

      const qEventos = query(eventosRef, orderBy('Timestamp', 'asc'))

      // onSnapshot escucha en tiempo real
      const unsub = onSnapshot(
        qEventos,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const evento = { id: change.doc.id, ...change.doc.data() }

              // Evitar duplicados
              if (eventosYaProcesados.has(evento.id)) return
              eventosYaProcesados.add(evento.id)

              // Es nuevo si el timestamp es de los últimos 30 segundos
              const ahora = Date.now()
              const tsEvento = evento.Timestamp?.toDate?.()?.getTime?.() || 0
              const esNuevo = ahora - tsEvento < 30 * 1000

              const notifData = eventoANotificacion(evento, unidadNombre, esNuevo)
              if (!esNuevo) {
                notifData.yaLeida = true
              }

              agregarNotificacion(notifData)
            }
          })
        },
        (error) => {
          console.error(`Error escuchando eventos de unidad ${unidad.id}:`, error)
        },
      )

      listeners.push(unsub)
    })
  }

  const detenerEscucha = () => {
    listeners.forEach((unsub) => unsub())
    listeners.length = 0
    eventosYaProcesados.clear()
    iniciado.value = false
  }

  return {
    iniciarEscucha,
    detenerEscucha,
  }
}
