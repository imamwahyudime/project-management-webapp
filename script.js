document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const projectList = document.getElementById('project-list');
    const taskList = document.getElementById('task-list');
    const newProjectForm = document.getElementById('new-project-form');
    const projectNameInput = document.getElementById('project-name');
    const projectMessage = document.getElementById('project-message');
    const tasksHeader = document.getElementById('tasks-header');
    const newTaskFormContainer = document.getElementById('new-task-form-container');
    const newTaskForm = document.getElementById('new-task-form');
    const currentProjectIdInput = document.getElementById('current-project-id');
    const taskDescriptionTextarea = document.getElementById('task-description');
    const taskMessage = document.getElementById('task-message');

    let currentProjectId = null; // Variable to keep track of the currently selected project

    // --- localStorage Utility Functions ---

    const STORAGE_KEY = 'projectManagementData'; // A key to store our data in localStorage

    function getStoredData() {
        const data = localStorage.getItem(STORAGE_KEY);
        // If data exists in localStorage, parse it from JSON.
        // Otherwise, return a new object with empty arrays for projects and tasks.
        return data ? JSON.parse(data) : { projects: [], tasks: [] };
    }

    function saveStoredData(data) {
        // Convert our JavaScript object (containing projects and tasks) into a JSON string
        // and save it in localStorage under the defined key.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }


    // --- Project Functions ---

    // Fetch and display all projects from localStorage
    function fetchProjects() {
        const data = getStoredData();
        displayProjects(data.projects);
    }

    // Display projects in the list
    function displayProjects(projects) {
        projectList.innerHTML = ''; // Clear current list
        if (projects.length === 0) {
            projectList.innerHTML = '<p>No projects found. Create one!</p>';
            // Hide task section if no projects exist
            tasksHeader.textContent = 'Tasks';
            taskList.innerHTML = '<p>Select a project to view tasks.</p>';
            newTaskFormContainer.style.display = 'none';
            currentProjectId = null;
            currentProjectIdInput.value = '';
            return;
        }
        projects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.projectId = project.id; // Store project ID on the element
            li.innerHTML = `<span>${escapeHTML(project.name)}</span>`; // Basic sanitization
            li.addEventListener('click', () => selectProject(project.id, project.name));
            projectList.appendChild(li);
        });
         // Auto-select the first project if any exist and no project is currently selected,
         // or re-select the previously selected project if it still exists.
         if (currentProjectId === null || !projects.find(p => p.id === currentProjectId)) {
              if (projects.length > 0) {
                 selectProject(projects[0].id, projects[0].name);
              } else {
                 // If no projects at all, clear task section
                 tasksHeader.textContent = 'Tasks';
                 taskList.innerHTML = '<p>Select a project to view tasks.</p>';
                 newTaskFormContainer.style.display = 'none';
                 currentProjectId = null;
                 currentProjectIdInput.value = '';
              }
         } else {
             const previouslySelected = projectList.querySelector(`li[data-project-id="${currentProjectId}"]`);
             if (previouslySelected) {
                 previouslySelected.classList.add('selected');
             } else if (projects.length > 0) {
                  // If the previously selected project no longer exists (e.g., deleted), select the first one
                  selectProject(projects[0].id, projects[0].name);
             } else {
                 // If no projects at all, clear task section
                 tasksHeader.textContent = 'Tasks';
                 taskList.innerHTML = '<p>Select a project to view tasks.</p>';
                 newTaskFormContainer.style.display = 'none';
                 currentProjectId = null;
                 currentProjectIdInput.value = '';
             }
         }
    }

    // Handle project selection
    function selectProject(projectId, projectName) {
        // Remove 'selected' class from previously selected project
        const previouslySelected = projectList.querySelector(`li.selected`);
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }

        // Add 'selected' class to the clicked project
        const currentSelected = projectList.querySelector(`li[data-project-id="${projectId}"]`);
        if (currentSelected) {
            currentSelected.classList.add('selected');
        }

        currentProjectId = projectId;
        currentProjectIdInput.value = projectId; // Update hidden input
        tasksHeader.textContent = `Tasks for "${escapeHTML(projectName)}"`; // Update tasks header
        newTaskFormContainer.style.display = 'block'; // Show the new task form
        fetchTasks(projectId); // Fetch tasks for the selected project
         taskMessage.textContent = ''; // Clear task messages on project switch
    }

    // Handle new project form submission
    newProjectForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        const projectName = projectNameInput.value.trim();

        if (projectName) {
            const data = getStoredData();
            const newProject = {
                // Generate a simple unique ID. Using timestamp is common for local data.
                // For a real application, a more robust ID generation might be needed.
                id: Date.now(),
                name: projectName,
                createdAt: new Date().toISOString() // Store creation time
            };
            data.projects.push(newProject);
            saveStoredData(data); // Save the updated data to localStorage

            projectMessage.textContent = `Project "${escapeHTML(projectName)}" added successfully!`;
            projectMessage.style.backgroundColor = '#d4edda'; // Success color
            projectMessage.style.color = '#155724';
            projectNameInput.value = ''; // Clear the input field
            fetchProjects(); // Refresh the project list to show the new project
        } else {
             projectMessage.textContent = 'Project name cannot be empty.';
             projectMessage.style.backgroundColor = '#fff3cd'; // Warning color
             projectMessage.style.color = '#856404';
        }
    });


    // --- Task Functions ---

    // Fetch and display tasks for a project from localStorage
    function fetchTasks(projectId) {
        const data = getStoredData();
        // Filter tasks array to get only tasks belonging to the selected project
        const projectTasks = data.tasks.filter(task => task.projectId === projectId);
        displayTasks(projectTasks);
    }

    // Display tasks in the list
    function displayTasks(tasks) {
        taskList.innerHTML = ''; // Clear current list
        if (tasks.length === 0) {
            taskList.innerHTML = '<p>No tasks yet. Add one!</p>';
            return;
        }
        // Sort tasks by creation date (optional, but good practice)
        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.taskId = task.id; // Store task ID on the element
            if (task.isCompleted) { // Use 'isCompleted' based on localStorage structure
                li.classList.add('completed');
            }
            li.innerHTML = `
                <input type="checkbox" ${task.isCompleted ? 'checked' : ''}>
                <span>${escapeHTML(task.description)}</span>
            `;

            // Add event listener to the checkbox to toggle completion status
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTaskComplete(task.id, checkbox.checked));

            taskList.appendChild(li);
        });
    }

    // Handle new task form submission
    newTaskForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        const taskDescription = taskDescriptionTextarea.value.trim();
        const projectId = currentProjectIdInput.value; // Get project ID from hidden input

        if (taskDescription && projectId) {
            const data = getStoredData();
            const newTask = {
                id: Date.now(), // Simple unique ID
                projectId: parseInt(projectId), // Ensure projectId is a number
                description: taskDescription,
                isCompleted: false, // New tasks are not completed by default
                createdAt: new Date().toISOString() // Store creation time
            };
            data.tasks.push(newTask);
            saveStoredData(data); // Save the updated data to localStorage

             taskMessage.textContent = `Task added successfully!`;
             taskMessage.style.backgroundColor = '#d4edda'; // Success color
             taskMessage.style.color = '#155724';
             taskDescriptionTextarea.value = ''; // Clear the input field
             fetchTasks(currentProjectId); // Refresh the task list for the current project
        } else {
             taskMessage.textContent = 'Task description cannot be empty.';
             taskMessage.style.backgroundColor = '#fff3cd'; // Warning color
             taskMessage.style.color = '#856404';
        }
    });

    // Handle marking task as complete/incomplete
    function toggleTaskComplete(taskId, isCompleted) {
        const data = getStoredData();
        // Find the task in the tasks array by its ID
        const task = data.tasks.find(task => task.id === taskId);

        if (task) {
            task.isCompleted = isCompleted; // Update the completion status
            saveStoredData(data); // Save the updated data to localStorage

            // Optimistic update: visually update the task immediately without re-fetching
            const taskElement = taskList.querySelector(`li[data-task-id="${taskId}"]`);
            if (taskElement) {
                if (isCompleted) {
                    taskElement.classList.add('completed');
                } else {
                    taskElement.classList.remove('completed');
                }
            }
             // Optional: Display a quick message
             // taskMessage.textContent = `Task marked as ${isCompleted ? 'completed' : 'incomplete'}.`;
             // taskMessage.style.backgroundColor = '#d4edda';
             // taskMessage.style.color = '#155724';
             // setTimeout(() => taskMessage.textContent = '', 2000); // Clear message after 2 seconds

        } else {
            console.error('Task not found for toggling completion:', taskId);
             // If task not found (shouldn't happen if IDs are managed correctly), revert the visual change
             const taskElement = taskList.querySelector(`li[data-task-id="${taskId}"]`);
             if (taskElement) {
                  taskElement.querySelector('input[type="checkbox"]').checked = !isCompleted;
             }
             // Display a temporary error message
             const tempMessage = document.createElement('p');
             tempMessage.textContent = `Error updating task: Task not found.`;
             tempMessage.classList.add('message');
             tempMessage.style.backgroundColor = '#f8d7da';
             tempMessage.style.color = '#721c24';
             tempMessage.style.position = 'absolute'; // Or fixed, to not disrupt layout
             tempMessage.style.right = '20px';
             tempMessage.style.bottom = '20px';
             document.body.appendChild(tempMessage);
             setTimeout(() => {
                 tempMessage.remove();
             }, 5000); // Remove message after 5 seconds
        }
    }

    // --- Helper Function for Basic HTML Sanitization ---
    // Prevents displaying HTML tags entered by users directly as HTML.
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --- Initial Load ---
    fetchProjects(); // Load projects from localStorage when the page loads
});
