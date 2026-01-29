// useTutorial.js - VERSIÓN CORREGIDA FINAL
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial(router) {
  let pasoAnterior = -1
  let destroyOriginal = null
  let navegacionProgramada = null
  let yaNavegamosAReportes = false
  let isTransitioning = false // 🔥 MOVER AQUÍ FUERA

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
        isTransitioning = false // 🔥 RESET AQUÍ TAMBIÉN
        driverObj.destroy()
      }
    },

    onHighlighted: () => {
      const pasoActual = driverObj.getActiveIndex()
      const totalPasos = driverObj.getConfig().steps?.length || 0

      if (pasoActual !== pasoAnterior) {
        console.log(`📍 Paso ${pasoActual + 1}/${totalPasos}`)
      }

      // 🔥 DETECTAR ÚLTIMO PASO DE REPORTES
      if (totalPasos === 5 && pasoActual === 4) {
        console.log('🎯 En último paso de reportes, programando navegación')

        navegacionProgramada = () => {
          console.log('🔙 Navegando a dashboard...')
          router.push('/dashboard').then(() => {
            setTimeout(() => {
              console.log('🎬 Continuando tutorial desde paso 9')
              pasoAnterior = 8
              navegacionProgramada = null
              yaNavegamosAReportes = true
              isTransitioning = false // 🔥 RESET AL CAMBIAR DE PÁGINA
              driverObj.setSteps(pasosDashboard)
              driverObj.drive(9)
              configurarListeners()
            }, 1000)
          })
        }
      } else {
        if (navegacionProgramada && pasoActual !== 4) {
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
    },
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
    {
      element: '#tipo-informe-card',
      popover: {
        title: 'Tipo de informe',
        description: 'Elige qué tipo de reporte: Eventos, Trayectos o Horas de Trabajo.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#q-select-reportar',
      popover: {
        title: 'Selección de Elementos',
        description: 'Elige las unidades, conductores o grupos para tu reporte.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#contenedor-rango-fecha', // 🔥 SELECTOR CORREGIDO
      popover: {
        title: 'Rango de Fechas',
        description: 'Define el período del reporte. Haz clic en el icono del calendario.',
        side: 'bottom',
        align: 'start',
      },
    },
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
    {
      element: '.btn-pdf',
      popover: {
        title: 'Generar Reportes',
        description:
          'Genera tu reporte en PDF o Excel. Al hacer clic en "¡Entendido! ✓" regresaremos al dashboard.',
        side: 'top',
        align: 'center',
      },
    },
  ]

  function iniciarTutorial() {
    pasoAnterior = -1
    navegacionProgramada = null
    yaNavegamosAReportes = false
    isTransitioning = false // 🔥 RESET
    localStorage.removeItem('mj_tutorial_step')

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
      isTransitioning = false // 🔥 RESET

      localStorage.removeItem('mj_tutorial_step')

      setTimeout(() => {
        console.log('🎬 Iniciando driver en página de reportes')
        driverObj.setSteps(pasosReportes)
        driverObj.drive()
        configurarListeners()
      }, 1500)
    } else {
      console.log('❌ No hay tutorial pendiente')
    }
  }

  function continuarTutorialDashboard() {
    console.log('⚠️ continuarTutorialDashboard() deprecado - no hace nada')
  }

  // 🔥 FUNCIÓN CORREGIDA - isTransitioning AHORA ES GLOBAL
  function configurarListeners() {
    let confirmActive = false

    const originalConfirm = window.confirm
    window.confirm = function (...args) {
      confirmActive = true
      const result = originalConfirm.apply(this, args)
      confirmActive = false
      return result
    }

    const handleKeyPress = (e) => {
      // 🔥 USAR LA VARIABLE GLOBAL isTransitioning
      if (e.key === 'Enter' && !confirmActive && !isTransitioning && driverObj.hasNextStep()) {
        console.log('✅ Enter aceptado - avanzando paso')

        e.preventDefault()
        e.stopPropagation()

        // 🔥 BLOQUEAR INMEDIATAMENTE
        isTransitioning = true

        driverObj.moveNext()

        // 🔥 DESBLOQUEAR DESPUÉS DE LA ANIMACIÓN
        setTimeout(() => {
          isTransitioning = false
          console.log('🔓 Transición completada - Enter habilitado nuevamente')
        }, 400)
      } else if (e.key === 'Enter' && isTransitioning) {
        console.log('⚠️ Enter ignorado - transición en curso')
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeyPress, true)

    if (!destroyOriginal) {
      destroyOriginal = driverObj.destroy.bind(driverObj)
    }

    driverObj.destroy = () => {
      document.removeEventListener('keydown', handleKeyPress, true)
      window.confirm = originalConfirm
      localStorage.removeItem('mj_tutorial_step')
      navegacionProgramada = null
      yaNavegamosAReportes = false
      isTransitioning = false // 🔥 RESET
      destroyOriginal()
    }
  }

  function detenerTutorial() {
    localStorage.removeItem('mj_tutorial_step')
    navegacionProgramada = null
    yaNavegamosAReportes = false
    isTransitioning = false // 🔥 RESET
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
