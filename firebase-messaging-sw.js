
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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.svg', // Main app icon
    badge: '/icon-192.svg', // Small monochrome icon for status bar (Android)
    image: payload.notification.image || null, // Rich media image (BigPicture style)
    vibrate: [200, 100, 200, 100, 200], // Custom vibration pattern
    tag: 'public-tak-news', // Collapse similar notifications
    renotify: true, // Play sound/vibrate even if replacing an old notification with same tag
    data: {
        url: payload.data?.url || '/'
    },
    actions: [
        {
            action: 'open',
            title: 'Read Now'
        }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Open the URL sent in the data payload
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(urlToOpen) && 'focus' in client) {
                return client.focus();
            }
        }
        // If not, open a new window/tab and focus it
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    })
  );
});
