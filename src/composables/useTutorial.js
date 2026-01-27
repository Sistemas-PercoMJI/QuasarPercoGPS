// src/composables/useTutorial.js
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial(router) {
  // 🔥 Recibir router como parámetro

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
      if (!driverObj.hasNextStep() || confirm('¿Seguro que quieres salir del tutorial?')) {
        driverObj.destroy()
      }
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

  const pasosTutorial = [
    {
      element: '#map-page',
      popover: {
        title: '¡Bienvenido a MJ GPS!',
        description:
          'Este es tu panel principal de rastreo de flotas. Aquí podrás ver en tiempo real la ubicación de todos tus vehículos.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '.search-input',
      popover: {
        title: 'Buscador Inteligente',
        description:
          'Busca direcciones, vehículos, conductores, POIs y geozonas. El sistema te mostrará resultados mientras escribes.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.drawer-custom',
      popover: {
        title: 'Menú de Navegación',
        description:
          'Este menú lateral contiene todas las funciones del sistema. Pasa el cursor sobre él para expandirlo.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:first-child',
      popover: {
        title: 'Vista del Mapa',
        description:
          'Vuelve a la vista principal del mapa en cualquier momento haciendo clic aquí.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:nth-child(2)',
      popover: {
        title: 'Estado de la Flota',
        description: 'Monitorea en tiempo real el estado de todos tus vehículos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:nth-child(3)',
      popover: {
        title: 'Gestión de Conductores',
        description: 'Administra tu base de datos de conductores organizados por grupos.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:nth-child(4)',
      popover: {
        title: 'Geozonas y Puntos de Interés',
        description: 'Crea y gestiona POIs y Geozonas (áreas delimitadas).',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:nth-child(5)',
      popover: {
        title: 'Sistema de Eventos',
        description:
          'Configura alertas personalizadas: entrada/salida de geozonas, exceso de velocidad, etc.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.nav-item:nth-child(6)',
      popover: {
        title: 'Reportes',
        description:
          'Genera reportes detallados. Al hacer clic en "Siguiente" iremos a la sección de reportes.',
        side: 'right',
        align: 'start',
      },
      onNext: async () => {
        console.log('Navegando a /reporte...')
        await router.push('/reporte')
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('Navegación completada')
            resolve()
          }, 1200)
        })
      },
    },
    {
      element: '.q-select',
      popover: {
        title: 'Tipo de Informe',
        description: 'Elige qué tipo de reporte: Eventos, Trayectos o Horas de Trabajo.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.q-select[use-chips]',
      popover: {
        title: 'Selección de Elementos',
        description: 'Elige las unidades, conductores o grupos para incluir en el reporte.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.q-input[readonly]',
      popover: {
        title: 'Rango de Fechas',
        description: 'Define el período del reporte con el calendario.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.btn-pdf',
      popover: {
        title: 'Generar Reportes',
        description: 'Genera tu reporte en PDF o Excel. Se guardan en el historial.',
        side: 'top',
        align: 'center',
      },
      onNext: async () => {
        console.log('Regresando al dashboard...')
        await router.push('/dashboard')
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('Regreso completado')
            resolve()
          }, 1200)
        })
      },
    },
    {
      element: '.layers-menu-btn',
      popover: {
        title: 'Control de Capas del Mapa',
        description: 'Cambia entre vista satélite y calles.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '.recenter-btn',
      popover: {
        title: 'Centrar Mapa',
        description: 'Centra el mapa en tu ubicación GPS.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '.info-btn',
      popover: {
        title: 'Información del Sistema',
        description: 'Versión del sistema e información de la empresa.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '.notif-btn',
      popover: {
        title: 'Centro de Notificaciones',
        description: 'Alertas en tiempo real de eventos configurados.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      popover: {
        title: '¡Tutorial Completado!',
        description:
          'Ya conoces las funciones principales de MJ GPS. Puedes volver a este tutorial desde el botón de información.',
        side: 'center',
        align: 'center',
      },
    },
  ]

  function iniciarTutorial() {
    setTimeout(() => {
      driverObj.setSteps(pasosTutorial)
      driverObj.drive()

      let confirmActive = false
      const originalConfirm = window.confirm
      window.confirm = function (...args) {
        confirmActive = true
        const result = originalConfirm.apply(this, args)
        confirmActive = false
        return result
      }

      const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !confirmActive && driverObj.hasNextStep()) {
          e.preventDefault()
          e.stopPropagation()
          driverObj.moveNext()
        }
      }

      document.addEventListener('keydown', handleKeyPress, true)

      const originalDestroy = driverObj.destroy.bind(driverObj)
      driverObj.destroy = () => {
        document.removeEventListener('keydown', handleKeyPress, true)
        window.confirm = originalConfirm
        originalDestroy()
      }
    }, 300)
  }

  function irAPaso(numeroPaso) {
    driverObj.moveTo(numeroPaso)
  }

  function detenerTutorial() {
    driverObj.destroy()
  }

  return {
    iniciarTutorial,
    irAPaso,
    detenerTutorial,
    driverObj,
  }
}
