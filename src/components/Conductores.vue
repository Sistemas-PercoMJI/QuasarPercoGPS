<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="conductores-drawer">
    <!-- Header con gradiente y estadísticas -->
    <div class="drawer-header">
      <div class="header-content">
        <div class="text-h6 text-weight-medium">Conductores</div>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-number">{{ conductores.length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ gruposConductores.length }}</span>
            <span class="stat-label">Grupos</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <q-btn flat dense round icon="sync" color="white" size="sm" @click="sincronizarDatos">
          <q-tooltip>Sincronizar con Firebase</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
    </div>

    <!-- Tabs de navegación (Grupos primero) -->
    <div class="tabs-container">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="grupos" label="Grupos" />
        <q-tab name="todos" label="Todos" />
      </q-tabs>
    </div>

    <!-- Botones de acción -->
    <div class="q-pa-sm q-px-md" style="display: flex; justify-content: flex-end; gap: 4px">
      <q-btn flat dense round icon="create_new_folder" size="sm" @click="abrirDialogNuevoGrupo">
        <q-tooltip>Crear grupo</q-tooltip>
      </q-btn>
    </div>

    <!-- Búsqueda mejorada -->
    <div class="q-px-md q-pb-sm">
      <q-input
        v-model="busqueda"
        outlined
        dense
        placeholder="Buscar conductor..."
        class="search-input"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Lista de grupos (solo visible en tab grupos) -->
    <div
      class="grupos-lista q-px-md q-pb-sm"
      v-if="tab === 'grupos' && gruposConductores.length > 0"
    >
      <div class="text-caption text-grey-7 q-mb-xs">GRUPOS</div>
      <q-list dense bordered class="rounded-borders">
        <q-item
          v-for="grupo in gruposConductores"
          :key="grupo.id"
          clickable
          v-ripple
          @click="filtrarPorGrupo(grupo)"
          :active="grupoSeleccionado === grupo.id"
          class="group-item"
        >
          <q-item-section avatar>
            <q-icon name="folder" :color="grupoSeleccionado === grupo.id ? 'primary' : 'blue'" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ grupo.Nombre }}</q-item-label>
            <q-item-label caption>
              {{ contarConductoresPorGrupo(grupo.id) }} conductores
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              @click.stop="mostrarMenuGrupo($event, grupo)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Lista de conductores con diseño de tarjetas -->
    <q-scroll-area class="conductores-list">
      <div class="conductores-grid">
        <q-card
          v-for="conductor in conductoresFiltrados"
          :key="conductor.id"
          class="conductor-card"
          clickable
          v-ripple
          @click="seleccionarConductor(conductor)"
          :class="{ 'conductor-selected': conductorSeleccionado?.id === conductor.id }"
        >
          <q-card-section class="card-header">
            <q-avatar color="primary" text-color="white" size="40px" class="card-avatar">
              {{ obtenerIniciales(conductor.Nombre) }}
            </q-avatar>
            <div class="card-info">
              <div class="text-weight-medium">{{ conductor.Nombre }}</div>
              <div class="text-caption text-grey-7">{{ conductor.Telefono }}</div>
            </div>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              @click.stop="mostrarMenuConductor($event, conductor)"
              class="card-menu"
            />
          </q-card-section>

          <q-card-section class="card-body">
            <div class="unit-badge">
              <q-badge
                v-if="obtenerUnidadDeConductor(conductor.id)"
                color="blue-6"
                :label="obtenerUnidadDeConductor(conductor.id)?.Unidad"
              />
              <span v-else class="text-grey-5 text-caption">Sin unidad</span>
            </div>
          </q-card-section>
        </q-card>
        <!-- Mensaje si no hay conductores -->
        <div
          v-if="conductoresFiltrados.length === 0 && !loading"
          class="no-data q-pa-md text-center"
        >
          <q-icon name="person_off" size="48px" color="grey-5" />
          <div class="text-grey-6 q-mt-sm">No hay conductores en este grupo</div>
          <q-btn
            flat
            color="primary"
            label="Ver todos"
            icon="folder_open"
            class="q-mt-md"
            @click="verTodosConductores"
          />
        </div>
      </div>
    </q-scroll-area>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <!-- Dialog: Detalles del Conductor (Interfaz Mejorada) -->
    <q-dialog v-model="dialogDetallesConductor" position="right" seamless maximized>
      <q-card class="detalle-card">
        <!-- Header del card con avatar -->
        <q-card-section class="bg-gradient text-white row items-center q-pa-none">
          <q-avatar color="white" text-color="primary" size="80px" class="q-ma-md">
            {{ obtenerIniciales(conductorSeleccionado?.Nombre) }}
          </q-avatar>
          <div class="col">
            <div class="text-h5">{{ conductorSeleccionado?.Nombre }}</div>
            <div class="text-subtitle2">{{ conductorSeleccionado?.Telefono }}</div>
          </div>
          <q-btn
            flat
            dense
            round
            icon="close"
            color="white"
            @click="dialogDetallesConductor = false"
            class="q-mr-md"
          />
        </q-card-section>

        <q-separator />

        <!-- Contenido con Expansion Items -->
        <q-card-section class="scroll detalle-content">
          <!-- Información Personal -->
          <q-expansion-item
            icon="person"
            label="Información Personal"
            class="expansion-item"
            default-opened
          >
            <q-card flat bordered class="q-ma-md">
              <q-card-section>
                <div class="row q-gutter-md">
                  <div class="col-12">
                    <div class="detalle-label">Nombre completo</div>
                    <q-input
                      v-model="conductorEditando.Nombre"
                      outlined
                      dense
                      @blur="actualizarCampo('Nombre', conductorEditando.Nombre)"
                    />
                  </div>
                  <div class="col-12">
                    <div class="detalle-label">Teléfono</div>
                    <q-input
                      v-model="conductorEditando.Telefono"
                      outlined
                      dense
                      mask="(###) ### ####"
                      @blur="actualizarCampo('Telefono', conductorEditando.Telefono)"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <!-- Licencia de Conducir -->
          <q-expansion-item icon="badge" label="Licencia de Conducir" class="expansion-item">
            <q-card flat bordered class="q-ma-md">
              <q-card-section>
                <div class="row q-gutter-md">
                  <div class="col-12 col-md-6">
                    <div class="detalle-label">Nùmero de licencia</div>
                    <q-input
                      v-model="conductorEditando.LicenciaConducir"
                      outlined
                      dense
                      placeholder="Ej: A1234567"
                      :disable="licenciaDeshabilitada"
                      @blur="
                        actualizarCampo('LicenciaConducir', conductorEditando.LicenciaConducir)
                      "
                    >
                      <template v-slot:append>
                        <q-badge
                          v-if="conductorEditando?.LicenciaConducirFecha"
                          :color="esLicenciaVigente ? 'positive' : 'negative'"
                          :label="esLicenciaVigente ? 'Vigente' : 'Expirado'"
                        />
                      </template>
                    </q-input>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="detalle-label">Fecha de vencimiento</div>
                    <q-input :model-value="fechaVencimientoFormato" outlined dense readonly>
                      <template v-slot:append>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-date
                              :model-value="fechaVencimientoFormato"
                              mask="DD/MM/YYYY"
                              @update:model-value="actualizarFechaVencimiento"
                            >
                              <div class="row items-center justify-end">
                                <q-btn v-close-popup label="Cerrar" color="primary" flat />
                              </div>
                            </q-date>
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                      <template v-slot:after>
                        <q-badge
                          v-if="conductorEditando?.LicenciaConducirFecha"
                          :color="esLicenciaVigente ? 'positive' : 'negative'"
                          :label="esLicenciaVigente ? 'Vigente' : 'Expirada'"
                        />
                      </template>
                    </q-input>
                  </div>
                </div>
                <q-separator class="q-my-md" />
                <div class="detalle-label">
                  <q-icon name="image" class="q-mr-xs" />
                  Fotos de Licencia
                  <q-space />
                  <q-btn
                    flat
                    dense
                    round
                    icon="add_photo_alternate"
                    size="sm"
                    color="primary"
                    @click="abrirSelectorFotoLicencia"
                  >
                    <q-tooltip>Subir nueva foto</q-tooltip>
                  </q-btn>
                  <input
                    ref="inputFotoLicencia"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="subirNuevaFotoLicencia"
                  />
                </div>
                <div v-if="cargandoFotosLicencia" class="text-center q-pa-md">
                  <q-spinner color="primary" size="30px" />
                </div>
                <div v-else-if="fotosLicencia.length > 0" class="fotos-grid">
                  <div v-for="foto in fotosLicencia" :key="foto.fullPath" class="foto-card">
                    <q-img
                      :src="foto.url"
                      class="foto-thumbnail"
                      @click="verFotoEnGrande(foto.url)"
                      style="cursor: pointer"
                    />
                    <div class="foto-actions">
                      <q-btn
                        flat
                        dense
                        icon="visibility"
                        size="sm"
                        color="primary"
                        @click="verFotoEnGrande(foto.url)"
                      >
                        <q-tooltip>Ver</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="download"
                        size="sm"
                        color="positive"
                        @click="descargarFotoHandler(foto.url, foto.name)"
                      >
                        <q-tooltip>Descargar</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        size="sm"
                        :color="esLicenciaVigente ? 'grey-5' : 'negative'"
                        :disable="esLicenciaVigente"
                        @click="eliminarFotoLicenciaHandler(foto.url)"
                      >
                        <q-tooltip>{{
                          esLicenciaVigente ? 'No se puede eliminar (vigente)' : 'Eliminar'
                        }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="no-fotos">
                  <q-icon name="image_not_supported" size="32px" color="grey-4" />
                  <div class="text-grey-6 text-caption q-mt-sm">No hay fotos de licencia</div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <!-- Unidad Asignada -->
          <q-expansion-item icon="directions_car" label="Unidad Asignada" class="expansion-item">
            <q-card flat bordered class="q-ma-md">
              <q-card-section>
                <div class="detalle-label">Asignar unidad</div>
                <q-select
                  v-model="conductorEditando.UnidadAsignada"
                  :options="opcionesUnidades"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  label="Seleccionar unidad"
                  @update:model-value="asignarUnidadAConductor"
                />
              </q-card-section>

              <q-card-section v-if="unidadAsociada">
                <q-btn
                  color="primary"
                  icon="my_location"
                  label="Ver ubicación de la unidad"
                  class="full-width"
                  @click="navegarAUnidad"
                  size="md"
                  outline
                >
                  <q-tooltip>Centrar mapa en la ubicación de la unidad GPS</q-tooltip>
                </q-btn>
              </q-card-section>

              <q-separator v-if="unidadAsociada" />
              <q-card-section v-if="unidadAsociada">
                <div class="text-subtitle2 text-primary q-mb-sm">Información de la unidad</div>
                <div class="row q-gutter-md">
                  <div class="col-12">
                    <div class="detalle-label">Número de seguro</div>
                    <q-input
                      v-model="unidadAsociada.SeguroUnidad"
                      outlined
                      dense
                      placeholder="Ingrese código de seguro"
                      :disable="seguroDeshabilitado"
                      @blur="actualizarCampoUnidad('SeguroUnidad', unidadAsociada.SeguroUnidad)"
                    >
                      <template v-slot:append>
                        <q-badge
                          v-if="unidadAsociada?.SeguroUnidadFecha"
                          :color="esSeguroUnidadVigente ? 'positive' : 'negative'"
                          :label="esSeguroUnidadVigente ? 'Vigente' : 'Expirado'"
                        />
                      </template>
                    </q-input>
                  </div>

                  <div class="col-12">
                    <div class="detalle-label">Vencimiento del seguro</div>
                    <q-input
                      :model-value="seguroUnidadFechaFormato || 'Sin fecha'"
                      outlined
                      dense
                      readonly
                    >
                      <template v-slot:append>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-date
                              :model-value="seguroUnidadFechaFormato"
                              mask="DD/MM/YYYY"
                              @update:model-value="actualizarFechaSeguro"
                            >
                              <div class="row items-center justify-end">
                                <q-btn v-close-popup label="Cerrar" color="primary" flat />
                              </div>
                            </q-date>
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                      <template v-slot:after>
                        <q-badge
                          v-if="unidadAsociada?.SeguroUnidadFecha"
                          :color="esSeguroUnidadVigente ? 'positive' : 'negative'"
                          :label="esSeguroUnidadVigente ? 'Vigente' : 'Expirado'"
                        />
                      </template>
                    </q-input>
                  </div>

                  <div class="col-12">
                    <div class="detalle-label">Número de tarjeta de circulación</div>
                    <q-input
                      v-model="unidadAsociada.TargetaCirculacion"
                      outlined
                      dense
                      placeholder="Ingrese código de tarjeta"
                      :disable="tarjetaDeshabilitada"
                      @blur="
                        actualizarCampoUnidad(
                          'TargetaCirculacion',
                          unidadAsociada.TargetaCirculacion,
                        )
                      "
                    >
                      <template v-slot:append>
                        <q-badge
                          v-if="unidadAsociada?.TargetaCirculacionFecha"
                          :color="esTarjetaCirculacionVigente ? 'positive' : 'negative'"
                          :label="esTarjetaCirculacionVigente ? 'Vigente' : 'Expirada'"
                        />
                      </template>
                    </q-input>
                  </div>

                  <div class="col-12">
                    <div class="detalle-label">Vencimiento de tarjeta</div>
                    <q-input
                      :model-value="tarjetaCirculacionFechaFormato || 'Sin fecha'"
                      outlined
                      dense
                      readonly
                    >
                      <template v-slot:append>
                        <q-icon name="event" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-date
                              :model-value="tarjetaCirculacionFechaFormato"
                              mask="DD/MM/YYYY"
                              @update:model-value="actualizarFechaTarjeta"
                            >
                              <div class="row items-center justify-end">
                                <q-btn v-close-popup label="Cerrar" color="primary" flat />
                              </div>
                            </q-date>
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                      <template v-slot:after>
                        <q-badge
                          v-if="unidadAsociada?.TargetaCirculacionFecha"
                          :color="esTarjetaCirculacionVigente ? 'positive' : 'negative'"
                          :label="esTarjetaCirculacionVigente ? 'Vigente' : 'Expirada'"
                        />
                      </template>
                    </q-input>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <!-- Documentación de la Unidad (si hay unidad asignada) -->
          <q-expansion-item
            v-if="unidadAsignadaData"
            icon="description"
            label="Documentación de la Unidad"
            class="expansion-item"
          >
            <q-card flat bordered class="q-ma-md">
              <!-- Fotos de Seguro -->
              <q-card-section>
                <div class="detalle-label">
                  <q-icon name="image" class="q-mr-xs" />
                  Fotos del Seguro
                  <q-space />
                  <q-btn
                    flat
                    dense
                    round
                    icon="add_photo_alternate"
                    size="sm"
                    color="primary"
                    @click="abrirSelectorFotoSeguro"
                  >
                    <q-tooltip>Subir nueva foto</q-tooltip>
                  </q-btn>
                  <input
                    ref="inputFotoSeguro"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="subirNuevaFotoSeguro"
                  />
                </div>
                <div v-if="cargandoFotosSeguro" class="text-center q-pa-md">
                  <q-spinner color="primary" size="30px" />
                </div>
                <div v-else-if="fotosSeguro.length > 0" class="fotos-grid">
                  <div v-for="foto in fotosSeguro" :key="foto.fullPath" class="foto-card">
                    <q-img
                      :src="foto.url"
                      class="foto-thumbnail"
                      @click="verFotoEnGrande(foto.url)"
                      style="cursor: pointer"
                    />
                    <div class="foto-actions">
                      <q-btn
                        flat
                        dense
                        icon="visibility"
                        size="sm"
                        color="primary"
                        @click="verFotoEnGrande(foto.url)"
                      >
                        <q-tooltip>Ver</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="download"
                        size="sm"
                        color="positive"
                        @click="descargarFotoHandler(foto.url, foto.name)"
                      >
                        <q-tooltip>Descargar</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        size="sm"
                        :color="esSeguroUnidadVigente ? 'grey-5' : 'negative'"
                        :disable="esSeguroUnidadVigente"
                        @click="eliminarFotoSeguroHandler(foto.url)"
                      >
                        <q-tooltip>{{
                          esSeguroUnidadVigente ? 'No se puede eliminar (vigente)' : 'Eliminar'
                        }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="no-fotos">
                  <q-icon name="image_not_supported" size="32px" color="grey-4" />
                  <div class="text-grey-6 text-caption q-mt-sm">No hay fotos del seguro</div>
                </div>
              </q-card-section>
              <q-separator />
              <!-- Fotos de Tarjeta -->
              <q-card-section>
                <div class="detalle-label">
                  <q-icon name="image" class="q-mr-xs" />
                  Fotos de Tarjeta de Circulación
                  <q-space />
                  <q-btn
                    flat
                    dense
                    round
                    icon="add_photo_alternate"
                    size="sm"
                    color="primary"
                    @click="abrirSelectorFotoTargeta"
                  >
                    <q-tooltip>Subir nueva foto</q-tooltip>
                  </q-btn>
                  <input
                    ref="inputFotoTargeta"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="subirNuevaFotoTargeta"
                  />
                </div>
                <div v-if="cargandoFotosTargeta" class="text-center q-pa-md">
                  <q-spinner color="primary" size="30px" />
                </div>
                <div v-else-if="fotosTargeta.length > 0" class="fotos-grid">
                  <div v-for="foto in fotosTargeta" :key="foto.fullPath" class="foto-card">
                    <q-img
                      :src="foto.url"
                      class="foto-thumbnail"
                      @click="verFotoEnGrande(foto.url)"
                      style="cursor: pointer"
                    />
                    <div class="foto-actions">
                      <q-btn
                        flat
                        dense
                        icon="visibility"
                        size="sm"
                        color="primary"
                        @click="verFotoEnGrande(foto.url)"
                      >
                        <q-tooltip>Ver</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="download"
                        size="sm"
                        color="positive"
                        @click="descargarFotoHandler(foto.url, foto.name)"
                      >
                        <q-tooltip>Descargar</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        icon="delete"
                        size="sm"
                        :color="esTarjetaCirculacionVigente ? 'grey-5' : 'negative'"
                        :disable="esTarjetaCirculacionVigente"
                        @click="eliminarFotoTargetaHandler(foto.url)"
                      >
                        <q-tooltip>{{
                          esTarjetaCirculacionVigente
                            ? 'No se puede eliminar (vigente)'
                            : 'Eliminar'
                        }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="no-fotos">
                  <q-icon name="image_not_supported" size="32px" color="grey-4" />
                  <div class="text-grey-6 text-caption q-mt-sm">No hay fotos de la tarjeta</div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Dialog: Nuevo Grupo con selección de conductores -->
    <q-dialog v-model="dialogNuevoGrupo" position="standard">
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ modoEdicion ? 'Editar grupo' : 'Nuevo grupo' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="nuevoGrupo.Nombre"
            label="Nombre del grupo"
            outlined
            dense
            autofocus
            :rules="[(val) => !!val || 'El nombre es requerido']"
          />

          <div class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">Seleccionar conductores</div>

            <!-- Búsqueda de conductores -->
            <q-input
              v-model="busquedaConductoresGrupo"
              outlined
              dense
              placeholder="Buscar conductor..."
              class="q-mb-sm"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <!-- Lista de conductores para seleccionar -->
            <q-scroll-area style="height: 300px" class="bordered">
              <q-list>
                <q-item
                  v-for="conductor in conductoresDisponiblesParaGrupo"
                  :key="conductor.id"
                  tag="label"
                  v-ripple
                >
                  <q-item-section avatar>
                    <q-checkbox
                      :model-value="conductoresSeleccionados.includes(conductor.id)"
                      @update:model-value="toggleConductor(conductor.id)"
                    />
                  </q-item-section>
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="32px">
                      {{ obtenerIniciales(conductor.Nombre) }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ conductor.Nombre }}</q-item-label>
                    <q-item-label caption>{{ conductor.Telefono }}</q-item-label>
                  </q-item-section>
                </q-item>

                <div
                  v-if="conductoresDisponiblesParaGrupo.length === 0"
                  class="q-pa-md text-center text-grey-6"
                >
                  No hay conductores disponibles
                </div>
              </q-list>
            </q-scroll-area>

            <div class="q-mt-sm text-caption text-grey-7">
              {{ conductoresSeleccionados.length }} conductor(es) seleccionado(s)
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            flat
            :label="modoEdicion ? 'Guardar' : 'Crear'"
            color="primary"
            @click="guardarGrupo"
            :disable="!nuevoGrupo.Nombre"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Ver foto en grande -->
    <q-dialog v-model="dialogVerFoto">
      <q-card style="min-width: 600px; max-width: 90vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Vista de imagen</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-img :src="fotoSeleccionada" style="max-height: 70vh" fit="contain" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Menú contextual para grupos -->
    <q-menu v-model="menuGrupoVisible" v-if="menuGrupoTarget" touch-position context-menu>
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="editarGrupo">
          <q-item-section avatar>
            <q-icon name="edit" size="xs" />
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="confirmarEliminarGrupo">
          <q-item-section avatar>
            <q-icon name="delete" size="xs" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Eliminar</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <!-- Menú contextual para conductores -->
    <q-menu v-model="menuConductorVisible" v-if="menuConductorTarget" touch-position context-menu>
      <q-list dense style="min-width: 150px">
        <q-item clickable v-close-popup @click="verDetalles">
          <q-item-section avatar>
            <q-icon name="info" size="xs" />
          </q-item-section>
          <q-item-section>Ver detalles</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="quitarDeGrupo" v-if="grupoSeleccionado !== 'todos'">
          <q-item-section avatar>
            <q-icon name="remove_circle" size="xs" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Quitar del grupo</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { date, Notify } from 'quasar'
import { useConductoresFirebase } from 'src/composables/useConductoresFirebase.js'
import { useEventBus } from 'src/composables/useEventBus.js'

const { estadoCompartido, resetAbrirConductores } = useEventBus()

if (!estadoCompartido.value) {
  console.error('❌ Error crítico: estadoCompartido.value no está definido en Conductores')
}

const opcionesUnidades = computed(() => {
  const unidadesAsignadas = conductores.value
    .filter((c) => c.id !== conductorEditando.value?.id)
    .map((c) => c.UnidadAsignada)
    .filter(Boolean)

  return unidades.value
    .filter((u) => !unidadesAsignadas.includes(u.id))
    .map((u) => ({
      label: u.Unidad,
      value: u.id,
    }))
})

watch(
  () => estadoCompartido.value?.abrirConductoresConConductor,
  (newValue) => {
    if (newValue && newValue.conductor) {
      if (newValue.conductor.grupoId && newValue.conductor.grupoId !== grupoSeleccionado.value) {
        grupoSeleccionado.value = newValue.conductor.grupoId
      }

      const conductorEncontrado = conductores.value.find(
        (c) => c.id === newValue.conductor.id && c.grupoId === newValue.conductor.grupoId,
      )

      if (conductorEncontrado) {
        seleccionarConductor(conductorEncontrado)

        setTimeout(() => {
          const elemento = document.querySelector(`[data-conductor-id="${conductorEncontrado.id}"]`)
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
            elemento.classList.add('flash-highlight')
            setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
          }
        }, 300)

        Notify.create({
          type: 'positive',
          message: `👤 Conductor seleccionado: ${conductorEncontrado.Nombre}`,
          caption: `Grupo: ${newValue.conductor.grupoNombre || 'Sin grupo'}`,
          icon: 'person',
          timeout: 2500,
          position: 'top',
        })
      } else {
        Notify.create({
          type: 'warning',
          message: 'No se encontró el conductor seleccionado',
          icon: 'warning',
        })
      }

      resetAbrirConductores()
    }
  },
)

// Emits
const emit = defineEmits(['close', 'conductor-seleccionado'])

// Composable de Firebase
const composable = useConductoresFirebase()

const {
  conductores,
  unidades,
  gruposConductores,
  loading,
  obtenerConductores,
  escucharConductores,
  obtenerUnidades,
  obtenerGruposConductores,
  escucharGrupos,
  actualizarGrupo,
  eliminarGrupo,
  actualizarConductor,
  removerConductorDeGrupo,
  contarConductoresPorGrupo,
  conductoresPorGrupo,
  asignarUnidad,
  obtenerUnidadDeConductor,
  puedeEditarLicenciaConducir,
  puedeEditarSeguroUnidad,
  puedeEditarTargetaCirculacion,
} = composable

// Funciones de fotos
const obtenerFotosLicencia = composable.obtenerFotosLicencia
const obtenerFotosSeguroUnidad = composable.obtenerFotosSeguroUnidad
const obtenerFotosTargetaCirculacion = composable.obtenerFotosTargetaCirculacion
const descargarFoto = composable.descargarFoto
const subirFotoLicencia = composable.subirFotoLicencia
const subirFotoSeguroUnidad = composable.subirFotoSeguroUnidad
const subirFotoTargetaCirculacion = composable.subirFotoTargetaCirculacion
const eliminarFotoLicencia = composable.eliminarFotoLicencia
const eliminarFotoSeguroUnidad = composable.eliminarFotoSeguroUnidad
const eliminarFotoTargetaCirculacion = composable.eliminarFotoTargetaCirculacion

// Estado local
const tab = ref('grupos') // Cambiado a 'grupos' por defecto
const busqueda = ref('')
const busquedaConductoresGrupo = ref('')
const conductorSeleccionado = ref(null)
const conductorEditando = ref({})
const grupoSeleccionado = ref('todos')
const dialogNuevoGrupo = ref(false)
const dialogDetallesConductor = ref(false)
const dialogVerFoto = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
const menuGrupoTarget = ref(null)
const menuConductorTarget = ref(null)
const grupoMenu = ref(null)
const conductorMenu = ref(null)
const modoEdicion = ref(false)
const conductoresSeleccionados = ref([])
const fotoSeleccionada = ref('')

// Estados para fotos
const fotosLicencia = ref([])
const fotosSeguro = ref([])
const fotosTargeta = ref([])
const cargandoFotosLicencia = ref(false)
const cargandoFotosSeguro = ref(false)
const cargandoFotosTargeta = ref(false)

// Referencias para inputs de archivo
const inputFotoLicencia = ref(null)
const inputFotoSeguro = ref(null)
const inputFotoTargeta = ref(null)

// Listeners de Firebase
let unsubscribeConductores = null
let unsubscribeGrupos = null

const nuevoGrupo = ref({
  Nombre: '',
  ConductoresIds: [],
})

const conductoresFiltrados = computed(() => {
  let resultado = []

  if (grupoSeleccionado.value === 'todos') {
    resultado = conductores.value
  } else {
    resultado = conductoresPorGrupo(grupoSeleccionado.value)
  }

  if (busqueda.value) {
    const busquedaLower = busqueda.value.toLowerCase()
    resultado = resultado.filter(
      (c) =>
        c.Nombre?.toLowerCase().includes(busquedaLower) ||
        c.Telefono?.toLowerCase().includes(busquedaLower),
    )
  }

  return resultado
})

const conductoresDisponiblesParaGrupo = computed(() => {
  let disponibles = conductores.value

  const conductoresGrupoActual =
    modoEdicion.value && grupoMenu.value ? grupoMenu.value.ConductoresIds || [] : []

  disponibles = disponibles.filter((conductor) => {
    if (conductoresGrupoActual.includes(conductor.id)) {
      return true
    }

    const estaEnOtroGrupo = gruposConductores.value.some((grupo) => {
      if (modoEdicion.value && grupoMenu.value && grupo.id === grupoMenu.value.id) {
        return false
      }
      return grupo.ConductoresIds?.includes(conductor.id)
    })

    return !estaEnOtroGrupo
  })

  if (busquedaConductoresGrupo.value) {
    const busquedaLower = busquedaConductoresGrupo.value.toLowerCase()
    disponibles = disponibles.filter(
      (c) =>
        c.Nombre?.toLowerCase().includes(busquedaLower) ||
        c.Telefono?.toLowerCase().includes(busquedaLower),
    )
  }

  return disponibles
})

const fechaVencimientoFormato = computed(() => {
  if (!conductorEditando.value?.LicenciaConducirFecha) return ''

  let fecha
  if (conductorEditando.value.LicenciaConducirFecha.toDate) {
    fecha = conductorEditando.value.LicenciaConducirFecha.toDate()
  } else {
    fecha = new Date(conductorEditando.value.LicenciaConducirFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const unidadAsociada = computed(() => {
  if (!conductorEditando.value?.UnidadAsignada) return null
  return obtenerUnidadDeConductor(conductorEditando.value.id)
})
// Computed para deshabilitar campos
const licenciaDeshabilitada = computed(() => {
  if (!conductorEditando.value) return true
  return !puedeEditarLicenciaConducir(conductorEditando.value)
})

const seguroDeshabilitado = computed(() => {
  if (!unidadAsociada.value) return true
  return !puedeEditarSeguroUnidad(unidadAsociada.value)
})

const tarjetaDeshabilitada = computed(() => {
  if (!unidadAsociada.value) return true
  return !puedeEditarTargetaCirculacion(unidadAsociada.value)
})

const esLicenciaVigente = computed(() => {
  if (!conductorEditando.value?.LicenciaConducirFecha) return false

  let fechaVencimiento
  if (conductorEditando.value.LicenciaConducirFecha.toDate) {
    fechaVencimiento = conductorEditando.value.LicenciaConducirFecha.toDate()
  } else {
    fechaVencimiento = new Date(conductorEditando.value.LicenciaConducirFecha)
  }

  return fechaVencimiento > new Date()
})

const unidadAsignadaData = computed(() => {
  if (!conductorEditando.value?.UnidadAsignada) return null
  return obtenerUnidadDeConductor(conductorEditando.value.id)
})

const seguroUnidadFechaFormato = computed(() => {
  if (!unidadAsignadaData.value?.SeguroUnidadFecha) return ''

  let fecha
  if (unidadAsignadaData.value.SeguroUnidadFecha.toDate) {
    fecha = unidadAsignadaData.value.SeguroUnidadFecha.toDate()
  } else {
    fecha = new Date(unidadAsignadaData.value.SeguroUnidadFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esSeguroUnidadVigente = computed(() => {
  if (!unidadAsignadaData.value?.SeguroUnidadFecha) return false

  let fechaVencimiento
  if (unidadAsignadaData.value.SeguroUnidadFecha.toDate) {
    fechaVencimiento = unidadAsignadaData.value.SeguroUnidadFecha.toDate()
  } else {
    fechaVencimiento = new Date(unidadAsignadaData.value.SeguroUnidadFecha)
  }

  return fechaVencimiento > new Date()
})

const tarjetaCirculacionFechaFormato = computed(() => {
  if (!unidadAsignadaData.value?.TargetaCirculacionFecha) return ''

  let fecha
  if (unidadAsignadaData.value.TargetaCirculacionFecha.toDate) {
    fecha = unidadAsignadaData.value.TargetaCirculacionFecha.toDate()
  } else {
    fecha = new Date(unidadAsignadaData.value.TargetaCirculacionFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esTarjetaCirculacionVigente = computed(() => {
  if (!unidadAsignadaData.value?.TargetaCirculacionFecha) return false

  let fechaVencimiento
  if (unidadAsignadaData.value.TargetaCirculacionFecha.toDate) {
    fechaVencimiento = unidadAsignadaData.value.TargetaCirculacionFecha.toDate()
  } else {
    fechaVencimiento = new Date(unidadAsignadaData.value.TargetaCirculacionFecha)
  }

  return fechaVencimiento > new Date()
})

// Watch para cargar fotos cuando se selecciona un conductor
watch(conductorEditando, async (newValue) => {
  if (newValue?.id) {
    await cargarFotosConductor()
  }
})

// Methods
function obtenerIniciales(nombre) {
  if (!nombre) return '??'
  const palabras = nombre.trim().split(' ')
  if (palabras.length === 1) return palabras[0].substring(0, 2).toUpperCase()
  return (palabras[0][0] + (palabras[1]?.[0] || '')).toUpperCase()
}

function filtrarPorGrupo(grupo) {
  grupoSeleccionado.value = grupo.id
  tab.value = 'grupos'
}

function verTodosConductores() {
  grupoSeleccionado.value = 'todos'
  tab.value = 'todos'
}

async function seleccionarConductor(conductor) {
  if (conductorSeleccionado.value?.id === conductor.id && dialogDetallesConductor.value) {
    dialogDetallesConductor.value = false
    conductorSeleccionado.value = null
    conductorEditando.value = {}
    return
  }

  conductorSeleccionado.value = conductor
  conductorEditando.value = { ...conductor }
  dialogDetallesConductor.value = true
  emit('conductor-seleccionado', conductor)
}

function cerrarDrawer() {
  emit('close')
}

async function recargarDatos() {
  try {
    await Promise.all([obtenerConductores(), obtenerUnidades(), obtenerGruposConductores()])

    Notify.create({
      type: 'positive',
      message: 'Datos recargados correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    console.error('Error al recargar:', error)
    Notify.create({
      type: 'negative',
      message: 'Error al recargar: ' + error.message,
      icon: 'error',
    })
  }
}

async function sincronizarDatos() {
  await recargarDatos()
}

async function actualizarCampo(campo, valor) {
  if (!conductorEditando.value?.id) return

  try {
    await actualizarConductor(conductorEditando.value.id, { [campo]: valor })

    Notify.create({
      type: 'positive',
      message: 'Campo actualizado correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar: ' + error.message,
      icon: 'error',
    })
  }
}

// ✅ AGREGAR ESTA NUEVA FUNCIÓN
async function actualizarCampoUnidad(campo, valor) {
  if (!unidadAsociada.value?.id) return

  try {
    // Importar updateDoc y doc si no están importados
    const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    const unidadRef = doc(db, 'Unidades', unidadAsociada.value.id)

    await updateDoc(unidadRef, {
      [campo]: valor,
      updatedAt: Timestamp.now(),
    })

    // Actualizar el estado local
    unidadAsociada.value[campo] = valor

    // Recargar unidades
    await obtenerUnidades()

    Notify.create({
      type: 'positive',
      message: 'Código actualizado correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar: ' + error.message,
      icon: 'error',
    })
  }
}

async function actualizarFechaSeguro(fecha) {
  if (!unidadAsociada.value?.id) return

  try {
    const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    const [dia, mes, año] = fecha.split('/')
    const fechaDate = new Date(año, mes - 1, dia)

    const unidadRef = doc(db, 'Unidades', unidadAsociada.value.id)

    await updateDoc(unidadRef, {
      SeguroUnidadFecha: fechaDate,
      updatedAt: Timestamp.now(),
    })

    // Actualizar estado local
    unidadAsociada.value.SeguroUnidadFecha = fechaDate

    // Recargar unidades
    await obtenerUnidades()

    Notify.create({
      type: 'positive',
      message: 'Fecha de seguro actualizada',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar fecha: ' + error.message,
      icon: 'error',
    })
  }
}

async function actualizarFechaTarjeta(fecha) {
  if (!unidadAsociada.value?.id) return

  try {
    const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    const [dia, mes, año] = fecha.split('/')
    const fechaDate = new Date(año, mes - 1, dia)

    const unidadRef = doc(db, 'Unidades', unidadAsociada.value.id)

    await updateDoc(unidadRef, {
      TargetaCirculacionFecha: fechaDate,
      updatedAt: Timestamp.now(),
    })

    // Actualizar estado local
    unidadAsociada.value.TargetaCirculacionFecha = fechaDate

    // Recargar unidades
    await obtenerUnidades()

    Notify.create({
      type: 'positive',
      message: 'Fecha de tarjeta actualizada',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar fecha: ' + error.message,
      icon: 'error',
    })
  }
}

async function actualizarFechaVencimiento(fecha) {
  if (!conductorEditando.value?.id) return

  try {
    const [dia, mes, año] = fecha.split('/')
    const fechaDate = new Date(año, mes - 1, dia)

    await actualizarConductor(conductorEditando.value.id, {
      LicenciaConducirFecha: fechaDate,
    })

    conductorEditando.value.LicenciaConducirFecha = fechaDate

    Notify.create({
      type: 'positive',
      message: 'Fecha actualizada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al actualizar fecha: ' + error.message,
      icon: 'error',
    })
  }
}

async function asignarUnidadAConductor(unidadId) {
  if (!conductorEditando.value?.id) return

  const unidadYaAsignada = conductores.value.find(
    (c) => c.id !== conductorEditando.value.id && c.UnidadAsignada === unidadId,
  )

  if (unidadYaAsignada) {
    Notify.create({
      type: 'negative',
      message: `Esta unidad ya está asignada a ${unidadYaAsignada.Nombre}`,
      icon: 'error',
      timeout: 3000,
    })

    conductorEditando.value.UnidadAsignada = null
    return
  }

  try {
    await asignarUnidad(conductorEditando.value.id, unidadId)

    Notify.create({
      type: 'positive',
      message: 'Unidad asignada correctamente',
      icon: 'check_circle',
    })

    await cargarFotosConductor()
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al asignar unidad: ' + error.message,
      icon: 'error',
    })
  }
}

// 📸 Cargar todas las fotos del conductor y su unidad
async function cargarFotosConductor() {
  if (!conductorEditando.value?.id) return

  cargandoFotosLicencia.value = true
  try {
    fotosLicencia.value = await obtenerFotosLicencia(conductorEditando.value.id)
  } catch (error) {
    console.error('Error al cargar fotos de licencia:', error)
    fotosLicencia.value = []
  } finally {
    cargandoFotosLicencia.value = false
  }

  if (unidadAsignadaData.value?.id) {
    cargandoFotosSeguro.value = true
    try {
      fotosSeguro.value = await obtenerFotosSeguroUnidad(unidadAsignadaData.value.id)
    } catch (error) {
      console.error('Error al cargar fotos de seguro:', error)
      fotosSeguro.value = []
    } finally {
      cargandoFotosSeguro.value = false
    }

    cargandoFotosTargeta.value = true
    try {
      fotosTargeta.value = await obtenerFotosTargetaCirculacion(unidadAsignadaData.value.id)
    } catch (error) {
      console.error('Error al cargar fotos de tarjeta:', error)
      fotosTargeta.value = []
    } finally {
      cargandoFotosTargeta.value = false
    }
  } else {
    fotosSeguro.value = []
    fotosTargeta.value = []
  }
}

function verFotoEnGrande(url) {
  fotoSeleccionada.value = url
  dialogVerFoto.value = true
}

async function descargarFotoHandler(url, nombreArchivo) {
  try {
    await descargarFoto(url, nombreArchivo)
    Notify.create({
      type: 'positive',
      message: 'Foto descargada correctamente',
      icon: 'download',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al descargar: ' + error.message,
      icon: 'error',
    })
  }
}

// === FUNCIONES PARA SUBIR FOTOS ===

function abrirSelectorFotoLicencia() {
  inputFotoLicencia.value?.click()
}

function abrirSelectorFotoSeguro() {
  inputFotoSeguro.value?.click()
}

function abrirSelectorFotoTargeta() {
  inputFotoTargeta.value?.click()
}

async function subirNuevaFotoLicencia(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    cargandoFotosLicencia.value = true
    await subirFotoLicencia(conductorEditando.value.id, file)

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de licencia subida correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al subir foto: ' + error.message,
      icon: 'error',
    })
  } finally {
    cargandoFotosLicencia.value = false
    if (inputFotoLicencia.value) {
      inputFotoLicencia.value.value = ''
    }
  }
}

async function subirNuevaFotoSeguro(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!unidadAsignadaData.value?.id) {
    Notify.create({
      type: 'warning',
      message: 'Debe asignar una unidad primero',
      icon: 'warning',
    })
    return
  }

  try {
    cargandoFotosSeguro.value = true
    await subirFotoSeguroUnidad(unidadAsignadaData.value.id, file)

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de seguro subida correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al subir foto: ' + error.message,
      icon: 'error',
    })
  } finally {
    cargandoFotosSeguro.value = false
    if (inputFotoSeguro.value) {
      inputFotoSeguro.value.value = ''
    }
  }
}

async function subirNuevaFotoTargeta(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!unidadAsignadaData.value?.id) {
    Notify.create({
      type: 'warning',
      message: 'Debe asignar una unidad primero',
      icon: 'warning',
    })
    return
  }

  try {
    cargandoFotosTargeta.value = true
    await subirFotoTargetaCirculacion(unidadAsignadaData.value.id, file)

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de tarjeta subida correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al subir foto: ' + error.message,
      icon: 'error',
    })
  } finally {
    cargandoFotosTargeta.value = false
    if (inputFotoTargeta.value) {
      inputFotoTargeta.value.value = ''
    }
  }
}

// === FUNCIONES PARA ELIMINAR FOTOS ===

async function eliminarFotoLicenciaHandler(fotoUrl) {
  try {
    await eliminarFotoLicencia(
      conductorEditando.value.id,
      fotoUrl,
      conductorEditando.value.LicenciaConducirFecha,
    )

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de licencia eliminada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error.message,
      icon: 'error',
    })
  }
}

async function eliminarFotoSeguroHandler(fotoUrl) {
  try {
    await eliminarFotoSeguroUnidad(
      unidadAsignadaData.value.id,
      fotoUrl,
      unidadAsignadaData.value.SeguroUnidadFecha,
    )

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de seguro eliminada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error.message,
      icon: 'error',
    })
  }
}

async function eliminarFotoTargetaHandler(fotoUrl) {
  try {
    await eliminarFotoTargetaCirculacion(
      unidadAsignadaData.value.id,
      fotoUrl,
      unidadAsignadaData.value.TargetaCirculacionFecha,
    )

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de tarjeta eliminada correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: error.message,
      icon: 'error',
    })
  }
}

function abrirDialogNuevoGrupo() {
  modoEdicion.value = false
  nuevoGrupo.value = { Nombre: '', ConductoresIds: [] }
  conductoresSeleccionados.value = []
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

function toggleConductor(conductorId) {
  const index = conductoresSeleccionados.value.indexOf(conductorId)
  if (index > -1) {
    conductoresSeleccionados.value.splice(index, 1)
  } else {
    conductoresSeleccionados.value.push(conductorId)
  }
}

async function guardarGrupo() {
  try {
    const conductoresDuplicados = []

    for (const conductorId of conductoresSeleccionados.value) {
      const estaEnOtroGrupo = gruposConductores.value.some((grupo) => {
        if (modoEdicion.value && grupoMenu.value && grupo.id === grupoMenu.value.id) {
          return false
        }
        return grupo.ConductoresIds?.includes(conductorId)
      })

      if (estaEnOtroGrupo) {
        const conductor = conductores.value.find((c) => c.id === conductorId)
        if (conductor) {
          conductoresDuplicados.push(conductor.Nombre)
        }
      }
    }

    if (conductoresDuplicados.length > 0) {
      Notify.create({
        type: 'negative',
        message: `Los siguientes conductores ya están en otro grupo: ${conductoresDuplicados.join(', ')}`,
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      return
    }

    if (modoEdicion.value && grupoMenu.value) {
      await actualizarGrupo(grupoMenu.value.id, {
        Nombre: nuevoGrupo.value.Nombre,
        ConductoresIds: conductoresSeleccionados.value,
      })

      Notify.create({
        type: 'positive',
        message: 'Grupo actualizado correctamente',
        icon: 'check_circle',
      })
    } else {
      Notify.create({
        type: 'warning',
        message: 'No se pueden crear nuevos grupos desde aquí',
        icon: 'warning',
      })
    }

    dialogNuevoGrupo.value = false
  } catch (error) {
    console.error('Error al guardar grupo:', error)
    Notify.create({
      type: 'negative',
      message: 'Error al guardar el grupo: ' + error.message,
      icon: 'error',
    })
  }
}

function mostrarMenuGrupo(event, grupo) {
  event.preventDefault()
  event.stopPropagation()
  grupoMenu.value = grupo
  menuGrupoTarget.value = true // ✅ Solo un flag booleano
  menuGrupoVisible.value = true
}

function mostrarMenuConductor(event, conductor) {
  event.preventDefault()
  event.stopPropagation()
  conductorMenu.value = conductor
  menuConductorTarget.value = true // ✅ Solo un flag booleano
  menuConductorVisible.value = true
}

function editarGrupo() {
  modoEdicion.value = true
  nuevoGrupo.value = { Nombre: grupoMenu.value.Nombre }
  conductoresSeleccionados.value = [...(grupoMenu.value.ConductoresIds || [])]
  busquedaConductoresGrupo.value = ''
  dialogNuevoGrupo.value = true
}

async function confirmarEliminarGrupo() {
  try {
    await eliminarGrupo(grupoMenu.value.id)

    if (grupoSeleccionado.value === grupoMenu.value.id) {
      grupoSeleccionado.value = 'todos'
    }

    Notify.create({
      type: 'positive',
      message: 'Grupo eliminado correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    console.error('Error al eliminar grupo:', error)
    Notify.create({
      type: 'negative',
      message: 'Error al eliminar: ' + error.message,
      icon: 'error',
    })
  }
}

function verDetalles() {
  seleccionarConductor(conductorMenu.value)
}

async function quitarDeGrupo() {
  if (grupoSeleccionado.value === 'todos') {
    Notify.create({
      type: 'warning',
      message: 'Selecciona un grupo primero',
      icon: 'warning',
    })
    return
  }

  try {
    await removerConductorDeGrupo(grupoSeleccionado.value, conductorMenu.value.id)

    Notify.create({
      type: 'positive',
      message: 'Conductor removido del grupo',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error',
    })
  }
}

// Lifecycle
onMounted(async () => {
  try {
    console.log('🔄 Iniciando carga de datos de Firebase...')

    await Promise.all([obtenerConductores(), obtenerUnidades(), obtenerGruposConductores()])

    unsubscribeConductores = escucharConductores()
    unsubscribeGrupos = escucharGrupos()

    console.log('✅ Conectado a Firebase:', {
      conductores: conductores.value.length,
      unidades: unidades.value.length,
      grupos: gruposConductores.value.length,
    })
  } catch (error) {
    console.error('❌ Error al conectar con Firebase:', error)

    Notify.create({
      type: 'negative',
      message: 'Error al conectar con Firebase: ' + error.message,
      icon: 'error',
      timeout: 5000,
    })
  }
})

watch(
  () => estadoCompartido.value?.abrirConductoresConConductor,
  (newValue) => {
    console.log('👀 Conductores.vue: Watch activado')
    console.log('📦 newValue completo:', JSON.stringify(newValue, null, 2))

    if (newValue && newValue.conductor) {
      const { id, grupoId, grupoNombre } = newValue.conductor

      console.log('✅ Datos recibidos:', { id, grupoId, grupoNombre })
      console.log('📂 Grupos disponibles:', gruposConductores.value.length)
      console.log('👥 Conductores disponibles:', conductores.value.length)

      const grupoExiste = gruposConductores.value.find((g) => g.id === grupoId)
      console.log('🔍 ¿Grupo existe?', grupoExiste ? 'SÍ' : 'NO')

      if (!grupoExiste) {
        console.warn('⚠️ Grupo no encontrado, esperando a que se cargue...')
        setTimeout(() => {
          console.log('🔄 Re-intentando después de espera...')
          procesarSeleccionConductor(id, grupoId, grupoNombre)
        }, 500)
      } else {
        procesarSeleccionConductor(id, grupoId, grupoNombre)
      }

      resetAbrirConductores()
    }
  },
  { deep: true, immediate: true },
)

function procesarSeleccionConductor(conductorId, grupoId, grupoNombre) {
  console.log('🎯 Procesando selección de conductor...')
  console.log('   - ID:', conductorId)
  console.log('   - Grupo ID:', grupoId)
  console.log('   - Grupo Nombre:', grupoNombre)

  if (grupoId && grupoId !== grupoSeleccionado.value) {
    console.log(`📂 Cambiando a grupo: ${grupoNombre} (${grupoId})`)
    grupoSeleccionado.value = grupoId
    tab.value = 'grupos'
  }

  nextTick(() => {
    console.log('🔄 NextTick ejecutado')
    console.log('📊 Conductores filtrados disponibles:', conductoresFiltrados.value.length)

    const conductorEncontrado = conductoresFiltrados.value.find((c) => c.id === conductorId)

    if (conductorEncontrado) {
      console.log(`✅ Conductor encontrado: ${conductorEncontrado.Nombre}`)

      seleccionarConductor(conductorEncontrado)

      setTimeout(() => {
        const elemento = document.querySelector(`[data-conductor-id="${conductorId}"]`)
        if (elemento) {
          console.log('📍 Haciendo scroll al elemento')
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })

          elemento.classList.add('flash-highlight')
          setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
        } else {
          console.warn('⚠️ Elemento DOM no encontrado para scroll')
        }
      }, 400)

      Notify.create({
        type: 'positive',
        message: `👤 ${conductorEncontrado.Nombre}`,
        caption: `Grupo: ${grupoNombre || 'Sin grupo'}`,
        icon: 'person',
        timeout: 2500,
        position: 'top',
      })
    } else {
      console.warn('⚠️ Conductor no encontrado en lista filtrada')
      console.log('🔍 Buscando en todos los conductores...')

      const conductorEnTodos = conductores.value.find((c) => c.id === conductorId)

      if (conductorEnTodos) {
        console.log('✅ Encontrado en lista general')
        console.log('   Conductor:', conductorEnTodos.Nombre)

        if (grupoId) {
          grupoSeleccionado.value = grupoId
          tab.value = 'grupos'

          setTimeout(() => {
            seleccionarConductor(conductorEnTodos)
          }, 200)
        } else {
          seleccionarConductor(conductorEnTodos)
        }
      } else {
        console.error('❌ Conductor no existe en la base de datos')
        console.log(
          '📋 Conductores disponibles:',
          conductores.value.map((c) => ({
            id: c.id,
            nombre: c.Nombre,
          })),
        )

        Notify.create({
          type: 'negative',
          message: 'No se encontró el conductor',
          caption: 'El conductor podría haber sido eliminado',
          icon: 'error',
          position: 'top',
        })
      }
    }
  })
}

onUnmounted(() => {
  if (unsubscribeConductores) unsubscribeConductores()
  if (unsubscribeGrupos) unsubscribeGrupos()
})

function navegarAUnidad() {
  if (!unidadAsignadaData.value?.id) {
    Notify.create({
      type: 'warning',
      message: 'No hay unidad asignada',
      icon: 'warning',
    })
    return
  }

  console.log('🔍 === NAVEGACIÓN A UNIDAD ===')
  console.log('Buscando:', unidadAsignadaData.value.Unidad)

  // Acceder al mapa y sus marcadores
  const mapPage = document.getElementById('map-page')
  if (!mapPage || !mapPage._mapaAPI) {
    Notify.create({
      type: 'negative',
      message: 'Error: Mapa no disponible',
      icon: 'error',
    })
    return
  }

  // 🎯 NUEVA ESTRATEGIA: Obtener marcadores directamente del mapa
  const mapaAPI = mapPage._mapaAPI

  console.log('📍 Verificando marcadores en el mapa...')

  // Los marcadores están en mapaAPI (revisa useMapboxGL.js)
  // La función centrarEnUnidad ya existe y funciona

  if (!mapaAPI.map) {
    Notify.create({
      type: 'negative',
      message: 'Mapa no inicializado',
      icon: 'error',
    })
    return
  }

  // Buscar en window._unidadesTrackeadas primero
  let unidadesDisponibles = window._unidadesTrackeadas || []

  console.log(`📊 Unidades en window: ${unidadesDisponibles.length}`)

  // Si no hay en window, buscar directamente en los marcadores del mapa
  if (unidadesDisponibles.length === 0) {
    console.log('⚠️ No hay unidades en window, intentando obtener del tracking...')

    // Verificar si el tracking está activo mirando Firebase
    const unidadesRef = window.firebase_unidades_activas
    if (unidadesRef) {
      console.log('✅ Encontradas unidades en Firebase cache')
      unidadesDisponibles = Object.values(unidadesRef)
    }
  }

  console.log(`📋 Total unidades disponibles: ${unidadesDisponibles.length}`)

  if (unidadesDisponibles.length === 0) {
    console.error('❌ No hay unidades en el sistema')

    Notify.create({
      type: 'warning',
      message: 'No hay unidades activas en el sistema GPS',
      caption: 'Verifica que el simulador esté encendido o que haya vehículos con GPS activo',
      icon: 'gps_off',
      timeout: 4000,
      actions: [
        {
          label: 'Recargar',
          color: 'white',
          handler: () => {
            window.location.reload()
          },
        },
      ],
    })
    return
  }

  // Buscar la unidad por nombre (case insensitive y flexible)
  const nombreBuscado = unidadAsignadaData.value.Unidad?.toLowerCase().trim()

  console.log(`🔍 Buscando unidad: "${nombreBuscado}"`)
  console.log(
    '📋 Unidades disponibles:',
    unidadesDisponibles.map((u) => ({
      nombre: u.unidadNombre,
      id: u.id,
    })),
  )

  const unidadActiva = unidadesDisponibles.find((u) => {
    const nombreUnidad = u.unidadNombre?.toLowerCase().trim()

    // Comparaciones flexibles
    const matchExacto = nombreUnidad === nombreBuscado
    const matchContiene = nombreUnidad?.includes(nombreBuscado)
    const matchInverso = nombreBuscado?.includes(nombreUnidad)

    const match = matchExacto || matchContiene || matchInverso

    if (match) {
      console.log(`✅ Match: "${u.unidadNombre}" ≈ "${unidadAsignadaData.value.Unidad}"`)
    }

    return match
  })

  if (!unidadActiva) {
    console.error('❌ Unidad no encontrada')

    Notify.create({
      type: 'negative',
      message: `No se encontró "${unidadAsignadaData.value.Unidad}"`,
      caption: 'La unidad podría no tener GPS activo',
      icon: 'search_off',
      timeout: 3000,
    })
    return
  }

  console.log('✅ Unidad encontrada:', unidadActiva.unidadNombre)

  // Verificar ubicación
  if (!unidadActiva.ubicacion || !unidadActiva.ubicacion.lat || !unidadActiva.ubicacion.lng) {
    Notify.create({
      type: 'negative',
      message: 'La unidad no tiene ubicación GPS',
      icon: 'gps_not_fixed',
      timeout: 3000,
    })
    return
  }

  const { lat, lng } = unidadActiva.ubicacion

  console.log(`🎯 Navegando a: ${lat}, ${lng}`)

  // Centrar mapa con animación suave
  mapaAPI.map.flyTo({
    center: [lng, lat],
    zoom: 17,
    duration: 1500,
    essential: true,
  })

  // Abrir popup del marcador
  setTimeout(() => {
    if (mapaAPI.centrarEnUnidad) {
      mapaAPI.centrarEnUnidad(unidadActiva.id)
    }
  }, 1600)

  // Cerrar drawer
  dialogDetallesConductor.value = false
  emit('close')

  // Notificación de éxito
  Notify.create({
    type: 'positive',
    message: `📍 ${unidadAsignadaData.value.Unidad}`,
    caption: `Conductor: ${conductorEditando.value.Nombre}`,
    icon: 'my_location',
    position: 'top',
    timeout: 2500,
  })

  console.log('✅ Navegación completada')
}
</script>

<style scoped>
/* Animaciones y transiciones */
.conductor-card {
  transition: all 0.3s ease;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.conductor-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.conductor-selected {
  border: 2px solid #1976d2;
  background-color: #e3f2fd;
}

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

/* Estilos del contenedor principal */
.conductores-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* Header mejorado con estadísticas */
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(187, 0, 0, 0.2);
}

.header-content {
  display: flex;
  flex-direction: column;
}

.header-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 18px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
}

/* Tabs de navegación */
.tabs-container {
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

/* Lista de grupos resaltada */
.grupos-lista {
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-top: 8px;
  padding: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.group-item {
  border-radius: 4px;
  margin-bottom: 4px;
}

.group-item.q-item--active {
  background-color: #e3f2fd;
  font-weight: 500;
}

/* Lista de conductores con diseño de tarjetas */
.conductores-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.conductores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.card-avatar {
  margin-right: 12px;
}

.card-info {
  flex: 1;
}

.card-menu {
  opacity: 0.7;
}

.card-body {
  padding: 0 16px 12px;
}

.unit-badge {
  display: flex;
  justify-content: center;
}

/* Estilos para las fotos */
.fotos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.foto-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: all 0.2s;
}

.foto-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.foto-thumbnail {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.foto-actions {
  display: flex;
  justify-content: space-around;
  padding: 4px;
  background: #f5f5f5;
}

.no-fotos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #fafafa;
  border-radius: 8px;
  margin-top: 8px;
}

/* Estilos para los detalles */
.detalle-section {
  margin-bottom: 16px;
}

.detalle-label {
  font-size: 12px;
  color: #757575;
  margin-bottom: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.detalle-valor {
  font-size: 14px;
  color: #212121;
  padding: 8px 0;
}

.bordered {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

/* Estilos para el mensaje sin datos */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  grid-column: 1 / -1;
}

/* Mejoras para el input de búsqueda */
.search-input {
  border-radius: 8px;
}

/* Mejoras para la lista de grupos */
.grupos-lista {
  max-height: 200px;
  overflow-y: auto;
}

/* Mejoras para el scroll */
.q-scrollarea {
  border-radius: 8px;
}

/* Estilos para el diálogo de detalles mejorado */
.detalle-card {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
}

.detalle-content {
  padding: 0;
}

.expansion-item {
  border-bottom: 1px solid #eee;
}

.expansion-item:last-child {
  border-bottom: none;
}

.expansion-item .q-item {
  font-weight: 500;
  color: #424242;
}
</style>
