// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCCtg9w076E1hPRP_bDNRfZ2xMrJpz6wAk',
  authDomain: 'gpsmjindust.firebaseapp.com',
  projectId: 'gpsmjindust',
  storageBucket: 'gpsmjindust.firebasestorage.app',
  messagingSenderId: '122667950807',
  appId: '1:122667950807:web:5715854bfaa45c76880692',
  measurementId: 'G-CPR9K26MBF',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)
// Exportar servicios
export { db, auth }
