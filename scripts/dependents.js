// Global variable to store the quantity of dependents.
var dependentQuant;

// Flag to track if "Remove Mode" is active.
let removeMode = false;

/**
 * Sets up the Firebase auth listener and binds UI buttons if a user is signed in.
 */
function getCurrentUser() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // Bind the "Add Dependent" button event if present.
      const addButton = document.getElementById("add-dependent");
      if (addButton) {
        addButton.addEventListener("click", createForm);
      }
    } else {
      console.log("No user logged in.");
    }
  });
}

/**
 * Creates and displays the "Add Dependent" form as a new section in the main element.
 */
function createForm() {
  // Create container for the form.
  const addDependentSection = document.createElement("section");
  addDependentSection.id = "add-dependent-container";
  addDependentSection.className = "add-dependent-container";

  // Create the form element.
  const form = document.createElement("form");
  form.id = "dependents-form";
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
      await addDependent();
      form.reset();
      addDependentSection.remove();
      alert("Dependent added successfully!");
    } catch (error) {
      console.error("Error adding dependent: ", error);
      alert("Error adding dependent: " + error.message);
    }
  });

  // Bind close button to remove the form.
  closeBtn.addEventListener("click", () => {
    addDependentSection.remove();
  });

  // Append the form to its container and then to the main element.
  addDependentSection.appendChild(form);
  if (!document.getElementById("add-dependent-container")) {
    document.getElementsByTagName('main')[0].appendChild(addDependentSection);
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
 * Adds a new dependent to Firestore.
 * This function reads form values from the dependent form and adds the data under:
 *   users -> userId -> dependents -> dependentId (as a single document with nested properties)
 * @returns {Promise<string>} A promise that resolves with the newly created dependent document ID.
 * @throws {Error} If the user is not authenticated.
 */
async function addDependent() {
  const user = firebase.auth().currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const form = document.getElementById("dependents-form");
  const dependentData = {
    firstName: form.firstname.value,
    lastName: form.lastname.value,
    birthdate: form.birthdate.value,
    relationship: form.relationship.value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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

  // Save dependent data in Firestore as one document with nested properties.
  const userRef = db.collection("users").doc(user.uid);
  const dependentDocRef = await userRef.collection("dependents").add(dependentData);

  return dependentDocRef.id;
}


/**
 * Initializes the dependent page by setting up event handlers and loading data.
 */
document.addEventListener("DOMContentLoaded", function () {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      setupButtons();
      loadDependents(); // Load dependents on page load.
    } else {
      console.log("No user logged in.");
    }
  });
});

/**
 * Sets up UI buttons for adding and removing dependents.
 */
function setupButtons() {
  const addButton = document.getElementById("add-dependent");
  const removeButton = document.getElementById("removeModeBtn"); // Ensure button ID matches HTML.

  if (addButton) {
    addButton.addEventListener("click", createForm);
  }
  if (removeButton) {
    removeButton.addEventListener("click", toggleRemoveMode);
  }
}

/**
 * Toggles "Remove Mode" which shows/hides dependent removal buttons.
 */
function toggleRemoveMode() {
  removeMode = !removeMode;

  // Update display of remove buttons.
  const deleteButtons = document.querySelectorAll('.delete-dependent');
  deleteButtons.forEach(button => {
    button.style.display = removeMode ? 'inline-block' : 'none';
  });

  // Update remove mode button text.
  const toggleBtn = document.getElementById('removeModeBtn');
  if (toggleBtn) {
    toggleBtn.textContent = removeMode ? 'Exit Remove Mode' : 'Remove Dependents';
  }
}

/**
 * Loads the list of dependents from Firestore and renders them.
 */
function loadDependents() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error("No user signed in");
    return;
  }

  const dependentsList = document.getElementById("dependents-list");
  dependentsList.innerHTML = ""; // Clear previous list.

  firebase.firestore()
    .collection("users")
    .doc(user.uid)
    .collection("dependents")
    .get()
    .then(querySnapshot => {
      let dependents = [];
      querySnapshot.forEach(doc => {
        const dependent = doc.data();
        dependents.push({ ...dependent, id: doc.id });
      });

      // Remove duplicates based on full name.
      let uniqueDependents = [];
      let seenNames = new Set();
      dependents.forEach(dep => {
        const fullName = `${dep.firstName} ${dep.lastName}`;
        if (!seenNames.has(fullName)) {
          seenNames.add(fullName);
          uniqueDependents.push(dep);
        }
      });

      if (uniqueDependents.length === 0) {
        dependentsList.innerHTML = "<p>No dependents found.</p>";
        return;
      }

      dependentQuant = querySnapshot.size;
      console.log("Dependents found:", dependentQuant);

      querySnapshot.forEach(doc => {
        const dependent = doc.data();
        const li = document.createElement("li");
        li.className = "dependent-item";

        // Container for the link and the remove button.
        const container = document.createElement("div");
        container.className = "dependent-container";

        // Create the name link for viewing details.
        const nameLink = document.createElement("a");
        nameLink.href = `single_dependent.html?id=${doc.id}`;
        nameLink.textContent = `${dependent.firstName} ${dependent.lastName}`;
        nameLink.className = "dependent-name";

        // Create the remove button.
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.className = "delete-dependent";
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
          if (confirm(`Remove ${dependent.firstName} ${dependent.lastName}?`)) {
            removeDependent({ target: { getAttribute: () => doc.id } });
          }
        });

        container.appendChild(nameLink);
        container.appendChild(removeBtn);
        li.appendChild(container);
        dependentsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error("Error loading dependents:", error);
    });
}

/**
 * Removes a dependent from Firestore.
 * @param {Event} event - The click event from the remove button.
 */
function removeDependent(event) {
  const user = firebase.auth().currentUser;
  const dependentId = event.target.getAttribute("data-id");
  
  if (!user) {
    console.error("No user signed in");
    return;
  }
  
  firebase.firestore()
    .collection("users")
    .doc(user.uid)
    .collection("dependents")
    .doc(dependentId)
    .delete()
    .then(() => {
      console.log("Dependent removed");
      loadDependents(); 
    })
    .catch(error => {
      console.error("Error removing dependent:", error);
    });
}

// Update welcome message with dependent quantity after authentication.
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    document.addEventListener('DOMContentLoaded', () => {
      const welcome = document.getElementById("dependents-welcome");
      const userName = user.displayName.split(" ")[0];
      welcome.innerText = "Hello " + userName + ". You have " + dependentQuant + " dependents.";
    });
  }
});


