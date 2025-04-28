
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
    // storageBucket is often optional, but good to check
    // messagingSenderId is required for FCM
    // appId is usually required
];

let missingKeys = false;
essentialKeys.forEach((key) => {
    if (!configValues[key]) {
        console.warn(`
    ***************************************************************************
    * WARNING: Firebase config key "${key}" is potentially missing!           *
    * Ensure NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} is set in your .env file *
    * if you intend to use features requiring it (e.g., Auth, Firestore).   *
    ***************************************************************************
        `);
        missingKeys = true; // Mark that some keys might be missing
    }
});

// Check specifically for Auth-related keys if Auth is intended to be used
if (!configValues.apiKey || !configValues.authDomain) {
     console.error(`
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    ! ERROR: Critical Firebase Auth configuration (apiKey, authDomain) missing!
    ! Firebase Authentication will likely fail.                               !
    ! Please check your .env file and ensure all required                     !
    ! NEXT_PUBLIC_FIREBASE_* variables are correctly set.                     !
    ! Also, ensure Email/Password sign-in is enabled in Firebase Console.     !
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `);
     // Optionally throw an error here if Auth is absolutely critical and cannot proceed without it
     // throw new Error("Missing critical Firebase Auth configuration.");
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
let auth: Auth;
let db: Firestore;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    // Initialize Auth and Firestore - these will throw errors if config is invalid/missing
    auth = getAuth(app);
    db = getFirestore(app);

} catch (error) {
    console.error("Firebase initialization failed:", error);
    console.error(`
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    ! Critical Firebase Initialization Error!                                 !
    ! The application failed to initialize Firebase services.                 !
    ! - Verify Firebase configuration in your .env file.                      !
    ! - Check Firebase Console for project status and enabled services.       !
    ! - Ensure network connectivity to Firebase services.                     !
    ! Application functionality depending on Firebase will be broken.         !
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `);
    // Re-throw the error or handle it gracefully depending on app requirements
    // For now, provide dummy objects to prevent further crashes, but log the error.
    // Note: Firebase features will NOT work in this state.
    app = {} as FirebaseApp; // Provide a dummy object
    auth = {} as Auth;       // Provide a dummy object
    db = {} as Firestore;    // Provide a dummy object
    // throw error; // Or re-throw if the app cannot function without Firebase
}

export { app, auth, db };
