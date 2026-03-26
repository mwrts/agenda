// --- Configurations & Data ---

const WEEKDAY_ROUTINE = [
    { time: "06:30", task: "wake up", sub: "morning light" },
    { time: "06:45", task: "school", sub: "be on time" },
    { time: "12:15", task: "leave school", sub: "heading back" },
    { time: "12:50", task: "home", sub: "reset gear" },
    { time: "13:10", task: "lunch finish", sub: "refuel" },
    { time: "13:10", task: "decompress", sub: "no guilt required", end: "14:00" },
    { time: "14:00", task: "math block 1", sub: "deep focus", end: "15:00", checkable: true },
    { time: "15:00", task: "break", sub: "stretch", end: "15:20" },
    { time: "15:20", task: "japanese", sub: "flashcards + kanji", end: "16:20", checkable: true },
    { time: "16:20", task: "walk", sub: "15min + transition", end: "16:40", checkable: true },
    { time: "16:40", task: "calisthenics", sub: "consistency > intensity", end: "17:10", checkable: true },
    { time: "17:10", task: "shower/reset", sub: "unwind", end: "17:30", checkable: true },
    { time: "17:30", task: "free time", sub: "genuinely free", end: "18:30" },
    { time: "21:00", task: "math block 2", sub: "review + practice", end: "22:00", checkable: true },
    { time: "22:00", task: "wind down", sub: "sleep target 23:00" }
];

const SATURDAY_ROUTINE = [
    { time: "10:00", task: "english class", sub: "practice speaking", end: "12:00", checkable: true },
    { time: "12:00", task: "lunch & decompress", sub: "break time", end: "13:00" },
    { time: "13:00", task: "math block 1", sub: "practice sets", end: "14:00", checkable: true },
    { time: "14:00", task: "break", sub: "chill", end: "14:20" },
    { time: "14:20", task: "japanese", sub: "deep study", end: "15:20", checkable: true },
    { time: "15:20", task: "walk", sub: "outdoor walk", end: "15:40", checkable: true },
    { time: "15:40", task: "calisthenics", sub: "workout", end: "16:10", checkable: true },
    { time: "16:10", task: "rest of day", sub: "free time" }
];

const UPCOMING_EVENTS = [
    { name: "grammar exam", date: "today • mar 26" },
    { name: "bio i & ii exam", date: "in 5 days • mar 31" },
    { name: "2nd call exams", date: "in 7 days • apr 02" },
    { name: "monthly project", date: "apr 10" }
];

// --- State Management ---

let timerInterval;
let timerSeconds = 25 * 60;
let isTimerRunning = false;

// --- Initialize App ---

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    renderRoutine();
    setInterval(renderRoutine, 60000); // Re-render every minute to check active status
    
    renderUpcoming();
    renderChecklist();
    setupPomodoro();
    
    setupChecklistInput();
});

// --- UI Rendering ---

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options).toLowerCase();
}

function renderRoutine() {
    const container = document.getElementById('routine-list');
    const statusPill = document.getElementById('routine-status');
    const now = new Date();
    const isSaturday = now.getDay() === 6;
    const isSunday = now.getDay() === 0;
    
    let routine = isSaturday ? SATURDAY_ROUTINE : (isSunday ? [] : WEEKDAY_ROUTINE);
    
    container.innerHTML = '';
    
    if (routine.length === 0) {
        container.innerHTML = '<div class="task-sub">it\'s sunday! rest day.</div>';
        statusPill.textContent = '0 items left';
        return;
    }

    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];
    const routineStates = JSON.parse(localStorage.getItem(`iseriroute-routine-${todayStr}`) || '{}');
    
    let remaining = 0;

    routine.forEach((item, index) => {
        const isDone = routineStates[index] || false;
        const itemEl = document.createElement('div');
        itemEl.className = `routine-item ${isDone ? 'done' : ''} ${item.checkable ? 'checkable' : ''}`;
        if (item.checkable) {
            itemEl.onclick = () => toggleRoutineTask(index, todayStr);
        }
        
        // Active check
        const isActive = isCurrentTask(item, currentTimeStr);
        if (isActive) itemEl.classList.add('active');
        
        // Count remaining checkable tasks that are NOT done
        if (item.checkable && !isDone) remaining++;

        let checkboxHtml = '';
        if (item.checkable) {
            checkboxHtml = `<div class="routine-checkbox ${isDone ? 'checked' : ''}">${isDone ? '✓' : ''}</div>`;
        }

        itemEl.innerHTML = `
            <div class="time-stamp">${item.time}</div>
            <div class="task-info">
                <div class="task-title">${item.task}</div>
                <div class="task-sub">${item.sub}</div>
            </div>
            ${checkboxHtml}
        `;
        container.appendChild(itemEl);
        
        // Auto-scroll to active item
        if (isActive) {
            setTimeout(() => {
                itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    });

    statusPill.textContent = `${remaining} items left`;
}

function isCurrentTask(item, currentTime) {
    if (!item.end) {
        // Simple heuristic: if it's the latest task that hasn't passed yet
        // For events without end times, we just highlight the most recent one if next is not here
        // But for better look, we want range support.
        return false; 
    }
    return currentTime >= item.time && currentTime < item.end;
}

function toggleRoutineTask(index, dateStr) {
    const key = `iseriroute-routine-${dateStr}`;
    const states = JSON.parse(localStorage.getItem(key) || '{}');
    states[index] = !states[index];
    localStorage.setItem(key, JSON.stringify(states));
    renderRoutine();
}

function renderUpcoming() {
    const container = document.getElementById('upcoming-list');
    container.innerHTML = '';
    
    UPCOMING_EVENTS.forEach(event => {
        const item = document.createElement('div');
        item.className = 'upcoming-item';
        item.innerHTML = `
            <div class="event-details">
                <div class="event-name">${event.name}</div>
                <div class="event-date">${event.date}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// --- Checklist Logic ---

function renderChecklist() {
    const list = JSON.parse(localStorage.getItem('iseriroute-checklist') || '[]');
    const container = document.getElementById('checklist-items');
    container.innerHTML = '';
    
    list.forEach((task, index) => {
        const item = document.createElement('div');
        item.className = `checklist-item ${task.done ? 'done' : ''}`;
        
        item.innerHTML = `
            <div class="checkbox-custom ${task.done ? 'checked' : ''}" onclick="toggleTask(${index})">
                ${task.done ? '✓' : ''}
            </div>
            <div class="task-title">${task.text}</div>
        `;
        container.appendChild(item);
    });
}

function setupChecklistInput() {
    const input = document.getElementById('new-task-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            addTask(input.value.trim());
            input.value = '';
        }
    });
    
    document.getElementById('clear-done').onclick = clearDoneTasks;
}

function addTask(text) {
    const list = JSON.parse(localStorage.getItem('iseriroute-checklist') || '[]');
    list.push({ text: text.toLowerCase(), done: false });
    localStorage.setItem('iseriroute-checklist', JSON.stringify(list));
    renderChecklist();
}

window.toggleTask = function(index) {
    const list = JSON.parse(localStorage.getItem('iseriroute-checklist') || '[]');
    list[index].done = !list[index].done;
    localStorage.setItem('iseriroute-checklist', JSON.stringify(list));
    renderChecklist();
};

function clearDoneTasks() {
    const list = JSON.parse(localStorage.getItem('iseriroute-checklist') || '[]');
    const newList = list.filter(t => !t.done);
    localStorage.setItem('iseriroute-checklist', JSON.stringify(newList));
    renderChecklist();
}

// --- Pomodoro Logic ---

function setupPomodoro() {
    const startBtn = document.getElementById('timer-start');
    const resetBtn = document.getElementById('timer-reset');
    
    startBtn.onclick = () => {
        if (isTimerRunning) {
            pauseTimer();
            startBtn.textContent = 'start';
            startBtn.classList.replace('btn-secondary', 'btn-primary');
        } else {
            startTimer();
            startBtn.textContent = 'pause';
            startBtn.classList.replace('btn-primary', 'btn-secondary');
        }
    };
    
    resetBtn.onclick = resetTimer;
    updateTimerDisplay();
}

function startTimer() {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isTimerRunning = false;
            alert('deep work session completed!'); // Simple alert for now
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
    const startBtn = document.getElementById('timer-start');
    startBtn.textContent = 'start';
    startBtn.classList.replace('btn-secondary', 'btn-primary');
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timer-text').textContent = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
