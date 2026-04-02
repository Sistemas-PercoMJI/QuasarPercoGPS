// useTutorial.js - VERSIÓN CON LIMPIEZA AGRESIVA
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial(
  router,
  {
    abrirEstadoFlota,
    cerrarEstadoFlota,
    abrirConductores,
    cerrarConductores,
    abrirGeozonas,
    cerrarGeozonas,
    abrirEventos,
    cerrarEventos,
  } = {},
) {
  // eslint-disable-next-line no-unused-vars
  let pasoAnterior = -1
  let destroyOriginal = null
  let navegacionProgramada = null
  let yaNavegamosAReportes = false
  let isTransitioning = false
  let keyPressHandler = null
  let confirmHandler = null
  let yaCambioAHistorial = false
  let onNextOverrideFase = null

  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Entendido! ✓',
    closeBtnText: 'Salir',
    progressText: '{{current}} de {{total}}',
    popoverClass: 'driverjs-theme-custom',
    animate: true,
    smoothScroll: false,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 5,
    stageRadius: 12,
    disableActiveInteraction: false,

    scrollIntoViewOptions: {
      behavior: 'auto',
      block: 'nearest', //  ESTO CENTRA EL ELEMENTO
      inline: 'nearest',
    },

    onPrevClick: () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      //  NUEVO: SI ESTAMOS EN DASHBOARD PASO 10 Y RETROCEDEMOS, IR A REPORTES
      if (pasoActual === 10 && totalPasos === 16 && yaNavegamosAReportes) {
        // Guardar flag para que iniciarTutorialReportes sepa que viene de "Anterior"
        //  localStorage.setItem('mj_tutorial_step', 'reportes-anterior'
        // Limpiar listeners
        limpiarListeners()
        // Limpiar DOM antes de destruir
        try {
          if (document.body) {
            document.body.classList.remove('driver-active', 'driver-fade')
            document.body.style.overflow = ''
          }
          if (document.documentElement) {
            document.documentElement.classList.remove('driver-active', 'driver-fade')
            document.documentElement.style.overflow = ''
          }
        } catch (e) {
          console.warn(' Error limpiando estilos:', e)
        }

        // Eliminar elementos del DOM
        try {
          const driverPopovers = document.querySelectorAll(
            '.driver-popover, .driver-overlay, .driver-highlighted-element, .driver-popover-item, .driver-popover-title, .driver-popover-description',
          )
          driverPopovers.forEach((el) => {
            try {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el)
              }
            } catch (e) {
              console.warn(' Error eliminando elemento:', e)
            }
          })
        } catch (e) {
          console.warn('Error limpiando DOM:', e)
        }

        // Destruir driver
        if (destroyOriginal) {
          try {
            destroyOriginal()
          } catch (e) {
            console.warn('Error destruyendo driver:', e)
          }
        }

        //  NAVEGAR Y LUEGO EJECUTAR EL TUTORIAL
        router
          .push('/reporte')
          .then(() => {
            // Esperar a que la página se renderice
            setTimeout(() => {
              iniciarTutorialReportes(true) //  LLAMAR DIRECTAMENTE LA FUNCIÓN
            }, 400)
          })
          .catch((err) => {
            console.error(' Error en navegación:', err)
          })

        return
      }

      //  SI ESTAMOS EN EL PASO 8 DE REPORTES (PRIMER PASO DE HISTORIAL) Y RETROCEDEMOS
      if (totalPasos === 13 && pasoActual === 8) {
        // Resetear el flag para permitir cambios futuros
        yaCambioAHistorial = false

        // Buscar y hacer click en el tab de Crear Reporte
        const tabCrear = document.querySelector('.q-tab[aria-controls="crear"]')

        if (tabCrear) {
          tabCrear.click()
          // Esperar a que se renderice el tab
          setTimeout(() => {
            driverObj.movePrevious()

            setTimeout(() => {
              if (driverObj.isActive()) {
                driverObj.refresh()
              }
            }, 200)
          }, 600)
        } else {
          // Intento alternativo: buscar por texto
          const tabs = document.querySelectorAll('.q-tab')

          tabs.forEach((tab) => {
            if (tab.textContent.includes('Crear') || tab.textContent.includes('CREAR')) {
              tab.click()

              setTimeout(() => {
                driverObj.movePrevious()

                setTimeout(() => {
                  if (driverObj.isActive()) {
                    driverObj.refresh()
                  }
                }, 200)
              }, 600)
            }
          })
        }

        // Importante: retornar para evitar el retroceso automático
        return
      }
      // Para cualquier otro caso, permitir el retroceso normal
      driverObj.movePrevious()
    },
    onNextClick: async () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      if (onNextOverrideFase) {
        const handled = await onNextOverrideFase(pasoActual)
        if (handled) return
      }
      // ── ESTADO DE FLOTA (paso 5) ──
      if (pasoActual === 5 && totalPasos === 16) {
        const fasesEstadoFlota = [
          {
            selectorEspera: '.compact-grid',
            pasos: pasosEstadoFlota,
            onFaseTerminada: async () => {
              await esperarElemento('.btn-detalles')
              await new Promise((r) => setTimeout(r, 200))
              const btnDetalle = document.querySelector('.btn-detalles')
              if (btnDetalle) btnDetalle.click()
              await esperarElemento('.vista-detalles')
              await new Promise((r) => setTimeout(r, 800))
              await esperarElemento('.tabs-vehiculo')
              await new Promise((r) => setTimeout(r, 300))
            },
          },
          {
            selectorEspera: '.tabs-vehiculo',
            pasos: pasosDetalleVehiculo,
            onNextOverride: async (pasoActual) => {
              // Al terminar resumen (paso 2) → click tab Hoy
              if (pasoActual === 2) {
                const tabHoy = document.querySelectorAll('.tabs-vehiculo .q-tab')[1]
                if (tabHoy) tabHoy.click()

                await esperarElemento('.resumen-dia-card', 5000)
                await new Promise((r) => setTimeout(r, 600))
                driverObj.moveNext()
                return true
              }

              // Justo antes del timeline (paso 5) → ajustar selector según lo que exista
              if (pasoActual === 5) {
                const tieneTimeline = document.querySelector('.timeline-section-compact')

                // Modificar directamente sin setSteps
                const pasos = driverObj.getConfig().steps
                pasos[6].element = tieneTimeline ? '.timeline-section-compact' : '.empty-state'
                if (!tieneTimeline) {
                  pasos[6].popover.description =
                    'Aquí aparecerán los trayectos del día cuando el vehículo haya realizado viajes. Haz clic en cualquiera para verlo en el mapa.'
                }

                driverObj.moveNext()
                return true
              }

              // Al terminar timeline (paso 6) → click tab Notificaciones
              if (pasoActual === 6) {
                const tabNotif = document.querySelectorAll('.tabs-vehiculo .q-tab')[2]
                if (tabNotif) tabNotif.click()

                await esperarElemento('.filtro-dia-eventos', 5000)
                await new Promise((r) => setTimeout(r, 600))
                const scrollArea = document.querySelector('.tab-content-scroll .scroll')
                if (scrollArea) scrollArea.scrollTop = 0
                driverObj.moveNext()
                return true
              }
              if (pasoActual === 8) {
                const tieneEventos = document.querySelector('.eventos-container')

                const pasos = driverObj.getConfig().steps
                pasos[9].element = tieneEventos ? '.eventos-container' : '.empty-state'
                if (!tieneEventos) {
                  pasos[9].popover.description =
                    'Aquí aparecerán los eventos del día cuando el vehículo haya registrado entradas o salidas de geozonas.'
                }

                driverObj.moveNext()
                return true
              }

              return false
            },
          },
        ]

        ejecutarTutorialConFases(abrirEstadoFlota, cerrarEstadoFlota, fasesEstadoFlota, 6)
        return
      }

      // ── CONDUCTORES (paso 6) ──
      if (pasoActual === 6 && totalPasos === 16) {
        ejecutarTutorialComponente(
          abrirConductores,
          cerrarConductores,
          pasosConductores,
          '.conductores-drawer',
          7,
        )
        return
      }

      // ── GEOZONAS (paso 7) ──
      if (pasoActual === 7 && totalPasos === 16) {
        ejecutarTutorialComponente(
          abrirGeozonas,
          cerrarGeozonas,
          pasosGeozonas,
          '.geozonas-drawer',
          8,
        )
        return
      }

      // ── EVENTOS (paso 8) ──
      if (pasoActual === 8 && totalPasos === 16) {
        ejecutarTutorialComponente(
          abrirEventos,
          cerrarEventos,
          pasosEventos,
          '.eventos-drawer-compact',
          9,
        )
        return
      }
      //  NAVEGACIÓN A REPORTES CON LIMPIEZA FORZADA
      if (pasoActual === 9 && totalPasos === 16 && !yaNavegamosAReportes) {
        yaNavegamosAReportes = true
        localStorage.setItem('mj_tutorial_step', 'reportes')

        //  PASO 1: LIMPIAR LISTENERS
        limpiarListeners()

        //  PASO 2: LIMPIAR CLASES Y ESTILOS PRIMERO (antes de destruir)
        try {
          if (document.body) {
            document.body.classList.remove('driver-active', 'driver-fade')
            document.body.style.overflow = ''
          }
          if (document.documentElement) {
            document.documentElement.classList.remove('driver-active', 'driver-fade')
            document.documentElement.style.overflow = ''
          }
        } catch (e) {
          console.warn('Error limpiando estilos:', e)
        }

        //  PASO 3: FORZAR ELIMINACIÓN DEL DOM (antes de destruir)
        try {
          const driverPopovers = document.querySelectorAll(
            '.driver-popover, .driver-overlay, .driver-highlighted-element, .driver-popover-item, .driver-popover-title, .driver-popover-description',
          )
          driverPopovers.forEach((el) => {
            try {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el)
              }
            } catch (e) {
              console.warn('Error eliminando elemento:', e)
            }
          })
        } catch (e) {
          console.warn('Error limpiando DOM:', e)
        }

        //  PASO 4: AHORA SÍ DESTRUIR EL DRIVER
        if (destroyOriginal) {
          try {
            destroyOriginal()
          } catch (e) {
            console.warn('Error destruyendo driver:', e)
          }
        }

        //  PASO 5: ESPERAR Y NAVEGAR
        setTimeout(() => {
          router.push('/reporte')
        }, 250) // Aumentado a 250ms

        return
      }

      // Cambio de tab en reportes
      if (totalPasos === 13 && pasoActual === 7 && !yaCambioAHistorial) {
        yaCambioAHistorial = true

        const tabHistorial = document.querySelector('.q-tab[aria-controls="historial"]')

        if (tabHistorial) {
          tabHistorial.click()

          setTimeout(() => {
            driverObj.moveNext()

            setTimeout(() => {
              if (driverObj.isActive()) {
                driverObj.refresh()
              }
            }, 200)
          }, 600)
        } else {
          const tabs = document.querySelectorAll('.q-tab')

          tabs.forEach((tab) => {
            if (tab.textContent.includes('Historial')) {
              tab.click()

              setTimeout(() => {
                driverObj.moveNext()

                setTimeout(() => {
                  if (driverObj.isActive()) {
                    driverObj.refresh()
                  }
                }, 200)
              }, 600)
            }
          })
        }

        return
      }

      driverObj.moveNext()
    },
    onDestroyStarted: () => {
      if (navegacionProgramada) {
        const accion = navegacionProgramada
        navegacionProgramada = null

        localStorage.removeItem('mj_tutorial_step')

        //  LIMPIAR LISTENERS ANTES DE DESTRUIR
        limpiarListeners()

        driverObj.destroy()

        setTimeout(() => {
          accion()
        }, 100)

        return
      }

      if (!driverObj.hasNextStep() || confirm('¿Seguro que quieres salir del tutorial?')) {
        localStorage.removeItem('mj_tutorial_step')
        navegacionProgramada = null
        yaNavegamosAReportes = false
        isTransitioning = false

        //  LIMPIAR LISTENERS ANTES DE DESTRUIR
        limpiarListeners()

        driverObj.destroy()
      }
    },

    onHighlighted: () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      if (totalPasos === 13 && pasoActual === 12) {
        navegacionProgramada = () => {
          router.push('/dashboard').then(() => {
            setTimeout(() => {
              pasoAnterior = 9 //  AQUÍ SE USA pasoAnterior
              navegacionProgramada = null
              yaNavegamosAReportes = true
              yaCambioAHistorial = false
              isTransitioning = false
              driverObj.setSteps(pasosDashboard)
              driverObj.drive(10)
              configurarListeners()
            }, 500)
          })
        }
      } else {
        if (navegacionProgramada && pasoActual !== 11) {
          navegacionProgramada = null
        }
      }

      pasoAnterior = pasoActual //  Y AQUÍ TAMBIÉN
    },

    onPopoverRender: (popover) => {
      if (popover.wrapper) {
        popover.wrapper.setAttribute('tabindex', '-1')
        setTimeout(() => {
          popover.wrapper.focus()
        }, 100)
      }
    },
  })

  const pasosDashboard = [
    {
      element: '#map-page',
      popover: {
        title: '¡Bienvenido a MJ GPS!',
        description: 'Este es tu panel principal de rastreo de flotas.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '.search-input',
      popover: {
        title: 'Buscador Inteligente',
        description: 'Busca direcciones, vehículos, conductores, POIs y geozonas.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#filtros-panel',
      popover: {
        title: 'Filtro para buscador',
        description: 'Filtro de búsquedas para geozonas, POIs, vehículos y conductores.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.drawer-custom',
      popover: {
        title: 'Menú de Navegación',
        description: 'Este menú lateral contiene todas las funciones del sistema.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav--dashboard',
      popover: {
        title: 'Vista del Mapa',
        description: 'Vuelve a la vista principal del mapa.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav-open-estado-flota',
      popover: {
        title: 'Estado de la Flota',
        description: 'Monitorea en tiempo real el estado de todos tus vehículos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav-open-conductores',
      popover: {
        title: 'Gestión de Conductores',
        description: 'Administra tu base de datos de conductores.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav-open-geozonas',
      popover: {
        title: 'Geozonas y POIs',
        description: 'Crea y gestiona POIs y Geozonas.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav-open-eventos',
      popover: {
        title: 'Sistema de Eventos',
        description: 'Configura alertas personalizadas.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#nav--reporte',
      popover: {
        title: 'Reportes',
        description:
          'Genera reportes detallados. Al hacer clic en "Siguiente" iremos a la sección de reportes.',
        side: 'right',
        align: 'start',
      },
    }, //AQUI ES DONDE SE PONE CAPAS Y DESPUES MANDA A REPORTES
    {
      element: '.layers-menu-btn',
      popover: {
        title: 'Control de Capas',
        description: 'Cambia entre vista satélite y calles.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '.recenter-btn',
      popover: {
        title: 'Centrar Mapa',
        description: 'Centra el mapa en tu ubicación.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '.info-btn',
      popover: {
        title: 'Información',
        description: 'Versión del sistema e información.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '.notif-btn',
      popover: {
        title: 'Notificaciones',
        description: 'Alertas en tiempo real.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#nav-logout',
      popover: {
        title: 'Cerrar sesión',
        description: 'Cierra la sesión actual y regresa al inicio de sesión.',
        side: 'center',
        align: 'center',
      },
    },
    {
      popover: {
        title: '¡Tutorial Completado!',
        description: 'Ya conoces las funciones principales de MJ GPS.',
        side: 'center',
        align: 'center',
      },
    },
  ]

  const pasosReportes = [
    //  PASO 0: TABS
    {
      element: '#tabs-reportes',
      popover: {
        title: 'Secciones de Reportes',
        description:
          'Aquí puedes crear nuevos reportes o ver tu historial de reportes generados anteriormente.',
        side: 'bottom',
        align: 'start',
      },
    },
    //  PASO 1: TIPO DE INFORME
    {
      element: '#tipo-informe-card',
      popover: {
        title: 'Tipo de informe',
        description: 'Elige qué tipo de reporte: Eventos, Trayectos o Horas de Trabajo.',
        side: 'bottom',
        align: 'start',
      },
    },
    //  PASO 2: REPORTAR POR
    {
      element: '#q-select-reportar',
      popover: {
        title: 'Selección de Elementos',
        description: 'Elige las unidades, conductores o grupos para tu reporte.',
        side: 'bottom',
        align: 'start',
      },
    },
    //  PASO 3: RANGO DE FECHAS
    {
      element: '#contenedor-rango-fecha',
      popover: {
        title: 'Rango de Fechas',
        description: 'Define el período del reporte. Haz clic en el icono del calendario.',
        side: 'bottom',
        align: 'start',
      },
    },
    //  PASO 4: COLUMNAS
    {
      element: '#card-columnas-personalizacion',
      popover: {
        title: 'Personalización de Columnas',
        description:
          'Selecciona qué columnas quieres ver en tu reporte. Puedes agregar o quitar columnas haciendo clic en la X. Tus preferencias se guardarán automáticamente para la próxima vez.',
        side: 'left',
        align: 'start',
      },
    },
    //  PASO 5: BOTONES DE GENERAR
    {
      element: '.btn-pdf',
      popover: {
        title: 'Generar Reportes en PDF',
        description: 'Genera tu reporte en PDF con las columnas seleccionadas.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '.btn-excel',
      popover: {
        title: 'Generar Reportes en Excel',
        description:
          'Genera tu reporte en Excel con las columnas seleccionadas, al darle a Siguiente iremos al tab de Historial.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#btn-cancelar',
      popover: {
        title: 'Cancelar Reporte',
        description: 'Se reinician los datos del formulario para crear un nuevo reporte.',
        side: 'top',
        align: 'center',
      },
    },
    //  PASO 6: TABLA DE HISTORIAL
    {
      element: '#tabla-historial',
      popover: {
        title: 'Historial de Reportes',
        description:
          'Aquí se mostrarán todos los reportes que hayas generado, tanto en PDF como en Excel. Podrás descargarlos o verlos en vista previa en cualquier momento.',
        side: 'top',
        align: 'center',
      },
    },
    //  PASO 7: BOTONES DE ACCIONES
    {
      element: '#btn-accion-descargar',
      popover: {
        title: 'Descargar',
        description: 'Usa el botón de descarga para guardar el reporte en tu dispositivo',
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '#btn-accion-vista',
      popover: {
        title: 'Vista Previa',
        description:
          'Usa el botón de vista previa para ver el contenido del reporte sin descargarlo.',
        side: 'left',
        align: 'center',
      },
    },
    //  PASO 8: PAGINACIÓN
    {
      element: '.q-table__bottom',
      popover: {
        title: 'Navegación de Historial',
        description:
          'Aquí puedes ver cuántos reportes tienes, navegar entre páginas y cambiar cuántos elementos se muestran por página.',
        side: 'top',
        align: 'center',
      },
    },
    //  PASO 9: FINAL
    {
      popover: {
        title: '¡Tutorial de Reportes Completado!',
        description:
          'Ya conoces cómo crear reportes personalizados y gestionar tu historial. Al hacer clic en "¡Entendido! ✓" regresaremos al dashboard.',
        side: 'center',
        align: 'center',
      },
    },
  ]

  //  NUEVA FUNCIÓN: LIMPIAR LISTENERS
  function limpiarListeners() {
    if (keyPressHandler) {
      document.removeEventListener('keydown', keyPressHandler, true)
      keyPressHandler = null
    }

    if (confirmHandler) {
      window.confirm = confirmHandler
      confirmHandler = null
    }
  }

  //  MODIFICAR LA FUNCIÓN iniciarTutorial()
  function iniciarTutorial() {
    pasoAnterior = -1
    navegacionProgramada = null
    yaNavegamosAReportes = false
    yaCambioAHistorial = false
    isTransitioning = false
    localStorage.removeItem('mj_tutorial_step')

    limpiarListeners()

    if (driverObj.isActivated) {
      if (destroyOriginal) {
        destroyOriginal()
      }
    }

    //  VERIFICAR SI ESTAMOS EN EL DASHBOARD
    const rutaActual = router.currentRoute.value.path

    if (rutaActual !== '/dashboard') {
      //  SI NO ESTAMOS EN DASHBOARD, NAVEGAR PRIMERO
      router.push('/dashboard').then(() => {
        //  ESPERAR A QUE EL DASHBOARD CARGUE COMPLETAMENTE
        setTimeout(() => {
          driverObj.setSteps(pasosDashboard)
          driverObj.drive()
          configurarListeners()
        }, 500) // 500ms para asegurar que todo esté renderizado
      })
    } else {
      //  SI YA ESTAMOS EN DASHBOARD, INICIAR DIRECTAMENTE
      setTimeout(() => {
        driverObj.setSteps(pasosDashboard)
        driverObj.drive()
        configurarListeners()
      }, 300)
    }
  }
  async function ejecutarTutorialConFases(abrirFn, cerrarFn, fases, stepDashboardContinuar) {
    const destroyActual = driverObj.destroy.bind(driverObj)
    try {
      destroyActual()
    } catch (e) {
      console.log('No se pudo destruir driver actual (probablemente no estaba activo):', e)
    }

    abrirFn()

    const ejecutarFase = async (indiceFase) => {
      const fase = fases[indiceFase]
      const esUltimaFase = indiceFase === fases.length - 1

      // Esperar elemento de la fase
      const elemento = await esperarElemento(fase.selectorEspera)
      if (!elemento) {
        console.warn(
          `[Tutorial] Elemento "${fase.selectorEspera}" no encontrado, saltando fase ${indiceFase}`,
        )
        if (esUltimaFase) {
          cerrarFn()
          setTimeout(() => {
            driverObj.setSteps(pasosDashboard)
            driverObj.drive(stepDashboardContinuar)
            configurarListeners()
          }, 300)
        } else {
          await ejecutarFase(indiceFase + 1)
        }
        return
      }

      await new Promise((r) => setTimeout(r, 400))

      const pasosAjustados = fase.pasos.map((paso, index) => {
        if (index === 6) {
          const tieneTimeline = document.querySelector('.timeline-section-compact')
          return {
            ...paso,
            element: tieneTimeline ? '.timeline-section-compact' : '.empty-state',
            popover: {
              ...paso.popover,
              description: tieneTimeline
                ? paso.popover.description
                : 'Aquí aparecerán los trayectos del día cuando el vehículo haya realizado viajes. Haz clic en cualquiera para verlo en el mapa.',
            },
          }
        }
        return paso
      })
      driverObj.setSteps(pasosAjustados)
      driverObj.drive()
      onNextOverrideFase = fase.onNextOverride || null
      setTimeout(() => {
        if (driverObj.isActive()) driverObj.refresh()
      }, 200)
      configurarListeners()

      // Sobrescribir destroy para interceptar el fin de la fase
      const destroyFase = driverObj.destroy.bind(driverObj)
      driverObj.destroy = async () => {
        limpiarListeners()
        onNextOverrideFase = null
        destroyFase()

        if (esUltimaFase) {
          // Fin del tutorial del componente → cerrar y continuar dashboard
          cerrarFn()
          setTimeout(() => {
            driverObj.setSteps(pasosDashboard)
            driverObj.drive(stepDashboardContinuar)
            configurarListeners()
          }, 400)
        } else {
          // Hay más fases → ejecutar transición y siguiente fase
          if (fase.onFaseTerminada) {
            await fase.onFaseTerminada()
          }
          await ejecutarFase(indiceFase + 1)
        }
      }
    }

    await ejecutarFase(0)
  }
  function iniciarTutorialReportes(forzarAnterior = false) {
    const step = localStorage.getItem('mj_tutorial_step')
    if (step === 'reportes' || step === 'reportes-anterior' || forzarAnterior) {
      const vieneDeAnterior = step === 'reportes-anterior' || forzarAnterior
      pasoAnterior = -1
      navegacionProgramada = null
      yaCambioAHistorial = false
      isTransitioning = false

      localStorage.removeItem('mj_tutorial_step')

      limpiarListeners()

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })

        //FORZAR SCROLL AL PRIMER ELEMENTO DEL TUTORIAL
        setTimeout(() => {
          const primerElemento = document.querySelector('#tabs-reportes')
          if (primerElemento) {
            primerElemento.scrollIntoView({
              behavior: 'instant',
              block: 'center',
            })
          } else {
            console.warn(' Primer elemento #tabs-reportes NO encontrado')
          }

          //  ESPERAR UN POCO MÁS ANTES DE INICIAR
          setTimeout(() => {
            driverObj.setSteps(pasosReportes)

            //  SI VIENE DE "ANTERIOR", INICIAR EN EL ÚLTIMO PASO (12)
            if (vieneDeAnterior) {
              //  ESPERAR MÁS TIEMPO PARA QUE LOS TABS SE RENDERICEN
              setTimeout(() => {
                // Buscar el tab de Historial de múltiples formas
                let tabHistorial = document.querySelector('.q-tab[aria-controls="historial"]')

                if (!tabHistorial) {
                  console.warn(' No encontrado con aria-controls, buscando por texto...')
                  const tabs = document.querySelectorAll('.q-tab')
                  tabs.forEach((tab) => {
                    const texto = tab.textContent.trim().toLowerCase()
                    if (texto.includes('historial')) {
                      tabHistorial = tab
                    }
                  })
                }

                if (tabHistorial) {
                  tabHistorial.click()

                  setTimeout(() => {
                    driverObj.drive(12) //  INICIAR EN EL PASO 12 (ÚLTIMO PASO)
                    yaCambioAHistorial = true // Marcar que ya estamos en historial
                    configurarListeners()

                    setTimeout(() => {
                      if (driverObj.isActive()) {
                        driverObj.refresh()
                      } else {
                        console.warn(' Driver NO está activo después de drive(12)')
                      }
                    }, 100)
                  }, 600)
                } else {
                  console.error(' Tab historial NO encontrado después de búsqueda exhaustiva')
                  const allTabs = document.querySelectorAll('.q-tab')
                  allTabs.forEach((tab, idx) => {
                    console.log(`Tab ${idx} HTML:`, tab.outerHTML)
                  })
                }
              }, 200)
            } else {
              driverObj.drive()
              configurarListeners()
              setTimeout(() => {
                if (driverObj.isActive()) {
                  driverObj.refresh()
                }
              }, 100)
            }
          }, 100)
        }, 100)
      }, 300)
    } else {
      console.warn(' Flag NO válido o no existe. Flag actual:', step)
    }
  }

  function configurarListeners() {
    limpiarListeners()

    let confirmActive = false
    confirmHandler = window.confirm

    window.confirm = function (...args) {
      confirmActive = true
      const result = confirmHandler.apply(this, args)
      confirmActive = false
      return result
    }

    keyPressHandler = (e) => {
      if (e.key === 'Enter' && !confirmActive && !isTransitioning && driverObj.isActive()) {
        e.preventDefault()
        e.stopPropagation()

        isTransitioning = true

        //  SI HAY SIGUIENTE PASO, AVANZAR
        if (driverObj.hasNextStep()) {
          driverObj.moveNext()
        }
        //  SI NO HAY SIGUIENTE PASO, VERIFICAR NAVEGACIÓN PROGRAMADA
        else {
          //  SI HAY NAVEGACIÓN PROGRAMADA, EJECUTARLA
          if (navegacionProgramada) {
            const accion = navegacionProgramada
            navegacionProgramada = null

            localStorage.removeItem('mj_tutorial_step')
            driverObj.destroy()

            setTimeout(() => {
              accion()
            }, 100)
          }
          //  SI NO HAY NAVEGACIÓN PROGRAMADA, SOLO CERRAR
          else {
            driverObj.destroy()
          }
        }

        setTimeout(() => {
          isTransitioning = false
        }, 400)
      } else if (e.key === 'Enter' && isTransitioning) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', keyPressHandler, true)

    if (!destroyOriginal) {
      destroyOriginal = driverObj.destroy.bind(driverObj)
    }

    driverObj.destroy = () => {
      limpiarListeners()
      localStorage.removeItem('mj_tutorial_step')
      navegacionProgramada = null
      yaNavegamosAReportes = false
      isTransitioning = false
      destroyOriginal()
    }
  }

  function detenerTutorial() {
    localStorage.removeItem('mj_tutorial_step')
    navegacionProgramada = null
    yaNavegamosAReportes = false
    yaCambioAHistorial = false
    isTransitioning = false
    limpiarListeners()
    driverObj.destroy()
  }

  async function esperarElemento(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector)
      if (el) return resolve(el)

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector)
        if (found) {
          observer.disconnect()
          resolve(found)
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })

      setTimeout(() => {
        observer.disconnect()
        resolve(null)
      }, timeout)
    })
  }

  async function ejecutarTutorialComponente(
    abrirFn,
    cerrarFn,
    pasos,
    selectorPrimerElemento,
    stepDashboardContinuar,
  ) {
    // Guardar destroy original antes de sobreescribir
    const destroyActual = driverObj.destroy.bind(driverObj)

    // Detener driver actual sin trigger de onDestroyStarted
    try {
      destroyActual()
    } catch (e) {
      console.warn('Error deteniendo driver actual:', e)
    }

    // Abrir dialog
    abrirFn()

    // Esperar elemento
    const elemento = await esperarElemento(selectorPrimerElemento)

    if (!elemento) {
      console.warn(`[Tutorial] Elemento "${selectorPrimerElemento}" no encontrado, saltando...`)
      cerrarFn()
      setTimeout(() => {
        driverObj.setSteps(pasosDashboard)
        driverObj.drive(stepDashboardContinuar)
        configurarListeners()
      }, 300)
      return
    }

    await new Promise((r) => setTimeout(r, 400))

    // Correr pasos del componente
    driverObj.setSteps(pasos)
    driverObj.drive()
    configurarListeners()

    // Al terminar los pasos del componente → cerrar y continuar en dashboard
    const destroyComponente = driverObj.destroy.bind(driverObj)
    driverObj.destroy = () => {
      limpiarListeners()
      destroyComponente()
      cerrarFn()

      setTimeout(() => {
        driverObj.setSteps(pasosDashboard)
        driverObj.drive(stepDashboardContinuar)
        configurarListeners()
      }, 400)
    }
  }

  const pasosEstadoFlota = [
    {
      element: '.compact-grid',
      popover: {
        title: 'Filtros de Estado',
        description:
          'Filtra tu flota por estado: Todos, En movimiento, Detenido o Inactivo. El número indica cuántas unidades hay en cada estado.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.search-container-flota',
      popover: {
        title: 'Buscar Vehículo',
        description:
          'Busca rápidamente cualquier vehículo por nombre, ubicación o conductor asignado.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.tabla-header',
      popover: {
        title: 'Lista de Vehículos',
        description:
          'Aquí ves todas las unidades con su estado, ubicación y conductor. Haz clic en una unidad para centrar el mapa, o en la flecha → para ver sus detalles completos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.vehiculos-scroll-area',
      popover: {
        title: 'Unidades de la Flota',
        description:
          'Cada tarjeta muestra el estado actual, velocidad, ubicación geocodificada y conductor asignado en tiempo real.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.btn-detalles',
      popover: {
        title: 'Ver detalles de la flota',
        description:
          'Al dar click en el botón de detalles ">", se mostrarán sus detalles completos.',
        side: 'right',
        align: 'start',
      },
    },
  ]
  const pasosDetalleVehiculo = [
    {
      element: '.tabs-vehiculo',
      popover: {
        title: 'Información del Vehículo',
        description:
          'Aquí tienes 3 tabs: Resumen con la ubicación y estado actual, Hoy con el historial de trayectos del día, y Notificaciones con los eventos registrados.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.info-card.ubicacion-card',
      popover: {
        title: 'Ubicación Actual',
        description:
          'Muestra la dirección geocodificada y coordenadas exactas del vehículo en tiempo real.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.detalles-grid',
      popover: {
        title: 'Estado y Estadísticas',
        description:
          'Estado actual del vehículo, tiempo de conducción del día, última sincronización GPS y fecha/hora del último dato recibido.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.filtro-dia-card',
      popover: {
        title: 'Selector de Día',
        description: 'Navega entre días usando las flechas. Por default muestra el día de hoy.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.resumen-dia-card',
      popover: {
        title: 'Resumen del Día',
        description:
          'Muestra la ubicación de inicio y fin, duración total de trabajo, kilómetros recorridos y número de viajes realizados en el día.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.filtro-horas-card',
      popover: {
        title: 'Filtro por Hora',
        description:
          'Filtra los trayectos por rango de horas. Útil para ver solo los viajes de un turno específico.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.timeline-section-compact',
      popover: {
        title: 'Historial de Viajes',
        description:
          'Lista de todos los trayectos del día. Haz clic en cualquiera para verlo dibujado en el mapa con su ruta completa.',
        side: 'right',
        align: 'start',
      },
    },

    // ── TAB NOTIFICACIONES ──
    {
      element: '.filtro-dia-eventos',
      popover: {
        title: 'Selector de Día',
        description:
          'Igual que en Hoy, puedes navegar entre días para ver los eventos de cualquier fecha.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.filtro-horas-eventos',
      popover: {
        title: 'Filtros de Eventos',
        description:
          'Filtra por tipo de evento: Entradas, Salidas o Todos. También puedes acotar el rango de horas para ver solo los eventos que te interesan.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.eventos-container',
      popover: {
        title: 'Lista de Eventos',
        description:
          'Cada tarjeta muestra el tipo de evento, hora, ubicación geocodificada y conductor. Haz clic en una para verla en el mapa.',
        side: 'right',
        align: 'start',
      },
    },
  ]

  const pasosConductores = [
    {
      element: '.conductores-drawer',
      popover: {
        title: 'Gestión de Conductores',
        description:
          'Aquí administras todos los conductores de tu flota. Puedes crear grupos, buscar conductores y gestionar su información.',
        side: 'right',
        align: 'start',
      },
    },
    {
      //editando para agregar la carpeta denuevo grupo
      element: '.nuevoGrupo-btn',
      popover: {
        title: 'Creación de Grupos',
        description: 'Aquí se crean nuevos grupos para organizar a los conductores.',
        side: 'right',
        align: 'start',
      },
    },

    {
      element: '.conductores-drawer .search-input',
      popover: {
        title: 'Buscar Conductor',
        description: 'Busca rápidamente cualquier conductor por nombre o teléfono.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.grupos-lista',
      popover: {
        title: 'Grupos de Conductores',
        description:
          'Organiza tus conductores en grupos. El grupo "Conductores con unidad" muestra todos los que tienen vehículo asignado.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.conductor-card',
      popover: {
        title: 'Lista de Conductores',
        description:
          'Cada tarjeta muestra el nombre, empresa y unidad asignada. Haz clic para ver su información completa: licencia, seguro, tarjeta de circulación y placas.',
        side: 'right',
        align: 'start',
      },
    },
  ]
  const pasosGeozonas = [
    {
      element: '.geozonas-drawer .drawer-header',
      popover: {
        title: 'Geozonas y Puntos de Interés',
        description:
          'Aquí administras todas tus ubicaciones importantes: geozonas para definir áreas y puntos de interés para marcar lugares específicos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.modern-tabs',
      popover: {
        title: 'Vistas disponibles',
        description:
          'Cambia entre la vista de Geozonas y la vista de Puntos de Interés usando estas pestañas.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.stats-cards',
      popover: {
        title: 'Estadísticas',
        description:
          'Aquí ves el total de geozonas o POIs registrados y cuántos grupos tienes creados.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.geozonas-drawer .modern-search',
      popover: {
        title: 'Buscar Ubicaciones',
        description:
          'Busca rápidamente cualquier geozona o punto de interés por nombre o dirección.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.geozonas-drawer .crear-grupo-btn',
      popover: {
        title: 'Crear Grupo',
        description:
          'Organiza tus ubicaciones en grupos con colores personalizados para identificarlos fácilmente en el mapa.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.lista-scroll',
      popover: {
        title: 'Lista de Ubicaciones',
        description:
          'Cada tarjeta muestra el nombre y detalles de la ubicación. Haz clic para seleccionarla, doble clic para centrar el mapa en ella, o usa el menú ⋮ para editar, ver en mapa o eliminar.',
        side: 'right',
        align: 'start',
      },
    },
  ]
  const pasosEventos = [
    {
      element: '.eventos-drawer-compact',
      popover: {
        title: 'Sistema de Eventos',
        description:
          'Aquí configuras alertas automáticas que se disparan cuando un vehículo entra o sale de una geozona o punto de interés.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.stats-grid',
      popover: {
        title: 'Estado de tus Eventos',
        description: 'Visualiza cuántos eventos tienes activos e inactivos en tiempo real.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.acciones-row',
      popover: {
        title: 'Crear y Buscar Eventos',
        description:
          'Usa el botón "Nuevo" para crear un evento, o el buscador para encontrar uno existente rápidamente.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.filtro-compact',
      popover: {
        title: 'Filtrar Eventos',
        description:
          'Filtra la lista para ver todos los eventos, solo los activos o solo los inactivos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.lista-scroll-compact',
      popover: {
        title: 'Lista de Eventos',
        description:
          'Cada evento muestra su nombre, ubicación asociada y un toggle para activarlo o desactivarlo. Usa el menú ⋮ para editar, duplicar o eliminar.',
        side: 'right',
        align: 'start',
      },
    },
  ]

  return {
    iniciarTutorial,
    iniciarTutorialReportes,
    detenerTutorial,
    driverObj,
  }
}
