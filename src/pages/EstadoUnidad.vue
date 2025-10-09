<template>
  <div class="estado-unidad-container">
    <!-- Header con información principal -->
    <div class="header-section">
      <div class="header-content">
        <div class="unidad-info">
          <div class="icon-wrapper">
            <q-icon name="directions_car" size="40px" color="white" />
          </div>
          <div>
            <h2 class="unidad-nombre">{{ unidad.nombre }}</h2>
            <p class="unidad-placa">{{ unidad.placa }}</p>
          </div>
        </div>
        <q-btn 
          flat 
          round 
          dense 
          icon="close" 
          color="white"
          size="md"
          @click="cerrar"
        />
      </div>

      <!-- Estado de conexión -->
      <div class="conexion-badge" :class="estadoConexion.clase">
        <q-icon :name="estadoConexion.icono" size="16px" />
        <span>{{ estadoConexion.texto }}</span>
      </div>
    </div>

    <!-- Grid de métricas principales -->
    <div class="metricas-principales">
      <div class="metrica-card combustible-card">
        <div class="metrica-header">
          <q-icon name="local_gas_station" size="32px" />
          <span class="metrica-label">Combustible</span>
        </div>
        <div class="metrica-valor-grande">{{ datos.combustible }}%</div>
        <q-linear-progress 
          :value="datos.combustible / 100" 
          color="primary"
          size="8px"
          rounded
        />
        <div class="metrica-detalle">
          {{ calcularLitros(datos.combustible) }} litros aprox.
        </div>
      </div>

      <div class="metrica-card velocidad-card">
        <div class="metrica-header">
          <q-icon name="speed" size="32px" />
          <span class="metrica-label">Velocidad</span>
        </div>
        <div class="metrica-valor-grande">
          {{ datos.velocidad }}
          <span class="unidad">km/h</span>
        </div>
        <div class="metrica-detalle">
          <q-icon name="navigation" size="16px" :style="`transform: rotate(${datos.direccion}deg)`" />
          Dirección: {{ obtenerPuntoCardinal(datos.direccion) }}
        </div>
      </div>

      <div class="metrica-card ignicion-card" :class="datos.ignicion ? 'activo' : 'inactivo'">
        <div class="metrica-header">
          <q-icon :name="datos.ignicion ? 'power_settings_new' : 'power_off'" size="32px" />
          <span class="metrica-label">Ignición</span>
        </div>
        <div class="metrica-valor-estado">
          {{ datos.ignicion ? 'ENCENDIDO' : 'APAGADO' }}
        </div>
        <div class="metrica-detalle">
          Motor {{ datos.ignicion ? 'en marcha' : 'detenido' }}
        </div>
      </div>

      <div class="metrica-card bateria-card">
        <div class="metrica-header">
          <q-icon name="battery_charging_full" size="32px" />
          <span class="metrica-label">Batería</span>
        </div>
        <div class="metrica-valor-grande">
          {{ datos.voltajeBateria }}
          <span class="unidad">V</span>
        </div>
        <q-linear-progress 
          :value="datos.voltajeBateria / 14" 
          :color="datos.voltajeBateria < 11.5 ? 'negative' : 'positive'"
          size="8px"
          rounded
        />
        <div class="metrica-detalle">
          {{ datos.voltajeBateria < 11.5 ? '⚠️ Batería baja' : '✓ Estado normal' }}
        </div>
      </div>
    </div>

    <!-- Sección de GPS y conectividad -->
    <div class="seccion-gps">
      <h3 class="seccion-titulo">
        <q-icon name="satellite_alt" size="24px" />
        GPS y Conectividad
      </h3>
      
      <div class="gps-grid">
        <div class="gps-item">
          <q-icon name="room" color="primary" size="20px" />
          <div>
            <div class="gps-label">Posición</div>
            <div class="gps-valor">{{ datos.latitud }}, {{ datos.longitud }}</div>
          </div>
        </div>

        <div class="gps-item">
          <q-icon name="satellite" color="primary" size="20px" />
          <div>
            <div class="gps-label">Satélites</div>
            <div class="gps-valor">{{ datos.satelites }} conectados</div>
          </div>
        </div>

        <div class="gps-item">
          <q-icon name="signal_cellular_alt" color="primary" size="20px" />
          <div>
            <div class="gps-label">Señal GSM</div>
            <div class="gps-valor">{{ datos.senalGSM }}%</div>
          </div>
        </div>

        <div class="gps-item">
          <q-icon name="gps_fixed" color="primary" size="20px" />
          <div>
            <div class="gps-label">Precisión</div>
            <div class="gps-valor">{{ datos.precision }} metros</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de odómetro y tiempos -->
    <div class="seccion-tiempos">
      <h3 class="seccion-titulo">
        <q-icon name="timeline" size="24px" />
        Odómetro y Tiempos
      </h3>
      
      <div class="tiempos-grid">
        <div class="tiempo-card">
          <q-icon name="route" size="28px" color="primary" />
          <div>
            <div class="tiempo-label">Odómetro Total</div>
            <div class="tiempo-valor">{{ formatearDistancia(datos.odometroTotal) }}</div>
          </div>
        </div>

        <div class="tiempo-card">
          <q-icon name="av_timer" size="28px" color="orange" />
          <div>
            <div class="tiempo-label">Tiempo Motor On</div>
            <div class="tiempo-valor">{{ formatearTiempo(datos.tiempoMotorOn) }}</div>
          </div>
        </div>

        <div class="tiempo-card">
          <q-icon name="schedule" size="28px" color="green" />
          <div>
            <div class="tiempo-label">Última Actualización</div>
            <div class="tiempo-valor">{{ formatearFecha(datos.ultimaActualizacion) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de temperatura (si aplica) -->
    <div class="seccion-temperatura" v-if="datos.temperatura !== null">
      <h3 class="seccion-titulo">
        <q-icon name="thermostat" size="24px" />
        Temperatura
      </h3>
      
      <div class="temperatura-display">
        <div class="temperatura-grande">
          {{ datos.temperatura }}°C
        </div>
        <q-linear-progress 
          :value="(datos.temperatura + 20) / 80" 
          :color="obtenerColorTemperatura(datos.temperatura)"
          size="12px"
          rounded
        />
        <div class="temperatura-rango">
          <span>-20°C</span>
          <span>60°C</span>
        </div>
      </div>
    </div>

    <!-- Sección de alertas -->
    <div class="seccion-alertas" v-if="alertas.length > 0">
      <h3 class="seccion-titulo">
        <q-icon name="warning" size="24px" />
        Alertas Activas
      </h3>
      
      <q-list bordered separator class="alertas-lista">
        <q-item v-for="alerta in alertas" :key="alerta.id" class="alerta-item">
          <q-item-section avatar>
            <q-avatar :color="alerta.severidad" text-color="white" icon="warning" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ alerta.mensaje }}</q-item-label>
            <q-item-label caption>{{ formatearFecha(alerta.fecha) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Botones de acción -->
    <div class="acciones-footer">
      <q-btn 
        outline 
        color="primary" 
        icon="history"
        label="Ver Historial"
        @click="verHistorial"
        class="btn-accion"
      />
      <q-btn 
        outline 
        color="primary" 
        icon="map"
        label="Ver en Mapa"
        @click="verEnMapa"
        class="btn-accion"
      />
      <q-btn 
        outline 
        color="primary" 
        icon="download"
        label="Exportar Datos"
        @click="exportarDatos"
        class="btn-accion"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'EstadoUnidad',
  
  setup(props, { emit }) {
    // Datos de la unidad (estos vendrían de Firebase/API)
    const unidad = ref({
      nombre: 'Unidad 001',
      placa: 'ABC-123',
      capacidadTanque: 50 // litros
    })

    // Datos del FMC130 (simulados - en producción vienen de Firebase en tiempo real)
    const datos = ref({
      // Combustible
      combustible: 75, // porcentaje
      
      // Velocidad y dirección
      velocidad: 45,
      direccion: 135, // grados (0-360)
      
      // Motor
      ignicion: true,
      
      // Batería
      voltajeBateria: 12.8,
      
      // GPS
      latitud: 19.4326,
      longitud: -99.1332,
      satelites: 12,
      precision: 5, // metros
      
      // Conectividad
      senalGSM: 85,
      
      // Odómetro
      odometroTotal: 45678.5, // km
      tiempoMotorOn: 3456, // minutos
      
      // Temperatura (puede ser null si no tiene sensor)
      temperatura: 28,
      
      // Timestamp
      ultimaActualizacion: new Date()
    })

    // Estado de conexión
    const estadoConexion = computed(() => {
      const ahora = new Date()
      const diferencia = ahora - datos.value.ultimaActualizacion
      const minutos = diferencia / 60000

      if (minutos < 2) {
        return { texto: 'En línea', icono: 'wifi', clase: 'conectado' }
      } else if (minutos < 10) {
        return { texto: 'Última señal hace ' + Math.floor(minutos) + ' min', icono: 'wifi_tethering', clase: 'intermitente' }
      } else {
        return { texto: 'Sin señal', icono: 'wifi_off', clase: 'desconectado' }
      }
    })

    // Alertas activas
    const alertas = ref([
      {
        id: 1,
        severidad: 'orange',
        mensaje: 'Velocidad superior a límite establecido',
        fecha: new Date()
      }
    ])

    // Métodos auxiliares
    function calcularLitros(porcentaje) {
      return ((porcentaje / 100) * unidad.value.capacidadTanque).toFixed(1)
    }

    function obtenerPuntoCardinal(grados) {
      const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
      const index = Math.round(grados / 45) % 8
      return puntos[index]
    }

    function formatearDistancia(km) {
      return km.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km'
    }

    function formatearTiempo(minutos) {
      const horas = Math.floor(minutos / 60)
      const mins = minutos % 60
      return `${horas}h ${mins}m`
    }

    function formatearFecha(fecha) {
      return fecha.toLocaleString('es-MX', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    function obtenerColorTemperatura(temp) {
      if (temp < 0) return 'blue'
      if (temp < 20) return 'cyan'
      if (temp < 30) return 'green'
      if (temp < 40) return 'orange'
      return 'red'
    }

    // Acciones
    function cerrar() {
      emit('cerrar')
    }

    function verHistorial() {
      console.log('Ver historial de la unidad')
      // Implementar navegación al historial
    }

    function verEnMapa() {
      console.log('Ver unidad en mapa')
      // Implementar zoom al vehículo en el mapa
    }

    function exportarDatos() {
      console.log('Exportar datos de la unidad')
      // Implementar exportación a Excel/PDF
    }

    return {
      unidad,
      datos,
      estadoConexion,
      alertas,
      calcularLitros,
      obtenerPuntoCardinal,
      formatearDistancia,
      formatearTiempo,
      formatearFecha,
      obtenerColorTemperatura,
      cerrar,
      verHistorial,
      verEnMapa,
      exportarDatos
    }
  }
}
</script>

<style scoped>
.estado-unidad-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow-y: auto;
}

/* Header */
.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.unidad-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 12px;
}

.unidad-nombre {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.unidad-placa {
  margin: 4px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.conexion-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.conexion-badge.conectado {
  background: rgba(76, 175, 80, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.6);
}

.conexion-badge.intermitente {
  background: rgba(255, 152, 0, 0.3);
  border: 1px solid rgba(255, 152, 0, 0.6);
}

.conexion-badge.desconectado {
  background: rgba(244, 67, 54, 0.3);
  border: 1px solid rgba(244, 67, 54, 0.6);
}

/* Métricas principales */
.metricas-principales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  padding: 20px;
}

.metrica-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.metrica-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.metrica-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #667eea;
}

.metrica-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.metrica-valor-grande {
  font-size: 42px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.metrica-valor-grande .unidad {
  font-size: 20px;
  color: #64748b;
  margin-left: 4px;
}

.metrica-valor-estado {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.ignicion-card.activo {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.ignicion-card.activo .metrica-header,
.ignicion-card.activo .metrica-label,
.ignicion-card.activo .metrica-detalle {
  color: white;
}

.ignicion-card.activo .metrica-valor-estado {
  color: white;
}

.ignicion-card.inactivo {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}

.ignicion-card.inactivo .metrica-header,
.ignicion-card.inactivo .metrica-label,
.ignicion-card.inactivo .metrica-detalle {
  color: white;
}

.ignicion-card.inactivo .metrica-valor-estado {
  color: white;
}

.metrica-detalle {
  font-size: 13px;
  color: #64748b;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Secciones */
.seccion-gps,
.seccion-tiempos,
.seccion-temperatura,
.seccion-alertas {
  background: white;
  margin: 0 20px 16px 20px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.seccion-titulo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.gps-grid,
.tiempos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.gps-item,
.tiempo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.gps-label,
.tiempo-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.gps-valor,
.tiempo-valor {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

/* Temperatura */
.temperatura-display {
  text-align: center;
}

.temperatura-grande {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.temperatura-rango {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

/* Alertas */
.alertas-lista {
  border-radius: 12px;
  overflow: hidden;
}

.alerta-item {
  background: #fef3c7;
}

/* Footer acciones */
.acciones-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
  position: sticky;
  bottom: 0;
}

.btn-accion {
  flex: 1;
  border-radius: 12px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .metricas-principales {
    grid-template-columns: 1fr;
  }

  .gps-grid,
  .tiempos-grid {
    grid-template-columns: 1fr;
  }

  .acciones-footer {
    flex-direction: column;
  }
}
</style>