"use strict";
// Keep a copy of the site on the device so it opens without a connection (see sw.js),
// and say so under the progress bar once the copy is saved.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.ready.then(() => caches.match("index.html")).then(hit => {
    if (!hit) return;
    const note = document.createElement("span");
    note.textContent = "✓ Saved on this device: works offline";
    document.querySelector(".progress").appendChild(note);
  }).catch(() => {});
}
