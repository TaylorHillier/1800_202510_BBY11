function getCurrentDependant() {
    const url = new URLSearchParams(window.location.search);
    const dependant = url.get('id');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            let button = document.getElementById("addMedication");
            if (button) {
                button.addEventListener("click", createMedicationForm); // Attach the event listener correctly
            }
            const dependantDoc = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').doc(dependant).get();

            if (dependantDoc.exists) {
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

function createMedicationForm() {
    let button = document.getElementById("addMedication");

    // Check if form already exists to prevent duplicates
    if (document.getElementById("newMedication-form")) {
        return;
    }

    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addMedication");
    form.id = "newMedication-form";

    // Start Date Label and Input
    var startDateLabel = document.createElement("label");
    startDateLabel.setAttribute("for", "start-date");
    startDateLabel.textContent = "Start Date: ";

    var startDate = document.createElement("input");
    startDate.setAttribute("id", "start-date");
    startDate.setAttribute("type", "date");
    startDate.setAttribute("name", "start-date");

    // End Date Label and Input
    var endDateLabel = document.createElement("label");
    endDateLabel.setAttribute("for", "end-date");
    endDateLabel.textContent = "End Date: ";

    var endDate = document.createElement("input");
    endDate.setAttribute("id", "end-date");
    endDate.setAttribute("type", "date");
    endDate.setAttribute("name", "end-date");

    // Medication Label and Input
    var medicationLabel = document.createElement("label");
    medicationLabel.setAttribute("for", "medication");
    medicationLabel.textContent = "Medication Name: ";

    var medication = document.createElement("input");
    medication.setAttribute("id", "medication");
    medication.setAttribute("type", "text");
    medication.setAttribute("name", "medication");
    medication.setAttribute("placeholder", "Medication");

    // Submit Button
    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Add");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Form submitted!");
        submitMedication();
        form.reset();
    });

    // Append elements to form
    form.appendChild(startDateLabel);
    form.appendChild(startDate);
    form.appendChild(document.createElement("br")); // Line break

    form.appendChild(endDateLabel);
    form.appendChild(endDate);
    form.appendChild(document.createElement("br")); // Line break

    form.appendChild(medicationLabel);
    form.appendChild(medication);
    form.appendChild(document.createElement("br")); // Line break

    form.appendChild(submit);

    // Insert form right below the button
    button.insertAdjacentElement("afterend", form);
}
