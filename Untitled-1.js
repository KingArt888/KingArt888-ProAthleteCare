// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1EP8iLSCVNZgkZKSSbMJa_4gS5VmqfKc",
  authDomain: "proathletecare-8eaba.firebaseapp.com",
  projectId: "proathletecare-8eaba",
  storageBucket: "proathletecare-8eaba.firebasestorage.app",
  messagingSenderId: "769667753086",
  appId: "1:769667753086:web:9137a954e12fa35e58a42f",
  measurementId: "G-YMCM4H414R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);