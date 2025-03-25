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
            listItem.className = "dependant-item";
            const dependant = doc.data();
            
            // Create container for link and button
            const container = document.createElement('div');
            container.className = "dependant-container";
            
            // Create clickable name link
            const nameLink = document.createElement('a');
            nameLink.href = `single_dependant.html?id=${doc.id}`;
            nameLink.textContent = `${dependant.firstname} ${dependant.lastname}`;
            nameLink.className = "dependant-name";

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
                e.preventDefault();
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

            container.appendChild(nameLink);
            container.appendChild(removeBtn);
            listItem.appendChild(container);
            dependantsList.appendChild(listItem);
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.removeMode = window.removeMode || false;
    listDependants();
});

function formatTime(timeString) {
    const time = new Date(`1970-01-01T${timeString}`);
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    return formatter.format(time);
}