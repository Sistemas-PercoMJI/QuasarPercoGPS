import { ref } from 'vue'

const notifications = ref([
  {
    id: 1,
    type: 'warning',
    title: 'Velocidad excedida',
    message: 'Unidad 101 superó el límite de velocidad',
  },
  {
    id: 2,
    type: 'info',
    title: 'Mantenimiento programado',
    message: 'Unidad 205 requiere servicio en 500 km',
  },
  {
    id: 3,
    type: 'negative',
    title: 'Alerta crítica',
    message: 'Unidad 303 fuera de geozona autorizada',
  },
])

let nextId = 4

export function useNotifications() {
  function addNotification(type, title, message) {
    notifications.value.unshift({
      id: nextId++,
      type,
      title,
      message,
      timestamp: new Date(),
    })
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearAll() {
    notifications.value = []
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  }
}
