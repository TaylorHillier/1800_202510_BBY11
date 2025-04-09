// ==================================================
//                PROFILE PAGE SCRIPT
// ==================================================

// Global variable declarations
var dependentQuant;  // Total number of dependents
let removeMode = false;  // Tracks whether "Remove Mode" is active

/**
 * Initializes the profile page.
 * - Sets up Firebase auth state listener.
 * - Loads profile data if a user is signed in; otherwise, redirects to login.
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeProfilePage();
});

/**
 * Initializes the profile page by checking auth state and loading user profile data.
 */
function initializeProfilePage() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loadUserProfile(user);
      setupEventListeners();
    } else {
      // Redirect to login page if user is not authenticated.
      window.location.href = 'login.html';
    }
  });
}

/**
 * Loads the user profile and related statistics from Firestore.
 * @param {firebase.User} user - The currently signed-in user.
 */
function loadUserProfile(user) {
  displayBasicInfo(user);
  loadDependantsCount(user.uid);
  loadUpcomingTasksCount(user.uid);
  loadCompletedTasksCount(user.uid);
  loadRecentActivity(user.uid);
}

/**
 * Displays basic user information on the profile page.
 * @param {firebase.User} user - The currently signed-in user.
 */
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

/**
 * Loads the recent activity from dependents' completed tasks and renders them.
 * @param {string} userId - The user's UID.
 * @returns {Promise<void>}
 */
async function loadRecentActivity(userId) {
  try {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '<li>Loading activity...</li>';

    const dependentsSnapshot = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('dependents')
      .get();

    let allCompletedTasks = [];
    for (const dependentDoc of dependentsSnapshot.docs) {
      const dependentId = dependentDoc.id;
      const dependentData = dependentDoc.data();

      const completedTasksSnapshot = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependents')
        .doc(dependentId)
        .collection('completed-tasks')
        .orderBy('completedAt', 'desc')
        .limit(3)
        .get();

      completedTasksSnapshot.forEach(taskDoc => {
        allCompletedTasks.push({
          ...taskDoc.data(),
          dependentName: dependentData.firstName || 'Unknown',
          dependentLName: dependentData.lastName || '',
          id: taskDoc.id,
          timestamp: taskDoc.data().completedAt
        });
      });
    }

    // Sort tasks in descending order by timestamp
    allCompletedTasks.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    const recentTasks = allCompletedTasks.slice(0, 3);
    displayRecentActivity(recentTasks);
  } catch (error) {
    console.error("Error loading recent activity:", error);
    document.getElementById('activity-list').innerHTML = '<li>Error loading recent activity</li>';
  }
}

/**
 * Renders the recent activity list.
 * @param {Array<Object>} tasks - Array of recent activity task objects.
 */
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
            ${task.dependentName} ${task.dependentLName} at
          </span>
          <span class="activity-time">${formattedDate}</span>
        </div>
      </li>
    `;
  }).join('');
}

/**
 * Loads the count of dependents for the signed-in user and updates UI elements.
 * @param {string} userId - The user's UID.
 * @returns {Promise<void>}
 */
async function loadDependantsCount(userId) {
  try {
    const dependentsSnapshot = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('dependents')
      .get();

    const count = dependentsSnapshot.size;
    document.getElementById('dependents-count').textContent = count;

    const statCard = document.querySelector('.stat-card[onclick*="dependents.html"] h3');
    if (statCard) {
      statCard.textContent = count;
    }
  } catch (error) {
    console.error("Error loading dependents count:", error);
    document.getElementById('dependents-count').textContent = '0';
  }
}

/**
 * Loads the count of upcoming tasks (medications not yet completed today) and updates UI elements.
 * @param {string} userId - The user's UID.
 * @returns {Promise<void>}
 */
async function loadUpcomingTasksCount(userId) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const dependentsSnapshot = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('dependents')
      .get();

    let totalTasksCount = 0;
    let completedTasksCount = 0;
    for (const dependentDoc of dependentsSnapshot.docs) {
      const dependentId = dependentDoc.id;
      const medicationsSnapshot = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependents')
        .doc(dependentId)
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

      const completedTasksSnapshot = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependents')
        .doc(dependentDoc.id)
        .collection('completed-tasks')
        .where('completedAt', '>=', todayStart)
        .where('completedAt', '<', tomorrowStart)
        .get();

      completedTasksCount += completedTasksSnapshot.size;
    }

    const upcomingTasksCount = totalTasksCount - completedTasksCount;
    const displayCount = upcomingTasksCount > 0 ? upcomingTasksCount : 0;
    document.getElementById('upcoming-tasks').textContent = displayCount;
    const statCard = document.querySelector('.stat-card[onclick*="caretaker-schedule.html"] h3');
    if (statCard) {
      statCard.textContent = displayCount;
    }
  } catch (error) {
    console.error("Error loading upcoming tasks count:", error);
    document.getElementById('upcoming-tasks').textContent = '0';
  }
}

/**
 * Loads the count of completed tasks today and updates UI elements.
 * @param {string} userId - The user's UID.
 * @returns {Promise<void>}
 */
async function loadCompletedTasksCount(userId) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const dependentsSnapshot = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('dependents')
      .get();

    let completedTasksCount = 0;
    for (const dependentDoc of dependentsSnapshot.docs) {
      const completedTasksSnapshot = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependents')
        .doc(dependentDoc.id)
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

/**
 * Sets up event listeners for profile actions such as editing profile,
 * changing password, and logging out.
 */
function setupEventListeners() {
  const editProfileBtn = document.getElementById('edit-profile');
  const changePasswordBtn = document.getElementById('change-password');
  const logoutBtn = document.getElementById('logout-btn');

  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', showEditProfileForm);
  }
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', showChangePasswordForm);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        window.location.href = 'login.html';
      });
    });
  }
}

/**
 * Creates and returns a modal container for form dialogs.
 * @param {string} id - The ID to assign to the modal container.
 * @param {string} titleText - Title text for the modal.
 * @returns {HTMLElement} The content container where form elements can be appended.
 */
function createModalContainer(id, titleText) {
  // Remove any existing modal with the same ID.
  const existingModal = document.getElementById(id);
  if (existingModal) existingModal.remove();

  // Create modal container element.
  const modal = document.createElement('div');
  modal.id = id;
  modal.className = 'modal-container';

  // Create content container within the modal.
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  // Create close button.
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

  // Create title.
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

/**
 * Displays the "Edit Profile" modal form.
 * Fetches current user data from Firestore and pre-populates form fields.
 */
async function showEditProfileForm() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const modalContent = createModalContainer('edit-profile-modal', 'Edit Profile');
  const form = document.createElement('form');
  form.id = 'profile-edit-form';

  // Fetch current user data.
  const userDoc = await firebase.firestore()
    .collection('users')
    .doc(user.uid)
    .get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // Create Full Name field.
  const nameGroup = document.createElement('div');
  nameGroup.innerHTML = `
    <label for="edit-fullname" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Full Name</label>
    <input type="text" id="edit-fullname" value="${user.displayName || ''}" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
  `;
  form.appendChild(nameGroup);

  // Create Email field.
  const emailGroup = document.createElement('div');
  emailGroup.innerHTML = `
    <label for="edit-email" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Email</label>
    <input type="email" id="edit-email" value="${user.email || ''}" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
  `;
  form.appendChild(emailGroup);

  // Create submit button.
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

/**
 * Displays the "Change Password" modal form.
 */
function showChangePasswordForm() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const modalContent = createModalContainer('change-password-modal', 'Change Password');
  const form = document.createElement('form');
  form.id = 'password-change-form';

  // Current Password field.
  const currentPassGroup = document.createElement('div');
  currentPassGroup.innerHTML = `
    <label for="current-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Current Password</label>
    <input type="password" id="current-password" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
  `;
  form.appendChild(currentPassGroup);

  // New Password field.
  const newPassGroup = document.createElement('div');
  newPassGroup.innerHTML = `
    <label for="new-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">New Password</label>
    <input type="password" id="new-password" required minlength="6" style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
  `;
  form.appendChild(newPassGroup);

  // Confirm New Password field.
  const confirmPassGroup = document.createElement('div');
  confirmPassGroup.innerHTML = `
    <label for="confirm-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--dark-text);">Confirm New Password</label>
    <input type="password" id="confirm-password" required minlength="6" style="width: 100%; padding: 0.75rem; border: 1px solid var(--medium-gray); border-radius: 4px; font-size: 1rem;">
  `;
  form.appendChild(confirmPassGroup);

  // Password requirement note.
  const requirementsNote = document.createElement('p');
  requirementsNote.textContent = 'Password must be at least 6 characters long';
  requirementsNote.style.cssText = 'font-size: 0.875rem; color: var(--light-text); margin-top: -1rem;';
  form.appendChild(requirementsNote);

  // Submit Button.
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

/**
 * Handles profile updates, including reauthentication.
 * Updates the user's display name and email in both Firebase Auth and Firestore.
 */
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
    // Reauthenticate the user.
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);

    // Update email if it has changed.
    if (email !== user.email) {
      await user.updateEmail(email);
    }
    // Update display name.
    await user.updateProfile({ displayName: name });

    // Update the Firestore user document.
    await firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .update({
        name: name,
        email: email,
        lastProfileUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

    // Refresh UI
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-email').textContent = `Email: ${email}`;
  } catch (error) {
    console.error("Error updating profile:", error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Handles password changes by reauthenticating the user and updating the password.
 */
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
    // Reauthenticate the user.
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    // Update the password.
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

/**
 * Formats a Firebase timestamp for activity display.
 * @param {firebase.firestore.Timestamp} timestamp - Timestamp from Firestore.
 * @returns {string} The formatted time string.
 */
function formatActivityTime(timestamp) {
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
         ' • ' +
         date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}


// ==================================================
//               INITIALIZATION & AUTH
// ==================================================

document.addEventListener("DOMContentLoaded", function () {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      setupButtons();
      loadDependants();
    } else {
      console.log("No user logged in.");
    }
  });
});

/**
 * Sets up event listeners for dependent actions (add & remove).
 */
function setupButtons() {
  const addButton = document.getElementById("add-dependent");
  const removeButton = document.getElementById("removeModeBtn");
  if (addButton) {
    addButton.addEventListener("click", createForm);
  }
  if (removeButton) {
    removeButton.addEventListener("click", toggleRemoveMode);
  }
}

// ==================================================
//           UPDATE WELCOME & DISPLAY DETAILS
// ==================================================

// Update welcome message with dependent quantity once user is authenticated.
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    document.addEventListener('DOMContentLoaded', () => {
      const welcome = document.getElementById("dependents-welcome");
      const userName = user.displayName.split(" ")[0];
      welcome.innerText = "Hello " + userName + ". You have " + dependentQuant + " dependents.";
    });
  }
});

// If a dependent ID is provided in the URL, display its details.
document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const dependentId = urlParams.get('id');
  if (dependentId) {
    displayDependentDetails(dependentId);
  } else {
    console.log("No dependent ID provided");
  }
});
