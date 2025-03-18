var globalUserId;

class CalendarApp {

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.init();
        this.medications = [];
    }

    init() {
        this.renderNavigation();
        this.renderCalendar();
    }

    renderNavigation() {
       
        const existingNav = this.container.querySelector('.calendar-navigation');
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

        this.container.appendChild(navContainer);
    }

    renderCalendar() {
        // Clear previous calendar
        const existingCalendar = this.container.querySelector('.calendar-grid');
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

        
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        
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
            ).toISOString().split('T')[0];

           
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

        this.container.appendChild(calendarGrid);
        this.updateMonthDisplay();
    }

    selectDate(dayElement) {
        
        const previousSelected = this.container.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        dayElement.classList.add('selected');
        this.selectedDate = dayElement.dataset.date;
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    formatMonthYear(date) {
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    updateMonthDisplay() {
        const monthDisplay = this.container.querySelector('#month-year-display');
        if (monthDisplay) {
            monthDisplay.innerText = this.formatMonthYear(this.currentDate);
        }
    }

    updateDependantSchedule() {
        const url = new URLSearchParams(window.location.search);
        const dependant = url.get('id');
    
        let isSingleDependant = false;
        let isCareTakerSchedule = false;
    
        const pageurl = window.location.href;
        if (pageurl.indexOf("single_dependant") > -1) {
            isSingleDependant = true;
        } else if (pageurl.indexOf("caretaker-schedule") > -1) {
            isCareTakerSchedule = true;
        }
    
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                globalUserId = user.uid;
                const button = document.getElementById("addMedication");
                if (button) {
                    button.addEventListener("click", createMedicationForm);
                }
    
                // Clear any previously loaded medications
                this.medications = [];
    
                if (isSingleDependant) {
                    // Retrieve medications for the single dependant
                    const medsSnapshot = await firebase.firestore()
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
                                name: medData.name || "Not specified",
                                frequency: medData.frequency || "Not specified",
                                startTime: medData.startTime || "Not specified",
                                startDate: medData.startDate || "Not specified",
                                endDate: medData.endDate || "Not specified"
                            },
                            dependantName: null // No dependant name needed here
                        };
                        this.medications.push(medObject);
                    });
                } else if (isCareTakerSchedule) {
                    // Retrieve all dependants for the caretaker
                    const dependantsSnapshot = await firebase.firestore()
                        .collection('users')
                        .doc(user.uid)
                        .collection('dependants')
                        .get();
    
                    // Loop through each dependant
                    for (const dependantDoc of dependantsSnapshot.docs) {
                        const dependantData = dependantDoc.data();
                        const dependantId = dependantDoc.id;
                        // Concatenate first and last names if available
                        const dependantName = (dependantData.firstname && dependantData.lastname)
                            ? (dependantData.firstname + " " + dependantData.lastname)
                            : "Unnamed";
    
                        // For each dependant, retrieve their medications
                        const medsSnapshot = await firebase.firestore()
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
                                    name: medData.name || "Not specified",
                                    frequency: medData.frequency || "Not specified",
                                    startTime: medData.startTime || "Not specified",
                                    startDate: medData.startDate || "Not specified",
                                    endDate: medData.endDate || "Not specified"
                                },
                                dependantName: dependantName // attach the dependant's name
                            };
                            this.medications.push(medObject);
                        });
                    }
                }
                // Save flags for use in populateSchedule
                this.isCareTakerSchedule = isCareTakerSchedule;
                this.isSingleDependant = isSingleDependant;
    
                console.log("populating schedule", this.medications);
                this.populateSchedule();
            } else {
                console.log("No user logged in");
            }
        });
    }
    
    populateSchedule() {
        let medArray = [];
        let doseTimes = [];
    
        this.medications.forEach(med => {
            const medData = med.Medication;
            // Ensure all required data is present
            if (!medData.startDate || !medData.endDate || !medData.startTime || !medData.frequency) return;
    
            const startDate = new Date(medData.startDate);
            const endDate = new Date(medData.endDate);
    
            // Extract the dosing interval in hours from the frequency string (e.g., "Every 4 Hours")
            let intervalHours = 24; // default to once a day
            const freqMatch = medData.frequency.match(/\d+/);
            if (freqMatch) {
                intervalHours = parseInt(freqMatch[0]);
            }
    
            // Loop over each day from startDate to endDate
            for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
                const formattedDay = day.toISOString().split('T')[0];
                const dayCell = this.container.querySelector(`.calendar-day[data-date="${formattedDay}"]`);
                if (!dayCell) continue;
    
                // For caretaker schedule, try to group by dependant name
                let entryContainer;
                if (this.isCareTakerSchedule && med.dependantName) {
                    // Check if a container for this dependant already exists in the day cell
                    entryContainer = dayCell.querySelector(`.entry-container[data-dependant="${med.dependantName}"]`);
                    if (!entryContainer) {
                        entryContainer = document.createElement('div');
                        entryContainer.className = 'entry-container';
                        entryContainer.setAttribute('data-dependant', med.dependantName);
                        const header = document.createElement('h3');
                        header.innerText = med.dependantName;
                        entryContainer.appendChild(header);
                        dayCell.appendChild(entryContainer);
                    }
                } else {
                    // For single dependant pages, create a new container (no header needed)
                    entryContainer = document.createElement('div');
                }
    
                // Parse the start time (assumed format "HH:MM")
                const [startHour, startMinute] = medData.startTime.split(':').map(Number);
                let doseTime = new Date(day);
                doseTime.setHours(startHour, startMinute, 0, 0);
    
                const bedTimeHour = 22; // cutoff time at 10 PM
    
                // Loop to calculate dose times until the bedtime limit
                while (doseTime.getDate() === day.getDate() && doseTime.getHours() < bedTimeHour) {
                    doseTimes.push({ doseTime: new Date(doseTime), medication: medData.name });
                    doseTime.setHours(doseTime.getHours() + intervalHours);
                }
            }
        });
    
       // Sort all dose times by time (ascending order) based on the time only
        doseTimes.sort((a, b) => {
            // Compare based on the time component only, ignoring the date part
            const timeA = a.doseTime.getHours() * 60 + a.doseTime.getMinutes();
            const timeB = b.doseTime.getHours() * 60 + b.doseTime.getMinutes();
            return timeA - timeB;
        });
    
        
        // Iterate over sorted dose times and add them to the calendar
        doseTimes.forEach(doseEntry => {
            console.log(doseEntry);
            const formattedTime = doseEntry.doseTime.toTimeString().slice(0, 5); // "HH:MM"
            const dayCell = this.container.querySelector(`.calendar-day[data-date="${doseEntry.doseTime.toISOString().split('T')[0]}"]`);
            if (!dayCell) return;
    
            let entryContainer = dayCell.querySelector(`.entry-container`);
            if (!entryContainer) {
                entryContainer = document.createElement('div');
            }
    
            const medEntry = document.createElement('div');
            medEntry.className = 'medication-entry';
            medEntry.innerText = `${doseEntry.medication} at ${formattedTime}`;
            entryContainer.appendChild(medEntry);
    
            // For single dependant pages, append the container to the day cell
            if (!this.isCareTakerSchedule) {
                dayCell.appendChild(entryContainer);
            }
        });
    }
}

document.head.insertAdjacentHTML('beforeend', calendar);

document.addEventListener('DOMContentLoaded', () => {
    const calendar = new CalendarApp('calendar');

    calendar.updateDependantSchedule();
});

