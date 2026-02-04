import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
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
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Setup Recaptcha
export const setupRecaptcha = (elementId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        console.log("Recaptcha Verified");
      }
    });
  }
  return window.recaptchaVerifier;
};

export { auth, signInWithPhoneNumber, signInWithPopup, googleProvider };
