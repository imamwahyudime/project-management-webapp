# Simple Project Management Tool (Client-Side)

This is a simple web-based project management tool built using HTML, CSS, and JavaScript. This version of the application stores all project and task data directly in the user's web browser using the `localStorage` API.

## Features:

* Create and manage multiple projects.
* View tasks associated with a specific project.
* Add new tasks to projects.
* Mark tasks as completed or incomplete.
* Data persists locally in the browser's `localStorage`.

## Usage:

This is a client-side application, meaning it runs entirely in your web browser without needing a server or database.

- **Option 1:**
1. Go to https://imamwahyudime.github.io/project-management-webapp/
2. Enjoy!

- **Option 2:**
1.  Clone or download this repository.
2.  Open `index.html` in your web browser.
3.  Enjoy!

## Project Structure:

* `index.html`: The main HTML file that provides the structure of the application.
* `style.css`: Contains the CSS rules for styling the application's appearance.
* `script.js`: Contains the JavaScript code that handles user interactions, manages the application's state, and interacts with `localStorage` for data persistence.

## Data Storage:

Project and task data is stored in the browser's `localStorage` under the key `projectManagementData`. The data structure is a JSON object containing arrays for projects and tasks.

**Important Considerations for `localStorage`:**

* **Local Storage:** Data is only available in the browser and computer where it was created. It is not synced or shared.
* **Limited Size:** `localStorage` has storage limits (typically 5-10MB).
* **Not Secure:** Do not store sensitive information in `localStorage`.
* **User Can Clear:** Users can clear their browser's data, which will delete the application's stored information.
