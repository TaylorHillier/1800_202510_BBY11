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
    var addDependantSeciton = document.createElement("section");
    addDependantSeciton.id = "add-dependant-container";
    addDependantSeciton.className = "add-dependant-container";

    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addDependant");
    form.id = "dependants-form";


    var firstnameLabel = document.createElement("label");
    firstnameLabel.setAttribute("for", "firstname");
    firstnameLabel.textContent = "First Name";

    var lastnameLabel = document.createElement("label");
    lastnameLabel.setAttribute("for", "lastname");
    lastnameLabel.textContent = "Last Name";

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
    form.appendChild(firstnameLabel);
    form.appendChild(firstname);
    form.appendChild(lastnameLabel);
    form.appendChild(lastname);
    form.appendChild(submit);

    addDependantSeciton.appendChild(form);
    if (!document.getElementById("dependants-form")) {
        document.getElementsByTagName('main')[0].appendChild(addDependantSeciton);
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
