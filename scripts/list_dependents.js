function listDependants() {
    firebase.auth().onAuthStateChanged(async user => {
        if (!user) {
            console.log("Must be logged in!");
            return;
        }

        const snapshot = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').get();

        // Use Promise.all to handle asynchronous operations inside .map
        await Promise.all(snapshot.docs.map(async doc => {
            var listItem = document.createElement('li');
            var link = document.createElement('a');
            listItem.className = "dependant";

            var firstname = doc.data().firstname;
            var lastname = doc.data().lastname;

            link.innerHTML = firstname + " " + lastname;
            link.href = `single_dependant.html?id=${doc.id}`;
            listItem.appendChild(link);

             // Create Remove button
             const removeBtn = document.createElement("button");
             removeBtn.textContent = "Remove";
             removeBtn.setAttribute("data-id", doc.id);
             removeBtn.style.marginLeft = "10px"; // Space between name & button
             removeBtn.style.backgroundColor = "red";
             removeBtn.style.color = "white";
             removeBtn.style.border = "none";
             removeBtn.style.padding = "5px 10px";
             removeBtn.style.cursor = "pointer";
             removeBtn.addEventListener("click", removeDependant);
     
             listItem.appendChild(removeBtn);

            document.getElementById("dependants-list").appendChild(listItem);
        }));
    });
}

// format in AM PM
function formatTime(timeString) {
    const time = new Date(`1970-01-01T${timeString}`);
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    return formatter.format(time);
}

listDependants();