/* eslint-env serviceworker */

import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'
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

// 🚫 TRÁFICO: NUNCA cachear - agregar timestamp para burlar caché
registerRoute(
  ({ url }) => {
    return (
      url.hostname === 'api.mapbox.com' &&
      url.pathname.includes('/v4/') &&
      url.pathname.includes('.vector.pbf')
    )
  },
  new NetworkOnly({
    plugins: [
      {
        // Agregar timestamp único para burlar caché del navegador
        requestWillFetch: async ({ request }) => {
          const url = new URL(request.url)
          // Agregar timestamp único
          url.searchParams.set('_t', Date.now())

          return new Request(url.toString(), {
            method: request.method,
            headers: request.headers,
            mode: request.mode,
            credentials: request.credentials,
            cache: 'no-store',
            redirect: request.redirect,
            referrer: request.referrer,
          })
        },
      },
    ],
  }),
)

// ✅ TILES SATELITALES Y CALLES: Cachear 30 días
registerRoute(
  ({ url }) => {
    return url.hostname === 'api.mapbox.com' && url.pathname.includes('/tiles/')
  },
  new CacheFirst({
    cacheName: 'mapbox-tiles',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
)
