// profile.js - Complete Implementation
document.addEventListener('DOMContentLoaded', () => {
    initializeProfilePage();
});

function initializeProfilePage() {
    // Check auth state and load data
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
            setupEventListeners();
        } else {
            window.location.href = 'login.html';
        }
    });
}

async function loadRecentActivity(userId) {
    try {
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '<li>Loading activity...</li>';

        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .get();

        let allCompletedTasks = [];

        for (const dependantDoc of dependantsSnapshot.docs) {
            const dependantId = dependantDoc.id;
            const dependantData = dependantDoc.data();

            const completedTasksSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('dependants')
                .doc(dependantId)
                .collection('completed-tasks')
                .orderBy('completedAt', 'desc')
                .limit(3)
                .get();

            completedTasksSnapshot.forEach(taskDoc => {
                allCompletedTasks.push({
                    ...taskDoc.data(),
                    dependantName: dependantData.firstname || 'Unknown',
                    dependantLName: dependantData.lastname || '',
                    id: taskDoc.id,
                    timestamp: taskDoc.data().completedAt
                });
            });
        }

        allCompletedTasks.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

        const recentTasks = allCompletedTasks.slice(0, 3);

        displayRecentActivity(recentTasks);
    } catch (error) {
        console.error("Error loading recent activity:", error);
        document.getElementById('activity-list').innerHTML =
            '<li>Error loading recent activity</li>';
    }
}

function displayRecentActivity(tasks) {
    const activityList = document.getElementById('activity-list');

    if (!activityList) {
        console.error("Activity list element not found");
        return;
    }

    if (tasks.length === 0) {
        activityList.innerHTML = '<li>No recent activity</li>';
        return;
    }

    activityList.innerHTML = tasks.map(task => {
        const date = task.completedAt.toDate();
        const formattedDate = formatActivityTime(task.completedAt);

        return `
            <li class="activity-item">
                <span class="activity-icon">✓</span>
                <div class="activity-details">
                    <span class="activity-text">
                        Gave ${task.numPills || '1'} ${task.medicationName} to 
                        ${task.dependantName} ${task.dependantLName} at
                    </span>
                    <span class="activity-time">${formattedDate}</span>
                </div>
            </li>
        `;
    }).join('');
}

async function loadDependantsCount(userId) {
    try {
        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .get();

        const count = dependantsSnapshot.size;
        document.getElementById('dependants-count').textContent = count;

        const statCard = document.querySelector('.stat-card[onclick*="dependants.html"] h3');
        if (statCard) {
            statCard.textContent = count;
        }
    } catch (error) {
        console.error("Error loading dependants count:", error);
        document.getElementById('dependants-count').textContent = '0';
    }
}

async function loadUpcomingTasksCount(userId) {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .get();

        let totalTasksCount = 0;
        let completedTasksCount = 0;

        for (const dependantDoc of dependantsSnapshot.docs) {
            const dependantId = dependantDoc.id;

            // Count total tasks
            const medicationsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('dependants')
                .doc(dependantId)
                .collection('medications')
                .get();

            for (const medDoc of medicationsSnapshot.docs) {
                const medData = medDoc.data();
                if (medData.schedule && Array.isArray(medData.schedule)) {
                    medData.schedule.forEach(scheduleItem => {
                        let doseDate;
                        if (scheduleItem.doseTime && scheduleItem.doseTime.toDate) {
                            doseDate = scheduleItem.doseTime.toDate();
                        } else if (scheduleItem.doseTime) {
                            doseDate = new Date(scheduleItem.doseTime);
                        } else {
                            return;
                        }

                        if (doseDate >= todayStart && doseDate < tomorrowStart) {
                            totalTasksCount++;
                        }
                    });
                }
            }

            // Count completed tasks
            const completedTasksSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('dependants')
                .doc(dependantId)
                .collection('completed-tasks')
                .where('completedAt', '>=', todayStart)
                .where('completedAt', '<', tomorrowStart)
                .get();

            completedTasksCount += completedTasksSnapshot.size;
        }

        const upcomingTasksCount = totalTasksCount - completedTasksCount;

        document.getElementById('upcoming-tasks').textContent = upcomingTasksCount > 0 ? upcomingTasksCount : 0;

        const statCard = document.querySelector('.stat-card[onclick*="caretaker-schedule.html"] h3');
        if (statCard) {
            statCard.textContent = upcomingTasksCount > 0 ? upcomingTasksCount : 0;
        }
    } catch (error) {
        console.error("Error loading upcoming tasks count:", error);
        document.getElementById('upcoming-tasks').textContent = '0';
    }
}

async function loadCompletedTasksCount(userId) {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .get();

        let completedTasksCount = 0;

        for (const dependantDoc of dependantsSnapshot.docs) {
            const dependantId = dependantDoc.id;

            const completedTasksSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('dependants')
                .doc(dependantId)
                .collection('completed-tasks')
                .where('completedAt', '>=', todayStart)
                .where('completedAt', '<', tomorrowStart)
                .get();

            completedTasksCount += completedTasksSnapshot.size;
        }

        document.getElementById('completed-tasks').textContent = completedTasksCount;

        const statCard = document.querySelector('.stat-card:not([onclick]) h3');
        if (statCard) {
            statCard.textContent = completedTasksCount;
        }
    } catch (error) {
        console.error("Error loading completed tasks count:", error);
        document.getElementById('completed-tasks').textContent = '0';
    }
}


function loadUserProfile(user) {
    // 1. Load basic user info
    displayBasicInfo(user);

    // 2. Load dependants count
    loadDependantsCount(user.uid);

    // 3. Load upcoming tasks count
    loadUpcomingTasksCount(user.uid);

    // 4. Load completed tasks count
    loadCompletedTasksCount(user.uid);

    // 5. Load recent activity
    loadRecentActivity(user.uid);
}



function displayBasicInfo(user) {
    // Display core user information
    document.getElementById('user-name').textContent = user.displayName || "User";
    document.getElementById('user-email').textContent = `Email: ${user.email}`;

    // Format account creation date
    const creationDate = user.metadata.creationTime;
    const formattedDate = new Date(creationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('account-created').textContent = `Member since: ${formattedDate}`;
}



function setupEventListeners() {

    // Edit profile button
    document.getElementById('edit-profile').addEventListener('click', () => {
        showEditProfileForm();
    });

    // Change password button
    document.getElementById('change-password').addEventListener('click', () => {
        showChangePasswordForm();
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}

// Helper Functions
function formatActivityTime(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' • ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getActivityIcon(type) {
    const icons = {
        'task': '✓',
        'dependant': '👪',
        'system': '⚙️',
        'default': '🔔'
    };
    return icons[type] || icons['default'];
}

let profileFormOpen = false; // Track form state

// Modify the showEditProfileForm function
async function showEditProfileForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // Check if form already exists to prevent duplicates
    if (document.getElementById("profile-edit-form")) {
        document.getElementById("profile-edit-form").remove();
        return;
    }

    // Fetch current user data
    const userDoc = await firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .get();

    const userData = userDoc.exists ? userDoc.data() : {};

    // Create a form element
    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.id = "profile-edit-form";

    // Email Label and Input
    var emailLabel = document.createElement("label");
    emailLabel.setAttribute("for", "edit-email");
    emailLabel.textContent = "Email: ";

    var emailInput = document.createElement("input");
    emailInput.setAttribute("id", "edit-email");
    emailInput.setAttribute("type", "email");
    emailInput.setAttribute("value", user.email || '');
    emailInput.setAttribute("required", "true");

    // Full Name Label and Input
    var nameLabel = document.createElement("label");
    nameLabel.setAttribute("for", "edit-fullname");
    nameLabel.textContent = "Full Name: ";

    var nameInput = document.createElement("input");
    nameInput.setAttribute("id", "edit-fullname");
    nameInput.setAttribute("type", "text");
    nameInput.setAttribute("value", user.displayName || '');
    nameInput.setAttribute("required", "true");

    // Submit Button
    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Save Changes");

    // Add event listener to form
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        handleProfileUpdate();
    });

    // Append elements to form
    form.appendChild(emailLabel);
    form.appendChild(emailInput);
    form.appendChild(document.createElement("br"));

    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(document.createElement("br"));

    form.appendChild(submit);

    // Insert the form after the Edit Profile button
    document.getElementById("edit-profile").insertAdjacentElement("afterend", form);
}

// Update handleProfileUpdate to work with the new form style
async function handleProfileUpdate() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const email = document.getElementById('edit-email').value.trim();
    const name = document.getElementById('edit-fullname').value.trim();
    const currentPassword = prompt("Please enter your current password to confirm changes:");

    if (!currentPassword) {
        alert("Password required to make changes");
        return;
    }

    try {
        // 1. Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // 2. Update email if changed
        if (email !== user.email) {
            await user.updateEmail(email);
            console.log("Email updated successfully");
        }

        // 3. Update display name
        const displayName = `${name}`;
        await user.updateProfile({ displayName });

        // 4. Update Firestore
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .update({
                name: name,
                email: email,
                lastProfileUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

        // 5. Update UI
        document.getElementById('user-name').textContent = displayName;
        document.getElementById('user-email').textContent = `Email: ${email}`;

        // 6. Remove the form
        document.getElementById('profile-edit-form').remove();
        console.log('Profile updated successfully!');

    } catch (error) {
        console.error("Error updating profile:", error);
        alert(`Error: ${error.message}`);
    }
}

// Similarly, modify the showChangePasswordForm function
function showChangePasswordForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // Check if form already exists to prevent duplicates
    if (document.getElementById("password-change-form")) {
        document.getElementById("password-change-form").remove();
        return;
    }

    // Create a form element
    var form = document.createElement("form");
    form.setAttribute("method", "post");
    form.id = "password-change-form";

    // Current Password Label and Input
    var currentPasswordLabel = document.createElement("label");
    currentPasswordLabel.setAttribute("for", "current-password");
    currentPasswordLabel.textContent = "Current Password: ";

    var currentPasswordInput = document.createElement("input");
    currentPasswordInput.setAttribute("id", "current-password");
    currentPasswordInput.setAttribute("type", "password");
    currentPasswordInput.setAttribute("required", "true");

    // New Password Label and Input
    var newPasswordLabel = document.createElement("label");
    newPasswordLabel.setAttribute("for", "new-password");
    newPasswordLabel.textContent = "New Password: ";

    var newPasswordInput = document.createElement("input");
    newPasswordInput.setAttribute("id", "new-password");
    newPasswordInput.setAttribute("type", "password");
    newPasswordInput.setAttribute("required", "true");

    // Confirm Password Label and Input
    var confirmPasswordLabel = document.createElement("label");
    confirmPasswordLabel.setAttribute("for", "confirm-password");
    confirmPasswordLabel.textContent = "Confirm New Password: ";

    var confirmPasswordInput = document.createElement("input");
    confirmPasswordInput.setAttribute("id", "confirm-password");
    confirmPasswordInput.setAttribute("type", "password");
    confirmPasswordInput.setAttribute("required", "true");

    // Submit Button
    var submit = document.createElement("input");
    submit.setAttribute("type", "submit");
    submit.setAttribute("value", "Update Password");

    // Add event listener to form
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        handlePasswordChange();
    });

    // Append elements to form
    form.appendChild(currentPasswordLabel);
    form.appendChild(currentPasswordInput);
    form.appendChild(document.createElement("br"));

    form.appendChild(newPasswordLabel);
    form.appendChild(newPasswordInput);
    form.appendChild(document.createElement("br"));

    form.appendChild(confirmPasswordLabel);
    form.appendChild(confirmPasswordInput);
    form.appendChild(document.createElement("br"));

    form.appendChild(submit);

    // Insert the form after the Change Password button
    document.getElementById("change-password").insertAdjacentElement("afterend", form);
}

// Update handlePasswordChange to work with the new form style
async function handlePasswordChange() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Only validation - passwords must match
    if (newPassword !== confirmPassword) {
        alert("New passwords don't match!");
        return;
    }

    try {
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // Update password (Firebase may still enforce some basic requirements)
        await user.updatePassword(newPassword);

        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .update({
                lastPasswordUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Remove form and show success
        document.getElementById('password-change-form').remove();
        alert("Password updated successfully!");

    } catch (error) {
        console.error("Error changing password:", error);
        let message = "Error changing password: ";

        if (error.code === 'auth/wrong-password') {
            message += "Incorrect current password";
        } else {
            message += error.message;
        }

        alert(message);
    }
}

// You can remove or repurpose these functions as they're no longer needed
function closeProfileForm() {
    const form = document.getElementById('profile-edit-form');
    if (form) {
        form.remove();
    }
}

function closePasswordForm() {
    const form = document.getElementById('password-change-form');
    if (form) {
        form.remove();
    }
}