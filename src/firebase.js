import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';


// Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB1_igdTMjK5GOb2a0HU4Dk0EP3GH5leZQ",
  authDomain: "gitformmob.firebaseapp.com",
  projectId: "gitformmob",
  storageBucket: "gitformmob.firebasestorage.app",
  messagingSenderId: "703558567842",
  appId: "1:703558567842:web:f7f5819cb4a9e3dfc414fb",
  measurementId: "G-T79B63G7XC"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Inicjalizacja Firestore
const auth = getAuth(app);

// Eksportowanie niezbędnych funkcji i zmiennych
export { db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, collection, addDoc, getDoc, getDocs, deleteDoc, doc };
