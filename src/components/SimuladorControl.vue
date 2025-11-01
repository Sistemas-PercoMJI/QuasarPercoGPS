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

      <!-- Info de destinos -->
      <div class="info-section">
        <q-icon name="info" color="blue-grey" size="16px" class="q-mr-sm" />
        <span class="info-text">
          {{ conductoresConUnidad }} conductores • {{ totalDestinos }} destinos disponibles
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

watch(
  () => [props.poisIniciales, props.geozonasIniciales],
  ([nuevosPois, nuevasGeozonas]) => {
    if (nuevosPois.length > 0 || nuevasGeozonas.length > 0) {
      console.log('✅ Props recibidas en SimuladorControl:')
      console.log('  📍 POIs:', nuevosPois.length)
      console.log('  🗺️ Geozonas:', nuevasGeozonas.length)
      
      // Actualizar los refs locales
      pois.value = nuevosPois
      geozonas.value = nuevasGeozonas
      
      // 🔧 INICIAR simulación si hay conductores y aún no está activa
      if (conductoresConUnidad.value > 0 && !simulacionActiva.value) {
        console.log('🔄 Generando rutas e iniciando simulación...')
        generarRutasParaUnidades()
        
        // Iniciar simulación automáticamente
        setTimeout(() => {
          toggleSimulacion()
        }, 500)
      }
    }
  },
  { deep: true, immediate: true }
)

const emit = defineEmits(['recargar-datos', 'iniciar-simulacion'])

// Composables
const { simulacionActiva, toggleSimulacion: toggleSim } = useSimuladorUnidades()
const { estadisticas } = useTrackingUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()

// Estado local
const expanded = ref(false)
const loading = ref(false)
const activityLogs = ref([])

const pois = computed(() => props.poisIniciales)
const geozonas = computed(() => props.geozonasIniciales)

const totalDestinos = computed(() => {
  return pois.value.length + geozonas.value.length
})

// 🔧 FUNCIÓN MEJORADA: Genera rutas ÚNICAS para cada unidad
const generarRutasParaUnidades = () => {
  if (!conductores.value || !unidades.value) {
    console.warn('⚠️ No hay conductores o unidades para generar rutas')
    return
  }

  // Crear lista de destinos (POIs y Geozonas)
  const destinos = []
  
  // Agregar POIs como destinos
  pois.value.forEach(poi => {
    if (poi.coordenadas) {
      destinos.push({
        id: poi.id,
        lat: poi.coordenadas.lat,
        lng: poi.coordenadas.lng,
        nombre: poi.nombre,
        tipo: 'poi',
        radio: poi.radio || 100,
        prioridad: 1
      })
    }
  })
  
  // Agregar Geozonas como destinos
  geozonas.value.forEach(geozona => {
    let centro = null
    
    if (geozona.tipoGeozona === 'circular' && geozona.centro) {
      centro = geozona.centro
    } else if (geozona.tipoGeozona === 'poligono' && geozona.puntos && geozona.puntos.length > 0) {
      centro = calcularCentroPoligono(geozona.puntos)
    }
    
    if (centro) {
      destinos.push({
        id: geozona.id,
        lat: centro.lat,
        lng: centro.lng,
        nombre: geozona.nombre,
        tipo: 'geozona',
        radio: geozona.radio || 100,
        prioridad: 2
      })
    }
  })
  
  // Si no hay suficientes destinos, agregar puntos por defecto
  if (destinos.length < 2) {
    console.warn('⚠️ No hay suficientes POIs/Geozonas, usando destinos por defecto')
    destinos.push(
      { 
        id: 'defecto1', 
        lat: 32.504421823945805, 
        lng: -116.9514484543167, 
        nombre: 'MJ Industrias', 
        tipo: 'defecto',
        prioridad: 3
      },
      { 
        id: 'defecto2', 
        lat: 32.51442183945805, 
        lng: -116.9414484543167, 
        nombre: 'Punto Norte', 
        tipo: 'defecto',
        prioridad: 3
      },
      { 
        id: 'defecto3', 
        lat: 32.52442183945805, 
        lng: -116.9614484543167, 
        nombre: 'Punto Este', 
        tipo: 'defecto',
        prioridad: 3
      }
    )
  }
  
  console.log(`🎯 ${destinos.length} destinos disponibles para las rutas`)
  console.log('📍 Destinos:', destinos.map(d => `${d.nombre} (${d.tipo})`).join(', '))
  
  // 🔧 CRÍTICO: Mezclar destinos para que cada unidad tenga ruta diferente
  const destinosMezclados = [...destinos]
  for (let i = destinosMezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [destinosMezclados[i], destinosMezclados[j]] = [destinosMezclados[j], destinosMezclados[i]]
  }
  
  // Asignar rutas ÚNICAS a cada unidad
  conductores.value.forEach((conductor, indexConductor) => {
    if (conductor.UnidadAsignada) {
      const unidad = unidades.value.find(u => u.id === conductor.UnidadAsignada)
      if (!unidad) return
      
      // 🔧 NUEVO: Crear ruta DIFERENTE para cada unidad
      const ruta = crearRutaUnicaParaUnidad(destinosMezclados, indexConductor, destinos.length)
      
      // Asignar la ruta a la unidad
      unidad.ruta = ruta
      unidad.indiceRutaActual = 0
      unidad.destinoActual = ruta[0]
      unidad.ultimoPuntoTiempo = Date.now()
      unidad.ultimoCambioDestino = Date.now()
      
      // Establecer posición inicial en el primer punto de la ruta
      if (ruta.length > 0) {
        unidad.lat = ruta[0].lat
        unidad.lng = ruta[0].lng
        unidad.estado = 'movimiento'
        unidad.velocidad = Math.floor(Math.random() * 20) + 40
        unidad.velocidadBase = unidad.velocidad
      }
      
      console.log(`🚗 Ruta ÚNICA asignada a ${unidad.Unidad}:`)
      console.log(`   📍 Destinos: ${ruta.map(d => d.nombre).join(' → ')}`)
    }
  })
}

// 🔧 NUEVA FUNCIÓN: Crear ruta única para cada unidad
const crearRutaUnicaParaUnidad = (destinosDisponibles, indexUnidad, totalDestinos) => {
  const ruta = []
  const numDestinos = Math.min(4, Math.max(2, totalDestinos))
  
  // 🔧 CLAVE: Cada unidad empieza en un offset diferente en la lista de destinos
  const offset = (indexUnidad * 3) % destinosDisponibles.length
  
  for (let i = 0; i < numDestinos; i++) {
    const indiceDestino = (offset + i) % destinosDisponibles.length
    const destino = destinosDisponibles[indiceDestino]
    
    ruta.push({
      ...destino,
      ordenVisita: i,
      tiempoEstimadoLlegada: Date.now() + (i * 5 * 60 * 1000)
    })
  }
  
  // Agregar punto de retorno al inicio para hacer la ruta circular
  if (ruta.length > 1) {
    ruta.push({
      ...ruta[0],
      esRetorno: true,
      ordenVisita: ruta.length
    })
  }
  
  return ruta
}

// Función para calcular el centro de un polígono
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

const recargarDatos = async () => {
  loading.value = true
  try {
    await Promise.all([
      obtenerConductores(),
      obtenerUnidades()
    ])
    
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

const stats = computed(() => estadisticas())

const conductoresConUnidad = computed(() => {
  return conductores.value.filter(c => c.UnidadAsignada).length
})

watch([pois, geozonas], ([nuevoPois, nuevasGeozonas]) => {
  console.log('📊 Datos actualizados en SimuladorControl:', {
    pois: nuevoPois.length,
    geozonas: nuevasGeozonas.length
  })
}, { immediate: true })

onMounted(async () => {
  await recargarDatos()
  
  // 🔧 ESPERAR a que lleguen los props antes de generar rutas
  if (conductoresConUnidad.value > 0) {
    // Esperar un tick para que el watch procese los props
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verificar si los datos llegaron
    if (pois.value.length > 0 || geozonas.value.length > 0) {
      console.log('✅ Iniciando simulación con datos reales...')
      generarRutasParaUnidades()
      await toggleSimulacion()
    } else {
      console.log('⚠️ Esperando datos de POIs/Geozonas...')
      // El watch se encargará cuando lleguen
    }
  }
})

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
    // 🔧 IMPORTANTE: Generar rutas si no existen
    if (!unidades.value.some(u => u.ruta && u.ruta.length > 0)) {
      generarRutasParaUnidades()
    }
    
    await toggleSim(conductores.value, unidades.value)
    
    const message = simulacionActiva.value 
      ? `Simulación iniciada con ${conductoresConUnidad.value} unidades en ruta`
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

    emit('iniciar-simulacion', {
      activa: simulacionActiva.value,
      unidades: conductoresConUnidad.value
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
  
  if (activityLogs.value.length > 5) {
    activityLogs.value.pop()
  }
}

watch(() => stats.value.enMovimiento, (newVal, oldVal) => {
  if (simulacionActiva.value && newVal !== oldVal && newVal > 0) {
    addLog('directions_car', `${newVal} en movimiento`, 'primary')
  }
})
</script>

<style scoped>
.simulador-fab {
  box-shadow: 0 4px 12px rgba(103, 58, 183, 0.4);
  transition: all 0.3s ease;
}

.simulador-fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(103, 58, 183, 0.6);
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