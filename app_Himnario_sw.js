/* Service worker del Himnario · Celebremos su Gloria.
   Único objetivo: que la app instalada abra SIN CONEXIÓN.
   Generado por _build_pwa.js — no editar a mano.
   Estrategia: red primero (para recibir al instante una versión nueva del
   HTML) y, si no hay red, la última copia guardada. El himnario no tiene
   ninguna referencia externa, así que la copia del HTML basta. */
'use strict';
const CACHE = 'himnario-csg-1';
const DOC = './app_Himnario.html';

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    /* copia inicial; si el archivo se llama distinto no pasa nada, porque
       la navegación también se guarda al vuelo en el fetch de abajo */
    try { await c.add(new Request(DOC, { cache: "reload" })); } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const nombres = await caches.keys();
    /* solo las versiones viejas del himnario: las apps de la carpeta tienen
       su propia caché y no se tocan */
    await Promise.all(nombres.filter(function (n) { return n.indexOf('himnario') === 0 && n !== CACHE; })
      .map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  /* una navegación nueva no lleva query: se busca la copia ignorando ?v=… */
  e.respondWith((async function () {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      /* una navegación se guarda bajo la URL canónica: así abrir con ?v=…
         no llena la caché de copias del mismo documento */
      if (res && res.ok) { if (req.mode === "navigate") c.put(DOC, res.clone()); else c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const guardada = await c.match(req, { ignoreSearch: true });
      if (guardada) return guardada;
      /* las apps de la carpeta comparten scope: su copia puede estar en otra caché */
      const otra = await caches.match(req, { ignoreSearch: true });
      if (otra) return otra;
      if (req.mode === "navigate") {
        const doc = await c.match(DOC, { ignoreSearch: true });
        if (doc) return doc;
      }
      return new Response("Sin conexión y sin copia guardada del himnario.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
