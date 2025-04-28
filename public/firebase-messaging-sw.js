
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the generated config
console.log(
  `Firebase config variables defined in service worker:`,
  `API_KEY: ${typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'undefined'}`,
  `AUTH_DOMAIN: ${typeof process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== 'undefined'}`,
  `PROJECT_ID: ${typeof process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'undefined'}`,
  `STORAGE_BUCKET: ${typeof process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET !== 'undefined'}`,
  `MESSAGING_SENDER_ID: ${typeof process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID !== 'undefined'}`,
  `APP_ID: ${typeof process.env.NEXT_PUBLIC_FIREBASE_APP_ID !== 'undefined'}`,
  `MEASUREMENT_ID: ${typeof process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID !== 'undefined'}`
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Retrieve firebase messaging
// Check if the app is already initialized to avoid errors
let app;
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app(); // Use existing app
}

const messaging = firebase.messaging(app);

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Background Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'Something happened in the background',
    icon: '/icon-192x192.png' // Optional: path to an icon
    // You can add more options like 'badge', 'image', 'actions' etc.
    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
  };

  // Display the notification
  // self refers to the ServiceWorkerGlobalScope
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification.tag);
  event.notification.close(); // Close the notification

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    // Check if the app's window/tab is already open
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      // Check if the client URL matches your app's URL structure
      // You might need to adjust this check based on your app's routing
      if (client.url == '/' && 'focus' in client)
        return client.focus();
    }
    // If no window/tab is open, open a new one
    if (clients.openWindow)
      return clients.openWindow('/'); // Open the root page or a specific notification page
  }));
});
