class TaskFlowApp {
    constructor() {
        this.mainStopwatch = {
            startTime: 0,
            elapsedTime: 0,
            timerInterval: null,
            isRunning: false,
            laps: []
        };
        
        this.tasks = [];
        this.taskIdCounter = 0;
        
        this.initializeElements();
        this.bindEvents();
        this.updateMainDisplay();
        this.setDefaultTimes();
        this.loadFromStorage();
        this.startGlobalTimer();
        
        // Add welcome message
        setTimeout(() => {
            this.showNotification('Welcome to TaskFlow Pro! 🚀', 'success');
        }, 1000);
    }
    
    initializeElements() {
        // Main stopwatch elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.millisecondsDisplay = document.getElementById('millisecondsDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.lapBtn = document.getElementById('lapBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.lapsSection = document.getElementById('lapsSection');
        this.lapsList = document.getElementById('lapsList');
        
        // Task form elements
        this.taskTitle = document.getElementById('taskTitle');
        this.taskDescription = document.getElementById('taskDescription');
        this.startTime = document.getElementById('startTime');
        this.dueTime = document.getElementById('dueTime');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.tasksContainer = document.getElementById('tasksContainer');
    }
    
    bindEvents() {
        // Main stopwatch events
        this.startBtn.addEventListener('click', () => this.startMainStopwatch());
        this.stopBtn.addEventListener('click', () => this.stopMainStopwatch());
        this.resetBtn.addEventListener('click', () => this.resetMainStopwatch());
        this.lapBtn.addEventListener('click', () => this.lapMainStopwatch());
        
        // Task management events
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        
        // Form validation
        this.taskTitle.addEventListener('input', () => this.validateForm());
        this.startTime.addEventListener('change', () => this.validateForm());
        this.dueTime.addEventListener('change', () => this.validateForm());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.mainStopwatch.isRunning ? this.stopMainStopwatch() : this.startMainStopwatch();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.resetMainStopwatch();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    if (this.mainStopwatch.isRunning) this.lapMainStopwatch();
                    break;
                case 'KeyN':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.taskTitle.focus();
                    }
                    break;
            }
        });

        // Auto-save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });

        // Add form enter key handling
        this.taskTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.addTaskBtn.disabled) {
                this.addTask();
            }
        });
    }
    
    validateForm() {
        const title = this.taskTitle.value.trim();
        const startTime = this.startTime.value;
        const dueTime = this.dueTime.value;
        
        let isValid = title && startTime && dueTime;
        
        if (startTime && dueTime) {
            const start = new Date(startTime);
            const due = new Date(dueTime);
            if (start >= due) {
                isValid = false;
            }
        }
        
        this.addTaskBtn.disabled = !isValid;
        
        // Visual feedback
        if (title) {
            this.taskTitle.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        } else {
            this.taskTitle.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    }
    
    setDefaultTimes() {
        const now = new Date();
        const startTime = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
        const dueTime = new Date(now.getTime() + 65 * 60000); // 65 minutes from now
        
        this.startTime.value = this.formatDateTimeLocal(startTime);
        this.dueTime.value = this.formatDateTimeLocal(dueTime);
        this.validateForm();
    }
    
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Storage Methods
    saveToStorage() {
        const data = {
            tasks: this.tasks.map(task => ({
                ...task,
                startTime: task.startTime.toISOString(),
                dueTime: task.dueTime.toISOString(),
                originalDueTime: task.originalDueTime.toISOString(), // Save originalDueTime
                createdAt: task.createdAt.toISOString(),
                completedAt: task.completedAt ? task.completedAt.toISOString() : null
            })),
            taskIdCounter: this.taskIdCounter,
            mainStopwatch: {
                ...this.mainStopwatch,
                timerInterval: null // Don't save interval
            }
        };
        localStorage.setItem('taskflow_data', JSON.stringify(data));
    }
    
    loadFromStorage() {
        const data = localStorage.getItem('taskflow_data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                
                // Load tasks
                this.tasks = parsed.tasks.map(task => ({
                    ...task,
                    startTime: new Date(task.startTime),
                    dueTime: new Date(task.dueTime),
                    originalDueTime: new Date(task.originalDueTime || task.dueTime), // Load originalDueTime, default to dueTime if not present
                    createdAt: new Date(task.createdAt),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null,
                    timerInterval: null,
                    taskStartTime: null,
                    pausedTimeRemaining: task.pausedTimeRemaining !== undefined ? task.pausedTimeRemaining : null // Load pausedTimeRemaining
                }));
                
                this.taskIdCounter = parsed.taskIdCounter || 0;
                
                // Load main stopwatch state
                if (parsed.mainStopwatch) {
                    this.mainStopwatch.elapsedTime = parsed.mainStopwatch.elapsedTime || 0;
                    this.mainStopwatch.laps = parsed.mainStopwatch.laps || [];
                }
                
                this.renderTasks();
                this.updateLapsDisplay();
                
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }
    
    // Main Stopwatch Methods
    startMainStopwatch() {
        if (!this.mainStopwatch.isRunning) {
            this.mainStopwatch.startTime = Date.now() - this.mainStopwatch.elapsedTime;
            this.mainStopwatch.timerInterval = setInterval(() => this.updateMainDisplay(), 10);
            this.mainStopwatch.isRunning = true;
            this.startBtn.textContent = 'Running';
            this.startBtn.disabled = true;
            this.statusIndicator.classList.add('running');
            this.lapBtn.disabled = false;
            this.showNotification('Stopwatch started! ⏱️', 'success');
        }
    }
    
    stopMainStopwatch() {
        if (this.mainStopwatch.isRunning) {
            clearInterval(this.mainStopwatch.timerInterval);
            this.mainStopwatch.isRunning = false;
            this.startBtn.textContent = 'Start';
            this.startBtn.disabled = false;
            this.statusIndicator.classList.remove('running');
            this.lapBtn.disabled = true;
            this.saveToStorage();
            this.showNotification('Stopwatch stopped! ⏹️', 'info');
        }
    }
    
    resetMainStopwatch() {
        this.stopMainStopwatch();
        this.mainStopwatch.elapsedTime = 0;
        this.mainStopwatch.laps = [];
        this.updateMainDisplay();
        this.updateLapsDisplay();
        this.saveToStorage();
        this.showNotification('Stopwatch reset! 🔄', 'info');
    }
    
    lapMainStopwatch() {
        if (this.mainStopwatch.isRunning) {
            const lapTime = this.mainStopwatch.elapsedTime;
            this.mainStopwatch.laps.push({
                number: this.mainStopwatch.laps.length + 1,
                time: lapTime,
                timestamp: Date.now()
            });
            this.updateLapsDisplay();
            this.saveToStorage();
            this.showNotification(`Lap ${this.mainStopwatch.laps.length} recorded! �`, 'success');
        }
    }
    
    updateMainDisplay() {
        this.mainStopwatch.elapsedTime = this.mainStopwatch.isRunning ? 
            Date.now() - this.mainStopwatch.startTime : 
            this.mainStopwatch.elapsedTime;
        
        const formatted = this.formatTime(this.mainStopwatch.elapsedTime);
        this.timeDisplay.textContent = formatted.time;
        this.millisecondsDisplay.textContent = formatted.milliseconds;
    }
    
    updateLapsDisplay() {
        if (this.mainStopwatch.laps.length > 0) {
            this.lapsSection.style.display = 'block';
            this.lapsList.innerHTML = '';
            
            // Show laps in reverse order (newest first)
            const reversedLaps = [...this.mainStopwatch.laps].reverse();
            
            reversedLaps.forEach((lap, index) => {
                const lapElement = document.createElement('div');
                lapElement.className = 'lap-item';
                lapElement.style.animationDelay = `${index * 0.1}s`;
                
                const formatted = this.formatTime(lap.time);
                lapElement.innerHTML = `
                    <span class="lap-number">Lap ${lap.number}</span>
                    <span class="lap-time">${formatted.time}${formatted.milliseconds}</span>
                `;
                
                this.lapsList.appendChild(lapElement);
            });
        } else {
            this.lapsSection.style.display = 'none';
        }
    }
    
    // Task Management Methods
    addTask() {
        const title = this.taskTitle.value.trim();
        const description = this.taskDescription.value.trim();
        const startTime = new Date(this.startTime.value);
        const dueTime = new Date(this.dueTime.value);
        
        if (!title || !this.startTime.value || !this.dueTime.value) {
            this.showNotification('Please fill in all required fields! ⚠️', 'error');
            return;
        }
        
        if (startTime >= dueTime) {
            this.showNotification('Due time must be after start time! ⚠️', 'error');
            return;
        }
        
        const task = {
            id: ++this.taskIdCounter,
            title,
            description,
            startTime,
            dueTime,
            originalDueTime: dueTime, // Store original due time for progress bar base
            createdAt: new Date(),
            status: 'pending', // pending, running, paused, completed, expired
            elapsedTime: 0, // For tracking active work time
            taskStartTime: null, // For tracking current session active work time
            completedAt: null,
            pausedTimeRemaining: null // To store remaining time when paused
        };
        
        this.tasks.push(task);
        this.renderTasks();
        this.clearForm();
        this.saveToStorage();
        this.showNotification(`Task "${title}" added successfully! ✅`, 'success');
    }
    
    clearForm() {
        this.taskTitle.value = '';
        this.taskDescription.value = '';
        this.taskTitle.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        this.setDefaultTimes();
    }
    
    renderTasks() {
        this.tasksContainer.innerHTML = '';
        
        // Sort tasks by status and due time
        const sortedTasks = [...this.tasks].sort((a, b) => {
            const statusOrder = { running: 0, pending: 1, paused: 2, expired: 3, completed: 4 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return a.dueTime - b.dueTime;
        });
        
        sortedTasks.forEach((task, index) => {
            const taskElement = this.createTaskElement(task);
            taskElement.classList.add('task-loading');
            taskElement.style.animationDelay = `${index * 0.1}s`;
            this.tasksContainer.appendChild(taskElement);
        });
    }
    
    createTaskElement(task) {
        const taskCard = document.createElement('div');
        const now = new Date();
        const timeRemaining = task.dueTime - now; // This is the live remaining time for initial render
        const totalTime = task.originalDueTime - task.startTime; // Use original for total duration
        const progress = Math.max(0, Math.min(100, ((totalTime - timeRemaining) / totalTime) * 100));
        
        // Determine task class
        let taskClass = 'task-card';
        if (task.status === 'expired' || timeRemaining <= 0) {
            taskClass += ' urgent';
        }
        if (task.status === 'completed') {
            taskClass += ' completed';
        }
        
        taskCard.className = taskClass;
        
        // Format elapsed time for running tasks
        let elapsedDisplay = '';
        if (task.status === 'running' && task.taskStartTime) {
            const currentElapsed = Date.now() - task.taskStartTime;
            const formatted = this.formatTime(task.elapsedTime + currentElapsed); // total elapsed
            elapsedDisplay = `<div style="font-size: 0.85rem; color: var(--text-accent); margin-top: 8px; font-family: 'JetBrains Mono', monospace;">
                // Elapsed: ${formatted.time}${formatted.milliseconds}
            </div>`;
        }
        
        taskCard.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description}</div>
                </div>
            </div>
            
            <div class="task-timer">
                <div class="task-timer-display ${this.getTimerDisplayClass(task, timeRemaining)}" id="timer-${task.id}">
                    ${this.getTimerDisplayText(task, timeRemaining)}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace;">
                    // ${this.getTimerLabel(task, timeRemaining)}
                </div>
                ${elapsedDisplay}
            </div>
            
            <div class="task-controls">
                <!-- Removed Start button as countdown starts automatically -->
                <button class="task-btn task-btn-pause" onclick="taskFlow.togglePauseResumeTask(${task.id})"
                        ${task.status === 'completed' || task.status === 'expired' ? 'disabled' : ''}>
                    ${task.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button class="task-btn task-btn-complete" onclick="taskFlow.completeTask(${task.id})"
                        ${task.status === 'completed' ? 'disabled' : ''}>
                    Complete
                </button>
                <button class="task-btn task-btn-delete" onclick="taskFlow.deleteTask(${task.id})">
                    Delete
                </button>
            </div>
            
            <div class="task-progress">
                <div class="task-progress-bar ${this.getProgressBarClass(task, timeRemaining)}" 
                     style="width: ${progress}%"></div>
            </div>
            
            <div class="task-meta">
                <span>// Created: ${task.createdAt.toLocaleString()}</span>
                <span class="task-status ${task.status}">${task.status.toUpperCase()}</span>
            </div>
        `;
        
        return taskCard;
    }
    
    getTimerDisplayClass(task, timeRemaining) {
        if (task.status === 'completed') return 'completed';
        if (task.status === 'running') return 'running';
        if (task.status === 'paused') return 'paused'; // Add paused class for styling
        if (timeRemaining <= 0) return 'expired';
        return 'countdown';
    }
    
    getTimerDisplayText(task, timeRemaining) {
        if (task.status === 'completed') {
            return 'COMPLETED';
        }
        if (task.status === 'paused') {
            // Display the time remaining captured at the moment of pause
            return this.formatCountdown(Math.max(0, task.pausedTimeRemaining));
        }
        // For running, pending, expired, display live countdown based on current dueTime
        return this.formatCountdown(Math.max(0, task.dueTime - new Date()));
    }
    
    getTimerLabel(task, timeRemaining) {
        if (task.status === 'completed') return 'Task Completed';
        if (timeRemaining <= 0) return 'Time Expired!';
        return 'Time Remaining';
    }
    
    getProgressBarClass(task, timeRemaining) {
        if (task.status === 'completed') return 'completed';
        if (timeRemaining <= 0) return 'urgent';
        return '';
    }
    
    togglePauseResumeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.status === 'completed' || task.status === 'expired') return;

        if (task.status === 'running') {
            // Pause the task
            task.status = 'paused';
            task.pausedTimeRemaining = task.dueTime - Date.now(); // Capture current remaining time
            // If it was running, update its active elapsed time
            if (task.taskStartTime) {
                task.elapsedTime += (Date.now() - task.taskStartTime);
                task.taskStartTime = null;
            }
            this.showNotification(`Task "${task.title}" paused ⏸️`, 'warning');
        } else if (task.status === 'paused' || task.status === 'pending') {
            // Resume the task
            task.status = 'running';
            // Adjust dueTime: add the duration it was paused
            if (task.pausedTimeRemaining !== null) {
                // If resuming from a pause, the new due time is now + the remaining time captured at pause
                task.dueTime = new Date(Date.now() + task.pausedTimeRemaining);
                task.pausedTimeRemaining = null; // Clear it once resumed
            } else {
                // If starting a pending task for the first time, set taskStartTime
                task.taskStartTime = Date.now();
            }
            this.showNotification(`Task "${task.title}" resumed! ▶️`, 'success');
        }
        // No full renderTasks() here, updateTaskTimers will handle DOM updates on next tick
        this.saveToStorage();
    }
    
    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.status === 'completed') return;
        
        task.status = 'completed';
        task.completedAt = new Date();
        if (task.taskStartTime) { // If it was running when completed, add current session elapsed time
            task.elapsedTime += (Date.now() - task.taskStartTime);
        }
        task.taskStartTime = null; // Clear taskStartTime
        task.pausedTimeRemaining = null; // Clear any paused state
        
        // Force a re-render for status change and button disabling
        this.renderTasks(); 
        this.saveToStorage();
        this.showNotification(`Task "${task.title}" completed! 🎉`, 'success');
    }
    
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        this.tasks.splice(taskIndex, 1);
        this.renderTasks(); // Re-render to remove the task card
        this.saveToStorage();
        this.showNotification(`Task "${task.title}" deleted 🗑️`, 'info');
    }
    
    updateTaskTimers() {
        let shouldReRenderTasks = false; // Flag to indicate if a full re-render is needed

        this.tasks.forEach(task => {
            const now = new Date();
            // Calculate the actual time remaining based on the task's current dueTime
            let currentRemainingCountdown = task.dueTime - now;

            // Get the timer display element for this specific task
            const timerElement = document.getElementById(`timer-${task.id}`);
            const progressBarElement = document.querySelector(`#timer-${task.id}`).closest('.task-card')?.querySelector('.task-progress-bar');
            const taskStatusElement = document.querySelector(`#timer-${task.id}`).closest('.task-card')?.querySelector('.task-status');
            const pauseResumeButton = document.querySelector(`#timer-${task.id}`).closest('.task-card')?.querySelector('.task-btn-pause');
            const completeButton = document.querySelector(`#timer-${task.id}`).closest('.task-card')?.querySelector('.task-btn-complete');
            const elapsedDisplayElement = document.querySelector(`#timer-${task.id}`).parentElement.querySelector('[style*="Elapsed:"]');


            if (task.status !== 'completed') {
                if (timerElement) {
                    // Update countdown display
                    if (task.status === 'paused') {
                        // If paused, display the stored pausedTimeRemaining
                        timerElement.textContent = this.formatCountdown(Math.max(0, task.pausedTimeRemaining));
                    } else {
                        // For running, pending, expired, display live countdown
                        timerElement.textContent = this.formatCountdown(Math.max(0, currentRemainingCountdown));
                    }
                    
                    // Update timer display class based on status
                    timerElement.classList.remove('countdown', 'running', 'paused', 'expired', 'completed'); // Remove all first
                    timerElement.classList.add(this.getTimerDisplayClass(task, currentRemainingCountdown));

                    // Handle expiration
                    if (currentRemainingCountdown <= 0 && task.status !== 'expired') {
                        task.status = 'expired';
                        if (task.taskStartTime) { // If it was running when it expired
                            task.elapsedTime += (now - task.taskStartTime);
                            task.taskStartTime = null;
                        }
                        shouldReRenderTasks = true; // Status change requires re-render to update card class
                        this.showNotification(`Task "${task.title}" has expired! ⏰`, 'error'); // Fixed syntax error here
                    }
                }

                // Update elapsed time display for running tasks
                if (elapsedDisplayElement) {
                    if (task.status === 'running' && task.taskStartTime) {
                        const currentElapsedSession = now - task.taskStartTime;
                        const totalActiveElapsed = task.elapsedTime + currentElapsedSession;
                        const formatted = this.formatTime(totalActiveElapsed);
                        elapsedDisplayElement.innerHTML = `// Elapsed: ${formatted.time}${formatted.milliseconds}`;
                        elapsedDisplayElement.style.display = 'block';
                    } else {
                        elapsedDisplayElement.style.display = 'none';
                    }
                }

                // Update progress bar
                if (progressBarElement) {
                    const totalPlannedDuration = task.originalDueTime.getTime() - task.startTime.getTime();
                    let currentActiveTimeSpent = task.elapsedTime; // This holds time from previous running sessions

                    if (task.status === 'running' && task.taskStartTime) {
                        currentActiveTimeSpent += (now.getTime() - task.taskStartTime);
                    }
                    // If paused, currentActiveTimeSpent is just task.elapsedTime

                    const progressPercentage = (currentActiveTimeSpent / totalPlannedDuration) * 100;
                    
                    progressBarElement.style.width = `${Math.max(0, Math.min(0, progressPercentage))}%`;

                    // Update progress bar color
                    progressBarElement.classList.remove('urgent'); // Always remove first
                    if (currentRemainingCountdown <= 0) { // Still use actual remaining time for urgent styling
                        progressBarElement.classList.add('urgent');
                    }
                }

                // Update task status text and button states directly
                if (taskStatusElement) {
                    taskStatusElement.textContent = task.status.toUpperCase();
                    taskStatusElement.className = `task-status ${task.status}`;
                }
                if (pauseResumeButton) {
                    pauseResumeButton.textContent = task.status === 'paused' ? 'Resume' : 'Pause';
                    pauseResumeButton.disabled = task.status === 'completed' || task.status === 'expired';
                }
                if (completeButton) {
                    completeButton.disabled = task.status === 'completed';
                }
            } else {
                // Task is completed, ensure timer and buttons reflect this
                if (timerElement) timerElement.textContent = 'COMPLETED';
                if (progressBarElement) progressBarElement.style.width = '100%';
                if (taskStatusElement) {
                    taskStatusElement.textContent = 'COMPLETED';
                    taskStatusElement.className = `task-status completed`;
                }
                if (pauseResumeButton) pauseResumeButton.disabled = true;
                if (completeButton) completeButton.disabled = true;
                if (elapsedDisplayElement) elapsedDisplayElement.style.display = 'none'; // Hide elapsed for completed
            }
        });
        
        if (shouldReRenderTasks) {
            this.renderTasks(); // Only re-render if a task status truly changes (e.g., to expired)
            this.saveToStorage();
        }
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ms = milliseconds % 1000;
        
        return {
            time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            milliseconds: `.${ms.toString().padStart(3, '0')}`
        };
    }
    
    formatCountdown(milliseconds) {
        if (milliseconds <= 0) {
            return "00:00:00";
        }
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        // Set color based on type
        const colors = {
            success: 'linear-gradient(45deg, var(--success), #16a34a)',
            error: 'linear-gradient(45deg, var(--error), #dc2626)',
            info: 'linear-gradient(45deg, var(--info), #2563eb)',
            warning: 'linear-gradient(45deg, var(--warning), #d97706)'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 4000);
    }
    
    // Auto-update all task timers
    startGlobalTimer() {
        setInterval(() => {
            this.updateTaskTimers();
        }, 1000);
    }
}

// Initialize the application
let taskFlow;
document.addEventListener('DOMContentLoaded', () => {
    taskFlow = new TaskFlowApp();
});

// Prevent accidental page refresh when tasks are running
window.addEventListener('beforeunload', (e) => {
    const runningTasks = taskFlow.tasks.filter(task => task.status === 'running');
    if (runningTasks.length > 0 || taskFlow.mainStopwatch.isRunning) {
        e.preventDefault();
        e.returnValue = 'You have running timers. Are you sure you want to leave?';
    }
});

