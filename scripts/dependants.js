var dependantQuant;
let RemoveMode = false; // Tracks if we're in "Remove Mode"

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
    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addDependant");
    form.id = "dependants-form";

    var firstname = document.createElement("input");
    firstname.setAttribute("id", "firstname");
    firstname.setAttribute("type", "text");
    firstname.setAttribute("name", "firstname");
    firstname.setAttribute("placeholder", "First Name");
    firstname.style.margin = "0 0 0 1%";

    var lastname = document.createElement("input");
    lastname.setAttribute("id", "lastname");
    lastname.setAttribute("type", "text");
    lastname.setAttribute("name", "lastname");
    lastname.setAttribute("placeholder", "Last Name");

    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Submit");

    // Prevent form from submitting (optional)
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Form submitted!");
        addDependant();
        form.reset();
    });

    // Append inputs to form
    form.appendChild(firstname);
    form.appendChild(lastname);
    form.appendChild(submit);

    if (!document.getElementById("dependants-form")) {
        document.body.appendChild(form);
    }
}


function addDependant() {

    const user = firebase.auth().currentUser;

    if (!user) {
        console.error("No user signed in");
        return;
    }

    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();

    if (!firstname || !lastname) {
        console.error("Fill in all fields");
        return;
    }

    const dependant = {
        firstname: firstname,
        lastname: lastname,
        careTaker: user.uid
    }

    const dependantsRef = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('dependants')
        .add(dependant);

    dependantsRef.then((doc) => {
        console.log("new dependant added");
        console.log(firstname + lastname);

    })
    .catch((error) => {
        console.error("Error adding dependant: ", error);
    });
}


let removeMode = false; // Tracks if we're in "Remove Mode"

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
        let removeButton = document.getElementById("toggle-remove-mode");
    
        if (addButton && !addButton.dataset.listenerAdded) {
            addButton.addEventListener("click", createForm);
            addButton.dataset.listenerAdded = "true"; // Prevent duplicate listener
        }
        
        if (removeButton && !removeButton.dataset.listenerAdded) {
            removeButton.addEventListener("click", toggleRemoveMode);
            removeButton.dataset.listenerAdded = "true"; // Prevent duplicate listener
        }
    }
    
    function toggleRemoveMode() {
        removeMode = !removeMode;
        const deleteButtons = document.querySelectorAll('.delete-dependant');
        
        deleteButtons.forEach(button => {
            button.style.display = removeMode ? 'inline-block' : 'none';
        });
    
        // Update button text
        const toggleBtn = document.getElementById('removeModeBtn');
        if (toggleBtn) {
            toggleBtn.textContent = removeMode ? 'Exit Remove Mode' : 'Remove Dependants';
        }
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
            let dependants = []; // Store unique dependants
            querySnapshot.forEach(doc => {
                const dependant = doc.data();
                dependants.push({ ...dependant, id: doc.id });
            });
    
                // Remove duplicates based on firstname + lastname
            let uniqueDependants = [];
            let seenNames = new Set();
            dependants.forEach(dep => {
                let fullName = `${dep.firstname} ${dep.lastname}`;
                if (!seenNames.has(fullName)) {
                    seenNames.add(fullName);
                    uniqueDependants.push(dep);
                }
            });
    
                // Show dependants in the list
            if (uniqueDependants.length === 0) {
                dependantsList.innerHTML = "<p>No dependants found.</p>";
                return;
            }
        
            dependantQuant = querySnapshot.length;
            console.log(dependantQuant);
            querySnapshot.forEach(doc => {
                const dependant = doc.data();
                const li = document.createElement("li");
                const removeBtn = document.createElement("button");
                removeBtn.textContent = "×";
                removeBtn.className = "delete-dependant";
                removeBtn.setAttribute("data-id", doc.id);

                removeBtn.style.cssText = `
                    display: none; /* Hidden by default */
                    margin-left: 10px;
                    background-color: #ff4444;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 3px 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
`               ;

                removeBtn.onmouseover = () => removeBtn.style.backgroundColor = "#cc0000";
                removeBtn.onmouseout = () => removeBtn.style.backgroundColor = "#ff4444";

                removeBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove ${dependant.firstname} ${dependant.lastname}?`)) {
                        removeDependant({ target: { getAttribute: () => doc.id } });
                    }
                });

                li.appendChild(removeBtn);
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
