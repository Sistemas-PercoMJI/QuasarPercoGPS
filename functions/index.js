const { setGlobalOptions } = require('firebase-functions/v2')
const { onRequest } = require('firebase-functions/v2/https')
const fetch = require('node-fetch')

// Configuración global de límite de instancias
setGlobalOptions({ maxInstances: 10 })

/**
 * 🗺️ Proxy para descargar imágenes de Mapbox Static Images API
 * Evita problemas de CORS al acceder directamente desde el navegador
 *
 * URL de ejemplo:
 * https://us-central1-tu-proyecto.cloudfunctions.net/getMapboxImage?url=https://api.mapbox.com/...
 */
exports.getMapboxImage = onRequest(
  {
    cors: true, // Habilitar CORS automáticamente
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    const mapUrl = req.query.url

    if (!mapUrl) {
      return res.status(400).send('URL parameter is required')
    }

    try {
      console.log('📥 Descargando mapa de Mapbox:', mapUrl.substring(0, 100) + '...')

      const response = await fetch(mapUrl)

      if (!response.ok) {
        console.error('❌ Error de Mapbox:', response.status, response.statusText)
        return res.status(response.status).send(`Mapbox error: ${response.statusText}`)
      }

      const buffer = await response.buffer()

      // Headers para la imagen
      res.set('Content-Type', 'image/png')
      res.set('Cache-Control', 'public, max-age=300') // Cache por 5 minutos
      res.send(buffer)

      console.log('✅ Imagen enviada correctamente')
    } catch (error) {
      console.error('❌ Error fetching map:', error)
      res.status(500).send('Error fetching map image')
    }
  },
)
