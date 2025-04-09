// Global variable to hold the signed-in user’s UID.
var globalUserId;

/**
 * CalendarApp class manages the calendar view, schedule loading, and rendering.
 */
class CalendarApp {
  /**
   * Creates an instance of CalendarApp.
   * @param {string} containerId - The ID of the main container element.
   */
  constructor(containerId) {
    // Get the main container element.
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`CalendarApp Error: Main container element with ID "${containerId}" not found.`);
      return;
    }

    // Define the calendar container ID and obtain the corresponding DOM element.
    this.calendarContainerId = containerId + "-container";
    this.calendarContainer = document.getElementById(this.calendarContainerId);
    this.currentDate = new Date(); // Current month/year view.
    this.selectedDate = null; // Currently selected date (formatted as 'YYYY-MM-DD').
    this.sortedSchedule = []; // Array to store sorted schedule entries.
    this.calendarHeight = null;

    // Determine page mode based on URL.
    const pageUrl = window.location.href;
    this.isSingleDependant = pageUrl.includes('single_dependent');
    this.isCareTakerSchedule = pageUrl.includes('caretaker-schedule');

    this.init();
  }

  /**
   * Initializes the calendar container.
   * If the container for the calendar does not exist, it creates one and then renders the navigation.
   */
  init() {
    if (!this.container) return;

    // Create the calendar container if it doesn't exist.
    if (!this.calendarContainer) {
      const calContainer = document.createElement('div');
      calContainer.id = this.calendarContainerId;
      this.container.appendChild(calContainer);
      this.calendarContainer = calContainer;
    }

    if (!this.calendarContainer) {
      console.error("Failed to find or create calendar container element.");
      return;
    }

    // Render navigation controls (prev/next buttons and month/year display).
    this.renderNavigation();
  }

  /**
   * Renders the navigation controls for the calendar.
   * This includes the previous and next month buttons, and the current month/year display.
   */
  renderNavigation() {
    if (!this.calendarContainer) return;

    // Remove any existing navigation to avoid duplicates.
    const existingNav = this.calendarContainer.querySelector('.calendar-navigation');
    if (existingNav) existingNav.remove();

    const navContainer = document.createElement('div');
    navContainer.className = 'calendar-navigation';

    // Previous month button.
    const prevButton = document.createElement('button');
    prevButton.innerText = '←';
    prevButton.addEventListener('click', () => this.changeMonth(-1));

    // Next month button.
    const nextButton = document.createElement('button');
    nextButton.innerText = '→';
    nextButton.addEventListener('click', () => this.changeMonth(1));

    // Month and year display.
    const monthYearDisplay = document.createElement('div');
    monthYearDisplay.id = 'month-year-display';
    monthYearDisplay.innerText = this.formatMonthYear(this.currentDate);

    navContainer.appendChild(prevButton);
    navContainer.appendChild(monthYearDisplay);
    navContainer.appendChild(nextButton);
    this.calendarContainer.appendChild(navContainer);
  }

  /**
   * Renders the main calendar grid for the current month.
   * It creates weekday headers and day cells, and marks today’s cell.
   */
  renderCalendar() {
    if (!this.calendarContainer) {
      console.error("renderCalendar called but calendar container is not available.");
      return;
    }

    // Remove existing calendar grid to prevent duplicates.
    const existingCalendar = this.calendarContainer.querySelector('.calendar-grid');
    if (existingCalendar) existingCalendar.remove();

    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    // Determine weekday headers.
    const weekdays = window.innerWidth > 500
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    weekdays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-weekday';
      dayHeader.innerText = day;
      calendarGrid.appendChild(dayHeader);
    });

    // Calculate first and last day of the month.
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Add empty padding cells for days before the first day.
    for (let i = 0; i < startingDayOfWeek; i++) {
      const paddingDay = document.createElement('div');
      paddingDay.className = 'calendar-day inactive';
      calendarGrid.appendChild(paddingDay);
    }

    // Create day cells.
    const today = new Date();
    const todayDateString = today.toLocaleDateString('en-CA');
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.innerText = day;
      const currentDayDate = new Date(year, month, day);
      const dateString = currentDayDate.toLocaleDateString('en-CA');
      dayElement.dataset.date = dateString;
      dayElement.addEventListener('click', () => this.selectDate(dayElement));
      if (dateString === todayDateString) {
        dayElement.classList.add('today');
      }
      calendarGrid.appendChild(dayElement);
    }

    this.calendarContainer.appendChild(calendarGrid);
    this.updateMonthDisplay();
  }

  /**
   * Handles the selection of a day cell.
   * It highlights the selected cell and renders schedule details either below the calendar or in a sidebar.
   * @param {HTMLElement} dayElement - The clicked day cell element.
   */
  selectDate(dayElement) {
    if (!this.calendarContainer) return;

    // Remove the "selected" class from previously selected cell.
    const previousSelected = this.calendarContainer.querySelector('.selected');
    if (previousSelected) previousSelected.classList.remove('selected');

    // Mark the clicked cell as selected.
    dayElement.classList.add('selected');
    this.selectedDate = dayElement.dataset.date;

    // Render schedule details depending on screen size.
    if (window.innerWidth < 992) {
      this.renderScheduleBelowCalendar();
    } else {
      this.renderSideBar();
    }
  }

  /**
   * Changes the current month view by a given delta and updates the calendar.
   * @param {number} delta - Change in month (-1 for previous, 1 for next).
   */
  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.updateCalendarView();
  }

  /**
   * A helper method that reloads medication schedules, re-renders the calendar, and auto-selects today if possible.
   */
  updateCalendarView() {
    this.loadMedicationSchedules()
      .then(() => {
        this.renderCalendar();
        this.renderScheduleOnCalendar();
        const todayElement = this.calendarContainer.querySelector('.calendar-day.today');
        if (todayElement) {
          this.selectDate(todayElement);
        } else {
          console.log("Today's date not in view or not found, no auto-selection.");
        }
      })
      .catch(error => {
        console.error("Error updating calendar view:", error);
        if (this.calendarContainer) {
          this.calendarContainer.innerHTML = "<p>Error loading schedule data for the selected month.</p>";
        }
      });
  }

  /**
   * Clears content from the sidebar and below-calendar schedule sections.
   */
  clearSideBarOrBelow() {
    const sideBar = document.getElementById("calendar-sidebar");
    if (sideBar) sideBar.innerHTML = "";
    const belowContainer = document.getElementById('daily-schedule-container');
    if (belowContainer) belowContainer.innerHTML = "";
  }

  /**
   * Formats a Date object into a "Month Year" string.
   * @param {Date} date - The date to format.
   * @returns {string} The formatted month and year.
   */
  formatMonthYear(date) {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  /**
   * Updates the month/year display element.
   */
  updateMonthDisplay() {
    if (!this.calendarContainer) return;
    const monthDisplay = this.calendarContainer.querySelector('#month-year-display');
    if (monthDisplay) monthDisplay.innerText = this.formatMonthYear(this.currentDate);
  }

  /**
   * Helper: Processes a single schedule entry.
   * @param {Object} entry - The raw schedule entry.
   * @param {string} medName - Medication name.
   * @param {string} dependentName - Dependant name.
   * @param {string} numPills - Number of pills per dose.
   * @returns {Object|null} The processed entry, or null if invalid.
   */
  processScheduleEntry(entry, medName, dependentName, numPills) {
    let processedEntry = { ...entry };
    processedEntry.medication = medName;
    processedEntry.dependentName = dependentName;
    processedEntry.numPillsPerDose = numPills || "1";

    if (processedEntry.doseTime && processedEntry.doseTime.toDate) {
      processedEntry.doseTime = processedEntry.doseTime.toDate();
    } else if (processedEntry.doseTime) {
      processedEntry.doseTime = new Date(processedEntry.doseTime);
    } else {
      console.warn(`Missing 'doseTime' for ${medName}, dependent ${dependentName}. Skipping.`);
      return null;
    }

    if (processedEntry.doseTime instanceof Date && !isNaN(processedEntry.doseTime)) {
      return processedEntry;
    } else {
      console.warn(`Invalid 'doseTime' for ${medName}, dependent ${dependentName}. Skipping.`);
      return null;
    }
  }

  /**
   * Loads medication schedules from Firestore and aggregates them.
   * @returns {Promise} Resolves when schedules are loaded.
   */
  async loadMedicationSchedules() {
    if (!globalUserId) {
      console.error("User ID not available");
      this.sortedSchedule = [];
      return Promise.reject(new Error("User ID not available"));
    }

    let combinedSchedule = [];
    console.log(`Loading medications for user: ${globalUserId}`);

    try {
      if (this.isCareTakerSchedule) {
        console.log("Loading caretaker schedule...");
        const dependentsSnapshot = await firebase.firestore()
          .collection('users')
          .doc(globalUserId)
          .collection('dependents')
          .get();

        const schedulePromises = dependentsSnapshot.docs.map(async (dependentDoc) => {
          const dependentId = dependentDoc.id;
          const dependentData = dependentDoc.data();
          const dependentName = (dependentData.firstname && dependentData.lastname)
            ? `${dependentData.firstname} ${dependentData.lastname}`
            : `Unnamed (${dependentId.substring(0, 5)})`;

          const medsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(globalUserId)
            .collection('dependents')
            .doc(dependentId)
            .collection('medications')
            .get();

          let dependentScheduleEntries = [];
          medsSnapshot.forEach(doc => {
            const medData = doc.data();
            const medName = medData.name || 'Unknown Medication';
            if (medData.schedule && Array.isArray(medData.schedule)) {
              medData.schedule.forEach(entry => {
                const processed = this.processScheduleEntry(entry, medName, dependentName, medData.numPillsPerDose);
                if (processed) {
                  dependentScheduleEntries.push(processed);
                }
              });
            }
          });
          return dependentScheduleEntries;
        });
        const allSchedules = await Promise.all(schedulePromises);
        combinedSchedule = allSchedules.flat();
      } else if (this.isSingleDependant) {
        const urlParams = new URLSearchParams(window.location.search);
        const dependentId = urlParams.get('id');
        if (!dependentId) {
          console.error("Missing dependent ID in URL");
          this.sortedSchedule = [];
          return Promise.reject(new Error("Missing dependent ID in URL"));
        }
        const medsSnapshot = await firebase.firestore()
          .collection('users')
          .doc(globalUserId)
          .collection('dependents')
          .doc(dependentId)
          .collection('medications')
          .get();

        medsSnapshot.forEach(doc => {
          const medData = doc.data();
          const medName = medData.name || 'Unknown Medication';
          if (medData.schedule && Array.isArray(medData.schedule)) {
            medData.schedule.forEach(entry => {
              const processed = this.processScheduleEntry(entry, medName, '', medData.numPillsPerDose);
              if (processed) {
                combinedSchedule.push(processed);
              }
            });
          }
        });
      } else {
        console.log("No schedule mode detected.");
      }

      combinedSchedule.sort((a, b) => a.doseTime - b.doseTime);
      this.sortedSchedule = combinedSchedule;
      console.log("Loaded and sorted schedule entries:", this.sortedSchedule.length);
    } catch (error) {
      console.error("Error loading medication schedules:", error);
      this.sortedSchedule = [];
      if (this.calendarContainer) {
        this.calendarContainer.innerHTML = "";
        const errorMsg = document.createElement('p');
        errorMsg.textContent = "Error loading schedule data. Please try refreshing.";
        errorMsg.style.color = 'red';
        this.calendarContainer.appendChild(errorMsg);
      }
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  /**
   * Helper: Creates a header element for schedule details from a selected date.
   * @returns {HTMLElement} The header element.
   */
  createScheduleHeader() {
    const header = document.createElement('h2');
    try {
      const dateObj = new Date(this.selectedDate + 'T00:00:00');
      header.innerHTML = `Schedule for <br>${dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
    } catch (e) {
      header.textContent = `Schedule for ${this.selectedDate}`;
    }
    return header;
  }

  /**
   * Renders medication summaries onto the calendar day cells.
   */
  renderScheduleOnCalendar() {
    if (!this.calendarContainer) {
      console.error("Calendar container not available for rendering schedule.");
      return;
    }
    console.log("Rendering schedule summaries on calendar cells...");

    // Remove existing summary containers.
    this.calendarContainer.querySelectorAll('.calendar-day .entry-container').forEach(container => {
      container.remove();
    });

    let groupedEntries = {};
    this.sortedSchedule.forEach(entry => {
      if (!(entry.doseTime instanceof Date) || isNaN(entry.doseTime)) {
        console.warn("Skipping entry with invalid doseTime:", entry);
        return;
      }
      const formattedDate = entry.doseTime.toLocaleDateString('en-CA');
      if (!groupedEntries[formattedDate]) {
        groupedEntries[formattedDate] = {};
      }
      let groupKey = this.isCareTakerSchedule ? (entry.dependentName || 'Unknown Dependant') : 'default';
      if (!groupedEntries[formattedDate][groupKey]) {
        groupedEntries[formattedDate][groupKey] = [];
      }
      groupedEntries[formattedDate][groupKey].push(entry);
    });

    // Loop through each date and render entry containers.
    for (const date in groupedEntries) {
      const dayCell = this.calendarContainer.querySelector(`.calendar-day[data-date="${date}"]`);
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

        if (window.innerWidth > 1600) {
          if (this.isCareTakerSchedule && groupKey !== 'default') {
            const header = document.createElement('div');
            header.className = 'entry-header-small';
            header.innerText = groupKey.split(' ')[0];
            groupContainer.appendChild(header);
          }
          const summary = document.createElement('div');
          summary.className = 'medication-summary';
          summary.innerHTML = `<div id="event-quant" class="event-quant">${events.length}</div>`;
          if (this.isCareTakerSchedule) {
            groupContainer.firstChild && groupContainer.firstChild.appendChild(summary) ||
              groupContainer.appendChild(summary);
          } else {
            groupContainer.appendChild(summary);
          }
          mainEntryContainer.appendChild(groupContainer);
        } else {
          sum += events.length;
          if (this.isSingleDependant) {
            const summary = document.createElement('div');
            summary.className = 'medication-summary';
            summary.innerHTML = `<div id="event-quant" class="event-quant">${events.length}</div>`;
            groupContainer.appendChild(summary);
            mainEntryContainer.appendChild(groupContainer);
          }
        }
      }

      if (this.isCareTakerSchedule && sum !== 0) {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'entry-container';
        const summary = document.createElement('div');
        summary.className = 'medication-summary';
        summary.innerHTML = `<div id="event-quant" class="event-quant">${sum}</div>`;
        groupContainer.appendChild(summary);
        mainEntryContainer.appendChild(groupContainer);
      }
    }

    this.calendarHeight = document.getElementById('calendar-container').offsetHeight;
    console.log("Finished rendering schedule summaries.");
  }

  /**
   * Renders the detailed schedule for the selected date below the calendar.
   */
  renderScheduleBelowCalendar() {
    if (!this.container) {
      console.error("Main container not found for rendering schedule below calendar.");
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
    detailsContainer.appendChild(this.createScheduleHeader());

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
        const name = entry.dependentName || 'Unknown Dependant';
        groups[name] = groups[name] || [];
        groups[name].push(entry);
      });
      for (const name in groups) {
        let groupContainer = document.createElement('div');
        groupContainer.className = 'entry-group-below';
        let header = document.createElement('h3');
        header.innerText = name;
        groupContainer.appendChild(header);

        groups[name].forEach(entry => {
          const medEntry = document.createElement('div');
          medEntry.className = 'medication-entry-below';
          const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
          medEntry.innerText = `• ${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
          groupContainer.appendChild(medEntry);
        });
        detailsContainer.appendChild(groupContainer);
      }
    } else {
      entriesToRender.forEach(entry => {
        const medEntry = document.createElement('div');
        medEntry.className = 'medication-entry-below';
        const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        medEntry.innerText = `• ${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
        detailsContainer.appendChild(medEntry);
      });
    }
  }

  /**
   * Renders the detailed schedule for the selected date in the sidebar.
   */
  renderSideBar() {
    if (!this.container) {
      console.error("Main container not found. Cannot render sidebar.");
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

    sideBar.appendChild(this.createScheduleHeader());

    let entriesToRender = this.sortedSchedule.filter(
      entry => entry.doseTime instanceof Date && !isNaN(entry.doseTime) &&
               entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );

    if (entriesToRender.length === 0) {
      const noEventsMsg = document.createElement('p');
      noEventsMsg.innerText = "No scheduled medications for this day.";
      sideBar.appendChild(noEventsMsg);
      return;
    }

    if (this.isCareTakerSchedule) {
      let groups = {};
      entriesToRender.forEach(entry => {
        const name = entry.dependentName || 'Unknown Dependant';
        groups[name] = groups[name] || [];
        groups[name].push(entry);
      });
      for (const name in groups) {
        let groupList = document.createElement('ul');
        groupList.className = 'sidebar-list-group';
        let listHeader = document.createElement('h3');
        listHeader.innerText = name;
        sideBar.appendChild(listHeader);
        sideBar.appendChild(groupList);
        groups[name].forEach(entry => {
          const medEntry = document.createElement('li');
          medEntry.className = 'medication-entry-sidebar';
          const formattedTime = entry.doseTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
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
        const formattedTime = entry.doseTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        medEntry.innerText = `${entry.numPillsPerDose} x ${entry.medication} at ${formattedTime}`;
        groupList.appendChild(medEntry);
      });
    }

    console.log(this.calendarHeight);
    sideBar.style.cssText = `max-height: ${this.calendarHeight}px;`;

  }
} // End of CalendarApp class

// ==================================================
//             CALENDAR INITIALIZATION
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Setting up Firebase auth listener.");

  const calendarAppHostElement = document.getElementById('calendar');
  if (!calendarAppHostElement) {
    console.error("CRITICAL: Main container with ID 'calendar' not found.");
    document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Error: Application container missing.</p>";
    return;
  }

  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      globalUserId = user.uid;
    //   console.log("User signed in with UID:", globalUserId);
      calendarAppHostElement.innerHTML = '';
    //   console.log("Initializing CalendarApp...");
      const calendar = new CalendarApp('calendar');
      if (!calendar || !calendar.container) {
        console.error("Failed to initialize CalendarApp.");
        calendarAppHostElement.innerHTML = "<p style='color:red;'>Error initializing calendar component.</p>";
        return;
      }

      //console.log("Loading medication schedules...");
      calendar.loadMedicationSchedules().then(() => {
        //console.log("Schedules loaded successfully. Rendering calendar view.");
        calendar.renderCalendar();
        calendar.renderScheduleOnCalendar();

        const todayElement = calendar.calendarContainer?.querySelector('.calendar-day.today');
        if (todayElement) {
        //   console.log("Auto-selecting today's date.");
          calendar.selectDate(todayElement);
        } else {
           console.log("Today's date not in view, no auto-selection.");
        }
        // console.log("Calendar rendering complete.");
      }).catch(error => {
        console.error("Error during calendar setup:", error);
        calendarAppHostElement.innerHTML = '';
        const errorMsg = document.createElement('p');
        errorMsg.textContent = `Error loading schedule data: ${error.message || 'Please try again later.'}`;
        errorMsg.style.color = 'red';
        calendarAppHostElement.appendChild(errorMsg);
      });

      // Attach custom event listeners for medication changes.
      document.addEventListener("medicationAdded", () => {
        // console.log("Medication added event received, updating calendar...");
        calendar.loadMedicationSchedules().then(() => {
          calendar.renderCalendar();
          calendar.renderScheduleOnCalendar();
          const todayElement = calendar.calendarContainer?.querySelector('.calendar-day.today');
          if (todayElement) {
            // console.log("Auto-selecting today's date.");
            calendar.selectDate(todayElement);
          } else {
             console.log("Today's date not in view.");
          }
        }).catch(err => {
          console.error("Error updating calendar after medication added:", err);
        });
      });

      document.addEventListener("medicationRemoved", () => {
        // console.log("Medication removed event received, updating calendar...");
        calendar.loadMedicationSchedules().then(() => {
          calendar.renderCalendar();
          calendar.renderScheduleOnCalendar();
          const todayElement = calendar.calendarContainer?.querySelector('.calendar-day.today');
          if (todayElement) {
            // console.log("Auto-selecting today's date.");
            calendar.selectDate(todayElement);
          } else {
             console.log("Today's date not in view.");
          }
        }).catch(err => {
          console.error("Error updating calendar after medication removed:", err);
        });
      });

    } else {
      console.log("No user signed in.");
      globalUserId = null;
      calendarAppHostElement.innerHTML = '<p>Please log in to view your medication schedule.</p>';
      const container = document.getElementById('calendar-container');
      if (container) container.remove();
      const sidebar = document.getElementById('calendar-sidebar');
      if (sidebar) sidebar.remove();
      const belowDetails = document.getElementById('daily-schedule-container');
      if (belowDetails) belowDetails.remove();
    }
  });
});
