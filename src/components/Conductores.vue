<!-- eslint-disable vue/multi-word-component-names -->
/*COnductores.vue */
<template>
  <div class="conductores-drawer">
    <!-- Header con gradiente y estadísticas -->
    <div class="drawer-header">
      <div class="header-content">
        <div class="text-h6 text-weight-medium">Conductores</div>
        <div class="header-stats">
          <div class="stat-item"></div>
          <div class="stat-item"></div>
        </div>
      </div>
      <div class="header-actions">
        <q-btn flat dense round icon="sync" color="white" size="sm" @click="sincronizarDatos">
          <q-tooltip>Sincronizar con Firebase</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
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
            <q-avatar
              :color="grupoSeleccionado === grupo.id ? 'primary' : 'blue-grey-5'"
              text-color="white"
              size="32px"
            >
              <q-icon name="folder" size="16px" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{ grupo.Nombre }}</q-item-label>
            <q-item-label caption class="text-grey-7">
              <q-icon name="person" size="14px" class="q-mr-xs" />
              {{ contarConductoresPorGrupo(grupo.id) }} conductores
            </q-item-label>
          </q-item-section>

          <!-- Menú contextual para grupos -->
          <q-item-section side>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              color="grey-7"
              @click.stop="mostrarMenuGrupo($event, grupo)"
            >
              <q-tooltip>Opciones del grupo</q-tooltip>

              <!-- ✅ EL MENÚ DEBE ESTAR DENTRO DEL BOTÓN -->
              <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
                <q-list dense style="min-width: 180px" class="rounded-borders menu-contextual">
                  <q-item clickable v-close-popup @click="editarGrupo" class="menu-item">
                    <q-item-section avatar>
                      <q-icon name="edit" size="sm" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Editar grupo</q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-separator spaced inset />

                  <q-item clickable v-close-popup @click="confirmarEliminarGrupo" class="menu-item">
                    <q-item-section avatar>
                      <q-icon name="delete" size="sm" color="negative" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-negative">Eliminar grupo</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
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
          <div class="text-grey-6 q-mt-sm">
            {{
              grupoSeleccionado
                ? 'No hay conductores en este grupo'
                : 'Selecciona un grupo para ver sus conductores'
            }}
          </div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <!-- Dialog: Detalles del Conductor (Interfaz Mejorada) -->

    <!-- Dialog: Detalles del Conductor (Interfaz Mejorada COMPLETA) -->
    <q-dialog
      v-model="dialogDetallesConductor"
      position="right"
      seamless
      maximized
      :persistent="false"
    >
      <q-card class="detalle-card-fixed">
        <!-- Header del card con avatar MEJORADO -->
        <q-card-section class="detalle-header">
          <div class="header-left">
            <q-avatar color="white" text-color="primary" size="64px" class="header-avatar">
              {{ obtenerIniciales(conductorSeleccionado?.Nombre) }}
            </q-avatar>
            <div class="header-info">
              <div class="header-name">{{ conductorSeleccionado?.Nombre }}</div>
              <div class="header-phone">
                <q-icon name="phone" size="14px" />
                {{ conductorSeleccionado?.Telefono }}
              </div>
            </div>
          </div>
          <q-btn
            flat
            dense
            round
            icon="close"
            color="white"
            @click="dialogDetallesConductor = false"
            class="header-close-btn"
          />
        </q-card-section>

        <q-separator />

        <!-- Contenido con Expansion Items CON SCROLL FIJO -->
        <q-scroll-area class="detalle-scroll-area">
          <div class="detalle-content-wrapper">
            <!-- ========================================= -->
            <!-- Información Personal -->
            <!-- ========================================= -->
            <q-expansion-item
              icon="person"
              label="Información Personal"
              class="expansion-item-enhanced"
              default-opened
              header-class="expansion-header"
            >
              <q-card flat bordered class="expansion-card">
                <q-card-section>
                  <div class="info-row">
                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="badge" size="16px" class="q-mr-xs" />
                        Nombre completo
                      </div>
                      <q-input
                        v-model="conductorEditando.Nombre"
                        outlined
                        dense
                        @blur="actualizarCampo('Nombre', conductorEditando.Nombre)"
                        class="field-input"
                      />
                    </div>

                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="phone" size="16px" class="q-mr-xs" />
                        Teléfono
                      </div>
                      <q-input
                        v-model="conductorEditando.Telefono"
                        outlined
                        dense
                        mask="(###) ### ####"
                        @blur="actualizarCampo('Telefono', conductorEditando.Telefono)"
                        class="field-input"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>

            <!-- ========================================= -->
            <!-- Licencia de Conducir -->
            <!-- ========================================= -->
            <q-expansion-item
              icon="badge"
              label="Licencia de Conducir"
              class="expansion-item-enhanced"
              header-class="expansion-header"
            >
              <q-card flat bordered class="expansion-card">
                <q-card-section>
                  <div class="info-row">
                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="edit_document" size="16px" class="q-mr-xs" />
                        Número de licencia
                      </div>
                      <q-input
                        v-model="conductorEditando.LicenciaConducir"
                        outlined
                        dense
                        placeholder="Ej: A1234567"
                        :disable="licenciaDeshabilitada"
                        @blur="
                          actualizarCampo('LicenciaConducir', conductorEditando.LicenciaConducir)
                        "
                        class="field-input"
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

                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="event" size="16px" class="q-mr-xs" />
                        Fecha de vencimiento
                      </div>
                      <q-input
                        :model-value="fechaVencimientoFormato"
                        outlined
                        dense
                        readonly
                        class="field-input"
                      >
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

                  <!-- Fotos de Licencia -->
                  <div class="field-label">
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

            <!-- ========================================= -->
            <!-- Unidad Asignada -->
            <!-- ========================================= -->
            <q-expansion-item
              icon="directions_car"
              label="Unidad Asignada"
              class="expansion-item-enhanced"
              header-class="expansion-header"
            >
              <q-card flat bordered class="expansion-card">
                <q-card-section>
                  <div class="field-label">
                    <q-icon name="directions_car" size="16px" class="q-mr-xs" />
                    Asignar unidad
                  </div>
                  <q-select
                    v-model="conductorEditando.UnidadAsignada"
                    :options="opcionesUnidadesFiltradas"
                    outlined
                    dense
                    emit-value
                    map-options
                    label="Seleccionar unidad"
                    :option-disable="(opt) => opt.disabled"
                    @update:model-value="asignarUnidadAConductor"
                    use-input
                    input-debounce="300"
                    @filter="filtrarUnidades"
                    behavior="menu"
                    class="field-input"
                  >
                    <template v-slot:prepend>
                      <q-icon name="directions_car" />
                    </template>

                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          No se encontraron unidades
                        </q-item-section>
                      </q-item>
                    </template>

                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section avatar>
                          <q-icon
                            :name="scope.opt.disabled ? 'lock' : 'check_circle'"
                            :color="scope.opt.disabled ? 'negative' : 'positive'"
                          />
                        </q-item-section>

                        <q-item-section>
                          <q-item-label>{{ scope.opt.label }}</q-item-label>
                          <q-item-label
                            v-if="scope.opt.conductorActual"
                            caption
                            class="text-orange"
                          >
                            Ocupada por: {{ scope.opt.conductorActual }}
                          </q-item-label>
                          <q-item-label v-else caption class="text-positive">
                            Disponible
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>

                    <template v-slot:append>
                      <q-icon
                        v-if="conductorEditando.UnidadAsignada"
                        name="close"
                        @click.stop="asignarUnidadAConductor(null)"
                        class="cursor-pointer"
                      >
                        <q-tooltip>Quitar unidad</q-tooltip>
                      </q-icon>
                    </template>
                  </q-select>
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

                <!-- Información de la unidad -->
                <q-separator v-if="unidadAsociada" />
                <q-card-section v-if="unidadAsociada">
                  <div class="text-subtitle2 text-primary q-mb-sm">Información de la unidad</div>

                  <div class="info-row">
                    <!-- SEGURO DE UNIDAD -->
                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="shield" size="16px" class="q-mr-xs" />
                        Número de seguro
                      </div>
                      <q-input
                        v-model="unidadAsociada.SeguroUnidad"
                        outlined
                        dense
                        placeholder="Ingrese código de seguro"
                        :disable="seguroDeshabilitado"
                        @blur="actualizarCampoUnidad('SeguroUnidad', unidadAsociada.SeguroUnidad)"
                        class="field-input"
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

                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="event" size="16px" class="q-mr-xs" />
                        Vencimiento del seguro
                      </div>
                      <q-input
                        :model-value="seguroUnidadFechaFormato || 'Sin fecha'"
                        outlined
                        dense
                        readonly
                        class="field-input"
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

                    <!-- FOTOS DEL SEGURO -->
                    <div class="info-field full-width">
                      <div class="field-label">
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
                                esSeguroUnidadVigente
                                  ? 'No se puede eliminar (vigente)'
                                  : 'Eliminar'
                              }}</q-tooltip>
                            </q-btn>
                          </div>
                        </div>
                      </div>

                      <div v-else class="no-fotos">
                        <q-icon name="image_not_supported" size="32px" color="grey-4" />
                        <div class="text-grey-6 text-caption q-mt-sm">No hay fotos del seguro</div>
                      </div>
                    </div>

                    <q-separator class="full-width q-my-md" />

                    <!-- TARJETA DE CIRCULACIÓN -->
                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="credit_card" size="16px" class="q-mr-xs" />
                        Número de tarjeta de circulación
                      </div>
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
                        class="field-input"
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

                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="event" size="16px" class="q-mr-xs" />
                        Vencimiento de tarjeta
                      </div>
                      <q-input
                        :model-value="tarjetaCirculacionFechaFormato || 'Sin fecha'"
                        outlined
                        dense
                        readonly
                        class="field-input"
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

                    <!-- FOTOS DE TARJETA -->
                    <div class="info-field full-width">
                      <div class="field-label">
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
                        <div class="text-grey-6 text-caption q-mt-sm">
                          No hay fotos de la tarjeta
                        </div>
                      </div>
                    </div>

                    <q-separator class="full-width q-my-md" />

                    <!-- PLACAS -->
                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="badge" size="16px" class="q-mr-xs" />
                        Número de placas
                      </div>
                      <q-input
                        v-model="unidadAsociada.Placa"
                        outlined
                        dense
                        placeholder="Ingrese número de placas"
                        :disable="placasDeshabilitada"
                        @blur="actualizarCampoUnidad('Placa', unidadAsociada.Placa)"
                        class="field-input"
                      >
                        <template v-slot:append>
                          <q-badge
                            v-if="unidadAsociada?.PlacasFecha"
                            :color="esPlacasVigente ? 'positive' : 'negative'"
                            :label="esPlacasVigente ? 'Vigente' : 'Expirado'"
                          />
                        </template>
                      </q-input>
                    </div>

                    <div class="info-field">
                      <div class="field-label">
                        <q-icon name="event" size="16px" class="q-mr-xs" />
                        Vencimiento de placas
                      </div>
                      <q-input
                        :model-value="placasFechaFormato || 'Sin fecha'"
                        outlined
                        dense
                        readonly
                        class="field-input"
                      >
                        <template v-slot:append>
                          <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-date
                                :model-value="placasFechaFormato"
                                mask="DD/MM/YYYY"
                                @update:model-value="actualizarFechaPlacas"
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
                            v-if="unidadAsociada?.PlacasFecha"
                            :color="esPlacasVigente ? 'positive' : 'negative'"
                            :label="esPlacasVigente ? 'Vigente' : 'Expirado'"
                          />
                        </template>
                      </q-input>
                    </div>

                    <!-- FOTOS DE PLACAS -->
                    <div class="info-field full-width">
                      <div class="field-label">
                        <q-icon name="image" class="q-mr-xs" />
                        Fotos de Placas
                        <q-space />
                        <q-btn
                          flat
                          dense
                          round
                          icon="add_photo_alternate"
                          size="sm"
                          color="primary"
                          @click="abrirSelectorFotoPlacas"
                        >
                          <q-tooltip>Subir nueva foto</q-tooltip>
                        </q-btn>
                        <input
                          ref="inputFotoPlacas"
                          type="file"
                          accept="image/*"
                          style="display: none"
                          @change="subirNuevaFotoPlacas"
                        />
                      </div>

                      <div v-if="cargandoFotosPlacas" class="text-center q-pa-md">
                        <q-spinner color="primary" size="30px" />
                      </div>

                      <div v-else-if="fotosPlacas.length > 0" class="fotos-grid">
                        <div v-for="foto in fotosPlacas" :key="foto.fullPath" class="foto-card">
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
                              :color="esPlacasVigente ? 'grey-5' : 'negative'"
                              :disable="esPlacasVigente"
                              @click="eliminarFotoPlacasHandler(foto.url)"
                            >
                              <q-tooltip>{{
                                esPlacasVigente ? 'No se puede eliminar (vigente)' : 'Eliminar'
                              }}</q-tooltip>
                            </q-btn>
                          </div>
                        </div>
                      </div>

                      <div v-else class="no-fotos">
                        <q-icon name="image_not_supported" size="32px" color="grey-4" />
                        <div class="text-grey-6 text-caption q-mt-sm">
                          No hay fotos de las placas
                        </div>
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
          <!-- 🔥 CIERRE detalle-content-wrapper -->
        </q-scroll-area>
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

    <!-- Menú contextual para conductores -->
    <q-menu
      v-model="menuConductorVisible"
      context-menu
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-list dense style="min-width: 180px" class="rounded-borders menu-contextual">
        <q-item clickable v-close-popup @click="verDetalles" class="menu-item">
          <q-item-section avatar>
            <q-icon name="info" size="sm" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Ver detalles</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator spaced inset v-if="grupoSeleccionado !== 'todos'" />

        <q-item
          clickable
          v-close-popup
          @click="quitarDeGrupo"
          v-if="grupoSeleccionado !== 'todos'"
          class="menu-item"
        >
          <q-item-section avatar>
            <q-icon name="remove_circle" size="sm" color="negative" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-negative">Quitar del grupo</q-item-label>
          </q-item-section>
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
import { useMultiTenancy } from 'src/composables/useMultiTenancy'

const { estadoCompartido, resetAbrirConductores } = useEventBus()
const { cargarUsuarioActual, idEmpresaActual } = useMultiTenancy()

if (!estadoCompartido.value) {
  console.error('❌ Error crítico: estadoCompartido.value no está definido en Conductores')
}

const opcionesUnidades = computed(() => {
  const conductorEditandoId = conductorEditando.value?.id
  const unidadActualDelConductor = conductorEditando.value?.UnidadAsignada

  // Crear mapa de asignaciones excluyendo al conductor actual
  const asignaciones = {}
  conductores.value.forEach((c) => {
    if (c.UnidadAsignada && c.id !== conductorEditandoId) {
      asignaciones[c.UnidadAsignada] = c.Nombre
    }
  })

  // Procesar todas las unidades
  return unidades.value.map((unidad) => {
    const estaOcupada = !!asignaciones[unidad.id]
    const esMiUnidadActual = unidad.id === unidadActualDelConductor

    return {
      label: `${unidad.Unidad}${asignaciones[unidad.id] ? ` (Ocupada por: ${asignaciones[unidad.id]})` : ''}${esMiUnidadActual ? ' (Mi unidad actual)' : ''}`,
      value: unidad.id,
      disabled: estaOcupada && !esMiUnidadActual, // Deshabilitar si está ocupada por otro
      conductorActual: asignaciones[unidad.id],
      esMiUnidadActual: esMiUnidadActual,
    }
  })
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
  obtenerFotosPlacas,
  subirFotoPlacas,
  eliminarFotoPlacas,
  puedeEditarPlacas,
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
const grupoSeleccionado = ref(null)
const dialogNuevoGrupo = ref(false)
const dialogDetallesConductor = ref(false)
const dialogVerFoto = ref(false)
const menuGrupoVisible = ref(false)
const menuConductorVisible = ref(false)
//const menuGrupoTarget = ref(null)
//const menuConductorTarget = ref(null)
const grupoMenu = ref(null)
const conductorMenu = ref(null)
const modoEdicion = ref(false)
const conductoresSeleccionados = ref([])
const fotoSeleccionada = ref('')

// Estados para fotos
const fotosLicencia = ref([])
const fotosSeguro = ref([])
const fotosTargeta = ref([])
const fotosPlacas = ref([])
const cargandoFotosLicencia = ref(false)
const cargandoFotosSeguro = ref(false)
const cargandoFotosTargeta = ref(false)
const cargandoFotosPlacas = ref(false)

// Referencias para inputs de archivo
const inputFotoLicencia = ref(null)
const inputFotoSeguro = ref(null)
const inputFotoTargeta = ref(null)
const inputFotoPlacas = ref(null)
const opcionesUnidadesFiltradas = ref([])

// Listeners de Firebase
let unsubscribeConductores = null
let unsubscribeGrupos = null

const nuevoGrupo = ref({
  Nombre: '',
  ConductoresIds: [],
})

const placasDeshabilitada = computed(() => {
  if (!unidadAsociada.value) return true
  return !puedeEditarPlacas(unidadAsociada.value)
})

const conductoresFiltrados = computed(() => {
  if (!grupoSeleccionado.value) {
    return []
  }

  let resultado = conductoresPorGrupo(grupoSeleccionado.value)

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

function filtrarUnidades(val, update) {
  update(() => {
    if (val === '') {
      // Si no hay búsqueda, mostrar todas las opciones
      opcionesUnidadesFiltradas.value = opcionesUnidades.value
    } else {
      // Filtrar por nombre de unidad
      const needle = val.toLowerCase()
      opcionesUnidadesFiltradas.value = opcionesUnidades.value.filter(
        (v) => v.label.toLowerCase().indexOf(needle) > -1,
      )
    }
  })
}

watch(
  opcionesUnidades,
  (nuevasOpciones) => {
    opcionesUnidadesFiltradas.value = nuevasOpciones
  },
  { immediate: true },
)

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

const placasFechaFormato = computed(() => {
  if (!unidadAsignadaData.value?.PlacasFecha) return ''

  let fecha
  if (unidadAsignadaData.value.PlacasFecha.toDate) {
    fecha = unidadAsignadaData.value.PlacasFecha.toDate()
  } else {
    fecha = new Date(unidadAsignadaData.value.PlacasFecha)
  }

  return date.formatDate(fecha, 'DD/MM/YYYY')
})

const esPlacasVigente = computed(() => {
  if (!unidadAsignadaData.value?.PlacasFecha) return false

  let fechaVencimiento
  if (unidadAsignadaData.value.PlacasFecha.toDate) {
    fechaVencimiento = unidadAsignadaData.value.PlacasFecha.toDate()
  } else {
    fechaVencimiento = new Date(unidadAsignadaData.value.PlacasFecha)
  }

  return fechaVencimiento > new Date()
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

async function actualizarFechaPlacas(fecha) {
  if (!unidadAsociada.value?.id) return

  try {
    const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
    const { db } = await import('src/firebase/firebaseConfig')

    const [dia, mes, año] = fecha.split('/')
    const fechaDate = new Date(año, mes - 1, dia)

    const unidadRef = doc(db, 'Unidades', unidadAsociada.value.id)

    await updateDoc(unidadRef, {
      PlacasFecha: fechaDate,
      updatedAt: Timestamp.now(),
    })

    // Actualizar estado local
    unidadAsociada.value.PlacasFecha = fechaDate

    // Recargar unidades
    await obtenerUnidades()

    Notify.create({
      type: 'positive',
      message: 'Fecha de placas actualizada',
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

  const conductorId = conductorEditando.value.id
  const unidadAnteriorId = conductorEditando.value.UnidadAsignada

  try {
    // CASO 1: Si unidadId es null/undefined, está QUITANDO la unidad
    if (!unidadId) {
      console.log('🗑️ Removiendo unidad del conductor...')

      // Eliminar de Firebase Realtime Database
      if (unidadAnteriorId) {
        const { realtimeDb } = await import('src/firebase/firebaseConfig')
        const { ref: dbRef, remove } = await import('firebase/database')

        const unidadIdKey = `unidad_${unidadAnteriorId}`
        const unidadRef = dbRef(realtimeDb, `unidades_activas/${unidadIdKey}`)

        await remove(unidadRef)
        console.log(`✅ Unidad ${unidadIdKey} eliminada del mapa`)
      }

      // Actualizar Firestore
      await asignarUnidad(conductorId, null)

      // Actualizar estado local
      conductorEditando.value.UnidadAsignada = null
      if (conductorSeleccionado.value) {
        conductorSeleccionado.value.UnidadAsignada = null
      }

      Notify.create({
        type: 'positive',
        message: 'Unidad removida correctamente',
        icon: 'check_circle',
        timeout: 2000,
      })

      // Recargar datos
      await obtenerConductores()
      await obtenerUnidades()

      return
    }

    // CASO 2: Está ASIGNANDO una nueva unidad
    // Verificar si la unidad ya está asignada a OTRO conductor
    const otroConductorConEstaUnidad = conductores.value.find(
      (c) => c.UnidadAsignada === unidadId && c.id !== conductorId,
    )

    if (otroConductorConEstaUnidad) {
      Notify.create({
        type: 'negative',
        message: `Error: La unidad ya está asignada a ${otroConductorConEstaUnidad.Nombre}`,
        icon: 'error',
        timeout: 3000,
      })

      // Restaurar valor anterior
      conductorEditando.value.UnidadAsignada = conductorSeleccionado.value?.UnidadAsignada || null
      return
    }

    // Si había una unidad anterior diferente, eliminarla del mapa
    if (unidadAnteriorId && unidadAnteriorId !== unidadId) {
      const { realtimeDb } = await import('src/firebase/firebaseConfig')
      const { ref: dbRef, remove } = await import('firebase/database')

      const unidadAnteriorKey = `unidad_${unidadAnteriorId}`
      const unidadAnteriorRef = dbRef(realtimeDb, `unidades_activas/${unidadAnteriorKey}`)

      await remove(unidadAnteriorRef)
      console.log(`✅ Unidad anterior ${unidadAnteriorKey} eliminada del mapa`)
    }

    // Ejecutar la asignación
    await asignarUnidad(conductorId, unidadId)

    // Actualizar estado local
    conductorEditando.value.UnidadAsignada = unidadId
    if (conductorSeleccionado.value) {
      conductorSeleccionado.value.UnidadAsignada = unidadId
    }

    // Recargar datos primero
    await obtenerConductores()
    await obtenerUnidades()
  } catch (error) {
    console.error('❌ Error al gestionar unidad:', error)

    Notify.create({
      type: 'negative',
      message: 'Error: ' + error.message,
      icon: 'error',
      timeout: 3000,
    })

    // Restaurar en caso de error
    conductorEditando.value.UnidadAsignada = unidadAnteriorId
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

    cargandoFotosPlacas.value = true
    try {
      fotosPlacas.value = await obtenerFotosPlacas(unidadAsignadaData.value.id)
    } catch (error) {
      console.error('Error al cargar fotos de placas:', error)
      fotosPlacas.value = []
    } finally {
      cargandoFotosPlacas.value = false
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
    fotosPlacas.value = []
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

function abrirSelectorFotoPlacas() {
  inputFotoPlacas.value?.click()
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

async function subirNuevaFotoPlacas(event) {
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
    cargandoFotosPlacas.value = true
    await subirFotoPlacas(unidadAsignadaData.value.id, file)

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de placas subida correctamente',
      icon: 'check_circle',
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Error al subir foto: ' + error.message,
      icon: 'error',
    })
  } finally {
    cargandoFotosPlacas.value = false
    if (inputFotoPlacas.value) {
      inputFotoPlacas.value.value = ''
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

async function eliminarFotoPlacasHandler(fotoUrl) {
  try {
    await eliminarFotoPlacas(
      unidadAsignadaData.value.id,
      fotoUrl,
      unidadAsignadaData.value.PlacasFecha,
    )

    await cargarFotosConductor()

    Notify.create({
      type: 'positive',
      message: 'Foto de placas eliminada correctamente',
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

    // ✅ MODO EDICIÓN
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
    }
    // ✅ MODO CREACIÓN
    else {
      const { collection, addDoc, Timestamp } = await import('firebase/firestore')
      const { db, auth } = await import('src/firebase/firebaseConfig')

      // ✅ IMPORTANTE: Guardar en la SUBCOLECCIÓN del usuario
      const userId = auth.currentUser.uid

      const grupoData = {
        Nombre: nuevoGrupo.value.Nombre,
        ConductoresIds: conductoresSeleccionados.value,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      // 🔥 Ruta correcta: /Usuarios/{userId}/GruposConductores
      await addDoc(collection(db, `Usuarios/${userId}/GruposConductores`), grupoData)

      Notify.create({
        type: 'positive',
        message: 'Grupo creado correctamente',
        icon: 'check_circle',
      })

      await obtenerGruposConductores()
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
  menuGrupoVisible.value = true
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
      grupoSeleccionado.value = null
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
  if (!grupoSeleccionado.value) {
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
  if (!idEmpresaActual.value) {
    await cargarUsuarioActual()
  }

  console.log('🏢 Empresa:', idEmpresaActual.value)

  // Ahora sí cargar conductores
  await obtenerConductores()
  try {
    await Promise.all([obtenerConductores(), obtenerUnidades(), obtenerGruposConductores()])

    unsubscribeConductores = escucharConductores()
    unsubscribeGrupos = escucharGrupos()
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
    if (newValue && newValue.conductor) {
      const { id, grupoId, grupoNombre } = newValue.conductor
      const grupoExiste = gruposConductores.value.find((g) => g.id === grupoId)

      if (!grupoExiste) {
        console.warn('⚠️ Grupo no encontrado, esperando a que se cargue...')
        setTimeout(() => {
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
  if (grupoId && grupoId !== grupoSeleccionado.value) {
    grupoSeleccionado.value = grupoId
    tab.value = 'grupos'
  }

  nextTick(() => {
    const conductorEncontrado = conductoresFiltrados.value.find((c) => c.id === conductorId)
    if (conductorEncontrado) {
      seleccionarConductor(conductorEncontrado)
      setTimeout(() => {
        const elemento = document.querySelector(`[data-conductor-id="${conductorId}"]`)
        if (elemento) {
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

      const conductorEnTodos = conductores.value.find((c) => c.id === conductorId)

      if (conductorEnTodos) {
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

  // Si no hay en window, buscar directamente en los marcadores del mapa
  if (unidadesDisponibles.length === 0) {
    // Verificar si el tracking está activo mirando Firebase
    const unidadesRef = window.firebase_unidades_activas
    if (unidadesRef) {
      unidadesDisponibles = Object.values(unidadesRef)
    }
  }

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

  const unidadActiva = unidadesDisponibles.find((u) => {
    const nombreUnidad = u.unidadNombre?.toLowerCase().trim()

    // Comparaciones flexibles
    const matchExacto = nombreUnidad === nombreBuscado
    const matchContiene = nombreUnidad?.includes(nombreBuscado)
    const matchInverso = nombreBuscado?.includes(nombreUnidad)

    const match = matchExacto || matchContiene || matchInverso

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
}
</script>

<style scoped>
/* ============================================ */
/* === ANIMACIONES Y TRANSICIONES === */
/* ============================================ */
.conductor-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0; /* 🔥 Quitamos margin porque ya hay gap */
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 2px solid transparent;
  /* 🔥 IMPORTANTE: esto permite que la sombra se vea completa */
  will-change: transform;
}

/* Efecto de brillo deslizante */
.conductor-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 70%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.conductor-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}
.conductor-card:hover:not(.conductor-selected) {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: #42a5f5;
  z-index: 10; /* 🔥 Eleva la tarjeta por encima de las demás */
}
.conductor-card:hover::before {
  transform: translateX(100%);
}

/* Avatar que crece y rota */
.conductor-card:hover .card-avatar {
  animation: avatar-bounce-rotate 0.6s ease;
}

@keyframes avatar-bounce-rotate {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.15) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.conductor-selected {
  border: 2px solid #1976d2;
  background-color: #e3f2fd;
  box-shadow: 0 8px 20px rgba(25, 118, 210, 0.3);
}
.conductor-card.conductor-selected:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 16px 32px rgba(25, 118, 210, 0.5) !important;
  border-color: #0d47a1 !important;
  background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%) !important;
  z-index: 10; /* 🔥 Eleva la tarjeta */
}

/* Flash highlight para notificaciones */
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

/* ============================================ */
/* === LAYOUT PRINCIPAL === */
/* ============================================ */
.conductores-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* ============================================ */
/* === HEADER MEJORADO === */
/* ============================================ */
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  background-size: 200% 200%;
  animation: gradientFlow 8s ease infinite;
  color: white;
  box-shadow: 0 4px 12px rgba(187, 0, 0, 0.2);
  min-height: 64px;
}

@keyframes gradientFlow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.header-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.header-content .text-h6 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
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
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: scale(1.1);
}

.stat-number {
  font-size: 18px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions .q-btn {
  transition: all 0.3s ease;
}

.header-actions .q-btn:hover {
  transform: scale(1.2) rotate(15deg);
  background: rgba(255, 255, 255, 0.2);
}

.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
}

/* ============================================ */
/* === BÚSQUEDA MEJORADA === */
/* ============================================ */
.search-input {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.search-input:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-input:focus-within {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(187, 0, 0, 0.2);
}

.search-input:focus-within .q-icon {
  animation: search-pulse 1.5s ease infinite;
  color: #bb0000;
}

@keyframes search-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

/* ============================================ */
/* === GRUPOS LISTA === */
/* ============================================ */
.grupos-lista {
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-top: 8px;
  padding: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  max-height: 200px;
  overflow-y: auto;
}

.group-item {
  border-radius: 8px;
  margin-bottom: 6px;
  padding: 8px 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

/* Borde lateral animado */
.group-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: linear-gradient(180deg, #1976d2 0%, #42a5f5 100%);
  transition: width 0.3s ease;
}

.group-item:hover {
  background-color: #e3f2fd;
  transform: translateX(4px);
}
.group-item .q-avatar {
  transition: all 0.3s ease;
  flex-shrink: 0; /* 🔥 No se encoge */
}

.group-item:hover::before {
  width: 4px;
}

.group-item.q-item--active {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

.group-item.q-item--active::before {
  width: 4px;
}

/* Avatar del grupo animado */
.group-item:hover .q-avatar {
  transform: scale(1.08);
}
.group-item .q-avatar .q-icon {
  font-size: 18px !important; /* 🔥 Tamaño fijo del icono */
}
@keyframes avatar-grow-rotate {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.15) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

/* ============================================ */
/* === LISTA DE CONDUCTORES (TARJETAS) === */
/* ============================================ */
.conductores-list {
  padding: 20px; /* 🔥 Más padding */
  overflow: visible;
  flex: 1;
}

.conductores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 10px 10px 40px 5px; /* 🔥 24px arriba, 20px a los lados, 40px abajo */
}
.card-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  transition: all 0.3s ease;
}

.conductor-card:hover .card-header {
  padding-left: 20px;
}

.card-avatar {
  margin-right: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.conductor-card:hover .card-avatar {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.card-info {
  flex: 1;
  transition: transform 0.3s ease;
}

.conductor-card:hover .card-info {
  transform: translateX(4px);
}

.card-menu {
  opacity: 0.7;
  transition: all 0.3s ease;
}

.conductor-card:hover .card-menu {
  opacity: 1;
  transform: scale(1.1);
}

.card-body {
  padding: 0 16px 12px;
}

.unit-badge {
  display: flex;
  justify-content: center;
  transition: transform 0.3s ease;
}

.conductor-card:hover .unit-badge {
  transform: scale(1.05);
}

/* ============================================ */
/* === FOTOS GRID === */
/* ============================================ */
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
  transition: all 0.3s ease;
  position: relative;
}

/* Efecto de elevación 3D */
.foto-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
  pointer-events: none;
}

.foto-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px) scale(1.05);
}

.foto-card:hover::after {
  left: 100%;
}

.foto-thumbnail {
  width: 100%;
  height: 120px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.foto-card:hover .foto-thumbnail {
  transform: scale(1.1);
}

.foto-actions {
  display: flex;
  justify-content: space-around;
  padding: 4px;
  background: #f5f5f5;
}

.foto-actions .q-btn {
  transition: all 0.3s ease;
}

.foto-actions .q-btn:hover {
  transform: scale(1.2);
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
  animation: fadeInScale 0.6s ease-out;
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.no-fotos .q-icon {
  animation: float-icon 3s ease-in-out infinite;
}

@keyframes float-icon {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* ============================================ */
/* === DETALLES === */
/* ============================================ */
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
  transition: color 0.3s ease;
}

.detalle-label:hover {
  color: #1976d2;
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

/* ============================================ */
/* === NO DATA === */
/* ============================================ */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  grid-column: 1 / -1;
  animation: fadeInScale 0.6s ease-out;
}

.no-data .q-icon {
  animation: float-empty 3s ease-in-out infinite;
}

@keyframes float-empty {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(-5deg);
  }
  75% {
    transform: translateY(-10px) rotate(5deg);
  }
}

/* ============================================ */
/* === DIÁLOGO DE DETALLES === */
/* ============================================ */
.detalle-card {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  animation: dialog-entrance 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
.detalle-card-fixed {
  width: 480px !important; /* 🔥 ANCHO FIJO */
  max-width: 480px !important;
  min-width: 480px !important;
  height: 100vh;
  display: flex;
  flex-direction: column;
  animation: dialog-entrance 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden; /* 🔥 IMPORTANTE */
}
.detalle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #bb0000 0%, #d84315 100%);
  background-size: 200% 200%;
  animation: gradientFlow 8s ease infinite;
  color: white;
  min-height: 100px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
@keyframes dialog-entrance {
  0% {
    opacity: 0;
    transform: scale(0.9) translateX(50px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}

.detalle-content {
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}
.header-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 3px solid white;
  transition: all 0.3s ease;
}

.header-avatar:hover {
  transform: scale(1.1) rotate(5deg);
}

.expansion-item {
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
}

.expansion-item:hover {
  background-color: #fafafa;
}

.expansion-item:last-child {
  border-bottom: none;
}

.expansion-item .q-item {
  font-weight: 500;
  color: #424242;
  transition: all 0.3s ease;
}

.expansion-item:hover .q-item {
  padding-left: 20px;
}

/* ============================================ */
/* === MENÚS CONTEXTUALES === */
/* ============================================ */
.menu-contextual {
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  background: white;
}

.menu-item {
  padding: 12px 16px;
  transition: all 0.2s ease;
  min-height: 44px;
  position: relative;
  overflow: hidden;
}

/* Efecto de slide */
.menu-item::before {
  content: '';
  position: absolute;
  left: -100%;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.1), transparent);
  transition: left 0.4s ease;
}

.menu-item:hover {
  background: linear-gradient(90deg, #f5f5f5 0%, #fafafa 100%);
  padding-left: 20px;
}

.menu-item:hover::before {
  left: 100%;
}

.menu-item .q-item__section--avatar {
  min-width: 32px;
}

.menu-item .q-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.menu-item:hover .q-icon {
  animation: icon-bounce 0.6s ease;
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

.q-separator--inset {
  margin-left: 48px;
}

/* ============================================ */
/* === SCROLLBAR PERSONALIZADO === */
/* ============================================ */
.conductores-list :deep(.q-scrollarea__thumb) {
  width: 5px !important;
  background-color: #9e9e9e !important;
  border-radius: 2.5px !important;
  opacity: 0.6 !important;
  right: 2px !important;
  transition: all 0.3s ease !important;
}

.conductores-list :deep(.q-scrollarea__bar) {
  width: 8px !important;
  right: 0px !important;
  background: transparent !important;
}

.conductores-list:hover :deep(.q-scrollarea__thumb) {
  opacity: 0.8 !important;
  background-color: #757575 !important;
  width: 6px !important;
}

/* ============================================ */
/* === BOTONES DE ACCIÓN === */
/* ============================================ */
.q-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.q-btn:hover {
  transform: translateY(-2px);
}

.q-btn:active {
  transform: translateY(0);
}

/* Botón flotante crear grupo */
.q-btn[icon='create_new_folder']:hover {
  transform: scale(1.15) rotate(10deg);
}

/* ============================================ */
/* === BADGES === */
/* ============================================ */
.q-badge {
  transition: all 0.3s ease;
}

.q-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* ============================================ */
/* === INPUTS === */
/* ============================================ */
.q-input:focus-within {
  transform: scale(1.02);
  transition: transform 0.3s ease;
}

/* ============================================ */
/* === RESPONSIVE === */
/* ============================================ */
@media (max-width: 600px) {
  .conductores-grid {
    grid-template-columns: 1fr;
  }

  .drawer-header {
    padding: 12px 16px;
    min-height: 56px;
  }

  .header-content .text-h6 {
    font-size: 16px;
  }
}
.header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.header-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-phone {
  font-size: 14px;
  opacity: 0.95;
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-close-btn {
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.header-close-btn:hover {
  transform: scale(1.2) rotate(90deg);
  background: rgba(255, 255, 255, 0.2);
}

/* Scroll area CON ALTURA FIJA */
.detalle-scroll-area {
  flex: 1;
  height: 100%; /* 🔥 IMPORTANTE */
  overflow-y: auto;
  overflow-x: hidden; /* 🔥 Evita scroll horizontal */
}

.detalle-content-wrapper {
  padding: 0 0 24px 0;
  width: 100%; /* 🔥 IMPORTANTE */
}

/* Expansion items mejorados */
.expansion-item-enhanced {
  border-bottom: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.expansion-item-enhanced:hover {
  background-color: #fafafa;
}

.expansion-item-enhanced:last-child {
  border-bottom: none;
}

.expansion-header {
  font-weight: 600;
  color: #424242;
  padding: 16px 20px;
  transition: all 0.3s ease;
}

.expansion-item-enhanced:hover .expansion-header {
  padding-left: 24px;
  color: #1976d2;
}

.expansion-card {
  margin: 0 16px 16px 16px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  animation: card-appear 0.4s ease-out;
}

@keyframes card-appear {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Info fields mejorados */
.info-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-field.full-width {
  grid-column: 1 / -1; /* Ocupa todo el ancho */
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #616161;
  display: flex;
  align-items: center;
  letter-spacing: 0.3px;
}

.field-input {
  transition: all 0.3s ease;
}

.field-input:hover {
  transform: translateX(4px);
}

.field-input:focus-within {
  transform: translateX(6px);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

/* Responsive para pantallas pequeñas */
@media (max-width: 600px) {
  .detalle-card-fixed {
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 100vw !important;
  }

  .header-name {
    font-size: 18px;
  }

  .header-avatar {
    size: 56px;
  }

  .expansion-header {
    padding: 12px 16px;
  }
}
</style>
