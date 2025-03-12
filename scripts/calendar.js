
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
        var dependantDoc;
        const url = new URLSearchParams(window.location.search);
        const dependant = url.get('id');
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                globalUserId = user.uid;
                let button = document.getElementById("addMedication");
                if (button) {
                    button.addEventListener("click", createMedicationForm); // Attach the event listener correctly
                }
                dependantDoc = await firebase.firestore().collection('users').doc(user.uid).collection('dependants').doc(dependant).collection
                ('medications').get();

                dependantDoc.docs.map(medication => {
                    const medData = medication.data();
    
                    const medObject = {
                        "Medication": {
                            "Frequency": medData.frequency || "Not specified", 
                            "StartTime": medData.startTime || "Not specified",
                            "StartDate": medData.startDate || "Not specified",
                            "EndDate": medData.endDate || "Not specified"
                        }
                    };

                    medObject.Medication.name = medData.name;
                    medObject.Medication.startTime = medData.startTime;
                    medObject.Medication.startDate = medData.startDate;
                    medObject.Medication.endDate = medData.endDate;
                    
                    // Add the medication object to your array
                    this.medications.push(medObject);

                    console.log(medObject);
                })
            } else {
                console.log("No user logged in");
            }
        });
    }
}

document.head.insertAdjacentHTML('beforeend', calendar);

document.addEventListener('DOMContentLoaded', () => {
    const calendar = new CalendarApp('calendar');

    var url = window.location.href;
    if(url.indexOf("single_dependant") > -1){
        calendar.updateDependantSchedule();
    }
});

