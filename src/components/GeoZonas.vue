<template>
  <!-- Todo tu código de template permanece igual -->
  <div class="geozonas-drawer">
    <!-- Header con tabs modernos -->
    <div class="drawer-header">
      <div class="header-content">
        <div class="text-h6 text-weight-medium">Ubicaciones</div>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>

      <!-- Tabs modernos para cambiar de vista -->
      <div class="modern-tabs">
        <div
          class="tab-item"
          :class="{ active: vistaActual === 'poi' }"
          @click="cambiarVista('poi')"
        >
          <q-icon name="place" size="20px" />
          <span>Puntos de Interés</span>
        </div>
        <div
          class="tab-item"
          :class="{ active: vistaActual === 'geozona' }"
          @click="cambiarVista('geozona')"
        >
          <q-icon name="layers" size="20px" />
          <span>Geozonas</span>
        </div>
      </div>
    </div>

    <!-- Vista de Puntos de Interés -->
    <div v-if="vistaActual === 'poi'" class="vista-content">
      <!-- Stats cards -->
      <div class="stats-cards q-pa-md">
        <div class="stat-card">
          <q-icon name="place" size="24px" color="primary" />
          <div class="stat-info">
            <div class="stat-number">{{ totalPOIs }}</div>
            <div class="stat-label">Puntos Totales</div>
          </div>
        </div>
        <div class="stat-card">
          <q-icon name="folder" size="24px" color="orange" />
          <div class="stat-info">
            <div class="stat-number">{{ gruposPOI }}</div>
            <div class="stat-label">Grupos</div>
          </div>
        </div>
      </div>

      <!-- Búsqueda moderna -->
      <div class="q-px-md q-pb-md">
        <q-input
          v-model="busquedaPOI"
          outlined
          dense
          placeholder="Buscar punto de interés..."
          class="modern-search"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-6" />
          </template>
          <template v-slot:append v-if="busquedaPOI">
            <q-icon name="close" class="cursor-pointer" @click="busquedaPOI = ''" />
          </template>
        </q-input>
      </div>

      <!-- Filtro por grupos -->
      <div class="q-px-md q-pb-md" v-if="grupos.length > 0">
        <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">FILTRAR POR GRUPO</div>
        <div class="chips-container">
          <q-chip
            :outline="grupoSeleccionado !== null"
            color="primary"
            text-color="white"
            clickable
            @click="grupoSeleccionado = null"
          >
            <q-avatar
              v-if="grupoSeleccionado === null"
              icon="check"
              color="white"
              text-color="primary"
            />
            Todos ({{ poisFiltrados.length }})
          </q-chip>
          <q-chip
            v-for="grupo in grupos"
            :key="grupo.id"
            :outline="grupoSeleccionado !== grupo.id"
            :color="grupo.color"
            text-color="white"
            clickable
            @click="grupoSeleccionado = grupo.id"
          >
            <q-avatar
              v-if="grupoSeleccionado === grupo.id"
              icon="check"
              color="white"
              :text-color="grupo.color"
            />
            {{ grupo.nombre }} ({{ contarPOIPorGrupo(grupo.id) }})
          </q-chip>
        </div>
      </div>

      <!-- Lista de POIs con diseño moderno -->
      <q-scroll-area class="lista-scroll">
        <div class="q-pa-md">
          <q-card
            v-for="poi in poisFiltrados"
            :key="poi.id"
            flat
            bordered
            class="poi-card q-mb-md"
            :class="{ 
              'poi-selected': itemSeleccionado?.id === poi.id,
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === poi.id
            }"
            :data-ubicacion-id="poi.id"
            @click="seleccionarItem(poi)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar size="48px" :color="getColorGrupo(poi.grupoId)" text-color="white">
                <q-icon name="place" size="28px" />
                <!-- 🆕 BADGE MEJORADO Y MÁS VISIBLE -->
                <q-badge 
                  v-if="tieneEventosAsignados(poi.id, 'poi')" 
                  floating 
                  color="deep-orange" 
                  rounded
                  class="evento-badge"
                >
                  <q-icon name="notifications_active" size="12px" />
                  {{ contarEventos(poi.id, 'poi') }}
                </q-badge>
              </q-avatar>

              <div class="col q-ml-md">
                <div class="text-subtitle1 text-weight-medium">{{ poi.nombre }}</div>
                <div class="text-caption text-grey-7">
                  <q-icon name="location_on" size="14px" />
                  {{ poi.direccion }}
                </div>
              </div>

              <q-btn flat dense round icon="more_vert" @click.stop="mostrarMenuContextual(poi)" />
            </q-card-section>
          </q-card>

          <div v-if="poisFiltrados.length === 0" class="no-data">
            <q-icon name="search_off" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">No se encontraron puntos de interés</div>
          </div>
        </div>
      </q-scroll-area>

      <!-- Botón flotante para agregar POI -->
      <q-btn fab color="primary" icon="add" class="floating-btn" @click="dialogNuevoPOI = true">
        <q-tooltip>Nuevo Punto de Interés</q-tooltip>
      </q-btn>
    </div>

    <!-- Vista de Geozonas -->
    <div v-if="vistaActual === 'geozona'" class="vista-content">
      <!-- Stats cards -->
      <div class="stats-cards q-pa-md">
        <div class="stat-card">
          <q-icon name="layers" size="24px" color="secondary" />
          <div class="stat-info">
            <div class="stat-number">{{ totalGeozonas }}</div>
            <div class="stat-label">Geozonas Totales</div>
          </div>
        </div>
        <div class="stat-card">
          <q-icon name="folder" size="24px" color="orange" />
          <div class="stat-info">
            <div class="stat-number">{{ gruposGeozona }}</div>
            <div class="stat-label">Grupos</div>
          </div>
        </div>
      </div>

      <!-- Búsqueda moderna -->
      <div class="q-px-md q-pb-md">
        <q-input
          v-model="busquedaGeozona"
          outlined
          dense
          placeholder="Buscar geozona..."
          class="modern-search"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-6" />
          </template>
          <template v-slot:append v-if="busquedaGeozona">
            <q-icon name="close" class="cursor-pointer" @click="busquedaGeozona = ''" />
          </template>
        </q-input>
      </div>

      <!-- Filtro por grupos -->
      <div class="q-px-md q-pb-md" v-if="grupos.length > 0">
        <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">FILTRAR POR GRUPO</div>
        <div class="chips-container">
          <q-chip
            :outline="grupoSeleccionadoGZ !== null"
            color="secondary"
            text-color="white"
            clickable
            @click="grupoSeleccionadoGZ = null"
          >
            <q-avatar
              v-if="grupoSeleccionadoGZ === null"
              icon="check"
              color="white"
              text-color="secondary"
            />
            Todos ({{ geozonasFiltradas.length }})
          </q-chip>
          <q-chip
            v-for="grupo in grupos"
            :key="grupo.id"
            :outline="grupoSeleccionadoGZ !== grupo.id"
            :color="grupo.color"
            text-color="white"
            clickable
            @click="grupoSeleccionadoGZ = grupo.id"
          >
            <q-avatar
              v-if="grupoSeleccionadoGZ === grupo.id"
              icon="check"
              color="white"
              :text-color="grupo.color"
            />
            {{ grupo.nombre }} ({{ contarGeozonaPorGrupo(grupo.id) }})
          </q-chip>
        </div>
      </div>

      <!-- Lista de Geozonas con diseño moderno -->
      <q-scroll-area class="lista-scroll">
        <div class="q-pa-md">
          <q-card
            v-for="geozona in geozonasFiltradas"
            :key="geozona.id"
            flat
            bordered
            class="geozona-card q-mb-md"
            :class="{ 
              'geozona-selected': itemSeleccionado?.id === geozona.id,
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === geozona.id
            }"
            :data-ubicacion-id="geozona.id"
            @click="seleccionarItem(geozona)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar size="48px" :color="getColorGrupo(geozona.grupoId)" text-color="white">
                <q-icon name="layers" size="28px" />
                <!-- 🆕 BADGE MEJORADO Y MÁS VISIBLE -->
                <q-badge 
                  v-if="tieneEventosAsignados(geozona.id, 'geozona')" 
                  floating 
                  color="deep-orange" 
                  rounded
                  class="evento-badge"
                >
                  <q-icon name="notifications_active" size="12px" />
                  {{ contarEventos(geozona.id, 'geozona') }}
                </q-badge>
              </q-avatar>

              <div class="col q-ml-md">
                <div class="text-subtitle1 text-weight-medium">{{ geozona.nombre }}</div>
                <div class="text-caption text-grey-7">
                  <q-icon name="straighten" size="14px" />
                  {{
                    geozona.tipoGeozona === 'poligono'
                      ? `${geozona.puntos.length} puntos`
                      : `Radio: ${geozona.radio}m`
                  }}
                </div>
              </div>

              <q-btn
                flat
                dense
                round
                icon="more_vert"
                @click.stop="mostrarMenuContextual(geozona)"
              />
            </q-card-section>
          </q-card>

          <div v-if="geozonasFiltradas.length === 0" class="no-data">
            <q-icon name="search_off" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">No se encontraron geozonas</div>
          </div>
        </div>
      </q-scroll-area>

      <!-- Botón flotante para agregar Geozona -->
      <q-btn fab color="primary" icon="add" class="floating-btn" @click="dialogTipoGeozona = true">
        <q-tooltip>Nueva Geozona</q-tooltip>
      </q-btn>
    </div>

    <!-- Dialog: Nuevo POI -->
    <q-dialog v-model="dialogNuevoPOI" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center">
            <q-icon name="place" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">Nuevo Punto de Interés</div>
              <div class="text-caption">Marca una ubicación en el mapa</div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" @click="cancelarNuevoPOI" color="white" />
          </div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <!-- Input de Nombre -->
          <q-input
            v-model="nuevoPOI.nombre"
            label="Nombre del punto *"
            outlined
            class="q-mb-md"
            placeholder="Ej: Oficina Central"
          >
            <template v-slot:prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <!-- Input de Dirección -->
          <q-input
            v-model="nuevoPOI.direccion"
            label="Dirección *"
            outlined
            class="q-mb-md"
            readonly
            placeholder="Haz clic para seleccionar en el mapa"
            @click="activarSeleccionMapa"
          >
            <template v-slot:prepend>
              <q-icon name="location_on" />
            </template>
            <template v-slot:append>
              <q-icon name="edit_location" class="cursor-pointer" @click="activarSeleccionMapa" />
            </template>
          </q-input>

          <q-select
            v-model="nuevoPOI.grupoId"
            :options="opcionesGruposSelect"
            label="Grupo (opcional)"
            outlined
            emit-value
            map-options
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="folder" />
            </template>
          </q-select>

          <q-input
            v-model="nuevoPOI.notas"
            label="Notas adicionales"
            type="textarea"
            outlined
            rows="3"
          >
            <template v-slot:prepend>
              <q-icon name="note" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" @click="cancelarNuevoPOI" />
          <q-btn
            unelevated
            label="Guardar"
            color="primary"
            @click="guardarPOI"
            :disable="!nuevoPOI.nombre || !nuevoPOI.direccion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Tipo de Geozona -->
    <q-dialog v-model="dialogTipoGeozona" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="bg-secondary text-white">
          <div class="row items-center">
            <q-icon name="layers" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">Tipo de Geozona</div>
              <div class="text-caption">Selecciona el tipo de geozona que deseas crear</div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" v-close-popup color="white" />
          </div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <div class="row q-gutter-md">
            <div class="col-12 col-md-6">
              <q-card
                flat
                bordered
                class="cursor-pointer q-pa-md"
                :class="{ 'bg-blue-1': nuevaGeozona.tipo === 'circular' }"
                @click="nuevaGeozona.tipo = 'circular'"
              >
                <div class="text-center">
                  <q-icon name="radio_button_unchecked" size="48px" color="primary" />
                  <div class="text-subtitle1 q-mt-sm">Circular</div>
                  <div class="text-caption text-grey-7">
                    Define un área con un centro y un radio
                  </div>
                </div>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card
                flat
                bordered
                class="cursor-pointer q-pa-md"
                :class="{ 'bg-blue-1': nuevaGeozona.tipo === 'poligono' }"
                @click="nuevaGeozona.tipo = 'poligono'"
              >
                <div class="text-center">
                  <q-icon name="change_history" size="48px" color="primary" />
                  <div class="text-subtitle1 q-mt-sm">Poligonal</div>
                  <div class="text-caption text-grey-7">Define un área con múltiples puntos</div>
                </div>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="Continuar"
            color="secondary"
            @click="abrirDialogGeozona"
            :disable="!nuevaGeozona.tipo"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Nueva Geozona -->
    <q-dialog v-model="dialogNuevaGeozona" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="bg-secondary text-white">
          <div class="row items-center">
            <q-icon name="layers" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">
                {{
                  nuevaGeozona.tipo === 'circular'
                    ? 'Nueva Geozona Circular'
                    : 'Nueva Geozona Poligonal'
                }}
              </div>
              <div class="text-caption">
                {{
                  nuevaGeozona.tipo === 'circular'
                    ? 'Define un centro y un radio'
                    : 'Define un área con múltiples puntos'
                }}
              </div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" v-close-popup color="white" />
          </div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <q-input v-model="nuevaGeozona.nombre" label="Nombre de la zona" outlined class="q-mb-md">
            <template v-slot:prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <!-- Campos específicos para geozona circular -->
          <div v-if="nuevaGeozona.tipo === 'circular'">
            <q-input
              v-model="nuevaGeozona.direccion"
              label="Centro de la geozona"
              outlined
              class="q-mb-md"
              readonly
              placeholder="Haz clic para seleccionar en el mapa"
              @click="activarSeleccionGeozonaCircular"
            >
              <template v-slot:prepend>
                <q-icon name="location_on" />
              </template>
              <template v-slot:append>
                <q-icon
                  name="edit_location"
                  class="cursor-pointer"
                  @click="activarSeleccionGeozonaCircular"
                />
              </template>
            </q-input>

            <q-input
              v-model.number="nuevaGeozona.radio"
              label="Radio (metros)"
              type="number"
              outlined
              class="q-mb-md"
            >
              <template v-slot:prepend>
                <q-icon name="straighten" />
              </template>
            </q-input>
          </div>

          <!-- Campos específicos para geozona poligonal -->
          <div v-if="nuevaGeozona.tipo === 'poligono'">
            <q-input
              v-model="nuevaGeozona.direccion"
              label="Puntos del polígono"
              outlined
              class="q-mb-md"
              readonly
              placeholder="Haz clic para seleccionar puntos en el mapa"
              @click="activarSeleccionGeozonaPoligonal"
            >
              <template v-slot:prepend>
                <q-icon name="change_history" />
              </template>
              <template v-slot:append>
                <q-icon
                  name="edit_location"
                  class="cursor-pointer"
                  @click="activarSeleccionGeozonaPoligonal"
                />
              </template>
            </q-input>

            <div v-if="nuevaGeozona.puntos && nuevaGeozona.puntos.length > 0" class="q-mb-md">
              <div class="text-caption text-grey-7 q-mb-sm">Puntos seleccionados:</div>
              <div class="row q-gutter-sm">
                <q-chip
                  v-for="(punto, index) in nuevaGeozona.puntos"
                  :key="index"
                  removable
                  @remove="eliminarPuntoPoligono(index)"
                  color="secondary"
                  text-color="white"
                >
                  Punto {{ index + 1 }}
                </q-chip>
              </div>
            </div>
          </div>

          <q-select
            v-model="nuevaGeozona.grupoId"
            :options="opcionesGruposSelect"
            label="Grupo (opcional)"
            outlined
            emit-value
            map-options
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="folder" />
            </template>
          </q-select>

          <q-input
            v-model="nuevaGeozona.notas"
            label="Notas adicionales"
            type="textarea"
            outlined
            rows="3"
          >
            <template v-slot:prepend>
              <q-icon name="note" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup @click="cancelarNuevaGeozona" />
          <q-btn
            unelevated
            label="Guardar"
            color="secondary"
            @click="guardarGeozona"
            :disable="!nuevaGeozona.nombre || !esGeozonaValida"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Menú contextual -->
    <q-dialog
      v-model="menuContextualVisible"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card style="width: 100%; max-width: 400px; border-radius: 16px 16px 0 0">
        <!-- Header opcional -->
        <q-card-section class="q-pa-md bg-grey-1">
          <div class="text-subtitle2 text-grey-8">{{ itemMenu?.nombre }}</div>
        </q-card-section>

        <q-separator />

        <!-- Opciones -->
        <q-list padding>
          <q-item clickable v-ripple @click="(editarItem(), (menuContextualVisible = false))">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                <q-icon name="edit" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>Editar</q-item-label>
              <q-item-label caption>Modificar información</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-ripple @click="(verEnMapa(), (menuContextualVisible = false))">
            <q-item-section avatar>
              <q-avatar color="positive" text-color="white">
                <q-icon name="map" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>Ver en mapa</q-item-label>
              <q-item-label caption>Centrar en ubicación</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <q-item clickable v-ripple @click="(eliminarItem(), (menuContextualVisible = false))">
            <q-item-section avatar>
              <q-avatar color="negative" text-color="white">
                <q-icon name="delete" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-negative">Eliminar</q-item-label>
              <q-item-label caption>Eliminar permanentemente</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Botón cancelar -->
        <q-card-actions class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey-7" class="full-width" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
// MODIFICAR esta línea existente:
import { ref, computed, onMounted, onUnmounted} from 'vue'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
// 🆕 NUEVO: Importar composable de eventos
import { useEventos } from 'src/composables/useEventos'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { useEventBus } from 'src/composables/useEventBus.js'

const userId = ref(auth.currentUser?.uid || '')
const emit = defineEmits(['close', 'item-seleccionado'])
const $q = useQuasar()
// 🆕 AGREGAR esta línea
const { eventBus} = useEventBus()

// Usar el composable de POIs
const { crearPOI, obtenerPOIs, actualizarPOI, eliminarPOI } = usePOIs(userId.value)

// Usar el composable de Geozonas
const { crearGeozona, obtenerGeozonas, actualizarGeozona, eliminarGeozona } = useGeozonas(
  userId.value,
)

// 🆕 NUEVO: Cargar eventos para mostrar badges
const { obtenerEventos } = useEventos(userId.value)
const eventosActivos = ref([])

// 🆕 NUEVO: Variable para controlar la selección desde el mapa
const ubicacionSeleccionadaDesdeMapa = ref(null)

// Estados reactivos
const vistaActual = ref('poi')
const itemSeleccionado = ref(null)
const busquedaPOI = ref('')
const busquedaGeozona = ref('')
const grupoSeleccionado = ref(null)
const grupoSeleccionadoGZ = ref(null)
const dialogNuevoPOI = ref(false)
const dialogNuevaGeozona = ref(false)
const dialogTipoGeozona = ref(false)
const menuContextualVisible = ref(false)
const itemMenu = ref(null)
const marcadorActivo = ref(null)
const poligonoActivo = ref(null)
const modoSeleccionGeozonaCircular = ref(false)
const modoSeleccionGeozonaPoligonal = ref(false)

const nuevoPOI = ref({
  nombre: '',
  direccion: '',
  grupoId: null,
  notas: '',
  coordenadas: null,
})

const nuevaGeozona = ref({
  nombre: '',
  tipo: null, // 'circular' o 'poligono'
  direccion: '',
  radio: 50,
  grupoId: null,
  notas: '',
  puntos: [], // Para geozonas poligonales
  centro: null, // Para geozonas circulares
})

const grupos = ref([
  { id: 'grupo1', nombre: 'Clientes', color: 'blue' },
  { id: 'grupo2', nombre: 'Almacenes', color: 'green' },
  { id: 'grupo3', nombre: 'Oficinas', color: 'orange' },
])

const items = ref([])

// 🆕 Computed para saber qué ubicaciones tienen eventos
const ubicacionesConEventos = computed(() => {
  const set = new Set()
  
  eventosActivos.value.forEach(evento => {
    if (evento.condiciones && evento.condiciones.length > 0) {
      evento.condiciones.forEach(condicion => {
        if (condicion.ubicacionId) {
          const tipo = condicion.tipo === 'POI' ? 'poi' : 'geozona'
          set.add(`${tipo}-${condicion.ubicacionId}`)
        }
      })
    }
  })
  
  return set
})

// 🆕 Función para verificar si una ubicación tiene eventos
function tieneEventosAsignados(ubicacionId, tipo) {
  return ubicacionesConEventos.value.has(`${tipo}-${ubicacionId}`)
}

// 🆕 Función para contar eventos de una ubicación
function contarEventos(ubicacionId, tipo) {
  let count = 0
  eventosActivos.value.forEach(evento => {
    if (evento.condiciones) {
      evento.condiciones.forEach(condicion => {
        if (condicion.ubicacionId === ubicacionId && 
            ((tipo === 'poi' && condicion.tipo === 'POI') || 
             (tipo === 'geozona' && condicion.tipo === 'Geozona'))) {
          count++
        }
      })
    }
  })
  return count
}

// Computed properties
const pois = computed(() => items.value.filter((i) => i.tipo === 'poi'))
const geozonas = computed(() => {
  const resultado = items.value.filter((i) => i.tipo === 'geozona')
  console.log('🔍 DEBUG geozonas computed:')
  console.log('  - items.value total:', items.value.length)
  console.log('  - items.value:', items.value)
  console.log('  - geozonas filtradas:', resultado)
  console.log(
    '  - tipos encontrados:',
    items.value.map((i) => ({ id: i.id, tipo: i.tipo, tipoGeozona: i.tipoGeozona })),
  )
  return resultado
})
const totalPOIs = computed(() => pois.value.length)
const totalGeozonas = computed(() => geozonas.value.length)
const gruposPOI = computed(() => grupos.value.length)
const gruposGeozona = computed(() => grupos.value.length)

const poisFiltrados = computed(() => {
  let resultado = pois.value
  if (grupoSeleccionado.value) {
    resultado = resultado.filter((p) => p.grupoId === grupoSeleccionado.value)
  }
  if (busquedaPOI.value) {
    resultado = resultado.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busquedaPOI.value.toLowerCase()) ||
        p.direccion.toLowerCase().includes(busquedaPOI.value.toLowerCase()),
    )
  }
  return resultado
})

const geozonasFiltradas = computed(() => {
  let resultado = geozonas.value
  console.log('🔍 DEBUG geozonasFiltradas:')
  console.log('  - geozonas.value:', geozonas.value)
  console.log('  - grupoSeleccionadoGZ:', grupoSeleccionadoGZ.value)
  console.log('  - busquedaGeozona:', busquedaGeozona.value)

  if (grupoSeleccionadoGZ.value) {
    resultado = resultado.filter((g) => g.grupoId === grupoSeleccionadoGZ.value)
    console.log('  - después de filtrar por grupo:', resultado)
  }
  if (busquedaGeozona.value) {
    resultado = resultado.filter(
      (g) =>
        g.nombre?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()) ||
        g.direccion?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()),
    )
    console.log('  - después de filtrar por búsqueda:', resultado)
  }

  console.log('  - RESULTADO FINAL:', resultado)
  return resultado
})

const opcionesGruposSelect = computed(() => {
  const opciones = [{ label: 'Sin grupo', value: null }]
  grupos.value.forEach((grupo) => {
    opciones.push({ label: grupo.nombre, value: grupo.id })
  })
  return opciones
})

// Computed para validar si la geozona es válida
const esGeozonaValida = computed(() => {
  if (nuevaGeozona.value.tipo === 'circular') {
    return nuevaGeozona.value.centro !== null && nuevaGeozona.value.radio > 0
  } else if (nuevaGeozona.value.tipo === 'poligono') {
    return nuevaGeozona.value.puntos && nuevaGeozona.value.puntos.length >= 3
  }
  return false
})

// Funciones
function cambiarVista(vista) {
  vistaActual.value = vista
  itemSeleccionado.value = null
}

function cerrarDrawer() {
  emit('close')
}

function seleccionarItem(item) {
  itemSeleccionado.value = item
  emit('item-seleccionado', item)
}

function getColorGrupo(grupoId) {
  if (!grupoId) return 'grey'
  const grupo = grupos.value.find((g) => g.id === grupoId)
  return grupo ? grupo.color : 'grey'
}

function contarPOIPorGrupo(grupoId) {
  return pois.value.filter((p) => p.grupoId === grupoId).length
}

function contarGeozonaPorGrupo(grupoId) {
  return geozonas.value.filter((g) => g.grupoId === grupoId).length
}

function mostrarMenuContextual(item) {
  itemMenu.value = item
  menuContextualVisible.value = true
}

function verEnMapa() {
  console.group('🔍 DEBUG verEnMapa')
  console.log('itemMenu.value completo:', itemMenu.value)
  console.log('tipo:', itemMenu.value?.tipo)
  console.log('coordenadas:', itemMenu.value?.coordenadas)
  console.log('¿Es POI?', itemMenu.value?.tipo === 'poi')
  console.log('¿Es Geozona?', itemMenu.value?.tipo === 'geozona')
  console.groupEnd()
  if (!itemMenu.value) return

  console.log('📍 Ver en mapa:', itemMenu.value)
  console.log('📍 Tipo de item:', itemMenu.value.tipo)
  console.log('📍 Coordenadas:', itemMenu.value.coordenadas)

  menuContextualVisible.value = false

  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.error('❌ No se encontró la API del mapa.')
    $q.notify({
      type: 'negative',
      message: 'No se pudo acceder al mapa',
      icon: 'error',
    })
    return
  }

  const mapaAPI = mapPage._mapaAPI

  // ✅ VERIFICAR: Comprobar si es POI
  if (itemMenu.value.tipo === 'poi') {
    console.log('✅ Es un POI, mostrando en mapa...')

    if (!itemMenu.value.coordenadas) {
      console.error('❌ El POI no tiene coordenadas:', itemMenu.value)
      $q.notify({
        type: 'negative',
        message: 'Este punto no tiene coordenadas válidas.',
        icon: 'error',
      })
      return
    }

    const { lat, lng } = itemMenu.value.coordenadas

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('❌ Coordenadas inválidas:', itemMenu.value.coordenadas)
      $q.notify({
        type: 'negative',
        message: 'Este punto de interés no tiene coordenadas válidas.',
      })
      return
    }

    console.log('📍 Centrando mapa en:', lat, lng)

    const popupContent = `
      <div style="min-width: 200px;">
        <b style="font-size: 16px;">📍 ${itemMenu.value.nombre}</b>
        <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666;">
          ${itemMenu.value.direccion}
        </p>
      </div>
    `

    // Eliminar marcador anterior si existe
    if (marcadorActivo.value) {
      console.log('🗑️ Eliminando marcador anterior')
      mapaAPI.map.removeLayer(marcadorActivo.value)
      marcadorActivo.value = null
    }

    // Crear nuevo marcador
    marcadorActivo.value = mapaAPI.L.marker([lat, lng], {
      icon: mapaAPI.L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).addTo(mapaAPI.map)

    marcadorActivo.value.bindPopup(popupContent)
    marcadorActivo.value.openPopup()

    // Centrar el mapa
    mapaAPI.map.setView([lat, lng], 18)
    console.log('✅ Mapa centrado correctamente')
  } else if (itemMenu.value.tipo === 'geozona') {
    console.log('✅ Es una geozona, mostrando en mapa...')

    // Eliminar polígono/círculo anterior si existe
    if (poligonoActivo.value) {
      console.log('🗑️ Eliminando geozona anterior')
      mapaAPI.map.removeLayer(poligonoActivo.value)
      poligonoActivo.value = null
    }

    if (itemMenu.value.tipoGeozona === 'circular' && itemMenu.value.centro) {
      // Geozona circular
      const { lat, lng } = itemMenu.value.centro

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error('❌ Coordenadas inválidas:', itemMenu.value.centro)
        $q.notify({
          type: 'negative',
          message: 'Esta geozona no tiene coordenadas válidas.',
        })
        return
      }

      console.log('🔵 Mostrando geozona circular en:', lat, lng, 'radio:', itemMenu.value.radio)

      poligonoActivo.value = mapaAPI.L.circle([lat, lng], {
        radius: itemMenu.value.radio,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      }).addTo(mapaAPI.map)

      mapaAPI.map.setView([lat, lng], 16)
      console.log('✅ Geozona circular mostrada')
    } else if (
      itemMenu.value.tipoGeozona === 'poligono' &&
      itemMenu.value.puntos &&
      itemMenu.value.puntos.length > 0
    ) {
      // Geozona poligonal
      console.log('🔷 Mostrando geozona poligonal con', itemMenu.value.puntos.length, 'puntos')

      const puntos = itemMenu.value.puntos.map((p) => [p.lat, p.lng])

      poligonoActivo.value = mapaAPI.L.polygon(puntos, {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      }).addTo(mapaAPI.map)

      const bounds = mapaAPI.L.latLngBounds(puntos)
      mapaAPI.map.fitBounds(bounds)
      console.log('✅ Geozona poligonal mostrada')
    } else {
      console.warn('⚠️ La geozona seleccionada no tiene datos válidos.')
      $q.notify({
        type: 'warning',
        message: 'No se puede mostrar esta geozona en el mapa.',
      })
      return
    }
  } else {
    console.error('❌ Tipo de item desconocido:', itemMenu.value.tipo)
    $q.notify({
      type: 'warning',
      message: 'No se reconoce el tipo de ubicación.',
    })
    return
  }

  emit('item-seleccionado', itemMenu.value)
}

function editarItem() {
  if (!itemMenu.value) return

  if (itemMenu.value.tipo === 'poi') {
    nuevoPOI.value = {
      id: itemMenu.value.id,
      nombre: itemMenu.value.nombre,
      direccion: itemMenu.value.direccion,
      coordenadas: itemMenu.value.coordenadas,
      grupoId: itemMenu.value.grupoId,
      notas: itemMenu.value.notas || '',
    }
    dialogNuevoPOI.value = true
  } else if (itemMenu.value.tipo === 'geozona') {
    // ✅ CAMBIAR: usar tipoGeozona
    if (itemMenu.value.tipoGeozona === 'circular') {
      nuevaGeozona.value = {
        id: itemMenu.value.id,
        nombre: itemMenu.value.nombre,
        tipo: 'circular', // ✅ MANTENER: esto es para el formulario
        direccion: itemMenu.value.direccion,
        centro: itemMenu.value.centro,
        radio: itemMenu.value.radio,
        grupoId: itemMenu.value.grupoId,
        notas: itemMenu.value.notas || '',
      }
    } else if (itemMenu.value.tipoGeozona === 'poligono') {
      nuevaGeozona.value = {
        id: itemMenu.value.id,
        nombre: itemMenu.value.nombre,
        tipo: 'poligono', // ✅ MANTENER: esto es para el formulario
        direccion: itemMenu.value.direccion,
        puntos: itemMenu.value.puntos,
        grupoId: itemMenu.value.grupoId,
        notas: itemMenu.value.notas || '',
      }
    }
    dialogNuevaGeozona.value = true
  }
}

const eliminarItem = async () => {
  if (!itemMenu.value) return

  try {
    // ✅ USAR CONFIRM NATIVO - SIEMPRE FUNCIONA
    const confirmacion = window.confirm(`¿Estás seguro de eliminar "${itemMenu.value.nombre}"?`)

    if (!confirmacion) {
      console.log('Eliminación cancelada por el usuario')
      return
    }

    console.log('✅ Confirmación recibida, eliminando elemento...')

    // Mostrar loading (si está disponible)
    if ($q && $q.loading) {
      $q.loading.show({ message: 'Eliminando elemento...' })
    }

    if (itemMenu.value.tipo === 'poi') {
      // Eliminar POI de Firebase
      await eliminarPOI(itemMenu.value.id)
      console.log('✅ POI eliminado de Firebase')

      // Eliminar marcador del mapa
      if (itemMenu.value.coordenadas) {
        const mapPage = document.querySelector('#map-page')
        if (mapPage && mapPage._mapaAPI) {
          mapPage._mapaAPI.eliminarMarcadorPorCoordenadas(
            itemMenu.value.coordenadas.lat,
            itemMenu.value.coordenadas.lng,
          )
          console.log('✅ Marcador eliminado del mapa')
        }
      }
    } else if (itemMenu.value.tipo === 'geozona') {
      await eliminarGeozona(itemMenu.value.id)
      console.log('✅ Geozona eliminada de Firebase')

      const mapPage = document.querySelector('#map-page')
      if (mapPage && mapPage._mapaAPI) {
        // ✅ CAMBIAR: usar tipoGeozona
        if (itemMenu.value.tipoGeozona === 'circular') {
          mapPage._mapaAPI.eliminarCirculo(itemMenu.value.id)
        } else if (itemMenu.value.tipoGeozona === 'poligono') {
          mapPage._mapaAPI.eliminarPoligono(itemMenu.value.id)
        }
        console.log('✅ Geozona eliminada del mapa')
      }
    }
    // Eliminar del array local
    const index = items.value.findIndex((i) => i.id === itemMenu.value.id)
    if (index > -1) {
      items.value.splice(index, 1)
      console.log('✅ Elemento eliminado del array local')
    }

    // Mostrar notificación de éxito
    if ($q && $q.notify) {
      $q.notify({
        type: 'positive',
        message: 'Elemento eliminado correctamente',
        icon: 'delete',
        timeout: 2000,
      })
    } else {
      console.log('✅ Elemento eliminado correctamente')
    }

    redibujarMapa()
    // Cerrar menú contextual
    menuContextualVisible.value = false
  } catch (err) {
    console.error('❌ Error al eliminar elemento:', err)

    // Mostrar notificación de error
    if ($q && $q.notify) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar el elemento',
        caption: err.message,
        icon: 'error',
        timeout: 3000,
      })
    } else {
      alert(`Error al eliminar: ${err.message}`)
    }
  } finally {
    // Ocultar loading si existe
    if ($q && $q.loading) {
      $q.loading.hide()
    }
  }
}

// 🔥 FUNCIÓN MODIFICADA PARA FIREBASE
const guardarPOI = async () => {
  try {
    const mapPage = document.querySelector('#map-page')

    // Preparar datos del POI
    const poiData = {
      nombre: nuevoPOI.value.nombre,
      direccion: nuevoPOI.value.direccion,
      coordenadas: nuevoPOI.value.coordenadas || null,
      grupoId: nuevoPOI.value.grupoId,
      notas: nuevoPOI.value.notas || '',
    }

    if (nuevoPOI.value.id) {
      // ACTUALIZAR POI EXISTENTE
      await actualizarPOI(nuevoPOI.value.id, poiData)

      // Actualizar en el array local
      const index = items.value.findIndex((i) => i.id === nuevoPOI.value.id)
      if (index > -1) {
        items.value[index] = {
          ...items.value[index],
          ...poiData,
        }
      }

      // Actualizar marcador en el mapa
      if (mapPage && mapPage._mapaAPI && nuevoPOI.value.coordenadas) {
        mapPage._mapaAPI.actualizarMarcador(
          nuevoPOI.value.coordenadas.lat,
          nuevoPOI.value.coordenadas.lng,
          nuevoPOI.value.nombre,
          nuevoPOI.value.direccion,
        )
      }

      $q.notify({
        type: 'positive',
        message: 'POI actualizado correctamente',
        icon: 'check_circle',
      })
    } else {
      // CREAR NUEVO POI
      const nuevoId = await crearPOI(poiData)

      // Confirmar marcador temporal en el mapa
      if (mapPage && mapPage._mapaAPI) {
        mapPage._mapaAPI.confirmarMarcadorTemporal(nuevoPOI.value.nombre)
      }

      // Agregar al array local con el ID de Firebase
      items.value.push({
        id: nuevoId,
        tipo: 'poi',
        ...poiData,
      })

      $q.notify({
        type: 'positive',
        message: 'POI guardado correctamente',
        icon: 'check_circle',
      })
      redibujarMapa()
    }

    // Resetear formulario
    nuevoPOI.value = {
      nombre: '',
      direccion: '',
      coordenadas: null,
      grupoId: null,
      notas: '',
    }
    dialogNuevoPOI.value = false
  } catch (err) {
    console.error('Error al guardar POI:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al guardar el POI',
      caption: err.message,
      icon: 'error',
    })
  }
}

// Función para abrir el diálogo de geozona según el tipo seleccionado
function abrirDialogGeozona() {
  dialogNuevaGeozona.value = true
}

// Función para cancelar la creación de una nueva geozona
function cancelarNuevaGeozona() {
  const mapPage = document.querySelector('#map-page')

  if (mapPage && mapPage._mapaAPI) {
    console.log('🧹 Limpiando mapa al cancelar...')

    // Desactivar modos de selección
    mapPage._mapaAPI.desactivarModoSeleccion()

    // Limpiar capas temporales
    if (nuevaGeozona.value.tipo === 'poligono') {
      mapPage._mapaAPI.limpiarPoligonoTemporal()
    } else if (nuevaGeozona.value.tipo === 'circular') {
      mapPage._mapaAPI.limpiarCirculoTemporal()
    }
  }

  // ✅ NUEVO: Restaurar el drawer
  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  // ✅ NUEVO: Ocultar botón flotante
  window.dispatchEvent(
    new CustomEvent('mostrarBotonConfirmarGeozona', {
      detail: { mostrar: false },
    }),
  )

  // ✅ NUEVO: Resetear modos locales
  modoSeleccionGeozonaCircular.value = false
  modoSeleccionGeozonaPoligonal.value = false

  // Resetear formulario
  nuevaGeozona.value = {
    nombre: '',
    tipo: null,
    direccion: '',
    radio: 50,
    grupoId: null,
    notas: '',
    puntos: [],
    centro: null,
  }

  console.log('✅ Cancelación completada y mapa limpiado')
}

// Función para activar la selección de geozona circular en el mapa
const activarSeleccionGeozonaCircular = async () => {
  console.log('🔵 1. Iniciando activarSeleccionGeozonaCircular')

  dialogNuevaGeozona.value = false
  console.log('🔵 2. Diálogo cerrado')

  const componentDialog = document.querySelector('.component-dialog')
  console.log('🔵 3. componentDialog encontrado:', componentDialog)

  if (componentDialog) {
    componentDialog.style.opacity = '0.3'
    componentDialog.style.pointerEvents = 'none'
  }

  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log('🔵 4. Esperando completado')

  const esperarMapa = async (intentosMaximos = 10, delay = 500) => {
    for (let i = 0; i < intentosMaximos; i++) {
      const mapPage = document.querySelector('#map-page')

      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - mapPage:`, !!mapPage)
      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - _mapaAPI:`, !!mapPage?._mapaAPI)

      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.activarModoSeleccionGeozonaCircular) {
        console.log('✅ Mapa encontrado en intento', i + 1)
        return mapPage._mapaAPI
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return null
  }

  try {
    const mapaAPI = await esperarMapa()

    if (mapaAPI) {
      console.log('✅ Mapa disponible, activando modo selección de geozona circular')

      mapaAPI.activarModoSeleccionGeozonaCircular()
      console.log('🔵 8. Modo selección de geozona circular activado')

      // ✅ NUEVO: Ya no esperamos la selección aquí, el botón flotante lo manejará
      console.log('⏳ Esperando que el usuario marque el centro y presione el botón flotante...')
    } else {
      console.error('❌ No se pudo encontrar el mapa después de varios intentos')

      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }

      $q.notify({
        type: 'warning',
        message: 'El mapa aún no está listo',
        caption: 'Por favor, espera unos segundos e intenta de nuevo',
        timeout: 3000,
        actions: [
          {
            label: 'Reintentar',
            color: 'white',
            handler: () => {
              activarSeleccionGeozonaCircular()
            },
          },
        ],
      })

      dialogNuevaGeozona.value = true
    }
  } catch (error) {
    console.error('❌ Error en activarSeleccionGeozonaCircular:', error)

    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }

    $q.notify({
      type: 'negative',
      message: 'Error al activar selección de geozona circular',
      caption: error.message,
      icon: 'error',
    })

    dialogNuevaGeozona.value = true
  }
}

// Función para activar la selección de geozona poligonal en el mapa
const activarSeleccionGeozonaPoligonal = async () => {
  console.log('🔵 1. Iniciando activarSeleccionGeozonaPoligonal')

  dialogNuevaGeozona.value = false
  console.log('🔵 2. Diálogo cerrado')

  const componentDialog = document.querySelector('.component-dialog')
  console.log('🔵 3. componentDialog encontrado:', componentDialog)

  if (componentDialog) {
    componentDialog.style.opacity = '0.3'
    componentDialog.style.pointerEvents = 'none'
  }

  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log('🔵 4. Esperando completado')

  const esperarMapa = async (intentosMaximos = 10, delay = 500) => {
    for (let i = 0; i < intentosMaximos; i++) {
      const mapPage = document.querySelector('#map-page')

      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - mapPage:`, !!mapPage)
      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - _mapaAPI:`, !!mapPage?._mapaAPI)

      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.activarModoSeleccionGeozonaPoligonal) {
        console.log('✅ Mapa encontrado en intento', i + 1)
        return mapPage._mapaAPI
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return null
  }

  try {
    const mapaAPI = await esperarMapa()

    if (mapaAPI) {
      console.log('✅ Mapa disponible, activando modo selección de geozona poligonal')

      mapaAPI.activarModoSeleccionGeozonaPoligonal()
      console.log('🔵 8. Modo selección de geozona poligonal activado')

      // ✅ NUEVO: Ya no esperamos los puntos aquí, el botón flotante lo manejará
      console.log('⏳ Esperando que el usuario marque puntos y presione el botón flotante...')
    } else {
      console.error('❌ No se pudo encontrar el mapa después de varios intentos')

      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }

      $q.notify({
        type: 'warning',
        message: 'El mapa aún no está listo',
        caption: 'Por favor, espera unos segundos e intenta de nuevo',
        timeout: 3000,
        actions: [
          {
            label: 'Reintentar',
            color: 'white',
            handler: () => {
              activarSeleccionGeozonaPoligonal()
            },
          },
        ],
      })

      dialogNuevaGeozona.value = true
    }
  } catch (error) {
    console.error('❌ Error en activarSeleccionGeozonaPoligonal:', error)

    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }

    $q.notify({
      type: 'negative',
      message: 'Error al activar selección de geozona poligonal',
      caption: error.message,
      icon: 'error',
    })

    dialogNuevaGeozona.value = true
  }
}

// Función para eliminar un punto del polígono
function eliminarPuntoPoligono(index) {
  if (nuevaGeozona.value.puntos && nuevaGeozona.value.puntos.length > index) {
    nuevaGeozona.value.puntos.splice(index, 1)
    nuevaGeozona.value.direccion = `${nuevaGeozona.value.puntos.length} puntos seleccionados`

    // Actualizar el polígono en el mapa
    const mapPage = document.querySelector('#map-page')
    if (mapPage && mapPage._mapaAPI) {
      mapPage._mapaAPI.actualizarPoligonoTemporal(nuevaGeozona.value.puntos)
    }
  }
}



// Función para guardar la geozona
const guardarGeozona = async () => {
  try {
    const mapPage = document.querySelector('#map-page')

    // Preparar datos de la geozona
    const geozonaData = {
      nombre: nuevaGeozona.value.nombre,
      tipo: nuevaGeozona.value.tipo,
      grupoId: nuevaGeozona.value.grupoId,
      notas: nuevaGeozona.value.notas || '',
    }

    if (nuevaGeozona.value.tipo === 'circular') {
      geozonaData.centro = nuevaGeozona.value.centro
      geozonaData.radio = nuevaGeozona.value.radio
      geozonaData.direccion = nuevaGeozona.value.direccion
    } else if (nuevaGeozona.value.tipo === 'poligono') {
      geozonaData.puntos = nuevaGeozona.value.puntos
      geozonaData.direccion = `${nuevaGeozona.value.puntos.length} puntos`
    }

    if (nuevaGeozona.value.id) {
      // ACTUALIZAR GEOZONA EXISTENTE
      await actualizarGeozona(nuevaGeozona.value.id, geozonaData)

      const index = items.value.findIndex((i) => i.id === nuevaGeozona.value.id)
      if (index > -1) {
        items.value[index] = {
          ...geozonaData,
          id: nuevaGeozona.value.id,
          tipoGeozona: geozonaData.tipo,
          tipo: 'geozona',
        }
      }

      if (mapPage && mapPage._mapaAPI) {
        if (nuevaGeozona.value.tipo === 'circular') {
          mapPage._mapaAPI.actualizarCirculo(
            nuevaGeozona.value.id,
            nuevaGeozona.value.centro,
            nuevaGeozona.value.radio,
            nuevaGeozona.value.nombre,
          )
        } else if (nuevaGeozona.value.tipo === 'poligono') {
          mapPage._mapaAPI.actualizarPoligono(
            nuevaGeozona.value.id,
            nuevaGeozona.value.puntos,
            nuevaGeozona.value.nombre,
          )
        }
      }

      $q.notify({
        type: 'positive',
        message: 'Geozona actualizada correctamente',
        icon: 'check_circle',
      })
    } else {
      // CREAR NUEVA GEOZONA
      console.log('📝 Creando nueva geozona...')
      const nuevoId = await crearGeozona(geozonaData)
      console.log('✅ Geozona creada con ID:', nuevoId)

      if (mapPage && mapPage._mapaAPI) {
        if (nuevaGeozona.value.tipo === 'circular') {
          mapPage._mapaAPI.confirmarCirculoTemporal(nuevaGeozona.value.nombre)
        } else if (nuevaGeozona.value.tipo === 'poligono') {
          mapPage._mapaAPI.confirmarPoligonoTemporal(nuevaGeozona.value.nombre)
        }
      }

      const nuevaGeozonaParaItems = {
        ...geozonaData,
        id: nuevoId,
        tipoGeozona: geozonaData.tipo,
        tipo: 'geozona',
        fechaCreacion: new Date(),
      }

      console.log('📦 Agregando geozona a items.value:', nuevaGeozonaParaItems)

      items.value.unshift(nuevaGeozonaParaItems)

      console.log('📊 items.value después de agregar:', items.value.length)
      console.log('📊 Geozonas en items:', items.value.filter((i) => i.tipo === 'geozona').length)

      $q.notify({
        type: 'positive',
        message: 'Geozona guardada correctamente',
        icon: 'check_circle',
      })
      redibujarMapa()
    }

    // ✅ NUEVO: Limpiar TODO después de guardar
    if (mapPage && mapPage._mapaAPI) {
      console.log('🧹 Limpiando mapa después de guardar...')

      // Desactivar modos de selección
      mapPage._mapaAPI.desactivarModoSeleccion()

      // Limpiar capas temporales según el tipo
      if (nuevaGeozona.value.tipo === 'circular') {
        mapPage._mapaAPI.limpiarCirculoTemporal()
      } else if (nuevaGeozona.value.tipo === 'poligono') {
        mapPage._mapaAPI.limpiarPoligonoTemporal()
      }

      console.log('✅ Mapa limpiado correctamente')
    }

    // ✅ NUEVO: Restaurar el drawer completamente
    const componentDialog = document.querySelector('.component-dialog')
    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }

    // ✅ NUEVO: Ocultar botón flotante
    window.dispatchEvent(
      new CustomEvent('mostrarBotonConfirmarGeozona', {
        detail: { mostrar: false },
      }),
    )

    // ✅ NUEVO: Resetear modos locales
    modoSeleccionGeozonaCircular.value = false
    modoSeleccionGeozonaPoligonal.value = false

    // Resetear formulario
    nuevaGeozona.value = {
      nombre: '',
      tipo: null,
      direccion: '',
      radio: 50,
      grupoId: null,
      notas: '',
      puntos: [],
      centro: null,
    }

    dialogNuevaGeozona.value = false

    console.log('✅ Geozona guardada y todo limpiado')
  } catch (err) {
    console.error('❌ Error al guardar geozona:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al guardar la geozona',
      caption: err.message,
      icon: 'error',
    })
  }
}

const activarSeleccionMapa = async () => {
  console.log('🔵 1. Iniciando activarSeleccionMapa')

  // 1. CERRAR el diálogo del POI
  dialogNuevoPOI.value = false
  console.log('🔵 2. Diálogo cerrado')

  // 2. Hacer semi-transparente el drawer de geozonas
  const componentDialog = document.querySelector('.component-dialog')
  console.log('🔵 3. componentDialog encontrado:', componentDialog)

  if (componentDialog) {
    componentDialog.style.opacity = '0.3'
    componentDialog.style.pointerEvents = 'none'
  }

  // 3. Esperar un momento para que el drawer se oculte
  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log('🔵 4. Esperando completado')

  // 4. FUNCIÓN MEJORADA: Intentar encontrar el mapa con reintentos
  const esperarMapa = async (intentosMaximos = 10, delay = 500) => {
    for (let i = 0; i < intentosMaximos; i++) {
      const mapPage = document.querySelector('#map-page')

      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - mapPage:`, !!mapPage)
      console.log(`🔵 Intento ${i + 1}/${intentosMaximos} - _mapaAPI:`, !!mapPage?._mapaAPI)

      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.activarModoSeleccion) {
        console.log('✅ Mapa encontrado en intento', i + 1)
        return mapPage._mapaAPI
      }

      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return null
  }

  try {
    // Intentar obtener el mapa con reintentos
    const mapaAPI = await esperarMapa()

    if (mapaAPI) {
      console.log('✅ Mapa disponible, activando modo selección')

      // Activar modo selección
      mapaAPI.activarModoSeleccion()
      console.log('🔵 8. Modo selección activado')

      // Esperar a que el usuario seleccione
      const ubicacion = await esperarSeleccionUbicacion(mapaAPI)
      console.log('🔵 9. Ubicación obtenida:', ubicacion)

      // Desactivar modo selección
      mapaAPI.desactivarModoSeleccion()

      // Si hay ubicación, guardar los datos
      if (ubicacion) {
        nuevoPOI.value.direccion = ubicacion.direccion
        nuevoPOI.value.coordenadas = ubicacion.coordenadas
      }

      // Restaurar visibilidad del drawer
      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }

      // REABRIR el diálogo con los datos ya llenos
      dialogNuevoPOI.value = true
    } else {
      console.error('❌ No se pudo encontrar el mapa después de varios intentos')

      // Restaurar visibilidad del drawer
      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }

      // Mostrar notificación más amigable
      $q.notify({
        type: 'warning',
        message: 'El mapa aún no está listo',
        caption: 'Por favor, espera unos segundos e intenta de nuevo',
        timeout: 3000,
        actions: [
          {
            label: 'Reintentar',
            color: 'white',
            handler: () => {
              activarSeleccionMapa()
            },
          },
        ],
      })

      // Reabrir el diálogo para que el usuario pueda reintentar
      dialogNuevoPOI.value = true
    }
  } catch (error) {
    console.error('❌ Error en activarSeleccionMapa:', error)

    // Restaurar visibilidad del drawer
    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }

    $q.notify({
      type: 'negative',
      message: 'Error al activar selección de mapa',
      caption: error.message,
      icon: 'error',
    })

    // Reabrir el diálogo
    dialogNuevoPOI.value = true
  }
}

const esperarSeleccionUbicacion = (mapaAPI) => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const ubicacion = mapaAPI.getUbicacionSeleccionada()
      if (ubicacion) {
        clearInterval(checkInterval)
        resolve(ubicacion)
      }
    }, 300)

    setTimeout(() => {
      clearInterval(checkInterval)
      resolve(null)
    }, 60000)
  })
}

const cancelarNuevoPOI = () => {
  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  const mapPage = document.querySelector('#map-page')
  if (mapPage && mapPage._mapaAPI) {
    const mapaAPI = mapPage._mapaAPI
    if (mapaAPI) {
      mapaAPI.desactivarModoSeleccion()
      mapaAPI.limpiarMarcadorTemporal()
    }
  }

  nuevoPOI.value = {
    nombre: '',
    direccion: '',
    coordenadas: null,
    grupoId: null,
    notas: '',
  }

  dialogNuevoPOI.value = false
}

// Función para manejar la confirmación de geozona desde el botón flotante
const handleConfirmarGeozonaDesdeBoton = async () => {
  console.log('🔘 Confirmación desde botón flotante recibida')

  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.error('❌ No se encontró la API del mapa')
    return
  }

  const mapaAPI = mapPage._mapaAPI

  // Verificar si es geozona circular o poligonal
  if (modoSeleccionGeozonaCircular.value || nuevaGeozona.value.tipo === 'circular') {
    // Geozona circular
    const ubicacion = mapaAPI.getUbicacionSeleccionada()
    if (ubicacion) {
      nuevaGeozona.value.centro = ubicacion.coordenadas
      nuevaGeozona.value.direccion = ubicacion.direccion
      nuevaGeozona.value.tipo = 'circular'
    }
  } else if (modoSeleccionGeozonaPoligonal.value || nuevaGeozona.value.tipo === 'poligono') {
    // Geozona poligonal
    const puntos = mapaAPI.getPuntosSeleccionados()
    if (puntos && puntos.length >= 3) {
      nuevaGeozona.value.puntos = puntos
      nuevaGeozona.value.direccion = `${puntos.length} puntos seleccionados`
      nuevaGeozona.value.tipo = 'poligono'
      mapaAPI.finalizarPoligonoTemporal()
    }
  }

  // Desactivar modos de selección
  mapaAPI.desactivarModoSeleccion()

  // Restaurar visibilidad del drawer
  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  // Reabrir el diálogo
  dialogNuevaGeozona.value = true

  console.log('✅ Diálogo reabierto con datos:', nuevaGeozona.value)
}

// Hooks de ciclo de vida
onMounted(async () => {
  try {
    // Cargar POIs, Geozonas Y EVENTOS en paralelo
    const [poisCargados, geozonasCargadas, eventosCargados] = await Promise.all([
      obtenerPOIs(),
      obtenerGeozonas(),
      obtenerEventos(), // 🆕 NUEVO
    ])

    items.value = [...poisCargados, ...geozonasCargadas]
    eventosActivos.value = eventosCargados.filter(e => e.activo) // 🆕 Solo eventos activos

    console.log('✅ Datos cargados:', {
      pois: poisCargados.length,
      geozonas: geozonasCargadas.length,
      eventos: eventosCargados.length, // 🆕 NUEVO
    })
  } catch (err) {
    console.error('Error al cargar datos:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al cargar los datos',
      caption: err.message,
    })
  }
  
// 🆕 ESCUCHAR EVENTOS DIRECTAMENTE DEL EVENTBUS (VUE 3)
eventBus.value.on('ver-detalles', (data) => {
  console.log('🎯 GeoZonas: Recibido evento ver-detalles:', data)
  
  // Determinar si es POI o Geozona
  if (data.tipo === 'poi') {
    vistaActual.value = 'poi'
  } else if (data.tipo === 'geozona') {
    vistaActual.value = 'geozona'
  }
  
  // Buscar el item en la lista
  const itemEncontrado = items.value.find(item => item.id === data.id)
  if (itemEncontrado) {
    console.log('✅ Item encontrado:', itemEncontrado)
    
    // Seleccionar el item
    seleccionarItem(itemEncontrado)
    
    // Marcar como seleccionado desde el mapa
    ubicacionSeleccionadaDesdeMapa.value = itemEncontrado.id
    
    // Hacer scroll y resaltar después de un pequeño retraso
    setTimeout(() => {
      const elemento = document.querySelector(`[data-ubicacion-id="${itemEncontrado.id}"]`)
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
        elemento.classList.add('flash-highlight')
        setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
      }
    }, 300)
    
    // Mostrar notificación
    $q.notify({
      type: 'positive',
      message: `📍 ${itemEncontrado.nombre}`,
      caption: itemEncontrado.tipo === 'poi' ? 
        itemEncontrado.direccion : 
        `Geozona ${itemEncontrado.tipoGeozona}`,
      icon: 'place',
      timeout: 2500,
      position: 'top'
    })
    
    // Limpiar después de 4 segundos
    setTimeout(() => {
      ubicacionSeleccionadaDesdeMapa.value = null
    }, 4000)
  } else {
    console.error('❌ No se encontró el item con ID:', data.id)
    $q.notify({
      type: 'warning',
      message: 'No se encontró la ubicación seleccionada',
      icon: 'warning'
    })
  }
})
  
  window.addEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

onUnmounted(() => {
  if (marcadorActivo.value) {
    const mapPage = document.querySelector('#map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.removeLayer(marcadorActivo.value)
      console.log('🗑️ Marcador activo eliminado al desmontar el componente.')
    }
    marcadorActivo.value = null
  }

  if (poligonoActivo.value) {
    const mapPage = document.querySelector('#map-page')
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.removeLayer(poligonoActivo.value)
      console.log('🗑️ Polígono activo eliminado al desmontar el componente.')
    }
    poligonoActivo.value = null
  }

  // 🆕 LIMPIAR EVENTOS DEL EVENTBUS
  if (eventBus.value && eventBus.value.off) {
  eventBus.value.off('ver-detalles')
}
  
  window.removeEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

const redibujarMapa = () => {
  // Emitir evento para que IndexPage redibuje todo
  window.dispatchEvent(new CustomEvent('redibujarMapa'))
}

</script>


<style scoped>
.geozonas-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.drawer-header {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.header-content .text-h6 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modern-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  font-weight: 500;
  font-size: 13px;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.tab-item.active {
  background: white;
  color: black;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.vista-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 4px;
}

.modern-search {
  background: white;
  border-radius: 12px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lista-scroll {
  flex: 1;
  height: 100%;
  scroll-behavior: smooth;
}

.poi-card,
.geozona-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: white;
}

.poi-card:hover,
.geozona-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.poi-selected,
.geozona-selected {
  border: 2px solid #667eea;
  background: #f0f4ff;
}

.floating-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* Estilos para el marcador */
:deep(.marcador-destacado) {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* 🆕 ESTILOS PARA BADGES DE EVENTOS MÁS VISIBLES */
.evento-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 6px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
  animation: pulse-badge 2s infinite;
  border: 2px solid white;
}

@keyframes pulse-badge {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 2px 12px rgba(255, 87, 34, 0.6);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
  }
}

/* 🆕 EFECTO FLASH CUANDO SE SELECCIONA DESDE EL MAPA */
.flash-highlight {
  animation: flash 0.6s ease-out 3;
  position: relative;
  z-index: 100;
}

@keyframes flash {
  0% {
    background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%);
    transform: scale(1);
  }
  50% {
    background: linear-gradient(135deg, #ffd4c4 0%, #ffb8a0 100%);
    transform: scale(1.02);
    box-shadow: 0 8px 30px rgba(255, 107, 53, 0.4);
  }
  100% {
    background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%);
    transform: scale(1);
  }
}

/* 🆕 ESTILOS PARA ELEMENTO SELECCIONADO DESDE MAPA */
.poi-card.seleccionado-desde-mapa,
.geozona-card.seleccionado-desde-mapa {
  border: 2px solid #ff6b35;
  background: linear-gradient(135deg, #fff5f2 0%, #ffe8e0 100%);
  box-shadow: 0 4px 20px rgba(255, 107, 53, 0.2);
  animation: highlight-selected 0.6s ease-out;
}

@keyframes highlight-selected {
  0% {
    transform: scale(0.98);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>