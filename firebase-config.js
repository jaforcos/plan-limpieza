// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNVzJEDDwPEq6WhJDnscrfMzZFMjykkDE",
  authDomain: "plan-de-limpieza-2026.firebaseapp.com",
  projectId: "plan-de-limpieza-2026",
  storageBucket: "plan-de-limpieza-2026.firebasestorage.app",
  messagingSenderId: "575163614718",
  appId: "1:575163614718:web:3b467d335e459bb3ff6caf",
  measurementId: "G-EMHZEHVQ78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
