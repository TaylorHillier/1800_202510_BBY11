// Global variable to store the quantity of dependants.
var dependantQuant;

// Flag to track if "Remove Mode" is active.
let removeMode = false;

/**
 * Sets up the Firebase auth listener and binds UI buttons if a user is signed in.
 */
function getCurrentUser() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // Bind the "Add Dependant" button event if present.
      const addButton = document.getElementById("add-dependant");
      if (addButton) {
        addButton.addEventListener("click", createForm);
      }
    } else {
      console.log("No user logged in.");
    }
  });
}

/**
 * Creates and displays the "Add Dependant" form as a new section in the main element.
 */
function createForm() {
  // Create container for the form.
  const addDependantSection = document.createElement("section");
  addDependantSection.id = "add-dependant-container";
  addDependantSection.className = "add-dependant-container";

  // Create the form element.
  const form = document.createElement("form");
  form.id = "dependants-form";
  form.className = "dependent-form";

  // Create header for the form with title and close button.
  const header = document.createElement("div");
  header.id = "add-dependent-header";
  header.className = "add-dependent-header";

  // Create close button.
  const closeBtn = document.createElement("div");
  closeBtn.id = "close-form";
  closeBtn.className = "close-btn";
  closeBtn.textContent = "X";

  // Create form title.
  const title = document.createElement("h2");
  title.textContent = "Add New Dependent";

  // Append title and close button to header.
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Append header to form.
  form.appendChild(header);

  // Create the different form sections.
  createFormSection(form, "Basic Information", [
    { type: "text", id: "firstname", label: "First Name", required: true },
    { type: "text", id: "lastname", label: "Last Name", required: true },
    { type: "date", id: "birthdate", label: "Birthdate", required: true },
    { type: "select", id: "relationship", label: "Relationship", options: ["Child", "Spouse", "Parent", "Sibling", "Other"] }
  ]);

  createFormSection(form, "Health Summary", [
    { type: "textarea", id: "health_summary", label: "Health Summary", rows: 4 }
  ]);

  createFormSection(form, "Medical Information", [
    { type: "textarea", id: "allergies", label: "Allergies", rows: 3 },
    { type: "textarea", id: "medications", label: "Current Medications", rows: 3 },
    { type: "textarea", id: "health_history", label: "Health History", rows: 4 }
  ]);

  createFormSection(form, "Emergency Contacts", [
    { type: "text", id: "emergency_name1", label: "Primary Contact Name" },
    { type: "tel", id: "emergency_phone1", label: "Primary Contact Phone" },
    { type: "text", id: "emergency_relation1", label: "Primary Contact Relationship" },
    { type: "text", id: "emergency_name2", label: "Secondary Contact Name" },
    { type: "tel", id: "emergency_phone2", label: "Secondary Contact Phone" },
    { type: "text", id: "emergency_relation2", label: "Secondary Contact Relationship" }
  ]);

  createFormSection(form, "Additional Information", [
    { type: "textarea", id: "additional_notes", label: "Additional Notes", rows: 4 }
  ]);

  // Create actions container with submit button.
  const submitDiv = document.createElement("div");
  submitDiv.className = "form-actions";
  const submitButton = document.createElement("button");
  submitButton.setAttribute("type", "submit");
  submitButton.textContent = "Save Dependent";
  submitDiv.appendChild(submitButton);
  form.appendChild(submitDiv);

  // Set up form submission event.
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await addDependant();
      form.reset();
      addDependantSection.remove();
      alert("Dependent added successfully!");
    } catch (error) {
      console.error("Error adding dependent: ", error);
      alert("Error adding dependent: " + error.message);
    }
  });

  // Bind close button to remove the form.
  closeBtn.addEventListener("click", () => {
    addDependantSection.remove();
  });

  // Append the form to its container and then to the main element.
  addDependantSection.appendChild(form);
  if (!document.getElementById("add-dependant-container")) {
    document.getElementsByTagName('main')[0].appendChild(addDependantSection);
  }
}

/**
 * Helper function to create a section of the form.
 * @param {HTMLFormElement} form - The form element to append fields to.
 * @param {string} sectionTitle - The title for the form section.
 * @param {Array<Object>} fields - Array of field descriptors. Each descriptor should contain:
 *    type (text, textarea, select, etc.), id, label, and optional properties like required, rows, and options.
 */
function createFormSection(form, sectionTitle, fields) {
  const section = document.createElement("div");
  section.className = "form-section";

  const title = document.createElement("h3");
  title.textContent = sectionTitle;
  section.appendChild(title);

  fields.forEach(field => {
    const label = document.createElement("label");
    label.setAttribute("for", field.id);
    label.textContent = field.label;
    
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = field.rows || 3;
    } else if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option.toLowerCase();
        opt.textContent = option;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type;
    }
    input.id = field.id;
    input.name = field.id;
    if (field.required) input.required = true;
    if (field.placeholder) input.placeholder = field.placeholder;

    section.appendChild(label);
    section.appendChild(input);
  });

  form.appendChild(section);
}

/**
 * Adds a new dependant to Firestore.
 * This function reads form values from the dependant form and adds the data under:
 *   users -> userId -> dependants -> dependantId -> subcollections.
 * @returns {Promise<string>} A promise that resolves with the newly created dependant document ID.
 * @throws {Error} If the user is not authenticated.
 */
async function addDependant() {
  const user = firebase.auth().currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const form = document.getElementById("dependants-form");
  const dependentData = {
    basicInfo: {
      firstName: form.firstname.value,
      lastName: form.lastname.value,
      birthdate: form.birthdate.value,
      relationship: form.relationship.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    healthSummary: {
      summary: form.health_summary.value
    },
    medicalInfo: {
      allergies: form.allergies.value,
      medications: form.medications.value,
      healthHistory: form.health_history.value
    },
    emergencyContacts: {
      primary: {
        name: form.emergency_name1.value,
        phone: form.emergency_phone1.value,
        relationship: form.emergency_relation1.value
      },
      secondary: {
        name: form.emergency_name2.value,
        phone: form.emergency_phone2.value,
        relationship: form.emergency_relation2.value
      }
    },
    additionalInfo: {
      notes: form.additional_notes.value
    }
  };

  // Save dependant data in Firestore.
  const userRef = db.collection("users").doc(user.uid);
  const dependantDocRef = await userRef.collection("dependants").add(dependentData.basicInfo);

  // Add subcollections.
  await dependantDocRef.collection("healthSummary").add(dependentData.healthSummary);
  await dependantDocRef.collection("medicalInfo").add(dependentData.medicalInfo);
  await dependantDocRef.collection("emergencyContacts").add(dependentData.emergencyContacts);
  await dependantDocRef.collection("additionalInfo").add(dependentData.additionalInfo);

  return dependantDocRef.id;
}

/**
 * Initializes the dependant page by setting up event handlers and loading data.
 */
document.addEventListener("DOMContentLoaded", function () {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      setupButtons();
      loadDependants(); // Load dependants on page load.
    } else {
      console.log("No user logged in.");
    }
  });
});

/**
 * Sets up UI buttons for adding and removing dependants.
 */
function setupButtons() {
  const addButton = document.getElementById("add-dependant");
  const removeButton = document.getElementById("removeModeBtn"); // Ensure button ID matches HTML.

  if (addButton) {
    addButton.addEventListener("click", createForm);
  }
  if (removeButton) {
    removeButton.addEventListener("click", toggleRemoveMode);
  }
}

/**
 * Toggles "Remove Mode" which shows/hides dependant removal buttons.
 */
function toggleRemoveMode() {
  removeMode = !removeMode;

  // Update display of remove buttons.
  const deleteButtons = document.querySelectorAll('.delete-dependant');
  deleteButtons.forEach(button => {
    button.style.display = removeMode ? 'inline-block' : 'none';
  });

  // Update remove mode button text.
  const toggleBtn = document.getElementById('removeModeBtn');
  if (toggleBtn) {
    toggleBtn.textContent = removeMode ? 'Exit Remove Mode' : 'Remove Dependants';
  }
}

/**
 * Loads the list of dependants from Firestore and renders them.
 */
function loadDependants() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error("No user signed in");
    return;
  }

  const dependantsList = document.getElementById("dependants-list");
  dependantsList.innerHTML = ""; // Clear previous list.

  firebase.firestore()
    .collection("users")
    .doc(user.uid)
    .collection("dependants")
    .get()
    .then(querySnapshot => {
      let dependants = [];
      querySnapshot.forEach(doc => {
        const dependant = doc.data();
        dependants.push({ ...dependant, id: doc.id });
      });

      // Remove duplicates based on full name.
      let uniqueDependants = [];
      let seenNames = new Set();
      dependants.forEach(dep => {
        const fullName = `${dep.firstName} ${dep.lastName}`;
        if (!seenNames.has(fullName)) {
          seenNames.add(fullName);
          uniqueDependants.push(dep);
        }
      });

      if (uniqueDependants.length === 0) {
        dependantsList.innerHTML = "<p>No dependants found.</p>";
        return;
      }

      dependantQuant = querySnapshot.size;
      console.log("Dependants found:", dependantQuant);

      querySnapshot.forEach(doc => {
        const dependant = doc.data();
        const li = document.createElement("li");
        li.className = "dependant-item";

        // Container for the link and the remove button.
        const container = document.createElement("div");
        container.className = "dependant-container";

        // Create the name link for viewing details.
        const nameLink = document.createElement("a");
        nameLink.href = `single_dependant.html?id=${doc.id}`;
        nameLink.textContent = `${dependant.firstName} ${dependant.lastName}`;
        nameLink.className = "dependant-name";

        // Create the remove button.
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.className = "delete-dependant";
        removeBtn.setAttribute("data-id", doc.id);
        removeBtn.style.cssText = `
          display: ${removeMode ? 'inline-block' : 'none'};
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

        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Remove ${dependant.firstName} ${dependant.lastName}?`)) {
            removeDependant({ target: { getAttribute: () => doc.id } });
          }
        });

        container.appendChild(nameLink);
        container.appendChild(removeBtn);
        li.appendChild(container);
        dependantsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error("Error loading dependants:", error);
    });
}

/**
 * Removes a dependant from Firestore.
 * @param {Event} event - The click event from the remove button.
 */
function removeDependant(event) {
  const user = firebase.auth().currentUser;
  const dependantId = event.target.getAttribute("data-id");
  
  if (!user) {
    console.error("No user signed in");
    return;
  }
  
  firebase.firestore()
    .collection("users")
    .doc(user.uid)
    .collection("dependants")
    .doc(dependantId)
    .delete()
    .then(() => {
      console.log("Dependant removed");
      loadDependants(); 
    })
    .catch(error => {
      console.error("Error removing dependant:", error);
    });
}

// Update welcome message with dependant quantity after authentication.
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    document.addEventListener('DOMContentLoaded', () => {
      const welcome = document.getElementById("dependants-welcome");
      const userName = user.displayName.split(" ")[0];
      welcome.innerText = "Hello " + userName + ". You have " + dependantQuant + " dependants.";
    });
  }
});


