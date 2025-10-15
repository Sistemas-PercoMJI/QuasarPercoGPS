// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage' // <- Agregar esta importación

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCCtg9w076E1hPRP_bDNRfZ2xMrJpz6wAk',
  authDomain: 'gpsmjindust.firebaseapp.com',
  projectId: 'gpsmjindust',
  storageBucket: 'gpsmjindust.firebasestorage.app', // <- Este es tu storage bucket
  messagingSenderId: '122667950807',
  appId: '1:122667950807:web:5715854bfaa45c76880692',
  measurementId: 'G-CPR9K26MBF',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
const db = getFirestore(app)
const auth = getAuth(app)
const storage = getStorage(app) // <- Agregar esta inicialización

// Exportar servicios
export { db, auth, storage } // <- Agregar storage a las exportaciones