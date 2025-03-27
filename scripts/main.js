var globalUser;

function getNameFromAuth() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in:", user.uid);
            console.log("User display name:", user.displayName);
            userName = user.displayName.split(" ")[0];

            globalUser = user.uid;
            document.getElementById("user-name").innerText = userName;

            getTodayTasks(globalUser);
           
        } else {
            console.log("No user is logged in");
        }
    });
}

function generateMedicationTimeline(startTime, frequency, numPills) {
    const times = [];
    const [hours, minutes] = startTime.split(':').map(Number);

    switch (frequency) {
        case 'Every 4 Hours':
            times.push(
                formatTime(hours, minutes),
                formatTime(hours + 4, minutes),
                formatTime(hours + 8, minutes),
                formatTime(hours + 12, minutes),
                formatTime(hours + 16, minutes),
                formatTime(hours + 20, minutes)
            );
            break;

        case 'Every 6 Hours':
            times.push(
                formatTime(hours, minutes),
                formatTime(hours + 6, minutes),
                formatTime(hours + 12, minutes),
                formatTime(hours + 18, minutes)
            );
            break;

        case 'Every 8 Hours':
            times.push(
                formatTime(hours, minutes),
                formatTime(hours + 8, minutes),
                formatTime(hours + 16, minutes)
            );
            break;

        case 'Every 12 Hours':
            times.push(
                formatTime(hours, minutes),
                formatTime(hours + 12, minutes)
            );
            break;

        case 'Daily':
            times.push(formatTime(hours, minutes));
            break;

        default:
            times.push(formatTime(hours, minutes));
    }

    return times;
}

function formatTime(hours, minutes) {
    // Adjust hours for 12-hour format
    const adjustedHours = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Pad with leading zeros
    const formattedHours = adjustedHours.toString().padStart(2, '0');
    const formattedMinutes = (minutes || 0).toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}


/**
 * Fetches and displays medication tasks scheduled for today for all dependants.
 * Uses async/await for clarity.
 * Assumes generateMedicationTimeline(startTime, frequency, numPills) exists and returns an array of time strings (e.g., ['09:00 AM', '05:00 PM']).
 * Assumes markTaskComplete(userId, taskObject, isChecked) exists.
 */
async function getTodayTasks(user) { // Make the function async
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Normalize today's date to midnight for comparison

    const todoListElement = document.getElementById("today");

    if (!todoListElement) {
        console.error("Todo list element (#today) not found!");
        return;
    }

    // Clear existing list before fetching
    todoListElement.innerHTML = '<li>Loading tasks...</li>'; // Indicate loading

    try {
        // 1. Get all dependants for the current user
        const dependantsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(globalUser) // <<< Use user.uid consistently
            .collection('dependants')
            .get();

        const uniqueTaskKeys = new Set(); // Set to track unique task keys
        let allTasks = []; // Array to store the actual task objects

        // 2. Create promises to fetch and process medications for each dependant
        const taskProcessingPromises = dependantsSnapshot.docs.map(async (dependantDoc) => { // Use async here too
            const dependantId = dependantDoc.id;
            const dependantData = dependantDoc.data();
            // Provide default names if missing
            const dependantName = dependantData.firstname || 'Unknown';
            const dependantLName = dependantData.lastname || '';

            try {
                // 3. Fetch medications for this specific dependant
                const medicationsSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(globalUser) // <<< Use user.uid
                    .collection('dependants')
                    .doc(dependantId)
                    .collection('medications')
                    .get();

                // 4. Process each medication
                medicationsSnapshot.forEach(medDoc => {
                    const medData = medDoc.data();
                    const medName = medData.name || 'Unnamed Medication';

                    // --- Robust Date Parsing and Comparison ---
                    let medStartDate, medEndDate;
                    try {
                        // Handle Firestore Timestamp or Date String (YYYY-MM-DD)
                        if (medData.startDate?.toDate) { // Is it a Timestamp?
                            medStartDate = medData.startDate.toDate();
                        } else if (typeof medData.startDate === 'string') {
                            // Assume 'YYYY-MM-DD', append time to parse as local midnight
                            medStartDate = new Date(medData.startDate + 'T00:00:00');
                        }

                        if (medData.endDate?.toDate) {
                            medEndDate = medData.endDate.toDate();
                        } else if (typeof medData.endDate === 'string') {
                            medEndDate = new Date(medData.endDate + 'T00:00:00');
                        }

                        // Check if dates are valid before proceeding
                        if (medStartDate instanceof Date && !isNaN(medStartDate) &&
                            medEndDate instanceof Date && !isNaN(medEndDate))
                        {
                            // Normalize medication dates to midnight for accurate comparison
                            medStartDate.setHours(0, 0, 0, 0);
                            // Set end date to end of day for inclusive comparison? Optional.
                            // Example: medEndDate.setHours(23, 59, 59, 999);
                            // Or keep as start of day if end date means "up to but not including".
                            // Current logic assumes end date is inclusive start-of-day.
                            medEndDate.setHours(0, 0, 0, 0);

                            // Compare date parts only
                            if (todayStart >= medStartDate && todayStart <= medEndDate) {
                                // --- Medication is active today, generate times ---

                                // Assuming generateMedicationTimeline exists and works
                                const medicationTimes = generateMedicationTimeline(
                                    medData.startTime || '09:00', // Default start time if missing
                                    medData.frequency,
                                    medData.numPills // numPills might not be needed by generator? Check its signature.
                                );

                                // 5. Create and add unique task objects
                                medicationTimes.forEach(time => {
                                    // Create a unique key for this specific dose instance
                                    const taskKey = `${dependantId}-${medDoc.id}-${time}-${medName}`;

                                    // Check if this exact task instance is already added
                                    if (!uniqueTaskKeys.has(taskKey)) {
                                        uniqueTaskKeys.add(taskKey); // Add key to Set

                                        const taskObject = {
                                            dependantId: dependantId,
                                            dependantName: dependantName,
                                            dependantLName: dependantLName,
                                            medicationName: medName,
                                            startTime: time, // The specific time for this task instance
                                            numPills: medData.numPills || 1, // Default pills if missing
                                            frequency: medData.frequency,
                                            medicationDocId: medDoc.id,
                                            // Add original start/end dates if needed later
                                            medStartDate: medStartDate,
                                            medEndDate: medEndDate
                                        };

                                        allTasks.push(taskObject); // <<< Add the object to the array
                                    }
                                });
                            }
                        } else {
                            console.warn(`Medication '${medName}' for ${dependantName} has invalid or missing start/end dates.`);
                        }
                    } catch (dateError) {
                        console.error(`Error processing dates for med '${medName}', dependant '${dependantName}':`, dateError, medData.startDate, medData.endDate);
                    }
                }); // End medicationsSnapshot.forEach

            } catch (medError) {
                console.error(`Error fetching medications for ${dependantName} ${dependantLName}:`, medError);
                // Optionally, decide if you want to stop everything if one dependant fails
                // Or just skip this dependant's tasks. Current logic skips.
            }
        }); // End dependantsSnapshot.docs.map

        // 6. Wait for all dependant medication processing to complete
        await Promise.all(taskProcessingPromises);

        // --- All data fetched and processed, now sort and display ---

        // 7. Sort the collected tasks by time
        const sortedTasks = allTasks // <<< Use the array containing the objects
            .sort((a, b) => {
                // Helper to convert time string (e.g., "09:00 AM") to minutes since midnight
                const convertToMinutes = (timeStr) => {
                     try {
                         const [timePart, period] = timeStr.split(' ');
                         let [hours, minutes] = timePart.split(':').map(Number);

                         if (period && period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                         if (period && period.toUpperCase() === 'AM' && hours === 12) hours = 0; // Midnight case

                         if (isNaN(hours) || isNaN(minutes)) return -1; // Invalid time format

                         return hours * 60 + minutes;
                     } catch(e){
                         console.error("Error converting time to minutes:", timeStr, e);
                         return -1; // Handle potential errors in time format
                     }
                };
                return convertToMinutes(a.startTime) - convertToMinutes(b.startTime);
            });

        // 8. Display the sorted tasks or "No tasks" message
        todoListElement.innerHTML = ''; // Clear "Loading..." message
        if (sortedTasks.length === 0) {
            const noTasksItem = document.createElement('li');
            noTasksItem.textContent = 'No medications scheduled for today';
            todoListElement.appendChild(noTasksItem);
        } else {
            sortedTasks.forEach((task, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'todo-item'; // Add class for styling

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `task-${index}-${task.dependantId}-${task.medicationDocId}`; // More unique ID
                checkbox.className = 'todo-checkbox';
                 // TODO: Check if task is already marked complete for today?
                 // checkbox.checked = checkCompletionStatus(user.uid, task); // Needs implementation

                checkbox.addEventListener('change', () => {
                    // Call function to update completion status in Firestore
                    markTaskComplete(globalUser, task, checkbox.checked);
                     // Optional: Add/remove a 'completed' class for styling
                    listItem.classList.toggle('completed', checkbox.checked);
                });

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.className = 'todo-label';
                // Use innerHTML carefully or create elements individually for safety
                label.innerHTML = `
                    <span class="dependant-name">${task.dependantName} ${task.dependantLName}</span><br>
                    <span class="med-details">${task.numPills} x ${task.medicationName}</span>
                    <span class="med-time">at ${task.startTime}</span>
                `;

                listItem.appendChild(checkbox);
                listItem.appendChild(label);
                todoListElement.appendChild(listItem);
            });
        }

    } catch (error) {
        console.error("Error fetching data for today's tasks:", error);
        // Display a general error message to the user
        todoListElement.innerHTML = `<li style="color: red;">Error loading tasks: ${error.message}</li>`;
    }
}

function markTaskComplete(userId, task, isComplete) {
    // Create a collection to track completed tasks
    const completedTaskRef = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('dependants')
        .doc(task.dependantId)
        .collection('completed-tasks')
        .doc(`${task.medicationDocId}-${task.startTime}`);

    if (isComplete) {
        // Mark task as complete
        completedTaskRef.set({
            medicationName: task.medicationName,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            startTime: task.startTime,
            numPills: task.numPills
        })
            .then(() => {
                console.log('Task marked as complete');
            })
            .catch((error) => {
                console.error('Error marking task complete:', error);
            });
    } else {
        // Remove the completed task entry if unchecked
        completedTaskRef.delete()
            .then(() => {
                console.log('Task unmarked');
            })
            .catch((error) => {
                console.error('Error unmarking task:', error);
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getNameFromAuth();
    getTodayTasks(globalUser);

    
})