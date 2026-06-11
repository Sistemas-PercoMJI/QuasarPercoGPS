import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

if (process.env.MODE !== 'ssr' || process.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
      denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/],
    }),
  )
}

// ─── TILES RASTER (imágenes del satélite / calles) ───────────────────────────
// Rutas: /v4/{tileset}/{z}/{x}/{y}.{format}  y  /raster/v1/...
registerRoute(
  ({ url }) => {
    if (url.hostname !== 'api.mapbox.com') return false
    const esTrafico = url.pathname.includes('mapbox-traffic') || url.pathname.includes('events')
    const esTile =
      url.pathname.startsWith('/v4/') ||
      url.pathname.startsWith('/raster/v1/') ||
      url.pathname.startsWith('/tiles/')
    // Excluir JSON de metadatos, solo imágenes
    const esImagen = /\.(webp|png|jpg|pbf)/.test(url.pathname)
    return esTile && !esTrafico && esImagen
  },
  new CacheFirst({
    cacheName: 'mapbox-raster-tiles',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 800, // más entradas para satellite @2x
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── TILES VECTORIALES (/v2/tiles o /vector/v1) ──────────────────────────────
registerRoute(
  ({ url }) => {
    if (url.hostname !== 'api.mapbox.com') return false
    const esTrafico = url.pathname.includes('mapbox-traffic')
    const esVector = url.pathname.startsWith('/v2/tiles') || url.pathname.startsWith('/vector/v1/')
    return esVector && !esTrafico
  },
  new CacheFirst({
    cacheName: 'mapbox-vector-tiles',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días (cambian más seguido)
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── ESTILOS (JSON con la definición del mapa) ───────────────────────────────
// Ruta: /styles/v1/mapbox/satellite-streets-v12  etc.
registerRoute(
  ({ url }) => url.hostname === 'api.mapbox.com' && url.pathname.startsWith('/styles/v1/'),
  new StaleWhileRevalidate({
    cacheName: 'mapbox-styles',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 1 día
      }),
    ],
  }),
)

// ─── SPRITES (iconos del estilo) ──────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.hostname === 'api.mapbox.com' &&
    url.pathname.startsWith('/styles/v1/') &&
    (url.pathname.includes('/sprite') || url.searchParams.has('access_token')),
  new CacheFirst({
    cacheName: 'mapbox-sprites',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── GLYPHS / FUENTES ─────────────────────────────────────────────────────────
// Ruta: /fonts/v0/{fontstack}/{range}.pbf
registerRoute(
  ({ url }) => url.hostname === 'api.mapbox.com' && url.pathname.startsWith('/fonts/v0/'),
  new CacheFirst({
    cacheName: 'mapbox-glyphs',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── TILESETS (JSON de metadatos) ─────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.hostname === 'api.mapbox.com' &&
    url.pathname.startsWith('/v4/') &&
    url.pathname.endsWith('.json'),
  new StaleWhileRevalidate({
    cacheName: 'mapbox-tilesets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
)

// ─── CDN DE TILES (events.mapbox.com se deja pasar, no cachear) ───────────────
// No registrar ruta para events.mapbox.com — dejar que vaya a la red directo.
