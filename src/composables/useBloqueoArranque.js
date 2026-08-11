// src/composables/useBloqueoArranque.js
import { reactive } from 'vue'
import { db, auth } from 'src/firebase/firebaseConfig'
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'

//  Ajusta esto a tu URL real del forwarder (idealmente en .env)
const FORWARDER_URL = import.meta.env.VITE_FORWARDER_URL

// ── Estado global a nivel de módulo (mismo patrón que unidadesValidasGlobal) ──
const configUnidadesGlobal = reactive(new Map()) // unidadId -> { relayInstalado, bloqueado, doutBloqueo }
const cargandoAccionGlobal = reactive(new Set()) // unidadIds con comando en curso
let unsubscribeConfig = null

// NOTA: por ahora no hay sistema de roles en /Usuarios — se decidió (2026-08-10)
// mostrar el control a cualquier usuario logueado. Cuando exista un campo de rol
// real, aquí es donde se agrega el filtro.

export function useBloqueoArranque() {
  /**
   * Escucha la colección Unidades y cachea relayInstalado/bloqueado por unidad.
   * Llamar UNA vez (ej. onMounted de IndexPage.vue).
   */
  const iniciarListenerConfig = () => {
    if (unsubscribeConfig) return
    const unidadesRef = collection(db, 'Unidades')
    unsubscribeConfig = onSnapshot(unidadesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          configUnidadesGlobal.delete(change.doc.id)
          return
        }
        const data = change.doc.data()
        configUnidadesGlobal.set(change.doc.id, {
          relayInstalado: data.relayInstalado === true,
          bloqueado: data.arranqueBloqueado === true, //  ajustar nombre de campo si es distinto
          doutBloqueo: data.doutBloqueo ?? null,
        })
      })
    })
  }

  const detenerListenerConfig = () => {
    if (unsubscribeConfig) {
      unsubscribeConfig()
      unsubscribeConfig = null
    }
    configUnidadesGlobal.clear()
  }

  /** Lectura síncrona de la config cacheada (usada desde el popup del mapa) */
  const obtenerConfigBloqueo = (unidadId) => {
    return configUnidadesGlobal.get(unidadId) || { relayInstalado: false, bloqueado: false }
  }

  const estaCargando = (unidadId) => cargandoAccionGlobal.has(unidadId)

  const puedeControlarBloqueo = () => {
    // Sin sistema de roles todavía: cualquier usuario con sesión activa puede verlo/usarlo.
    return !!auth.currentUser
  }

  /**
   * Envía el comando de bloqueo/desbloqueo al forwarder.
   * @param {string} unidadId
   * @param {'bloquear'|'desbloquear'} accion
   */
  const toggleBloqueoArranque = async (unidadId, accion) => {
    if (cargandoAccionGlobal.has(unidadId)) {
      return { ok: false, error: 'Ya hay una acción en curso para esta unidad' }
    }

    cargandoAccionGlobal.add(unidadId)
    try {
      const token = await auth.currentUser?.getIdToken()
      const endpoint = accion === 'bloquear' ? 'bloquear-arranque' : 'desbloquear-arranque'

      const resp = await fetch(`${FORWARDER_URL}/unidades/${unidadId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}))
        throw new Error(errBody.message || `Error ${resp.status}`)
      }

      const data = await resp.json()

      // Actualización optimista local — el listener de Firestore la confirmará después
      const configActual = configUnidadesGlobal.get(unidadId) || {}
      configUnidadesGlobal.set(unidadId, {
        ...configActual,
        bloqueado: accion === 'bloquear',
      })

      return { ok: true, data }
    } catch (error) {
      console.error('Error al enviar comando de bloqueo:', error)
      return { ok: false, error: error.message }
    } finally {
      cargandoAccionGlobal.delete(unidadId)
    }
  }

  /**
   * Historial de comandos para una unidad (vista de auditoría).
   * Devuelve la función unsubscribe — llámala al cerrar el modal de historial.
   */
  const obtenerHistorialComandos = (unidadId, callback, cantidad = 20) => {
    const q = query(
      collection(db, 'ComandosRemotos'),
      where('unidadId', '==', unidadId),
      orderBy('timestamp', 'desc'),
      limit(cantidad),
    )
    return onSnapshot(q, (snapshot) => {
      const comandos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      callback(comandos)
    })
  }

  return {
    iniciarListenerConfig,
    detenerListenerConfig,
    obtenerConfigBloqueo,
    estaCargando,
    puedeControlarBloqueo,
    toggleBloqueoArranque,
    obtenerHistorialComandos,
  }
}
