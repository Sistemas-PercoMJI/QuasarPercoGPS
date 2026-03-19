// src/composables/useSoporteTecnico.js
import { ref, computed } from 'vue'
import { auth } from 'src/firebase/firebaseConfig'
import { useMultiTenancy } from 'src/composables/useMultiTenancy'

const FUNCTION_URL = 'https://us-central1-gpsmjindust.cloudfunctions.net/enviarTicketSoporte'
const MAX_IMAGENES = 3
const MAX_TAMANO_MB = 2

const form = ref({
  nombre: '',
  empresa: '',
  correoCuenta: '',
  correoSeguimiento: '',
  descripcion: '',
})
const imagenes = ref([]) // [{ nombre, base64, tipo, preview }]

// ─── Estado del panel ────────────────────────────────────────────────────
const enviando = ref(false)
const enviado = ref(false)
const errorEnvio = ref(null)
const errorImagenes = ref(null)

export function useSoporteTecnico() {
  // ─── Inicializar formulario con datos del usuario logueado ───────────────
  function inicializarForm() {
    const { usuarioActual, idEmpresaActual } = useMultiTenancy()
    const user = auth.currentUser
    const empresa = Array.isArray(idEmpresaActual.value)
      ? idEmpresaActual.value.join(' / ')
      : idEmpresaActual.value || ''
    form.value = {
      nombre: usuarioActual.value?.Usuario || user?.displayName || user?.email || '',
      empresa,
      correoCuenta: user?.email || '',
      correoSeguimiento: '',
      descripcion: '',
    }
    imagenes.value = []
    enviando.value = false
    enviado.value = false
    errorEnvio.value = null
    errorImagenes.value = null
  }

  // ─── Validación ──────────────────────────────────────────────────────────
  const esCorreoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

  const errores = computed(() => {
    const e = {}
    if (!form.value.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (!form.value.empresa.trim()) e.empresa = 'La empresa es requerida'
    if (!form.value.correoCuenta.trim()) e.correoCuenta = 'El correo de cuenta es requerido'
    else if (!esCorreoValido(form.value.correoCuenta)) e.correoCuenta = 'Correo no válido'
    if (!form.value.correoSeguimiento.trim())
      e.correoSeguimiento = 'El correo de seguimiento es requerido'
    else if (!esCorreoValido(form.value.correoSeguimiento)) e.correoSeguimiento = 'Correo no válido'
    if (!form.value.descripcion.trim()) e.descripcion = 'La descripción es requerida'
    return e
  })

  const formularioValido = computed(() => Object.keys(errores.value).length === 0)

  // ─── Manejo de imágenes ──────────────────────────────────────────────────
  function agregarImagenes(archivos) {
    errorImagenes.value = null
    const disponibles = MAX_IMAGENES - imagenes.value.length

    if (disponibles <= 0) {
      errorImagenes.value = `Máximo ${MAX_IMAGENES} imágenes permitidas`
      return
    }

    const archivosAprocesar = Array.from(archivos).slice(0, disponibles)

    for (const archivo of archivosAprocesar) {
      if (!archivo.type.startsWith('image/')) {
        errorImagenes.value = `"${archivo.name}" no es una imagen válida`
        continue
      }

      if (archivo.size > MAX_TAMANO_MB * 1024 * 1024) {
        errorImagenes.value = `"${archivo.name}" excede el límite de ${MAX_TAMANO_MB}MB`
        continue
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const resultado = e.target.result // data:image/png;base64,XXXX
        const [header, base64] = resultado.split(',')
        const tipo = header.match(/:(.*?);/)[1] // image/png

        imagenes.value.push({
          nombre: archivo.name,
          base64,
          tipo,
          preview: resultado, // solo para miniatura en UI
        })
      }
      reader.readAsDataURL(archivo)
    }
  }

  function quitarImagen(index) {
    imagenes.value.splice(index, 1)
    errorImagenes.value = null
  }

  // ─── Envío ───────────────────────────────────────────────────────────────
  async function enviarTicket() {
    if (!formularioValido.value || enviando.value) return

    enviando.value = true
    errorEnvio.value = null

    try {
      const payload = {
        nombre: form.value.nombre.trim(),
        empresa: form.value.empresa.trim(),
        correoCuenta: form.value.correoCuenta.trim(),
        correoSeguimiento: form.value.correoSeguimiento.trim(),
        descripcion: form.value.descripcion.trim(),
        imagenes: imagenes.value.map(({ nombre, base64, tipo }) => ({ nombre, base64, tipo })),
      }

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al enviar el ticket')
      }

      enviado.value = true
    } catch (error) {
      console.error('Error enviando ticket de soporte:', error)
      errorEnvio.value = error.message || 'Error inesperado. Intenta de nuevo.'
    } finally {
      enviando.value = false
    }
  }

  // ─── Reset (al cerrar el dialog) ─────────────────────────────────────────
  function resetear() {
    inicializarForm()
  }

  return {
    form,
    imagenes,
    enviando,
    enviado,
    errorEnvio,
    errorImagenes,
    errores,
    formularioValido,
    MAX_IMAGENES,
    inicializarForm,
    agregarImagenes,
    quitarImagen,
    enviarTicket,
    resetear,
  }
}
