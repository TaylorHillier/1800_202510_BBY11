function getNameFromAuth() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in:", user.uid);
            console.log("User display name:", user.displayName);
            userName = user.displayName.split(" ")[0];

            document.getElementById("user-name").innerText = userName;

            // Delay to ensure DOM is fully loaded
            setTimeout(() => {
                getTodayTasks(user);
            }, 500);
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
    const adjustedHours = hours % 12 || 12; // Convert 0 to 12
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Pad with leading zeros
    const formattedHours = adjustedHours.toString().padStart(2, '0');
    const formattedMinutes = (minutes || 0).toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}


function getTodayTasks(user) {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    const todoListElement = document.getElementById("today");

    if (!todoListElement) {
        console.error("Todo list element not found!");
        return;
    }

    // Clear existing list
    todoListElement.innerHTML = '';

    // Get all dependants for the user
    firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('dependants')
        .get()
        .then(dependantsSnapshot => {
            // Set to store unique tasks
            const uniqueTasks = new Set();

            // Promises to track async operations
            const taskPromises = dependantsSnapshot.docs.map(dependantDoc => {
                const dependantId = dependantDoc.id;
                const dependantName = dependantDoc.data().firstname;
                const dependantLName = dependantDoc.data().lastname;

                // Fetch medications for each dependant
                return firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('dependants')
                    .doc(dependantId)
                    .collection('medications')
                    .get()
                    .then(medicationsSnapshot => {
                        medicationsSnapshot.forEach(medDoc => {
                            const medData = medDoc.data();

                            // Check if medication is valid for today
                            const startDate = new Date(medData.startDate);
                            const endDate = new Date(medData.endDate);

                            if (today >= startDate && today <= endDate) {
                                // Generate timeline for this medication
                                const medicationTimes = generateMedicationTimeline(
                                    medData.startTime || '09:00',
                                    medData.frequency,
                                    medData.numPills
                                );

                                // Create tasks for each medication time
                                medicationTimes.forEach(time => {
                                    // Create a unique task key
                                    const taskKey = `${dependantId}-${medDoc.id}-${time}-${medData.name}`;

                                    // Only add if not already in uniqueTasks
                                    if (!uniqueTasks.has(taskKey)) {
                                        uniqueTasks.add(taskKey);

                                        const taskObject = {
                                            dependantId: dependantId,
                                            dependantName: dependantName,
                                            dependantLName: dependantLName,
                                            medicationName: medData.name,
                                            startTime: time,
                                            numPills: medData.numPills,
                                            frequency: medData.frequency,
                                            medicationDocId: medDoc.id
                                        };

                                        // Store the task object with the unique key
                                        uniqueTasks[taskKey] = taskObject;
                                    }
                                });
                            }
                        });
                    })
                    .catch(error => {
                        console.error(`Error fetching medications for ${dependantName} ${dependantLName}:`, error);
                    });
            });

            // Once all tasks are collected, sort and display
            Promise.all(taskPromises).then(() => {
                // Convert unique tasks to an array and sort
                const sortedTasks = Object.values(uniqueTasks)
                    .filter(task => task.dependantName) // Ensure it's a valid task
                    .sort((a, b) => {
                        // Convert time to 24-hour format for accurate sorting
                        const convertTo24Hour = (time) => {
                            const [t, period] = time.split(' ');
                            let [hours, minutes] = t.split(':').map(Number);
                            if (period === 'PM' && hours !== 12) hours += 12;
                            if (period === 'AM' && hours === 12) hours = 0;
                            return hours * 60 + minutes;
                        };

                        return convertTo24Hour(a.startTime) - convertTo24Hour(b.startTime);
                    });

                // Display sorted tasks
                sortedTasks.forEach((task, index) => {
                    const listItem = document.createElement('li');

                    // Create checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `task-${index}`;

                    // Add event listener to handle task completion
                    checkbox.addEventListener('change', () => {
                        markTaskComplete(user.uid, task, checkbox.checked);
                    });

                    // Create label for task details
                    const label = document.createElement('label');
                    label.htmlFor = `task-${index}`;
                    label.innerHTML = `
                        <strong>${task.dependantName} ${task.dependantLName} </strong><br>
                        ${task.numPills} ${task.medicationName} 
                        at ${task.startTime} 
                    `;

                    // Append checkbox and label to list item
                    listItem.appendChild(checkbox);
                    listItem.appendChild(label);
                    todoListElement.appendChild(listItem);
                });

                // If no tasks, show a message
                if (sortedTasks.length === 0) {
                    const noTasksItem = document.createElement('li');
                    noTasksItem.textContent = 'No medications scheduled for today';
                    todoListElement.appendChild(noTasksItem);
                }
            })
                .catch(error => {
                    console.error("Error processing tasks:", error);
                });
        })
        .catch(error => {
            console.error("Error fetching dependants:", error);
        });
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



getNameFromAuth(); //run the function