// Firebase Configuration using npm modules
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",
    authDomain: "unlock-the-lab-workshop.firebaseapp.com",
    databaseURL: "https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "unlock-the-lab-workshop",
    storageBucket: "unlock-the-lab-workshop.firebasestorage.app",
    messagingSenderId: "604889899913",
    appId: "1:604889899913:web:d46afe88111e8bcb7d3758",
    measurementId: "G-HSC51V3CLP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
const database = getDatabase(app);

// Initialize Analytics
const analytics = getAnalytics(app);

// Initialize Auth
const auth = getAuth(app);

// Export for use in other modules
export { app, database, analytics, auth };

// Database structure:
// /ratings/{paperId}/{sessionId} = {rating: number, timestamp: number}
// 
// Each rating is stored with:
// - paperId: identifier for the paper (e.g., "paper1", "paper2")
// - sessionId: unique identifier for each participant's session
// - rating: numerical value (1-7)
// - timestamp: when the rating was submitted
