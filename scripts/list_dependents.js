function listDependants() {
    firebase.auth().onAuthStateChanged(async user => {
        if (!user) return;

        const snapshot = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .get();

        // Clear existing list first
        const dependantsList = document.getElementById("dependants-list");
        dependantsList.innerHTML = "";

        await Promise.all(snapshot.docs.map(async doc => {
            const listItem = document.createElement('li');
            const dependant = doc.data();
            
            // Name display
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${dependant.firstname} ${dependant.lastname}`;
            listItem.appendChild(nameSpan);

            // Remove button
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "×";
            removeBtn.className = "delete-dependant";
            removeBtn.dataset.id = doc.id;
            removeBtn.style.cssText = `
                display: ${window.removeMode ? 'inline-block' : 'none'};
                margin-left: 10px;
                background-color: #ff4444;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 3px 8px;
                cursor: pointer;
                font-size: 14px;
            `;

            removeBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm(`Remove ${dependant.firstname} ${dependant.lastname}?`)) {
                    await firebase.firestore()
                        .collection('users')
                        .doc(user.uid)
                        .collection('dependants')
                        .doc(doc.id)
                        .delete();
                    listDependants(); // Refresh the list
                }
            });

            listItem.appendChild(removeBtn);
            dependantsList.appendChild(listItem);
        }));
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Create global removeMode if it doesn't exist
    window.removeMode = window.removeMode || false;
    listDependants();
});

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