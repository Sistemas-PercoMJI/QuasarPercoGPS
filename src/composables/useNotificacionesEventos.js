// src/composables/useNotificacionesEventos.js
import { ref } from 'vue'
import { db } from 'src/firebase/firebaseConfig'
import {
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { useNotifications } from './useNotifications'
import { useMultiTenancy } from './useMultiTenancy'
import { auth } from 'src/firebase/firebaseConfig'

const listeners = [] // Guardar referencias para limpiar
const eventosYaProcesados = new Set() // Evitar duplicados

export function useNotificacionesEventos() {
  const { agregarNotificacion } = useNotifications()
  const { idEmpresaActual } = useMultiTenancy()
  const iniciado = ref(false)

  const obtenerFechaHoy = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tijuana' })
  }
  const obtenerCursorUsuario = async (uid) => {
    try {
      const ref = doc(db, 'Usuarios', uid)
      const snap = await getDoc(ref)
      if (snap.exists() && snap.data().ultimaRevisionNotificaciones) {
        return snap.data().ultimaRevisionNotificaciones.toDate()
      }
    } catch (err) {
      console.warn('No se pudo leer el cursor de notificaciones:', err.message)
    }
    // Si no existe, arrancamos desde hace 3 días (ventana de catch-up inicial)
    const hace3Dias = new Date()
    hace3Dias.setDate(hace3Dias.getDate() - 3)
    return hace3Dias
  }

  const actualizarCursorUsuario = async (uid) => {
    try {
      const ref = doc(db, 'Usuarios', uid)
      await setDoc(ref, { ultimaRevisionNotificaciones: Timestamp.now() }, { merge: true })
    } catch (err) {
      console.warn('No se pudo actualizar el cursor de notificaciones:', err.message)
    }
  }

  const eventoANotificacion = (evento, unidadNombre) => {
    // 🆕 Evento de odómetro: mensaje distinto, sin mapa/ubicación
    if (evento.TipoEvento === 'Odometro') {
      return {
        type: 'info',
        icon: 'speed',
        title: 'Odómetro',
        message: `${unidadNombre} alcanzó ${evento.UmbralAlcanzado?.toLocaleString() || evento.Kilometraje} km`,
        eventoId: evento.id,
        ubicacionNombre: '',
        tipoUbicacion: '',
        accion: 'Odometro',
        ubicacion: null,
      }
    }
    //Evento de corte de energía / voltaje bajo
    if (evento.TipoEvento === 'PowerSupplyBajo') {
      return {
        type: 'negative',
        icon: 'bolt',
        title: 'Corte de energía',
        message: `${unidadNombre} — voltaje bajo detectado (${evento.VoltajeDetectado?.toFixed(1) || '?'}V), posible desconexión`,
        eventoId: evento.id,
        ubicacionNombre: '',
        tipoUbicacion: '',
        accion: 'PowerSupplyBajo',
        ubicacion: null,
      }
    }

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
      ubicacion:
        evento.lat && evento.lng
          ? {
              lat: evento.lat,
              lng: evento.lng,
              nombre: nombreUbicacion,
              tipo: tipoUbicacion,
            }
          : evento.Coordenadas
            ? {
                lat: evento.Coordenadas.lat,
                lng: evento.Coordenadas.lng,
                nombre: nombreUbicacion,
                tipo: tipoUbicacion,
              }
            : null,
    }
  }

  const cargarEventosPerdidos = async (
    unidadesIdsDelUsuario,
    unidadesNombresPorId,
    cursorFecha,
    currentUserId,
  ) => {
    try {
      const cursorTimestamp = Timestamp.fromDate(cursorFecha)

      // collectionGroup: busca en TODAS las subcolecciones EventoDiario,
      // sin importar bajo qué unidad/fecha estén — así cubre días anteriores también
      const qPerdidos = query(
        collectionGroup(db, 'EventoDiario'),
        where('Timestamp', '>', cursorTimestamp),
        orderBy('Timestamp', 'asc'),
      )

      const snapshot = await getDocs(qPerdidos)
      if (snapshot.empty) return

      snapshot.forEach((docSnap) => {
        const evento = { id: docSnap.id, ...docSnap.data() }

        // Solo eventos de unidades que le pertenecen a este usuario/empresa
        if (!unidadesIdsDelUsuario.includes(evento.idUnidad)) return

        // Mismo filtro de userId que ya usas en tiempo real
        if (evento.userId && evento.userId !== currentUserId) return

        // Evitar duplicados si el listener en tiempo real ya lo agregó
        if (eventosYaProcesados.has(evento.id)) return
        eventosYaProcesados.add(evento.id)

        const unidadNombre = unidadesNombresPorId[evento.idUnidad] || `Unidad ${evento.idUnidad}`
        const notifData = eventoANotificacion(evento, unidadNombre)
        notifData.timestamp = evento.Timestamp?.toDate?.()?.getTime?.() || Date.now()
        // No se marca como leída: el usuario aún no la ha visto, aunque haya pasado tiempo
        agregarNotificacion(notifData)
      })
    } catch (err) {
      console.error('Error cargando eventos perdidos:', err)
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
    const currentUserId = auth.currentUser?.uid
    if (!currentUserId) return

    // 🆕 CATCH-UP: cargar eventos que pasaron mientras la app estaba cerrada
    const unidadesIdsDelUsuario = unidadesSnap.docs.map((d) => d.id)
    const unidadesNombresPorId = {}
    unidadesSnap.docs.forEach((d) => {
      unidadesNombresPorId[d.id] = d.data().Unidad || `Unidad ${d.id}`
    })

    const cursorFecha = await obtenerCursorUsuario(currentUserId)
    await cargarEventosPerdidos(
      unidadesIdsDelUsuario,
      unidadesNombresPorId,
      cursorFecha,
      currentUserId,
    )
    await actualizarCursorUsuario(currentUserId)

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
              if (evento.userId && evento.userId !== currentUserId) return
              // Evitar duplicados
              if (eventosYaProcesados.has(evento.id)) return
              eventosYaProcesados.add(evento.id)

              // Es nuevo si el timestamp es de los últimos 30 segundos
              const ahora = Date.now()
              const tsEvento = evento.Timestamp?.toDate?.()?.getTime?.() || 0
              const esNuevo = ahora - tsEvento < 30 * 1000

              const notifData = eventoANotificacion(evento, unidadNombre)
              notifData.timestamp = evento.Timestamp?.toDate?.()?.getTime?.() || Date.now() // 🆕

              // Solo marcar como leído si es histórico
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
