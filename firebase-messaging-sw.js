
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCcCSa8zpJfR52LU149VyTA5Of1NXdHFsk",
  authDomain: "local-news-india.firebaseapp.com",
  projectId: "local-news-india",
  storageBucket: "local-news-india.firebasestorage.app",
  messagingSenderId: "472000282759",
  appId: "1:472000282759:web:c5c5a5ab157e237ccbb822"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/**
 * Handle background messages.
 * Note: Custom sounds are not supported in the standard showNotification API 
 * for background service workers in most browsers for anti-spam reasons.
 * However, we use vibrations and high-quality images to ensure visibility.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "New News Update";
  const notificationOptions = {
    body: payload.notification.body || "Click to read the latest updates on Public Tak.",
    icon: '/icon-192.png', 
    badge: '/icon-192.png', // Monochrome icon for Android status bar
    image: payload.notification.image || payload.data?.image || null, // Large image for drawer
    vibrate: [300, 100, 300, 100, 400], // Distinctive news vibration pattern
    tag: 'public-tak-news-alert',
    renotify: true,
    data: {
        url: payload.data?.url || (payload.data?.postId ? `/?postId=${payload.data.postId}` : '/')
    },
    actions: [
        {
            action: 'open',
            title: 'Read News'
        },
        {
            action: 'close',
            title: 'Dismiss'
        }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  if (event.action === 'close') {
    event.notification.close();
    return;
  }

  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
        // Try to find an existing window and focus it
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(self.location.origin) && 'focus' in client) {
                // If it's the same URL, focus it. If different, navigate and focus.
                if (client.url === urlToOpen) {
                    return client.focus();
                } else {
                    return client.navigate(urlToOpen).then(c => c.focus());
                }
            }
        }
        // If no window found, open a new one
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    })
  );
});
