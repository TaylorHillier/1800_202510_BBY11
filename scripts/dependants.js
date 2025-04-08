var dependantQuant;
let removeMode = false; // Tracks if we're in "Remove Mode"

function getCurrentUser() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {

            let button = document.getElementById("add-dependant");
            if (button) {
                button.addEventListener("click", createForm);
            }
        } else {
            console.log("No user logged in.");
        }
    });
}

function createForm() {
    // Create container
    var addDependantSection = document.createElement("section");
    addDependantSection.id = "add-dependant-container";
    addDependantSection.className = "add-dependant-container";

    // Create form
    var form = document.createElement("form");
    form.id = "dependants-form";
    form.className = "dependent-form";

    var header = document.createElement("div");
    header.id = 'add-dependent-header';
    header.className = "add-dependent-header";

    // Close button
    var close = document.createElement("div");
    close.id = "close-form";
    close.className = "close-btn";
    close.textContent = "X";

        // Form title
        var title = document.createElement("h2");
        title.textContent = "Add New Dependent";

    header.appendChild(title);
    header.appendChild(close);

    form.appendChild(header);

    // Create form sections
    createFormSection(form, "Basic Information", [
        { type: "text", id: "firstname", label: "First Name", required: true },
        { type: "text", id: "lastname", label: "Last Name", required: true },
        { type: "date", id: "birthdate", label: "Birthdate", required: true },
        { 
            type: "select", 
            id: "relationship", 
            label: "Relationship", 
            options: ["Child", "Spouse", "Parent", "Sibling", "Other"] 
        }
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

    // Submit button
    var submitDiv = document.createElement("div");
    submitDiv.className = "form-actions";
    var submit = document.createElement("button");
    submit.setAttribute("type", "submit");
    submit.textContent = "Save Dependent";
    submitDiv.appendChild(submit);
    form.appendChild(submitDiv);

    // Form submission
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        try {
            await addDependant();
            form.reset();
            addDependantSection.remove();
            // Optional: Show success message
            alert("Dependent added successfully!");
        } catch (error) {
            console.error("Error adding dependent: ", error);
            alert("Error adding dependent: " + error.message);
        }
    });

    // Close button event
    close.addEventListener("click", () => {
        addDependantSection.remove();
    });

    // Append form to container
    addDependantSection.appendChild(form);
    
    // Add to DOM if not already present
    if (!document.getElementById("add-dependant-container")) {
        document.getElementsByTagName('main')[0].appendChild(addDependantSection);
    }
}

// Helper function to create form sections
function createFormSection(form, sectionTitle, fields) {
    var section = document.createElement("div");
    section.className = "form-section";

    var title = document.createElement("h3");
    title.textContent = sectionTitle;
    section.appendChild(title);

    fields.forEach(field => {
        // Create label
        var label = document.createElement("label");
        label.setAttribute("for", field.id);
        label.textContent = field.label;
        
        // Create input
        var input;
        if (field.type === "textarea") {
            input = document.createElement("textarea");
            input.rows = field.rows || 3;
        } else if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(option => {
                var opt = document.createElement("option");
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
        
        // Append to section
        section.appendChild(label);
        section.appendChild(input);
    });

    form.appendChild(section);
}

// Firebase function to add dependent
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

    // Add to Firestore with the structure: users -> userId -> dependants -> dependantId -> collections
    const userRef = db.collection("users").doc(user.uid);
    const dependentRef = await userRef.collection("dependants").add(dependentData.basicInfo);
    
    // Add subcollections
    await dependentRef.collection("healthSummary").add(dependentData.healthSummary);
    await dependentRef.collection("medicalInfo").add(dependentData.medicalInfo);
    await dependentRef.collection("emergencyContacts").add(dependentData.emergencyContacts);
    await dependentRef.collection("additionalInfo").add(dependentData.additionalInfo);

    return dependentRef.id;
}


async function addDependant() {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error("User not authenticated");
    }

    const form = document.getElementById("dependants-form");
    const dependentData = {
        firstname: form.firstname.value,
        lastname: form.lastname.value,
        birthdate: form.birthdate.value,
        relationship: form.relationship.value,
        healthSummary: form.health_summary.value,
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
        additionalInfo: form.additional_notes.value,
        careTaker: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .add(dependentData);
        
        console.log("Dependent added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding dependent: ", error);
        throw error;
    }
}


document.addEventListener("DOMContentLoaded", function () {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                setupButtons();
                loadDependants(); // Load dependants once on page load
            } else {
                console.log("No user logged in.");
            }
        });
    });
    
    function setupButtons() {
        let addButton = document.getElementById("add-dependant");
        let removeButton = document.getElementById("removeModeBtn"); // Changed to match HTML
        
        if (addButton ) {
            addButton.addEventListener("click", createForm);
            
        }
        
        if (removeButton) {
            removeButton.addEventListener("click", toggleRemoveMode);
           
        }
    }
    
    function toggleRemoveMode() {
        removeMode = !removeMode;
        
        // Update UI immediately
        const deleteButtons = document.querySelectorAll('.delete-dependant');
        deleteButtons.forEach(button => {
            button.style.display = removeMode ? 'inline-block' : 'none';
        });
    
        // Update button text
        const toggleBtn = document.getElementById('removeModeBtn');
        if (toggleBtn) {
            toggleBtn.textContent = removeMode ? 'Exit Remove Mode' : 'Remove Dependants';
        }
        
        // Remove this line completely:
        // listDependants();
    }
    
    function loadDependants() {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error("No user signed in");
            return;
        }
        
        const dependantsList = document.getElementById("dependants-list");
        dependantsList.innerHTML = ""; // Clear the list before loading
        
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
    
                // Remove duplicates
                let uniqueDependants = [];
                let seenNames = new Set();
                dependants.forEach(dep => {
                    let fullName = `${dep.firstname} ${dep.lastname}`;
                    if (!seenNames.has(fullName)) {
                        seenNames.add(fullName);
                        uniqueDependants.push(dep);
                    }
                });
    
                if (uniqueDependants.length === 0) {
                    dependantsList.innerHTML = "<p>No dependants found.</p>";
                    return;
                }
            
                dependantQuant = querySnapshot.length;
                console.log(dependantQuant);
                
                querySnapshot.forEach(doc => {
                    const dependant = doc.data();
                    const li = document.createElement("li");
                    li.className = "dependant-item";
                    
                    // Create container for link and button
                    const container = document.createElement("div");
                    container.className = "dependant-container";
                    
                    // Create clickable name link
                    const nameLink = document.createElement("a");
                    nameLink.href = `single_dependant.html?id=${doc.id}`;
                    nameLink.textContent = `${dependant.firstname} ${dependant.lastname}`;
                    nameLink.className = "dependant-name";
    
                    // Create remove button
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
                        if (confirm(`Remove ${dependant.firstname} ${dependant.lastname}?`)) {
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
                console.error("Error loading dependants: ", error);
            });
    }
    


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
            console.error("Error removing dependant: ", error);
        });
}
        
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.addEventListener('DOMContentLoaded', () => {
            var welcome = document.getElementById("dependants-welcome");
            const userName = user.displayName.split(" ")[0];

            welcome.innerText = "Hello " + userName + ". You have " + dependantQuant + " dependants.";
        });
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const dependentId = urlParams.get('id');
    
    if (dependentId) {
        displayDependentDetails(dependentId);
    } else {
        console.log("No dependent ID provided");
    }
});