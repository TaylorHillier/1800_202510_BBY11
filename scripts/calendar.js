var globalUserId;

class CalendarApp {
  constructor(containerId) {

    this.container = document.getElementById(containerId);
    this.calenderContainer = document.getElementById(containerId + "-container");
    
    this.currentDate = new Date();
    this.selectedDate = null;
    this.medications = []; // Raw medications from firebase
    this.sortedSchedule = []; // Array of computed dose entries
    this.isCareTakerSchedule = false;
    this.isSingleDependant = false;
    this.init();
  }

  init() {
   
    if(this.calenderContainer == null) {
      let calCont = document.createElement('div');
      calCont.id = 'calendar-container';
      this.container.appendChild(calCont);
      this.calenderContainer = calCont;  // Set the property so it's not null
    }
    this.renderNavigation();
    this.renderCalendar();
  }

  renderNavigation() {

    const existingNav = this.calenderContainer.querySelector('.calendar-navigation');
    if (existingNav) {
      existingNav.remove();
    }
    const navContainer = document.createElement('div');
    navContainer.className = 'calendar-navigation';

    const prevButton = document.createElement('button');
    prevButton.innerText = '←';
    prevButton.addEventListener('click', () => this.changeMonth(-1));

    const nextButton = document.createElement('button');
    nextButton.innerText = '→';
    nextButton.addEventListener('click', () => this.changeMonth(1));

    const monthYearDisplay = document.createElement('div');
    monthYearDisplay.id = 'month-year-display';
    monthYearDisplay.innerText = this.formatMonthYear(this.currentDate);

    navContainer.appendChild(prevButton);
    navContainer.appendChild(monthYearDisplay);
    navContainer.appendChild(nextButton);

    this.calenderContainer.appendChild(navContainer);
  }

  renderCalendar() {
    // Clear previous calendar
    const existingCalendar = this.calenderContainer.querySelector('.calendar-grid');
    if (existingCalendar) {
      existingCalendar.remove();
    }
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    // Weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-weekday';
      dayHeader.innerText = day;
      calendarGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    );
    const lastDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      0
    );
    const startingDay = firstDay.getDay();
    for (let i = 0; i < startingDay; i++) {
      const paddingDay = document.createElement('div');
      paddingDay.className = 'calendar-day inactive';
      calendarGrid.appendChild(paddingDay);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.innerText = day;
      dayElement.dataset.date = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth(),
        day
      )
        .toISOString()
        .split('T')[0];

      dayElement.addEventListener('click', () => this.selectDate(dayElement));

      const today = new Date();
      if (
        day === today.getDate() &&
        this.currentDate.getMonth() === today.getMonth() &&
        this.currentDate.getFullYear() === today.getFullYear()
      ) {
        dayElement.classList.add('today');
      }
      calendarGrid.appendChild(dayElement);
    }

    this.calenderContainer.appendChild(calendarGrid);
    this.updateMonthDisplay();
  }

  selectDate(dayElement) {
    const previousSelected = this.calenderContainer.querySelector('.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }
    dayElement.classList.add('selected');
    this.selectedDate = dayElement.dataset.date;
    // On small screens, render schedule for the selected day below the calendar.
    if (window.innerWidth < 768) {
      this.updateDependantSchedule().then(() => {
        this.renderScheduleBelowCalendar();
      }).catch(
        err => console.error(err));
    } else {
      this.renderSideBar();
    }
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderCalendar();
    // this
    // .updateDependantSchedule()
    // .then(() => {
    //   calendar.renderSchedule();
    // })
    // .catch(err => console.error(err));
    // For large screens, re-render the schedule on the calendar.
    if (window.innerWidth >= 768) {
      this.renderScheduleOnCalendar();
    }
  }

  formatMonthYear(date) {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  updateMonthDisplay() {
    const monthDisplay = this.calenderContainer.querySelector('#month-year-display');
    if (monthDisplay) {
      monthDisplay.innerText = this.formatMonthYear(this.currentDate);
    }
  }

  // Retrieves medication data from Firebase.
  updateDependantSchedule() {
    // Return a Promise so we know when the retrieval is done.
    return new Promise((resolve, reject) => {
      const url = new URLSearchParams(window.location.search);
      const dependant = url.get('id');

      let isSingleDependant = false;
      let isCareTakerSchedule = false;
      const pageurl = window.location.href;

      if (pageurl.indexOf('single_dependant') > -1) {
        isSingleDependant = true;
      } else if (pageurl.indexOf('caretaker-schedule') > -1) {
        isCareTakerSchedule = true;
      }

      firebase.auth().onAuthStateChanged(async user => {
        if (user) {
          globalUserId = user.uid;
          const button = document.getElementById('addMedication');
          if (button) {
            button.addEventListener('click', createMedicationForm);
          }
          // Clear any previously loaded medications.
          this.medications = [];

          if (isSingleDependant) {
            // Retrieve medications for the single dependant.
            const medsSnapshot = await firebase
              .firestore()
              .collection('users')
              .doc(user.uid)
              .collection('dependants')
              .doc(dependant)
              .collection('medications')
              .get();

            medsSnapshot.docs.forEach(doc => {
              const medData = doc.data();

              const medObject = {
                Medication: {
                  name: medData.name || 'Not specified',
                  frequency: medData.frequency || 'Not specified',
                  startTime: medData.startTime || 'Not specified',
                  startDate: medData.startDate || 'Not specified',
                  endDate: medData.endDate || 'Not specified'
                },
                dependantName: null
              };

              this.medications.push(medObject);
            });
          } else if (isCareTakerSchedule) {
            // Retrieve all dependants for the caretaker.
            const dependantsSnapshot = await firebase
              .firestore()
              .collection('users')
              .doc(user.uid)
              .collection('dependants')
              .get();

            for (const dependantDoc of dependantsSnapshot.docs) {

              const dependantData = dependantDoc.data();
              const dependantId = dependantDoc.id;

              const dependantName =
                dependantData.firstname && dependantData.lastname
                  ? dependantData.firstname + ' ' + dependantData.lastname
                  : 'Unnamed';

              const medsSnapshot = await firebase
                .firestore()
                .collection('users')
                .doc(user.uid)
                .collection('dependants')
                .doc(dependantId)
                .collection('medications')
                .get();

              medsSnapshot.docs.forEach(doc => {
                const medData = doc.data();
                const medObject = {
                  Medication: {
                    name: medData.name || 'Not specified',
                    frequency: medData.frequency || 'Not specified',
                    startTime: medData.startTime || 'Not specified',
                    startDate: medData.startDate || 'Not specified',
                    endDate: medData.endDate || 'Not specified'
                  },
                  dependantName: dependantName
                };
                this.medications.push(medObject);
              });
            }
          }
          this.isCareTakerSchedule = isCareTakerSchedule;
          this.isSingleDependant = isSingleDependant;
          // Once all medications are retrieved, sort the schedule.
          this.sortSchedule();
          resolve();
        } else {
          console.log('No user logged in');
          reject('No user logged in');
        }
      });
    });
  }

  // Computes and sorts the schedule entries.
  sortSchedule() {
    this.sortedSchedule = [];
    this.medications.forEach(med => {
      const medData = med.Medication;
      // Ensure required data is present.
      if (
        !medData.startDate ||
        !medData.endDate ||
        !medData.startTime ||
        !medData.frequency
      ) return;
      
      const startDate = new Date(medData.startDate);
      const endDate = new Date(medData.endDate);
      // Extract the dosing interval in hours.
      let intervalHours = 24;
      const freqMatch = medData.frequency.match(/\d+/);
      if (freqMatch) {
        intervalHours = parseInt(freqMatch[0]);
      }
      // For each day in the range, compute dose times.
      for (
        let day = new Date(startDate);
        day <= endDate;
        day.setDate(day.getDate() + 1)
      ) {
        const [startHour, startMinute] = medData.startTime
          .split(':')
          .map(Number);
        let doseTime = new Date(day);
        doseTime.setHours(startHour, startMinute, 0, 0);
        const bedTimeHour = 22; // 10 PM cutoff.
        while (
          doseTime.getDate() === day.getDate() &&
          doseTime.getHours() < bedTimeHour
        ) {
          let entry = {
            doseTime: new Date(doseTime),
            medication: medData.name
          };
          if (this.isCareTakerSchedule && med.dependantName) {
            entry.dependantName = med.dependantName;
          }
          this.sortedSchedule.push(entry);
          doseTime.setHours(doseTime.getHours() + intervalHours);
        }
      }
    });
    // Sort entries from the closest (earliest) to furthest (latest).
    this.sortedSchedule.sort((a, b) => a.doseTime - b.doseTime);
    console.log('Sorted schedule:', this.sortedSchedule);
  }

  // Render function that checks screen size and calls the appropriate rendering method.
  renderSchedule() {
    if (window.innerWidth >= 768) {
      this.renderScheduleOnCalendar();
      this.renderSideBar();
    } else {
      this.renderScheduleBelowCalendar();
    }
  }

  renderScheduleOnCalendar() {
    // Clear any previous schedule entries from calendar cells.
    this.calenderContainer.querySelectorAll('.calendar-day').forEach(cell => {
      // Preserve the day number (cell.innerText) while clearing extra entries.
      cell.innerHTML = cell.innerText;
    });
  
    // Group events by date, then by dependant (if caretaker schedule)
    let groupedEntries = {};
  
    for (let i = 0; i < this.sortedSchedule.length; i++) {
      const entry = this.sortedSchedule[i];
      // Use local date so it matches your calendar cell's data-date.
      const formattedDate = entry.doseTime.toLocaleDateString('en-CA');
      
      // Initialize the day group if needed.
      if (!groupedEntries[formattedDate]) {
        groupedEntries[formattedDate] = {};
        // For single dependant pages, use a default group.
        if (!this.isCareTakerSchedule) {
          groupedEntries[formattedDate]['default'] = [];
        }
      }
      
      if (this.isCareTakerSchedule && entry.dependantName) {
        if (!groupedEntries[formattedDate][entry.dependantName]) {
          groupedEntries[formattedDate][entry.dependantName] = [];
        }
        groupedEntries[formattedDate][entry.dependantName].push(entry);
      } else {
        // For single dependant pages.
        groupedEntries[formattedDate]['default'].push(entry);
      }
    }
  
    // Now loop over the grouped data to render a summary in each day cell.
    for (const date in groupedEntries) {
      const dayCell = this.calenderContainer.querySelector(`.calendar-day[data-date="${date}"]`);
      if (!dayCell) continue;
      
      if (this.isCareTakerSchedule) {
        // For each dependant, create a summary entry.
        for (const dependant in groupedEntries[date]) {
          const events = groupedEntries[date][dependant];
          
          // Check if a container for this dependant already exists.
          let container = dayCell.querySelector(`.entry-container[data-dependant="${dependant}"]`);
          if (!container) {
            container = document.createElement('div');
            container.className = 'entry-container';
            container.setAttribute('data-dependant', dependant);
            
            // Create a header with the dependant's name.
            const header = document.createElement('h5');
            header.innerText = dependant;
            container.appendChild(header);
            dayCell.appendChild(container);
          }
          
          // Create a summary element to show the number of events.
          const summary = document.createElement('div');
          summary.className = 'medication-summary';
          summary.innerText = `${events.length} event${events.length === 1 ? '' : 's'}`;
          container.appendChild(summary);
        }
      } else {
        // Single dependant page – use the default group.
        const events = groupedEntries[date]['default'];
        
        let container = dayCell.querySelector('.entry-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'entry-container';
          dayCell.appendChild(container);
        }
        
        const summary = document.createElement('div');
        summary.className = 'medication-summary';
        summary.innerText = `${events.length} event${events.length === 1 ? '' : 's'}`;
        container.appendChild(summary);
      }
    }
  }

 // Renders the schedule below the calendar (for smaller screens).
  renderScheduleBelowCalendar() {
    let container = document.getElementById('daily-schedule-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'daily-schedule-container';
      container.style.marginTop = '20px';
      // Append it below the calendar.
      this.container.appendChild(container);
    }
    container.innerHTML = "";
    
    // Only render entries if a day is selected.
    if (!this.selectedDate) {
      this.selectedDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    }

    // Filter for entries that match the selected day.
    let entriesToRender = this.sortedSchedule.filter(
      entry =>entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );
  
    if (entriesToRender.length === 0) {
      container.innerText = "No scheduled medications for this day.";
      return;
    }

    // For caretaker schedule, group by dependant name.
    if (this.isCareTakerSchedule) {
      let groups = {};

      entriesToRender.forEach(entry => {
        let name = entry.dependantName || 'Unknown';

        if (!groups[name]) groups[name] = [];
        
        groups[name].push(entry);
      });

      for (let name in groups) {
        let groupContainer = document.createElement('div');
        groupContainer.className = 'entry-container';

        let header = document.createElement('h5');
        header.innerText = name;

        groupContainer.appendChild(header);
        groups[name].forEach(entry => {
          let medEntry = document.createElement('div');
          medEntry.className = 'medication-entry';
          let formattedTime = entry.doseTime.toTimeString().slice(0, 5);
          medEntry.innerText = `${entry.medication} at ${formattedTime}`;
          groupContainer.appendChild(medEntry);
        });

        container.appendChild(groupContainer);
      }
    } else if(this.isSingleDependant) {
    
      // For single dependant pages.
      entriesToRender.forEach(entry => {
      
        let medEntry = document.createElement('div');
        medEntry.className = 'medication-entry';

        let formattedTime = entry.doseTime.toTimeString().slice(0, 5);
        medEntry.innerText = `${entry.medication} at ${formattedTime}`;

        container.appendChild(medEntry);
      });
    }
  }

  renderSideBar() {
    let sideBar = document.getElementById("calendar-sidebar");

    if(!sideBar){
      sideBar = document.createElement("aside");
      sideBar.id = "calendar-sidebar";
    }
    sideBar.innerHTML = "";

    // Filter for entries that match the selected day.
    let groups = {};

    if (!this.selectedDate) {
      this.selectedDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    }

    // Filter for entries that match the selected day.
    let entriesToRender = this.sortedSchedule.filter(
      entry =>entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );

    entriesToRender.forEach(entry => {
      let name = entry.dependantName || 'Unknown';

      if (!groups[name]) groups[name] = [];
      
      groups[name].push(entry);
    });

    for (let name in groups) {
      let groupContainer = document.createElement('ul');
      groupContainer.className = 'sidebar-ul';

      let header = document.createElement('h5');
      header.innerText = name;

      groupContainer.appendChild(header);
      groups[name].forEach(entry => {
        let medEntry = document.createElement('li');
        medEntry.className = 'medication-entry-sidebar';
        let formattedTime = entry.doseTime.toTimeString().slice(0, 5);
        medEntry.innerText = `${entry.medication} at ${formattedTime}`;
        groupContainer.appendChild(medEntry);
      });

      sideBar.appendChild(groupContainer);
    }

    this.container.appendChild(sideBar);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const calendar = new CalendarApp('calendar');
  // Retrieve medications; once complete, render the schedule.
  calendar
    .updateDependantSchedule()
    .then(() => {
      calendar.renderSchedule();
    })
    .catch(err => console.error(err));
});
