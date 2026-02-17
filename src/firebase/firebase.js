import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_KEY,
  // Update this api key with your own firebase api key
  // authDomain: "rentibles-app.firebaseapp.com",
  // projectId: "rentibles-app",
  // storageBucket: "rentibles-app.firebasestorage.app",
  // messagingSenderId: "366992554576",
  // appId: "1:366992554576:web:8c8781df54b276fc1eef55",
  // measurementId: "G-V0F642L156",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
export const db = getFirestore(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

const messaging = getMessaging(app);

export { messaging };

export default app; // Export the app if needed
