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

function listDependants() {
    firebase.auth().onAuthStateChanged(async user =>{
        if(!user) {
            console.log("Must be logged in!");
            return;
        }
    
        const snapshot = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').get();
    
        snapshot.docs.map(doc => {
            var listItem = document.createElement('li');
            var link = document.createElement('a');
            listItem.className = "dependant";

            var firstname = doc.data().firstname;
            var lastname = doc.data().lastname;

            link.innerHTML = firstname + " " + lastname;
            link.href = `single_dependant.html?id=${doc.id}`;
            listItem.appendChild(link);
            document.getElementById("dependants-list").appendChild(listItem);
        });
    
    })
}
listDependants();