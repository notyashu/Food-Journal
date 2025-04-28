
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const configValues = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check for missing essential configuration variables
const essentialKeys: (keyof typeof configValues)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
];

let missingKeys = false;
essentialKeys.forEach((key) => {
    if (!configValues[key]) {
        console.warn(`
    ***************************************************************************
    * WARNING: Firebase config key "${key}" is missing!                       *
    * Ensure NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} is set in your .env file.        *
    ***************************************************************************
        `);
        missingKeys = true;
    }
});

if (missingKeys) {
     console.error(`
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    ! ERROR: Critical Firebase configuration is missing.                      !
    ! The application will likely fail to connect to Firebase services.       !
    ! Please check your .env file and ensure all required                     !
    ! NEXT_PUBLIC_FIREBASE_* variables are correctly set.                     !
    ! Also, ensure Email/Password sign-in is enabled in Firebase Console.     !
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `);
}


const firebaseConfig = {
  apiKey: configValues.apiKey,
  authDomain: configValues.authDomain,
  projectId: configValues.projectId,
  storageBucket: configValues.storageBucket,
  messagingSenderId: configValues.messagingSenderId,
  appId: configValues.appId,
  measurementId: configValues.measurementId, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  // Check if config has essential keys before initializing
  if (!missingKeys) {
       try {
           app = initializeApp(firebaseConfig);
       } catch (error) {
           console.error("Firebase initialization failed:", error);
           // Handle initialization error, maybe show a message to the user
           // or prevent the app from loading further depending on severity.
           // For now, we'll let the app continue but Firebase features might not work.
           // A more robust solution might involve a state to indicate Firebase is unavailable.
       }
  } else {
       console.error("Firebase initialization skipped due to missing configuration.");
  }
} else {
  app = getApp();
}

// Initialize Auth and Firestore conditionally
// @ts-ignore app might be uninitialized if config is missing
const auth: Auth = app ? getAuth(app) : ({} as Auth);
// @ts-ignore app might be uninitialized if config is missing
const db: Firestore = app ? getFirestore(app) : ({} as Firestore);


export { app, auth, db };

