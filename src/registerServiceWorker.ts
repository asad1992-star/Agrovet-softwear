// Service Worker Registration for Offline Capabilities

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[AgroVet] ServiceWorker registered with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[AgroVet] New content available; please refresh.');
                  } else {
                    console.log('[AgroVet] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[AgroVet] ServiceWorker registration failed:', error);
        });
    });
  }
}
