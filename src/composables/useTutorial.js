// src/composables/useTutorial.js
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorial() {
  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Entendido! ✓',
    closeBtnText: 'Salir',
    progressText: '{{current}} de {{total}}',

    // 🎨 Estilos personalizados
    popoverClass: 'driverjs-theme-custom',

    // ⚙️ Opciones de comportamiento
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
  })

  // 📚 PASOS DEL TUTORIAL ESPECÍFICOS PARA TU ESTRUCTURA
  const pasosTutorial = [
    // ================================
    // 🗺️ PASO 1: MAPA PRINCIPAL
    // ================================
    {
      element: '#map-page',
      popover: {
        title: '¡Bienvenido a MJ GPS! 🎉',
        description:
          'Este es tu panel principal de rastreo de flotas. Aquí podrás ver en tiempo real la ubicación de todos tus vehículos.',
        side: 'bottom',
        align: 'center',
      },
    },

    // ================================
    // 🔍 PASO 2: BUSCADOR (funciona con tu clase .search-input)
    // ================================
    {
      element: '.search-input',
      popover: {
        title: '🔍 Buscador Inteligente',
        description:
          'Busca direcciones, vehículos, conductores, POIs y geozonas. El sistema te mostrará resultados mientras escribes.',
        side: 'bottom',
        align: 'start',
        // 🔥 REMOVER o SIMPLIFICAR el onNextClick
      },
    },

    // ================================
    // 📱 PASO 3: MENÚ LATERAL (drawer)
    // ================================
    {
      element: '.drawer-custom',
      popover: {
        title: '📱 Menú de Navegación',
        description:
          'Este menú lateral contiene todas las funciones del sistema. Pasa el cursor sobre él para expandirlo.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 🗺️ PASO 4: ITEM "MAPA" en el drawer
    // ================================
    {
      element: '.nav-item:first-child',
      popover: {
        title: '🗺️ Vista del Mapa',
        description:
          'Vuelve a la vista principal del mapa en cualquier momento haciendo clic aquí.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 🚗 PASO 5: ITEM "ESTADO DE LA FLOTA"
    // ================================
    {
      element: '.nav-item:nth-child(2)',
      popover: {
        title: '🚗 Estado de la Flota',
        description: 'Monitorea en tiempo real el estado de todos tus vehículos.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 👥 PASO 6: ITEM "CONDUCTORES"
    // ================================
    {
      element: '.nav-item:nth-child(3)',
      popover: {
        title: '👥 Gestión de Conductores',
        description: 'Administra tu base de datos de conductores organizados por grupos.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 📍 PASO 7: ITEM "GEOZONAS Y POIs"
    // ================================
    {
      element: '.nav-item:nth-child(4)',
      popover: {
        title: '📍 Geozonas y Puntos de Interés',
        description: 'Crea y gestiona POIs y Geozonas (áreas delimitadas).',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 🔔 PASO 8: ITEM "EVENTOS"
    // ================================
    {
      element: '.nav-item:nth-child(5)',
      popover: {
        title: '🔔 Sistema de Eventos',
        description:
          'Configura alertas personalizadas: entrada/salida de geozonas, exceso de velocidad, etc.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 📄 PASO 9: ITEM "REPORTES"
    // ================================
    {
      element: '.nav-item:nth-child(6)',
      popover: {
        title: '📄 Reportes',
        description: 'Genera reportes detallados de rutas, tiempos, kilometraje y más.',
        side: 'right',
        align: 'start',
      },
    },

    // ================================
    // 🗂️ PASO 10: BOTÓN DE CAPAS
    // ================================
    {
      element: '.layers-menu-btn',
      popover: {
        title: '🗂️ Control de Capas del Mapa',
        description:
          'Cambia entre vista satélite y vista de calles, y activa/desactiva la capa de tráfico.',
        side: 'left',
        align: 'start',
      },
    },

    // ================================
    // 🎯 PASO 11: BOTÓN DE CENTRAR (ya funciona)
    // ================================
    {
      element: '.recenter-btn',
      popover: {
        title: '🎯 Centrar Mapa en Tu Ubicación',
        description: 'Este botón centra el mapa automáticamente en tu posición GPS actual.',
        side: 'left',
        align: 'start',
      },
    },

    // ================================
    // ℹ️ PASO 12: BOTÓN DE INFORMACIÓN
    // ================================
    {
      element: '.info-btn',
      popover: {
        title: 'ℹ️ Información del Sistema',
        description:
          'Aquí encontrarás la versión del sistema, información de la empresa y acceso a este tutorial.',
        side: 'bottom',
        align: 'end',
      },
    },

    // ================================
    // 🔔 PASO 13: BOTÓN DE NOTIFICACIONES
    // ================================
    {
      element: '.notif-btn',
      popover: {
        title: '🔔 Centro de Notificaciones',
        description:
          'Recibe alertas en tiempo real de eventos configurados. El badge rojo indica notificaciones nuevas.',
        side: 'bottom',
        align: 'end',
      },
    },

    // ================================
    // 🎉 PASO 14: FINAL DEL TUTORIAL
    // ================================
    {
      popover: {
        title: '✅ ¡Tutorial Completado!',
        description:
          '🎉 ¡Felicidades! Ya conoces las funciones principales de MJ GPS. Puedes volver a ver este tutorial desde el botón de información ℹ️.',
        side: 'center',
        align: 'center',
      },
    },
  ]

  // 🚀 Función para iniciar el tutorial
  function iniciarTutorial() {
    // Iniciar tutorial después de un pequeño delay
    setTimeout(() => {
      driverObj.setSteps(pasosTutorial)
      driverObj.drive()
    }, 300)
  }

  // 🎯 Función para ir a un paso específico
  function irAPaso(numeroPaso) {
    driverObj.moveTo(numeroPaso)
  }

  // 🛑 Función para detener el tutorial
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
