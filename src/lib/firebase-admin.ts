
import * as admin from 'firebase-admin';

// Ensure that GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// pointing to your service account key file.
// Example .env:
// GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
// NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id" // Still needed

let firebaseAdminApp: admin.app.App;

if (!admin.apps.length) {
  try {
    firebaseAdminApp = admin.initializeApp({
      // Credential is automatically inferred from GOOGLE_APPLICATION_CREDENTIALS
      // If not set, initializeApp() will throw an error.
      // Alternatively, provide credential explicitly:
      // credential: admin.credential.cert(serviceAccount),
       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Optional: Helps SDK find the project
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
     console.warn(`
    ****************************************************************************************
    * WARNING: Firebase Admin SDK failed to initialize.                                    *
    * This is likely because the GOOGLE_APPLICATION_CREDENTIALS environment variable       *
    * is not set or points to an invalid service account key file.                         *
    * Server-side Firebase features (like FCM) will not work.                              *
    ****************************************************************************************
    `);
    // You might want to throw the error or handle it differently depending on your needs
    // throw new Error("Failed to initialize Firebase Admin SDK");
  }
} else {
  firebaseAdminApp = admin.app();
   console.log('Using existing Firebase Admin SDK instance.');
}

const adminAuth = admin.auth;
const adminDb = admin.firestore;
const adminMessaging = admin.messaging;


export { firebaseAdminApp, adminAuth, adminDb, adminMessaging };
