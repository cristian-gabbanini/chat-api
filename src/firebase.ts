import firebase from "@firebase/app";

var config = {
  apiKey: "AIzaSyBNYMFw9w1W7i-93c4uz4S-aViW7QHo3Y0",
  authDomain: "chat-5f068.firebaseapp.com",
  databaseURL: "https://chat-5f068.firebaseio.com",
  projectId: "chat-5f068",
  storageBucket: "chat-5f068.appspot.com",
  messagingSenderId: "912269985835"
};

firebase.initializeApp(config);

export default firebase;
