var dependant;
var globalUserId;

let button = document.getElementById("addMedication");
if (button) {
    button.addEventListener("click", createMedicationForm); // Attach the event listener correctly
}

function getCurrentDependant() {
    const url = new URLSearchParams(window.location.search);
    dependant = url.get('id');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            globalUserId = user.uid;

            const dependantDoc = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').doc(dependant).get();

            if (dependantDoc.exists) {
                const data = dependantDoc.data();
                document.getElementById("dependant-info").innerHTML = data.firstname + " " + data.lastname;
            }
            loadNotesIssues();
        } else {
            console.log("No user logged in");
        }
    });

}
getCurrentDependant();

// Add this right after getCurrentDependant() call
document.addEventListener("DOMContentLoaded", function () {
    setupButtons();
});

// Global state variables
let removeMedMode = false;
let hasMedications = false;

// Initialize event listeners for buttons
function setupButtons() {
    let addButton = document.getElementById("addMedication");
    let removeMedButton = document.getElementById("removeMedModeBtn");

    if (addButton) {
        addButton.addEventListener("click", createMedicationForm);
    }

    if (removeMedButton) {
        removeMedButton.addEventListener("click", function () {
            // Only allow removal if medications exist
            if (hasMedications) {
                toggleRemoveMedMode();
            } else {
                console.log("No medications to remove");
            }
        });
    }
}

// Toggle medication removal mode UI state
function toggleRemoveMedMode() {
    removeMedMode = !removeMedMode;
    console.log("Remove medication mode toggled to:", removeMedMode);

    // Show/hide delete buttons based on mode
    const deleteButtons = document.querySelectorAll('.delete-medication');
    deleteButtons.forEach(button => {
        button.style.display = removeMedMode ? 'inline-block' : 'none';
    });

    // Update toggle button text
    const toggleBtn = document.getElementById('removeMedModeBtn');
    if (toggleBtn) {
        toggleBtn.textContent = removeMedMode ? 'Exit Remove Mode' : 'Remove Medications';
    }
}

// Load and display medications from Firestore
function getMedicationList() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            const dependantId = new URLSearchParams(window.location.search).get('id');

            if (!dependantId) {
                console.error("No dependant selected");
                return;
            }

            // Get medications reference for this dependant
            const medicationsRef = firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('dependants')
                .doc(dependantId)
                .collection('medications');

            // Clear existing list
            const medListElement = document.getElementById("med-list");
            medListElement.innerHTML = '';

            // Real-time listener for medication changes
            medicationsRef.orderBy('startDate', 'desc').onSnapshot((medsSnapshot) => {
                medListElement.innerHTML = '';

                // Update medication existence flag
                hasMedications = !medsSnapshot.empty;

                if (!hasMedications) {
                    medListElement.innerHTML = "<p>No medications found.</p>";

                    // Exit remove mode if active but no medications exist
                    if (removeMedMode) {
                        removeMedMode = false;
                        const toggleBtn = document.getElementById('removeMedModeBtn');
                        if (toggleBtn) {
                            toggleBtn.textContent = 'Remove Medications';
                        }
                    }
                    return;
                }

                // Generate medication list items
                medsSnapshot.forEach((medDoc) => {
                    const medData = medDoc.data();
                    const listItem = document.createElement('li');

                    // Container for med info and delete button
                    const container = document.createElement("div");
                    container.className = "medication-container";

                    // Medication details text
                    const medInfo = document.createElement("span");
                    medInfo.textContent = `${medData.name}: ${medData.numPillsPerDose} times today`;
                    medInfo.textContent += medData.continuous ? '(continuous)' : '';
                    medInfo.className = "medication-info";

                    // Delete button with conditional display
                    const removeBtn = document.createElement("button");
                    removeBtn.textContent = "×";
                    removeBtn.className = "delete-medication";
                    removeBtn.setAttribute("data-id", medDoc.id);
                    removeBtn.style.cssText = `
                        display: ${removeMedMode ? 'inline-block' : 'none'};
                        margin-left: 10px;
                        background-color: #ff4444;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 3px 8px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    `;

                    // Confirmation before deletion
                    removeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Remove ${medData.name}?`)) {
                            removeMedication(medDoc.id);
                        }
                    });

                    container.appendChild(medInfo);
                    container.appendChild(removeBtn);
                    listItem.appendChild(container);
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

// Delete medication from Firestore
function removeMedication(medicationId) {
    const user = firebase.auth().currentUser;
    const dependantId = new URLSearchParams(window.location.search).get('id');

    if (!user || !dependantId) {
        console.error("No user signed in or no dependant selected");
        return;
    }

    firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("dependants")
        .doc(dependantId)
        .collection("medications")
        .doc(medicationId)
        .delete()
        .then(() => {
            console.log("Medication removed successfully");
            // Check if any medications remain
            checkIfLastMedication();
        })
        .catch(error => {
            console.error("Error removing medication:", error);
        });
}

// Reset UI if all medications are removed
function checkIfLastMedication() {
    const user = firebase.auth().currentUser;
    const dependantId = new URLSearchParams(window.location.search).get('id');

    if (!user || !dependantId) {
        return;
    }

    firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("dependants")
        .doc(dependantId)
        .collection("medications")
        .get()
        .then(snapshot => {
            if (snapshot.empty && removeMedMode) {
                // Exit remove mode when last medication is deleted
                removeMedMode = false;
                hasMedications = false;

                const toggleBtn = document.getElementById('removeMedModeBtn');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Remove Medications';
                }
            }
        })
        .catch(error => {
            console.error("Error checking medications:", error);
        });
}
getMedicationList();

function createMedicationForm() {
    let container = document.createElement('div');
    container.className = 'medication-form';
    container.id = 'medication-form';

    let button = document.getElementById("addMedication");
    let anchor = document.getElementsByTagName('main')[0];

    // Prevent duplicate forms
    if (document.getElementById("newMedication-form")) {
        document.getElementById("newMedication-form").remove();
        return;
    }

    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addMedication");
    form.id = "newMedication-form";

    // Get today's date (YYYY-MM-DD) for min attributes
    const now = new Date().toLocaleDateString("en-CA");
    
    console.log(now);
    const today = now.split("T")[0];
    const time = new Date(Date.now()).toTimeString().slice(0,5);
    const hours = now.padStart(2, '0');
    const minutes = now.padStart(2, '0');
    

    // Start Date
    var startDateLabel = document.createElement("label");
    startDateLabel.setAttribute("for", "start-date");
    startDateLabel.textContent = "Start Date: ";

    var startDate = document.createElement("input");
    startDate.setAttribute("id", "start-date");
    startDate.setAttribute("type", "date");
    startDate.setAttribute("name", "start-date");
    startDate.setAttribute("value", today);
    startDate.setAttribute("min", today);

    // End Date
    var endDateLabel = document.createElement("label");
    endDateLabel.setAttribute("for", "end-date");
    endDateLabel.textContent = "End Date: ";

    var endDate = document.createElement("input");
    endDate.setAttribute("id", "end-date");
    endDate.setAttribute("type", "date");
    endDate.setAttribute("name", "end-date");
    endDate.setAttribute("min", today);

    // Start Time
    var startTimeLabel = document.createElement("label");
    startTimeLabel.setAttribute("for", "start-time");
    startTimeLabel.textContent = "Start Time: ";

    var startTime = document.createElement("input");
    startTime.setAttribute("id", "start-time");
    startTime.setAttribute("type", "time");
    startTime.setAttribute("name", "start-time");
    startTime.setAttribute("value", `${time}`); // now it's set correctly

    // End Time
    var endTimeLabel = document.createElement("label");
    endTimeLabel.setAttribute("for", "end-time");
    endTimeLabel.textContent = "End Time: ";

    var endTime = document.createElement("input");
    endTime.setAttribute("id", "end-time");
    endTime.setAttribute("type", "time");
    endTime.setAttribute("name", "end-time");
    endTime.setAttribute("value", "22:00"); // now it's set correctly

    // Number of Pills per Dose
    var numPillsLabel = document.createElement("label");
    numPillsLabel.setAttribute("for", "numpillsperdose");
    numPillsLabel.textContent = "Number of pills per dose: ";

    var numPills = document.createElement("input");
    numPills.setAttribute("id", "numpillsperdose");
    numPills.setAttribute("type", "number");
    numPills.setAttribute("name", "numpillsperdose");

    // Medication Name
    var medicationLabel = document.createElement("label");
    medicationLabel.setAttribute("for", "medication");
    medicationLabel.textContent = "Medication Name: ";

    var medication = document.createElement("input");
    medication.setAttribute("id", "medication");
    medication.setAttribute("type", "text");
    medication.setAttribute("name", "medication");
    medication.setAttribute("placeholder", "Medication");

    // Doses per Day (New Field)
    var dosesLabel = document.createElement("label");
    dosesLabel.setAttribute("for", "doses-per-day");
    dosesLabel.textContent = "Doses per day: ";

    var dosesPerDay = document.createElement("input");
    dosesPerDay.setAttribute("id", "doses-per-day");
    dosesPerDay.setAttribute("type", "number");
    dosesPerDay.setAttribute("name", "doses-per-day");
    dosesPerDay.setAttribute("min", "1");

    // Continuous Checkbox
    var continuousLabel = document.createElement("label");
    continuousLabel.setAttribute("for", "continuous");
    continuousLabel.textContent = "Continuous: (Will auto set 3 months)";

    var continuous = document.createElement("input");
    continuous.setAttribute("id", "continuous");
    continuous.setAttribute("type", "checkbox");
    continuous.setAttribute("name", "continuous");

    // When continuous is checked, disable end date and end time
    continuous.addEventListener("change", function () {
        if (this.checked) {
            endDate.disabled = true;
            endTime.disabled = true;
        } else {
            endDate.disabled = false;
            endTime.disabled = false;
        }
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

    form.appendChild(endTimeLabel);
    form.appendChild(endTime);
    form.appendChild(document.createElement("br"));

    form.appendChild(numPillsLabel);
    form.appendChild(numPills);
    form.appendChild(document.createElement("br"));

    form.appendChild(medicationLabel);
    form.appendChild(medication);
    form.appendChild(document.createElement("br"));

    form.appendChild(dosesLabel);
    form.appendChild(dosesPerDay);
    form.appendChild(document.createElement("br"));

    form.appendChild(continuousLabel);
    form.appendChild(continuous);
    form.appendChild(document.createElement("br"));

    form.appendChild(submit);

    container.appendChild(form);

    anchor.insertAdjacentElement("beforeend", container);
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

    // Get form values
    const startDateStr = document.getElementById("start-date").value.trim();
    console.log(startDateStr);
    const endDateStr = document.getElementById("end-date").value.trim();
    const startTimeStr = document.getElementById("start-time").value.trim();
    const endTimeStr = document.getElementById("end-time").value.trim();
    const numPillsPerDose = document.getElementById("numpillsperdose").value;
    const medicationName = document.getElementById("medication").value.trim();
    const dosesPerDayValue = document.getElementById("doses-per-day").value;
    const isContinuous = document.getElementById("continuous").checked;

    // Basic field validation
    if (!startDateStr || !startTimeStr || !medicationName || !numPillsPerDose || !dosesPerDayValue) {
        console.error("Fill in all required fields");
        return;
    }

    const dosesPerDay = parseInt(dosesPerDayValue);
    if (isNaN(dosesPerDay) || dosesPerDay <= 0) {
        console.error("Doses per day must be a positive number");
        return;
    }

    const startDateObj = new Date(startDateStr).toLocaleDateString('en-CA');
    console.log(startDateObj);
    console.log(Date(Date.now()));
    if (startDateObj < new Date(Date.now())) {
        console.error("Start date cannot be in the past");
        return;
    }

    // If not continuous, validate end date and end time
    if (!isContinuous) {
        if (!endDateStr || !endTimeStr) {
            console.error("Fill in end date and end time or select Continuous");
            return;
        }

        const endDateObj = new Date(endDateStr).toLocaleDateString('en-CA');
        if (endDateObj < startDateObj) {
            console.error("End date must be after the start date");
            return;
        }

        // If the start and end dates are the same, ensure the end time is after the start time
        if (startDateObj === endDateObj) {
            const [sHour, sMin] = startTimeStr.split(":").map(Number);
            const [eHour, eMin] = endTimeStr.split(":").map(Number);
            if (eHour < sHour || (eHour === sHour && eMin <= sMin)) {
                console.error("End time must be after start time when start and end dates are the same");
                return;
            }
        }
    }

    // Build the medication object
    const medication = {
        name: medicationName,
        startDate: startDateStr,
        endDate: isContinuous ? null : endDateStr,
        startTime: startTimeStr,
        endTime: isContinuous ? null : endTimeStr,
        numPillsPerDose: numPillsPerDose,
        dosesPerDay: dosesPerDay,
        addedBy: user.uid,
        continuous: isContinuous
    };

    // Reference to the medications collection for this dependant
    const medicationCollectionRef = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('dependants')
        .doc(dependantId)
        .collection('medications');

    medicationCollectionRef.add(medication)
        .then(docRef => {
            console.log("New medication added:", medicationName, "ID:", docRef.id);

            // Compute the schedule for the medication using the awake period rather than 24 hours.
            let scheduleArray = [];

            // For each day, the awake period is defined by the start time and end time.
            // For non-continuous mode, we use the provided end date.
            // For continuous mode, we generate a default 7-day schedule and assume awake end at 10:00 PM.
            let dayStart = new Date(startDateStr);
            let dayEnd;
            if (isContinuous) {
                dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 90); // 7 days total
            } else {
                dayEnd = new Date(endDateStr);
            }

            // Parse the start time.
            const [startHour, startMinute] = startTimeStr.split(":").map(Number);
            // For non-continuous, parse provided end time; otherwise, default to 22:00.
            let endHour, endMinute;
            if (!isContinuous) {
                [endHour, endMinute] = endTimeStr.split(":").map(Number);
            } else {
                endHour = 22;
                endMinute = 0;
            }

            // Iterate over each day in the scheduling range.
            for (let day = new Date(dayStart); day <= dayEnd; day.setDate(day.getDate() + 1)) {
                // Create the awake period for this day.
                let awakeStart = new Date(day);
                awakeStart.setHours(startHour, startMinute, 0, 0);

                let awakeEnd = new Date(day);
                awakeEnd.setHours(endHour, endMinute, 0, 0);

                // Calculate the total active minutes.
                const activeMinutes = (awakeEnd - awakeStart) / (1000 * 60);

                // If only one dose per day, schedule it at the start of the awake period.
                let intervalMinutes = 0;
                if (dosesPerDay > 1) {
                    intervalMinutes = activeMinutes / (dosesPerDay - 1);
                }

                // Schedule the doses evenly between awakeStart and awakeEnd.
                for (let doseIndex = 0; doseIndex < dosesPerDay; doseIndex++) {
                    const doseTime = new Date(awakeStart.getTime() + doseIndex * intervalMinutes * 60000);
                    scheduleArray.push({
                        doseTime: firebase.firestore.Timestamp.fromDate(doseTime),
                        medication: medicationName
                    });
                }
            }

            // Update the medication document with the computed schedule.
            return docRef.update({ schedule: scheduleArray });
        })
        .then(() => {
            console.log("Medication updated with schedule");
        })
        .catch(error => {
            console.error("Error adding medication or updating schedule:", error);
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
