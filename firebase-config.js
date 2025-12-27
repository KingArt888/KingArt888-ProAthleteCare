const firebaseConfig = {
  apiKey: "AIzaSyD1EP8iLSCVNZgkZKSSbMJa_4gS5VmqfKc",
  authDomain: "proathletecare-8eaba.firebaseapp.com",
  projectId: "proathletecare-8eaba",
  storageBucket: "proathletecare-8eaba.firebasestorage.app",
  messagingSenderId: "769667753086",
  appId: "1:769667753086:web:c2dde1935f80596758a42f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Безпечне підключення Storage (щоб не було TypeError)
const storage = typeof firebase.storage === "function" ? firebase.storage() : null;

console.log("✅ ProAtletCare: Firebase System Ready");
