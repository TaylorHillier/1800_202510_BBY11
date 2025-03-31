var globalUserId;

class CalendarApp {
  constructor(containerId) {
      this.container = document.getElementById(containerId);
    
      if (!this.container) {
          console.error(`CalendarApp Error: Main container element with ID "${containerId}" not found.`);
          
          return;
      }
  
      this.calenderContainerId = containerId + "-container";
      this.calenderContainer = document.getElementById(this.calenderContainerId);
      this.currentDate = new Date(); // Date object for the currently viewed month
      this.selectedDate = null; // Stores the selected date string ('YYYY-MM-DD')
      this.sortedSchedule = []; 
  
      const pageurl = window.location.href;
      this.isSingleDependant = pageurl.includes('single_dependant');
      this.isCareTakerSchedule = pageurl.includes('caretaker-schedule');

     
      this.init();
  }

  /**
   * Initializes the basic structure of the calendar container if it doesn't exist
   * and renders the navigation controls.
   */
  init() {
      // Ensure the main container exists before trying to append to it
      if (!this.container) return;

      // Create the specific calendar container div if it's not already in the HTML
      if (this.calenderContainer == null) {
          const calCont = document.createElement('div');
          calCont.id = this.calenderContainerId; // Use the derived ID
          this.container.appendChild(calCont);
          this.calenderContainer = calCont;
      }

      // Ensure the calendar container exists before rendering into it
      if (!this.calenderContainer) {
          console.error("Failed to find or create calendar-container element.");
          return;
      }

      // Render the month navigation (prev/next buttons, month display)
      this.renderNavigation();
  }

  /**
   * Renders the previous/next month buttons and the current month/year display.
   * Removes existing navigation first to prevent duplicates.
   */
  renderNavigation() {
      if (!this.calenderContainer) return; // Don't render if container is missing

      const existingNav = this.calenderContainer.querySelector('.calendar-navigation');
      if (existingNav) existingNav.remove(); // Clean up old navigation

      const navContainer = document.createElement('div');
      navContainer.className = 'calendar-navigation';

      const prevButton = document.createElement('button');
      prevButton.innerText = '←'; // Previous month
      prevButton.addEventListener('click', () => this.changeMonth(-1));

      const nextButton = document.createElement('button');
      nextButton.innerText = '→'; // Next month
      nextButton.addEventListener('click', () => this.changeMonth(1));

      const monthYearDisplay = document.createElement('div');
      monthYearDisplay.id = 'month-year-display'; // ID for updating text
      monthYearDisplay.innerText = this.formatMonthYear(this.currentDate);

      navContainer.appendChild(prevButton);
      navContainer.appendChild(monthYearDisplay);
      navContainer.appendChild(nextButton);
      this.calenderContainer.appendChild(navContainer);
  }

  /**
   * Renders the main calendar grid for the current month (this.currentDate).
   * Includes weekday headers and numbered day cells.
   */
  renderCalendar() {
     
      if (!this.calenderContainer) {
          console.error("renderCalendar called but calenderContainer is not available.");
          return;
      }

      // Remove existing calendar grid to prevent duplicates
      const existingCalendar = this.calenderContainer.querySelector('.calendar-grid');
      if (existingCalendar) existingCalendar.remove();

      const calendarGrid = document.createElement('div');
      calendarGrid.className = 'calendar-grid';

      let weekdays = [];
      // Add weekday headers (Sun, Mon, ...)
      if(window.innerWidth > 500) {
       weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      } else {
        weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      }
      weekdays.forEach(day => {
          const dayHeader = document.createElement('div');
          dayHeader.className = 'calendar-weekday';
          dayHeader.innerText = day;
          calendarGrid.appendChild(dayHeader);
      });

      // Calculate first and last day of the current month
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startingDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Add empty padding cells for days before the 1st of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
          const paddingDay = document.createElement('div');
          paddingDay.className = 'calendar-day inactive'; 
          calendarGrid.appendChild(paddingDay);
      }

      // Create cells for each actual day of the month
      const today = new Date(); // Get today's date for comparison
      const todayDateString = today.toLocaleDateString('en-CA'); // Format 'YYYY-MM-DD'

      for (let day = 1; day <= totalDaysInMonth; day++) {
          const dayElement = document.createElement('div');
          dayElement.className = 'calendar-day';
          dayElement.innerText = day; // Display the day number

          // Store the date ('YYYY-MM-DD') in a data attribute for easy access
          const currentDayDate = new Date(year, month, day);
          const dateString = currentDayDate.toLocaleDateString('en-CA');
          dayElement.dataset.date = dateString;

          // Add click listener to select the date
          dayElement.addEventListener('click', () => this.selectDate(dayElement));

          // Highlight today's date
          if (dateString === todayDateString) {
              dayElement.classList.add('today');
          }
          calendarGrid.appendChild(dayElement);
      }
      this.calenderContainer.appendChild(calendarGrid);
      this.updateMonthDisplay(); // Ensure month/year text is correct
  }

  /**
   * Handles clicking on a day cell. Highlights the selected day and
   * renders the schedule details either below the calendar (mobile)
   * or in the sidebar (desktop).
   * @param {HTMLElement} dayElement - The clicked day cell element.
   */
  selectDate(dayElement) {
      if (!this.calenderContainer) return;

      // Remove 'selected' class from previously selected day
      const previousSelected = this.calenderContainer.querySelector('.selected');
      if (previousSelected) previousSelected.classList.remove('selected');

      // Add 'selected' class to the clicked day
      dayElement.classList.add('selected');
      this.selectedDate = dayElement.dataset.date; // Store the selected date string

      // Render details based on screen width
      if (window.innerWidth < 768) { 
          this.renderScheduleBelowCalendar();
      } else {
          this.renderSideBar();
      }
  }

  /**
   * Changes the currently viewed month and reloads/re-renders the calendar.
   * @param {number} delta - Change in months (-1 for previous, 1 for next).
   */
  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
  
    this.loadMedicationSchedules().then(() => {
      this.renderCalendar();
  
  
        this.renderScheduleOnCalendar();
      
  
      const previousSelected = this.calenderContainer?.querySelector('.selected');
      if (previousSelected) previousSelected.classList.remove('selected');
  
      // Determine which day to auto-select:
      const systemDate = new Date();
      let selectedCell;
      if (
        this.currentDate.getMonth() !== systemDate.getMonth() ||
        this.currentDate.getFullYear() !== systemDate.getFullYear()
      ) {
        // New month is not the current month: select the first available day.
        selectedCell = this.calenderContainer?.querySelector('.calendar-day:not(.inactive)');
      } else {
        // New month is the current month: select today's cell.
        const todayStr = systemDate.toLocaleDateString('en-CA');
        selectedCell = this.calenderContainer?.querySelector(`.calendar-day[data-date="${todayStr}"]`);
      }
      if (selectedCell) this.selectDate(selectedCell);
  
      console.log(this.selectedDate);
  
      this.clearSideBarOrBelow();
  
      if (window.innerWidth < 768) {
        this.renderScheduleBelowCalendar();
      } else {
        this.renderSideBar();
      }
    }).catch(error => {
      console.error("Error reloading schedules for new month:", error);
      if (this.calenderContainer) {
        this.calenderContainer.innerHTML = "<p>Error loading schedule data for the selected month.</p>";
      }
    });
  }
  

  /**
   * Helper function to clear the content of the sidebar and below-calendar details area.
   */
  clearSideBarOrBelow() {
      const sideBar = document.getElementById("calendar-sidebar");
      if (sideBar) sideBar.innerHTML = ""; // Clear sidebar content
      const belowContainer = document.getElementById('daily-schedule-container');
      if (belowContainer) belowContainer.innerHTML = ""; // Clear below-calendar content
  }

  /**
   * Formats a Date object into a "Month Year" string (e.g., "March 2025").
   * @param {Date} date - The date to format.
   * @returns {string} - The formatted month and year string.
   */
  formatMonthYear(date) {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  /**
   * Updates the text of the month/year display element in the navigation.
   */
  updateMonthDisplay() {
      if (!this.calenderContainer) return;
      const monthDisplay = this.calenderContainer.querySelector('#month-year-display');
      if (monthDisplay) monthDisplay.innerText = this.formatMonthYear(this.currentDate);
  }

  async loadMedicationSchedules() {
    if (!globalUserId) {
        console.error("Attempted to load schedules but globalUserId is not set.");
        this.sortedSchedule = [];
        return Promise.reject(new Error("User ID not available"));
    }

    let combinedSchedule = [];
    console.log(`loading medications for user: ${globalUserId}`);

    try {
        if (this.isCareTakerSchedule) {
            console.log("Loading caretaker schedule...");
            const dependantsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(globalUserId)
                .collection('dependants')
                .get();

            console.log(`Found ${dependantsSnapshot.size} dependants for caretaker.`);

            const promises = dependantsSnapshot.docs.map(async (dependantDoc) => {
                const dependantId = dependantDoc.id;
                const dependantData = dependantDoc.data();
                const dependantName = (dependantData.firstname && dependantData.lastname) ?
                    `${dependantData.firstname} ${dependantData.lastname}` :
                    `Unnamed (${dependantId.substring(0, 5)})`;

                console.log(`Processing meds for dependant: ${dependantName} (${dependantId})`);
                const medsSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(globalUserId)
                    .collection('dependants')
                    .doc(dependantId)
                    .collection('medications')
                    .get();

                console.log(`Found ${medsSnapshot.size} medication docs for ${dependantName}.`);
                let dependantScheduleEntries = [];
                medsSnapshot.forEach(doc => {
                    const medData = doc.data();
                    const medName = medData.name || 'Unknown Medication';

                    // For each medication, process its schedule array.
                    if (medData.schedule && Array.isArray(medData.schedule)) {
                        medData.schedule.forEach(entry => {
                            let processedEntry = { ...entry };
                            processedEntry.medication = medName;
                            processedEntry.dependantName = dependantName;
                            // NEW: Attach the numPillsPerDose field from the medication document.
                            processedEntry.numPillsPerDose = medData.numPillsPerDose || "1";

                            if (processedEntry.doseTime && processedEntry.doseTime.toDate) {
                                processedEntry.doseTime = processedEntry.doseTime.toDate();
                            } else if (processedEntry.doseTime) {
                                processedEntry.doseTime = new Date(processedEntry.doseTime);
                            } else {
                                console.warn(`Missing 'doseTime' for an entry in med '${medName}', dependant '${dependantName}'. Skipping.`);
                                return;
                            }

                            if (processedEntry.doseTime instanceof Date && !isNaN(processedEntry.doseTime)) {
                                dependantScheduleEntries.push(processedEntry);
                            } else {
                                console.warn(`Invalid 'doseTime' found for ${medName}, dependant ${dependantName}. Skipping.`);
                            }
                        });
                    }
                });
                return dependantScheduleEntries;
            });

            const allSchedules = await Promise.all(promises);
            combinedSchedule = allSchedules.flat();

        } else if (this.isSingleDependant) {
            const urlParams = new URLSearchParams(window.location.search);
            const dependantId = urlParams.get('id');
            if (!dependantId) {
                console.error("Single dependant view, but no 'id' found in URL parameters.");
                this.sortedSchedule = [];
                return Promise.reject(new Error("Missing dependant ID in URL"));
            }

            console.log(`Loading single dependant schedule for dependant ID: ${dependantId}`);

            const medsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(globalUserId)
                .collection('dependants')
                .doc(dependantId)
                .collection('medications')
                .get();

            console.log(`Found ${medsSnapshot.size} medication docs for dependant ${dependantId}.`);

            medsSnapshot.forEach(doc => {
                const medData = doc.data();
                const medName = medData.name || 'Unknown Medication';

                if (medData.schedule && Array.isArray(medData.schedule)) {
                    medData.schedule.forEach(entry => {
                        let processedEntry = { ...entry };
                        processedEntry.medication = medName;
                        // NEW: Attach numPillsPerDose from the medication document.
                        processedEntry.numPillsPerDose = medData.numPillsPerDose || "1";

                        if (processedEntry.doseTime && processedEntry.doseTime.toDate) {
                            processedEntry.doseTime = processedEntry.doseTime.toDate();
                        } else if (processedEntry.doseTime) {
                            processedEntry.doseTime = new Date(processedEntry.doseTime);
                        } else {
                            console.warn(`Missing 'doseTime' for an entry in med '${medName}', dependant '${dependantId}'. Skipping.`);
                            return;
                        }

                        if (processedEntry.doseTime instanceof Date && !isNaN(processedEntry.doseTime)) {
                            combinedSchedule.push(processedEntry);
                        } else {
                            console.warn(`Invalid 'doseTime' found for ${medName}, dependant ${dependantId}. Skipping.`);
                        }
                    });
                }
            });
        } else {
            console.log("Not a caretaker or single dependant schedule page. No schedules loaded.");
        }

        combinedSchedule.sort((a, b) => a.doseTime - b.doseTime);
        this.sortedSchedule = combinedSchedule;

        console.log("Loaded and sorted schedule entries:", this.sortedSchedule.length);

    } catch (error) {
        console.error("Error loading medication schedules from Firestore:", error);
        this.sortedSchedule = [];
        if (this.calenderContainer) {
            this.calenderContainer.innerHTML = "";
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Error loading schedule data. Please check console and try refreshing.";
            errorMsg.style.color = 'red';
            this.calenderContainer.appendChild(errorMsg);
        }
        return Promise.reject(error);
    }
    return Promise.resolve();
}

/**
 * Renders medication summaries directly onto the calendar day cells.
 * Each summary now includes the number of pills per dose along with the medication name and time.
 */
renderScheduleOnCalendar() {
    if (!this.calenderContainer) {
        console.error("renderScheduleOnCalendar called but calenderContainer is not available.");
        return;
    }
    console.log("Rendering schedule summaries on calendar cells...");

    this.calenderContainer.querySelectorAll('.calendar-day .entry-container').forEach(container => {
        container.remove();
    });

    let groupedEntries = {};
    this.sortedSchedule.forEach(entry => {
        if (!(entry.doseTime instanceof Date) || isNaN(entry.doseTime)) {
            console.warn("Skipping entry with invalid doseTime during calendar rendering:", entry);
            return;
        }
        const formattedDate = entry.doseTime.toLocaleDateString('en-CA');
        if (!groupedEntries[formattedDate]) {
            groupedEntries[formattedDate] = {};
        }
        let groupKey = 'default';
        if (this.isCareTakerSchedule) {
            groupKey = entry.dependantName || 'Unknown Dependant';
        }
        if (!groupedEntries[formattedDate][groupKey]) {
            groupedEntries[formattedDate][groupKey] = [];
        }
        groupedEntries[formattedDate][groupKey].push(entry);
    });

    for (const date in groupedEntries) {
        const dayCell = this.calenderContainer.querySelector(`.calendar-day[data-date="${date}"]`);
        if (!dayCell) continue;

        const dateGroups = groupedEntries[date];

        let mainEntryContainer = dayCell.querySelector('.day-schedule-wrapper');
        if (!mainEntryContainer) {
            mainEntryContainer = document.createElement('div');
            mainEntryContainer.className = 'day-schedule-wrapper';
            dayCell.appendChild(mainEntryContainer);
        }

        let sum = 0;
        for (const groupKey in dateGroups) {
            const events = dateGroups[groupKey];
            const groupContainer = document.createElement('div');
            groupContainer.className = 'entry-container';
            groupContainer.setAttribute('data-group', groupKey);

            let header = document.createElement('div');
            if(window.innerWidth > 768) {
                if (this.isCareTakerSchedule && groupKey !== 'default') {
                    header.className = 'entry-header-small';
                    header.innerText = groupKey.split(' ')[0];
                    groupContainer.appendChild(header);
                }
      
                const summary = document.createElement('div');
                summary.className = 'medication-summary';
                // NEW: Display the number of pills per dose along with medication name.
                summary.innerHTML = `<div id='event-quant' class='event-quant'>${events.length}</div>`;
                if(this.isCareTakerSchedule){
                    header.appendChild(summary);
                } else {
                    groupContainer.appendChild(summary);
                }

                mainEntryContainer.appendChild(groupContainer);
            } else {
                sum += events.length;

                if(this.isSingleDependant){
                    const summary = document.createElement('div');
                    summary.className = 'medication-summary';
                    summary.innerHTML = `<div id='event-quant' class='event-quant'>${events.length}</div>`;
                    groupContainer.appendChild(summary);
                    mainEntryContainer.appendChild(groupContainer);
                }
            }
        }

        if(this.isCareTakerSchedule && sum !== 0) {
            const groupContainer = document.createElement('div');
            groupContainer.className = 'entry-container';

            const summary = document.createElement('div');
            summary.className = 'medication-summary';
            summary.innerHTML = `<div id='event-quant' class='event-quant'>${sum} events</div>`;

            groupContainer.appendChild(summary);
            mainEntryContainer.appendChild(groupContainer);
        }
    }
    console.log("Finished rendering schedule summaries.");
}

/**
 * Renders the detailed schedule for the selected date below the calendar.
 * Each entry now shows the number of pills per dose plus the medication name at the scheduled time.
 */
renderScheduleBelowCalendar() {
    if (!this.container) {
        console.error("Cannot render schedule below, main container not found.");
        return;
    }

    let detailsContainer = document.getElementById('daily-schedule-container');
    if (!detailsContainer) {
        detailsContainer = document.createElement('div');
        detailsContainer.id = 'daily-schedule-container';
        detailsContainer.style.marginTop = '20px';
        this.container.appendChild(detailsContainer);
    }
    detailsContainer.innerHTML = "";

    if (!this.selectedDate) {
        detailsContainer.innerText = "Select a date to view the schedule.";
        return;
    }

    console.log(`Rendering schedule details below calendar for: ${this.selectedDate}`);

    let entriesToRender = this.sortedSchedule.filter(entry =>
        entry.doseTime instanceof Date &&
        !isNaN(entry.doseTime) &&
        entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );

    if (entriesToRender.length === 0) {
        detailsContainer.innerText = "No scheduled medications for this day.";
        return;
    }

    if (this.isCareTakerSchedule) {
        let groups = {};
        entriesToRender.forEach(entry => {
            const name = entry.dependantName || 'Unknown Dependant';
            groups[name] = groups[name] || [];
            groups[name].push(entry);
        });

        for (const name in groups) {
            let groupContainer = document.createElement('div');
            groupContainer.className = 'entry-group-below';
            let header = document.createElement('h5');
            header.innerText = name;
            groupContainer.appendChild(header);

            groups[name].forEach(entry => {
                const medEntry = document.createElement('div');
                medEntry.className = 'medication-entry-below';
                const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                // NEW: Display number of pills per dose along with medication name.
                medEntry.innerText = `• ${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
                groupContainer.appendChild(medEntry);
            });
            detailsContainer.appendChild(groupContainer);
        }
    } else {
        const header = document.createElement('h4');
        try {
            const dateObj = new Date(this.selectedDate + 'T00:00:00');
            header.textContent = `Schedule for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        } catch(e) {
            header.textContent = `Schedule for ${this.selectedDate}`;
        }
        detailsContainer.appendChild(header);

        entriesToRender.forEach(entry => {
            const medEntry = document.createElement('div');
            medEntry.className = 'medication-entry-below';
            const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            medEntry.innerText = `• ${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
            detailsContainer.appendChild(medEntry);
        });
    }
}

/**
 * Renders the detailed schedule for the selected date in a sidebar.
 * Each entry now includes the number of pills per dose along with the medication name and time.
 */
renderSideBar() {
    if (!this.container) {
        console.error("Cannot render sidebar, main container not found.");
        return;
    }

    let sideBar = document.getElementById("calendar-sidebar");
    if (!sideBar) {
        sideBar = document.createElement("aside");
        sideBar.id = "calendar-sidebar";
        this.container.appendChild(sideBar);
    }
    sideBar.innerHTML = "";

    if (!this.selectedDate) {
        sideBar.innerText = "Select a date to view details.";
        return;
    }

    console.log(`Rendering schedule details in sidebar for: ${this.selectedDate}`);

    let entriesToRender = this.sortedSchedule.filter(
        entry => entry.doseTime instanceof Date && !isNaN(entry.doseTime) &&
        entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );

    const header = document.createElement('h4');
    try {
        const dateObj = new Date(this.selectedDate + 'T00:00:00');
        header.textContent = `Schedule for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
    } catch(e) {
        header.textContent = `Schedule for ${this.selectedDate}`;
    }
    sideBar.appendChild(header);

    if (entriesToRender.length === 0) {
        const noEventsMsg = document.createElement('p');
        noEventsMsg.innerText = "No scheduled medications for this day.";
        sideBar.appendChild(noEventsMsg);
        return;
    }

    if (this.isCareTakerSchedule) {
        let groups = {};
        entriesToRender.forEach(entry => {
            const name = entry.dependantName || 'Unknown Dependant';
            groups[name] = groups[name] || [];
            groups[name].push(entry);
        });

        for (const name in groups) {
            let groupList = document.createElement('ul');
            groupList.className = 'sidebar-list-group';
            let listHeader = document.createElement('h5');
            listHeader.innerText = name;
            sideBar.appendChild(listHeader);
            sideBar.appendChild(groupList);

            groups[name].forEach(entry => {
                const medEntry = document.createElement('li');
                medEntry.className = 'medication-entry-sidebar';
                const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                // NEW: Show number of pills per dose.
                medEntry.innerText = `${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
                groupList.appendChild(medEntry);
            });
        }
    } else {
        const groupList = document.createElement('ul');
        groupList.className = 'sidebar-list-single';
        sideBar.appendChild(groupList);

        entriesToRender.forEach(entry => {
            const medEntry = document.createElement('li');
            medEntry.className = 'medication-entry-sidebar';
            const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            medEntry.innerText = `${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
            groupList.appendChild(medEntry);
        });
    }
}

} // --- End of CalendarApp Class Definition ---


// --- Initialize after DOM loaded AND user authenticated ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Setting up Firebase auth listener.");

    // Get the main container element where the calendar/login message will be displayed
    const calendarAppHostElement = document.getElementById('calendar');
     if (!calendarAppHostElement) {
         console.error("CRITICAL: The main host element with ID 'calendar' was not found in the HTML. Cannot initialize application.");
         document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Error: Application container missing.</p>"; // Display critical error
         return;
     }


    // Listen for changes in Firebase authentication state
    firebase.auth().onAuthStateChanged(user => {

        if (user) {
            // --- User is Signed In ---
            globalUserId = user.uid; // Set the global variable
            console.log("Firebase Auth: User signed in with UID:", globalUserId);

             // Ensure the host element is empty before initializing
            calendarAppHostElement.innerHTML = '';

            console.log("Initializing CalendarApp...");
            // Create an instance of the CalendarApp, passing the host element's ID
            const calendar = new CalendarApp('calendar');

            // Check if the CalendarApp instance was created successfully (constructor checks container)
            if (!calendar || !calendar.container) {
                console.error("Failed to initialize CalendarApp instance properly (likely container issue).");
                 calendarAppHostElement.innerHTML = "<p style='color:red;'>Error initializing calendar component.</p>";
                return;
            }

            console.log("Calling loadMedicationSchedules...");
            // Load schedules FIRST, then render the calendar with the data
            calendar.loadMedicationSchedules().then(() => {
                console.log("Schedules loaded successfully. Rendering calendar view.");

                calendar.renderCalendar(); // Render the calendar grid structure

      
                calendar.renderScheduleOnCalendar(); // Add summaries to cells
                

                const todayElement = calendar.calenderContainer?.querySelector('.calendar-day.today');
                if (todayElement) {
                     console.log("Auto-selecting today's date.");
                    calendar.selectDate(todayElement);
                } else {
                    console.log("Today's date not in current view or not found, no auto-selection.");
                }

                console.log("Calendar rendering process complete.");

            }).catch(error => {
               
                console.error("Error during calendar setup (loading/rendering):", error);
                 // Display error within the host element
                 calendarAppHostElement.innerHTML = ''; 
                 const errorMsg = document.createElement('p');
                 errorMsg.textContent = `Error loading schedule data: ${error.message || 'Please try again later.'}`;
                 errorMsg.style.color = 'red';
                 calendarAppHostElement.appendChild(errorMsg);

            });

        } else {
 
            console.log("Firebase Auth: No user signed in.");
            globalUserId = null; 

            calendarAppHostElement.innerHTML = '<p>Please log in to view your medication schedule.</p>';

            const appSpecificContainer = document.getElementById('calendar-container');
            if (appSpecificContainer) appSpecificContainer.remove();
            const sidebar = document.getElementById('calendar-sidebar');
            if (sidebar) sidebar.remove();
            const belowDetails = document.getElementById('daily-schedule-container');
             if (belowDetails) belowDetails.remove();
        }
    });
});