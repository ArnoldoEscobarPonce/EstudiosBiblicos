/* Service worker del Himnario · Celebremos su Gloria.
   Objetivo: que la app instalada abra SIN CONEXIÓN.
   Generado por _build_pwa.js — no editar a mano.

   Estrategia: red primero (para recibir al instante una versión nueva del
   HTML) y, si no hay red, la última copia guardada. El himnario no tiene
   ninguna referencia externa, así que la copia del HTML basta.

   Todas las apps de esta carpeta comparten scope, así que este SW también
   ve sus peticiones: las deja pasar tal cual, solo guarda el HTML del
   himnario y en activate borra únicamente sus propias cachés. */
'use strict';
const CACHE = 'himnario-csg-3';
const DOC = './app_Himnario.html';
const DOC_URL = new URL(DOC, self.location.href).href;
const SW_URL = self.location.href.split('?')[0];
const SIN_RED = '<!DOCTYPE html><html lang="es"><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Sin conexión</title>' +
  '<body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5;max-width:34rem">' +
  '<h1 style="font-size:1.2rem">Sin conexión</h1>' +
  '<p>Esta página no tiene copia guardada en el dispositivo. Abre el Himnario una vez con internet y después ya funcionará sin conexión.</p>' +
  '</body></html>';

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    /* copia inicial; cache "reload" para no reutilizar una versión vieja
       del HTML. Si no hay red se guardará al navegar (fetch de abajo) */
    try {
      const res = await fetch(new Request(DOC_URL, { cache: "reload" }));
      if (res && res.ok) await c.put(DOC_URL, res);
    } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const nombres = await caches.keys();
    /* solo las versiones viejas del himnario: las apps de la carpeta tienen
       su propia caché y no se tocan */
    await Promise.all(nombres.filter(function (n) { return n.indexOf('himnario-csg-') === 0 && n !== CACHE; })
      .map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.href.split("?")[0] === SW_URL) return;   /* el propio SW, intacto */
  e.respondWith((async function () {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      /* del himnario se copia el HTML, y siempre bajo la URL canónica: así
         abrir con ?v=… no llena la caché de copias del mismo documento */
      if (res && res.ok && res.type === "basic" && /\/app_Himnario\.html$/i.test(url.pathname)) {
        c.put(DOC_URL, res.clone()).catch(function () {});
      }
      return res;
    } catch (err) {
      const guardada = await c.match(req, { ignoreSearch: true });
      if (guardada) return guardada;
      /* las apps de la carpeta comparten scope: su copia puede estar en otra caché */
      const otra = await caches.match(req, { ignoreSearch: true });
      if (otra) return otra;
      if (req.mode === "navigate" && /app_Himnario\.html$/i.test(url.pathname)) {
        const doc = await c.match(DOC_URL, { ignoreSearch: true });
        if (doc) return doc;
      }
      if (req.mode === "navigate") {
        return new Response(SIN_RED, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      return new Response("", { status: 504, statusText: "Sin conexión" });
    }
  })());
});
