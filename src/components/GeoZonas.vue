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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePOIs } from 'src/composables/usePOIs'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'

const userId = ref(auth.currentUser?.uid || '')

const emit = defineEmits(['close', 'item-seleccionado'])
const $q = useQuasar()

// ⚠️ IMPORTANTE: Debes obtener el userId del usuario autenticado
// Por ejemplo, desde Vuex/Pinia o Firebase Auth

// Usar el composable de POIs
const { crearPOI, obtenerPOIs, actualizarPOI, eliminarPOI } = usePOIs(userId.value)

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
const marcadorActivo = ref(null);

const nuevoPOI = ref({
  nombre: '',
  direccion: '',
  grupoId: null,
  notas: '',
  coordenadas: null,
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

const items = ref([])

onUnmounted(() => {
  if (marcadorActivo.value) {
    // Buscamos el mapa de nuevo para eliminar la capa
    const mapPage = document.querySelector('#map-page');
    if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
      mapPage._mapaAPI.map.removeLayer(marcadorActivo.value);
      console.log('🗑️ Marcador activo eliminado al desmontar el componente.');
    }
    marcadorActivo.value = null;
  }
});

// Cargar POIs al montar el componente
onMounted(async () => {
  try {
    const poisCargados = await obtenerPOIs()
    items.value = poisCargados
    console.log('✅ POIs cargados:', poisCargados.length)
  } catch (err) {
    console.error('Error al cargar POIs:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al cargar los puntos de interés',
      caption: err.message,
    })
  }
})

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

function guardarGeozona() {
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
    }
  } else {
    items.value.push({
      id: items.value.length + 1,
      nombre: nuevaGeozona.value.nombre,
      direccion: `Radio: ${nuevaGeozona.value.radio}m`,
      tipo: 'geozona',
      grupoId: nuevaGeozona.value.grupoId,
      notas: nuevaGeozona.value.notas,
    })
  }

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
  if (!itemMenu.value) return;

  console.log('📍 Ver en mapa:', itemMenu.value);

  // Cerrar el menú contextual
  menuContextualVisible.value = false;

  // Buscar el mapa
  const mapPage = document.querySelector('#map-page');
  if (!mapPage || !mapPage._mapaAPI) {
    console.error('❌ No se encontró la API del mapa.');
    return;
  }

  const mapaAPI = mapPage._mapaAPI;

  // Asegurarnos de que es un POI y que tiene coordenadas
  if (itemMenu.value.tipo === 'poi' && itemMenu.value.coordenadas) {
    // ⭐ CORRECCIÓN AQUÍ: Desestructurar desde .coordenadas
    const { lat, lng } = itemMenu.value.coordenadas;

    // ⭐ NUEVO: Añadir una validación de seguridad
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('❌ Coordenadas inválidas:', itemMenu.value.coordenadas);
      $q.notify({
        type: 'negative',
        message: 'Este punto de interés no tiene coordenadas válidas.',
      });
      return;
    }

    const popupContent = `
      <div style="min-width: 200px;">
        <b style="font-size: 16px;">📍 ${itemMenu.value.nombre}</b>
        <p style="margin: 8px 0 4px 0; font-size: 13px; color: #666;">
          ${itemMenu.value.direccion}
        </p>
      </div>
    `;

    // ⭐ LÓGICA PRINCIPAL: ACTUALIZAR O CREAR
    if (marcadorActivo.value) {
      // Si el marcador ya existe, solo actualizamos su posición y popup
      console.log('🔄 Actualizando marcador existente...');
      marcadorActivo.value.setLatLng([lat, lng]);
      marcadorActivo.value.setPopupContent(popupContent);
    } else {
      // Si es la primera vez, lo creamos
      console.log('✨ Creando nuevo marcador activo...');
      marcadorActivo.value = mapaAPI.L.marker([lat, lng], {
        icon: mapaAPI.L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(mapaAPI.map);

      marcadorActivo.value.bindPopup(popupContent);
    }

    // Abrir el popup y centrar el mapa
    marcadorActivo.value.openPopup();
    mapaAPI.map.setView([lat, lng], 18);

    emit('item-seleccionado', itemMenu.value);
  } else {
    // Caso en que no es un POI o no tiene coordenadas
    console.warn('⚠️ El item seleccionado no es un POI o no tiene coordenadas.');
    $q.notify({
      type: 'warning',
      message: 'No se puede mostrar este elemento en el mapa.',
    });
  }
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

// 🔥 FUNCIÓN MODIFICADA PARA FIREBASE
// 🔥 VERSIÓN CORREGIDA CON CONFIRM NATIVO
const eliminarItem = async () => {
  if (!itemMenu.value) return

  try {
    // ✅ USAR CONFIRM NATIVO - SIEMPRE FUNCIONA
    const confirmacion = window.confirm(`¿Estás seguro de eliminar "${itemMenu.value.nombre}"?`)

    if (!confirmacion) {
      console.log('Eliminación cancelada por el usuario')
      return
    }

    console.log('✅ Confirmación recibida, eliminando POI...')

    // Mostrar loading (si está disponible)
    if ($q && $q.loading) {
      $q.loading.show({ message: 'Eliminando POI...' })
    }

    // Eliminar de Firebase
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

    // Eliminar del array local
    const index = items.value.findIndex((i) => i.id === itemMenu.value.id)
    if (index > -1) {
      items.value.splice(index, 1)
      console.log('✅ POI eliminado del array local')
    }

    // Mostrar notificación de éxito
    if ($q && $q.notify) {
      $q.notify({
        type: 'positive',
        message: 'POI eliminado correctamente',
        icon: 'delete',
        timeout: 2000,
      })
    } else {
      console.log('✅ POI eliminado correctamente')
    }

    // Cerrar menú contextual
    menuContextualVisible.value = false
  } catch (err) {
    console.error('❌ Error al eliminar POI:', err)

    // Mostrar notificación de error
    if ($q && $q.notify) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar el POI',
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
</style>
