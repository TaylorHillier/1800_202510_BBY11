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
  
      if (window.innerWidth >= 768) {
        this.renderScheduleOnCalendar();
      }
  
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

  /**
   * Asynchronously loads medication schedules from Firestore based on the
   * current user (globalUserId) and the mode (caretaker or single dependant).
   * Populates and sorts `this.sortedSchedule`.
   */
  async loadMedicationSchedules() {
      // --- Guard Check: Ensure user ID is available ---
      if (!globalUserId) {
          console.error("Attempted to load schedules but globalUserId is not set.");
          this.sortedSchedule = []; // Ensure schedule is empty
          // We might throw an error or return a rejected promise if preferred
          return Promise.reject(new Error("User ID not available"));
      }

      let combinedSchedule = []; // Temporary array to build the schedule
      console.log(`loading medications for user: ${globalUserId}`);

      try { // Wrap all Firestore operations in a try...catch block
          if (this.isCareTakerSchedule) {
              // --- Caretaker Mode ---
              console.log("Loading caretaker schedule...");
              const dependantsSnapshot = await firebase.firestore()
                  .collection('users')
                  .doc(globalUserId)
                  .collection('dependants')
                  .get();

              console.log(`Found ${dependantsSnapshot.size} dependants for caretaker.`);

              // Use Promise.all to fetch medication data for all dependants concurrently
              const promises = dependantsSnapshot.docs.map(async (dependantDoc) => {
                  const dependantId = dependantDoc.id;
                  const dependantData = dependantDoc.data();
                  // Generate a clearer name, including part of ID if unnamed
                  const dependantName = (dependantData.firstname && dependantData.lastname) ?
                      `${dependantData.firstname} ${dependantData.lastname}` :
                      `Unnamed (${dependantId.substring(0, 5)})`;

                  console.log(`Workspaceing meds for dependant: ${dependantName} (${dependantId})`);
                  const medsSnapshot = await firebase.firestore()
                      .collection('users')
                      .doc(globalUserId)
                      .collection('dependants')
                      .doc(dependantId)
                      .collection('medications')
                      .get();

                  console.log(`Found ${medsSnapshot.size} medication docs for ${dependantName}.`);
                  let dependantScheduleEntries = []; // Entries for this specific dependant
                  medsSnapshot.forEach(doc => {
                      const medData = doc.data();
                      const medName = medData.name || 'Unknown Medication'; // Get medication name
                      // console.log(`Processing med: ${medName} for ${dependantName}`);

                      // Check if the medication document has a 'schedule' array
                      if (medData.schedule && Array.isArray(medData.schedule)) {
                          medData.schedule.forEach(entry => {
                              let processedEntry = { ...entry }; // Create copy to avoid modifying original data

                              // Add medication and dependant names for easy access later
                              processedEntry.medication = medName;
                              processedEntry.dependantName = dependantName;

                              // Convert Firestore Timestamp to JavaScript Date object
                              if (processedEntry.doseTime && processedEntry.doseTime.toDate) {
                                  processedEntry.doseTime = processedEntry.doseTime.toDate();
                              } else if (processedEntry.doseTime) { // Handle if it's already a string/number date
                                  processedEntry.doseTime = new Date(processedEntry.doseTime);
                              } else {
                                  // Handle missing doseTime - log warning and skip or use default?
                                  console.warn(`Missing 'doseTime' for an entry in med '${medName}', dependant '${dependantName}'. Skipping.`);
                                  return; // Skip this invalid entry
                              }

                              // Only add valid date entries
                              if (processedEntry.doseTime instanceof Date && !isNaN(processedEntry.doseTime)) {
                                  dependantScheduleEntries.push(processedEntry);
                              } else {
                                  console.warn(`Invalid 'doseTime' found for ${medName}, dependant ${dependantName}. Original value:`, entry.doseTime, ". Skipping.");
                              }
                          });
                      } else {
                          // Optional log: console.log(`Medication ${medName} for ${dependantName} has no schedule array.`);
                      }
                  });
                  return dependantScheduleEntries; // Return schedule entries for this dependant
              });

              // Wait for all dependant schedules to be fetched and processed
              const allSchedules = await Promise.all(promises);
              // Flatten the array of arrays into a single combinedSchedule array
              combinedSchedule = allSchedules.flat();

          } else if (this.isSingleDependant) {
              // --- Single Dependant Mode ---
              const urlParams = new URLSearchParams(window.location.search);
              const dependantId = urlParams.get('id'); // Get dependant ID from ?id=...

              // Check if the dependant ID was actually found in the URL
              if (!dependantId) {
                  console.error("Single dependant view, but no 'id' found in URL parameters.");
                  this.sortedSchedule = [];
                  return Promise.reject(new Error("Missing dependant ID in URL")); // Indicate failure
              }

              console.log(`Loading single dependant schedule for dependant ID: ${dependantId}`);

              // Fetch medications for this specific dependant
              const medsSnapshot = await firebase.firestore()
                  .collection('users')
                  .doc(globalUserId)
                  .collection('dependants')
                  .doc(dependantId)
                  .collection('medications')
                  .get(); // Use .get() for one-time fetch

              console.log(`Found ${medsSnapshot.size} medication docs for dependant ${dependantId}.`);

              medsSnapshot.forEach(doc => {
                  const medData = doc.data();
                  const medName = medData.name || 'Unknown Medication';
                  // console.log(`Processing med: ${medName} (Doc ID: ${doc.id})`);

                  if (medData.schedule && Array.isArray(medData.schedule)) {
                      medData.schedule.forEach(entry => {
                          let processedEntry = { ...entry };
                          processedEntry.medication = medName;
                          // No dependantName needed here, or could fetch it if required

                          // Convert Timestamp to Date
                          if (processedEntry.doseTime && processedEntry.doseTime.toDate) {
                              processedEntry.doseTime = processedEntry.doseTime.toDate();
                          } else if (processedEntry.doseTime) {
                              processedEntry.doseTime = new Date(processedEntry.doseTime);
                          } else {
                              console.warn(`Missing 'doseTime' for an entry in med '${medName}', dependant '${dependantId}'. Skipping.`);
                              return; // Skip invalid entry
                          }

                          // Validate and add
                          if (processedEntry.doseTime instanceof Date && !isNaN(processedEntry.doseTime)) {
                              combinedSchedule.push(processedEntry);
                          } else {
                              console.warn(`Invalid 'doseTime' found for ${medName}, dependant ${dependantId}. Original value:`, entry.doseTime, ". Skipping.");
                          }
                      });
                  } else {
                      // Optional log: console.log(`Medication ${medName} (Doc ID: ${doc.id}) has no schedule array.`);
                  }
              });
          } else {
              // --- Neither Mode ---
              console.log("Not a caretaker or single dependant schedule page. No schedules loaded.");
              // No schedules to load in this case.
          }

          // --- Sort and Store ---
          // Sort all collected dose entries chronologically by time
          combinedSchedule.sort((a, b) => a.doseTime - b.doseTime);
          this.sortedSchedule = combinedSchedule; // Assign to the class property

          console.log("Loaded and sorted schedule entries:", this.sortedSchedule.length);
          // console.log("First few entries:", this.sortedSchedule.slice(0, 5)); // Log first few for debugging

      } catch (error) {
          // --- Error Handling ---
          console.error("Error loading medication schedules from Firestore:", error);
          this.sortedSchedule = []; // Clear schedule on error
          // Optionally display an error message to the user on the page
          if (this.calenderContainer) {
              // Clear existing content and show error
              this.calenderContainer.innerHTML = "";
              const errorMsg = document.createElement('p');
              errorMsg.textContent = "Error loading schedule data. Please check console and try refreshing.";
              errorMsg.style.color = 'red';
              this.calenderContainer.appendChild(errorMsg);
          }
          // Re-throw or return rejected promise to signal failure to the caller
          return Promise.reject(error);
      }
        // If successful, resolve the promise (implicitly happens with async functions unless error)
      return Promise.resolve();
  }


  /**
   * Renders medication summaries (e.g., "2 events") directly onto the calendar day cells.
   * Groups events by dependant for the caretaker view. Typically used on wider screens.
   */
  renderScheduleOnCalendar() {
      // Ensure the calendar container exists
      if (!this.calenderContainer) {
          console.error("renderScheduleOnCalendar called but calenderContainer is not available.");
          return;
      }
      console.log("Rendering schedule summaries on calendar cells...");

      // --- 1. Clear existing summaries ---
      this.calenderContainer.querySelectorAll('.calendar-day .entry-container').forEach(container => {
            // Remove only the schedule container, keep the day number
            container.remove();
      });


      // --- 2. Group entries by date and (if caretaker) by dependant ---
      let groupedEntries = {}; // Structure: { 'YYYY-MM-DD': { 'Dependant Name'/'default': [entry, ...] } }
      this.sortedSchedule.forEach(entry => {
          // Check if doseTime is a valid Date object
            if (!(entry.doseTime instanceof Date) || isNaN(entry.doseTime)) {
                console.warn("Skipping entry with invalid doseTime during calendar rendering:", entry);
                return; // Skip this entry
            }
          const formattedDate = entry.doseTime.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

          // Initialize date group if it doesn't exist
          if (!groupedEntries[formattedDate]) {
              groupedEntries[formattedDate] = {};
          }

          // Determine the key for grouping (dependant name or 'default')
          let groupKey = 'default';
          if (this.isCareTakerSchedule) {
              groupKey = entry.dependantName || 'Unknown Dependant';
          }

          // Initialize dependant/default group if it doesn't exist
          if (!groupedEntries[formattedDate][groupKey]) {
              groupedEntries[formattedDate][groupKey] = [];
          }

          // Add the entry to the appropriate group
          groupedEntries[formattedDate][groupKey].push(entry);
      });

      // --- 3. Render summaries onto the calendar cells ---
      for (const date in groupedEntries) {
          // Find the corresponding day cell in the DOM
          const dayCell = this.calenderContainer.querySelector(`.calendar-day[data-date="${date}"]`);
          if (!dayCell) continue; // Skip if day cell not found (e.g., different month view)

          const dateGroups = groupedEntries[date];

          // Create a main container within the day cell if it doesn't exist
          // This helps separate day number from schedule entries
          let mainEntryContainer = dayCell.querySelector('.day-schedule-wrapper');
          if (!mainEntryContainer) {
              mainEntryContainer = document.createElement('div');
              mainEntryContainer.className = 'day-schedule-wrapper';
              dayCell.appendChild(mainEntryContainer);
          }


          for (const groupKey in dateGroups) {
              const events = dateGroups[groupKey];
              //if (events.length === 0) continue; // Skip empty groups

                // Create a container for this specific group (dependant or default)
                const groupContainer = document.createElement('div');
                groupContainer.className = 'entry-container'; // General class for styling
                groupContainer.setAttribute('data-group', groupKey); // Store group key


              // Add header for caretaker view
              if (this.isCareTakerSchedule && groupKey !== 'default') {
                  const header = document.createElement('div'); // Use div instead of h5 for smaller text
                  header.className = 'entry-header-small';
                  // Show only first name or a short indicator
                  header.innerText = groupKey.split(' ')[0];
                  groupContainer.appendChild(header);
              }

              // Add summary text (e.g., "2 events")
              const summary = document.createElement('div');
              summary.className = 'medication-summary';

              if(window.innerWidth > 768){
                summary.innerText = events.length > 0 ? `${events.length} event${events.length === 1 ? '' : 's'}` : `${events.length} events`;
              } else {
                summary.innerHTML = "<span id='mobile-events'></span>";
              }
              groupContainer.appendChild(summary);

              // Append this group's container to the main wrapper in the day cell
              mainEntryContainer.appendChild(groupContainer);
          }
      }
        console.log("Finished rendering schedule summaries.");
  }


  /**
   * Renders the detailed schedule for the `this.selectedDate` in a container
   * placed below the main calendar grid. Typically used on narrower screens.
   */
  renderScheduleBelowCalendar() {
      // Ensure the main app container exists to append the details area
      if (!this.container) {
          console.error("Cannot render schedule below, main container not found.");
          return;
      }

      // Find or create the container for the daily schedule details
      let detailsContainer = document.getElementById('daily-schedule-container');
      if (!detailsContainer) {
          detailsContainer = document.createElement('div');
          detailsContainer.id = 'daily-schedule-container';
          detailsContainer.style.marginTop = '20px'; // Add some spacing
          // Append to the main app container, outside the calendar-specific one
          this.container.appendChild(detailsContainer);
      }
      detailsContainer.innerHTML = ""; // Clear previous content

      // Check if a date is selected
      if (!this.selectedDate) {
          detailsContainer.innerText = "Select a date to view the schedule.";
          return;
      }

      console.log(`Rendering schedule details below calendar for: ${this.selectedDate}`);

      // Filter the master schedule for entries matching the selected date
      let entriesToRender = this.sortedSchedule.filter(entry =>
          entry.doseTime instanceof Date && !isNaN(entry.doseTime) && // Ensure valid date
          entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
      );

      // Display message if no entries for the selected date
      if (entriesToRender.length === 0) {
          detailsContainer.innerText = "No scheduled medications for this day.";
          return;
      }

      // --- Render Entries ---
      if (this.isCareTakerSchedule) {
          // Group by dependant for caretaker view
          let groups = {};
          entriesToRender.forEach(entry => {
              const name = entry.dependantName || 'Unknown Dependant';
              groups[name] = groups[name] || [];
              groups[name].push(entry);
          });

          // Render each group
          for (const name in groups) {
              let groupContainer = document.createElement('div');
              groupContainer.className = 'entry-group-below'; // Style group container
              let header = document.createElement('h5'); // Group header (e.g., Dependant Name)
              header.innerText = name;
              groupContainer.appendChild(header);

              groups[name].forEach(entry => {
                  const medEntry = document.createElement('div');
                  medEntry.className = 'medication-entry-below'; // Style individual entry
                  const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // e.g., 09:30 AM
                  medEntry.innerText = `• ${entry.medication} at ${formattedTime}`;
                  groupContainer.appendChild(medEntry);
              });
              detailsContainer.appendChild(groupContainer); // Add this group to the main details area
          }
      } else { // Single dependant or other modes
          // Just list all entries directly
            const header = document.createElement('h4'); // Add a header for the day
            try {
                const dateObj = new Date(this.selectedDate + 'T00:00:00'); // Ensure correct date parsing
                header.textContent = `Schedule for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
            } catch(e) {
                header.textContent = `Schedule for ${this.selectedDate}`; // Fallback
            }
            detailsContainer.appendChild(header);

          entriesToRender.forEach(entry => {
              const medEntry = document.createElement('div');
              medEntry.className = 'medication-entry-below';
                const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              medEntry.innerText = `• ${entry.medication} at ${formattedTime}`;
              detailsContainer.appendChild(medEntry);
          });
      }
  }

  /**
   * Renders the detailed schedule for `this.selectedDate` in a dedicated sidebar element.
   * Typically used on wider screens.
   */
  renderSideBar() {
      // Ensure the main app container exists to append the sidebar
      if (!this.container) {
            console.error("Cannot render sidebar, main container not found.");
          return;
      }

      // Find or create the sidebar element
      let sideBar = document.getElementById("calendar-sidebar");
      if (!sideBar) {
          sideBar = document.createElement("aside"); // Use <aside> semantic element
          sideBar.id = "calendar-sidebar";
            // Append sidebar to the main container, making it a sibling to the calendar container
            this.container.appendChild(sideBar);
            // CSS Needed: Ensure #calendar and #calendar-sidebar are positioned correctly (e.g., using Flexbox or Grid on the main #calendar container)
      }
      sideBar.innerHTML = ""; // Clear previous content

      if (!this.selectedDate) {
          sideBar.innerText = "Select a date to view details.";
          return;
      }

      console.log(`Rendering schedule details in sidebar for: ${this.selectedDate}`);

      // Filter entries for the selected date
      let entriesToRender = this.sortedSchedule.filter(
          entry => entry.doseTime instanceof Date && !isNaN(entry.doseTime) &&
          entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
      );

      // Add a header indicating the selected date
        const header = document.createElement('h4');
        try {
            const dateObj = new Date(this.selectedDate + 'T00:00:00'); // Ensure correct date parsing
            header.textContent = `Schedule for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
        } catch(e) {
            header.textContent = `Schedule for ${this.selectedDate}`; // Fallback
        }
        sideBar.appendChild(header);


      if (entriesToRender.length === 0) {
          const noEventsMsg = document.createElement('p');
          noEventsMsg.innerText = "No scheduled medications for this day.";
          sideBar.appendChild(noEventsMsg);
          return;
      }

      // --- Render Entries ---
      if (this.isCareTakerSchedule) {
          // Group by dependant
          let groups = {};
          entriesToRender.forEach(entry => {
              const name = entry.dependantName || 'Unknown Dependant';
              groups[name] = groups[name] || [];
              groups[name].push(entry);
          });

          for (const name in groups) {
                // Use <ul> for semantic list structure
              let groupList = document.createElement('ul');
              groupList.className = 'sidebar-list-group';
              let listHeader = document.createElement('h5'); // Sub-header for dependant name
              listHeader.innerText = name;
              // Prepend header as a non-list item, or style first <li> differently
              sideBar.appendChild(listHeader); // Add header before the list
              sideBar.appendChild(groupList); // Append the list itself

              groups[name].forEach(entry => {
                  const medEntry = document.createElement('li'); // List item
                  medEntry.className = 'medication-entry-sidebar';
                  const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  medEntry.innerText = `${entry.medication} at ${formattedTime}`;
                  groupList.appendChild(medEntry);
              });
          }
      } else { // Single dependant or other modes
            // Use a single list for all entries
          const groupList = document.createElement('ul');
          groupList.className = 'sidebar-list-single'; // Different class if needed
          sideBar.appendChild(groupList);

          entriesToRender.forEach(entry => {
              const medEntry = document.createElement('li');
              medEntry.className = 'medication-entry-sidebar';
                const formattedTime = entry.doseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              medEntry.innerText = `${entry.medication} at ${formattedTime}`;
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

                if (window.innerWidth >= 768) {
                    calendar.renderScheduleOnCalendar(); // Add summaries to cells
                }

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