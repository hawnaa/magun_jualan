// Firebase Configuration - Project "magunjualan"
const firebaseConfig = {
    apiKey: "AIzaSyCDVimVxptKTvHBnPHbQWLOb3Z4eKk3BOM",
    authDomain: "magunjualan.firebaseapp.com",
    projectId: "magunjualan",
    storageBucket: "magunjualan.firebasestorage.app",
    messagingSenderId: "612478841330",
    appId: "1:612478841330:web:248625440b3505b5333b6b",
    measurementId: "G-C0X51CPHHG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: "dembt1ct5",
    uploadPreset: "magunjualan_products"
};

// Log untuk testing
console.log("Firebase initialized successfully!");
console.log("Auth:", auth);
console.log("Firestore:", db);
console.log("Cloudinary config:", cloudinaryConfig);