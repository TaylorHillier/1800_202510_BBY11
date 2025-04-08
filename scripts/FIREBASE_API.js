//----------------------------------------
//  Your web app's Firebase configuration
//----------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBtUCQLLLqftX62_HTdXaUjZFDHgzmEi-U",
  authDomain: "comp1800-medapp.firebaseapp.com",
  projectId: "comp1800-medapp",
  storageBucket: "comp1800-medapp.firebasestorage.app",
  messagingSenderId: "217706085613",
  appId: "1:217706085613:web:c03c9432f64531c57d60e4"
};

//--------------------------------------------
// initialize the Firebase app
// initialize Firestore database if using it
//--------------------------------------------
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function logout() {
  firebase.auth().signOut().then(() => {
      // Sign-out successful.
      console.log("logging out user");
    }).catch((error) => {
      // An error happened.
    });
}























