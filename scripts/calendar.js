
var globalUserId;

class CalendarApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.calenderContainer = document.getElementById(containerId + "-container");
    this.currentDate = new Date();
    this.selectedDate = null;
    this.sortedSchedule = []; // This will now be populated from the schedule module.

    // Determine schedule type from URL.
    const pageurl = window.location.href;
    this.isSingleDependant = pageurl.indexOf('single_dependant') > -1;
    this.isCareTakerSchedule = pageurl.indexOf('caretaker-schedule') > -1;
    
    this.init();
  }

  init() {
    if (this.calenderContainer == null) {
      const calCont = document.createElement('div');
      calCont.id = 'calendar-container';
      this.container.appendChild(calCont);
      this.calenderContainer = calCont;
    }
    this.renderNavigation();
    this.renderCalendar();
  }

  renderNavigation() {
    const existingNav = this.calenderContainer.querySelector('.calendar-navigation');
    if (existingNav) existingNav.remove();

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
    const existingCalendar = this.calenderContainer.querySelector('.calendar-grid');
    if (existingCalendar) existingCalendar.remove();

    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-weekday';
      dayHeader.innerText = day;
      calendarGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const startingDay = firstDay.getDay();

    // Add empty cells for the days before the first of the month.
    for (let i = 0; i < startingDay; i++) {
      const paddingDay = document.createElement('div');
      paddingDay.className = 'calendar-day inactive';
      calendarGrid.appendChild(paddingDay);
    }
    // Create cells for each day of the month.
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.innerText = day;
      dayElement.dataset.date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
        .toLocaleDateString('en-CA');
      dayElement.addEventListener('click', () => this.selectDate(dayElement));

      const today = new Date();
      if (day === today.getDate() &&
          this.currentDate.getMonth() === today.getMonth() &&
          this.currentDate.getFullYear() === today.getFullYear()) {
        dayElement.classList.add('today');
      }
      calendarGrid.appendChild(dayElement);
    }
    this.calenderContainer.appendChild(calendarGrid);
    this.updateMonthDisplay();
  }

  selectDate(dayElement) {
    const previousSelected = this.calenderContainer.querySelector('.selected');
    if (previousSelected) previousSelected.classList.remove('selected');
    dayElement.classList.add('selected');
    this.selectedDate = dayElement.dataset.date;

    if (window.innerWidth < 768) {
      this.renderScheduleBelowCalendar();
    } else {
      this.renderSideBar();
    }
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderCalendar();
    if (window.innerWidth >= 768) {
      this.renderScheduleOnCalendar();
    }
  }

  formatMonthYear(date) {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  updateMonthDisplay() {
    const monthDisplay = this.calenderContainer.querySelector('#month-year-display');
    if (monthDisplay) monthDisplay.innerText = this.formatMonthYear(this.currentDate);
  }

  // The rendering functions below (renderScheduleOnCalendar, renderScheduleBelowCalendar, renderSideBar)
  // use the prebuilt this.sortedSchedule to display events.
  // (Their implementation remains largely unchanged.)
  
  renderScheduleOnCalendar() {
    this.calenderContainer.querySelectorAll('.calendar-day').forEach(cell => {
      cell.innerHTML = cell.innerText;
    });

    let groupedEntries = {};
    this.sortedSchedule.forEach(entry => {
      const formattedDate = entry.doseTime.toLocaleDateString('en-CA');
      if (!groupedEntries[formattedDate]) {
        groupedEntries[formattedDate] = {};
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
        groupedEntries[formattedDate]['default'].push(entry);
      }
    });

    for (const date in groupedEntries) {
      const dayCell = this.calenderContainer.querySelector(`.calendar-day[data-date="${date}"]`);
      if (!dayCell) continue;
      if (this.isCareTakerSchedule) {
        for (const dependant in groupedEntries[date]) {
          const events = groupedEntries[date][dependant];
          let container = dayCell.querySelector(`.entry-container[data-dependant="${dependant}"]`);
          if (!container) {
            container = document.createElement('div');
            container.className = 'entry-container';
            container.setAttribute('data-dependant', dependant);
            const header = document.createElement('h5');
            header.innerText = dependant.split(' ')[0];
            container.appendChild(header);
            dayCell.appendChild(container);
          }
          const summary = document.createElement('div');
          summary.className = 'medication-summary';
          summary.innerText = `${events.length} event${events.length === 1 ? '' : 's'}`;
          container.appendChild(summary);
        }
      } else {
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

  renderScheduleBelowCalendar() {
    let container = document.getElementById('daily-schedule-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'daily-schedule-container';
      container.style.marginTop = '20px';
      this.container.appendChild(container);
    }
    container.innerHTML = "";

    if (!this.selectedDate) {
      this.selectedDate = new Date().toLocaleDateString('en-CA');
    }

    let entriesToRender = this.sortedSchedule.filter(entry => 
      entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );
  
    if (entriesToRender.length === 0) {
      container.innerText = "No scheduled medications for this day.";
      return;
    }

    if (this.isCareTakerSchedule) {
      let groups = {};
      entriesToRender.forEach(entry => {
        const name = entry.dependantName || 'Unknown';
        groups[name] = groups[name] || [];
        groups[name].push(entry);
      });

      for (const name in groups) {
        let groupContainer = document.createElement('div');
        groupContainer.className = 'entry-container';
        let header = document.createElement('h5');
        header.innerText = name;
        groupContainer.appendChild(header);
        groups[name].forEach(entry => {
          const medEntry = document.createElement('div');
          medEntry.className = 'medication-entry';
          const formattedTime = entry.doseTime.toTimeString().slice(0, 5);
          medEntry.innerText = `${entry.medication} at ${formattedTime}`;
          groupContainer.appendChild(medEntry);
        });
        container.appendChild(groupContainer);
      }
    } else if(this.isSingleDependant) {
      entriesToRender.forEach(entry => {
        const medEntry = document.createElement('div');
        medEntry.className = 'medication-entry';
        const formattedTime = entry.doseTime.toTimeString().slice(0, 5);
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

    if (!this.selectedDate) {
      this.selectedDate = new Date().toLocaleDateString('en-CA');
    }

    let entriesToRender = this.sortedSchedule.filter(
      entry => entry.doseTime.toLocaleDateString('en-CA') === this.selectedDate
    );

    if (this.isCareTakerSchedule) {
      let groups = {};
      entriesToRender.forEach(entry => {
        const name = entry.dependantName || 'Unknown';
        groups[name] = groups[name] || [];
        groups[name].push(entry);
      });

      for (const name in groups) {
        let groupContainer = document.createElement('ul');
        groupContainer.className = 'sidebar-list';
        let header = document.createElement('h5');
        header.innerText = name;
        groupContainer.appendChild(header);
        groups[name].forEach(entry => {
          const medEntry = document.createElement('li');
          medEntry.className = 'medication-entry-sidebar';
          const formattedTime = entry.doseTime.toTimeString().slice(0, 5);
          medEntry.innerText = `${entry.medication} at ${formattedTime}`;
          groupContainer.appendChild(medEntry);
        });
        sideBar.appendChild(groupContainer);
      }
    } else if(this.isSingleDependant) {
      const groupContainer = document.createElement('ul');
      groupContainer.className = 'sidebar-list';
      entriesToRender.forEach(entry => {
        const medEntry = document.createElement('li');
        medEntry.className = 'medication-entry';
        const formattedTime = entry.doseTime.toTimeString().slice(0, 5);
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


  window.getMedicationSchedule(calendar.isSingleDependant, calendar.isCareTakerSchedule)
    .then(schedule => {
      calendar.sortedSchedule = schedule;
      calendar.renderCalendar();
    })
    .catch(err => console.error(err));

  
});

