<template>
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
            :class="{ 'poi-selected': itemSeleccionado?.id === poi.id }"
            @click="seleccionarItem(poi)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar size="48px" :color="getColorGrupo(poi.grupoId)" text-color="white">
                <q-icon name="place" size="28px" />
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
            :class="{ 'geozona-selected': itemSeleccionado?.id === geozona.id }"
            @click="seleccionarItem(geozona)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar size="48px" :color="getColorGrupo(geozona.grupoId)" text-color="white">
                <q-icon name="layers" size="28px" />
              </q-avatar>

              <div class="col q-ml-md">
                <div class="text-subtitle1 text-weight-medium">{{ geozona.nombre }}</div>
                <div class="text-caption text-grey-7">
                  <q-icon name="straighten" size="14px" />
                  {{ geozona.direccion }}
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
      <q-btn fab color="primary" icon="add" class="floating-btn" @click="dialogNuevaGeozona = true">
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
          <!-- NUEVO: Input de Nombre -->
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

          <!-- Input de Dirección (existente) -->
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

    <!-- Dialog: Nueva Geozona -->
    <q-dialog v-model="dialogNuevaGeozona" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="bg-secondary text-white">
          <div class="row items-center">
            <q-icon name="layers" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">Nueva Geozona</div>
              <div class="text-caption">Define un área en el mapa</div>
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
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="Guardar"
            color="secondary"
            @click="guardarGeozona"
            :disable="!nuevaGeozona.nombre"
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
import { ref, computed, onMounted /*, onUnmounted */ } from 'vue'

const emit = defineEmits(['close', 'item-seleccionado'])

const vistaActual = ref('poi')
const itemSeleccionado = ref(null)
const busquedaPOI = ref('')
const busquedaGeozona = ref('')
const grupoSeleccionado = ref(null)
const grupoSeleccionadoGZ = ref(null)
const dialogNuevoPOI = ref(false)
const dialogNuevaGeozona = ref(false)
const menuContextualVisible = ref(false)
const itemMenu = ref(null)
const mapaComponent = ref(null)

const nuevoPOI = ref({
  nombre: '',
  direccion: '',
  grupoId: null,
  notas: '',
})

const nuevaGeozona = ref({
  nombre: '',
  radio: 50,
  grupoId: null,
  notas: '',
})

const grupos = ref([
  { id: 'grupo1', nombre: 'Clientes', color: 'blue' },
  { id: 'grupo2', nombre: 'Almacenes', color: 'green' },
  { id: 'grupo3', nombre: 'Oficinas', color: 'orange' },
])

const items = ref([
  {
    id: 1,
    nombre: 'A&J PROCESSING',
    direccion: 'Av. José Murua Martínez, Tijuana',
    tipo: 'poi',
    grupoId: 'grupo1',
  },
  {
    id: 2,
    nombre: 'AGUILAS DEL DESIERTO',
    direccion: 'Carretera Libre Tecate',
    tipo: 'poi',
    grupoId: 'grupo1',
  },
  {
    id: 3,
    nombre: 'ALBERTO PESQUEIRA',
    direccion: 'Calle Cite, Municipio de Tijuana',
    tipo: 'poi',
    grupoId: null,
  },
  {
    id: 4,
    nombre: 'ALLIANCE PLANTA 2',
    direccion: 'Radio: 100m',
    tipo: 'geozona',
    grupoId: 'grupo2',
  },
  {
    id: 5,
    nombre: 'ALLIANSE BLVD 200',
    direccion: 'Radio: 150m',
    tipo: 'geozona',
    grupoId: 'grupo2',
  },
])

const pois = computed(() => items.value.filter((i) => i.tipo === 'poi'))
const geozonas = computed(() => items.value.filter((i) => i.tipo === 'geozona'))
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
  if (grupoSeleccionadoGZ.value) {
    resultado = resultado.filter((g) => g.grupoId === grupoSeleccionadoGZ.value)
  }
  if (busquedaGeozona.value) {
    resultado = resultado.filter(
      (g) =>
        g.nombre.toLowerCase().includes(busquedaGeozona.value.toLowerCase()) ||
        g.direccion.toLowerCase().includes(busquedaGeozona.value.toLowerCase()),
    )
  }
  return resultado
})

const opcionesGruposSelect = computed(() => {
  const opciones = [{ label: 'Sin grupo', value: null }]
  grupos.value.forEach((grupo) => {
    opciones.push({ label: grupo.nombre, value: grupo.id })
  })
  return opciones
})

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

function guardarGeozona() {
  // Si tiene ID, es una edición
  if (nuevaGeozona.value.id) {
    const index = items.value.findIndex((i) => i.id === nuevaGeozona.value.id)

    if (index > -1) {
      items.value[index] = {
        ...items.value[index],
        nombre: nuevaGeozona.value.nombre,
        direccion: `Radio: ${nuevaGeozona.value.radio}m`,
        grupoId: nuevaGeozona.value.grupoId,
        notas: nuevaGeozona.value.notas,
      }

      console.log('✅ Geozona actualizada')
    }
  } else {
    // Es una nueva geozona
    items.value.push({
      id: items.value.length + 1,
      nombre: nuevaGeozona.value.nombre,
      direccion: `Radio: ${nuevaGeozona.value.radio}m`,
      tipo: 'geozona',
      grupoId: nuevaGeozona.value.grupoId,
      notas: nuevaGeozona.value.notas,
    })

    console.log('✅ Nueva geozona guardada')
  }

  // Resetear formulario
  nuevaGeozona.value = {
    nombre: '',
    radio: 50,
    grupoId: null,
    notas: '',
  }
  dialogNuevaGeozona.value = false
}
function mostrarMenuContextual(item) {
  itemMenu.value = item
  menuContextualVisible.value = true
}

function verEnMapa() {
  emit('item-seleccionado', itemMenu.value)
}

function editarItem() {
  if (!itemMenu.value) return

  if (itemMenu.value.tipo === 'poi') {
    // Llenar el formulario con los datos existentes
    nuevoPOI.value = {
      id: itemMenu.value.id, // Agregar el ID para saber que estamos editando
      nombre: itemMenu.value.nombre,
      direccion: itemMenu.value.direccion,
      coordenadas: itemMenu.value.coordenadas,
      grupoId: itemMenu.value.grupoId,
      notas: itemMenu.value.notas || '',
    }
    dialogNuevoPOI.value = true
  } else if (itemMenu.value.tipo === 'geozona') {
    // Extraer el radio de la dirección (formato: "Radio: XXXm")
    const radioMatch = itemMenu.value.direccion.match(/Radio:\s*(\d+)m/)
    const radio = radioMatch ? parseInt(radioMatch[1]) : 50

    nuevaGeozona.value = {
      id: itemMenu.value.id,
      nombre: itemMenu.value.nombre,
      radio: radio,
      grupoId: itemMenu.value.grupoId,
      notas: itemMenu.value.notas || '',
    }
    dialogNuevaGeozona.value = true
  }
}

// Función para eliminar un item
function eliminarItem() {
  if (!itemMenu.value) return

  // Mostrar confirmación
  const confirmacion = confirm(`¿Estás seguro de eliminar "${itemMenu.value.nombre}"?`)

  if (confirmacion) {
    // Buscar el índice del item
    const index = items.value.findIndex((i) => i.id === itemMenu.value.id)

    if (index > -1) {
      // Si es un POI, eliminar también su marcador del mapa
      if (itemMenu.value.tipo === 'poi' && itemMenu.value.coordenadas) {
        const mapPage = document.querySelector('#map-page')
        if (mapPage && mapPage._mapaAPI) {
          mapPage._mapaAPI.eliminarMarcadorPorCoordenadas(
            itemMenu.value.coordenadas.lat,
            itemMenu.value.coordenadas.lng,
          )
        }
      }

      // Eliminar el item de la lista
      items.value.splice(index, 1)

      console.log('✅ Item eliminado:', itemMenu.value.nombre)
    }
  }
}

// Buscar el componente del mapa cuando se monta
onMounted(() => {
  // Buscar el componente del mapa en el DOM
  setTimeout(() => {
    const mapPage = document.querySelector('#map-page')
    if (mapPage && mapPage.__vueParentComponent) {
      mapaComponent.value = mapPage.__vueParentComponent.exposed
    }
  }, 1000)
})

// Función para activar selección en el mapa
// Función para activar selección en el mapa
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

  // 3. Esperar un momento
  await new Promise((resolve) => setTimeout(resolve, 500))
  console.log('🔵 4. Esperando completado')

  // 4. Buscar el componente del mapa usando la nueva forma
  const mapPage = document.querySelector('#map-page')
  console.log('🔵 5. mapPage encontrado:', mapPage)
  console.log('🔵 6. _mapaAPI:', mapPage?._mapaAPI)

  if (mapPage && mapPage._mapaAPI) {
    const mapaAPI = mapPage._mapaAPI
    console.log('🔵 7. Funciones disponibles:', Object.keys(mapaAPI))

    if (mapaAPI.activarModoSeleccion) {
      console.log('✅ Mapa encontrado correctamente!')

      // Activar modo selección
      mapaAPI.activarModoSeleccion()
      console.log('🔵 8. Modo selección activado')

      // Esperar a que el usuario seleccione
      const ubicacion = await esperarSeleccionUbicacion(mapaAPI)
      console.log('🔵 9. Ubicación obtenida:', ubicacion)

      // Desactivar modo selección
      mapaAPI.desactivarModoSeleccion()

      // Si hay ubicación, guardar los datos (SIN modificar el nombre)
      if (ubicacion) {
        nuevoPOI.value.direccion = ubicacion.direccion
        nuevoPOI.value.coordenadas = ubicacion.coordenadas
        // ❌ QUITAMOS esta línea que auto-llenaba el nombre:
        // const partes = ubicacion.direccion.split(',')
        // if (!nuevoPOI.value.nombre) {
        //   nuevoPOI.value.nombre = partes[0].trim()
        // }
      }

      // Restaurar visibilidad del drawer
      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }

      // REABRIR el diálogo con los datos ya llenos
      dialogNuevoPOI.value = true
    } else {
      console.error('❌ mapaAPI no tiene las funciones necesarias')
      if (componentDialog) {
        componentDialog.style.opacity = '1'
        componentDialog.style.pointerEvents = 'auto'
      }
      alert('El mapa no está disponible (funciones no encontradas)')
    }
  } else {
    console.error('❌ No se encontró mapPage._mapaAPI')
    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }
    alert('El mapa no está disponible. Por favor espera a que cargue completamente.')
  }
}
// Función para esperar la selección del usuario
const esperarSeleccionUbicacion = (mapaAPI) => {
  console.log('🟢 Esperando selección del usuario...')
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const ubicacion = mapaAPI.getUbicacionSeleccionada()
      if (ubicacion) {
        console.log('✅ Ubicación seleccionada!', ubicacion)
        clearInterval(checkInterval)
        resolve(ubicacion)
      }
    }, 300)

    // Timeout después de 60 segundos
    setTimeout(() => {
      console.log('⏱️ Timeout alcanzado')
      clearInterval(checkInterval)
      resolve(null)
    }, 60000)
  })
}

// Cancelar nuevo POI
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
      mapaAPI.limpiarMarcadorTemporal() // Limpiar al cancelar
    }
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
}

// Modificar guardarPOI para incluir coordenadas
const guardarPOI = () => {
  const mapPage = document.querySelector('#map-page')

  // Si tiene ID, es una edición
  if (nuevoPOI.value.id) {
    const index = items.value.findIndex((i) => i.id === nuevoPOI.value.id)

    if (index > -1) {
      // Actualizar el item existente
      items.value[index] = {
        ...items.value[index],
        nombre: nuevoPOI.value.nombre,
        direccion: nuevoPOI.value.direccion,
        coordenadas: nuevoPOI.value.coordenadas,
        grupoId: nuevoPOI.value.grupoId,
        notas: nuevoPOI.value.notas,
      }

      // Actualizar marcador en el mapa si hay API disponible
      if (mapPage && mapPage._mapaAPI && nuevoPOI.value.coordenadas) {
        mapPage._mapaAPI.actualizarMarcador(
          nuevoPOI.value.coordenadas.lat,
          nuevoPOI.value.coordenadas.lng,
          nuevoPOI.value.nombre,
          nuevoPOI.value.direccion,
        )
      }

      console.log('✅ POI actualizado')
    }
  } else {
    // Es un nuevo POI
    if (mapPage && mapPage._mapaAPI) {
      mapPage._mapaAPI.confirmarMarcadorTemporal(nuevoPOI.value.nombre)
    }

    items.value.push({
      id: items.value.length + 1,
      nombre: nuevoPOI.value.nombre,
      direccion: nuevoPOI.value.direccion,
      coordenadas: nuevoPOI.value.coordenadas,
      tipo: 'poi',
      grupoId: nuevoPOI.value.grupoId,
      notas: nuevoPOI.value.notas,
    })

    console.log('✅ Nuevo POI guardado')
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
</style>
