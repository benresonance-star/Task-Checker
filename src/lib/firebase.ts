import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBvTNt4mEas2aa0hJm8D6tIvg0QL34UwLw",
  authDomain: "check-mate-e5bfe.firebaseapp.com",
  projectId: "check-mate-e5bfe",
  storageBucket: "check-mate-e5bfe.firebasestorage.app",
  messagingSenderId: "160931863048",
  appId: "1:160931863048:web:f36ef086efaea71efb0fbd",
  measurementId: "G-36PB9W2C5S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services for use throughout the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;







