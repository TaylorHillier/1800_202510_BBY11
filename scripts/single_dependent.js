// ==================================================
//              GLOBAL VARIABLES & INITIAL SETUP
// ==================================================

var dependent;                 // Dependent ID from URL query parameter
var globalUserId;              // Authenticated user's UID
let editMode = false;          // Tracks if the dependent is in edit mode
let currentSummary = "";       // Placeholder (if used for summary functionality)

// Global Firebase variable to store the full dependent data
let globalDependentData = {};

// Medication UI state variables
let removeMedMode = false;     // Tracks if in medication remove mode
let hasMedications = false;    // Flag indicating whether any medications exist

// Attach "Add Medication" event listener if button exists.
let medButton = document.getElementById("addMedication");
if (medButton) {
    medButton.addEventListener("click", createMedicationForm);
}

// ==================================================
//          DEPENDANT DATA & AUTHENTICATION
// ==================================================

/**
 * Retrieves the current dependent (from URL) and fetches its data from Firestore.
 */
function getCurrentDependent() {
    const urlParams = new URLSearchParams(window.location.search);
    dependent = urlParams.get('id');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            globalUserId = user.uid;
            try {
                const dependentDoc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('dependents')
                    .doc(dependent)
                    .get();

                if (dependentDoc.exists) {
                    // Store full dependent data
                    globalDependentData = dependentDoc.data();
                    // Render read-only dependent view
                    renderDependentView(globalDependentData);
                } else {
                    console.log("No dependent found");
                }
            } catch (error) {
                console.error("Error fetching dependent data:", error);
            }
            // Load additional sections
            loadNotesIssues();
            getMedicationList();
        } else {
            console.log("No user logged in");
        }
    });
}
getCurrentDependent();

// Also set up additional button events once DOM is loaded.
document.addEventListener("DOMContentLoaded", function () {
    setupButtons();
});

// ==================================================
//             MEDICATION MANAGEMENT
// ==================================================

/**
 * Sets up event listeners for medication-related buttons.
 */
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

/**
 * Toggles the "Remove Medication" mode in the UI.
 */
function toggleRemoveMedMode() {
    removeMedMode = !removeMedMode;
    console.log("Remove medication mode toggled to:", removeMedMode);

    // Show/hide deletion buttons accordingly.
    const deleteButtons = document.querySelectorAll('.delete-medication');
    deleteButtons.forEach(button => {
        button.style.display = removeMedMode ? 'inline-block' : 'none';
    });

    // Update toggle button text.
    const toggleBtn = document.getElementById('removeMedModeBtn');
    if (toggleBtn) {
        toggleBtn.textContent = removeMedMode ? 'Exit Remove Mode' : 'Remove Medications';
    }
}

/**
 * Retrieves and renders the list of medications from Firestore.
 */
function getMedicationList() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            const dependentId = new URLSearchParams(window.location.search).get('id');
            if (!dependentId) {
                console.error("No dependent selected");
                return;
            }

            const medicationsRef = firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('dependents')
                .doc(dependentId)
                .collection('medications');

            const medListElement = document.getElementById("med-list");
            medListElement.innerHTML = '';

            // Listen in real time for medication updates.
            medicationsRef.orderBy('startDate', 'desc').onSnapshot((medsSnapshot) => {
                medListElement.innerHTML = '';
                hasMedications = !medsSnapshot.empty;

                if (!hasMedications) {
                    medListElement.innerHTML = "<p>No medications found.</p>";
                    if (removeMedMode) {
                        removeMedMode = false;
                        const toggleBtn = document.getElementById('removeMedModeBtn');
                        if (toggleBtn) {
                            toggleBtn.textContent = 'Remove Medications';
                        }
                    }
                    return;
                }

                // Loop through medications and render list items.
                medsSnapshot.forEach((medDoc) => {
                    const medData = medDoc.data();
                    const listItem = document.createElement('li');

                    // Create container for medication info and delete button.
                    const container = document.createElement("div");
                    container.className = "medication-container";

                    // Create medication info element with HTML formatting.
                    const medInfo = document.createElement("span");
                    medInfo.innerHTML = `<b>${medData.name}</b>: ${medData.numPillsPerDose} times today${medData.continuous ? ' (continuous)' : ''}`;
                    medInfo.className = "medication-info";

                    // Create the delete button.
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
                    // Confirm deletion and then call removeMedication.
                    removeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Remove ${medData.name}?`)) {
                            removeMedication(medDoc.id)
                                .then(() => {
                                    console.log('Dispatching medicationRemoved event');
                                    document.dispatchEvent(new CustomEvent("medicationRemoved"));
                                })
                                .catch(error => {
                                    console.error("Error removing medication:", error);
                                });
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

/**
 * Removes a medication and its related completed tasks from Firestore.
 * @param {string} medicationId - The ID of the medication to remove.
 * @returns {Promise} Resolves when removal is complete.
 */
function removeMedication(medicationId) {
    const user = firebase.auth().currentUser;
    const dependentId = new URLSearchParams(window.location.search).get('id');

    if (!user || !dependentId) {
        console.error("No user signed in or no dependent selected");
        return Promise.reject(new Error("Missing user or dependent"));
    }

    const medicationPromise = firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("dependents")
        .doc(dependentId)
        .collection("medications")
        .doc(medicationId)
        .delete()
        .then(() => {
            console.log("Medication removed successfully");
            checkIfLastMedication();
        })
        .catch(error => {
            console.error("Error removing medication:", error);
            return Promise.reject(error);
        });

    const completedTasksPromise = firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("dependents")
        .doc(dependentId)
        .collection("completed-tasks")
        .get()
        .then(snapshot => {
            const batch = firebase.firestore().batch();
            snapshot.forEach(doc => {
                if (doc.id.startsWith(medicationId + "-")) {
                    batch.delete(doc.ref);
                }
            });
            return batch.commit();
        })
        .then(() => {
            console.log("Related completed tasks removed successfully");
            checkIfLastMedication();
        })
        .catch(error => {
            console.error("Error removing completed tasks:", error);
            return Promise.reject(error);
        });

    return Promise.all([medicationPromise, completedTasksPromise])
        .then(() => {
            console.log("Medication and related tasks removed successfully");
        })
        .catch(error => {
            console.error("Error in removeMedication:", error);
            return Promise.reject(error);
        });
}

/**
 * Checks whether the medications collection is empty and resets removeMedMode if needed.
 */
function checkIfLastMedication() {
    const user = firebase.auth().currentUser;
    const dependentId = new URLSearchParams(window.location.search).get('id');

    if (!user || !dependentId) return;

    firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .collection("dependents")
        .doc(dependentId)
        .collection("medications")
        .get()
        .then(snapshot => {
            if (snapshot.empty && removeMedMode) {
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

// Initialize the medication list on page load.
getMedicationList();

/**
 * Creates and displays the medication form as a modal overlay.
 * Prevents duplicate forms from being created.
 */
function createMedicationForm() {
    // Prevent duplicate medication form
    if (document.getElementById('medication-form')) {
        return;
    }

    // If viewport is small, disable body scrolling.
    if (window.innerWidth < 992) {
        $(document.body).addClass("overflow-y-hidden");
    }

    const mainAnchor = document.getElementsByTagName('main')[0];
    let container = document.createElement('div');
    container.className = 'medication-form';
    container.id = 'medication-form';

    let headerContainer = document.createElement('div');
    headerContainer.className = 'med-form-header';
    headerContainer.id = 'med-form-header';

    let datesContainer = document.createElement('div');
    datesContainer.className = 'med-dates-container';
    datesContainer.id = 'med-dates-container';

    let timesContainer = document.createElement('div');
    timesContainer.className = 'med-times-container';
    timesContainer.id = 'med-times-container';

    // Create the medication form.
    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addMedication");
    form.id = "newMedication-form";

    // Get today's date for input defaults.
    const now = new Date().toLocaleDateString("en-CA");
    const today = now.split("T")[0];
    const time = new Date().toTimeString().slice(0, 5);

    // Create form fields.
    var startDateLabel = document.createElement("label");
    startDateLabel.setAttribute("for", "start-date");
    startDateLabel.textContent = "Start Date: ";
    var startDate = document.createElement("input");
    startDate.id = "start-date";
    startDate.type = "date";
    startDate.name = "start-date";
    startDate.value = today;
    startDate.min = today;

    var endDateLabel = document.createElement("label");
    endDateLabel.setAttribute("for", "end-date");
    endDateLabel.textContent = "End Date: ";
    var endDate = document.createElement("input");
    endDate.id = "end-date";
    endDate.type = "date";
    endDate.name = "end-date";
    endDate.min = today;

    var startTimeLabel = document.createElement("label");
    startTimeLabel.setAttribute("for", "start-time");
    startTimeLabel.textContent = "Start Time: ";
    var startTime = document.createElement("input");
    startTime.id = "start-time";
    startTime.type = "time";
    startTime.name = "start-time";
    startTime.value = time;

    var endTimeLabel = document.createElement("label");
    endTimeLabel.setAttribute("for", "end-time");
    endTimeLabel.textContent = "End Time: ";
    var endTime = document.createElement("input");
    endTime.id = "end-time";
    endTime.type = "time";
    endTime.name = "end-time";
    endTime.value = "22:00";

    var numPillsLabel = document.createElement("label");
    numPillsLabel.setAttribute("for", "numpillsperdose");
    numPillsLabel.textContent = "Number of pills per dose: ";
    var numPills = document.createElement("input");
    numPills.id = "numpillsperdose";
    numPills.type = "number";
    numPills.name = "numpillsperdose";

    var medicationLabel = document.createElement("label");
    medicationLabel.setAttribute("for", "medication");
    medicationLabel.textContent = "Medication Name: ";
    var medication = document.createElement("input");
    medication.id = "medication";
    medication.type = "text";
    medication.name = "medication";
    medication.placeholder = "Medication";

    var dosesLabel = document.createElement("label");
    dosesLabel.setAttribute("for", "doses-per-day");
    dosesLabel.textContent = "Doses per day: ";
    var dosesPerDay = document.createElement("input");
    dosesPerDay.id = "doses-per-day";
    dosesPerDay.type = "number";
    dosesPerDay.name = "doses-per-day";
    dosesPerDay.min = "1";

    var continuousLabel = document.createElement("label");
    continuousLabel.setAttribute("for", "continuous");
    continuousLabel.textContent = "Continuous: (Will auto set 3 months)";
    var continuous = document.createElement("input");
    continuous.id = "continuous";
    continuous.type = "checkbox";
    continuous.name = "continuous";
    continuous.addEventListener("change", function () {
        if (this.checked) {
            endDate.disabled = true;
            endTime.disabled = true;
        } else {
            endDate.disabled = false;
            endTime.disabled = false;
        }
    });

    var submit = document.createElement("input");
    submit.type = "submit";
    submit.value = "Add";
    submit.id = 'add-medication-button';

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Form submitted!");

        addMedication()
            .then(() => {
                console.log("Dispatching medicationAdded event");
                document.dispatchEvent(new CustomEvent("medicationAdded"));
                form.reset();
            })
            .catch(error => {
                console.error("Error adding medication:", error);
            });

        document.getElementById('medication-form').remove();
        $(document.body).removeClass("overflow-y-hidden");
    });

    // Exit button to close the form.
    var exitBtn = document.createElement('button');
    exitBtn.className = 'med-exit';
    exitBtn.textContent = 'x';
    exitBtn.addEventListener('click', () => {
        document.getElementById('medication-form').remove();
        $(document.body).removeClass("overflow-y-hidden");
    });

    var formTitle = document.createElement('h2');
    formTitle.className = 'med-form-header';
    formTitle.textContent = 'Add a Medication';

    headerContainer.appendChild(formTitle);
    headerContainer.appendChild(exitBtn);
    form.appendChild(headerContainer);

    datesContainer.appendChild(startDateLabel);
    datesContainer.appendChild(startDate);
    datesContainer.appendChild(endDateLabel);
    datesContainer.appendChild(endDate);
    form.appendChild(datesContainer);

    timesContainer.appendChild(startTimeLabel);
    timesContainer.appendChild(startTime);
    timesContainer.appendChild(endTimeLabel);
    timesContainer.appendChild(endTime);
    form.appendChild(timesContainer);

    form.appendChild(numPillsLabel);
    form.appendChild(numPills);
    form.appendChild(medicationLabel);
    form.appendChild(medication);
    form.appendChild(dosesLabel);
    form.appendChild(dosesPerDay);
    form.appendChild(continuousLabel);
    form.appendChild(continuous);
    form.appendChild(submit);

    container.appendChild(form);
    // Append the medication form container to the main element.
    mainAnchor.insertAdjacentElement("beforeend", container);
}

/**
 * Adds a new medication to Firestore along with its computed schedule.
 * @returns {Promise<void>} A promise that resolves when the medication is added and updated with schedule.
 */
function addMedication() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("No user signed in");
        return Promise.reject(new Error("No user signed in"));
    }
    const url = new URLSearchParams(window.location.search);
    const dependentId = url.get('id');
    if (!dependentId) {
        console.error("No dependent selected");
        return Promise.reject(new Error("No dependent selected"));
    }

    const startDateStr = document.getElementById("start-date").value.trim();
    console.log(startDateStr);
    const endDateStr = document.getElementById("end-date").value.trim();
    const startTimeStr = document.getElementById("start-time").value.trim();
    const endTimeStr = document.getElementById("end-time").value.trim();
    const numPillsPerDose = document.getElementById("numpillsperdose").value;
    const medicationName = document.getElementById("medication").value.trim();
    const dosesPerDayValue = document.getElementById("doses-per-day").value;
    const isContinuous = document.getElementById("continuous").checked;

    if (!startDateStr || !startTimeStr || !medicationName || !numPillsPerDose || !dosesPerDayValue) {
        console.error("Fill in all required fields");
        return Promise.reject(new Error("Fill in all required fields"));
    }

    const dosesPerDay = parseInt(dosesPerDayValue);
    if (isNaN(dosesPerDay) || dosesPerDay <= 0) {
        console.error("Doses per day must be a positive number");
        return Promise.reject(new Error("Doses per day must be a positive number"));
    }

    const startDateObj = new Date(startDateStr).toLocaleDateString('en-CA');
    console.log(startDateObj);
    console.log(Date(Date.now()));
    if (startDateObj < new Date(Date.now())) {
        console.error("Start date cannot be in the past");
        return Promise.reject(new Error("Start date cannot be in the past"));
    }

    if (!isContinuous) {
        if (!endDateStr || !endTimeStr) {
            console.error("Fill in end date and end time or select Continuous");
            return Promise.reject(new Error("Fill in end date and end time or select Continuous"));
        }
        const endDateObj = new Date(endDateStr).toLocaleDateString('en-CA');
        if (endDateObj < startDateObj) {
            console.error("End date must be after the start date");
            return Promise.reject(new Error("End date must be after the start date"));
        }
        if (startDateObj === endDateObj) {
            const [sHour, sMin] = startTimeStr.split(":").map(Number);
            const [eHour, eMin] = endTimeStr.split(":").map(Number);
            if (eHour < sHour || (eHour === sHour && eMin <= sMin)) {
                console.error("End time must be after start time when start and end dates are the same");
                return Promise.reject(new Error("End time must be after start time when start and end dates are the same"));
            }
        }
    }

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

    const medicationCollectionRef = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('dependents')
        .doc(dependentId)
        .collection('medications');

    return medicationCollectionRef.add(medication)
        .then(docRef => {
            console.log("New medication added:", medicationName, "ID:", docRef.id);

            let scheduleArray = [];
            let dayStart = new Date(startDateStr);
            let dayEnd;
            if (isContinuous) {
                dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 90);
            } else {
                dayEnd = new Date(endDateStr);
            }

            const [startHour, startMinute] = startTimeStr.split(":").map(Number);
            let endHour, endMinute;
            if (!isContinuous) {
                [endHour, endMinute] = endTimeStr.split(":").map(Number);
            } else {
                endHour = 22;
                endMinute = 0;
            }

            for (let day = new Date(dayStart); day <= dayEnd; day.setDate(day.getDate() + 1)) {
                let awakeStart = new Date(day);
                awakeStart.setHours(startHour, startMinute, 0, 0);
                let awakeEnd = new Date(day);
                awakeEnd.setHours(endHour, endMinute, 0, 0);
                const activeMinutes = (awakeEnd - awakeStart) / (1000 * 60);
                let intervalMinutes = 0;
                if (dosesPerDay > 1) {
                    intervalMinutes = activeMinutes / (dosesPerDay - 1);
                }
                for (let doseIndex = 0; doseIndex < dosesPerDay; doseIndex++) {
                    const doseTime = new Date(awakeStart.getTime() + doseIndex * intervalMinutes * 60000);
                    scheduleArray.push({
                        doseTime: firebase.firestore.Timestamp.fromDate(doseTime),
                        medication: medicationName
                    });
                }
            }
            return docRef.update({ schedule: scheduleArray });
        })
        .then(() => {
            console.log("Medication updated with schedule");
        })
        .catch(error => {
            console.error("Error adding medication or updating schedule:", error);
            return Promise.reject(error);
        });
}

/**
 * Saves a new note/issue for the dependent.
 */
function saveNoteIssue() {
    const userId = globalUserId;
    const dependentId = dependent;
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
        .collection('dependents')
        .doc(dependentId)
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

/**
 * Loads and renders the list of notes/issues for the current dependent.
 */
function loadNotesIssues() {
    const userId = globalUserId;
    const notesIssuesContainer = document.getElementById('view-notes-issues');
    notesIssuesContainer.innerHTML = '';
    firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependents')
        .doc(dependent)
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

// ==================================================
//             DEPENDANT EDIT & VIEW MODE
// ==================================================

/**
 * Switches to edit mode for the dependent and renders the editable form.
 */
function enterEditDependentMode() {
    renderDependentEditForm(globalDependentData);
}

/**
 * Renders the edit form for dependent details.
 * @param {Object} dependent - The dependent data object.
 */
function renderDependentEditForm(dependent) {
    // In the flattened structure, basic info is at the top level.
    const healthData = dependent.healthSummary || {};
    const medicalInfo = dependent.medicalInfo || {};
    const emergencyContacts = dependent.emergencyContacts || {};
    const additionalInfo = dependent.additionalInfo || {};
  
    const detailsContainer = document.getElementById("dependent-details");
    if (!detailsContainer) return;
  
    detailsContainer.innerHTML = `
      <form id="edit-dependent-form">
        <div class="profile-section">
          <h3>Dependent Information</h3>
          <label>First Name: <input type="text" id="edit-firstname" value="${dependent.firstName || ""}"></label><br>
          <label>Last Name: <input type="text" id="edit-lastname" value="${dependent.lastName || ""}"></label><br>
          <label>Relationship: <input type="text" id="edit-relationship" value="${dependent.relationship || ""}"></label><br>
          <label>Birthdate: <input type="date" id="edit-birthdate" value="${dependent.birthdate || ""}"></label>
        </div>
        <div class="profile-section">
          <h3>Health Summary</h3>
          <textarea id="edit-healthSummary" style="width:100%;min-height:80px;">${healthData.summary || ""}</textarea>
        </div>
        <div class="profile-section">
          <h3>Medical Information</h3>
          <label>Allergies: <input type="text" id="edit-allergies" value="${medicalInfo.allergies || ""}"></label><br>
          <label>Medications: <input type="text" id="edit-medications" value="${medicalInfo.medications || ""}"></label><br>
          <label>Health History:</label><br>
          <textarea id="edit-healthHistory" style="width:100%;min-height:80px;">${medicalInfo.healthHistory || ""}</textarea>
        </div>
        <div class="profile-section">
          <h3>Emergency Contacts</h3>
          <h4>Primary Contact</h4>
          <label>Name: <input type="text" id="edit-primaryName" value="${emergencyContacts.primary?.name || ""}"></label><br>
          <label>Phone: <input type="text" id="edit-primaryPhone" value="${emergencyContacts.primary?.phone || ""}"></label><br>
          <label>Relationship: <input type="text" id="edit-primaryRelationship" value="${emergencyContacts.primary?.relationship || ""}"></label><br>
          <h4>Secondary Contact</h4>
          <label>Name: <input type="text" id="edit-secondaryName" value="${emergencyContacts.secondary?.name || ""}"></label><br>
          <label>Phone: <input type="text" id="edit-secondaryPhone" value="${emergencyContacts.secondary?.phone || ""}"></label><br>
          <label>Relationship: <input type="text" id="edit-secondaryRelationship" value="${emergencyContacts.secondary?.relationship || ""}"></label>
        </div>
        <div class="profile-section">
          <h3>Additional Notes</h3>
          <textarea id="edit-additionalInfo" style="width:100%;min-height:80px;">${additionalInfo.notes || ""}</textarea>
        </div>
        <button type="button" id="save-dependent-edits">Save</button>
        <button type="button" id="cancel-dependent-edits">Cancel</button>
      </form>
    `;
  
    // Optionally clear the dependent-info container.
    const infoContainer = document.getElementById("dependent-info");
    if (infoContainer) {
      infoContainer.innerHTML = "";
    }
  
    // Attach events for form actions.
    document.getElementById("save-dependent-edits").addEventListener("click", saveDependentEdits);
    document.getElementById("cancel-dependent-edits").addEventListener("click", () => {
      renderDependentView(dependent);
    });
  }
  
  /**
   * Renders the read-only view of dependent details.
   * @param {Object} dependent - The dependent data object.
   */
  function renderDependentView(dependent) {
    // In the flattened structure, basic info is directly on the dependent object.
    const healthData = dependent.healthSummary || {};
    const medicalInfo = dependent.medicalInfo || {};
    const emergencyContacts = dependent.emergencyContacts || {};
    const additionalInfo = dependent.additionalInfo || {};
  
    const infoContainer = document.getElementById("dependent-info");
    if (infoContainer) {
      infoContainer.innerHTML = `
        <h2>${dependent.firstName || ""} ${dependent.lastName || ""}</h2>
        <p><strong>Relationship:</strong> ${dependent.relationship || "Not specified"}</p>
        <p><strong>Birthdate:</strong> ${dependent.birthdate || "Not specified"}</p>
      `;
    }
    const detailsContainer = document.getElementById("dependent-details");
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="profile-section">
          <h3>Health Summary</h3>
          <p>${healthData.summary || "No information provided"}</p>
        </div>
        <div class="profile-section">
          <h3>Medical Information</h3>
          <p><strong>Allergies:</strong> ${medicalInfo.allergies || "None"}</p>
          <p><strong>Medications:</strong> ${medicalInfo.medications || "None"}</p>
          <p><strong>Health History:</strong> ${medicalInfo.healthHistory || "No history provided"}</p>
        </div>
        <div class="profile-section">
          <h3>Emergency Contacts</h3>
          <div class="contact-card">
            <h4>Primary Contact</h4>
            <p>${emergencyContacts.primary?.name || "Not specified"}</p>
            <p>${emergencyContacts.primary?.phone || ""}</p>
            <p>${emergencyContacts.primary?.relationship || ""}</p>
          </div>
          <div class="contact-card">
            <h4>Secondary Contact</h4>
            <p>${emergencyContacts.secondary?.name || "Not specified"}</p>
            <p>${emergencyContacts.secondary?.phone || ""}</p>
            <p>${emergencyContacts.secondary?.relationship || ""}</p>
          </div>
        </div>
        <div class="profile-section">
          <h3>Additional Notes</h3>
          <p>${additionalInfo.notes || "No additional notes"}</p>
        </div>
        <button id="edit-dependent">Edit Dependent</button>
      `;
  
      // Attach event to the "Edit Dependent" button.
      const editButton = document.getElementById("edit-dependent");
      if (editButton) {
        editButton.addEventListener("click", () => renderDependentEditForm(dependent));
      }
    }
  }
  
  

/**
 * Saves the edited dependent data to Firestore and refreshes the view.
 */
function saveDependentEdits() {
    const updatedData = {
        firstName: document.getElementById("edit-firstname").value.trim(),
        lastName: document.getElementById("edit-lastname").value.trim(),
        relationship: document.getElementById("edit-relationship").value.trim(),
        birthdate: document.getElementById("edit-birthdate").value,
        healthSummary: document.getElementById("edit-healthSummary").value.trim(),
        medicalInfo: {
            allergies: document.getElementById("edit-allergies").value.trim(),
            medications: document.getElementById("edit-medications").value.trim(),
            healthHistory: document.getElementById("edit-healthHistory").value.trim()
        },
        emergencyContacts: {
            primary: {
                name: document.getElementById("edit-primaryName").value.trim(),
                phone: document.getElementById("edit-primaryPhone").value.trim(),
                relationship: document.getElementById("edit-primaryRelationship").value.trim()
            },
            secondary: {
                name: document.getElementById("edit-secondaryName").value.trim(),
                phone: document.getElementById("edit-secondaryPhone").value.trim(),
                relationship: document.getElementById("edit-secondaryRelationship").value.trim()
            }
        },
        additionalInfo: document.getElementById("edit-additionalInfo").value.trim()
    };

    firebase.firestore()
        .collection("users")
        .doc(globalUserId)
        .collection("dependents")
        .doc(dependent)
        .update(updatedData)
        .then(() => {
            console.log("Dependent data updated successfully");
            // Update global dependent data.
            globalDependentData = { ...globalDependentData, ...updatedData };
            renderDependentView(globalDependentData);
        })
        .catch(error => {
            console.error("Error updating dependent data:", error);
        });
}

/**
 * Sets up a toggle listener on the "View Details" button to slide the details view in/out.
 */
function setupViewDetailsButton() {
    const viewDetailsButton = document.getElementById("view-details");
    if (!viewDetailsButton) return;
    
    viewDetailsButton.addEventListener("click", function () {
        renderDependentView(globalDependentData);
        const $dependentDiv = $(document.getElementById("dependent-details"));
        const $viewDetailsBtn = $(viewDetailsButton);

        if ($dependentDiv.hasClass("open")) {
            $dependentDiv.slideUp(500, function () {
                $dependentDiv.removeClass("open");
            });
            $viewDetailsBtn.text('View Details');
        } else {
            $dependentDiv.hide().slideDown(500, function () {
                $dependentDiv.addClass("open");
            });
            $viewDetailsBtn.text('Close Details');
        }
    });
}

// Attach view details button event after DOM is loaded.
document.addEventListener("DOMContentLoaded", function () {
    setupViewDetailsButton();
});

/**
 * Retrieves the dependent ID from the URL.
 * @returns {string|null} Dependent ID, or null if not present.
 */
function getDependentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}
