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

            // Fetch medications for the dependant
            const medsSnapshot = await doc.ref.collection('medications').get();

            const medications = [];

            medsSnapshot.forEach(medDoc => {
                const medData = medDoc.data();
                medications.push({
                    id: medDoc.id,
                    name: medData.name,
                    startDate: medData.startDate,
                    startTime: medData.startTime,
                    endDate: medData.endDate,
                    frequency: medData.frequency
                });
            });

            // Sort medications by start date and time
            medications.sort((a, b) => {
                const dateA = new Date(`${a.startDate}T${a.startTime}`);
                const dateB = new Date(`${b.startDate}T${b.startTime}`);
                return dateA - dateB;
            });

            // Determine next medication
            const now = new Date();
            let nextMedication = null;

            for (const med of medications) {
                const medStart = new Date(`${med.startDate}T${med.startTime}`);
                const medEnd = new Date(med.endDate);

                if (now >= medStart && now <= medEnd) {
                    nextMedication = med;
                    break;
                }
            }

            // Display next medication
            if (nextMedication) {
                const nextMedPara = document.createElement('p');
                const formattedTime = formatTime(nextMedication.startTime);
                nextMedPara.textContent = `${nextMedication.name} at ${formattedTime}`;
                listItem.appendChild(nextMedPara);
            }

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