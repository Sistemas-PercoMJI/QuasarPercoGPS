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

      <!-- 🔧 CAMBIADO: Mostrar info de destinos -->
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
import { useEventDetection } from 'src/composables/useEventDetection'

const $q = useQuasar()

// 🔧 NUEVO: Recibir POIs y Geozonas como props
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

// Composables
const { simulacionActiva, toggleSimulacion: toggleSim } = useSimuladorUnidades()
const { estadisticas } = useTrackingUnidades()
const { conductores, unidades, obtenerConductores, obtenerUnidades } = useConductoresFirebase()
const { evaluarEventosParaUnidadesSimulacion } = useEventDetection()

// Estado local
const expanded = ref(false)
const loading = ref(false)
const activityLogs = ref([])
const emit = defineEmits(['recargar-datos', 'iniciar-simulacion'])

// 🔧 CORREGIDO: Usar props en lugar de refs vacíos
const pois = computed(() => props.poisIniciales)
const geozonas = computed(() => props.geozonasIniciales)

// 🔧 NUEVO: Computed para total de destinos
const totalDestinos = computed(() => {
  return pois.value.length + geozonas.value.length
})

// 🔧 SIMPLIFICADO: Recargar solo conductores y unidades
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

// Función para generar rutas inteligentes que pasen por POIs y Geozonas
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
        nombre: 'Punto 2', 
        tipo: 'defecto',
        prioridad: 3
      }
    )
  }
  
  console.log(`🎯 Se encontraron ${destinos.length} destinos para las rutas`)
  
  // Asignar rutas inteligentes a cada unidad
  conductores.value.forEach((conductor, index) => {
    if (conductor.UnidadAsignada) {
      const unidad = unidades.value.find(u => u.id === conductor.UnidadAsignada)
      if (!unidad) return
      
      const ruta = crearRutaInteligente(destinos, index)
      
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
      
      console.log(`🚗 Ruta inteligente asignada a unidad ${unidad.Unidad}:`)
      console.log(`   📍 Destinos: ${ruta.map(d => d.nombre).join(' → ')}`)
    }
  })
}

// Función para crear rutas inteligentes
const crearRutaInteligente = (destinos, indexUnidad) => {
  const ruta = []
  const destinosDisponibles = [...destinos]
  
  const numDestinosPorUnidad = Math.min(5, Math.max(3, Math.floor(destinos.length / Math.max(1, conductores.value.length))))
  
  // Ordenar destinos por prioridad (POIs primero, luego Geozonas)
  destinosDisponibles.sort((a, b) => a.prioridad - b.prioridad)
  
  const indiceInicio = (indexUnidad * 2) % destinosDisponibles.length
  
  // Seleccionar destinos para esta unidad
  for (let i = 0; i < numDestinosPorUnidad && i < destinosDisponibles.length; i++) {
    const indiceDestino = (indiceInicio + i) % destinosDisponibles.length
    const destino = destinosDisponibles[indiceDestino]
    
    ruta.push({
      ...destino,
      ordenVisita: i,
      tiempoEstimadoLlegada: Date.now() + (i * 5 * 60 * 1000)
    })
  }
  
  // Agregar punto de retorno al inicio
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

// Función para mover unidades hacia sus destinos
const moverUnidadHaciaDestino = (unidad) => {
  if (!unidad.destinoActual || !unidad.ruta || unidad.ruta.length === 0) return
  
  const ahora = Date.now()
  const tiempoTranscurrido = (ahora - unidad.ultimoPuntoTiempo) / 1000
  
  const velocidadMs = (unidad.velocidad * 1000) / 3600
  const distanciaAMover = velocidadMs * tiempoTranscurrido
  
  const distanciaAlDestino = calcularDistancia(
    unidad.lat, unidad.lng,
    unidad.destinoActual.lat, unidad.destinoActual.lng
  )
  
  if (distanciaAMover >= distanciaAlDestino) {
    unidad.lat = unidad.destinoActual.lat
    unidad.lng = unidad.destinoActual.lng
    
    console.log(`📍 Unidad ${unidad.nombre} llegó a: ${unidad.destinoActual.nombre} (${unidad.destinoActual.tipo})`)
    
    evaluarEventosParaUnidadesSimulacion([unidad])
    
    unidad.indiceRutaActual = (unidad.indiceRutaActual + 1) % unidad.ruta.length
    unidad.destinoActual = unidad.ruta[unidad.indiceRutaActual]
    unidad.ultimoCambioDestino = ahora
    
    unidad.estado = 'detenido'
    unidad.velocidad = 0
    
    setTimeout(() => {
      unidad.estado = 'movimiento'
      unidad.velocidad = unidad.velocidadBase
      console.log(`🚗 Unidad ${unidad.nombre} reanudando viaje hacia: ${unidad.destinoActual.nombre}`)
    }, 3000)
    
  } else {
    const proporcion = distanciaAMover / distanciaAlDestino
    unidad.lat = unidad.lat + (unidad.destinoActual.lat - unidad.lat) * proporcion
    unidad.lng = unidad.lng + (unidad.destinoActual.lng - unidad.lng) * proporcion
    
    if (Math.random() < 0.1) {
      unidad.velocidad = Math.max(30, Math.min(70, unidad.velocidad + (Math.random() - 0.5) * 10))
    }
  }
  
  unidad.ultimoPuntoTiempo = ahora
}

// Función para calcular distancia
const calcularDistancia = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Computed
const stats = computed(() => estadisticas())

const conductoresConUnidad = computed(() => {
  return conductores.value.filter(c => c.UnidadAsignada).length
})

// 🔧 NUEVO: Watch para debug de datos
watch([pois, geozonas], ([nuevoPois, nuevasGeozonas]) => {
  console.log('📊 Datos actualizados en SimuladorControl:', {
    pois: nuevoPois.length,
    geozonas: nuevasGeozonas.length
  })
}, { immediate: true })

onMounted(async () => {
  // Esperar a que se carguen los datos iniciales
  await recargarDatos()
  
  // Si hay conductores con unidades asignadas, iniciar simulación automáticamente
  if (conductoresConUnidad.value > 0) {
    console.log('✅ Iniciando simulación automáticamente...')
    
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
    // Generar rutas inteligentes si no existen
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

    // 🔧 NUEVO: Emitir evento
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

// Watch para agregar logs automáticos
watch(() => stats.value.enMovimiento, (newVal, oldVal) => {
  if (simulacionActiva.value && newVal !== oldVal && newVal > 0) {
    addLog('directions_car', `${newVal} en movimiento`, 'primary')
  }
})

// Watch para mover unidades cuando la simulación está activa
watch(() => simulacionActiva.value, (isActive) => {
  if (isActive) {
    const intervaloMovimiento = setInterval(() => {
      if (simulacionActiva.value) {
        unidades.value.forEach(unidad => {
          if (unidad.estado === 'movimiento' && unidad.destinoActual) {
            moverUnidadHaciaDestino(unidad)
          }
        })
      } else {
        clearInterval(intervaloMovimiento)
      }
    }, 2000)
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