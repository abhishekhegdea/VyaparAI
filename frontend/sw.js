const CACHE_NAME = 'DukaanSaathi-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/cart.css',
  '/css/billing.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/products.js',
  '/js/cart.js',
  '/js/billing.js',
  '/js/config.js',
  '/js/admin.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 