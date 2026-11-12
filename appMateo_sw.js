/* Service worker de «Mateo · Resumen completo (Reina-Valera 1960)».
   Único objetivo: que la app instalada abra SIN CONEXIÓN.
   Generado por _build_pwa_apps.js — no editar a mano.
   Estrategia: red primero (para recibir al instante una versión nueva) y, si no
   hay red, la última copia guardada. Como esta app es un solo archivo sin
   referencias externas, esa copia del HTML basta. */
'use strict';
const CACHE = 'pwa-appmateo-1';
const APP = 'pwa-appmateo-';
const DOC = './appMateo.html';

/* clave canónica: sin query ni hash, para que ?v=… no duplique copias */
function clave(url) {
  const u = new URL(url);
  u.search = ""; u.hash = "";
  return u.href;
}

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    try { await c.add(new Request(DOC, { cache: "reload" })); } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    /* solo las versiones viejas de ESTA app: las cachés de las demás se respetan */
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(function (n) { return n.indexOf(APP) === 0 && n !== CACHE; })
      .map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async function () {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && res.ok) c.put(clave(req.url), res.clone());
      return res;
    } catch (err) {
      /* sin red: propia caché → cualquier otra caché de la carpeta → aviso */
      const propia = await c.match(clave(req.url), { ignoreSearch: true });
      if (propia) return propia;
      const otra = await caches.match(req, { ignoreSearch: true });
      if (otra) return otra;
      return new Response("Sin conexión y sin copia guardada de appMateo.html.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
