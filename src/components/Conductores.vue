<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="conductores-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="text-h6 text-weight-medium">Conductores</div>
      <div>
        <q-btn flat dense round icon="sync" color="white" size="sm" @click="sincronizarDatos">
          <q-tooltip>Sincronizar con Firebase</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="close" color="white" @click="cerrarDrawer" />
      </div>
    </div>

    <!-- Botones de acción - Solo crear grupo -->
    <div class="q-pa-sm q-px-md" style="display: flex; justify-content: flex-end; gap: 4px">
      <q-btn flat dense round icon="create_new_folder" size="sm" @click="abrirDialogNuevoGrupo">
        <q-tooltip>Crear grupo</q-tooltip>
      </q-btn>
    </div>

    <!-- Búsqueda -->
    <div class="q-px-md q-pb-sm">
      <q-input v-model="busqueda" outlined dense placeholder="Búsqueda" class="search-input">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Lista de grupos -->
    <div class="grupos-lista q-px-md q-pb-sm" v-if="gruposConductores.length > 0">
      <div class="text-caption text-grey-7 q-mb-xs">GRUPOS</div>
      <q-list dense bordered class="rounded-borders">
        <q-item
          v-for="grupo in gruposConductores"
          :key="grupo.id"
          clickable
          v-ripple
          @click="filtrarPorGrupo(grupo)"
          :active="grupoSeleccionado === grupo.id"
        >
          <q-item-section avatar>
            <q-icon name="folder" color="blue" />
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

    <!-- Headers de la tabla -->
    <div class="tabla-header q-px-md">
      <div class="header-item">Conductores</div>
      <div class="header-item text-center">Unidad</div>
      <div class="header-item text-right">{{ conductoresFiltrados.length }}</div>
    </div>

    <!-- Lista de conductores -->
    <q-scroll-area class="conductores-list">
      <q-list>
        <q-item
          v-for="conductor in conductoresFiltrados"
          :key="conductor.id"
          clickable
          v-ripple
          @click="seleccionarConductor(conductor)"
          :active="conductorSeleccionado?.id === conductor.id"
          class="conductor-item"
          :data-conductor-id="conductor.id"
        >
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white" size="40px">
              {{ obtenerIniciales(conductor.Nombre) }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{ conductor.Nombre }}</q-item-label>
            <q-item-label caption class="text-grey-7">{{ conductor.Telefono }}</q-item-label>
          </q-item-section>

          <q-item-section center>
            <q-badge
              v-if="obtenerUnidadDeConductor(conductor.id)"
              color="blue-6"
              :label="obtenerUnidadDeConductor(conductor.id)?.Unidad"
            />
            <span v-else class="text-grey-5 text-caption">Sin unidad</span>
          </q-item-section>

          <q-item-section side>
            <q-btn
              flat
              dense
              round
              icon="more_vert"
              size="sm"
              @click.stop="mostrarMenuConductor($event, conductor)"
            />
          </q-item-section>
        </q-item>

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
      </q-list>
    </q-scroll-area>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <!-- Dialog: Detalles del Conductor -->
    <q-dialog v-model="dialogDetallesConductor" position="right" seamless>
      <q-card style="width: 500px; max-width: 90vw">
        <!-- Header del card -->
        <q-card-section class="bg-gradient text-white row items-center">
          <div class="col">
            <div class="text-h6">{{ conductorSeleccionado?.Nombre }}</div>
          </div>
          <q-btn flat dense round icon="close" @click="dialogDetallesConductor = false" />
        </q-card-section>

        <q-separator />

        <!-- Contenido -->
        <q-card-section style="max-height: 70vh" class="scroll">
          <!-- Nombre completo -->
          <div class="detalle-section">
            <div class="detalle-label">Nombre completo</div>
            <q-input
              v-model="conductorEditando.Nombre"
              outlined
              dense
              @blur="actualizarCampo('Nombre', conductorEditando.Nombre)"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Teléfono -->
          <div class="detalle-section">
            <div class="detalle-label">Teléfono</div>
            <q-input
              v-model="conductorEditando.Telefono"
              outlined
              dense
              mask="(###) ### ####"
              @blur="actualizarCampo('Telefono', conductorEditando.Telefono)"
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- Código de licencia de conducir -->
          <div class="detalle-section">
            <div class="detalle-label">Código de licencia de conducir</div>
            <q-input
              v-model="conductorEditando.LicenciaConducirCodigo"
              outlined
              dense
              placeholder="Ej: A1234567"
              @blur="
                actualizarCampo('LicenciaConducirCodigo', conductorEditando.LicenciaConducirCodigo)
              "
            />
          </div>

          <q-separator class="q-my-md" />

          <!-- 📸 FOTOS DE LICENCIA DE CONDUCIR -->
          <div class="detalle-section">
            <div class="detalle-label">
              <q-icon name="image" class="q-mr-xs" />
              Fotos de Licencia de Conducir
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
                    <q-tooltip>
                      {{ esLicenciaVigente ? 'No se puede eliminar (vigente)' : 'Eliminar' }}
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
            <div v-else class="no-fotos">
              <q-icon name="image_not_supported" size="32px" color="grey-4" />
              <div class="text-grey-6 text-caption q-mt-sm">No hay fotos de licencia</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Fecha de vencimiento -->
          <div class="detalle-section">
            <div class="detalle-label">Fecha de vencimiento de licencia</div>
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

          <q-separator class="q-my-md" />

          <!-- Unidad asignada -->
          <div class="detalle-section">
            <div class="detalle-label">Unidad asignada</div>
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
          </div>

          <!-- Información de la unidad asignada -->
          <div v-if="unidadAsignadaData" class="q-mt-md">
            <div class="text-subtitle2 text-primary q-mb-sm">Información de la unidad</div>

            <q-separator class="q-my-md" />

            <!-- Seguro de la unidad -->
            <div class="detalle-section">
              <div class="detalle-label">Código de seguro</div>
              <q-input
                :model-value="unidadAsignadaData.SeguroUnidad || 'Sin código'"
                outlined
                dense
                readonly
              />
            </div>

            <q-separator class="q-my-sm" />

            <!-- 📸 FOTOS DE SEGURO -->
            <div class="detalle-section">
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
                      <q-tooltip>
                        {{ esSeguroUnidadVigente ? 'No se puede eliminar (vigente)' : 'Eliminar' }}
                      </q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
              <div v-else class="no-fotos">
                <q-icon name="image_not_supported" size="32px" color="grey-4" />
                <div class="text-grey-6 text-caption q-mt-sm">No hay fotos del seguro</div>
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Fecha de vencimiento del seguro -->
            <div class="detalle-section">
              <div class="detalle-label">Vencimiento del seguro</div>
              <q-input
                :model-value="seguroUnidadFechaFormato || 'Sin fecha'"
                outlined
                dense
                readonly
              >
                <template v-slot:after>
                  <q-badge
                    v-if="unidadAsignadaData.SeguroUnidadFecha"
                    :color="esSeguroUnidadVigente ? 'positive' : 'negative'"
                    :label="esSeguroUnidadVigente ? 'Vigente' : 'Expirado'"
                  />
                </template>
              </q-input>
            </div>

            <q-separator class="q-my-md" />

            <!-- Tarjeta de circulación -->
            <div class="detalle-section">
              <div class="detalle-label">Código de tarjeta de circulación</div>
              <q-input
                :model-value="unidadAsignadaData.TargetaCirculacion || 'Sin código'"
                outlined
                dense
                readonly
              />
            </div>

            <q-separator class="q-my-sm" />

            <!-- 📸 FOTOS DE TARJETA DE CIRCULACIÓN -->
            <div class="detalle-section">
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
                      <q-tooltip>
                        {{
                          esTarjetaCirculacionVigente
                            ? 'No se puede eliminar (vigente)'
                            : 'Eliminar'
                        }}
                      </q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
              <div v-else class="no-fotos">
                <q-icon name="image_not_supported" size="32px" color="grey-4" />
                <div class="text-grey-6 text-caption q-mt-sm">No hay fotos de la tarjeta</div>
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Fecha de vencimiento de tarjeta de circulación -->
            <div class="detalle-section">
              <div class="detalle-label">Vencimiento de tarjeta de circulación</div>
              <q-input
                :model-value="tarjetaCirculacionFechaFormato || 'Sin fecha'"
                outlined
                dense
                readonly
              >
                <template v-slot:after>
                  <q-badge
                    v-if="unidadAsignadaData.TargetaCirculacionFecha"
                    :color="esTarjetaCirculacionVigente ? 'positive' : 'negative'"
                    :label="esTarjetaCirculacionVigente ? 'Vigente' : 'Expirada'"
                  />
                </template>
              </q-input>
            </div>
          </div>
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
    <q-menu
      v-model="menuGrupoVisible"
      :target="menuGrupoTarget"
      anchor="bottom right"
      self="top right"
      :offset="[0, 5]"
    >
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
    <q-menu
      v-model="menuConductorVisible"
      :target="menuConductorTarget"
      anchor="bottom right"
      self="top right"
      :offset="[0, 5]"
    >
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
  // Obtener unidades ya asignadas (excepto la del conductor actual)
  const unidadesAsignadas = conductores.value
    .filter((c) => c.id !== conductorEditando.value?.id)
    .map((c) => c.UnidadAsignada)
    .filter(Boolean)

  // Retornar solo unidades NO asignadas
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
    resultado = []
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

  // Filtrar conductores que NO estén en otros grupos
  disponibles = disponibles.filter((conductor) => {
    // Permitir conductores del grupo actual
    if (conductoresGrupoActual.includes(conductor.id)) {
      return true
    }

    // Verificar si está en otro grupo
    const estaEnOtroGrupo = gruposConductores.value.some((grupo) => {
      if (modoEdicion.value && grupoMenu.value && grupo.id === grupoMenu.value.id) {
        return false
      }
      return grupo.ConductoresIds?.includes(conductor.id)
    })

    return !estaEnOtroGrupo
  })

  // Aplicar filtro de búsqueda
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
}

function verTodosConductores() {
  grupoSeleccionado.value = 'todos'
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

  // Validar duplicados
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

  // Cargar fotos de licencia
  cargandoFotosLicencia.value = true
  try {
    fotosLicencia.value = await obtenerFotosLicencia(conductorEditando.value.id)
  } catch (error) {
    console.error('Error al cargar fotos de licencia:', error)
    fotosLicencia.value = []
  } finally {
    cargandoFotosLicencia.value = false
  }

  // Cargar fotos de la unidad si está asignada
  if (unidadAsignadaData.value?.id) {
    // Fotos de seguro
    cargandoFotosSeguro.value = true
    try {
      fotosSeguro.value = await obtenerFotosSeguroUnidad(unidadAsignadaData.value.id)
    } catch (error) {
      console.error('Error al cargar fotos de seguro:', error)
      fotosSeguro.value = []
    } finally {
      cargandoFotosSeguro.value = false
    }

    // Fotos de tarjeta de circulación
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

    // Recargar fotos
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
    // Limpiar input
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
    // --- INICIO: Bloque de validación de duplicados ---
    const conductoresDuplicados = []

    for (const conductorId of conductoresSeleccionados.value) {
      const estaEnOtroGrupo = gruposConductores.value.some((grupo) => {
        // Si estamos en modo edición, ignoramos el grupo que se está editando para no marcar sus propios conductores como duplicados.
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
        position: 'top', // Opcional: para mejor visibilidad
      })
      return // Detiene la función si hay duplicados
    }
    // --- FIN: Bloque de validación de duplicados ---

    // Si la validación pasa, se ejecuta el resto del código
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
  event.stopPropagation()
  menuGrupoTarget.value = event.currentTarget
  grupoMenu.value = grupo
  menuGrupoVisible.value = true
}

function mostrarMenuConductor(event, conductor) {
  event.stopPropagation()
  menuConductorTarget.value = event.currentTarget
  conductorMenu.value = conductor
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

      // Verificar si el grupo existe
      const grupoExiste = gruposConductores.value.find((g) => g.id === grupoId)
      console.log('🔍 ¿Grupo existe?', grupoExiste ? 'SÍ' : 'NO')

      if (!grupoExiste) {
        console.warn('⚠️ Grupo no encontrado, esperando a que se cargue...')
        // Dar tiempo a que se carguen los grupos
        setTimeout(() => {
          console.log('🔄 Re-intentando después de espera...')
          procesarSeleccionConductor(id, grupoId, grupoNombre)
        }, 500)
      } else {
        procesarSeleccionConductor(id, grupoId, grupoNombre)
      }

      // Limpiar el estado
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

  // 1. Cambiar al grupo correcto
  if (grupoId && grupoId !== grupoSeleccionado.value) {
    console.log(`📂 Cambiando a grupo: ${grupoNombre} (${grupoId})`)
    grupoSeleccionado.value = grupoId
  }

  nextTick(() => {
    console.log('🔄 NextTick ejecutado')
    console.log('📊 Conductores filtrados disponibles:', conductoresFiltrados.value.length)

    // 3. Buscar el conductor en los filtrados
    const conductorEncontrado = conductoresFiltrados.value.find((c) => c.id === conductorId)

    if (conductorEncontrado) {
      console.log(`✅ Conductor encontrado: ${conductorEncontrado.Nombre}`)

      // 4. Seleccionar el conductor (abre el dialog)
      seleccionarConductor(conductorEncontrado)

      // 5. Scroll y highlight después de que el dialog se abra
      setTimeout(() => {
        const elemento = document.querySelector(`[data-conductor-id="${conductorId}"]`)
        if (elemento) {
          console.log('📍 Haciendo scroll al elemento')
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })

          // Agregar clase de highlight
          elemento.classList.add('flash-highlight')
          setTimeout(() => elemento.classList.remove('flash-highlight'), 2000)
        } else {
          console.warn('⚠️ Elemento DOM no encontrado para scroll')
        }
      }, 400)

      // 6. Notificación de éxito
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

      // Buscar en TODOS los conductores (bypass del filtro)
      const conductorEnTodos = conductores.value.find((c) => c.id === conductorId)

      if (conductorEnTodos) {
        console.log('✅ Encontrado en lista general')
        console.log('   Conductor:', conductorEnTodos.Nombre)

        // Intentar cambiar de grupo nuevamente por si acaso
        if (grupoId) {
          grupoSeleccionado.value = grupoId

          // Esperar y volver a intentar
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
</script>

<style scoped>
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

.conductores-drawer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
  color: white;
  min-height: 48px;
}

.bg-gradient {
  background: linear-gradient(135deg, #bb0000 0%, #bb5e00 100%);
}

.drawer-header .text-h6 {
  color: white;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.search-input {
  background: white;
}

.grupos-lista {
  max-height: 200px;
  overflow-y: auto;
}

.tabla-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
  color: #666;
  font-size: 11px;
}

.header-item {
  flex: 1;
}

.conductores-list {
  flex: 1;
  overflow-y: auto;
}

.conductor-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 10px 12px;
}

.conductor-item.q-item--active {
  background-color: #e3f2fd;
}

.conductor-item:hover {
  background-color: #f5f5f5;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

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
</style>
