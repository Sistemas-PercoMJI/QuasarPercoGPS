<template>
  <!-- Versión colapsada - Solo muestra estado -->
  <q-btn
    v-if="!expanded"
    fab
    :color="simulacionActiva ? 'positive' : 'grey'"
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
      {{ simulacionActiva ? `${stats.total} unidades activas` : 'Cargando simulador...' }}
    </q-tooltip>
  </q-btn>

  <!-- Versión expandida - Panel de estadísticas -->
  <q-card v-else class="simulador-card-expandido">
    <q-card-section class="simulador-header">
      <div class="header-content">
        <q-icon name="explore" size="32px" color="green" />
        <div class="header-text">
          <div class="header-title">Simulador GPS</div>
          <div class="header-subtitle">
            <q-icon name="fiber_manual_record" size="10px" color="green" class="pulse-icon" />
            Activo
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
          <q-icon name="pause_circle" color="orange" size="20px" />
          <div class="stat-content">
            <div class="stat-label">Detenidas</div>
            <div class="stat-value">{{ stats.detenidas }}</div>
          </div>
        </div>

        <div class="stat-item">
          <q-icon name="power_settings_new" color="blue-grey" size="20px" />
          <div class="stat-content">
            <div class="stat-label">Inactivas</div>
            <div class="stat-value">{{ stats.inactivas }}</div>
          </div>
        </div>

        <div class="stat-item">
          <q-icon name="speed" color="purple" size="20px" />
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

      <!-- Info de destinos -->
      <div class="info-section">
        <q-icon name="info" color="blue-grey" size="16px" class="q-mr-sm" />
        <span class="info-text">
          {{ conductoresConUnidad }} conductores • {{ totalDestinos }} destinos disponibles
        </span>
      </div>

      <!-- Estado del sistema -->
      <div class="status-section">
        <q-linear-progress 
          :value="stats.porcentajeActivo / 100" 
          color="positive"
          class="q-mb-sm"
          rounded
          size="8px"
        />
        <div class="status-text">
          Sistema operando automáticamente
        </div>
      </div>

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
import { ref, computed, watch, onMounted } from 'vue'
import { useSimuladorUnidades } from 'src/composables/useSimuladorUnidades'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  poisIniciales: {
    type: Array,
    default: () => []
  },
  geozonasIniciales: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['iniciar-simulacion'])

// Composables
const { simulacionActiva, iniciarSimulacion } = useSimuladorUnidades()
const { estadisticas } = useTrackingUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()

// Estado local
const expanded = ref(false)
const activityLogs = ref([])
const pois = computed(() => props.poisIniciales)
const geozonas = computed(() => props.geozonasIniciales)

const totalDestinos = computed(() => {
  return pois.value.length + geozonas.value.length
})

const stats = computed(() => estadisticas())

const conductoresConUnidad = computed(() => {
  return conductores.value.filter(c => c.UnidadAsignada).length
})

// 🔧 Función para cargar datos
const cargarDatos = async () => {
  try {
    await Promise.all([
      obtenerConductores(),
      obtenerUnidades()
    ])
    
    console.log('🔄 Datos cargados:', {
      conductores: conductores.value.length,
      unidades: unidades.value.length,
      pois: pois.value.length,
      geozonas: geozonas.value.length
    })
  } catch (error) {
    console.error('Error al cargar datos:', error)
  }
}

// 🚀 Función para iniciar simulación automáticamente
const iniciarSimulacionAutomatica = async () => {
  if (simulacionActiva.value) {
    console.log('⚠️ Simulación ya está activa')
    return
  }

  if (conductoresConUnidad.value === 0) {
    console.log('⚠️ Esperando conductores con unidades asignadas...')
    return
  }

  try {
    console.log('🚀 Iniciando simulación automática...')
    
    await iniciarSimulacion(conductores.value, unidades.value)
    
    addLog('play_circle', `Simulación iniciada con ${conductoresConUnidad.value} unidades`, 'green')
    
    $q.notify({
      type: 'positive',
      message: `Simulador GPS activo: ${conductoresConUnidad.value} unidades`,
      position: 'top',
      timeout: 3000
    })

    emit('iniciar-simulacion', {
      activa: true,
      unidades: conductoresConUnidad.value
    })
  } catch (error) {
    console.error('Error al iniciar simulación:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al iniciar simulación',
      position: 'top'
    })
  }
}

// 📊 Agregar log de actividad
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
  
  if (activityLogs.value.length > 5) {
    activityLogs.value.pop()
  }
}

// 👀 Watch para logs de cambio de estado
watch(() => stats.value.enMovimiento, (newVal, oldVal) => {
  if (simulacionActiva.value && newVal !== oldVal && newVal > 0) {
    addLog('directions_car', `${newVal} unidades en movimiento`, 'primary')
  }
})

// 👀 Watch para iniciar cuando lleguen datos
watch(
  () => [props.poisIniciales, props.geozonasIniciales, conductoresConUnidad.value],
  async ([nuevosPois, nuevasGeozonas, conductoresCount]) => {
    if ((nuevosPois.length > 0 || nuevasGeozonas.length > 0) && conductoresCount > 0) {
      if (!simulacionActiva.value) {
        console.log('✅ Datos listos, iniciando simulación...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        await iniciarSimulacionAutomatica()
      }
    }
  },
  { deep: true }
)

// 🎬 Al montar el componente
onMounted(async () => {
  console.log('📱 SimuladorControl montado - Modo automático')
  
  await cargarDatos()
  
  // Esperar un poco para que todo se cargue
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Intentar iniciar automáticamente
  if (conductoresConUnidad.value > 0) {
    await iniciarSimulacionAutomatica()
  } else {
    console.log('⏳ Esperando asignación de unidades...')
  }
})
</script>

<style scoped>
.simulador-fab {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  transition: all 0.3s ease;
}

.simulador-fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6);
}

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
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.pulse-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

.status-section {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
}

.status-text {
  font-size: 11px;
  color: #4caf50;
  text-align: center;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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