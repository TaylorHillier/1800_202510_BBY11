var dependant;
var globalUserId;
let currentSummaryId = null; 

let button = document.getElementById("addMedication");
if (button) {
    button.addEventListener("click", createMedicationForm); // Attach the event listener correctly
}

function getCurrentDependant() {
    const url = new URLSearchParams(window.location.search);
    dependant = url.get('id');

    console.log(dependant);
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            globalUserId = user.uid;

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
            const dependantId = new URLSearchParams(window.location.search).get('id');

            if (!dependantId) {
                console.error("No dependant selected");
                return;
            }

            // Reference to the medications subcollection for the selected dependant
            const medicationsRef = firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('dependants')
                .doc(dependantId)
                .collection('medications');

            // Clear the existing list before populating
            const medListElement = document.getElementById("med-list");
            medListElement.innerHTML = '';

            // Set up a real-time listener for the medications subcollection
            medicationsRef.orderBy('startDate', 'desc').onSnapshot((medsSnapshot) => {
                // Clear the list before repopulating
                medListElement.innerHTML = '';

                // Iterate through medications and add them to the list
                medsSnapshot.forEach((medDoc) => {
                    const medData = medDoc.data();
                    const listItem = document.createElement('li');
                    listItem.textContent = `${medData.name}: ${medData.frequency} `;

                    // Append to the list
                    medListElement.appendChild(listItem);
                });
            }, (error) => {
                console.error("Error fetching medications:", error);
            });
        } else {
            console.log("No user logged in");
        }
    });
}
getMedicationList();

function createMedicationForm() {
    let button = document.getElementById("addMedication");

    // Check if form already exists to prevent duplicates
    if (document.getElementById("newMedication-form")) {
        document.getElementById("newMedication-form").remove();
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

    // End Date Label and Input
    var startTimeLabel = document.createElement("label");
    startTimeLabel.setAttribute("for", "start-time");
    startTimeLabel.textContent = "Start Time: ";

    var startTime = document.createElement("input");
    startTime.setAttribute("id", "start-time");
    startTime.setAttribute("type", "time");
    startTime.setAttribute("name", "start-time");
    // End Date Label and Input
    var startTimeLabel = document.createElement("label");
    startTimeLabel.setAttribute("for", "start-time");
    startTimeLabel.textContent = "Start Time: ";

    var startTime = document.createElement("input");
    startTime.setAttribute("id", "start-time");
    startTime.setAttribute("type", "time");
    startTime.setAttribute("name", "start-time");

    // End Date Label and Input
    var numPillsLabel = document.createElement("label");
    numPillsLabel.setAttribute("for", "num-pills");
    numPillsLabel.textContent = "Number of pills per day: ";

    var numPills = document.createElement("input");
    numPills.setAttribute("id", "num-pills");
    numPills.setAttribute("type", "number");
    numPills.setAttribute("name", "num-pills");

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
        "Every 4 Hours",
        "Every 6 Hours",
        "Every 8 Hours",
        "Every 12 Hours",
        "Daily",
        "Weekly"];

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

    form.appendChild(startTimeLabel);
    form.appendChild(startTime);
    form.appendChild(document.createElement("br"));

    form.appendChild(numPillsLabel);
    form.appendChild(numPills);
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
    const startTime = document.getElementById("start-time").value.trim();
    const numPills = document.getElementById("num-pills").value;
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
        numPills: numPills,
        startTime: startTime,
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
    const userId = globalUserId;
    const dependantId = dependant;
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
    const userId = globalUserId;
    const notesIssuesContainer = document.getElementById('view-notes-issues');
    notesIssuesContainer.innerHTML = '';

    firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependants')
        .doc(dependant)
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
function initSummary() {
    if (!globalUserId || !dependant) {
        setTimeout(initSummary, 100); 
        return;
    }

    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
        summarySection.style.display = 'block'; 
    }

    loadSummary();

    const saveBtn = document.getElementById('save-summary');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSummary);
    }
}

function loadSummary() {
    const summaryTextarea = document.getElementById('summary-text');
    if (!summaryTextarea) return;
    
    summaryTextarea.value = 'Loading summary...';
    summaryTextarea.disabled = true;

    firebase.firestore()
        .collection('users')
        .doc(globalUserId)
        .collection('dependants')
        .doc(dependant)
        .collection('summary')
        .limit(1)
        .get()
        .then(snapshot => {
            summaryTextarea.disabled = false;
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                currentSummaryId = doc.id;
                summaryTextarea.value = doc.data().content || '';
            } else {
                currentSummaryId = null;
                summaryTextarea.value = '';
            }
        })
        .catch(error => {
            console.error("Error loading summary:", error);
            summaryTextarea.value = 'Error loading summary';
            summaryTextarea.disabled = false;
        });
}

function saveSummary() {
    const summaryTextarea = document.getElementById('summary-text');
    if (!summaryTextarea) return;
    
    const summaryText = summaryTextarea.value.trim();
    if (!summaryText) {
        showFeedback('Please enter a summary before saving.', true);
        return;
    }

    const summaryRef = firebase.firestore()
        .collection('users')
        .doc(globalUserId)
        .collection('dependants')
        .doc(dependant)
        .collection('summary');

    const summaryData = {
        content: summaryText,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: globalUserId
    };

    const saveOperation = currentSummaryId 
        ? summaryRef.doc(currentSummaryId).set(summaryData)
        : summaryRef.add(summaryData);

    saveOperation
        .then((docRef) => {
            if (!currentSummaryId) currentSummaryId = docRef.id;
            showFeedback('Summary saved successfully!');
        })
        .catch(error => {
            console.error('Error saving summary:', error);
            showFeedback('Failed to save summary', true);
        });
}

function showFeedback(message, isError = false) {
    const feedback = document.getElementById('summary-feedback');
    if (!feedback) return;
    
    feedback.textContent = message;
    feedback.className = isError ? 'error' : 'success';
    feedback.style.display = 'block';
    setTimeout(() => feedback.style.display = 'none', 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    getCurrentDependant();
    
    setTimeout(initSummary, 300);
});