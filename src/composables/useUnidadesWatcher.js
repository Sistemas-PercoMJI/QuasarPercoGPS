// src/composables/useUnidadesWatcher.js - VERSIÓN COMPLETA
import { db } from 'src/firebase/firebaseConfig'
import { collection, onSnapshot } from 'firebase/firestore'

export function useUnidadesWatcher() {
  let unsubscribeUnidades = null
  let unsubscribeConductores = null
  const unidadesCache = new Map()
  const conductoresCache = new Map()

  /**
   * Iniciar monitoreo de cambios en Unidades
   */
  const iniciarMonitoreoUnidades = (callback) => {
    const unidadesRef = collection(db, 'Unidades')

    unsubscribeUnidades = onSnapshot(unidadesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const unidad = { id: change.doc.id, ...change.doc.data() }

        if (change.type === 'modified') {
          const unidadAnterior = unidadesCache.get(unidad.id)

          if (unidadAnterior && unidadAnterior.IdEmpresaUnidad !== unidad.IdEmpresaUnidad) {
            console.log(
              `🔄 CAMBIO DE EMPRESA EN UNIDAD ${unidad.id}:`,
              `"${unidadAnterior.IdEmpresaUnidad}" → "${unidad.IdEmpresaUnidad}"`,
            )

            callback({
              tipo: 'cambio-empresa-unidad',
              unidadId: unidad.id,
              empresaAnterior: unidadAnterior.IdEmpresaUnidad,
              empresaNueva: unidad.IdEmpresaUnidad,
              unidad: unidad,
            })
          }
        }

        unidadesCache.set(unidad.id, {
          IdEmpresaUnidad: unidad.IdEmpresaUnidad,
          Unidad: unidad.Unidad,
        })
      })
    })

    return unsubscribeUnidades
  }

  /**
   * Iniciar monitoreo de cambios en Conductores
   */
  const iniciarMonitoreoConductores = (callback) => {
    const conductoresRef = collection(db, 'Conductores')

    unsubscribeConductores = onSnapshot(conductoresRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const conductor = { id: change.doc.id, ...change.doc.data() }

        if (change.type === 'modified') {
          const conductorAnterior = conductoresCache.get(conductor.id)

          // 🆕 DETECTAR CAMBIO DE IdEmpresaConductor
          if (
            conductorAnterior &&
            conductorAnterior.IdEmpresaConductor !== conductor.IdEmpresaConductor
          ) {
            console.log(
              `🔄 CAMBIO DE EMPRESA EN CONDUCTOR ${conductor.id}:`,
              `"${conductorAnterior.IdEmpresaConductor}" → "${conductor.IdEmpresaConductor}"`,
            )

            callback({
              tipo: 'cambio-empresa-conductor',
              conductorId: conductor.id,
              empresaAnterior: conductorAnterior.IdEmpresaConductor,
              empresaNueva: conductor.IdEmpresaConductor,
              conductor: conductor,
            })
          }

          // 🆕 DETECTAR CAMBIO DE ASIGNACIÓN DE UNIDAD
          if (conductorAnterior && conductorAnterior.UnidadAsignada !== conductor.UnidadAsignada) {
            console.log(
              `🚗 CAMBIO DE ASIGNACIÓN EN CONDUCTOR ${conductor.id}:`,
              `"${conductorAnterior.UnidadAsignada || 'Sin unidad'}" → "${conductor.UnidadAsignada || 'Sin unidad'}"`,
            )

            callback({
              tipo: 'cambio-asignacion-unidad',
              conductorId: conductor.id,
              unidadAnterior: conductorAnterior.UnidadAsignada,
              unidadNueva: conductor.UnidadAsignada,
              conductor: conductor,
            })
          }
        }

        conductoresCache.set(conductor.id, {
          IdEmpresaConductor: conductor.IdEmpresaConductor,
          Nombre: conductor.Nombre,
          UnidadAsignada: conductor.UnidadAsignada,
        })
      })
    })

    return unsubscribeConductores
  }

  /**
   * Detener monitoreo
   */
  const detenerMonitoreo = () => {
    if (unsubscribeUnidades) {
      unsubscribeUnidades()
      unsubscribeUnidades = null
    }

    if (unsubscribeConductores) {
      unsubscribeConductores()
      unsubscribeConductores = null
    }

    unidadesCache.clear()
    conductoresCache.clear()
  }

  return {
    iniciarMonitoreoUnidades,
    iniciarMonitoreoConductores,
    detenerMonitoreo,
  }
}
