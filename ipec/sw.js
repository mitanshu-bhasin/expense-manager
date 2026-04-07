const CACHE_NAME = 'ipec-pwa-v1';
const ASSETS = [
    './ipec.html',
    './assets/images/ipec_logo.jpeg',
    './emp.html',
    './admin.html',
    './ip-manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
