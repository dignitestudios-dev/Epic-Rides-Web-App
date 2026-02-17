// // public/firebase-messaging-sw.js
// importScripts(
//   "https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js"
// );
// importScripts(
//   "https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js"
// );

// const firebaseConfig = {
//   apiKey: "AIzaSyCRiWBgbyt3TdyD_WhIO3c82FpfYuR_uf8",
//   authDomain: "rentibles-app.firebaseapp.com",
//   projectId: "rentibles-app",
//   storageBucket: "rentibles-app.firebasestorage.app",
//   messagingSenderId: "366992554576",
//   appId: "1:366992554576:web:8c8781df54b276fc1eef55",
//   measurementId: "G-V0F642L156",
// };

// firebase.initializeApp(firebaseConfig);

// const messaging = firebase.messaging();

// messaging.onBackgroundMessage(function (payload) {
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });
// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js"
);

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRiWBgbyt3TdyD_WhIO3c82FpfYuR_uf8",
  authDomain: "rentibles-app.firebaseapp.com",
  projectId: "rentibles-app",
  storageBucket: "rentibles-app.firebasestorage.app",
  messagingSenderId: "366992554576",
  appId: "1:366992554576:web:8c8781df54b276fc1eef55",
  measurementId: "G-V0F642L156",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

let notification;

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
  const data = JSON.parse(payload?.data?.data);
  notification = data;

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/path/to/your/icon.png", // Replace with your notification icon
    actions: [
      notification?.type == "chat" && { action: "reply", title: "Reply" }, // Add action for reply
      { action: "view", title: "View" }, // Add action for view
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  const action = event.action;

  if (action === "reply") {
    console.log(notification?.type === "chat");
    if (notification?.type === "chat") {
      // Redirect to the chat page
      event.waitUntil(
        clients.openWindow(`/messages/${notification?.chatUser?.chatId}`)
      );
    }
  } else if (action === "view") {
    console.log("View action clicked");

    if (notification?.type === "booking") {
      // Redirect to the booking tracking page
      event.waitUntil(
        clients.openWindow(`/rental-tracking/${notification?.booking?._id}`)
      );
    } else if (notification?.type === "product") {
      // Redirect to the product page
      event.waitUntil(
        clients.openWindow(`/products/${notification?.product?._id}`)
      );
    }
  } else {
    // Handle default notification click
    event.waitUntil(
      clients.openWindow("/") // Example: Open main app
    );
  }

  event.notification.close();
});
