import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmOf-jonwIc0O4hesx1Ajaw451cWBO00s",
  authDomain: "smart-cloud-reminder.firebaseapp.com",
  projectId: "smart-cloud-reminder",
  storageBucket: "smart-cloud-reminder.firebasestorage.app",
  messagingSenderId: "296580187579",
  appId: "1:296580187579:web:0c358d69a41991a99c709e",
  measurementId: "G-4G7GCJ59LP"
};

export const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);