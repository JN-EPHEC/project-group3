
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {  apiKey: "AIzaSyBBw-uc8UozoUhFI2J8hahWGQLd9s3c7gc",  authDomain: "wekid-test.firebaseapp.com",  projectId: "wekid-test",  storageBucket: "wekid-test.firebasestorage.app",  messagingSenderId: "901894988107",  appId: "1:901894988107:web:d24a57f713ba9e1e9488ce"};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
