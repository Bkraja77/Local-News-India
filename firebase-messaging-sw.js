
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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || "Public Tak Update";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "Click to see the latest news.",
    icon: '/icon-192.png', 
    badge: '/icon-192.png',
    image: payload.notification?.image || payload.data?.image || null,
    vibrate: [200, 100, 200],
    tag: payload.data?.postId || 'general-news',
    renotify: true,
    data: {
        url: payload.data?.url || (payload.data?.postId ? `/?postId=${payload.data.postId}` : '/')
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
            }
        }
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    })
  );
});
