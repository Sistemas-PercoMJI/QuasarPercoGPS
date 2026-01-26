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
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === poi.id,
            }"
            :data-ubicacion-id="poi.id"
            @click="seleccionarItem(poi)"
            @dblclick="verEnMapaEnDirecto(poi)"
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
              'seleccionado-desde-mapa': ubicacionSeleccionadaDesdeMapa === geozona.id,
            }"
            :data-ubicacion-id="geozona.id"
            @click="seleccionarItem(geozona)"
            @dblclick="verEnMapaEnDirecto(geozona)"
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
          <!-- 🎨 Selector de Color para POI -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">
              <q-icon name="palette" size="16px" class="q-mr-xs" />
              COLOR DEL MARCADOR
            </div>

            <!-- Paleta de colores predefinida -->
            <div class="color-palette q-mb-sm">
              <div
                v-for="color in paletaColoresPOI"
                :key="color.valor"
                class="color-chip"
                :class="{ 'color-chip-selected': nuevoPOI.color === color.valor }"
                :style="{ background: color.valor }"
                @click="nuevoPOI.color = color.valor"
              >
                <q-icon
                  v-if="nuevoPOI.color === color.valor"
                  name="check"
                  size="18px"
                  color="white"
                  style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))"
                />
                <q-tooltip>{{ color.nombre }}</q-tooltip>
              </div>
            </div>

            <!-- Botón para abrir color picker personalizado -->
            <q-btn
              outline
              dense
              icon="colorize"
              label="Color personalizado"
              color="grey-7"
              size="sm"
              @click="mostrarColorPickerPOI = true"
              class="full-width"
            />

            <!-- Vista previa del color seleccionado -->
            <div class="color-preview q-mt-sm">
              <div class="preview-box" :style="{ background: nuevoPOI.color }"></div>
              <span class="text-caption text-grey-7">{{ nuevoPOI.color.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Dialog del Color Picker para POI -->
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
                <q-btn flat label="Cancelar" colors="grey-7" v-close-popup />
                <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
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

    <!-- Slider flotante para ajustar radio del POI -->
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

    <!-- Dialog: Tipo de Geozona -->
    <!-- Dialog: Tipo de Geozona - SIMPLIFICADO -->
    <q-dialog v-model="dialogTipoGeozona" persistent>
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

        <q-card-section class="q-pt-lg text-center">
          <q-icon name="change_history" size="64px" color="primary" class="q-mb-md" />

          <div class="text-subtitle1">Geozona Poligonal</div>
          <div class="text-caption text-grey-7 q-mt-sm">
            Marca múltiples puntos en el mapa para definir el área de la geozona.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-lg">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="Continuar"
            color="secondary"
            @click="abrirDialogGeozonaPoligonal"
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
              <div class="text-h6">Nueva Geozona</div>
              <div class="text-caption">Define un área con múltiples puntos</div>
            </div>
            <q-space />
            <q-btn flat dense round icon="close" v-close-popup color="white" />
          </div>
        </q-card-section>
        <q-card-section class="q-pt-lg">
          <div></div>
          <q-input v-model="nuevaGeozona.nombre" label="Nombre de la zona" outlined class="q-mb-md">
            <template v-slot:prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <!-- Solo campos para geozona poligonal -->
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

          <!-- 🎨 Selector de Color -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">
              <q-icon name="palette" size="16px" class="q-mr-xs" />
              COLOR DE LA GEOZONA
            </div>

            <!-- Paleta de colores predefinida -->
            <div class="color-palette q-mb-sm">
              <div
                v-for="color in paletaColores"
                :key="color.valor"
                class="color-chip"
                :class="{ 'color-chip-selected': nuevaGeozona.color === color.valor }"
                :style="{ background: color.valor }"
                @click="nuevaGeozona.color = color.valor"
              >
                <q-icon
                  v-if="nuevaGeozona.color === color.valor"
                  name="check"
                  size="18px"
                  color="white"
                  style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))"
                />
                <q-tooltip>{{ color.nombre }}</q-tooltip>
              </div>
            </div>

            <!-- Botón para abrir color picker personalizado -->
            <q-btn
              outline
              dense
              icon="colorize"
              label="Color personalizado"
              color="grey-7"
              size="sm"
              @click="mostrarColorPicker = true"
              class="full-width"
            />

            <!-- Vista previa del color seleccionado -->
            <div class="color-preview q-mt-sm">
              <div class="preview-box" :style="{ background: nuevaGeozona.color }"></div>
              <span class="text-caption text-grey-7">{{ nuevaGeozona.color.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Dialog del Color Picker -->
          <q-dialog v-model="mostrarColorPicker">
            <q-card style="min-width: 300px">
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Elige un color</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>

              <q-card-section>
                <q-color v-model="nuevaGeozona.color" format-model="hex" default-view="palette" />
              </q-card-section>

              <q-card-actions align="right">
                <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
                <q-btn unelevated label="Aplicar" color="primary" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>

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
  </div>
</template>

<script setup>
// MODIFICAR esta línea existente:
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { usePOIs } from 'src/composables/usePOIs'
import { useGeozonas } from 'src/composables/useGeozonas'
//import mapboxgl from 'mapbox-gl'
// 🆕 NUEVO: Importar composable de eventos
import { useEventos } from 'src/composables/useEventos'
import { useQuasar } from 'quasar'
import { auth } from 'src/firebase/firebaseConfig'
import { useEventBus } from 'src/composables/useEventBus.js'

const userId = ref(auth.currentUser?.uid || '')
const emit = defineEmits(['close', 'item-seleccionado', 'crear-evento-ubicacion'])
const $q = useQuasar()
// 🆕 AGREGAR esta línea
const { estadoCompartido, resetAbrirGeozonas } = useEventBus()

// Usar el composable de POIs
const { crearPOI, obtenerPOIs, actualizarPOI, eliminarPOI } = usePOIs(userId.value)
//seleccionador de color para POI:
const mostrarColorPickerPOI = ref(false)

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

// 🆕 NUEVO: Cargar eventos para mostrar badges
const { obtenerEventos, eliminarEventosPorUbicacion } = useEventos(userId.value)
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

// 🆕 NUEVAS VARIABLES PARA VISTA PREVIA
const posicionMouseActual = ref(null)
const lineaPreview = ref(null)
const poligonoPreview = ref(null)

const nuevoPOI = ref({
  nombre: '',
  direccion: '',
  grupoId: null,
  notas: '',
  coordenadas: null,
  radio: 100, // ✅ NUEVO: Radio por defecto 100m
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
  color: '#4ECDC4', // ✅ Color por defecto
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

// 🎨 Estado para el selector de color personalizado
const mostrarColorPicker = ref(false)

const grupos = ref([
  { id: 'grupo1', nombre: 'Clientes', color: 'blue' },
  { id: 'grupo2', nombre: 'Almacenes', color: 'green' },
  { id: 'grupo3', nombre: 'Oficinas', color: 'orange' },
])

const items = ref([])

const mostrarSliderRadio = ref(false)

// 🆕 NUEVA FUNCIÓN: Crear evento para la ubicación seleccionada
function crearEventoParaUbicacion() {
  if (!itemMenu.value) return

  menuContextualVisible.value = false

  // Emitir evento con los datos de la ubicación
  emit('crear-evento-ubicacion', {
    ubicacion: itemMenu.value,
    tipo: itemMenu.value.tipo === 'poi' ? 'POI' : 'Geozona',
  })

  $q.notify({
    type: 'info',
    message: `Preparando evento para ${itemMenu.value.nombre}`,
    icon: 'notifications_active',
    timeout: 1500,
  })
}

// ✅ NUEVA FUNCIÓN: Continuar al dialog después de ajustar el radio
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

// ✅ NUEVA FUNCIÓN: Establecer radio con atajos
function establecerRadio(valor) {
  nuevoPOI.value.radio = valor
  actualizarRadioPOI(valor)
}

// 🆕 Computed para saber qué ubicaciones tienen eventos
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

// 🆕 Función para verificar si una ubicación tiene eventos
function tieneEventosAsignados(ubicacionId, tipo) {
  return ubicacionesConEventos.value.has(`${tipo}-${ubicacionId}`)
}

// 🆕 FUNCIÓN CENTRALIZADA PARA MANEJAR LA SELECCIÓN
function handleSeleccionDesdeMapa(item) {
  // Determinar si es POI o Geozona
  if (item.coordenadas && !item.tipoGeozona) {
    vistaActual.value = 'poi'
  } else if (item.tipoGeozona) {
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
      message: `📍 ${itemEncontrado.nombre}`,
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
    console.error('❌ No se encontró el item con ID:', item.id)
    $q.notify({
      type: 'warning',
      message: 'No se encontró la ubicación seleccionada',
      icon: 'warning',
    })
  }
}

// 🆕 Función para contar eventos de una ubicación
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

  // ✅ Guardar posición sin actualizar reactive (más rápido)
  ultimaPosicionMouse = {
    lat: e.lngLat.lat,
    lng: e.lngLat.lng,
  }

  // ✅ Cancelar frame anterior si existe
  if (frameId) {
    cancelAnimationFrame(frameId)
  }

  // ✅ Usar requestAnimationFrame (automático 60fps)
  frameId = requestAnimationFrame(() => {
    posicionMouseActual.value = ultimaPosicionMouse
    actualizarVistaPrevia()
    frameId = null
  })
}
// 🆕 ACTUALIZAR VISTA PREVIA DEL POLÍGONO
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

      // ✅ Usar la nueva función que agregamos
      if (mapPage._mapaAPI.actualizarColorPoligonoTemporal) {
        mapPage._mapaAPI.actualizarColorPoligonoTemporal(nuevoColor)
      }

      // ✅ Actualizar preview también
      if (posicionMouseActual.value) {
        actualizarVistaPrevia()
      }
    },
  )

  // 🎨 Función para oscurecer color (inline para performance)
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

  // ✅ LÍNEA DE PREVIEW - Solo actualizar data
  const lineData = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[ultimoPunto.lng, ultimoPunto.lat], mouseCoords],
    },
  }

  if (map.getSource('preview-line')) {
    // ✅ SOLO actualizar datos - RÁPIDO
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

  // ✅ POLÍGONO DE PREVIEW
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
      // ✅ SOLO actualizar datos - RÁPIDO
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
        g.nombre?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()) ||
        g.direccion?.toLowerCase().includes(busquedaGeozona.value.toLowerCase()),
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

// Computed para validar si la geozona es válida
const esGeozonaValida = computed(() => {
  // Ahora solo validamos polígonos
  return (
    nuevaGeozona.value.tipo === 'poligono' &&
    nuevaGeozona.value.puntos &&
    nuevaGeozona.value.puntos.length >= 3
  )
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
  if (!itemMenu.value) return
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
      $q.notify({
        type: 'negative',
        message: 'Este punto de interés no tiene coordenadas válidas.',
      })
      return
    }

    // ✅ SOLO CENTRAR LA VISTA - El marcador ya existe en el mapa
    mapaAPI.map.flyTo({
      center: [lng, lat],
      zoom: 18,
      duration: 1000,
    })

    // ✅ NOTIFICAR AL USUARIO
    $q.notify({
      type: 'info',
      message: `📍 Centrado en: ${itemMenu.value.nombre}`,
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
        console.error('❌ Coordenadas inválidas:', itemMenu.value.centro)
        $q.notify({
          type: 'negative',
          message: 'Esta geozona no tiene coordenadas válidas.',
        })
        return
      }

      // ✅ Las geozonas circulares ya están dibujadas en el mapa desde IndexPage
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

      // ✅ Calcular centro del polígono
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
        color: itemMenu.value.color || '#4ECDC4', // ✅ NUEVO
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
        color: itemMenu.value.color || '#4ECDC4', // ✅ NUEVO
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
    // 🔍 Buscar eventos asociados
    const { cantidad: eventosEncontrados } = await eliminarEventosPorUbicacion(ubicacionId, tipo)

    // 💬 Crear mensaje para window.confirm
    let mensaje = `¿Estás seguro de eliminar "${ubicacionNombre}"?`

    if (eventosEncontrados > 0) {
      mensaje = `⚠️ ATENCIÓN ⚠️

Esta ubicación tiene ${eventosEncontrados} evento(s) asociado(s).

Al eliminar "${ubicacionNombre}", también se eliminarán todos sus eventos.

¿Deseas continuar?`
    }

    // 💬 Mostrar confirmación
    const confirmacion = window.confirm(mensaje)

    if (!confirmacion) {
      return
    }

    // 🗑️ Eliminar de Firebase
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

    // 📢 Alerta de éxito
    const mensajeExito =
      eventosEncontrados > 0
        ? `✅ ${tipo} y ${eventosEncontrados} evento(s) eliminados correctamente`
        : `✅ ${tipo} eliminado correctamente`

    window.alert(mensajeExito)

    menuContextualVisible.value = false

    // ✅ IMPORTANTE: Actualizar eventos y redibujar
    await nextTick()

    // Recargar eventos desde Firebase
    const eventosActualizados = await obtenerEventos()
    eventosActivos.value = eventosActualizados.filter((e) => e.activo)

    // Redibujar mapa completo
    redibujarMapa()
  } catch (err) {
    console.error('❌ Error al eliminar:', err)
    window.alert(`❌ Error al eliminar: ${err.message}`)
  }
}
// 🔥 FUNCIÓN MODIFICADA PARA FIREBASE
const guardarPOI = async () => {
  try {
    mostrarSliderRadio.value = false
    // const mapPage = document.querySelector('#map-page')

    // Preparar datos del POI
    const poiData = {
      nombre: nuevoPOI.value.nombre,
      direccion: nuevoPOI.value.direccion,
      coordenadas: nuevoPOI.value.coordenadas || null,
      grupoId: nuevoPOI.value.grupoId,
      notas: nuevoPOI.value.notas || '',
      radio: nuevoPOI.value.radio || 5,
      color: nuevoPOI.value.color || '#FF5252', // ✅ Color incluido
    }

    if (nuevoPOI.value.id) {
      // ACTUALIZAR POI EXISTENTE
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
      // CREAR NUEVO POI
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

    // ✅ CERRAR DIALOG
    dialogNuevoPOI.value = false

    // ✅ RESETEAR FORMULARIO
    nuevoPOI.value = {
      nombre: '',
      direccion: '',
      coordenadas: null,
      grupoId: null,
      notas: '',
      radio: 100,
      color: '#FF5252',
    }

    // ✅ ESPERAR Y REDIBUJAR MAPA
    await nextTick()
    redibujarMapa()
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

// 🆕 FUNCIÓN PARA LIMPIAR COMPLETAMENTE LAS CAPAS DE PREVIEW
const limpiarPreviewCompleto = () => {
  const mapPage = document.querySelector('#map-page')
  if (!mapPage || !mapPage._mapaAPI || !mapPage._mapaAPI.map) return

  const map = mapPage._mapaAPI.map

  // 🆕 CANCELAR CUALQUIER FRAME PENDIENTE
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  // ✅ Limpiar capas de preview de Mapbox GL
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
    // ✅ Limpiar también el polígono temporal del mapa
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

    // 🆕 USAR LA FUNCIÓN DE LIMPIEZA MEJORADA
    limpiarPreviewCompleto()
  } else {
    console.warn('⚠️ No se encontró mapPage o mapaAPI para limpiar')
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
    color: '#4ECDC4', // ✅ NUEVO
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
      const colorSeleccionado = nuevaGeozona.value.color || '#4ECDC4' // ✅ Obtener color

      if (nuevaGeozona.value.puntos && nuevaGeozona.value.puntos.length > 0) {
        mapaAPI.activarModoSeleccionGeozonaPoligonal(nuevaGeozona.value.puntos, colorSeleccionado) // ✅ Pasar color
      } else {
        mapaAPI.activarModoSeleccionGeozonaPoligonal([], colorSeleccionado) // ✅ Pasar color
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

      // 🆕 AGREGAR ESTAS LÍNEAS AQUÍ:
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
            nuevaGeozona.value.color, // ✅ AGREGAR COLOR
          )
        } else if (nuevaGeozona.value.tipo === 'poligono') {
          mapPage._mapaAPI.actualizarPoligono(
            nuevaGeozona.value.id,
            nuevaGeozona.value.puntos,
            nuevaGeozona.value.nombre,
            nuevaGeozona.value.color, // ✅ AGREGAR COLOR
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
      color: '#4ECDC4',
    }

    dialogNuevaGeozona.value = false
    await nextTick()
    redibujarMapa()
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
onMounted(async () => {
  if (marcadorActivo.value) {
    marcadorActivo.value.remove()
    marcadorActivo.value = null
  }

  // ✅ Limpiar polígono activo (si existe en Leaflet)
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
    // Cargar POIs, Geozonas Y EVENTOS en paralelo
    const [poisCargados, geozonasCargadas, eventosCargados] = await Promise.all([
      obtenerPOIs(),
      obtenerGeozonas(),
      obtenerEventos(),
    ])

    items.value = [...poisCargados, ...geozonasCargadas]
    eventosActivos.value = eventosCargados.filter((e) => e.activo)

    // 🆕 LÓGICA CLAVE: Verificar si se debe mostrar un item específico
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

  // ... (otros listeners como el del botón flotante)
  window.addEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

const handleCancelarGeozona = (e) => {
  console.log('Evento cancelarGeozonaDesdeBoton:', e.detail)
  // Aquí puedes agregar lógica adicional si la necesitas
  limpiarPreviewCompleto()

  // 🆕 TAMBIÉN LLAMAR A LA FUNCIÓN DE CANCELAR COMPLETA
  cancelarNuevaGeozona()
}

onMounted(async () => {
  try {
    // Cargar POIs, Geozonas Y EVENTOS en paralelo
    const [poisCargados, geozonasCargadas, eventosCargados] = await Promise.all([
      obtenerPOIs(),
      obtenerGeozonas(),
      obtenerEventos(),
    ])

    items.value = [...poisCargados, ...geozonasCargadas]
    eventosActivos.value = eventosCargados.filter((e) => e.activo)

    // 🆕 LÓGICA CLAVE: Verificar si se debe mostrar un item específico
    if (estadoCompartido.value.abrirGeozonasConPOI) {
      const { item } = estadoCompartido.value.abrirGeozonasConPOI

      // Ejecutamos la lógica de selección
      handleSeleccionDesdeMapa(item)

      // Limpiamos el estado para la próxima vez
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

  // ... (otros listeners como el del botón flotante)
  window.addEventListener('confirmarGeozonaDesdeBoton', handleConfirmarGeozonaDesdeBoton)
})

onUnmounted(() => {
  // ... (código para limpiar marcadores y polígonos activos)
  window.removeEventListener('cancelarGeozonaDesdeBoton', handleCancelarGeozona)
  // 🆕 LIMPIAR EVENTOS DE VENTANA
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

/* 🎨 ANIMACIONES PARA LOS TABS MODERNOS */
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

/* 🎨 ANIMACIONES PARA STAT CARDS */
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
/* 🎨 ANIMACIONES MEJORADAS PARA CARDS */
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

/* 🎨 BOTÓN FLOTANTE MEJORADO */
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

/* 🎨 CHIPS DE FILTROS CON ANIMACIONES */
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
/* 🎨 BÚSQUEDA MEJORADA */
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
/* 🎨 SLIDER FLOTANTE CON ENTRADA DRAMÁTICA */
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
/* 🎨 COLOR CHIPS MEJORADOS */
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
  padding: 16px 20px; /* 🔥 Agregar padding horizontal */
  min-height: 64px; /* 🔥 Altura mínima */
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
</style>
