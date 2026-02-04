// useTutorial.js - VERSIÓN CON LIMPIEZA AGRESIVA
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial(router) {
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
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 5,
    stageRadius: 12,
    disableActiveInteraction: false,

    onDestroyStarted: () => {
      console.log('🔔 onDestroyStarted - navegacionProgramada:', navegacionProgramada)

      if (navegacionProgramada) {
        console.log('✅ Ejecutando navegación programada')
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

      if (pasoActual !== pasoAnterior) {
        console.log(`📍 Paso ${pasoActual + 1}/${totalPasos}`)
      }

      // 🔥 CAMBIAR AL TAB DE HISTORIAL EN EL PASO 7
      if (totalPasos === 12 && pasoActual === 7 && !yaCambioAHistorial) {
        console.log('📑 Cambiando al tab de Historial...')
        yaCambioAHistorial = true

        // 🔥 RETROCEDER UN PASO PARA "PAUSAR"
        driverObj.movePrevious()

        // 🔥 BUSCAR Y HACER CLICK EN EL TAB
        const tabHistorial = document.querySelector('.q-tab[aria-controls="historial"]')

        if (tabHistorial) {
          console.log('✅ Tab de historial encontrado, haciendo click...')
          tabHistorial.click()

          // 🔥 ESPERAR A QUE SE COMPLETE LA ANIMACIÓN DEL TAB
          setTimeout(() => {
            console.log('🔄 Tab renderizado, avanzando paso...')

            // 🔥 AHORA SÍ AVANZAR AL PASO 7
            driverObj.moveNext()

            // 🔥 REFRESCAR POSICIONES
            setTimeout(() => {
              if (driverObj.isActive()) {
                driverObj.refresh()
                console.log('✅ Posiciones actualizadas')
              }
            }, 200)
          }, 600) // 🔥 TIEMPO PARA LA ANIMACIÓN DEL TAB
        } else {
          console.error('❌ No se encontró el tab de historial')

          // 🔥 INTENTO ALTERNATIVO
          const tabs = document.querySelectorAll('.q-tab')
          console.log('🔍 Buscando entre', tabs.length, 'tabs')

          tabs.forEach((tab) => {
            if (tab.textContent.includes('Historial')) {
              console.log('✅ Encontrado por texto, haciendo click...')
              tab.click()

              setTimeout(() => {
                console.log('🔄 Avanzando paso después del cambio de tab...')
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

        // 🔥 IMPORTANTE: Actualizar pasoAnterior para evitar bucles
        pasoAnterior = 6 // Retrocedimos al paso 6
        return // Salir para evitar que se ejecute el resto del código
      }

      // 🔥 DETECTAR ÚLTIMO PASO DE REPORTES
      if (totalPasos === 12 && pasoActual === 11) {
        console.log('🎯 En último paso de reportes, programando navegación')

        navegacionProgramada = () => {
          console.log('🔙 Navegando a dashboard...')
          router.push('/dashboard').then(() => {
            setTimeout(() => {
              console.log('🎬 Continuando tutorial desde paso 9')
              pasoAnterior = 8
              navegacionProgramada = null
              yaNavegamosAReportes = true
              yaCambioAHistorial = false
              isTransitioning = false
              driverObj.setSteps(pasosDashboard)
              driverObj.drive(9)
              configurarListeners()
            }, 500)
          })
        }
      } else {
        if (navegacionProgramada && pasoActual !== 11) {
          console.log('⚠️ Limpiando navegación programada (cambio de paso)')
          navegacionProgramada = null
        }
      }

      // Dashboard: paso 8 → 9 (Reportes)
      if (pasoAnterior === 8 && pasoActual === 9 && totalPasos === 14 && !yaNavegamosAReportes) {
        console.log('🚀 Navegando de dashboard a reportes (PRIMERA VEZ)...')
        yaNavegamosAReportes = true

        localStorage.setItem('mj_tutorial_step', 'reportes')
        console.log('✅ localStorage guardado:', localStorage.getItem('mj_tutorial_step'))

        limpiarListeners()

        if (destroyOriginal) {
          destroyOriginal()
        }

        setTimeout(() => {
          console.log('🔀 Ejecutando router.push("/reporte")')
          router.push('/reporte')
        }, 100)

        pasoAnterior = pasoActual
        return
      }

      pasoAnterior = pasoActual
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
    console.log('🧹 Limpiando listeners...')

    if (keyPressHandler) {
      document.removeEventListener('keydown', keyPressHandler, true)
      console.log('🗑️ Listener removido')
      keyPressHandler = null
    }

    if (confirmHandler) {
      window.confirm = confirmHandler
      confirmHandler = null
    }
  }

  function iniciarTutorial() {
    pasoAnterior = -1
    navegacionProgramada = null
    yaNavegamosAReportes = false
    yaCambioAHistorial = false
    isTransitioning = false
    localStorage.removeItem('mj_tutorial_step')

    // 🔥 LIMPIAR LISTENERS ANTES DE INICIAR
    limpiarListeners()

    if (driverObj.isActivated) {
      console.log('⚠️ Tutorial activo, destruyendo...')
      if (destroyOriginal) {
        destroyOriginal()
      }
    }

    setTimeout(() => {
      console.log('🎬 Iniciando tutorial desde el principio')
      driverObj.setSteps(pasosDashboard)
      driverObj.drive()
      configurarListeners()
    }, 300)
  }

  function iniciarTutorialReportes() {
    console.log('🔍 iniciarTutorialReportes() ejecutado')
    const step = localStorage.getItem('mj_tutorial_step')
    console.log('📝 localStorage value:', step)

    if (step === 'reportes') {
      console.log('✅ Iniciando tutorial de reportes...')
      pasoAnterior = -1
      navegacionProgramada = null
      yaCambioAHistorial = false
      isTransitioning = false

      localStorage.removeItem('mj_tutorial_step')

      // 🔥 LIMPIAR LISTENERS ANTES DE INICIAR
      limpiarListeners()

      setTimeout(() => {
        console.log('🎬 Iniciando driver en página de reportes')

        window.scrollTo({ top: 0, behavior: 'instant' })

        driverObj.setSteps(pasosReportes)
        driverObj.drive()
        configurarListeners() // 🔥 CONFIGURAR LISTENERS FRESCOS

        setTimeout(() => {
          if (driverObj.isActivated) {
            driverObj.refresh()
            console.log('🔄 Posiciones recalculadas')
          }
        }, 100)
      }, 300)
    } else {
      console.log('❌ No hay tutorial pendiente')
    }
  }

  function continuarTutorialDashboard() {
    console.log('⚠️ continuarTutorialDashboard() deprecado - no hace nada')
  }

  function configurarListeners() {
    console.log('🎧 Configurando listeners...')

    limpiarListeners()

    let confirmActive = false
    confirmHandler = window.confirm

    window.confirm = function (...args) {
      confirmActive = true
      const result = confirmHandler.apply(this, args)
      confirmActive = false
      return result
    }

    const handlerId = Math.random().toString(36).substr(2, 9)
    console.log(`🆕 Creando handler: ${handlerId}`)

    keyPressHandler = (e) => {
      if (e.key === 'Enter' && !confirmActive && !isTransitioning && driverObj.isActive()) {
        console.log(`✅ [${handlerId}] Enter aceptado`)

        e.preventDefault()
        e.stopPropagation()

        isTransitioning = true

        // 🔥 SI HAY SIGUIENTE PASO, AVANZAR
        if (driverObj.hasNextStep()) {
          console.log('➡️ Avanzando al siguiente paso')
          driverObj.moveNext()
        }
        // 🔥 SI NO HAY SIGUIENTE PASO, VERIFICAR NAVEGACIÓN PROGRAMADA
        else {
          console.log('📍 Último paso detectado')

          // 🔥 SI HAY NAVEGACIÓN PROGRAMADA, EJECUTARLA
          if (navegacionProgramada) {
            console.log('🔀 Hay navegación programada, ejecutando...')
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
            console.log('✅ No hay navegación programada, cerrando tutorial')
            driverObj.destroy()
          }
        }

        setTimeout(() => {
          isTransitioning = false
          console.log('🔓 Transición completada')
        }, 400)
      } else if (e.key === 'Enter' && isTransitioning) {
        console.log(`⚠️ [${handlerId}] Enter ignorado - transición en curso`)
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', keyPressHandler, true)
    console.log(`✅ Listener ${handlerId} configurado`)

    if (!destroyOriginal) {
      destroyOriginal = driverObj.destroy.bind(driverObj)
    }

    driverObj.destroy = () => {
      console.log('💥 Destruyendo tutorial')
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
    continuarTutorialDashboard,
    detenerTutorial,
    driverObj,
  }
}
