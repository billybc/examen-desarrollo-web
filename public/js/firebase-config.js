const firebaseConfig = {
  apiKey: "AIzaSyB59QCkfaz4X6dXbhJ3bMTG6bOzL5nnTIo",
  authDomain: "copart-billy.firebaseapp.com",
  projectId: "copart-billy",
  storageBucket: "copart-billy.firebasestorage.app",
  messagingSenderId: "488945544919",
  appId: "1:488945544919:web:8a619db8d462cecd32ca92"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();