
// Import the functions you need from the SDKs you need
import "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import "firebase/messaging";

// Access the global firebase object provided by the compat scripts
const firebase = (window as any).firebase;

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
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
const increment = firebase.firestore.FieldValue.increment;
const arrayUnion = firebase.firestore.FieldValue.arrayUnion;

export { auth, db, storage, messaging, serverTimestamp, increment, arrayUnion, firebase };
