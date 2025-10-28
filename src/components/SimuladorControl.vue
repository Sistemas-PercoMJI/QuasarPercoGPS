<template>
  <!-- Versión colapsada - Solo botón flotante -->
  <q-btn
    v-if="!expanded"
    fab
    :color="simulacionActiva ? 'positive' : 'purple'"
    icon="explore"
    class="simulador-fab"
    @click="expanded = true"
    size="md"
  >
    <q-badge
      v-if="stats.total > 0"
      color="red"
      floating
      rounded
    >
      {{ stats.total }}
    </q-badge>
    <q-tooltip>
      {{ simulacionActiva ? `${stats.total} unidades activas` : 'Abrir simulador GPS' }}
    </q-tooltip>
  </q-btn>

  <!-- Versión expandida - Panel completo -->
  <q-card v-else class="simulador-card-expandido">
    <q-card-section class="simulador-header">
      <div class="header-content">
        <q-icon name="explore" size="32px" :color="simulacionActiva ? 'green' : 'grey'" />
        <div class="header-text">
          <div class="header-title">Simulador GPS</div>
          <div class="header-subtitle">
            {{ simulacionActiva ? 'Activo' : 'Inactivo' }}
          </div>
        </div>
      </div>
      
      <q-btn
        round
        dense
        flat
        icon="close"
        color="white"
        @click="expanded = false"
      >
        <q-tooltip>Minimizar</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator />
    
    <q-card-section>
      <!-- Estadísticas -->
      <div class="stats-container">
        <div class="stat-item">
          <q-icon name="directions_car" color="primary" size="20px" />
          <div class="stat-content">
            <div class="stat-label">Unidades</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </div>

        <div class="stat-item">
          <q-icon name="navigation" color="green" size="20px" />
          <div class="stat-content">
            <div class="stat-label">En movimiento</div>
            <div class="stat-value">{{ stats.enMovimiento }}</div>
          </div>
        </div>

        <div class="stat-item">
          <q-icon name="speed" color="orange" size="20px" />
          <div class="stat-content">
            <div class="stat-label">Velocidad prom.</div>
            <div class="stat-value">{{ stats.velocidadPromedio }} km/h</div>
          </div>
        </div>

        <div class="stat-item">
          <q-icon name="battery_charging_full" color="blue" size="20px" />
          <div class="stat-content">
            <div class="stat-label">Activo</div>
            <div class="stat-value">{{ stats.porcentajeActivo }}%</div>
          </div>
        </div>
      </div>

      <!-- Información de conductores -->
      <div class="info-section">
        <q-icon name="info" color="blue-grey" size="16px" class="q-mr-sm" />
        <span class="info-text">
          {{ conductoresConUnidad }} conductores con unidad asignada
        </span>
      </div>

      <!-- Controles -->
      <div class="controls-section">
        <q-btn
          :color="simulacionActiva ? 'red' : 'primary'"
          :icon="simulacionActiva ? 'stop' : 'play_arrow'"
          :label="simulacionActiva ? 'Detener' : 'Iniciar'"
          :loading="loading"
          @click="toggleSimulacion"
          class="full-width"
          unelevated
          :disable="conductoresConUnidad === 0"
        />

        <q-btn
          v-if="!simulacionActiva"
          flat
          color="primary"
          icon="refresh"
          label="Recargar"
          @click="recargarDatos"
          class="full-width q-mt-sm"
          :disable="loading"
          size="sm"
        />
      </div>

      <!-- Advertencia si no hay conductores -->
      <q-banner v-if="conductoresConUnidad === 0" rounded class="bg-orange-2 text-orange-9 q-mt-md">
        <template v-slot:avatar>
          <q-icon name="warning" color="orange" />
        </template>
        <div class="text-caption">
          Asigna unidades a conductores para simular
        </div>
      </q-banner>

      <!-- Log de actividad (compacto) -->
      <div v-if="simulacionActiva && activityLogs.length > 0" class="activity-log q-mt-md">
        <div class="log-header">
          <q-icon name="history" size="14px" class="q-mr-xs" />
          <span>Actividad reciente</span>
        </div>
        <div class="log-content">
          <div v-for="(log, index) in activityLogs.slice(0, 3)" :key="index" class="log-item">
            <q-icon :name="log.icon" :color="log.color" size="12px" />
            <span class="log-message">{{ log.message }}</span>
            <span class="log-time">{{ log.time }}</span>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSimuladorUnidades } from 'src/composables/useSimuladorUnidades'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'
import { useQuasar } from 'quasar'
import { onMounted } from 'vue'

const $q = useQuasar()

// Composables
const { simulacionActiva, toggleSimulacion: toggleSim } = useSimuladorUnidades()
const { estadisticas } = useTrackingUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()

// Estado local
const expanded = ref(false)
const loading = ref(false)
const activityLogs = ref([])
const emit = defineEmits(['recargar-datos'])

// 🆕 NUEVO: Variables para POIs y Geozonas
const pois = ref([])
const geozonas = ref([])

// 🆕 NUEVO: Función para recargar datos incluyendo POIs y Geozonas
const recargarDatos = async () => {
  loading.value = true
  try {
    // Recargar datos existentes
    await Promise.all([
      obtenerConductores(),
      obtenerUnidades()
    ])
    
    // 🆕 NUEVO: Recargar POIs y Geozonas
    const { pois: poisData, geozonas: geozonasData } = await emit('recargar-datos')
    pois.value = poisData || []
    geozonas.value = geozonasData || []
    
    console.log('🔄 Datos recargados:', {
      conductores: conductores.value.length,
      unidades: unidades.value.length,
      pois: pois.value.length,
      geozonas: geozonas.value.length
    })
    
    $q.notify({
      type: 'positive',
      message: 'Datos recargados',
      position: 'top'
    })
    
    addLog('refresh', 'Datos actualizados', 'blue')
  } catch (error) {
    console.error('Error al recargar datos:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al recargar datos',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// 🆕 NUEVO: Función para generar rutas que pasen por POIs y Geozonas
const generarRutasParaUnidades = () => {
  if (!conductores.value || !unidades.value || pois.value.length === 0) return
  
  // Obtener todas las ubicaciones (POIs y centros de geozonas)
  const ubicaciones = []
  
  // Agregar POIs
  pois.value.forEach(poi => {
    if (poi.coordenadas) {
      ubicaciones.push({
        lat: poi.coordenadas.lat,
        lng: poi.coordenadas.lng,
        nombre: poi.nombre,
        tipo: 'poi'
      })
    }
  })
  
  // Agregar centros de geozonas
  geozonas.value.forEach(geozona => {
    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      ubicaciones.push({
        lat: geozona.centro.lat,
        lng: geozona.centro.lng,
        nombre: geozona.nombre,
        tipo: 'geozona'
      })
    } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos && geozona.puntos.length > 0) {
      // Calcular centro del polígono
      const centro = calcularCentroPoligono(geozona.puntos)
      ubicaciones.push({
        lat: centro.lat,
        lng: centro.lng,
        nombre: geozona.nombre,
        tipo: 'geozona'
      })
    }
  })
  
  // Si no hay suficientes ubicaciones, agregar algunas por defecto
  if (ubicaciones.length < 2) {
    ubicaciones.push(
      { lat: 32.504421823945805, lng: -116.9514484543167, nombre: 'MJ Industrias', tipo: 'defecto' },
    )
  }
  
  // Asignar rutas a las unidades de los conductores
  conductores.value.forEach(conductor => {
    if (conductor.UnidadAsignada) {
      // Crear una ruta aleatoria para esta unidad
      const ruta = []
      const indicesUsados = new Set()
      
      // Seleccionar entre 3 y 6 puntos para la ruta
      const numPuntos = Math.min(Math.max(3, Math.floor(Math.random() * 4) + 3), ubicaciones.length)
      
      while (ruta.length < numPuntos) {
        const indice = Math.floor(Math.random() * ubicaciones.length)
        if (!indicesUsados.has(indice)) {
          indicesUsados.add(indice)
          ruta.push(ubicaciones[indice])
        }
      }
      
      // Guardar la ruta en la unidad
      const unidad = unidades.value.find(u => u.id === conductor.UnidadAsignada)
      if (unidad) {
        unidad.ruta = ruta
        unidad.indiceRutaActual = 0
        unidad.ultimoPuntoTiempo = Date.now()
        
        // Establecer posición inicial en el primer punto de la ruta
        if (ruta.length > 0) {
          unidad.lat = ruta[0].lat
          unidad.lng = ruta[0].lng
          unidad.estado = 'movimiento' // Siempre en movimiento
          unidad.velocidad = Math.floor(Math.random() * 30) + 40 // 40-70 km/h
        }
        
        console.log(`🚗 Ruta asignada a unidad ${unidad.nombre}: ${ruta.length} puntos`)
      }
    }
  })
}

// 🆕 NUEVO: Función para calcular el centro de un polígono
const calcularCentroPoligono = (puntos) => {
  let lat = 0, lng = 0
  puntos.forEach(punto => {
    lat += punto.lat
    lng += punto.lng
  })
  return {
    lat: lat / puntos.length,
    lng: lng / puntos.length
  }
}

// Computed
const stats = computed(() => estadisticas())

const conductoresConUnidad = computed(() => {
  return conductores.value.filter(c => c.UnidadAsignada).length
})

onMounted(async () => {
  // Esperar a que se carguen los datos iniciales
  await recargarDatos()
  
  // Si hay conductores con unidades asignadas, iniciar simulación automáticamente
  if (conductoresConUnidad.value > 0) {
    console.log('Iniciando simulación automáticamente...')
    
    // 🆕 NUEVO: Generar rutas antes de iniciar la simulación
    generarRutasParaUnidades()
    
    await toggleSimulacion()
  }
})

// Métodos
const toggleSimulacion = async () => {
  if (conductoresConUnidad.value === 0) {
    $q.notify({
      type: 'warning',
      message: 'No hay conductores con unidades asignadas',
      position: 'top'
    })
    return
  }

  loading.value = true
  try {
    // 🆕 NUEVO: Generar rutas si no existen
    if (!unidades.value.some(u => u.ruta && u.ruta.length > 0)) {
      generarRutasParaUnidades()
    }
    
    await toggleSim(conductores.value, unidades.value)
    
    const message = simulacionActiva.value 
      ? `Simulación iniciada con ${conductoresConUnidad.value} unidades`
      : 'Simulación detenida'
    
    addLog(
      simulacionActiva.value ? 'play_circle' : 'stop_circle',
      message,
      simulacionActiva.value ? 'green' : 'red'
    )
    
    $q.notify({
      type: simulacionActiva.value ? 'positive' : 'info',
      message,
      position: 'top'
    })
  } catch (error) {
    console.error('Error al toggle simulación:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al controlar la simulación',
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

const addLog = (icon, message, color) => {
  const now = new Date()
  const time = now.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
  
  activityLogs.value.unshift({
    icon,
    message,
    color,
    time
  })
  
  // Mantener solo los últimos 5 logs
  if (activityLogs.value.length > 5) {
    activityLogs.value.pop()
  }
}

// Cargar datos iniciales
recargarDatos()

// Watch para agregar logs automáticos
watch(() => stats.value.enMovimiento, (newVal, oldVal) => {
  if (simulacionActiva.value && newVal !== oldVal && newVal > 0) {
    addLog('directions_car', `${newVal} en movimiento`, 'primary')
  }
})
</script>

<style scoped>
/* Botón flotante (FAB) */
.simulador-fab {
  box-shadow: 0 4px 12px rgba(103, 58, 183, 0.4);
  transition: all 0.3s ease;
}

.simulador-fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(103, 58, 183, 0.6);
}

/* Card expandido */
.simulador-card-expandido {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  animation: expandIn 0.3s ease-out;
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.simulador-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 12px;
  opacity: 0.9;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 10px;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: #212121;
}

.info-section {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #e3f2fd;
  border-radius: 8px;
  margin-bottom: 12px;
}

.info-text {
  font-size: 12px;
  color: #1976d2;
}

.controls-section {
  display: flex;
  flex-direction: column;
}

.activity-log {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px;
}

.log-header {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: white;
  border-radius: 4px;
  font-size: 11px;
}

.log-message {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-time {
  color: #9e9e9e;
  font-size: 10px;
}
</style>