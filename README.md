# Work Log Management

## About the Project

I built this application to record my daily work, track mentoring
activities, and review my work through reports. It also helps me keep
records of workshops, hackathons, and student achievements.

## Features

-   **Work Log:** Add, edit, and manage daily work entries.
-   **Mentor Log:** Track student questions and mark them as solved or
    carried forward.
-   **Reports:** Review weekly and monthly work summaries.
-   **Manager View:** View work records in a table.
-   **Google Sheets:** Keep supported records synchronized with Google
    Sheets.
-   **Offline Support:** Keep supported pending changes in the browser
    when the application is offline.
-   **Impact & Achievements:** Record event contributions and student
    outcomes, with Google Drive links for evidence.
-   **Appraisal Reports:** Prepare reports from saved achievements. AI
    reports require separate API configuration.

## Technologies Used

-   React and Vite
-   Tailwind CSS
-   Node.js and Express
-   MongoDB and Mongoose
-   Google Sheets API
-   Google Drive links for evidence

## How Data Is Saved

1.  I enter information through the React application.
2.  The frontend sends the data to the backend API.
3.  The backend validates the data and saves it in MongoDB.
4.  Supported records are synchronized with Google Sheets.
5.  The application displays the record and its synchronization status.

MongoDB is the main database. Google Sheets is used for tracking and
reviewing synchronized records. `localStorage` is used for supported
temporary offline or retry operations.

## Setup

1.  Install Node.js and make sure MongoDB is available.
2.  Install the frontend and backend dependencies using the commands in
    their respective `package.json` files.
3.  Configure the required environment variables using the project's
    `.env.example` file, if available.
4.  Configure Google Sheets access if synchronization is enabled.
5.  Start the frontend and backend using the scripts defined in the
    project.

Refer to the project's configuration files for the exact commands and
required environment variable names.

## Notes

-   Keep passwords, API keys, and service-account credentials private.
-   Google Drive files can only be opened by people who have the
    required permissions.
-   AI report generation requires a separately configured AI API key.
-   Check the application's sync status if a record has not appeared in
    Google Sheets.
