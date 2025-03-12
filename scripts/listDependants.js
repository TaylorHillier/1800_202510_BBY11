
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