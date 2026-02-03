// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA04DRhBhE5gP44I4VJIcwCqFFQVzZvQ7o",
  authDomain: "user-auth-8f3d8.firebaseapp.com",
  projectId: "user-auth-8f3d8",
  storageBucket: "user-auth-8f3d8.firebasestorage.app",
  messagingSenderId: "597930679231",
  appId: "1:597930679231:web:7cb82057f52150ec69df0a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);