document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-summary');
    saveButton.addEventListener('click', () => {
        const summaryText = document.getElementById('summary-text').value;
        if (firebase.firestore) {
            const db = firebase.firestore();
            const userId = "exampleUserId"; // Replace with actual user ID

            db.collection('summaries').doc(userId).set({
                summary: summaryText
            }).then(() => {
                document.getElementById('summary-feedback').style.display = 'block';
                setTimeout(() => {
                    document.getElementById('summary-feedback').style.display = 'none';
                }, 3000);
            }).catch((error) => {
                console.error('Error saving summary: ', error);
            });
        }
    });
});