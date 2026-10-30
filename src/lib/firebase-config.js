/**
 * Public Firebase web configuration. These values identify the project; they
 * are not secrets (access is controlled by database.rules.json). Forks can
 * point the app at their own project with VITE_FIREBASE_* variables in a
 * .env.local file.
 */

/** @type {import('firebase/app').FirebaseOptions} */
export const firebaseConfig = Object.freeze({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4',
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'unlock-the-lab-workshop.firebaseapp.com',
    databaseURL:
        import.meta.env.VITE_FIREBASE_DATABASE_URL ||
        'https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unlock-the-lab-workshop',
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        'unlock-the-lab-workshop.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '604889899913',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:604889899913:web:d46afe88111e8bcb7d3758',
});
