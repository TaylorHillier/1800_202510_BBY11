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
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
}

function loadUserProfile(user) {
    // 1. Load basic user info
    displayBasicInfo(user);

    // 2. Load user stats
    loadUserStats(user.uid);

    // 3. Load recent activity
    loadRecentActivity(user.uid);

    // 4. Check and update profile picture
    updateProfilePicture(user);
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

async function loadUserStats(userId) {
    try {
        // 1. Load dependants count
        const depsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('dependants')
            .get();
        document.getElementById('dependants-count').textContent = depsSnapshot.size;

        // 2. Load upcoming tasks
        const now = new Date();
        const tasksSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('caretakerId', '==', userId)
            .where('dueDate', '>=', now)
            .get();
        document.getElementById('upcoming-tasks').textContent = tasksSnapshot.size;

        // 3. Load completed tasks
        const completedSnapshot = await firebase.firestore()
            .collection('tasks')
            .where('caretakerId', '==', userId)
            .where('status', '==', 'completed')
            .get();
        document.getElementById('completed-tasks').textContent = completedSnapshot.size;

    } catch (error) {
        console.error("Error loading user stats:", error);
    }
}

async function loadRecentActivity(userId) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '<li>Loading activities...</li>';

    try {
        const snapshot = await firebase.firestore()
            .collection('activity')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            activityList.innerHTML = '<li>No recent activity</li>';
            return;
        }

        activityList.innerHTML = '';
        snapshot.forEach(doc => {
            const activity = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="activity-icon">${getActivityIcon(activity.type)}</span>
                <div>
                    <span class="activity-text">${activity.message}</span>
                    <span class="activity-time">${formatActivityTime(activity.timestamp)}</span>
                </div>
            `;
            activityList.appendChild(li);
        });
    } catch (error) {
        activityList.innerHTML = '<li>Error loading activities</li>';
        console.error("Error loading activity:", error);
    }
}

function updateProfilePicture(user) {
    if (user.photoURL) {
        document.getElementById('profile-photo').src = user.photoURL;
        // Also update navbar avatar if exists
        const navbarAvatar = document.getElementById('navbar-avatar');
        if (navbarAvatar) navbarAvatar.src = user.photoURL;
    }
}

function setupEventListeners() {
    // Photo upload handler
    document.getElementById('photo-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadProfilePhoto(file);
        }
    });

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

async function uploadProfilePhoto(file) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        // Show loading state
        const photoElement = document.getElementById('profile-photo');
        photoElement.style.opacity = '0.5';

        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref(`profile_photos/${user.uid}`);
        const uploadTask = storageRef.put(file);

        await uploadTask;
        const downloadURL = await storageRef.getDownloadURL();

        // Update user profile
        await user.updateProfile({
            photoURL: downloadURL
        });

        // Update UI
        photoElement.src = downloadURL;
        photoElement.style.opacity = '1';

        // Update navbar avatar if exists
        const navbarAvatar = document.getElementById('navbar-avatar');
        if (navbarAvatar) navbarAvatar.src = downloadURL;

    } catch (error) {
        console.error("Error uploading photo:", error);
        alert("Couldn't update profile photo. Please try again.");
        document.getElementById('profile-photo').style.opacity = '1';
    }
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

async function showEditProfileForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // If form is already open, close it
    const existingModal = document.getElementById('edit-profile-modal');
    if (existingModal) {
        existingModal.remove();
        profileFormOpen = false;
        return;
    }

    // Fetch current user data
    const userDoc = await firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .get();

    const userData = userDoc.exists ? userDoc.data() : {};

    // Create form HTML
    const formHTML = `
        <div class="modal" id="edit-profile-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Edit Profile</h3>
                <form id="profile-edit-form">
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="edit-email" value="${user.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Full Name:</label>
                        <input type="text" id="edit-fullname"  required>
                    </div>

                    <div class="form-actions">
                        <button type="submit">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', formHTML);
    profileFormOpen = true;

    // Close modal when clicking X or outside
    document.querySelector('.close-modal').addEventListener('click', closeProfileForm);
    document.getElementById('edit-profile-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('edit-profile-modal')) {
            closeProfileForm();
        }
    });

    // Prevent click propagation in modal content
    document.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Set up form submission
    document.getElementById('profile-edit-form').addEventListener('submit', handleProfileUpdate);
}

function closeProfileForm() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.remove();
        profileFormOpen = false;
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
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

        // 6. Close modal
        closeProfileForm();
        console.log('Profile updated successfully!');

    } catch (error) {
        console.error("Error updating profile:", error);
        alert(`Error: ${error.message}`);
    }
}

let passwordFormOpen = false;

function showChangePasswordForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // If form is already open, close it
    const existingModal = document.getElementById('change-password-modal');
    if (existingModal) {
        existingModal.remove();
        passwordFormOpen = false;
        return;
    }

    // Create password change modal
    const formHTML = `
        <div class="modal" id="change-password-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Change Password</h3>
                <form id="password-change-form">
                    <div class="form-group">
                        <label>Current Password:</label>
                        <input type="password" id="current-password" required>
                    </div>
                    <div class="form-group">
                        <label>New Password:</label>
                        <input type="password" id="new-password" required>
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password:</label>
                        <input type="password" id="confirm-password" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Update Password</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', formHTML);
    passwordFormOpen = true;

    // Set up event listeners
    document.getElementById('password-change-form').addEventListener('submit', handlePasswordChange);

    // Close when clicking X
    document.querySelector('#change-password-modal .close-modal').addEventListener('click', () => {
        closePasswordForm();
    });

    // Close when clicking outside modal
    document.getElementById('change-password-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('change-password-modal')) {
            closePasswordForm();
        }
    });

    // Prevent clicks inside modal from closing it
    document.querySelector('#change-password-modal .modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

async function changeUserPassword(newPassword) {
    try {
        const user = firebase.auth().currentUser;
        await user.updatePassword(newPassword);
        console.log("Password changed successfully!");
    } catch (error) {
        console.error("Error changing password:", error);
        alert("Error changing password: " + error.message);
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();

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
        // Close modal and show success
        document.getElementById('change-password-modal').remove();
        closePasswordForm();
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

function closePasswordForm() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.remove();
        passwordFormOpen = false;
    }
}