// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.AIzaSyCwCjgRwad408l4zKQz5iyrjRkg0R45o2Y,
  authDomain: import.meta.env.halo-31be8.firebaseapp.com,
  projectId: import.meta.env.halo-31be8,
  storageBucket: import.meta.env.halo-31be8.firebasestorage.app,
  messagingSenderId: import.meta.env.283938710904,
  appId: import.meta.env.1:283938710904:web:9c34024c7cb5345d3cd48d,
  measurementId: import.meta.env.G-N2K2TX22RW
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
