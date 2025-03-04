// Calendar Class for Dynamic Calendar Generation
class CalendarApp {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.init();
    }

    init() {
        this.renderCalendar();
        this.renderNavigation();
    }

    renderNavigation() {
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

        // Get first day of the month and total days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // Pad with previous month's days
        const startingDay = firstDay.getDay();
        for (let i = 0; i < startingDay; i++) {
            const paddingDay = document.createElement('div');
            paddingDay.className = 'calendar-day inactive';
            calendarGrid.appendChild(paddingDay);
        }

        // Render days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.innerText = day;
            dayElement.dataset.date = new Date(
                this.currentDate.getFullYear(), 
                this.currentDate.getMonth(), 
                day
            ).toISOString().split('T')[0];

            // Add click event for date selection
            dayElement.addEventListener('click', () => this.selectDate(dayElement));

            // Mark today's date
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
        // Remove previous selections
        const previousSelected = this.container.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Mark new selection
        dayElement.classList.add('selected');
        this.selectedDate = dayElement.dataset.date;

        // Trigger Firebase data retrieval
        this.fetchFirebaseData(this.selectedDate);
    }

    fetchFirebaseData(selectedDate) {
        // Placeholder for Firebase data retrieval
        console.log('Fetching data for:', selectedDate);
        
        // Example Firebase retrieval (modify as per your structure)
        // firebase.firestore().collection('events')
        //     .where('date', '==', selectedDate)
        //     .get()
        //     .then(snapshot => {
        //         // Process retrieved data
        //     });
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
}



// Inject styles
document.head.insertAdjacentHTML('beforeend', calendarStyles);

// Initialize Calendar on page load
document.addEventListener('DOMContentLoaded', () => {
    const calendar = new CalendarApp('calendar');
});