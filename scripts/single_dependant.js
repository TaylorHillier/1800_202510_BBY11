function getCurrentDependant() {
    const url = new URLSearchParams(window.location.search);
    const dependant = url.get('id');

    firebase.auth().onAuthStateChanged(async user => {
        if (user) {

            const dependantDoc = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').doc
            (dependant).get();
            // Reference to the Dependants collection
            
            if(dependantDoc.exists) {
                const data = dependantDoc.data();
                document.getElementById("dependant-info").innerHTML = data.firstname + " " + data.lastname;
            }
        } else {
            console.log("No user logged in");
        }
    });
}
getCurrentDependant();

function getMedicationList() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Reference to the Dependants collection
            db.collection("users").doc(user.uid).collection("Dependants").get()
                .then((dependantsSnapshot) => {
                    // Clear existing list before populating
                    const medListElement = document.getElementById("med-list");
                    medListElement.innerHTML = '';
                
                    // Iterate through each dependant
                    dependantsSnapshot.forEach((dependantDoc) => {
                        // Access the Meds subcollection for each dependant
                        console.log(dependantDoc.data());
                        dependantDoc.ref.collection("Meds").get()
                        .then((medsSnapshot) => {
                            // Iterate through medications for this dependant
                                medsSnapshot.forEach((medDoc) => {
                                    const medData = medDoc.data();
                             
                                    // Create list item with medication details
                                    const listItem = document.createElement('li');
                                    listItem.textContent = `${dependantDoc.data().Name} - ${medData.Medication.Name}: ${medData.Medication.Frequency} times a day`;
                                    
                                    // Append to the list
                                    medListElement.appendChild(listItem);
                                });
                            })
                            .catch((error) => {
                                console.error(`Error fetching medications for ${dependantDoc.id}:`, error);
                            });
                    });
                })
                .catch((error) => {
                    console.error("Error fetching dependants:", error);
                });
        } else {
            console.log("No user logged in");
        }
    });
}

function addMedication()  {

}