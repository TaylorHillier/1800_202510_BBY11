// profile.js - Complete Implementation with Modal Forms
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
        document.getElementById('activity-list').innerHTML = '<li>Error loading recent activity</li>';
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
    displayBasicInfo(user);
    loadDependantsCount(user.uid);
    loadUpcomingTasksCount(user.uid);
    loadCompletedTasksCount(user.uid);
    loadRecentActivity(user.uid);
}

function displayBasicInfo(user) {
    document.getElementById('user-name').textContent = user.displayName || "User";
    document.getElementById('user-email').textContent = `Email: ${user.email}`;

    const creationDate = user.metadata.creationTime;
    const formattedDate = new Date(creationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('account-created').textContent = `Member since: ${formattedDate}`;
}

function setupEventListeners() {
    document.getElementById('edit-profile').addEventListener('click', showEditProfileForm);
    document.getElementById('change-password').addEventListener('click', showChangePasswordForm);
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}

/* MODAL FORM FUNCTIONS */
function createModalContainer(id, titleText) {
    // Remove existing modal if present
    const existingModal = document.getElementById(id);
    if (existingModal) existingModal.remove();

    // Create modal container
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-container';
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '&times;';

    closeBtn.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.color = '#1f2937';
    });
    closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.color = '#6b7280';
    });

    // Title
    const title = document.createElement('h2');
    title.textContent = titleText;
    title.style.marginTop = '0';
    title.style.color = 'var(--navy)';

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    return modalContent;
}

async function showEditProfileForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const modalContent = createModalContainer('edit-profile-modal', 'Edit Profile');
    const form = document.createElement('form');
    form.id = 'profile-edit-form';


    // Fetch current user data
    const userDoc = await firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Name Field
    const nameGroup = document.createElement('div');
    nameGroup.innerHTML = `
        <label for="edit-fullname" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Full Name</label>
        <input type="text" id="edit-fullname" value="${user.displayName || ''}" required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
    `;
    form.appendChild(nameGroup);

    // Email Field
    const emailGroup = document.createElement('div');
    emailGroup.innerHTML = `
        <label for="edit-email" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Email</label>
        <input type="email" id="edit-email" value="${user.email || ''}" required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
    `;
    form.appendChild(emailGroup);

    // Submit Button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Save Changes';

    submitBtn.addEventListener('mouseover', () => {
        submitBtn.style.backgroundColor = 'var(--navy)';
    });
    submitBtn.addEventListener('mouseout', () => {
        submitBtn.style.backgroundColor = 'var(--slate-blue)';
    });

    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProfileUpdate();
        document.getElementById('edit-profile-modal').remove();
    });

    modalContent.appendChild(form);
}

function showChangePasswordForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const modalContent = createModalContainer('change-password-modal', 'Change Password');
    const form = document.createElement('form');
    form.id = 'password-change-form';


    // Current Password
    const currentPassGroup = document.createElement('div');
    currentPassGroup.innerHTML = `
        <label for="current-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Current Password</label>
        <input type="password" id="current-password" required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
    `;
    form.appendChild(currentPassGroup);

    // New Password
    const newPassGroup = document.createElement('div');
    newPassGroup.innerHTML = `
        <label for="new-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">New Password</label>
        <input type="password" id="new-password" required minlength="6"
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
    `;
    form.appendChild(newPassGroup);

    // Confirm Password
    const confirmPassGroup = document.createElement('div');
    confirmPassGroup.innerHTML = `
        <label for="confirm-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Confirm New Password</label>
        <input type="password" id="confirm-password" required minlength="6"
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
    `;
    form.appendChild(confirmPassGroup);

    // Password requirements note
    const requirementsNote = document.createElement('p');
    requirementsNote.textContent = 'Password must be at least 6 characters long';
    requirementsNote.style.cssText = 'font-size: 0.875rem; color: var(--light-text); margin-top: -1rem;';
    form.appendChild(requirementsNote);

    // Submit Button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Update Password';

    submitBtn.addEventListener('mouseover', () => {
        submitBtn.style.backgroundColor = 'var(--navy)';
    });
    submitBtn.addEventListener('mouseout', () => {
        submitBtn.style.backgroundColor = 'var(--slate-blue)';
    });

    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordChange();
        document.getElementById('change-password-modal').remove();
    });

    modalContent.appendChild(form);
}

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
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // Update email if changed
        if (email !== user.email) {
            await user.updateEmail(email);
        }

        // Update display name
        await user.updateProfile({ displayName: name });

        // Update Firestore
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .update({
                name: name,
                email: email,
                lastProfileUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Update UI
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-email').textContent = `Email: ${email}`;

    } catch (error) {
        console.error("Error updating profile:", error);
        alert(`Error: ${error.message}`);
    }
}

async function handlePasswordChange() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert("New passwords don't match!");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long");
        return;
    }

    try {
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .update({
                lastPasswordUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

        alert("Password updated successfully!");
    } catch (error) {
        console.error("Error changing password:", error);
        let message = "Error changing password: ";
        message += error.code === 'auth/wrong-password' ? "Incorrect current password" : error.message;
        alert(message);
    }
}

// Helper Functions
function formatActivityTime(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' • ' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}