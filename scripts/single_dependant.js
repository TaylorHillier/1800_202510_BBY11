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

    // Frequency Label and Select Dropdown
    var frequencyLabel = document.createElement("label");
    frequencyLabel.setAttribute("for", "frequency");
    frequencyLabel.textContent = "Frequency: ";

    var frequency = document.createElement("select");
    frequency.setAttribute("id", "frequency");
    frequency.setAttribute("name", "frequency");

    // Frequency Options
    var options = [
        "Twice Daily",
        "Daily",
        "Weekly",
        "Once a Lifetime"];
    options.forEach(optionText => {
        var option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        frequency.appendChild(option);
    });

    // Submit Button
    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Add");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Form submitted!");
        addMedication();
        form.reset();
    });

    // Append elements to form
    form.appendChild(startDateLabel);
    form.appendChild(startDate);
    form.appendChild(document.createElement("br"));

    form.appendChild(endDateLabel);
    form.appendChild(endDate);
    form.appendChild(document.createElement("br"));

    form.appendChild(medicationLabel);
    form.appendChild(medication);
    form.appendChild(document.createElement("br"));

    form.appendChild(frequencyLabel);
    form.appendChild(frequency);
    form.appendChild(document.createElement("br"));

    form.appendChild(submit);

    button.insertAdjacentElement("afterend", form);
}

function addMedication() {
    const user = firebase.auth().currentUser;

    if (!user) {
        console.error("No user signed in");
        return;
    }

    const url = new URLSearchParams(window.location.search);
    const dependantId = url.get('id');

    if (!dependantId) {
        console.error("No dependant selected");
        return;
    }

    const startDate = document.getElementById("start-date").value.trim();
    const endDate = document.getElementById("end-date").value.trim();
    const medicationName = document.getElementById("medication").value.trim();
    const frequency = document.getElementById("frequency").value;

    if (!startDate || !endDate || !medicationName || !frequency) {
        console.error("Fill in all fields");
        return;
    }
    const medication = {
        name: medicationName,
        startDate: startDate,
        endDate: endDate,
        frequency: frequency,
        addedBy: user.uid
    };

    const medicationRef = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('dependants')
        .doc(dependantId)
        .collection('medications')
        .add(medication);

    medicationRef.then(() => {
        console.log("New medication added:", medicationName);
    })
        .catch((error) => {
            console.error("Error adding medication:", error);
        });

    }
    
    function saveNoteIssue() {
        const userId = firebase.auth().currentUser.uid;
        const dependantId = getDependantIdFromUrl();
        const newNoteIssue = document.getElementById('new-note-issue').value;
    
        if (newNoteIssue.trim() === '') {
            alert('Please enter a note or issue.');
            return;
        }
    
        const newEntry = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            content: newNoteIssue
        };
    
        firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .doc(dependantId)
            .collection('notes-issues')
            .add(newEntry)
            .then(() => {
                document.getElementById('new-note-issue').value = '';
                loadNotesIssues();
            })
            .catch(error => {
                console.error('Error saving note/issue: ', error);
            });
    }
    
    function loadNotesIssues() {
        const userId = firebase.auth().currentUser.uid;
        const dependantId = getDependantIdFromUrl();
        const notesIssuesContainer = document.getElementById('view-notes-issues');
        notesIssuesContainer.innerHTML = '';
    
        firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .doc(dependantId)
            .collection('notes-issues')
            .orderBy('timestamp', 'desc')
            .get()
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    notesIssuesContainer.textContent = 'No notes or issues yet.';
                    return;
                }
    
                querySnapshot.forEach(doc => {
                    const entry = doc.data();
                    const timestamp = entry.timestamp.toDate().toLocaleString();
    
                    const noteIssueElement = document.createElement('p');
                    noteIssueElement.textContent = `${timestamp}: ${entry.content}`;
                    notesIssuesContainer.appendChild(noteIssueElement);
                });
            })
            .catch(error => {
                console.error('Error loading notes/issues: ', error);
            });
    }
    function getDependantIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }    