/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// Precache all build assets (URLs injected by CRA at build time)
precacheAndRoute(self.__WB_MANIFEST);

// App Shell: todas las rutas de navegación se sirven con index.html
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url: { pathname }, sameOrigin }) => {
    if (!sameOrigin) return false;
    if (request.mode !== 'navigate') return false;
    if (pathname.startsWith('/_')) return false;
    if (pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache de imágenes PNG (logos, iconos)
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'mihogar-images',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

// Permite que la app fuerce la activación del SW actualizado
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
