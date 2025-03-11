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
getCurrentUser();

function createForm() {
    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.setAttribute("action", "addDependant");
    form.id = "dependants-form"

    var firstname = document.createElement("input");
    firstname.setAttribute("id", "firstname");
    firstname.setAttribute("type", "text");
    firstname.setAttribute("name", "firstname");
    firstname.setAttribute("placeholder", "First Name");

    var lastname = document.createElement("input");
    lastname.setAttribute("id", "lastname");
    lastname.setAttribute("type", "text");
    lastname.setAttribute("name", "lastname");
    lastname.setAttribute("placeholder", "Last Name");

    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Submit");

    // Prevent form from submitting (optional)
    form.addEventListener("submit", function(event) {
        event.preventDefault();
        console.log("Form submitted!");
        addDependant();
        form.reset();
    });

    // Append inputs to form
    form.appendChild(firstname);
    form.appendChild(lastname);
    form.appendChild(submit);

    if(!document.getElementById("dependants-form")){
        document.body.appendChild(form);
    }
}

function addDependant() {

    const user = firebase.auth().currentUser;

    if(!user) {
        console.error("No user signed in");
        return;
    }

    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();

    if(!firstname || !lastname) {
        console.error("Fill in all fields");
        return;
    }

    const dependant = {
        firstname: firstname,
        lastname: lastname,
        careTaker: user.uid
    }

    const dependantsRef = firebase.firestore().collection('users').doc(user.uid).collection('dependants').add(dependant);

    dependantsRef.then((doc) => {
        console.log("new dependant added");
        console.log(firstname + lastname);
  
    })
    .catch((error) => {
        console.error("Error adding dependant: ", error);
    });
}

