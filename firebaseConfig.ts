// Import the functions you need from the SDKs you need
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcCSa8zpJfR52LU149VyTA5Of1NXdHFsk",
  authDomain: "local-news-india.firebaseapp.com",
  projectId: "local-news-india",
  storageBucket: "local-news-india.firebasestorage.app",
  messagingSenderId: "472000282759",
  appId: "1:472000282759:web:c5c5a5ab157e237ccbb822"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
const increment = firebase.firestore.FieldValue.increment;

export { auth, db, storage, serverTimestamp, increment, firebase };