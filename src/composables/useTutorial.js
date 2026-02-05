// useTutorial.js - VERSIÓN CON LIMPIEZA AGRESIVA
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial(router) {
  // eslint-disable-next-line no-unused-vars
  let pasoAnterior = -1
  let destroyOriginal = null
  let navegacionProgramada = null
  let yaNavegamosAReportes = false
  let isTransitioning = false
  let keyPressHandler = null
  let confirmHandler = null
  let yaCambioAHistorial = false

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
      block: 'nearest', // 👈 ESTO CENTRA EL ELEMENTO
      inline: 'nearest',
    },

    onPrevClick: () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      console.log(
        '🔵 onPrevClick - Paso actual:',
        pasoActual,
        'Total pasos:',
        totalPasos,
        'yaNavegamosAReportes:',
        yaNavegamosAReportes,
      )

      // 🔥 NUEVO: SI ESTAMOS EN DASHBOARD PASO 10 Y RETROCEDEMOS, IR A REPORTES
      if (pasoActual === 10 && totalPasos === 16 && yaNavegamosAReportes) {
        console.log('✅ Condición cumplida - Navegando a reportes desde paso 10')

        // Guardar flag para que iniciarTutorialReportes sepa que viene de "Anterior"
        //  localStorage.setItem('mj_tutorial_step', 'reportes-anterior')
        console.log('💾 Flag guardado en localStorage:', localStorage.getItem('mj_tutorial_step'))

        // Limpiar listeners
        limpiarListeners()
        console.log('🧹 Listeners limpiados')

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
          console.log('🧹 DOM limpiado (estilos)')
        } catch (e) {
          console.warn('⚠️ Error limpiando estilos:', e)
        }

        // Eliminar elementos del DOM
        try {
          const driverPopovers = document.querySelectorAll(
            '.driver-popover, .driver-overlay, .driver-highlighted-element, .driver-popover-item, .driver-popover-title, .driver-popover-description',
          )
          console.log('🧹 Elementos driver encontrados:', driverPopovers.length)
          driverPopovers.forEach((el) => {
            try {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el)
              }
            } catch (e) {
              console.warn('⚠️ Error eliminando elemento:', e)
            }
          })
          console.log('🧹 DOM limpiado (elementos)')
        } catch (e) {
          console.warn('⚠️ Error limpiando DOM:', e)
        }

        // Destruir driver
        if (destroyOriginal) {
          try {
            destroyOriginal()
            console.log('💥 Driver destruido')
          } catch (e) {
            console.warn('⚠️ Error destruyendo driver:', e)
          }
        }

        // 🔥 NAVEGAR Y LUEGO EJECUTAR EL TUTORIAL
        console.log('🚀 Iniciando navegación a /reporte')
        router
          .push('/reporte')
          .then(() => {
            console.log('✅ Navegación completada, esperando 400ms...')
            // Esperar a que la página se renderice
            setTimeout(() => {
              console.log('⏰ Timeout cumplido, llamando iniciarTutorialReportes()')
              console.log(
                '💾 Flag actual en localStorage:',
                localStorage.getItem('mj_tutorial_step'),
              )
              iniciarTutorialReportes(true) // 🔥 LLAMAR DIRECTAMENTE LA FUNCIÓN
            }, 400)
          })
          .catch((err) => {
            console.error('❌ Error en navegación:', err)
          })

        return
      }

      // 🔥 SI ESTAMOS EN EL PASO 8 DE REPORTES (PRIMER PASO DE HISTORIAL) Y RETROCEDEMOS
      if (totalPasos === 13 && pasoActual === 8) {
        console.log('🔄 Retrocediendo desde historial a crear reporte')
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

      console.log('➡️ Retroceso normal')
      // Para cualquier otro caso, permitir el retroceso normal
      driverObj.movePrevious()
    },
    onNextClick: () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      // 🔥 NAVEGACIÓN A REPORTES CON LIMPIEZA FORZADA
      if (pasoActual === 9 && totalPasos === 16 && !yaNavegamosAReportes) {
        yaNavegamosAReportes = true
        localStorage.setItem('mj_tutorial_step', 'reportes')

        // 🔥 PASO 1: LIMPIAR LISTENERS
        limpiarListeners()

        // 🔥 PASO 2: LIMPIAR CLASES Y ESTILOS PRIMERO (antes de destruir)
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

        // 🔥 PASO 3: FORZAR ELIMINACIÓN DEL DOM (antes de destruir)
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

        // 🔥 PASO 4: AHORA SÍ DESTRUIR EL DRIVER
        if (destroyOriginal) {
          try {
            destroyOriginal()
          } catch (e) {
            console.warn('Error destruyendo driver:', e)
          }
        }

        // 🔥 PASO 5: ESPERAR Y NAVEGAR
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

        // 🔥 LIMPIAR LISTENERS ANTES DE DESTRUIR
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

        // 🔥 LIMPIAR LISTENERS ANTES DE DESTRUIR
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
              pasoAnterior = 9 // 🔥 AQUÍ SE USA pasoAnterior
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

      pasoAnterior = pasoActual // 🔥 Y AQUÍ TAMBIÉN
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
    // 🔥 PASO 0: TABS
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
    // 🔥 PASO 1: TIPO DE INFORME
    {
      element: '#tipo-informe-card',
      popover: {
        title: 'Tipo de informe',
        description: 'Elige qué tipo de reporte: Eventos, Trayectos o Horas de Trabajo.',
        side: 'bottom',
        align: 'start',
      },
    },
    // 🔥 PASO 2: REPORTAR POR
    {
      element: '#q-select-reportar',
      popover: {
        title: 'Selección de Elementos',
        description: 'Elige las unidades, conductores o grupos para tu reporte.',
        side: 'bottom',
        align: 'start',
      },
    },
    // 🔥 PASO 3: RANGO DE FECHAS
    {
      element: '#contenedor-rango-fecha',
      popover: {
        title: 'Rango de Fechas',
        description: 'Define el período del reporte. Haz clic en el icono del calendario.',
        side: 'bottom',
        align: 'start',
      },
    },
    // 🔥 PASO 4: COLUMNAS
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
    // 🔥 PASO 5: BOTONES DE GENERAR
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
    // 🔥 PASO 6: TABLA DE HISTORIAL
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
    // 🔥 PASO 7: BOTONES DE ACCIONES
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
    // 🔥 PASO 8: PAGINACIÓN
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
    // 🔥 PASO 9: FINAL
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

  // 🔥 NUEVA FUNCIÓN: LIMPIAR LISTENERS
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

  // 🔥 MODIFICAR LA FUNCIÓN iniciarTutorial()
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

    // 🔥 VERIFICAR SI ESTAMOS EN EL DASHBOARD
    const rutaActual = router.currentRoute.value.path

    if (rutaActual !== '/dashboard') {
      // 🔥 SI NO ESTAMOS EN DASHBOARD, NAVEGAR PRIMERO
      router.push('/dashboard').then(() => {
        // 🔥 ESPERAR A QUE EL DASHBOARD CARGUE COMPLETAMENTE
        setTimeout(() => {
          driverObj.setSteps(pasosDashboard)
          driverObj.drive()
          configurarListeners()
        }, 500) // 500ms para asegurar que todo esté renderizado
      })
    } else {
      // 🔥 SI YA ESTAMOS EN DASHBOARD, INICIAR DIRECTAMENTE
      setTimeout(() => {
        driverObj.setSteps(pasosDashboard)
        driverObj.drive()
        configurarListeners()
      }, 300)
    }
  }

  function iniciarTutorialReportes(forzarAnterior = false) {
    console.log('🎬 iniciarTutorialReportes() ejecutada con forzarAnterior:', forzarAnterior)
    const step = localStorage.getItem('mj_tutorial_step')
    console.log('💾 Flag leído de localStorage:', step)

    // 🔥 DETECTAR SI VIENE DE "SIGUIENTE" O "ANTERIOR"
    if (step === 'reportes' || step === 'reportes-anterior' || forzarAnterior) {
      const vieneDeAnterior = step === 'reportes-anterior' || forzarAnterior
      console.log('✅ Flag válido detectado. Viene de anterior:', vieneDeAnterior)

      pasoAnterior = -1
      navegacionProgramada = null
      yaCambioAHistorial = false
      isTransitioning = false

      localStorage.removeItem('mj_tutorial_step')
      console.log('🗑️ Flag removido de localStorage')

      limpiarListeners()

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
        console.log('📜 Scroll al top')

        //FORZAR SCROLL AL PRIMER ELEMENTO DEL TUTORIAL
        setTimeout(() => {
          const primerElemento = document.querySelector('#tabs-reportes')
          if (primerElemento) {
            primerElemento.scrollIntoView({
              behavior: 'instant',
              block: 'center',
            })
            console.log('✅ Primer elemento encontrado y scrolleado')
          } else {
            console.warn('⚠️ Primer elemento #tabs-reportes NO encontrado')
          }

          // 🔥 ESPERAR UN POCO MÁS ANTES DE INICIAR
          setTimeout(() => {
            console.log('📝 Configurando pasos del tutorial')
            driverObj.setSteps(pasosReportes)

            // 🔥 SI VIENE DE "ANTERIOR", INICIAR EN EL ÚLTIMO PASO (12)
            if (vieneDeAnterior) {
              console.log('⬅️ Viene de ANTERIOR - Buscando tab historial')

              // 🔥 ESPERAR MÁS TIEMPO PARA QUE LOS TABS SE RENDERICEN
              setTimeout(() => {
                // Buscar el tab de Historial de múltiples formas
                let tabHistorial = document.querySelector('.q-tab[aria-controls="historial"]')

                if (!tabHistorial) {
                  console.warn('⚠️ No encontrado con aria-controls, buscando por texto...')
                  const tabs = document.querySelectorAll('.q-tab')
                  console.log('📊 Tabs encontrados:', tabs.length)

                  tabs.forEach((tab, index) => {
                    console.log(
                      `Tab ${index}:`,
                      tab.textContent,
                      'aria-controls:',
                      tab.getAttribute('aria-controls'),
                    )
                    const texto = tab.textContent.trim().toLowerCase()
                    if (texto.includes('historial')) {
                      tabHistorial = tab
                      console.log('✅ Tab historial encontrado por texto en índice:', index)
                    }
                  })
                }

                if (tabHistorial) {
                  console.log('✅ Tab historial encontrado, haciendo click')
                  tabHistorial.click()

                  setTimeout(() => {
                    console.log('🚀 Iniciando driver en paso 12')
                    driverObj.drive(12) // 🔥 INICIAR EN EL PASO 12 (ÚLTIMO PASO)
                    yaCambioAHistorial = true // Marcar que ya estamos en historial
                    configurarListeners()

                    setTimeout(() => {
                      if (driverObj.isActive()) {
                        console.log('🔄 Refrescando driver')
                        driverObj.refresh()
                      } else {
                        console.warn('⚠️ Driver NO está activo después de drive(12)')
                      }
                    }, 100)
                  }, 600)
                } else {
                  console.error('❌ Tab historial NO encontrado después de búsqueda exhaustiva')
                  console.log('🔍 Intentando obtener HTML de los tabs:')
                  const allTabs = document.querySelectorAll('.q-tab')
                  allTabs.forEach((tab, idx) => {
                    console.log(`Tab ${idx} HTML:`, tab.outerHTML)
                  })
                }
              }, 200) // 🔥 DAR 200ms EXTRA PARA QUE SE RENDERICEN LOS TABS
            } else {
              console.log('➡️ Viene de SIGUIENTE - Iniciando desde paso 0')
              // Si viene de "Siguiente", iniciar desde el principio
              driverObj.drive()
              configurarListeners()

              // 🔥 REFRESH FINAL PARA ASEGURAR
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
      console.log('❌ Flag NO válido o no existe. Flag actual:', step)
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

        // 🔥 SI HAY SIGUIENTE PASO, AVANZAR
        if (driverObj.hasNextStep()) {
          driverObj.moveNext()
        }
        // 🔥 SI NO HAY SIGUIENTE PASO, VERIFICAR NAVEGACIÓN PROGRAMADA
        else {
          // 🔥 SI HAY NAVEGACIÓN PROGRAMADA, EJECUTARLA
          if (navegacionProgramada) {
            const accion = navegacionProgramada
            navegacionProgramada = null

            localStorage.removeItem('mj_tutorial_step')
            driverObj.destroy()

            setTimeout(() => {
              accion()
            }, 100)
          }
          // 🔥 SI NO HAY NAVEGACIÓN PROGRAMADA, SOLO CERRAR
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

  return {
    iniciarTutorial,
    iniciarTutorialReportes,
    detenerTutorial,
    driverObj,
  }
}
