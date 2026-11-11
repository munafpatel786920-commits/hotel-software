import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCRVygjetYvo4HkHDwFMb17Imh7qD3SEA0",
  authDomain: "hotel-app-d97ac.firebaseapp.com",
  projectId: "hotel-app-d97ac",
  storageBucket: "hotel-app-d97ac.firebasestorage.app",
  messagingSenderId: "388880785409",
  appId: "1:388880785409:web:a37b3f5e4a12e726daa000",
  measurementId: "G-W8C87B515G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Use the default firestore database of the custom project
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
