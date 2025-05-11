document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // Recycle Bin Elements
    const deletedProjectList = document.getElementById('deleted-project-list'); // New
    const deletedProjectMessage = document.getElementById('deleted-project-message'); // New
    const taskRecycleBinList = document.getElementById('recycle-bin-list'); // Renamed for clarity
    const taskRecycleBinMessage = document.getElementById('recycle-bin-message'); // Renamed for clarity

    let currentProjectId = null;
    const STORAGE_KEY = 'projectManagementData_v3'; // <<-- IMPORTANT: New key for structure change

    function getStoredData() {
        const data = localStorage.getItem(STORAGE_KEY);
        // Projects now have a 'status' field
        return data ? JSON.parse(data) : { projects: [], tasks: [] };
    }

    function saveStoredData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Refresh all relevant UI parts
        fetchProjectsAndTasks(); // Consolidated refresh logic
        displayDeletedProjects();
        displayTaskRecycleBin();
    }
    
    function fetchProjectsAndTasks() {
        const data = getStoredData();
        displayProjects(data.projects.filter(p => p.status === 'active'));

        const activeProjects = data.projects.filter(p => p.status === 'active');
        let projectToSelect = null;

        if (currentProjectId) {
            projectToSelect = activeProjects.find(p => p.id === currentProjectId);
        }
        if (!projectToSelect && activeProjects.length > 0) {
            projectToSelect = activeProjects[0];
        }

        if (projectToSelect) {
            selectProject(projectToSelect.id, projectToSelect.name);
        } else {
            currentProjectId = null;
            currentProjectIdInput.value = '';
            tasksHeader.textContent = 'Tasks';
            taskList.innerHTML = '<p>Select a project to view tasks.</p>';
            newTaskFormContainer.style.display = 'none';
        }
    }


    function displayMessage(element, text, isError = false) {
        element.textContent = text;
        element.className = 'message'; // Reset classes
        if (isError) {
            element.classList.add('error');
        }
        // Clear message after a delay (CSS handles actual styling)
        setTimeout(() => {
            element.textContent = '';
            element.classList.remove('error');
        }, 4000);
    }

    // --- Project Functions ---
    function displayProjects(activeProjects) {
        projectList.innerHTML = '';
        if (activeProjects.length === 0) {
            projectList.innerHTML = '<p>No active projects found. Create one!</p>';
            return;
        }
        activeProjects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.projectId = project.id;
            if (project.id === currentProjectId) {
                li.classList.add('selected');
            }

            const projectNameSpan = document.createElement('span');
            projectNameSpan.textContent = escapeHTML(project.name);
            projectNameSpan.addEventListener('click', () => selectProject(project.id, project.name));
            li.appendChild(projectNameSpan);

            // "Move to Recycle Bin" button for projects
            const softDeleteButton = document.createElement('button');
            softDeleteButton.textContent = 'Delete'; // Text implies move to bin
            softDeleteButton.title = "Move project to Recycle Bin";
            softDeleteButton.classList.add('delete-btn'); // Uses existing style, might need adjustment
            softDeleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to move project "${escapeHTML(project.name)}" to the recycle bin? Its tasks will also be moved to the task recycle bin.`)) {
                    softDeleteProject(project.id);
                }
            });
            li.appendChild(softDeleteButton);
            projectList.appendChild(li);
        });
    }

    function selectProject(projectId, projectName) {
        // Deselect previously selected project
        const previouslySelectedLi = projectList.querySelector(`li.selected`);
        if (previouslySelectedLi) {
            previouslySelectedLi.classList.remove('selected');
        }
        // Select new project
        const currentSelectedLi = projectList.querySelector(`li[data-project-id="${projectId}"]`);
        if (currentSelectedLi) {
            currentSelectedLi.classList.add('selected');
        } else {
            // If the selected project is not in the active list (e.g. after recovery and refresh)
            // this indicates a state mismatch or need for more robust refresh
            console.warn("Selected project LI not found in active list:", projectId);
        }

        currentProjectId = projectId;
        currentProjectIdInput.value = projectId;
        tasksHeader.textContent = `Tasks for "${escapeHTML(projectName)}"`;
        newTaskFormContainer.style.display = 'block';
        fetchTasksForCurrentProject();
        taskMessage.textContent = '';
    }

    newProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const projectName = projectNameInput.value.trim();
        if (projectName) {
            const data = getStoredData();
            const newProject = {
                id: Date.now(),
                name: projectName,
                status: 'active', // New projects are active
                createdAt: new Date().toISOString()
            };
            data.projects.push(newProject);
            saveStoredData(data);
            displayMessage(projectMessage, `Project "${escapeHTML(projectName)}" added successfully!`);
            projectNameInput.value = '';
            // Auto-select the new project
            if (newProject.id) selectProject(newProject.id, newProject.name);
        } else {
            displayMessage(projectMessage, 'Project name cannot be empty.', true);
        }
    });

    function softDeleteProject(projectId) {
        let data = getStoredData();
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            displayMessage(projectMessage, "Error: Project not found.", true);
            return;
        }

        const projectName = data.projects[projectIndex].name;
        data.projects[projectIndex].status = 'deleted'; // Soft delete project
        data.projects[projectIndex].deletedAt = new Date().toISOString();


        // Mark associated tasks as 'deleted' and note they were deleted due to project soft delete
        data.tasks = data.tasks.map(task => {
            if (task.projectId === projectId) {
                return {
                    ...task,
                    status: 'deleted',
                    isCompleted: false,
                    deletedReason: 'project_soft_deleted', // Specific reason
                    deletedAt: new Date().toISOString()
                };
            }
            return task;
        });

        if (currentProjectId === projectId) { // If the deleted project was selected
            currentProjectId = null;
        }
        saveStoredData(data);
        displayMessage(projectMessage, `Project "${escapeHTML(projectName)}" moved to Recycle Bin. Its tasks also moved to Task Recycle Bin.`);
    }

    // --- Task Functions ---
    function fetchTasksForCurrentProject() {
        if (!currentProjectId) {
            taskList.innerHTML = '<p>Select a project to view tasks.</p>';
            return;
        }
        const data = getStoredData();
        const projectTasks = data.tasks.filter(task => task.projectId === currentProjectId && task.status === 'active');
        displayTasks(projectTasks);
    }

    function displayTasks(tasks) {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = '<p>No active tasks yet. Add one!</p>';
            return;
        }
        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.taskId = task.id;
            if (task.isCompleted) li.classList.add('completed'); // For visual strike-through

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.isCompleted;
            checkbox.addEventListener('change', () => toggleTaskComplete(task.id, checkbox.checked));
            li.appendChild(checkbox);

            const taskTextSpan = document.createElement('span');
            taskTextSpan.classList.add('task-text');
            taskTextSpan.textContent = escapeHTML(task.description);
            li.appendChild(taskTextSpan);

            const softDeleteTaskButton = document.createElement('button');
            softDeleteTaskButton.textContent = 'Delete';
            softDeleteTaskButton.title = "Move task to Recycle Bin";
            softDeleteTaskButton.classList.add('delete-btn');
            softDeleteTaskButton.addEventListener('click', () => {
                if (confirm(`Are you sure you want to move task "${escapeHTML(task.description)}" to the task recycle bin?`)) {
                    softDeleteIndividualTask(task.id);
                }
            });
            li.appendChild(softDeleteTaskButton);
            taskList.appendChild(li);
        });
    }

    newTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskDescription = taskDescriptionTextarea.value.trim();
        const projectId = parseInt(currentProjectIdInput.value);
        if (taskDescription && projectId) {
            const data = getStoredData();
            if (!data.projects.some(p => p.id === projectId && p.status === 'active')) {
                displayMessage(taskMessage, 'Cannot add task: Selected project is not active or does not exist.', true);
                return;
            }
            const newTask = {
                id: Date.now(), projectId: projectId, description: taskDescription,
                isCompleted: false, status: 'active', createdAt: new Date().toISOString()
            };
            data.tasks.push(newTask);
            saveStoredData(data);
            displayMessage(taskMessage, `Task added successfully!`);
            taskDescriptionTextarea.value = '';
        } else {
            displayMessage(taskMessage, 'Task description cannot be empty and an active project must be selected.', true);
        }
    });

    function toggleTaskComplete(taskId, isChecked) {
        let data = getStoredData();
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            data.tasks[taskIndex].isCompleted = isChecked;
            if (isChecked && data.tasks[taskIndex].status === 'active') { // If marked complete from active list
                data.tasks[taskIndex].status = 'completed'; // Move to task recycle bin as 'completed'
                displayMessage(taskMessage, `Task marked as completed and moved to Task Recycle Bin.`);
            } else if (!isChecked && data.tasks[taskIndex].status === 'completed') { // If unmarked from (hypothetically) recycle bin
                data.tasks[taskIndex].status = 'active'; // Restore to active
                displayMessage(taskMessage, `Task restored to active tasks.`);
            }
            saveStoredData(data);
        } else {
            displayMessage(taskMessage, 'Error updating task: Task not found.', true);
        }
    }

    function softDeleteIndividualTask(taskId) {
        let data = getStoredData();
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            data.tasks[taskIndex].status = 'deleted';
            data.tasks[taskIndex].isCompleted = false;
            data.tasks[taskIndex].deletedReason = 'individual_deletion';
            data.tasks[taskIndex].deletedAt = new Date().toISOString();
            saveStoredData(data);
            displayMessage(taskMessage, `Task moved to Task Recycle Bin.`);
        } else {
            displayMessage(taskMessage, 'Error deleting task: Task not found.', true);
        }
    }

    // --- DELETED PROJECTS (Recycle Bin for Projects) ---
    function displayDeletedProjects() {
        deletedProjectList.innerHTML = '';
        const data = getStoredData();
        const softDeletedProjects = data.projects.filter(project => project.status === 'deleted');

        if (softDeletedProjects.length === 0) {
            deletedProjectList.innerHTML = '<p>No projects in recycle bin.</p>';
            return;
        }
        softDeletedProjects.sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt)); // Show newest deleted first

        softDeletedProjects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.projectId = project.id;

            const projectNameSpan = document.createElement('span');
            projectNameSpan.classList.add('project-name-deleted');
            projectNameSpan.textContent = escapeHTML(project.name);
            li.appendChild(projectNameSpan);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.marginLeft = 'auto';

            const recoverProjectButton = document.createElement('button');
            recoverProjectButton.textContent = 'Recover Project';
            recoverProjectButton.classList.add('recover-btn');
            recoverProjectButton.addEventListener('click', () => recoverProject(project.id));
            buttonsDiv.appendChild(recoverProjectButton);

            const permDeleteProjectButton = document.createElement('button');
            permDeleteProjectButton.textContent = 'Delete Permanently';
            permDeleteProjectButton.classList.add('permanent-delete-btn');
            permDeleteProjectButton.addEventListener('click', () => {
                if (confirm(`PERMANENTLY DELETE project "${escapeHTML(project.name)}" and ALL its tasks? This cannot be undone.`)) {
                    permanentlyDeleteProject(project.id);
                }
            });
            buttonsDiv.appendChild(permDeleteProjectButton);
            li.appendChild(buttonsDiv);
            deletedProjectList.appendChild(li);
        });
    }

    function recoverProject(projectId) {
        let data = getStoredData();
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            displayMessage(deletedProjectMessage, "Error: Project to recover not found.", true);
            return;
        }
        
        const projectName = data.projects[projectIndex].name;
        data.projects[projectIndex].status = 'active';
        delete data.projects[projectIndex].deletedAt;

        // Also recover associated tasks that were deleted due to this project's soft deletion
        data.tasks = data.tasks.map(task => {
            if (task.projectId === projectId && task.deletedReason === 'project_soft_deleted') {
                return {
                    ...task,
                    status: 'active', // Make tasks active again
                    // isCompleted remains as it was before project deletion
                    deletedReason: undefined,
                    deletedAt: undefined
                };
            }
            return task;
        });

        saveStoredData(data);
        displayMessage(deletedProjectMessage, `Project "${escapeHTML(projectName)}" and its tasks recovered.`);
        // Attempt to re-select the recovered project if no other project is active
        if (!currentProjectId) {
            selectProject(projectId, projectName);
        }
    }

    function permanentlyDeleteProject(projectId) {
        let data = getStoredData();
        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            displayMessage(deletedProjectMessage, "Error: Project to permanently delete not found.", true);
            return;
        }
        const projectName = project.name;

        // Permanently delete the project
        data.projects = data.projects.filter(p => p.id !== projectId);
        // Permanently delete ALL associated tasks, regardless of their status in task recycle bin
        data.tasks = data.tasks.filter(task => task.projectId !== projectId);

        if (currentProjectId === projectId) { // If the hard-deleted project was selected
            currentProjectId = null;
        }
        saveStoredData(data);
        displayMessage(deletedProjectMessage, `Project "${escapeHTML(projectName)}" and all its tasks permanently deleted.`);
    }


    // --- TASK RECYCLE BIN Functions ---
    function displayTaskRecycleBin() {
        taskRecycleBinList.innerHTML = '';
        const data = getStoredData();
        const recycledTasks = data.tasks.filter(task => task.status === 'completed' || task.status === 'deleted');

        if (recycledTasks.length === 0) {
            taskRecycleBinList.innerHTML = '<p>Task recycle bin is empty.</p>';
            return;
        }
        recycledTasks.sort((a, b) => new Date(b.deletedAt || b.createdAt) - new Date(a.deletedAt || a.createdAt));

        recycledTasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.taskId = task.id;

            const taskTextSpan = document.createElement('span');
            taskTextSpan.classList.add('task-text');
            taskTextSpan.textContent = escapeHTML(task.description);
            li.appendChild(taskTextSpan);

            const statusSpan = document.createElement('span');
            statusSpan.classList.add('task-status');
            if (task.status === 'completed') {
                statusSpan.textContent = 'Finished';
                statusSpan.classList.add('task-status-finished');
            } else if (task.status === 'deleted') {
                statusSpan.textContent = 'Deleted';
                if (task.deletedReason === 'project_soft_deleted') {
                    statusSpan.textContent += ' (Project in Bin)';
                } else if (task.deletedReason === 'individual_deletion') {
                     // statusSpan.textContent += ' (Individually)';
                }
                statusSpan.classList.add('task-status-deleted');
            }
            li.appendChild(statusSpan);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.marginLeft = 'auto';

            const recoverTaskButton = document.createElement('button');
            recoverTaskButton.textContent = 'Recover Task';
            recoverTaskButton.classList.add('recover-btn');
            const parentProject = data.projects.find(p => p.id === task.projectId);
            if (!parentProject || parentProject.status !== 'active') {
                recoverTaskButton.disabled = true;
                recoverTaskButton.title = "Parent project is not active or does not exist.";
            }
            recoverTaskButton.addEventListener('click', () => recoverIndividualTask(task.id));
            buttonsDiv.appendChild(recoverTaskButton);

            const permDeleteTaskButton = document.createElement('button');
            permDeleteTaskButton.textContent = 'Delete Permanently';
            permDeleteTaskButton.classList.add('permanent-delete-btn');
            permDeleteTaskButton.addEventListener('click', () => {
                if (confirm(`PERMANENTLY DELETE task "${escapeHTML(task.description)}"? This cannot be undone.`)) {
                    permanentlyDeleteTask(task.id);
                }
            });
            buttonsDiv.appendChild(permDeleteTaskButton);
            li.appendChild(buttonsDiv);
            taskRecycleBinList.appendChild(li);
        });
    }

    function recoverIndividualTask(taskId) {
        let data = getStoredData();
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            displayMessage(taskRecycleBinMessage, "Error: Task to recover not found.", true);
            return;
        }

        const taskToRecover = data.tasks[taskIndex];
        const parentProject = data.projects.find(p => p.id === taskToRecover.projectId);
        if (!parentProject || parentProject.status !== 'active') {
            displayMessage(taskRecycleBinMessage, "Cannot recover task: Parent project is not active or does not exist.", true);
            return;
        }

        taskToRecover.status = 'active';
        // isCompleted status remains, reflecting its state before hitting the bin (true if 'completed', false if 'deleted')
        delete taskToRecover.deletedReason;
        delete taskToRecover.deletedAt;

        saveStoredData(data);
        displayMessage(taskRecycleBinMessage, `Task "${escapeHTML(taskToRecover.description)}" recovered.`);
    }

    function permanentlyDeleteTask(taskId) {
        let data = getStoredData();
        const taskCount = data.tasks.length;
        data.tasks = data.tasks.filter(task => task.id !== taskId);

        if (data.tasks.length < taskCount) {
            saveStoredData(data);
            displayMessage(taskRecycleBinMessage, `Task permanently deleted.`);
        } else {
            displayMessage(taskRecycleBinMessage, `Error permanently deleting task: Task not found.`, true);
        }
    }

    // --- Helper Function ---
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --- Initial Load ---
    fetchProjectsAndTasks();
    displayDeletedProjects();
    displayTaskRecycleBin();
});