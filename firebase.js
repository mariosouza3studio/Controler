// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3B3fslyj9N6SIZDP56Ycf_mSGZOzWumQ",
  authDomain: "midiaindoor-project.firebaseapp.com",
  databaseURL: "https://midiaindoor-project-default-rtdb.firebaseio.com",
  projectId: "midiaindoor-project",
  storageBucket: "midiaindoor-project.firebasestorage.app",
  messagingSenderId: "231301848479",
  appId: "1:231301848479:web:4287cbf125807dae8b31aa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);