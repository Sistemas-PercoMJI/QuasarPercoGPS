import { ref } from 'vue'

const notifications = ref([])
let nextId = 1

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
