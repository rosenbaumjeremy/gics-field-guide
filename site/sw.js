"use strict";
// Offline copy of the site. Online, files come from the network first (up to 4s) so edits
// show up; the saved copy is the fallback. Add any new site file to SHELL and bump CACHE.
const CACHE = "gics-field-guide-v3";
const SHELL = ["./", "index.html", "app.css", "app.js", "weights.js", "writeups.js", "offline.js", "icon.svg", "data/gics.json", "data/weights.json", "data/writeups/index.json", "data/writeups/queue.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fresh(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("slow")), 4000);
    fetch(req).then(res => {
      clearTimeout(t);
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      resolve(res);
    }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  // same-origin files and the Google Fonts stylesheet/font files
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (req.method !== "GET" || (url.origin !== self.location.origin && !fonts)) return;
  e.respondWith(fresh(req).catch(() =>
    caches.match(req, { ignoreSearch: true }).then(hit => hit || (fonts ? Response.error() : caches.match("index.html")))));
});
