
# MediConnect

## Overview

MediConnect is a client-side web application designed to help caregivers efficiently manage the care of their dependents. It simplifies the process of tracking medications, viewing schedules, and maintaining health records for multiple individuals. The application provides an intuitive interface for organizing daily care tasks, managing detailed dependent profiles, and accessing crucial health information in one secure place.

Developed using HTML, CSS, and JavaScript, MediConnect utilizes Firebase and Firestore for backend services, including authentication and data storage.

---

## Features

-   **Dependent Profiles:** Add and manage detailed profiles for each dependent, including basic information, health summaries, medical history, allergies, and emergency contacts.
-   **Medication Management:** Add medications, define schedules (start/end dates/times, doses per day), track pills per dose, and handle continuous medication needs.
-   **Interactive Care Calendar:** View medication schedules and care tasks on a calendar, filterable by dependent (on larger screens), and see daily schedules.
-   **Task Management:** View a daily to-do list of scheduled medications on the main dashboard and mark tasks as complete.
-   **Notes and Issues Tracking:** Log notes and issues specific to each dependent.
-   **User Authentication:** Secure login and signup for caregivers.
-   **User Profile:** View personal profile information, including counts for dependants and tasks.
-   **Responsive Design:** Adapts to different screen sizes for accessibility on various devices.

---

---

## Technologies Used

-   **Frontend**: HTML, CSS, JavaScript
-   **JavaScript Libraries**: jQuery
-   **Backend & Platform**: Firebase
    -   Firebase Authentication
    -   Firestore (Database)
    -   Firebase Storage (Implied by SDK inclusion)
    -   FirebaseUI for Authentication

---

## Project Structure

1800_202510_BBY11/
├── styles/
│   ├── about.css                 # Styling for About page
│   ├── calendar.css              # Styling for Calendar components
│   ├── dashboard.css             # Styling for Main dashboard
│   ├── dependants.css            # Styling for Dependants list/form
│   ├── login.css                 # Styling for Login page
│   ├── navigation.css            # Styling for Navigation bar
│   ├── profile.css               # Styling for User Profile page
│   ├── single_dependent.css      # Styling for Single Dependant view
│   └── style.css                 # General/shared styles
├── scripts/
│   ├── authentication.js         # Handles Firebase Authentication UI
│   ├── calendar.js               # Logic for calendar display and interaction
│   ├── dependants.js             # Logic for adding/managing dependants list
│   ├── FIREBASE_API.js           # Firebase configuration
│   ├── main.js                   # Logic for the main dashboard (welcome message, tasks)
│   ├── profile.js                # Logic for user profile page (displaying info, stats, editing)
│   ├── script.js                 # General script (e.g., navigation setup, logout)
│   └── single_dependant.js       # Logic for the single dependant view (meds, notes, details)
├── about.html                    # About page
├── caretaker-schedule.html       # Page displaying the overall schedule/calendar
├── dependants.html               # Page for viewing and managing the list of dependants
├── index.html                    # Homepage / Landing page
├── login.html                    # Login/Signup page
├── main.html                     # Main user dashboard after login
├── profile.html                  # User profile page
├── README.md                     # This file
└── single_dependant.html         # Page for viewing details of a single dependant


---

---

## Contributors
- **Harshaan Grewal** - Hi, I'm a BCIT CST student who graduated from high school in 2024, I did a semester at Douglas before coming here. I love basketball, working out, and Tim Hortons!
- **Taylor Hillier** - BCIT CST Student, learning to code still and do cool stuff.
- **Son Bui** - excited to get this project done.

---

