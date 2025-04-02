var globalUser;

function getNameFromAuth() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in:", user.uid);
            const userName = user.displayName ? user.displayName.split(" ")[0] : "User";
            globalUser = user.uid;
            document.getElementById("user-name").innerText = userName;
            getTodayTasks(globalUser);
        } else {
            console.log("No user is logged in");
        }
    });
}

function formatTime(hours, minutes) {
    const adjustedHours = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = adjustedHours.toString().padStart(2, '0');
    const formattedMinutes = (minutes || 0).toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

/**
 * Fetches and displays today’s medication tasks using each medication's stored schedule.
 * It also checks the dependant’s "completed-tasks" collection so that tasks already marked complete
 * are rendered with a line‑through style.
 */
async function getTodayTasks(user) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const todoListElement = document.getElementById("today");

    if (!todoListElement) {
        console.error("Todo list element (#today) not found!");
        return;
    }

    todoListElement.innerHTML = '<li>Loading tasks...</li>';

    try {
        // 1. Get all dependants for the current user.
        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(globalUser)
            .collection('dependants')
            .get();

        let allTasks = [];

        // 2. Process each dependant.
        const taskProcessingPromises = dependantsSnapshot.docs.map(async (dependantDoc) => {
            const dependantId = dependantDoc.id;
            const dependantData = dependantDoc.data();
            const dependantName = dependantData.firstname || 'Unknown';
            const dependantLName = dependantData.lastname || '';

            // 2a. Get completed tasks for this dependant.
            const completedSnapshot = await firebase.firestore()
                .collection('users')
                .doc(globalUser)
                .collection('dependants')
                .doc(dependantId)
                .collection('completed-tasks')
                .get();
            const completedKeys = new Set(completedSnapshot.docs.map(doc => doc.id));

            try {
                // 2b. Fetch medications for this dependant.
                const medicationsSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(globalUser)
                    .collection('dependants')
                    .doc(dependantId)
                    .collection('medications')
                    .get();

                // 3. Process each medication.
                medicationsSnapshot.forEach(medDoc => {
                    const medData = medDoc.data();
                    const medName = medData.name || 'Unnamed Medication';

                    // Use the new format fields: numPillsPerDose, dosesPerDay, continuous, endDate, endTime, etc.
                    if (medData.schedule && Array.isArray(medData.schedule)) {
                        medData.schedule.forEach(scheduleItem => {
                            let doseDate;
                            if (scheduleItem.doseTime && scheduleItem.doseTime.toDate) {
                                doseDate = scheduleItem.doseTime.toDate();
                            } else if (scheduleItem.doseTime) {
                                doseDate = new Date(scheduleItem.doseTime);
                            } else {
                                console.warn(`Missing doseTime for medication '${medName}'`);
                                return;
                            }

                            // Check if the dose is scheduled for today.
                            if (doseDate >= todayStart && doseDate < tomorrowStart) {
                                const formattedDoseTime = formatTime(doseDate.getHours(), doseDate.getMinutes());
                                // Construct a unique key for matching completed tasks.
                                const completedKey = `${medDoc.id}-${formattedDoseTime}`;
                                const isCompleted = completedKeys.has(completedKey);

                                const taskObject = {
                                    dependantId: dependantId,
                                    dependantName: dependantName,
                                    dependantLName: dependantLName,
                                    medicationName: medName,
                                    startTime: formattedDoseTime,
                                    // Use the new field name.
                                    numPillsPerDose: medData.numPillsPerDose || "1",
                                    dosesPerDay: medData.dosesPerDay,
                                    continuous: medData.continuous,
                                    endDate: medData.endDate,
                                    endTime: medData.endTime,
                                    medicationDocId: medDoc.id,
                                    doseDate: doseDate, // For due time calculation.
                                    isCompleted: isCompleted
                                };
                                allTasks.push(taskObject);
                            }
                        });
                    } else {
                        console.warn(`No schedule found for medication '${medName}' for ${dependantName}`);
                    }
                });
            } catch (medError) {
                console.error(`Error fetching medications for ${dependantName} ${dependantLName}:`, medError);
            }
        });

        await Promise.all(taskProcessingPromises);

        // 4. Sort tasks by scheduled time.
        const sortedTasks = allTasks.sort((a, b) => {
            const convertToMinutes = (timeStr) => {
                try {
                    const [timePart, period] = timeStr.split(' ');
                    let [hours, minutes] = timePart.split(':').map(Number);
                    if (period && period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                    if (period && period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                } catch (e) {
                    console.error("Error converting time to minutes:", timeStr, e);
                    return -1;
                }
            };
            return convertToMinutes(a.startTime) - convertToMinutes(b.startTime);
        });

        // 5. Render the tasks.
        todoListElement.innerHTML = '';
        if (sortedTasks.length === 0) {
            const noTasksItem = document.createElement('li');
            noTasksItem.textContent = 'No medications scheduled for today';
            todoListElement.appendChild(noTasksItem);
        } else {
            sortedTasks.forEach((task, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'todo-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `task-${index}-${task.dependantId}-${task.medicationDocId}`;
                checkbox.className = 'todo-checkbox';
                // Set initial state and styling based on whether task is already completed.
                if (task.isCompleted) {
                    checkbox.checked = true;
                    listItem.style.textDecoration = 'line-through';
                } else {
                    checkbox.checked = false;
                    listItem.style.textDecoration = 'none';
                }

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.className = 'todo-label';

                let dueTimeString = '';
                const now = new Date();
                const taskDateTime = task.doseDate;
                if (taskDateTime) {
                    const diffMilliseconds = now.getTime() - taskDateTime.getTime();
                    const diffMinutes = Math.round(diffMilliseconds / (1000 * 60));
                    dueTimeString = formatTimeDifference(diffMinutes);
                } else {
                    dueTimeString = '(Invalid Time)';
                }

                // Display the number of pills per dose along with medication name.
                label.innerHTML = `
                    <span class="dependant-name">${task.dependantName} ${task.dependantLName}</span><br>
                    <span class="med-details">${task.numPillsPerDose} x ${task.medicationName}</span>
                    <span class="med-time">at ${task.startTime}</span>
                    <span class="due-time">${dueTimeString}</span>
                `;

                // When the checkbox is changed, update Firestore and the UI styling.
                checkbox.addEventListener('change', function() {
                    markTaskComplete(globalUser, task, checkbox.checked, listItem);
                });

                listItem.appendChild(checkbox);
                listItem.appendChild(label);
                todoListElement.appendChild(listItem);

                if (dueTimeString.includes("Overdue")) {
                    listItem.classList.add("overdue");
                } else if (dueTimeString.includes("Due now")) {
                    listItem.classList.add("due-now");
                }
            });
        }
    } catch (error) {
        console.error("Error fetching data for today's tasks:", error);
        todoListElement.innerHTML = `<li style="color: red;">Error loading tasks: ${error.message}</li>`;
    }
}

/**
 * Parses a time string (e.g., "09:00 AM" or "14:30") into hours and minutes.
 */
function parseTimeString(timeStr) {
    try {
        const timePart = timeStr.split(' ')[0];
        const period = timeStr.split(' ')[1];
        let [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            if (period) throw new Error("Invalid time format parts");
        }
        if (period) {
            const upperPeriod = period.toUpperCase();
            if (upperPeriod === 'PM' && hours !== 12) hours += 12;
            if (upperPeriod === 'AM' && hours === 12) hours = 0;
            if(hours < 0 || hours > 23) throw new Error("Invalid hour after AM/PM conversion");
        }
        return { hours, minutes };
    } catch (e) {
        console.error("Error parsing time string:", timeStr, e);
        return null;
    }
}

/**
 * Creates a Date object for today at the time specified in taskTimeString.
 */
function getTaskDateTimeForToday(taskTimeString) {
    const parsedTime = parseTimeString(taskTimeString);
    if (!parsedTime) return null;
    const now = new Date();
    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parsedTime.hours,
        parsedTime.minutes,
        0,
        0
    );
}

/**
 * Formats the time difference into a user-friendly string.
 */
function formatTimeDifference(diffMinutes) {
    const absoluteMinutes = Math.abs(diffMinutes);
    if (absoluteMinutes <= 1) {
        return "Due now";
    } else if (diffMinutes > 60) {
        let hours = Math.floor(absoluteMinutes / 60);
        let minutes = absoluteMinutes - (hours * 60);
        return `Due ${hours} hours and ${minutes} minutes ago`;
    } else if (diffMinutes < -60) {
        let hours = Math.floor(absoluteMinutes / 60);
        let minutes = absoluteMinutes - (hours * 60);
        return `Due in ${hours} hours and ${minutes} minutes`;
    } else if (diffMinutes < 0) {
        return `Due in ${absoluteMinutes} min`;
    } else {
        return `Overdue by ${diffMinutes} min`;
    }
}

/**
 * Marks a task complete (or uncomplete) by updating Firestore and immediately updating the UI.
 * The document ID is formed using the medicationDocId and the task's startTime.
 * The listItem element is updated to show or remove a line‑through style.
 */
function markTaskComplete(userId, task, isComplete, listItem) {
    const completedTaskRef = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependants')
        .doc(task.dependantId)
        .collection('completed-tasks')
        .doc(`${task.medicationDocId}-${task.startTime}`);

    if (isComplete) {
        completedTaskRef.set({
            medicationName: task.medicationName,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            startTime: task.startTime,
            numPills: task.numPillsPerDose,
            isCompleted: true
        })
        .then(() => {
            console.log('Task marked as complete');
            if (listItem) listItem.style.textDecoration = "line-through";
            // Refresh the counts
            loadUpcomingTasksCount(userId);
            loadCompletedTasksCount(userId);
        })
        .catch((error) => {
            console.error('Error marking task complete:', error);
        });
    } else {
        completedTaskRef.delete()
        .then(() => {
            console.log('Task unmarked');
            if (listItem) listItem.style.textDecoration = "none";
            // Refresh the counts
            loadUpcomingTasksCount(userId);
            loadCompletedTasksCount(userId);
        })
        .catch((error) => {
            console.error('Error unmarking task:', error);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getNameFromAuth();
    getTodayTasks(globalUser);
});
