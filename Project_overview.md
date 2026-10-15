# Work Log Management

## About this project

I built this application to make my daily work easier to record and
review. It helps me keep track of the tasks I complete, the mentoring
support I provide, and the outcomes I contribute to through workshops,
hackathons, and student development.

Earlier, keeping these details in different places made it difficult to
review everything later. I wanted one application where I could enter my
work once, review it when needed, and use the records to explain my
contributions during discussions and appraisals.

This document explains how the application works, how information moves
through the system, and where the data is stored.

## Table of contents

1.  [What the application does](#1-what-the-application-does)
2.  [Technology used](#2-technology-used)
3.  [Main features](#3-main-features)
4.  [How data moves through the
    application](#4-how-data-moves-through-the-application)
5.  [Where the data is stored](#5-where-the-data-is-stored)
6.  [Google Sheets integration](#6-google-sheets-integration)
7.  [Database models](#7-database-models)
8.  [API overview](#8-api-overview)
9.  [Setup and configuration](#9-setup-and-configuration)
10. [Security and current
    limitations](#10-security-and-current-limitations)

------------------------------------------------------------------------

## 1. What the application does

I use the Work Log application to record my daily activities, track
mentoring questions, review my work over time, and keep evidence of
larger contributions.

The main goals are:

-   Record daily tasks with start time, end time, and automatically
    calculated duration.
-   Keep track of mentoring questions and whether they were solved or
    carried forward.
-   Review weekly and monthly work summaries.
-   Keep Google Sheets updated so the information can also be reviewed
    there.
-   Retain pending changes when the application is temporarily offline.
-   Share selected records with a manager when needed.
-   Record workshops, hackathons, and student outcomes separately for
    appraisal purposes.

The application is built with a React frontend, a Node.js and Express
backend, MongoDB, and Google Sheets integration.

## 2. Technology used

  -----------------------------------------------------------------------
  Technology                          How I use it
  ----------------------------------- -----------------------------------
  React                               Builds the screens and forms I use.

  Vite                                Runs and builds the frontend.

  Tailwind CSS                        Styles the application.

  Node.js and Express                 Handle API requests and application
                                      logic.

  MongoDB and Mongoose                Store application records and
                                      validate their structure.

  Axios                               Sends requests from the frontend to
                                      the backend.

  Google Sheets API                   Copies supported records into
                                      spreadsheet tabs.

  Google Identity Services and JWT    Support sign-in and authenticated
                                      API requests, where configured.

  jsPDF and html2canvas               Help generate PDF reports.

  Google Drive links                  Let me attach references to
                                      evidence files without uploading
                                      the files into the application.

  Optional AI provider                Can help write an appraisal summary
                                      when a supported provider and API
                                      key are configured.
  -----------------------------------------------------------------------

The exact packages and versions should be checked in the project's
`package.json` files.

## 3. Main features

### 3.1 Dashboard

The dashboard gives me a quick view of my recent work and useful totals,
such as logged tasks and worked time. It also shows synchronization
information when that status is available.

### 3.2 Work Log

This is where I record my daily work. A work log can include:

-   Date
-   Task description
-   Start and end time
-   Calculated time spent
-   Category and activity type
-   Hall or section
-   Status and priority
-   Remarks

The duration is calculated from the selected start and end times. I can
review and manage saved entries, and the interface groups entries by
date where supported.

### 3.3 Mentor Log

The Mentor Log helps me record questions discussed during mentoring
sessions. It can include the question or problem, subject, category,
status, explanation, and remarks.

A question can be marked as **Solved** or **Carry Forward**. This gives
me a clearer record of what was resolved and what needs more follow-up.

### 3.4 Weekly and monthly reports

The reporting pages help me review my work over a selected period.
Depending on the report, they can show worked time, task counts,
categories, activity types, statuses, priorities, hall or section
summaries, and calendar views.

These reports help me understand how I spent my time and prepare
information for review.

### 3.5 Manager View and shared access

The Manager View provides a table-style view of work records.

The application also includes shared-link functionality, where
configured, so I can share selected information with a manager without
giving them my regular login. Shared links can have an expiry date and
can be revoked. Some shared views also support manager remarks.

A shared link should only expose the records allowed by its
implementation and configuration. I should test access permissions
before sharing a link.

### 3.6 Impact & Achievements

This section is separate from the daily Work Log. I use it to record
contributions that need more context than a normal task entry.

It contains two main types of records:

-   **Events & Initiatives:** workshops, hackathons, responsibilities,
    contributions, participant details, outcomes, and achievements.
-   **Student Impact:** a student's initial challenge, how I helped, and
    the outcome achieved.

I can attach Google Drive file or folder links as evidence. The files
stay in Drive; the application stores the links and related record
information.

The appraisal section supports standard report generation and can
support AI-generated summaries when the AI provider is configured. AI
reporting needs its own API credentials; a ChatGPT subscription does not
automatically provide API access. I should confirm the current
implementation and configuration before relying on AI reports.

### 3.7 Evidence and appraisal reports

When I prepare an appraisal report, I select the records I want to
showcase. Evidence linked to those records can be included in the report
as clickable links, subject to the report implementation and access
permissions.

I should check the report before sharing it, especially when it includes
student information.

------------------------------------------------------------------------

## 4. How data moves through the application

This section explains what happens when I enter and save a Work Log
record.

### Step 1: I enter information

I fill in the Work Log form in the React application. The form collects
the task details, date, times, category, activity type, and other
fields.

### Step 2: The frontend checks the input

The frontend checks required fields and calculates the duration from the
start and end times. This calculation helps me see the time spent before
saving.

### Step 3: The frontend sends an API request

The frontend service sends the record to the backend using an HTTP
request. If authentication is enabled for the route, the request
includes the required authentication information.

### Step 4: The backend validates the request

The Express route and controller receive the request. The backend checks
the input and applies the application's validation and business rules.
Important calculations, such as duration, should also be checked on the
server rather than trusting the browser alone.

### Step 5: MongoDB stores the record

The backend uses Mongoose to validate and save the record in MongoDB.
MongoDB is the main database for the application's records.

### Step 6: The backend responds

After the save operation, the backend returns a response to the
frontend. The interface can then show the saved record or display an
error if the operation failed.

### Step 7: Google Sheets is updated

The application attempts to synchronize supported records with the
configured Google Sheets tab. The record's synchronization status
indicates whether the sheet update succeeded or needs attention.

### Step 8: I see the result

The interface displays the record and, where implemented, its
synchronization status. If synchronization fails, the application can
show a pending or failed status and provide a retry option.

### Data flow diagram

``` mermaid
flowchart TD
    A[Enter information in React form] --> B[Frontend validation and calculations]
    B --> C[Send API request]
    C --> D[Express route and backend validation]
    D --> E[Save record in MongoDB]
    E --> F[Return response to frontend]
    E --> G[Synchronize with Google Sheets]
    G --> H{Did sheet sync succeed?}
    H -->|Yes| I[Mark record as synced]
    H -->|No| J[Record failure or pending status]
    F --> K[Show record and status in UI]
    I --> K
    J --> K
```

The exact timing of the response and Google Sheets update depends on the
relevant backend service. This diagram shows the general flow; the
implementation should be checked if the precise order matters.

### What happens when something fails?

  -----------------------------------------------------------------------
  Situation                           Expected handling
  ----------------------------------- -----------------------------------
  Invalid form input                  The application should show a
                                      validation message and reject the
                                      invalid data.

  Backend or MongoDB is unavailable   The save may fail. The interface
                                      should show an error and preserve
                                      the user's work where possible.

  Internet connection is lost         Supported operations can be held in
                                      a browser queue until the
                                      connection returns.

  Google Sheets is unavailable        A record already saved in MongoDB
                                      should remain there; the sheet sync
                                      should be marked as failed or
                                      pending if that behavior is
                                      implemented.

  Retry is needed                     Use the application's retry action,
                                      if available, and check the
                                      resulting sync status.
  -----------------------------------------------------------------------

Offline behavior and retry rules can differ between Work Log, Mentor
Log, and Impact & Achievements. I should refer to the actual service
implementation for any feature-specific details.

------------------------------------------------------------------------

## 5. Where the data is stored

The application uses different systems for different purposes.

  -----------------------------------------------------------------------
  Storage                             Purpose
  ----------------------------------- -----------------------------------
  MongoDB                             Main database for saved application
                                      records.

  Browser `localStorage`              Holds supported temporary offline
                                      operations or retry queues. It
                                      should not be treated as the
                                      permanent database.

  Google Sheets                       Provides a spreadsheet view of
                                      supported records for tracking and
                                      review.

  Google Drive                        Stores the evidence files that I
                                      upload manually. The application
                                      stores the associated links and
                                      details.

  Environment variables               Hold configuration and secret
                                      values needed by the backend and
                                      frontend.
  -----------------------------------------------------------------------

### MongoDB

MongoDB is the primary place to store records. The backend reads and
updates records there when I view, edit, or delete information.

### localStorage

The browser may keep pending operations when a supported action cannot
reach the backend. These items should be removed from the queue only
according to the application's successful-sync rules.

`localStorage` is browser-specific. It is not a replacement for MongoDB,
and clearing browser data can remove pending local changes that have not
reached the server.

### Google Sheets

Google Sheets is a synchronized copy for viewing and reporting. If a
sheet update fails, I should check the sync status and retry rather than
assume the spreadsheet has the latest data.

### Google Drive

I upload evidence files to Drive and add their links to the relevant
Impact & Achievements record. The manager must have permission to open
each shared file or folder. A link alone does not grant access to a
private Drive file.

------------------------------------------------------------------------

## 6. Google Sheets integration

The application uses the Google Sheets API to keep supported records in
spreadsheet tabs.

The documented worksheet structure is:

  -----------------------------------------------------------------------
  Tab                                 What it contains
  ----------------------------------- -----------------------------------
  `Work Logs`                         Daily work records, including date,
                                      task, category, times, duration,
                                      location, status, priority, and
                                      remarks.

  `Mentor Logs`                       Individual mentoring questions and
                                      their status or resolution.

  `Events & Initiatives`              Event details, my role,
                                      responsibilities, contributions,
                                      outcomes, and evidence links.

  `Student Impact`                    Student challenge, how I helped,
                                      achievement, privacy setting, and
                                      evidence links.
  -----------------------------------------------------------------------

The actual tab names and columns should match the sheet configuration
and the code.

### How updates work

The intended flow is:

1.  A record is saved in MongoDB.
2.  The backend prepares the fields for the correct worksheet.
3.  The Google Sheets API creates or updates the corresponding row.
4.  The application records the synchronization result.
5.  If a retry is needed, the application uses its supported retry
    process.

The implementation uses record identifiers for matching existing rows
where configured. This helps prevent duplicate rows during repeated sync
attempts.

Deleting rows needs special care because Google Sheets shifts later row
numbers upward. The code should keep its row references consistent after
deletions. The exact deletion behavior should be confirmed in the
relevant service before making changes to the spreadsheet manually.

### Google Sheets setup

The backend needs a Google Cloud project with the Google Sheets API
enabled and a service account that has access to the target spreadsheet.

The service account email must be given the required access to the
spreadsheet. The spreadsheet ID and service-account credentials must be
configured on the backend, not exposed in frontend code.

------------------------------------------------------------------------

## 7. Database models

The current project documentation identifies the following models. The
exact fields, relationships, and validation rules should be confirmed in
the corresponding Mongoose model files.

  -----------------------------------------------------------------------
  Model                               Purpose
  ----------------------------------- -----------------------------------
  `User`                              Stores user account and profile
                                      information.

  `WorkLog`                           Stores daily work entries and their
                                      sync information.

  `MentorLog`                         Stores mentoring questions and
                                      related details.

  `ImpactEvent`                       Stores workshops, hackathons, and
                                      other initiatives.

  `StudentImpact`                     Stores student challenges,
                                      mentoring contributions, and
                                      outcomes.

  `ShareLink`                         Stores information for shared Work
                                      Log portal links.

  `ImpactShareLink`                   Stores sharing information for
                                      Impact & Achievements reports.

  `ManagerRemark`                     Stores remarks submitted through
                                      supported manager-sharing views.
  -----------------------------------------------------------------------

The Work Log and Mentor Log have a relationship in the current design,
so mentoring questions can be associated with a relevant work session.
Impact & Achievements is intended to remain a separate feature and
should not depend on Work Log entries.

For exact field names, indexes, and required values, the Mongoose model
files are the source to check.

------------------------------------------------------------------------

## 8. API overview

The backend exposes REST APIs for the frontend. The route files define
the actual endpoints, parameters, and authentication requirements.

The main API groups documented for this project are:

  -----------------------------------------------------------------------
  API group                           Purpose
  ----------------------------------- -----------------------------------
  `/api/auth`                         Authentication and sign-in.

  `/api/worklogs`                     Create, read, update, and delete
                                      Work Log entries.

  `/api/worklogs/summary`             Weekly, monthly, and other Work Log
                                      summaries.

  `/api/mentor-logs`                  Manage mentoring questions and
                                      their details.

  `/api/share-links`                  Create and manage Work Log share
                                      links.

  `/api/shared`                       Provide access to supported shared
                                      portal views.

  `/api/impact`                       Manage Impact & Achievements
                                      records and related operations.
  -----------------------------------------------------------------------

These are route groups, not a complete endpoint list. For exact HTTP
methods, query parameters, request bodies, and authentication rules,
check the Express route files and controllers before using or changing
an endpoint.

------------------------------------------------------------------------

## 9. Setup and configuration

### Prerequisites

The versions required by the current project should be checked in
`package.json`. The documented setup uses:

-   Node.js (v20 or newer is recommended).
-   MongoDB locally or through MongoDB Atlas.
-   A Google Cloud project with the Google Sheets API enabled.
-   A service account with access to the configured spreadsheet.
-   A Google OAuth client ID if Google sign-in is enabled.

### Install dependencies

Use the package files in the repository to determine the correct install
commands. In a typical setup, install the frontend and backend
dependencies from their respective directories:

``` bash
cd client
npm install

cd ../server
npm install
```

### Configure environment variables

Create the required local environment files based on the project's
`.env.example` files, if available. Add the values for the services that
are actually enabled.

Typical configuration includes:

-   MongoDB connection string.
-   Backend port.
-   Google Sheets spreadsheet ID and worksheet names.
-   Google service-account email and private key.
-   Google OAuth client ID, if sign-in is enabled.
-   Frontend API base URL.
-   Optional AI provider key, if AI report generation is enabled.

Use the exact variable names expected by the code. Never commit real
credentials or paste them into the frontend source.

### Run the application

Check the `scripts` section of each `package.json` for the correct
commands. A common development setup uses:

``` bash
npm run dev
```

Run the command from the appropriate frontend or backend directory. If
the repository has a root-level script that starts both services, follow
the root `package.json` instead.

### Google Sheets configuration

1.  Open the Google Cloud Console.
2.  Select or create a project.
3.  Enable the Google Sheets API.
4.  Create or select a service account.
5.  Configure its credentials in the backend environment.
6.  Share the target spreadsheet with the service account email and give
    it the required permissions.
7.  Add the spreadsheet ID and any required worksheet configuration.

### Deployment

For deployment, configure environment variables in the hosting
platform's dashboard. The frontend must use the correct backend API URL,
and the backend must have access to MongoDB and Google Sheets.

Do not rely on a developer's local `.env` file being available in
production.

------------------------------------------------------------------------

## 10. Security and current limitations

### Security

-   Keep database credentials, service-account keys, and AI API keys on
    the backend.
-   Do not commit `.env` files or expose secrets in frontend code.
-   Use authentication and authorization for private records.
-   Check ownership before allowing a user to view, edit, or delete a
    record.
-   Share only the information needed for a manager review.
-   Keep student information private unless sharing is permitted.
-   Confirm Google Drive permissions before sharing evidence links.

The exact protection provided by each route depends on its middleware
and implementation, so security-sensitive changes should be checked
against the code.

### Reliability

MongoDB and Google Sheets have different roles. MongoDB holds the
application records, while Google Sheets provides a synchronized view. A
successful database save does not automatically mean the corresponding
sheet row has been updated.

When the application shows a pending or failed sync status, I should use
the retry option and confirm the result.

### Known limitations to keep in mind

-   Google Sheets has API quotas, so repeated requests can be
    rate-limited.
-   A manual retry may be needed if automatic retry is not configured
    for a particular operation.
-   Manual edits or row deletions in Google Sheets can affect row-based
    synchronization logic, depending on how that service is implemented.
-   Google Drive links work only for people who have permission to open
    the files.
-   AI appraisal reports require a separately configured provider and
    API key. A consumer ChatGPT subscription does not automatically
    provide API access.
-   Some features may need additional setup or testing in the deployment
    environment.

------------------------------------------------------------------------

## Final note

I built this application to make it easier to record my work, review my
mentoring activities, and keep evidence of the contributions I make. The
main benefit is that I do not have to depend only on memory when I need
to explain what I worked on or what outcomes I supported.

This README is meant to explain the project in simple terms. For exact
implementation details, the source code---especially the Mongoose
models, API routes, controllers, and synchronization services---should
be treated as the final reference.
