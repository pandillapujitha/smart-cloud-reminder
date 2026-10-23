# Smart Cloud Reminder and Notification System

A simple cloud-based reminder app built with **HTML, CSS, JavaScript and Firebase**.
Users register, log in, and manage reminders that are stored in the cloud (Firestore),
so they are available from any device.

## Features
- Register, log in, log out and reset password (Firebase Authentication)
- Add, edit and delete reminders (Cloud Firestore)
- Date and time selection, category and priority
- Upcoming and Completed lists, with an Overdue marker
- Search, plus filter by category and priority
- Notifications: in-app alert, bell panel and optional browser notifications
- Live sync: changes appear instantly, across tabs and devices
- Responsive design for mobile, tablet and desktop

## Project structure
```
smart-cloud-reminder/
├── index.html            Login and register page
├── dashboard.html        Reminders dashboard
├── css/style.css         All styling
├── js/firebase-config.js Your Firebase keys (edit this)
├── js/auth.js            Login, register, reset password
├── js/app.js             Reminders, search, filters, notifications
├── firestore.rules       Security rules for Firestore
└── README.md
```

## Setup (about 5 minutes)
1. Go to https://console.firebase.google.com and click **Add project**.
2. In **Project settings > General**, add a **Web app** (`</>`) and copy the `firebaseConfig` values.
3. Paste them into `js/firebase-config.js`.
4. Open **Build > Authentication > Get started**, then enable **Email/Password**.
5. Open **Build > Firestore Database > Create database** (start in production mode).
6. In the Firestore **Rules** tab, paste the contents of `firestore.rules` and click **Publish**.

## Run the project
The app uses JavaScript modules, so it must run on a local server (opening the file by double-click will not work).

- **VS Code:** install the *Live Server* extension, right-click `index.html`, and choose **Open with Live Server**.
- **Or Python:** run `python -m http.server 5500` in the project folder, then open http://localhost:5500

`localhost` is allowed by Firebase Authentication by default.

## Deploy (optional)
Use **Firebase Hosting** (`firebase init hosting`, then `firebase deploy`) or GitHub Pages.
After deploying, add your site domain under **Authentication > Settings > Authorized domains**.

## How notifications work
While the dashboard is open, the app checks every 15 seconds. When a reminder's time arrives it:
1. shows a pop-up message,
2. adds it to the bell panel with a counter badge,
3. sends a browser notification if you allowed it (bell panel > Turn on).

The reminder is then marked `notified: true` in Firestore so it does not alert twice.
Notifications work while the page is open in a tab.

## Firestore data model
Collection `reminders`, one document per reminder:

| Field | Type | Meaning |
|---|---|---|
| uid | string | Owner's Firebase user ID |
| title | string | Reminder title |
| description | string | Optional note |
| dueAt | timestamp | Date and time |
| category | string | Study, Work, Personal, Health, Other |
| priority | string | low, medium, high |
| completed | boolean | Done or not |
| notified | boolean | Alert already sent |
| createdAt | timestamp | Created time |

## Cloud computing concepts shown
- **BaaS / SaaS:** Firebase provides the backend without managing servers
- **Authentication as a service** (Firebase Auth)
- **NoSQL cloud database** (Firestore) with real-time sync
- **Security rules** so each user can only access their own data
- **Scalability and availability** handled by Google Cloud
