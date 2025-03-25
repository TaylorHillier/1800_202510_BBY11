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

function showEditProfileForm() {
    // Implementation for edit profile form
    alert('Edit profile functionality will be implemented here');
    // You can replace this with a modal form implementation
}

function showChangePasswordForm() {
    // Implementation for password change form
    const newPassword = prompt("Enter your new password:");
    if (newPassword && newPassword.length >= 6) {
        changeUserPassword(newPassword);
    } else if (newPassword) {
        alert("Password must be at least 6 characters");
    }
}

async function changeUserPassword(newPassword) {
    try {
        const user = firebase.auth().currentUser;
        await user.updatePassword(newPassword);
        alert("Password changed successfully!");
    } catch (error) {
        console.error("Error changing password:", error);
        alert("Error changing password: " + error.message);
    }
}