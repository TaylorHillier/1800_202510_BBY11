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