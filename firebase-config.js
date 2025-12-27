// Конфігурація вашого проекту ProAtletCare
const firebaseConfig = {
  apiKey: "AIzaSyD1EP8iLSCVNZgkZKSSbMJa_4gS5VmqfKc",
  authDomain: "proathletecare-8eaba.firebaseapp.com",
  projectId: "proathletecare-8eaba",
  storageBucket: "proathletecare-8eaba.firebasestorage.app",
  messagingSenderId: "769667753086",
  appId: "1:769667753086:web:c2dde1935f80596758a42f",
  measurementId: "G-4SSWMDDX6N"
};

// Ініціалізація для версії SDK 8.x (яку ви використовуєте в HTML)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Створюємо глобальні змінні, щоб admin.js та інші їх бачили
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

console.log("Firebase успішно ініціалізовано для ProAtletCare");
