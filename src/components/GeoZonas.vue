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
          :class="{ active: vistaActual === 'geozona' }"
          @click="cambiarVista('geozona')"
        >
          <q-icon name="layers" size="20px" />
          <span>Geozonas</span>
        </div>
        <div
          class="tab-item"
          :class="{ active: vistaActual === 'poi' }"
          @click="cambiarVista('poi')"
        >
          <q-icon name="place" size="20px" />
          <span>Puntos de Interés</span>
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

        <!--  BOTÓN CREAR GRUPO -->
        <q-btn
          outline
          dense
          icon="create_new_folder"
          label="Crear Grupo"
          color="orange"
          class="full-width q-mt-sm crear-grupo-btn"
          @click="dialogNuevoGrupo = true"
        >
          <q-tooltip>Crear un nuevo grupo para organizar ubicaciones</q-tooltip>
        </q-btn>
      </div>

      <!-- Filtro por grupos POIs -->
      <!-- Filtro por grupos POIs -->
      <div class="q-px-md q-pb-md" v-if="grupos.length > 0">
        <!-- Header colapsable -->
        <div class="filtro-header" @click="filtrosExpandidosPOI = !filtrosExpandidosPOI">
          <div class="text-caption text-grey-7 text-weight-medium">FILTRAR POR GRUPO</div>
          <div class="filtro-actions">
            <q-chip dense color="primary" text-color="white" size="sm">
              {{ grupoSeleccionado !== null ? '1 filtro activo' : 'Sin filtros' }}
            </q-chip>
            <q-icon
              :name="filtrosExpandidosPOI ? 'expand_less' : 'expand_more'"
              size="20px"
              color="grey-7"
            />
          </div>
        </div>

        <!-- Chips colapsables -->
        <q-slide-transition>
          <div v-show="filtrosExpandidosPOI" class="chips-container q-mt-sm">
            <!--  CHIP "TODOS" -->
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
              Todos ({{ totalPOIs }})
            </q-chip>

            <!--  CHIPS DE GRUPOS -->
            <q-chip
              v-for="grupo in grupos"
              :key="grupo.id"
              :outline="grupoSeleccionado !== grupo.id"
              :style="{
                background: grupoSeleccionado === grupo.id ? grupo.color : 'transparent',
                borderColor: grupo.color,
                color: grupoSeleccionado === grupo.id ? 'white' : grupo.color,
              }"
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
        </q-slide-transition>
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
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === poi.id,
            }"
            :data-ubicacion-id="poi.id"
            @click="seleccionarItem(poi)"
            @dblclick="verEnMapaEnDirecto(poi)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar
                size="48px"
                :style="{ background: getColorGrupo(poi.grupoId) }"
                text-color="white"
              >
                <q-icon name="place" size="28px" />
                <!--  BADGE MEJORADO Y MÁS VISIBLE -->
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
      <q-btn
        fab
        color="primary"
        icon="add"
        class="floating-btn floating-btn-poi"
        @click="dialogNuevoPOI = true"
      >
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

        <!--  BOTÓN CREAR GRUPO -->
        <q-btn
          outline
          dense
          icon="create_new_folder"
          label="Crear Grupo"
          color="orange"
          class="full-width q-mt-sm crear-grupo-btn"
          @click="dialogNuevoGrupo = true"
        >
          <q-tooltip>Crear un nuevo grupo para organizar ubicaciones</q-tooltip>
        </q-btn>
      </div>

      <!-- Filtro por grupos Geozonas -->
      <div class="q-px-md q-pb-md" v-if="grupos.length > 0">
        <!-- Header colapsable -->
        <div class="filtro-header" @click="filtrosExpandidosGZ = !filtrosExpandidosGZ">
          <div class="text-caption text-grey-7 text-weight-medium">FILTRAR POR GRUPO</div>
          <div class="filtro-actions">
            <q-chip dense color="secondary" text-color="white" size="sm">
              {{ grupoSeleccionadoGZ !== null ? '1 filtro activo' : 'Sin filtros' }}
            </q-chip>
            <q-icon
              :name="filtrosExpandidosGZ ? 'expand_less' : 'expand_more'"
              size="20px"
              color="grey-7"
            />
          </div>
        </div>

        <!-- Chips colapsables -->
        <q-slide-transition>
          <div v-show="filtrosExpandidosGZ" class="chips-container q-mt-sm">
            <!--  CHIP "TODOS" -->
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
              Todos ({{ totalGeozonas }})
            </q-chip>

            <!--  CHIPS DE GRUPOS -->
            <q-chip
              v-for="grupo in grupos"
              :key="grupo.id"
              :outline="grupoSeleccionadoGZ !== grupo.id"
              :style="{
                background: grupoSeleccionadoGZ === grupo.id ? grupo.color : 'transparent',
                borderColor: grupo.color,
                color: grupoSeleccionadoGZ === grupo.id ? 'white' : grupo.color,
              }"
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
        </q-slide-transition>
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
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === geozona.id,
            }"
            :data-ubicacion-id="geozona.id"
            @click="seleccionarItem(geozona)"
            @dblclick="verEnMapaEnDirecto(geozona)"
          >
            <q-card-section class="row items-center q-pa-md">
              <q-avatar
                size="48px"
                :style="{ background: getColorGrupo(geozona.grupoId) }"
                text-color="white"
              >
                <q-icon name="layers" size="28px" />
                <!--  BADGE MEJORADO Y MÁS VISIBLE -->
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
      <q-btn
        fab
        color="primary"
        icon="add"
        class="floating-btn floating-btn-geozona"
        @click="abrirDialogGeozonaPoligonal"
      >
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

        <q-card-section class="form-body">
          <!-- 1. NOMBRE -->
          <div class="field-group">
            <label class="field-label">Nombre del punto</label>
            <q-input
              v-model="nuevoPOI.nombre"
              outlined
              dense
              placeholder="Ej: Oficina Central, Almacén..."
              maxlength="100"
              class="field-input"
            >
              <template v-slot:prepend><q-icon name="label" color="grey-5" size="18px" /></template>
            </q-input>
          </div>

          <!-- 2. GRUPO -->
          <div class="field-group">
            <label class="field-label">Grupo <span class="field-optional">(opcional)</span></label>
            <q-select
              v-model="nuevoPOI.grupoId"
              :options="opcionesGruposSelect"
              outlined
              dense
              emit-value
              map-options
              class="field-input"
            >
              <template v-slot:prepend
                ><q-icon name="folder" color="grey-5" size="18px"
              /></template>
            </q-select>
          </div>

          <!-- 3. COLOR -->
          <div class="field-group" v-if="!nuevoPOI.grupoId">
            <label class="field-label"
              ><q-icon name="palette" size="14px" class="q-mr-xs" />Color del POI</label
            >
            <div class="color-palette-compact">
              <div
                v-for="color in paletaColoresPOI"
                :key="color.valor"
                class="color-dot"
                :class="{ 'color-dot-active': nuevoPOI.color === color.valor }"
                :style="{ background: color.valor }"
                @click="nuevoPOI.color = color.valor"
              >
                <q-icon
                  v-if="nuevoPOI.color === color.valor"
                  name="check"
                  size="14px"
                  color="white"
                />
                <q-tooltip>{{ color.nombre }}</q-tooltip>
              </div>
              <div class="color-dot color-dot-custom" @click="mostrarColorPickerPOI = true">
                <q-icon name="colorize" size="14px" color="grey-6" />
                <q-tooltip>Color personalizado</q-tooltip>
              </div>
            </div>
            <div class="color-preview-inline">
              <div class="color-swatch-small" :style="{ background: nuevoPOI.color }"></div>
              <span class="color-hex-small">{{ nuevoPOI.color.toUpperCase() }}</span>
            </div>
          </div>

          <div class="field-group" v-else>
            <label class="field-label"
              ><q-icon name="palette" size="14px" class="q-mr-xs" />Color</label
            >
            <div class="color-inherited">
              <div class="color-swatch-small" :style="{ background: nuevoPOI.color }"></div>
              <span class="text-caption text-grey-6"
                >Heredado del grupo · {{ nuevoPOI.color.toUpperCase() }}</span
              >
            </div>
          </div>

          <!-- 4. UBICACIÓN EN EL MAPA -->
          <div class="field-group">
            <label class="field-label">Ubicación en el mapa</label>
            <div v-if="!nuevoPOI.direccion" class="map-action-btn" @click="activarSeleccionMapa">
              <div class="map-action-icon">
                <q-icon name="add_location_alt" size="26px" color="white" />
              </div>
              <div class="map-action-content">
                <div class="map-action-title">Marcar en el mapa</div>
                <div class="map-action-subtitle">Haz clic para seleccionar la ubicación</div>
              </div>
              <q-icon name="chevron_right" size="20px" color="grey-4" />
            </div>
            <div v-else class="map-action-btn map-action-btn--done" @click="activarSeleccionMapa">
              <div class="map-action-icon map-action-icon--done">
                <q-icon name="location_on" size="26px" color="white" />
              </div>
              <div class="map-action-content">
                <div
                  class="map-action-title"
                  style="font-size: 12px; line-height: 1.4; white-space: normal"
                >
                  {{ nuevoPOI.direccion }}
                </div>
                <div class="map-action-subtitle">Toca para cambiar ubicación</div>
              </div>
            </div>
          </div>

          <!-- 5. NOTAS -->
          <div class="field-group">
            <label class="field-label">Notas <span class="field-optional">(opcional)</span></label>
            <q-input
              v-model="nuevoPOI.notas"
              outlined
              dense
              type="textarea"
              rows="2"
              placeholder="Instrucciones, referencias..."
              class="field-input"
            >
              <template v-slot:prepend
                ><q-icon name="sticky_note_2" color="grey-5" size="18px"
              /></template>
            </q-input>
          </div>

          <!-- Color picker dialog POI -->
          <q-dialog v-model="mostrarColorPickerPOI">
            <q-card style="min-width: 300px">
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Elige un color</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>
              <q-card-section>
                <q-color v-model="nuevoPOI.color" format-model="hex" default-view="palette" />
              </q-card-section>
              <q-card-actions align="right">
                <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
                <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
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
    <!--  Dialog: Crear Nuevo Grupo -->
    <q-dialog v-model="dialogNuevoGrupo" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section
          style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
          class="text-white"
        >
          <div class="row items-center">
            <q-icon name="create_new_folder" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">Nuevo Grupo</div>
              <div class="text-caption">Organiza tus ubicaciones</div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" @click="cancelarNuevoGrupo" color="white" />
          </div>
        </q-card-section>

        <q-card-section class="form-body">
          <!-- 1. NOMBRE -->
          <div class="field-group">
            <label class="field-label">Nombre del grupo</label>
            <q-input
              v-model="nuevoGrupo.nombre"
              outlined
              dense
              placeholder="Ej: Clientes, Almacenes, Oficinas..."
              class="field-input"
            >
              <template v-slot:prepend>
                <q-icon name="label" color="grey-5" size="18px" />
              </template>
            </q-input>
          </div>

          <!-- 2. COLOR -->
          <div class="field-group">
            <label class="field-label"
              ><q-icon name="palette" size="14px" class="q-mr-xs" />Color del grupo</label
            >
            <div class="color-palette-compact">
              <div
                v-for="color in paletaColores"
                :key="color.valor"
                class="color-dot"
                :class="{ 'color-dot-active': nuevoGrupo.color === color.valor }"
                :style="{ background: color.valor }"
                @click="nuevoGrupo.color = color.valor"
              >
                <q-icon
                  v-if="nuevoGrupo.color === color.valor"
                  name="check"
                  size="14px"
                  color="white"
                />
                <q-tooltip>{{ color.nombre }}</q-tooltip>
              </div>
              <div class="color-dot color-dot-custom" @click="mostrarColorPickerGrupo = true">
                <q-icon name="colorize" size="14px" color="grey-6" />
                <q-tooltip>Color personalizado</q-tooltip>
              </div>
            </div>
            <div class="color-preview-inline">
              <div class="color-swatch-small" :style="{ background: nuevoGrupo.color }"></div>
              <span class="color-hex-small">{{ nuevoGrupo.color.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Preview del grupo -->
          <div class="field-group">
            <label class="field-label">Vista previa</label>
            <div class="grupo-preview">
              <div class="grupo-preview-icon" :style="{ background: nuevoGrupo.color }">
                <q-icon name="folder" size="24px" color="white" />
              </div>
              <div class="grupo-preview-info">
                <div class="grupo-preview-nombre">
                  {{ nuevoGrupo.nombre || 'Nombre del grupo' }}
                </div>
                <div class="grupo-preview-sub">0 ubicaciones</div>
              </div>
              <div
                class="grupo-preview-badge"
                :style="{ background: nuevoGrupo.color + '22', color: nuevoGrupo.color }"
              >
                Nuevo
              </div>
            </div>
          </div>

          <!-- Color picker -->
          <q-dialog v-model="mostrarColorPickerGrupo">
            <q-card style="min-width: 300px">
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Elige un color</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>
              <q-card-section>
                <q-color v-model="nuevoGrupo.color" format-model="hex" default-view="palette" />
              </q-card-section>
              <q-card-actions align="right">
                <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
                <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" @click="cancelarNuevoGrupo" />
          <q-btn
            unelevated
            label="Crear Grupo"
            style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white"
            @click="guardarNuevoGrupo"
            :disable="!nuevoGrupo.nombre.trim()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!--  Dialog del Color Picker para Grupos -->
    <q-dialog v-model="mostrarColorPickerGrupo">
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Elige un color</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-color v-model="nuevoGrupo.color" format-model="hex" default-view="palette" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Slider flotante para ajustar radio del POI -->
    <transition name="slide-up">
      <div v-if="mostrarSliderRadio" class="slider-flotante-container">
        <q-card class="slider-flotante-card">
          <q-card-section class="q-pa-md">
            <div class="row items-center q-mb-sm">
              <q-icon name="radio_button_unchecked" size="24px" color="primary" class="q-mr-sm" />
              <div class="col">
                <div class="text-subtitle2 text-weight-bold">Radio del POI</div>
                <div class="text-caption text-grey-7">Ajusta el área de cobertura</div>
              </div>
            </div>

            <!-- Vista previa del valor -->
            <div class="radius-display q-mb-md">
              <div class="radius-value">{{ nuevoPOI.radio }}m</div>
              <div class="radius-sublabel">metros de radio</div>
            </div>

            <!-- Slider principal -->
            <q-slider
              v-model="nuevoPOI.radio"
              :min="5"
              :max="500"
              :step="10"
              color="primary"
              track-color="grey-3"
              label
              :label-value="nuevoPOI.radio + 'm'"
              @update:model-value="actualizarRadioPOI"
              class="q-mb-sm"
            />

            <!-- Valores mín/máx -->
            <div class="row justify-between text-caption text-grey-6">
              <span>5m</span>
              <span>500m</span>
            </div>

            <!-- Atajos rápidos -->
            <div class="q-mt-md">
              <div class="text-caption text-grey-7 q-mb-xs">Atajos rápidos:</div>
              <div class="row q-gutter-xs">
                <q-btn
                  dense
                  outline
                  color="primary"
                  label="5m"
                  size="sm"
                  @click="establecerRadio(5)"
                />
                <q-btn
                  dense
                  outline
                  color="primary"
                  label="10m"
                  size="sm"
                  @click="establecerRadio(10)"
                />
                <q-btn
                  dense
                  outline
                  color="primary"
                  label="20m"
                  size="sm"
                  @click="establecerRadio(20)"
                />
                <q-btn
                  dense
                  outline
                  color="primary"
                  label="50m"
                  size="sm"
                  @click="establecerRadio(50)"
                />
                <q-btn
                  dense
                  outline
                  color="primary"
                  label="500m"
                  size="sm"
                  @click="establecerRadio(500)"
                />
              </div>
            </div>
          </q-card-section>

          <!-- Botón de cerrar -->
          <!-- En el template del slider flotante, las q-card-actions deben tener: -->
          <q-card-actions align="between" class="q-px-md q-pb-md">
            <q-btn
              flat
              dense
              icon="close"
              color="grey-7"
              label="Cancelar"
              @click="cancelarNuevoPOI"
            />
            <q-btn
              unelevated
              color="primary"
              icon="check"
              label="Continuar"
              @click="continuarAlDialog"
            />
          </q-card-actions>
        </q-card>
      </div>
    </transition>
    <!-- Dialog: Nueva Geozona -->
    <q-dialog v-model="dialogNuevaGeozona" persistent>
      <q-card style="min-width: 400px; max-width: 500px" class="dialog-nueva-geozona">
        <q-card-section class="bg-secondary text-white">
          <div class="row items-center">
            <q-icon name="layers" size="32px" class="q-mr-md" />
            <div>
              <div class="text-h6">Nueva Geozona</div>
              <div class="text-caption">Define un área con múltiples puntos</div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" v-close-popup color="white" />
          </div>
        </q-card-section>
        <q-dialog v-model="dialogNuevaGeozona" persistent>
          <q-card style="min-width: 400px; max-width: 500px">
            <q-card-section class="bg-secondary text-white">
              <div class="row items-center">
                <q-icon name="layers" size="32px" class="q-mr-md" />
                <div>
                  <div class="text-h6">Nueva Geozona</div>
                  <div class="text-caption">Define un área con múltiples puntos</div>
                </div>
                <q-space />
                <q-btn flat dense round icon="close" v-close-popup color="white" />
              </div>
            </q-card-section>

            <q-card-section class="form-body">
              <!-- 1. NOMBRE -->
              <div class="field-group">
                <label class="field-label">Nombre de la zona</label>
                <q-input
                  v-model="nuevaGeozona.nombre"
                  outlined
                  dense
                  placeholder="Ej: Zona Norte, Almacén Central..."
                  class="field-input input-nombre-geozona"
                >
                  <template v-slot:prepend
                    ><q-icon name="label" color="grey-5" size="18px"
                  /></template>
                </q-input>
              </div>

              <!-- 2. GRUPO -->
              <div class="field-group">
                <label class="field-label"
                  >Grupo <span class="field-optional">(opcional)</span></label
                >
                <q-select
                  v-model="nuevaGeozona.grupoId"
                  :options="opcionesGruposSelect"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="field-input select-grupo-geozona"
                >
                  <template v-slot:prepend
                    ><q-icon name="folder" color="grey-5" size="18px"
                  /></template>
                </q-select>
              </div>

              <!-- 3. COLOR -->
              <div class="field-group" v-if="!nuevaGeozona.grupoId">
                <label class="field-label"
                  ><q-icon name="palette" size="14px" class="q-mr-xs" />Color de la geozona</label
                >
                <div class="color-palette-compact color-palette-geozona">
                  <div
                    v-for="color in paletaColores"
                    :key="color.valor"
                    class="color-dot"
                    :class="{ 'color-dot-active': nuevaGeozona.color === color.valor }"
                    :style="{ background: color.valor }"
                    @click="nuevaGeozona.color = color.valor"
                  >
                    <q-icon
                      v-if="nuevaGeozona.color === color.valor"
                      name="check"
                      size="14px"
                      color="white"
                    />
                    <q-tooltip>{{ color.nombre }}</q-tooltip>
                  </div>
                  <div class="color-dot color-dot-custom" @click="mostrarColorPicker = true">
                    <q-icon name="colorize" size="14px" color="grey-6" />
                    <q-tooltip>Color personalizado</q-tooltip>
                  </div>
                </div>
                <div class="color-preview-inline">
                  <div class="color-swatch-small" :style="{ background: nuevaGeozona.color }"></div>
                  <span class="color-hex-small">{{ nuevaGeozona.color.toUpperCase() }}</span>
                </div>
              </div>

              <div class="field-group" v-else>
                <label class="field-label"
                  ><q-icon name="palette" size="14px" class="q-mr-xs" />Color</label
                >
                <div class="color-inherited">
                  <div class="color-swatch-small" :style="{ background: nuevaGeozona.color }"></div>
                  <span class="text-caption text-grey-6"
                    >Heredado del grupo · {{ nuevaGeozona.color.toUpperCase() }}</span
                  >
                </div>
              </div>

              <!-- 4. PUNTOS DEL POLÍGONO -->
              <div class="field-group">
                <label class="field-label">Puntos del polígono</label>
                <div
                  v-if="!nuevaGeozona.puntos || nuevaGeozona.puntos.length === 0"
                  class="map-action-btn map-selector-geozona"
                  @click="activarSeleccionGeozonaPoligonal"
                >
                  <div class="map-action-icon">
                    <q-icon name="edit_location_alt" size="26px" color="white" />
                  </div>
                  <div class="map-action-content">
                    <div class="map-action-title">Seleccionar en el mapa</div>
                    <div class="map-action-subtitle">Haz clic para definir los vértices</div>
                  </div>
                  <q-icon name="chevron_right" size="20px" color="grey-4" />
                </div>
                <div
                  v-else
                  class="map-action-btn map-action-btn--done"
                  @click="activarSeleccionGeozonaPoligonal"
                >
                  <div class="map-action-icon map-action-icon--done">
                    <q-icon name="check_circle" size="26px" color="white" />
                  </div>
                  <div class="map-action-content">
                    <div class="map-action-title">
                      {{ nuevaGeozona.puntos.length }} puntos definidos
                    </div>
                    <div class="map-action-subtitle">Toca para editar el polígono</div>
                  </div>
                  <div class="puntos-chips-inline">
                    <q-chip
                      v-for="(_, index) in nuevaGeozona.puntos.slice(0, 3)"
                      :key="index"
                      dense
                      removable
                      color="teal-1"
                      text-color="teal-8"
                      size="sm"
                      @remove="eliminarPuntoPoligono(index)"
                      @click.stop
                      >P{{ index + 1 }}</q-chip
                    >
                    <q-chip
                      v-if="nuevaGeozona.puntos.length > 3"
                      dense
                      color="grey-2"
                      text-color="grey-7"
                      size="sm"
                      >+{{ nuevaGeozona.puntos.length - 3 }}</q-chip
                    >
                  </div>
                </div>
              </div>

              <!-- 5. NOTAS -->
              <div class="field-group">
                <label class="field-label"
                  >Notas <span class="field-optional">(opcional)</span></label
                >
                <q-input
                  v-model="nuevaGeozona.notas"
                  outlined
                  dense
                  type="textarea"
                  rows="2"
                  placeholder="Instrucciones, referencias..."
                  class="field-input notas-geozona"
                >
                  <template v-slot:prepend
                    ><q-icon name="sticky_note_2" color="grey-5" size="18px"
                  /></template>
                </q-input>
              </div>

              <!-- Color picker dialog -->
              <q-dialog v-model="mostrarColorPicker">
                <q-card style="min-width: 300px">
                  <q-card-section class="row items-center q-pb-none">
                    <div class="text-h6">Elige un color</div>
                    <q-space />
                    <q-btn icon="close" flat round dense v-close-popup />
                  </q-card-section>
                  <q-card-section>
                    <q-color
                      v-model="nuevaGeozona.color"
                      format-model="hex"
                      default-view="palette"
                    />
                  </q-card-section>
                  <q-card-actions align="right">
                    <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
                    <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
                  </q-card-actions>
                </q-card>
              </q-dialog>
            </q-card-section>

            <q-card-actions align="right" class="q-px-lg q-pb-lg acciones-geozona">
              <q-btn
                flat
                label="Cancelar"
                color="grey-7"
                v-close-popup
                @click="cancelarNuevaGeozona"
              />
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

    <!-- Menú contextual MODIFICADO en GeoZonas.vue -->
    <!-- Menú contextual MODERNO -->
    <q-dialog
      v-model="menuContextualVisible"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="menu-contextual-moderno">
        <!-- Header con gradiente -->
        <!-- Header minimalista y elegante -->
        <q-card-section class="menu-header">
          <div class="header-content-minimal">
            <div class="header-top">
              <q-chip
                dense
                :color="itemMenu?.tipo === 'poi' ? 'blue-6' : 'teal-6'"
                text-color="white"
                :icon="itemMenu?.tipo === 'poi' ? 'place' : 'layers'"
              >
                {{ itemMenu?.tipo === 'poi' ? 'POI' : 'Geozona' }}
              </q-chip>
            </div>
            <div class="header-title-minimal">{{ itemMenu?.nombre }}</div>
          </div>
        </q-card-section>

        <q-separator />

        <!-- Opciones del menú -->
        <q-list class="menu-options">
          <!-- Crear Evento -->
          <q-item
            clickable
            v-ripple
            @click="crearEventoParaUbicacion()"
            class="menu-option-item crear-evento"
          >
            <q-item-section avatar>
              <div class="option-icon-wrapper evento">
                <q-icon name="notifications_active" size="24px" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="option-label">Crear Evento</q-item-label>
              <q-item-label caption class="option-caption">
                Configurar alertas para esta ubicación
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="grey-5" />
            </q-item-section>
          </q-item>

          <!-- Editar -->
          <q-item
            clickable
            v-ripple
            @click="(editarItem(), (menuContextualVisible = false))"
            class="menu-option-item editar"
          >
            <q-item-section avatar>
              <div class="option-icon-wrapper editar">
                <q-icon name="edit" size="24px" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="option-label">Editar</q-item-label>
              <q-item-label caption class="option-caption">Modificar información</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="grey-5" />
            </q-item-section>
          </q-item>

          <!-- Ver en Mapa -->
          <q-item
            clickable
            v-ripple
            @click="(verEnMapa(), (menuContextualVisible = false))"
            class="menu-option-item ver-mapa"
          >
            <q-item-section avatar>
              <div class="option-icon-wrapper ver-mapa">
                <q-icon name="map" size="24px" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="option-label">Ver en Mapa</q-item-label>
              <q-item-label caption class="option-caption">Centrar en ubicación</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="grey-5" />
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <!-- Eliminar -->
          <q-item
            clickable
            v-ripple
            @click="(eliminarItem(), (menuContextualVisible = false))"
            class="menu-option-item eliminar"
          >
            <q-item-section avatar>
              <div class="option-icon-wrapper eliminar">
                <q-icon name="delete" size="24px" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="option-label text-negative">Eliminar</q-item-label>
              <q-item-label caption class="option-caption text-negative">
                Eliminar permanentemente
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="negative" />
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Botón Cancelar -->
        <q-card-actions class="menu-actions">
          <q-btn
            flat
            label="Cancelar"
            color="grey-7"
            class="full-width cancel-btn"
            v-close-popup
            size="md"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Dialog rápido de nuevo evento desde ubicación -->
    <q-dialog
      v-model="dialogEventoRapido"
      persistent
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="dialog-evento-rapido">
        <q-card-section
          style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%)"
          class="text-white"
        >
          <div class="row items-center">
            <div
              class="map-action-icon map-action-icon--done q-mr-md"
              style="
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.2);
              "
            >
              <q-icon name="notifications_active" size="22px" color="white" />
            </div>
            <div>
              <div class="text-subtitle1 text-weight-bold">Nuevo Evento</div>
              <div class="text-caption" style="opacity: 0.85">
                {{ ubicacionParaEvento?.nombre }}
              </div>
            </div>
            <q-space />
            <q-btn
              flat
              dense
              round
              icon="close"
              color="white"
              @click="dialogEventoRapido = false"
            />
          </div>
        </q-card-section>

        <q-card-section class="form-body" style="max-height: 60vh; overflow-y: auto">
          <!-- Nombre -->
          <div class="field-group">
            <label class="field-label">Nombre del evento</label>
            <q-input
              v-model="eventoRapido.nombre"
              outlined
              dense
              placeholder="Ej: Entrada a zona restringida..."
              class="field-input"
            >
              <template v-slot:prepend><q-icon name="label" color="grey-5" size="18px" /></template>
            </q-input>
          </div>

          <!-- Descripcion -->
          <div class="field-group">
            <label class="field-label"
              >Descripción <span class="field-optional">(opcional)</span></label
            >
            <q-input
              v-model="eventoRapido.descripcion"
              outlined
              dense
              type="textarea"
              rows="2"
              placeholder="Detalle del evento..."
              class="field-input"
            >
              <template v-slot:prepend
                ><q-icon name="description" color="grey-5" size="18px"
              /></template>
            </q-input>
          </div>

          <!-- Activacion (Entrada/Salida) -->
          <div class="field-group">
            <label class="field-label">Activar cuando</label>
            <div class="activacion-toggle">
              <div
                class="activacion-option"
                :class="{ 'activacion-option--active': eventoRapido.activacion === 'Entrada' }"
                @click="eventoRapido.activacion = 'Entrada'"
              >
                <q-icon name="login" size="20px" />
                <span>Entrada</span>
              </div>
              <div
                class="activacion-option"
                :class="{
                  'activacion-option--active activacion-option--salida':
                    eventoRapido.activacion === 'Salida',
                }"
                @click="eventoRapido.activacion = 'Salida'"
              >
                <q-icon name="logout" size="20px" />
                <span>Salida</span>
              </div>
              <div
                class="activacion-option"
                :class="{
                  'activacion-option--active activacion-option--ambos':
                    eventoRapido.activacion === 'Ambos',
                }"
                @click="eventoRapido.activacion = 'Ambos'"
              >
                <q-icon name="swap_horiz" size="20px" />
                <span>Ambos</span>
              </div>
            </div>

            <!-- AND/OR solo aparece cuando elige Ambos -->
            <div v-if="eventoRapido.activacion === 'Ambos'" class="operador-row q-mt-sm">
              <span class="text-caption text-grey-6 q-mr-sm">Condiciones con:</span>
              <div class="operador-mini-toggle">
                <div
                  class="operador-mini-option"
                  :class="{ 'operador-mini-active': eventoRapido.operador === 'AND' }"
                  @click="eventoRapido.operador = 'AND'"
                >
                  <q-icon name="done_all" size="14px" />
                  Y (Todas)
                </div>
                <div
                  class="operador-mini-option"
                  :class="{
                    'operador-mini-active operador-mini-or': eventoRapido.operador === 'OR',
                  }"
                  @click="eventoRapido.operador = 'OR'"
                >
                  <q-icon name="done" size="14px" />
                  O (Alguna)
                </div>
              </div>
            </div>
          </div>

          <!-- Frecuencia -->
          <div class="field-group">
            <label class="field-label">Frecuencia de alerta</label>
            <q-select
              v-model="eventoRapido.activacionAlerta"
              :options="[
                { label: 'Cada vez que ocurra', value: 'Cada vez' },
                { label: 'Al inicio (primera vez)', value: 'Al inicio' },
                { label: 'Una vez al día', value: 'Una vez al día' },
              ]"
              outlined
              dense
              emit-value
              map-options
              class="field-input"
            >
              <template v-slot:prepend
                ><q-icon name="repeat" color="grey-5" size="18px"
              /></template>
            </q-select>
          </div>
          <div class="field-group">
            <label class="field-label">Aplicación del evento</label>
            <q-select
              v-model="eventoRapido.aplicacion"
              :options="[
                { label: 'Siempre activo', value: 'siempre' },
                { label: 'A los días y horas establecidos', value: 'horario' },
              ]"
              outlined
              dense
              emit-value
              map-options
              class="field-input"
            >
              <template v-slot:prepend
                ><q-icon name="schedule" color="grey-5" size="18px"
              /></template>
            </q-select>
          </div>

          <!-- Horario (solo si eligio horario) -->
          <div v-if="eventoRapido.aplicacion === 'horario'" class="field-group">
            <label class="field-label">Días y horario</label>

            <q-select
              v-model="eventoRapido.diasSemana"
              :options="[
                { label: 'Lunes', value: 1 },
                { label: 'Martes', value: 2 },
                { label: 'Miércoles', value: 3 },
                { label: 'Jueves', value: 4 },
                { label: 'Viernes', value: 5 },
                { label: 'Sábado', value: 6 },
                { label: 'Domingo', value: 0 },
              ]"
              outlined
              dense
              multiple
              emit-value
              map-options
              use-chips
              label="Días de la semana"
              class="field-input q-mb-sm"
            >
              <template v-slot:prepend
                ><q-icon name="calendar_today" color="grey-5" size="18px"
              /></template>
            </q-select>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="eventoRapido.horaInicio"
                  outlined
                  dense
                  label="Hora inicio"
                  mask="time"
                  :rules="['time']"
                  class="field-input"
                >
                  <template v-slot:prepend
                    ><q-icon name="schedule" color="grey-5" size="18px"
                  /></template>
                  <template v-slot:append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="eventoRapido.horaInicio" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div class="col-6">
                <q-input
                  v-model="eventoRapido.horaFin"
                  outlined
                  dense
                  label="Hora fin"
                  mask="time"
                  :rules="['time']"
                  class="field-input"
                >
                  <template v-slot:prepend
                    ><q-icon name="schedule" color="grey-5" size="18px"
                  /></template>
                  <template v-slot:append>
                    <q-icon name="access_time" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="eventoRapido.horaFin" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" @click="dialogEventoRapido = false" />
          <q-btn
            unelevated
            label="Guardar Evento"
            icon-right="save"
            color="deep-orange"
            @click="guardarEventoRapido"
            :disable="!eventoRapido.nombre"
            :loading="loadingEventoRapido"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
// MODIFICAR esta línea existente:
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
//import mapboxgl from 'mapbox-gl'
//  NUEVO: Importar composable de eventos
import { useEventos } from 'src/composables/useEventos'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { useEventBus } from 'src/composables/useEventBus.js'
import { useGruposGeozonas } from 'src/composables/useGruposGeozonas'

const userId = ref(auth.currentUser?.uid || '')
const emit = defineEmits(['close', 'item-seleccionado', 'crear-evento-ubicacion'])
const $q = useQuasar()
//  AGREGAR esta línea
const { estadoCompartido, resetAbrirGeozonas } = useEventBus()
const props = defineProps({
  itemASeleccionar: { type: Object, default: null },
})
watch(
  () => props.itemASeleccionar,
  async (newVal) => {
    if (!newVal) return
    if (items.value.length === 0) {
      // Esperar a que los items carguen
      const unwatch = watch(items, (newItems) => {
        if (newItems.length > 0) {
          unwatch()
          handleSeleccionDesdeMapa(newVal)
        }
      })
      return
    }
    handleSeleccionDesdeMapa(newVal)
  },
)
// Usar el composable de POIs
const { crearPOI, obtenerPOIs, actualizarPOI, eliminarPOI } = usePOIs(userId.value)
//seleccionador de color para POI:
const mostrarColorPickerPOI = ref(false)
const mostrarColorPickerGrupo = ref(false)

const dialogEventoRapido = ref(false)
const loadingEventoRapido = ref(false)
const ubicacionParaEvento = ref(null)
const eventoRapido = ref({
  nombre: '',
  descripcion: '',
  activacion: 'Ambos',
  activacionAlerta: 'Al inicio',
  operador: 'OR',
  aplicacion: 'siempre',
  diasSemana: [],
  horaInicio: '08:00',
  horaFin: '18:00',
})

// Agregar paleta de colores para POIs (similar a la de geozonas)
const paletaColoresPOI = [
  { nombre: 'Rojo', valor: '#FF5252' },
  { nombre: 'Azul', valor: '#2196F3' },
  { nombre: 'Verde', valor: '#4CAF50' },
  { nombre: 'Naranja', valor: '#FF9800' },
  { nombre: 'Morado', valor: '#9C27B0' },
  { nombre: 'Amarillo', valor: '#FFC107' },
  { nombre: 'Rosa', valor: '#E91E63' },
  { nombre: 'Turquesa', valor: '#00BCD4' },
]
// Usar el composable de Geozonas
const {
  crearGeozona,
  obtenerGeozonas,
  actualizarGeozona,
  eliminarGeozona,
  migrarGeozonasExistentes,
} = useGeozonas(userId.value)

//  NUEVO: Cargar eventos para mostrar badges
const { obtenerEventos, eliminarEventosPorUbicacion, contarEventosPorUbicacion } = useEventos(
  userId.value,
)
const { obtenerGrupos, crearGrupo } = useGruposGeozonas(userId.value)
const eventosActivos = ref([])

//  NUEVO: Variable para controlar la selección desde el mapa
const ubicacionSeleccionadaDesdeMapa = ref(null)

// Estados reactivos
const vistaActual = ref('geozona')
const itemSeleccionado = ref(null)
const busquedaPOI = ref('')
const busquedaGeozona = ref('')
const grupoSeleccionado = ref(null)
const grupoSeleccionadoGZ = ref(null)
const dialogNuevoPOI = ref(false)
const dialogNuevaGeozona = ref(false)
//const dialogTipoGeozona = ref(false)
const menuContextualVisible = ref(false)
const itemMenu = ref(null)
const marcadorActivo = ref(null)
const poligonoActivo = ref(null)
const modoSeleccionGeozonaCircular = ref(false)
const modoSeleccionGeozonaPoligonal = ref(false)

//  NUEVAS VARIABLES PARA VISTA PREVIA
const posicionMouseActual = ref(null)
const lineaPreview = ref(null)
const poligonoPreview = ref(null)
const filtrosExpandidosPOI = ref(false)
const filtrosExpandidosGZ = ref(false)

const nuevoPOI = ref({
  nombre: '',
  direccion: '',
  grupoId: null,
  notas: '',
  coordenadas: null,
  radio: 100, //  NUEVO: Radio por defecto 100m
  color: '#FF5252',
})

const nuevaGeozona = ref({
  nombre: '',
  tipo: null,
  direccion: '',
  radio: 50,
  grupoId: null,
  notas: '',
  puntos: [],
  centro: null,
  color: '#4ECDC4', //  Color por defecto
})

const paletaColores = [
  { nombre: 'Turquesa', valor: '#4ECDC4' },
  { nombre: 'Azul', valor: '#3498DB' },
  { nombre: 'Verde', valor: '#2ECC71' },
  { nombre: 'Morado', valor: '#9B59B6' },
  { nombre: 'Naranja', valor: '#E67E22' },
  { nombre: 'Rojo', valor: '#E74C3C' },
  { nombre: 'Amarillo', valor: '#F39C12' },
  { nombre: 'Rosa', valor: '#FF6B9D' },
]

//  Estado para el selector de color personalizado
const mostrarColorPicker = ref(false)

const grupos = ref([])
const dialogNuevoGrupo = ref(false)
const nuevoGrupo = ref({
  nombre: '',
  color: '#4ECDC4',
})

const items = ref([])

const mostrarSliderRadio = ref(false)

//  NUEVA FUNCIÓN: Crear evento para la ubicación seleccionada
function crearEventoParaUbicacion() {
  if (!itemMenu.value) return
  menuContextualVisible.value = false

  // Solo resetear si es una ubicación diferente
  if (ubicacionParaEvento.value?.id !== itemMenu.value.id) {
    ubicacionParaEvento.value = itemMenu.value
    eventoRapido.value = {
      nombre: itemMenu.value.nombre || '',
      descripcion: '',
      activacion: 'Ambos',
      activacionAlerta: 'Al inicio',
      operador: 'OR',
      aplicacion: 'siempre',
      diasSemana: [],
      horaInicio: '08:00',
      horaFin: '18:00',
    }
  } else {
    ubicacionParaEvento.value = itemMenu.value
  }

  dialogEventoRapido.value = true
}

const guardarEventoRapido = async () => {
  if (!eventoRapido.value.nombre || !ubicacionParaEvento.value) return

  loadingEventoRapido.value = true

  try {
    const tipo = ubicacionParaEvento.value.tipo === 'poi' ? 'POI' : 'Geozona'

    // Construir condiciones segun activacion seleccionada
    const condiciones = []
    if (eventoRapido.value.activacion === 'Entrada' || eventoRapido.value.activacion === 'Ambos') {
      condiciones.push({
        tipo: tipo,
        ubicacionId: ubicacionParaEvento.value.id,
        activacion: 'Entrada',
      })
    }
    if (eventoRapido.value.activacion === 'Salida' || eventoRapido.value.activacion === 'Ambos') {
      condiciones.push({
        tipo: tipo,
        ubicacionId: ubicacionParaEvento.value.id,
        activacion: 'Salida',
      })
    }

    const eventoData = {
      nombre: eventoRapido.value.nombre,
      descripcion: eventoRapido.value.descripcion || '',
      activo: true,
      condiciones,
      activacionAlerta: eventoRapido.value.activacionAlerta,
      aplicacion: eventoRapido.value.aplicacion,
      operadoresLogicos:
        eventoRapido.value.activacion === 'Ambos' ? [eventoRapido.value.operador] : [],
      ...(eventoRapido.value.aplicacion === 'horario' && {
        diasSemana: eventoRapido.value.diasSemana,
        horaInicio: eventoRapido.value.horaInicio,
        horaFin: eventoRapido.value.horaFin,
      }),
    }

    // Usar el composable que ya tienes
    const { crearEvento } = useEventos(userId.value)
    await crearEvento(eventoData)

    // Recargar eventos para actualizar los badges
    const eventosActualizados = await obtenerEventos()
    eventosActivos.value = eventosActualizados.filter((e) => e.activo)

    $q.notify({
      type: 'positive',
      message: `Evento "${eventoRapido.value.nombre}" creado`,
      icon: 'check_circle',
      timeout: 2500,
    })

    dialogEventoRapido.value = false
  } catch (err) {
    console.error('Error al crear evento:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al crear el evento',
      caption: err.message,
    })
  } finally {
    loadingEventoRapido.value = false
  }
}

//  NUEVA FUNCIÓN: Continuar al dialog después de ajustar el radio
function continuarAlDialog() {
  // Ocultar slider
  mostrarSliderRadio.value = false

  // Restaurar visibilidad del drawer
  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  // Abrir dialog con los datos ya llenos
  dialogNuevoPOI.value = true
}

//  NUEVA FUNCIÓN: Establecer radio con atajos
function establecerRadio(valor) {
  nuevoPOI.value.radio = valor
  actualizarRadioPOI(valor)
}

//  Computed para saber qué ubicaciones tienen eventos
const ubicacionesConEventos = computed(() => {
  const set = new Set()

  eventosActivos.value.forEach((evento) => {
    if (evento.condiciones && evento.condiciones.length > 0) {
      evento.condiciones.forEach((condicion) => {
        if (condicion.ubicacionId) {
          const tipo = condicion.tipo === 'POI' ? 'poi' : 'geozona'
          set.add(`${tipo}-${condicion.ubicacionId}`)
        }
      })
    }
  })

  return set
})

//  Función para verificar si una ubicación tiene eventos
function tieneEventosAsignados(ubicacionId, tipo) {
  return ubicacionesConEventos.value.has(`${tipo}-${ubicacionId}`)
}

//  FUNCIÓN CENTRALIZADA PARA MANEJAR LA SELECCIÓN
function handleSeleccionDesdeMapa(item) {
  // Determinar si es POI o Geozona
  if (item.tipo === 'poi' || (item.coordenadas && !item.tipoGeozona)) {
    vistaActual.value = 'poi'
  } else if (item.tipo === 'geozona' || item.tipoGeozona) {
    vistaActual.value = 'geozona'
  }

  // Buscar el item en la lista ya cargada
  const itemEncontrado = items.value.find((i) => i.id === item.id)
  if (itemEncontrado) {
    // Seleccionar el item
    seleccionarItem(itemEncontrado)

    // Marcar como seleccionado desde el mapa
    ubicacionSeleccionadaDesdeMapa.value = itemEncontrado.id

    // Hacer scroll y resaltar después de un pequeño retraso para asegurar que el DOM esté listo
    setTimeout(() => {
      const elemento = document.querySelector(`[data-ubicacion-id="${itemEncontrado.id}"]`)
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
        elemento.classList.add('flash-highlight')
        setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
      }
    }, 300) // Un pequeño retraso es crucial aquí

    // Mostrar notificación
    $q.notify({
      type: 'positive',
      message: ` ${itemEncontrado.nombre}`,
      caption:
        itemEncontrado.tipo === 'poi'
          ? itemEncontrado.direccion
          : `Geozona ${itemEncontrado.tipoGeozona}`,
      icon: 'place',
      timeout: 2500,
      position: 'top',
    })

    // Limpiar la variable de control después de 4 segundos
    setTimeout(() => {
      ubicacionSeleccionadaDesdeMapa.value = null
    }, 4000)
  } else {
    console.error(' No se encontró el item con ID:', item.id)
    $q.notify({
      type: 'warning',
      message: 'No se encontró la ubicación seleccionada',
      icon: 'warning',
    })
  }
}

//  Función para contar eventos de una ubicación
function contarEventos(ubicacionId, tipo) {
  let count = 0
  eventosActivos.value.forEach((evento) => {
    if (evento.condiciones) {
      evento.condiciones.forEach((condicion) => {
        if (
          condicion.ubicacionId === ubicacionId &&
          ((tipo === 'poi' && condicion.tipo === 'POI') ||
            (tipo === 'geozona' && condicion.tipo === 'Geozona'))
        ) {
          count++
        }
      })
    }
  })
  return count
}
let ultimaPosicionMouse = null
let frameId = null

const manejarMovimientoMouse = (e) => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) return

  const mapaAPI = mapPage._mapaAPI
  const puntosActuales = mapaAPI.getPuntosSeleccionados ? mapaAPI.getPuntosSeleccionados() : []

  if (!puntosActuales || puntosActuales.length === 0) return

  //  Guardar posición sin actualizar reactive (más rápido)
  ultimaPosicionMouse = {
    lat: e.lngLat.lat,
    lng: e.lngLat.lng,
  }

  //  Cancelar frame anterior si existe
  if (frameId) {
    cancelAnimationFrame(frameId)
  }

  //  Usar requestAnimationFrame (automático 60fps)
  frameId = requestAnimationFrame(() => {
    posicionMouseActual.value = ultimaPosicionMouse
    actualizarVistaPrevia()
    frameId = null
  })
}
//  ACTUALIZAR VISTA PREVIA DEL POLÍGONO
const actualizarVistaPrevia = () => {
  if (!posicionMouseActual.value) return

  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const mapaAPI = mapPage._mapaAPI
  const map = mapaAPI.map

  const puntosActuales = mapaAPI.getPuntosSeleccionados ? mapaAPI.getPuntosSeleccionados() : []
  if (!puntosActuales || puntosActuales.length === 0) return

  const colorSeleccionado = nuevaGeozona.value?.color || '#4ECDC4'
  watch(
    () => nuevaGeozona.value.color,
    (nuevoColor) => {
      if (!modoSeleccionGeozonaPoligonal.value) return

      const mapPage = document.querySelector('#map-page')
      if (!mapPage || !mapPage._mapaAPI) return

      //  Usar la nueva función que agregamos
      if (mapPage._mapaAPI.actualizarColorPoligonoTemporal) {
        mapPage._mapaAPI.actualizarColorPoligonoTemporal(nuevoColor)
      }

      //  Actualizar preview también
      if (posicionMouseActual.value) {
        actualizarVistaPrevia()
      }
    },
  )

  //  Función para oscurecer color (inline para performance)
  const oscurecerColor = (hex, porcentaje = 30) => {
    hex = hex.replace('#', '')
    let r = parseInt(hex.substring(0, 2), 16)
    let g = parseInt(hex.substring(2, 4), 16)
    let b = parseInt(hex.substring(4, 6), 16)
    r = Math.floor(r * (1 - porcentaje / 100))
    g = Math.floor(g * (1 - porcentaje / 100))
    b = Math.floor(b * (1 - porcentaje / 100))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const borderColor = oscurecerColor(colorSeleccionado, 30)
  const ultimoPunto = puntosActuales[puntosActuales.length - 1]
  const mouseCoords = [posicionMouseActual.value.lng, posicionMouseActual.value.lat]

  //  LÍNEA DE PREVIEW - Solo actualizar data
  const lineData = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[ultimoPunto.lng, ultimoPunto.lat], mouseCoords],
    },
  }

  if (map.getSource('preview-line')) {
    //  SOLO actualizar datos - RÁPIDO
    map.getSource('preview-line').setData(lineData)
  } else {
    // Primera vez - crear source y layer
    map.addSource('preview-line', {
      type: 'geojson',
      data: lineData,
    })

    map.addLayer({
      id: 'preview-line',
      type: 'line',
      source: 'preview-line',
      paint: {
        'line-color': borderColor,
        'line-width': 2,
        'line-opacity': 0.7,
        'line-dasharray': [2, 2],
      },
    })
  }

  //  POLÍGONO DE PREVIEW
  if (puntosActuales.length >= 2) {
    const puntosPreview = [
      ...puntosActuales.map((p) => [p.lng, p.lat]),
      mouseCoords,
      [puntosActuales[0].lng, puntosActuales[0].lat],
    ]

    const polygonData = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [puntosPreview],
      },
    }

    if (map.getSource('preview-polygon')) {
      //  SOLO actualizar datos - RÁPIDO
      map.getSource('preview-polygon').setData(polygonData)
    } else {
      // Primera vez - crear source y layers
      map.addSource('preview-polygon', {
        type: 'geojson',
        data: polygonData,
      })

      map.addLayer({
        id: 'preview-polygon',
        type: 'fill',
        source: 'preview-polygon',
        paint: {
          'fill-color': colorSeleccionado,
          'fill-opacity': 0.2,
        },
      })

      map.addLayer({
        id: 'preview-polygon-outline',
        type: 'line',
        source: 'preview-polygon',
        paint: {
          'line-color': borderColor,
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2],
        },
      })
    }
  } else {
    // Remover polígono si hay menos de 2 puntos
    if (map.getSource('preview-polygon')) {
      if (map.getLayer('preview-polygon')) map.removeLayer('preview-polygon')
      if (map.getLayer('preview-polygon-outline')) map.removeLayer('preview-polygon-outline')
      map.removeSource('preview-polygon')
    }
  }
}

// Computed properties
const pois = computed(() => items.value.filter((i) => i.tipo === 'poi'))
const geozonas = computed(() => {
  const resultado = items.value.filter((i) => i.tipo === 'geozona')
  return resultado
})
const totalPOIs = computed(() => pois.value.length)
const totalGeozonas = computed(() => geozonas.value.length)
const gruposPOI = computed(() => grupos.value.length)
const gruposGeozona = computed(() => grupos.value.length)

const poisFiltrados = computed(() => {
  let resultado = pois.value

  //  CAMBIO: Solo filtrar si hay un grupo seleccionado Y NO es null
  if (grupoSeleccionado.value !== null) {
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

  //  CAMBIO: Solo filtrar si hay un grupo seleccionado Y NO es null
  if (grupoSeleccionadoGZ.value !== null) {
    resultado = resultado.filter((g) => g.grupoId === grupoSeleccionadoGZ.value)
  }

  if (busquedaGeozona.value) {
    resultado = resultado.filter(
      (g) =>
        g.nombre?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()) ||
        g.direccion?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()),
    )
  }
  return resultado
})

const opcionesGruposSelect = computed(() => {
  return [
    { label: '➕ Crear grupo nuevo', value: '__crear_nuevo__' },
    { label: 'Sin grupo', value: null },
    ...grupos.value.map((g) => ({
      label: g.nombre,
      value: g.id,
    })),
  ]
})

// Computed para validar si la geozona es válida
const esGeozonaValida = computed(() => {
  // Ahora solo validamos polígonos
  return (
    nuevaGeozona.value.tipo === 'poligono' &&
    nuevaGeozona.value.puntos &&
    nuevaGeozona.value.puntos.length >= 3
  )
})

//  Watch para heredar color en Geozonas
watch(
  () => nuevaGeozona.value.grupoId,
  (nuevoGrupoId) => {
    if (nuevoGrupoId === '__crear_nuevo__') {
      dialogNuevoGrupo.value = true
      nuevaGeozona.value.grupoId = null // Reset mientras se crea el grupo
      return
    }

    if (nuevoGrupoId && nuevoGrupoId !== null) {
      const grupo = grupos.value.find((g) => g.id === nuevoGrupoId)
      if (grupo) {
        nuevaGeozona.value.color = grupo.color
      }
    }
  },
)

//  Watch para heredar color en POIs
watch(
  () => nuevoPOI.value.grupoId,
  (nuevoGrupoId) => {
    if (nuevoGrupoId === '__crear_nuevo__') {
      dialogNuevoGrupo.value = true
      nuevoPOI.value.grupoId = null // Reset mientras se crea el grupo
      return
    }

    if (nuevoGrupoId && nuevoGrupoId !== null) {
      const grupo = grupos.value.find((g) => g.id === nuevoGrupoId)
      if (grupo) {
        nuevoPOI.value.color = grupo.color
      }
    }
  },
)
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
  if (!itemMenu.value) return
  menuContextualVisible.value = false

  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    console.error(' No se encontró la API del mapa.')
    $q.notify({
      type: 'negative',
      message: 'No se pudo acceder al mapa',
      icon: 'error',
    })
    return
  }

  const mapaAPI = mapPage._mapaAPI

  //  VERIFICAR: Comprobar si es POI
  if (itemMenu.value.tipo === 'poi') {
    if (!itemMenu.value.coordenadas) {
      console.error(' El POI no tiene coordenadas:', itemMenu.value)
      $q.notify({
        type: 'negative',
        message: 'Este punto no tiene coordenadas válidas.',
        icon: 'error',
      })
      return
    }

    const { lat, lng } = itemMenu.value.coordenadas

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      $q.notify({
        type: 'negative',
        message: 'Este punto de interés no tiene coordenadas válidas.',
      })
      return
    }

    //  SOLO CENTRAR LA VISTA - El marcador ya existe en el mapa
    mapaAPI.map.flyTo({
      center: [lng, lat],
      zoom: 18,
      duration: 1000,
    })

    //  NOTIFICAR AL USUARIO
    $q.notify({
      type: 'info',
      message: ` Centrado en: ${itemMenu.value.nombre}`,
      caption: 'Haz clic en el marcador para ver detalles',
      position: 'top',
      timeout: 2500,
      icon: 'place',
    })
  } else if (itemMenu.value.tipo === 'geozona') {
    // Eliminar polígono/círculo anterior si existe
    if (poligonoActivo.value) {
      mapaAPI.map.removeLayer(poligonoActivo.value)
      poligonoActivo.value = null
    }

    if (itemMenu.value.tipoGeozona === 'circular' && itemMenu.value.centro) {
      // Geozona circular
      const { lat, lng } = itemMenu.value.centro

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error(' Coordenadas inválidas:', itemMenu.value.centro)
        $q.notify({
          type: 'negative',
          message: 'Esta geozona no tiene coordenadas válidas.',
        })
        return
      }

      //  Las geozonas circulares ya están dibujadas en el mapa desde IndexPage
      // Solo centramos la vista en ellas
      mapaAPI.map.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1000,
      })
    } else if (
      itemMenu.value.tipoGeozona === 'poligono' &&
      itemMenu.value.puntos &&
      itemMenu.value.puntos.length > 0
    ) {
      // Geozona poligonal

      //  Calcular centro del polígono
      const lats = itemMenu.value.puntos.map((p) => p.lat)
      const lngs = itemMenu.value.puntos.map((p) => p.lng)
      const centroLat = lats.reduce((a, b) => a + b) / lats.length
      const centroLng = lngs.reduce((a, b) => a + b) / lngs.length

      // Las geozonas poligonales ya están dibujadas, solo centramos
      mapaAPI.map.flyTo({
        center: [centroLng, centroLat],
        zoom: 15,
        duration: 1000,
      })
    } else {
      console.warn(' La geozona seleccionada no tiene datos válidos.')
      $q.notify({
        type: 'warning',
        message: 'No se puede mostrar esta geozona en el mapa.',
      })
      return
    }
  } else {
    console.error(' Tipo de item desconocido:', itemMenu.value.tipo)
    $q.notify({
      type: 'warning',
      message: 'No se reconoce el tipo de ubicación.',
    })
    return
  }

  emit('item-seleccionado', itemMenu.value)
}
function verEnMapaEnDirecto(item) {
  // Establecer el item temporalmente en itemMenu
  itemMenu.value = item

  // Llamar a la función verEnMapa existente
  verEnMapa()

  // Opcional: Limpiar itemMenu después de un breve delay
  setTimeout(() => {
    itemMenu.value = null
  }, 100)
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
      radio: itemMenu.value.radio || 5,
      color: itemMenu.value.color || '#FF5252',
    }
    dialogNuevoPOI.value = true
  } else if (itemMenu.value.tipo === 'geozona') {
    //  CAMBIAR: usar tipoGeozona
    if (itemMenu.value.tipoGeozona === 'circular') {
      nuevaGeozona.value = {
        id: itemMenu.value.id,
        nombre: itemMenu.value.nombre,
        tipo: 'circular', //  MANTENER: esto es para el formulario
        direccion: itemMenu.value.direccion,
        centro: itemMenu.value.centro,
        radio: itemMenu.value.radio,
        grupoId: itemMenu.value.grupoId,
        notas: itemMenu.value.notas || '',
        color: itemMenu.value.color || '#4ECDC4', //  NUEVO
      }
    } else if (itemMenu.value.tipoGeozona === 'poligono') {
      nuevaGeozona.value = {
        id: itemMenu.value.id,
        nombre: itemMenu.value.nombre,
        tipo: 'poligono', //  MANTENER: esto es para el formulario
        direccion: itemMenu.value.direccion,
        puntos: itemMenu.value.puntos,
        grupoId: itemMenu.value.grupoId,
        notas: itemMenu.value.notas || '',
        color: itemMenu.value.color || '#4ECDC4', //  NUEVO
      }
    }
    dialogNuevaGeozona.value = true
  }
}

const eliminarItem = async () => {
  if (!itemMenu.value) return

  const ubicacionId = itemMenu.value.id
  const ubicacionNombre = itemMenu.value.nombre
  const tipo = itemMenu.value.tipo === 'poi' ? 'POI' : 'Geozona'

  try {
    // 🔍 Solo CONTAR eventos, sin borrarlos
    const eventosEncontrados = await contarEventosPorUbicacion(ubicacionId, tipo)

    //  Crear mensaje para window.confirm
    let mensaje = `¿Estás seguro de eliminar "${ubicacionNombre}"?`

    if (eventosEncontrados > 0) {
      mensaje = ` ATENCIÓN

Esta ubicación tiene ${eventosEncontrados} evento(s) asociado(s).

Al eliminar "${ubicacionNombre}", también se eliminarán todos sus eventos.

¿Deseas continuar?`
    }

    //  Mostrar confirmación
    const confirmacion = window.confirm(mensaje)

    if (!confirmacion) return

    // ← AHORA sí borrar eventos (después del confirm)
    await eliminarEventosPorUbicacion(ubicacionId, tipo)

    //  Eliminar de Firebase
    if (itemMenu.value.tipo === 'poi') {
      await eliminarPOI(itemMenu.value.id)
    } else if (itemMenu.value.tipo === 'geozona') {
      await eliminarGeozona(itemMenu.value.id)
    }

    // Eliminar del array local
    const index = items.value.findIndex((i) => i.id === itemMenu.value.id)
    if (index > -1) {
      items.value.splice(index, 1)
    }

    //  Alerta de éxito
    const mensajeExito =
      eventosEncontrados > 0
        ? ` ${tipo} y ${eventosEncontrados} evento(s) eliminados correctamente`
        : ` ${tipo} eliminado correctamente`

    window.alert(mensajeExito)

    menuContextualVisible.value = false

    await nextTick()

    const eventosActualizados = await obtenerEventos()
    eventosActivos.value = eventosActualizados.filter((e) => e.activo)

    redibujarMapa()
  } catch (err) {
    console.error(' Error al eliminar:', err)
    window.alert(` Error al eliminar: ${err.message}`)
  }
}
//  FUNCIÓN MODIFICADA PARA FIREBASE
const guardarPOI = async () => {
  try {
    mostrarSliderRadio.value = false
    const mapPage = document.querySelector('#map-page')

    const poiData = {
      nombre: nuevoPOI.value.nombre,
      direccion: nuevoPOI.value.direccion,
      coordenadas: nuevoPOI.value.coordenadas || null,
      grupoId: nuevoPOI.value.grupoId,
      notas: nuevoPOI.value.notas || '',
      radio: nuevoPOI.value.radio || 5,
      color: nuevoPOI.value.color || '#FF5252',
    }

    //  LIMPIAR ELEMENTOS TEMPORALES PRIMERO
    if (mapPage && mapPage._mapaAPI) {
      const mapaAPI = mapPage._mapaAPI
      mapaAPI.limpiarCirculoTemporalPOI()
      mapaAPI.limpiarMarcadorTemporal()
    }

    if (nuevoPOI.value.id) {
      // ========================================
      // ACTUALIZAR POI EXISTENTE
      // ========================================
      await actualizarPOI(nuevoPOI.value.id, poiData)

      const index = items.value.findIndex((i) => i.id === nuevoPOI.value.id)
      if (index > -1) {
        items.value[index] = {
          ...items.value[index],
          ...poiData,
        }
      }

      $q.notify({
        type: 'positive',
        message: 'POI actualizado correctamente',
        icon: 'check_circle',
      })
    } else {
      // ========================================
      // CREAR NUEVO POI
      // ========================================
      const nuevoId = await crearPOI(poiData)

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

    //  CERRAR DIALOG Y RESETEAR
    dialogNuevoPOI.value = false
    nuevoPOI.value = {
      nombre: '',
      direccion: '',
      coordenadas: null,
      grupoId: null,
      notas: '',
      radio: 100,
      color: '#FF5252',
    }

    //  OPTIMIZACIÓN CRÍTICA: Solo actualizar capa de POIs
    await nextTick()

    // Actualizar el array en IndexPage
    window.dispatchEvent(
      new CustomEvent('actualizarPOIsEnMapa', {
        detail: { pois: items.value.filter((i) => i.tipo === 'poi') },
      }),
    )
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
function abrirDialogGeozonaPoligonal() {
  nuevaGeozona.value.tipo = 'poligono'
  dialogNuevaGeozona.value = true
}

//  FUNCIÓN PARA LIMPIAR COMPLETAMENTE LAS CAPAS DE PREVIEW
const limpiarPreviewCompleto = () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const map = mapPage._mapaAPI.map

  //  CANCELAR CUALQUIER FRAME PENDIENTE
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  //  Limpiar capas de preview de Mapbox GL
  if (map.getSource('preview-line')) {
    if (map.getLayer('preview-line')) {
      try {
        map.removeLayer('preview-line')
      } catch (e) {
        console.warn('Error al remover preview-line layer:', e)
      }
    }
    try {
      map.removeSource('preview-line')
    } catch (e) {
      console.warn('Error al remover preview-line source:', e)
    }
  }

  if (map.getSource('preview-polygon')) {
    if (map.getLayer('preview-polygon')) {
      try {
        map.removeLayer('preview-polygon')
      } catch (e) {
        console.warn('Error al remover preview-polygon layer:', e)
      }
    }
    if (map.getLayer('preview-polygon-outline')) {
      try {
        map.removeLayer('preview-polygon-outline')
      } catch (e) {
        console.warn('Error al remover preview-polygon-outline layer:', e)
      }
    }
    //  Limpiar también el polígono temporal del mapa
    const mapaAPI = mapPage._mapaAPI
    if (mapaAPI && mapaAPI.limpiarPoligonoTemporal) {
      mapaAPI.limpiarPoligonoTemporal()
    }
    try {
      map.removeSource('preview-polygon')
    } catch (e) {
      console.warn('Error al remover preview-polygon source:', e)
    }
  }

  // Resetear referencias
  posicionMouseActual.value = null
  posicionMouseActual.value = null
  lineaPreview.value = null
  poligonoPreview.value = null

  map.off('mousemove', manejarMovimientoMouse)
}

// Función para cancelar la creación de una nueva geozona
function cancelarNuevaGeozona() {
  const mapPage = document.querySelector('#map-page')

  if (mapPage && mapPage._mapaAPI) {
    mapPage._mapaAPI.desactivarModoSeleccion()

    // Solo limpiar polígonos (ya no hay círculos)
    mapPage._mapaAPI.limpiarPoligonoTemporal()

    //  USAR LA FUNCIÓN DE LIMPIEZA MEJORADA
    limpiarPreviewCompleto()
  } else {
    console.warn(' No se encontró mapPage o mapaAPI para limpiar')
  }

  const componentDialog = document.querySelector('.component-dialog')
  if (componentDialog) {
    componentDialog.style.opacity = '1'
    componentDialog.style.pointerEvents = 'auto'
  }

  window.dispatchEvent(
    new CustomEvent('mostrarBotonConfirmarGeozona', {
      detail: { mostrar: false },
    }),
  )

  modoSeleccionGeozonaPoligonal.value = false

  // Resetear formulario
  nuevaGeozona.value = {
    nombre: '',
    tipo: 'poligono',
    direccion: '',
    grupoId: null,
    notas: '',
    puntos: [],
    color: '#4ECDC4', //  NUEVO
  }
}

// Función para activar la selección de geozona poligonal en el mapa
const activarSeleccionGeozonaPoligonal = async () => {
  dialogNuevaGeozona.value = false

  const componentDialog = document.querySelector('.component-dialog')

  if (componentDialog) {
    componentDialog.style.opacity = '0.3'
    componentDialog.style.pointerEvents = 'none'
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  const esperarMapa = async (intentosMaximos = 10, delay = 500) => {
    for (let i = 0; i < intentosMaximos; i++) {
      const mapPage = document.querySelector('#map-page')

      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.activarModoSeleccionGeozonaPoligonal) {
        return mapPage._mapaAPI
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    return null
  }

  try {
    const mapaAPI = await esperarMapa()

    if (mapaAPI) {
      const colorSeleccionado = nuevaGeozona.value.color || '#4ECDC4' //  Obtener color

      if (nuevaGeozona.value.puntos && nuevaGeozona.value.puntos.length > 0) {
        mapaAPI.activarModoSeleccionGeozonaPoligonal(nuevaGeozona.value.puntos, colorSeleccionado) //  Pasar color
      } else {
        mapaAPI.activarModoSeleccionGeozonaPoligonal([], colorSeleccionado) //  Pasar color
      }

      if (mapaAPI.map) {
        mapaAPI.map.on('mousemove', manejarMovimientoMouse)
      }
    } else {
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
    console.error(' Error en activarSeleccionGeozonaPoligonal:', error)

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
      color: nuevaGeozona.value.color || '#4ECDC4',
    }

    if (nuevaGeozona.value.tipo === 'circular') {
      geozonaData.centro = nuevaGeozona.value.centro
      geozonaData.radio = nuevaGeozona.value.radio
      geozonaData.direccion = nuevaGeozona.value.direccion
    } else if (nuevaGeozona.value.tipo === 'poligono') {
      geozonaData.puntos = nuevaGeozona.value.puntos
      geozonaData.direccion = `${nuevaGeozona.value.puntos.length} puntos`
    }
    if (mapPage && mapPage._mapaAPI) {
      // Desactivar modos de selección
      mapPage._mapaAPI.desactivarModoSeleccion()

      // Limpiar capas temporales según el tipo
      if (nuevaGeozona.value.tipo === 'circular') {
        mapPage._mapaAPI.limpiarCirculoTemporal()
      } else if (nuevaGeozona.value.tipo === 'poligono') {
        mapPage._mapaAPI.limpiarPoligonoTemporal()
      }

      //  AGREGAR ESTAS LÍNEAS AQUÍ:
      // Remover listener de mouse
      if (mapPage._mapaAPI.map) {
        mapPage._mapaAPI.map.off('mousemove', manejarMovimientoMouse)
      }

      // Limpiar capas de preview
      if (lineaPreview.value) {
        mapPage._mapaAPI.map.removeLayer(lineaPreview.value)
        lineaPreview.value = null
      }
      if (poligonoPreview.value) {
        mapPage._mapaAPI.map.removeLayer(poligonoPreview.value)
        poligonoPreview.value = null
      }
      posicionMouseActual.value = null
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
            nuevaGeozona.value.color, //  AGREGAR COLOR
          )
        } else if (nuevaGeozona.value.tipo === 'poligono') {
          mapPage._mapaAPI.actualizarPoligono(
            nuevaGeozona.value.id,
            nuevaGeozona.value.puntos,
            nuevaGeozona.value.nombre,
            nuevaGeozona.value.color, //  AGREGAR COLOR
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

      const nuevoId = await crearGeozona(geozonaData)

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

      items.value.unshift(nuevaGeozonaParaItems)

      $q.notify({
        type: 'positive',
        message: 'Geozona guardada correctamente',
        icon: 'check_circle',
      })
      redibujarMapa()
    }

    if (mapPage && mapPage._mapaAPI) {
      // Desactivar modos de selección
      mapPage._mapaAPI.desactivarModoSeleccion()

      // Limpiar capas temporales según el tipo
      if (nuevaGeozona.value.tipo === 'circular') {
        mapPage._mapaAPI.limpiarCirculoTemporal()
      } else if (nuevaGeozona.value.tipo === 'poligono') {
        mapPage._mapaAPI.limpiarPoligonoTemporal()
      }

      limpiarPreviewCompleto()
    }

    //  NUEVO: Restaurar el drawer completamente
    const componentDialog = document.querySelector('.component-dialog')
    if (componentDialog) {
      componentDialog.style.opacity = '1'
      componentDialog.style.pointerEvents = 'auto'
    }

    //  NUEVO: Ocultar botón flotante
    window.dispatchEvent(
      new CustomEvent('mostrarBotonConfirmarGeozona', {
        detail: { mostrar: false },
      }),
    )

    //  NUEVO: Resetear modos locales
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
      color: '#4ECDC4',
    }

    dialogNuevaGeozona.value = false
    await nextTick()
    redibujarMapa()
  } catch (err) {
    console.error(' Error al guardar geozona:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al guardar la geozona',
      caption: err.message,
      icon: 'error',
    })
  }
}

// EN GeoZonas.vue, REEMPLAZAR TODA la función activarSeleccionMapa:

const activarSeleccionMapa = async () => {
  // 1. CERRAR el diálogo del POI
  dialogNuevoPOI.value = false

  // 2. NO TOCAR LA OPACIDAD DEL DRAWER
  // Simplemente esperamos un momento
  await new Promise((resolve) => setTimeout(resolve, 300))

  const esperarMapa = async (intentosMaximos = 10, delay = 500) => {
    for (let i = 0; i < intentosMaximos; i++) {
      const mapPage = document.querySelector('#map-page')

      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.activarModoSeleccion) {
        return mapPage._mapaAPI
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return null
  }

  try {
    const mapaAPI = await esperarMapa()

    if (mapaAPI) {
      mapaAPI.activarModoSeleccion()

      // Esperar a que el usuario seleccione
      const ubicacion = await esperarSeleccionUbicacion(mapaAPI)

      mapaAPI.desactivarModoSeleccion()

      if (ubicacion) {
        nuevoPOI.value.direccion = ubicacion.direccion
        nuevoPOI.value.coordenadas = ubicacion.coordenadas

        // Asegúrate de que el radio tenga un valor por defecto
        if (!nuevoPOI.value.radio) {
          nuevoPOI.value.radio = 100 // Valor por defecto
        }

        // Crear círculo temporal
        mapaAPI.crearCirculoTemporalPOI(
          ubicacion.coordenadas.lat,
          ubicacion.coordenadas.lng,
          nuevoPOI.value.radio,
        )

        // Mostrar slider flotante
        mostrarSliderRadio.value = true
      }
    } else {
      $q.notify({
        type: 'warning',
        message: 'El mapa aún no está listo',
        timeout: 3000,
      })

      dialogNuevoPOI.value = true
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al activar selección de mapa',
      caption: error.message,
      icon: 'error',
    })

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
  mostrarSliderRadio.value = false
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
      mapaAPI.limpiarCirculoTemporalPOI()
    }
  }

  // Asegúrate de incluir el radio con un valor por defecto
  nuevoPOI.value = {
    nombre: '',
    direccion: '',
    coordenadas: null,
    grupoId: null,
    notas: '',
    radio: 5,
    color: '#FF5252',
  }

  dialogNuevoPOI.value = false
}

function actualizarRadioPOI(nuevoRadio) {
  // Actualizar el radio en el POI
  nuevoPOI.value.radio = nuevoRadio

  // Si hay un marcador temporal en el mapa, actualizar su círculo
  const mapPage = document.querySelector('#map-page')
  if (mapPage && mapPage._mapaAPI && nuevoPOI.value.coordenadas) {
    mapPage._mapaAPI.actualizarRadioCirculoTemporal(
      nuevoPOI.value.coordenadas.lat,
      nuevoPOI.value.coordenadas.lng,
      nuevoRadio,
    )
  }
}
const guardarNuevoGrupo = async () => {
  if (!nuevoGrupo.value.nombre.trim()) {
    $q.notify({
      type: 'warning',
      message: 'El nombre del grupo es requerido',
      icon: 'warning',
    })
    return
  }

  try {
    //  ELIMINAR ESTA LÍNEA:
    // const grupoCreado = await crearGrupo(nuevoGrupo.value.nombre, nuevoGrupo.value.color)

    //  CAMBIAR POR ESTO (sin guardar en variable):
    await crearGrupo(nuevoGrupo.value.nombre, nuevoGrupo.value.color)

    //  ELIMINAR ESTAS LÍNEAS:
    // grupos.value.push(grupoCreado)

    //  AGREGAR: Recargar grupos desde Firebase
    const gruposActualizados = await obtenerGrupos()
    grupos.value = gruposActualizados

    $q.notify({
      type: 'positive',
      message: 'Grupo creado correctamente',
      icon: 'check_circle',
    })

    dialogNuevoGrupo.value = false
    nuevoGrupo.value = {
      nombre: '',
      color: '#4ECDC4',
    }
  } catch (error) {
    console.error('Error al crear grupo:', error)
    $q.notify({
      type: 'negative',
      message: 'Error al crear el grupo',
      icon: 'error',
    })
  }
}

//  Función para cancelar creación de grupo
const cancelarNuevoGrupo = () => {
  dialogNuevoGrupo.value = false
  nuevoGrupo.value = {
    nombre: '',
    color: '#4ECDC4',
  }
}
// Función para manejar la confirmación de geozona desde el botón flotante
const handleConfirmarGeozonaDesdeBoton = async () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI) {
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
}

// Hooks de ciclo de vida

const handleCancelarGeozona = (e) => {
  console.log('Evento cancelarGeozonaDesdeBoton:', e.detail)
  // Aquí puedes agregar lógica adicional si la necesitas
  limpiarPreviewCompleto()

  //  TAMBIÉN LLAMAR A LA FUNCIÓN DE CANCELAR COMPLETA
  cancelarNuevaGeozona()
}

onMounted(async () => {
  if (marcadorActivo.value) {
    marcadorActivo.value.remove()
    marcadorActivo.value = null
  }

  //  Limpiar polígono activo (si existe en Leaflet)
  if (poligonoActivo.value) {
    try {
      const mapPage = document.querySelector('#map-page')
      if (mapPage && mapPage._mapaAPI && mapPage._mapaAPI.map) {
        mapPage._mapaAPI.map.removeLayer(poligonoActivo.value)
      }
    } catch (e) {
      console.warn('No se pudo limpiar polígono:', e)
    }
    poligonoActivo.value = null
  }

  try {
    window.addEventListener('cancelarGeozonaDesdeBoton', handleCancelarGeozona)

    //  CARGAR TODO EN PARALELO (POIs, Geozonas, Eventos Y Grupos)
    const [poisCargados, geozonasCargadas, eventosCargados, gruposCargados] = await Promise.all([
      obtenerPOIs(),
      obtenerGeozonas(),
      obtenerEventos(),
      obtenerGrupos(), //  Cargar grupos
    ])

    //  ASIGNAR GRUPOS
    grupos.value = gruposCargados

    items.value = [...poisCargados, ...geozonasCargadas]
    eventosActivos.value = eventosCargados.filter((e) => e.activo)

    //  LÓGICA CLAVE: Verificar si se debe mostrar un item específico
    if (estadoCompartido.value.abrirGeozonasConPOI) {
      const { item } = estadoCompartido.value.abrirGeozonasConPOI
      handleSeleccionDesdeMapa(item)
      resetAbrirGeozonas()
    }
  } catch (err) {
    console.error('Error al cargar datos:', err)
    $q.notify({
      type: 'negative',
      message: 'Error al cargar los datos',
      caption: err.message,
    })
  }

  //  Listeners de ventana
  window.addEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

onUnmounted(() => {
  // ... (código para limpiar marcadores y polígonos activos)
  window.removeEventListener('cancelarGeozonaDesdeBoton', handleCancelarGeozona)
  //  LIMPIAR EVENTOS DE VENTANA
  window.removeEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

const redibujarMapa = () => {
  // Emitir evento para que IndexPage redibuje todo
  window.dispatchEvent(new CustomEvent('redibujarMapa'))
}

// Cosos raros estoy ando mejoras
defineExpose({
  pois: computed(() => pois.value),
  geozonas: computed(() => geozonas.value),
  obtenerPOIs,
  obtenerGeozonas,
  migrarGeozonasExistentes,
})
</script>

<style scoped>
.option-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.option-icon-wrapper.evento {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
  color: white;
}

.option-icon-wrapper.editar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.option-icon-wrapper.ver-mapa {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

.option-icon-wrapper.eliminar {
  background: linear-gradient(135deg, #f44336 0%, #ef5350 100%);
  color: white;
}
.menu-option-item:hover .option-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.menu-option-item.eliminar:hover .option-icon-wrapper.eliminar {
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%,
  100% {
    transform: scale(1.1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-5deg);
  }
  75% {
    transform: scale(1.1) rotate(5deg);
  }
}

.menu-contextual-moderno {
  width: 100%;
  max-width: 420px;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
}
.menu-header {
  background: linear-gradient(135deg, #91c6bc 0%, #059669 100%);
  padding: 20px;
  color: white;
}
.header-content-minimal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/*  ANIMACIONES PARA LOS TABS MODERNOS */
.tab-item {
  position: relative;
  overflow: hidden;
}

/* Efecto de hover mejorado */
.tab-item:not(.active):hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Tab activo con escala */
.tab-item.active {
  animation: tab-activate 0.3s ease-out;
}

@keyframes tab-activate {
  0% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

/* Iconos que rebotan al hover */
.tab-item:hover .q-icon {
  animation: icon-bounce 0.5s ease;
}

@keyframes icon-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/*  ANIMACIONES PARA STAT CARDS */
.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Número que crece al hover */
.stat-card:hover .stat-number {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

/* Icono que rota al hover */
.stat-card:hover .q-icon {
  animation: rotate-grow 0.6s ease;
}

@keyframes rotate-grow {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
/*  ANIMACIONES MEJORADAS PARA CARDS */
.poi-card,
.geozona-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* Efecto de brillo al pasar el mouse */
.poi-card::before,
.geozona-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.poi-card:hover::before,
.geozona-card:hover::before {
  transform: translateX(100%);
}

/* Avatar que pulsa al hover */
.poi-card:hover .q-avatar,
.geozona-card:hover .q-avatar {
  animation: pulse-avatar 0.6s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

@keyframes pulse-avatar {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* Texto que se desliza */
.poi-card:hover .text-subtitle1,
.geozona-card:hover .text-subtitle1 {
  transform: translateX(4px);
  transition: transform 0.3s ease;
}

/*  BOTÓN FLOTANTE MEJORADO */
.floating-btn {
  animation: float 3s ease-in-out infinite;
  transition: all 0.3s ease;
}

.floating-btn:hover {
  transform: scale(1.15) translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.floating-btn:active {
  transform: scale(1.05);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Icono que rota al hacer hover */
.floating-btn:hover .q-icon {
  animation: rotate-icon 0.6s ease;
}

@keyframes rotate-icon {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/*  CHIPS DE FILTROS CON ANIMACIONES */
.chips-container .q-chip {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chips-container .q-chip:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chips-container .q-chip:active {
  transform: scale(0.98);
}

/* Avatar del chip que aparece con escala */
.chips-container .q-chip .q-avatar {
  animation: chip-avatar-appear 0.3s ease-out;
}

@keyframes chip-avatar-appear {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
/*  BÚSQUEDA MEJORADA */
.modern-search {
  transition: all 0.3s ease;
}

.modern-search:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.modern-search:focus-within {
  box-shadow: 0 4px 20px rgba(187, 0, 0, 0.2);
  transform: translateY(-2px);
}

/* Icono de búsqueda que pulsa */
.modern-search:focus-within .q-icon {
  animation: pulse-search 1s ease infinite;
}

@keyframes pulse-search {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
/*  SLIDER FLOTANTE CON ENTRADA DRAMÁTICA */
.slider-flotante-card {
  animation: slide-bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slide-bounce-in {
  0% {
    opacity: 0;
    transform: translateX(200px) scale(0.8);
  }
  60% {
    transform: translateX(-10px) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Botones de atajo que crecen */
.slider-flotante-card .q-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}
/*  COLOR CHIPS MEJORADOS */
.color-chip {
  position: relative;
}

.color-chip::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 10px;
  background: inherit;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.color-chip:hover::after {
  opacity: 0.4;
}

/* Check que aparece con rebote */
.color-chip-selected .q-icon {
  animation: check-bounce 0.4s ease-out;
}

@keyframes check-bounce {
  0% {
    transform: scale(0) rotate(-45deg);
  }
  50% {
    transform: scale(1.2) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}
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
  padding: 16px 20px; /*  Agregar padding horizontal */
  min-height: 64px; /*  Altura mínima */
}
.header-info {
  flex: 1;
}
.header-top {
  display: flex;
  justify-content: flex-start;
}
.header-title-minimal {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.header-content .text-h6 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}
.header-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  color: white;
}
.header-subtitle {
  font-size: 13px;
  opacity: 0.9;
  color: white;
}
.menu-options {
  padding: 8px 0;
}
.menu-option-item {
  padding: 16px 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.menu-option-item::before {
  content: '';
  position: absolute;
  left: -100%;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
  transition: left 0.4s ease;
}

.menu-option-item:hover::before {
  left: 100%;
}

.menu-option-item:hover {
  background-color: #f5f7fa;
  padding-left: 24px;
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
  max-height: 200px; /* Altura máxima */
  overflow-y: auto; /* Scroll vertical */
  overflow-x: hidden; /* Sin scroll horizontal */
  padding: 4px; /* Padding para que no se corte el shadow de los chips */

  /* Estilos del scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
.chips-container::-webkit-scrollbar {
  width: 6px;
}

.chips-container::-webkit-scrollbar-track {
  background: transparent;
}

.chips-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.chips-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}

/* Animación suave al hacer scroll */
.chips-container {
  scroll-behavior: smooth;
}

/* Gradiente sutil al final para indicar más contenido */
.chips-container::after {
  content: '';
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(to top, rgba(248, 249, 250, 0.8), transparent);
  pointer-events: none;
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

/*  ESTILOS PARA BADGES DE EVENTOS MÁS VISIBLES */
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

/*  EFECTO FLASH CUANDO SE SELECCIONA DESDE EL MAPA */
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

/*  ESTILOS PARA ELEMENTO SELECCIONADO DESDE MAPA */
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

/*estilos para los radios */
.radius-preview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.radius-value {
  font-size: 24px;
  font-weight: 700;
}

.radius-label {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
}

/* ============================================ */
/* ESTILOS DEL SLIDER FLOTANTE - AGREGAR AL FINAL */
/* ============================================ */

.slider-flotante-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9998;
  width: 380px;
  max-width: calc(100vw - 48px);
}

.slider-flotante-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  background: white;
  border: 2px solid #1976d2;
}

.radius-display {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  border-radius: 12px;
  color: white;
}

.radius-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.radius-sublabel {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
}

/* Animación de entrada desde la derecha */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* ============================================ */
/* ESTILOS PARA SELECTOR DE COLOR */
/* ============================================ */

.color-palette {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.color-chip {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-chip:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.color-chip-selected {
  border: 3px solid white;
  box-shadow:
    0 0 0 2px #1976d2,
    0 4px 12px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.color-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.preview-box {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.option-label {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.option-caption {
  font-size: 12px;
  color: #7f8c8d;
}

/* Chevron que se mueve */
.menu-option-item:hover .q-item__section--side .q-icon {
  transform: translateX(4px);
  transition: transform 0.3s ease;
}

.menu-actions {
  padding: 16px 20px 24px;
  background: #fafafa;
}

.cancel-btn {
  border-radius: 12px;
  padding: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

/* Responsive */
@media (max-width: 600px) {
  .menu-contextual-moderno {
    max-width: 100vw;
  }

  .menu-header {
    padding: 16px;
  }

  .header-title {
    font-size: 16px;
  }

  .menu-option-item {
    padding: 14px 16px;
  }

  .option-icon-wrapper {
    width: 44px;
    height: 44px;
  }
}

.color-preview-readonly {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
}

.preview-box-readonly {
  width: 60px;
  height: 60px;
  min-width: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  font-family: 'Courier New', monospace;
}

/*  BOTÓN CREAR GRUPO */
.crear-grupo-btn {
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px dashed #ff9800;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
}

.crear-grupo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
  border-style: solid;
}

.crear-grupo-btn:active {
  transform: translateY(0);
}

/* Animación del icono */
.crear-grupo-btn:hover .q-icon {
  animation: folder-open 0.5s ease;
}

@keyframes folder-open {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}
/*  HEADER DE FILTROS COLAPSABLE */
.filtro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filtro-header:hover {
  background: #f5f7fa;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.filtro-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Animación del icono de expandir */
.filtro-header .q-icon {
  transition: transform 0.3s ease;
}

.filtro-header:hover .q-icon {
  transform: scale(1.2);
}

/* ===== NUEVO DISEÑO DIALOGS ===== */
.form-body {
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
}

.field-group {
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 6px;
}

.field-optional {
  font-weight: 400;
  text-transform: none;
  font-size: 10px;
  color: #c4c9d4;
  letter-spacing: 0;
}

.color-palette-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.color-dot:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

.color-dot-active {
  border: 2px solid white;
  box-shadow:
    0 0 0 2px rgba(0, 0, 0, 0.25),
    0 3px 8px rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

.color-dot-custom {
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
}

.color-dot-custom:hover {
  background: #e5e7eb;
  border-style: solid;
}

.color-preview-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.color-swatch-small {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.color-hex-small {
  font-size: 11px;
  color: #6b7280;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.color-inherited {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}

.map-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  border: 2px dashed #c7d2fe;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.map-action-btn:hover {
  border-color: #818cf8;
  border-style: solid;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

.map-action-btn:active {
  transform: translateY(0);
}

.map-action-btn--done {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #86efac;
}

.map-action-btn--done:hover {
  border-color: #4ade80;
  box-shadow: 0 6px 20px rgba(74, 222, 128, 0.2);
}

.map-action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
  transition: all 0.25s ease;
}

.map-action-btn:hover .map-action-icon {
  transform: scale(1.08) rotate(5deg);
}

.map-action-icon--done {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
}

.map-action-content {
  flex: 1;
  min-width: 0;
}

.map-action-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.map-action-subtitle {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.puntos-chips-inline {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* ===== GRUPO PREVIEW ===== */
.grupo-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.grupo-preview-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: background 0.3s ease;
}

.grupo-preview-info {
  flex: 1;
}

.grupo-preview-nombre {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  transition: all 0.2s ease;
}

.grupo-preview-sub {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.grupo-preview-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* ===== DIALOG EVENTO RAPIDO ===== */
.dialog-evento-rapido {
  width: 420px;
  max-width: 95vw;
  border-radius: 16px;
  overflow: hidden;
}

.activacion-toggle {
  display: flex;
  gap: 8px;
}

.activacion-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s ease;
  background: #f9fafb;
}

.activacion-option:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
  transform: translateY(-1px);
}

.activacion-option--active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4f46e5;
}

.activacion-option--salida.activacion-option--active {
  border-color: #f97316;
  background: #fff7ed;
  color: #ea580c;
}

.activacion-option--ambos.activacion-option--active {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #16a34a;
}

.operador-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.operador-mini-toggle {
  display: flex;
  gap: 6px;
}

.operador-mini-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 20px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.operador-mini-option:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
}

.operador-mini-active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4f46e5;
}

.operador-mini-or.operador-mini-active {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #16a34a;
}
</style>
