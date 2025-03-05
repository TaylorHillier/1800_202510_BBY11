function getNameFromAuth() {
    firebase.auth().onAuthStateChanged(user => {
        // Check if a user is signed in:
        if (user) {
            // Do something for the currently logged-in user here: 
            console.log(user.uid); //print the uid in the browser console
            console.log(user.displayName); 
            userName = user.displayName.split(" ")[0];


            //method #1:  insert with JS
            document.getElementById("user-name").innerText = userName;    

        } else {
            // No user is signed in.
            console.log ("No user is logged in");
        }
    });
}
getNameFromAuth(); //run the function

function getMedicationList() {
    firebase.auth().onAuthStateChanged(user => {
        if(user){
            db.collection("users").doc(user.uid).collection("Meds").get().then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    console.log(doc.data());
                    document.getElementById("med-list").innerHTML = '<li>' + doc.id + ' ' + doc.data().Frequency + ' times a day</li>';
                });
            });
        } else {
            console.log ("no user");
        }
    })
}