<template>
  <q-card class="simulador-card">
    <q-card-section class="simulador-header">
      <div class="header-content">
        <q-icon name="play_circle" size="32px" :color="simulacionActiva ? 'green' : 'grey'" />
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
        :icon="expanded ? 'expand_less' : 'expand_more'"
        @click="expanded = !expanded"
      />
    </q-card-section>

    <q-slide-transition>
      <div v-show="expanded">
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
              :label="simulacionActiva ? 'Detener Simulación' : 'Iniciar Simulación'"
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
              label="Recargar Datos"
              @click="recargarDatos"
              class="full-width q-mt-sm"
              :disable="loading"
            />
          </div>

          <!-- Advertencia si no hay conductores -->
          <q-banner v-if="conductoresConUnidad === 0" rounded class="bg-orange-2 text-orange-9 q-mt-md">
            <template v-slot:avatar>
              <q-icon name="warning" color="orange" />
            </template>
            No hay conductores con unidades asignadas. Por favor, asigna unidades primero.
          </q-banner>

          <!-- Log de actividad (opcional) -->
          <div v-if="simulacionActiva" class="activity-log q-mt-md">
            <div class="log-header">
              <q-icon name="history" size="16px" class="q-mr-sm" />
              <span>Actividad</span>
            </div>
            <div class="log-content">
              <div v-for="(log, index) in activityLogs" :key="index" class="log-item">
                <q-icon :name="log.icon" :color="log.color" size="14px" />
                <span>{{ log.message }}</span>
                <span class="log-time">{{ log.time }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </div>
    </q-slide-transition>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSimuladorUnidades } from 'src/composables/useSimuladorUnidades'
import { useTrackingUnidades } from 'src/composables/useTrackingUnidades'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Composables
const { simulacionActiva, toggleSimulacion: toggleSim } = useSimuladorUnidades()
const { estadisticas } = useTrackingUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()

// Estado local
const expanded = ref(true)
const loading = ref(false)
const activityLogs = ref([])

// Computed
const stats = computed(() => estadisticas())

const conductoresConUnidad = computed(() => {
  return conductores.value.filter(c => c.UnidadAsignada).length
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

const recargarDatos = async () => {
  loading.value = true
  try {
    await Promise.all([
      obtenerConductores(),
      obtenerUnidades()
    ])
    
    $q.notify({
      type: 'positive',
      message: 'Datos recargados correctamente',
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

const addLog = (icon, message, color) => {
  const now = new Date()
  const time = now.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
  
  activityLogs.value.unshift({
    icon,
    message,
    color,
    time
  })
  
  // Mantener solo los últimos 10 logs
  if (activityLogs.value.length > 10) {
    activityLogs.value.pop()
  }
}

// Cargar datos iniciales
recargarDatos()

// Watch para agregar logs automáticos
watch(() => stats.value.enMovimiento, (newVal, oldVal) => {
  if (simulacionActiva.value && newVal !== oldVal) {
    addLog('directions_car', `${newVal} unidades en movimiento`, 'primary')
  }
})
</script>

<style scoped>
.simulador-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
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
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #212121;
}

.info-section {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #e3f2fd;
  border-radius: 8px;
  margin-bottom: 16px;
}

.info-text {
  font-size: 13px;
  color: #1976d2;
}

.controls-section {
  display: flex;
  flex-direction: column;
}

.activity-log {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
}

.log-header {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 12px;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-time {
  margin-left: auto;
  color: #9e9e9e;
  font-size: 11px;
}
</style>
