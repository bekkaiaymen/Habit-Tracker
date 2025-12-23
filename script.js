document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    checkNewDay();
    loadHabits();
    displayDate();
    updateProgress();
    updateStatistics();
    displayHistory();
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById('dateDisplay').textContent = today.toLocaleDateString('ar-SA', options);
}

function checkNewDay() {
    const savedDate = localStorage.getItem('habitDate');
    const today = new Date().toDateString();
    
    if (savedDate && savedDate !== today) {
        // Save yesterday's data to history before resetting
        saveToHistory(savedDate);
        // Auto-reset for new day
        clearTodayHabits();
    }
}

function toggleHabit(habitId) {
    const habitElement = document.querySelector(`.habit-item[data-habit="${habitId}"]`);
    const btnIcon = habitElement.querySelector('.icon');
    
    habitElement.classList.toggle('completed');
    
    if (habitElement.classList.contains('completed')) {
        btnIcon.textContent = '✔';
        playCompletionAnimation(habitElement);
    } else {
        btnIcon.textContent = '✖';
    }

    saveHabits();
    updateProgress();
    updateStatistics();
}

function playCompletionAnimation(element) {
    // Create celebration effect
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
}

function createConfetti(x, y) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 8px;
        height: 8px;
        background: ${['#10b981', '#6366f1', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(confetti);
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 100 + Math.random() * 100;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    
    let posX = 0, posY = 0, opacity = 1;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        posX = vx * elapsed;
        posY = vy * elapsed + 0.5 * 500 * elapsed * elapsed;
        opacity = Math.max(0, 1 - elapsed / 0.8);
        
        confetti.style.transform = `translate(${posX}px, ${posY}px)`;
        confetti.style.opacity = opacity;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            confetti.remove();
        }
    }
    
    animate();
}

function saveHabits() {
    const habits = {};
    document.querySelectorAll('.habit-item').forEach(item => {
        const id = item.getAttribute('data-habit');
        const isCompleted = item.classList.contains('completed');
        habits[id] = isCompleted;
    });
    
    localStorage.setItem('dailyHabits', JSON.stringify(habits));
    localStorage.setItem('habitDate', new Date().toDateString());
}

function loadHabits() {
    const savedHabits = JSON.parse(localStorage.getItem('dailyHabits'));
    
    if (savedHabits) {
        for (const [id, isCompleted] of Object.entries(savedHabits)) {
            if (isCompleted) {
                const habitElement = document.querySelector(`.habit-item[data-habit="${id}"]`);
                if (habitElement) {
                    habitElement.classList.add('completed');
                    habitElement.querySelector('.icon').textContent = '✔';
                }
            }
        }
    }
}

function updateProgress() {
    const total = document.querySelectorAll('.habit-item').length;
    const completed = document.querySelectorAll('.habit-item.completed').length;
    const percentage = Math.round((completed / total) * 100);
    
    document.getElementById('progressText').textContent = percentage + '%';
    document.getElementById('progressFill').style.width = percentage + '%';
}

function updateStatistics() {
    // Calculate streak
    const streak = calculateStreak();
    document.getElementById('streak').textContent = streak;
    
    // Calculate total completed habits
    const history = getHistory();
    let totalCompleted = 0;
    Object.values(history).forEach(day => {
        totalCompleted += day.completed || 0;
    });
    
    // Add today's completed
    const todayCompleted = document.querySelectorAll('.habit-item.completed').length;
    totalCompleted += todayCompleted;
    
    document.getElementById('totalCompleted').textContent = totalCompleted;
    
    // Calculate success rate
    const totalDays = Object.keys(history).length + 1; // +1 for today
    const totalPossible = totalDays * 3; // 3 habits per day
    const successRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    document.getElementById('successRate').textContent = successRate + '%';
}

function calculateStreak() {
    const history = getHistory();
    const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    const today = new Date().toDateString();
    
    // Check if today is complete
    const todayCompleted = document.querySelectorAll('.habit-item.completed').length;
    if (todayCompleted === 3) {
        streak = 1;
    }
    
    // Check previous days
    for (let i = 0; i < dates.length; i++) {
        const date = new Date(dates[i]);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - (i + 1));
        
        if (date.toDateString() === expectedDate.toDateString() && history[dates[i]].completed === 3) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function displayHistory() {
    const historyGrid = document.getElementById('historyGrid');
    historyGrid.innerHTML = '';
    
    const history = getHistory();
    const daysToShow = 7;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const dayElement = document.createElement('div');
        dayElement.className = 'history-day';
        
        const dayName = date.toLocaleDateString('ar-SA', { weekday: 'short' });
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label';
        dayLabel.textContent = dayName;
        
        const dayScore = document.createElement('div');
        dayScore.className = 'day-score';
        
        if (i === 0) {
            // Today
            const completed = document.querySelectorAll('.habit-item.completed').length;
            dayScore.textContent = `${completed}/3`;
            if (completed === 3) dayElement.classList.add('perfect');
            else if (completed > 0) dayElement.classList.add('partial');
            else dayElement.classList.add('none');
        } else if (history[dateStr]) {
            const completed = history[dateStr].completed || 0;
            dayScore.textContent = `${completed}/3`;
            if (completed === 3) dayElement.classList.add('perfect');
            else if (completed > 0) dayElement.classList.add('partial');
            else dayElement.classList.add('none');
        } else {
            dayScore.textContent = '0/3';
            dayElement.classList.add('none');
        }
        
        dayElement.appendChild(dayLabel);
        dayElement.appendChild(dayScore);
        historyGrid.appendChild(dayElement);
    }
}

function saveToHistory(date) {
    const habits = JSON.parse(localStorage.getItem('dailyHabits')) || {};
    const completed = Object.values(habits).filter(v => v === true).length;
    
    const history = getHistory();
    history[date] = {
        completed: completed,
        total: 3,
        habits: habits
    };
    
    localStorage.setItem('habitHistory', JSON.stringify(history));
}

function getHistory() {
    return JSON.parse(localStorage.getItem('habitHistory')) || {};
}

function clearTodayHabits() {
    document.querySelectorAll('.habit-item').forEach(item => {
        item.classList.remove('completed');
        item.querySelector('.icon').textContent = '✖';
    });
    saveHabits();
}

function resetHabits() {
    if(confirm('هل أنت متأكد من بدء يوم جديد؟ سيتم حفظ تقدم اليوم الحالي في السجل وتصفير العادات.')) {
        const today = new Date().toDateString();
        saveToHistory(today);
        clearTodayHabits();
        updateProgress();
        updateStatistics();
        displayHistory();
    }
}

function completeAllHabits() {
    document.querySelectorAll('.habit-item').forEach(item => {
        if (!item.classList.contains('completed')) {
            item.classList.add('completed');
            item.querySelector('.icon').textContent = '✔';
            playCompletionAnimation(item);
        }
    });
    saveHabits();
    updateProgress();
    updateStatistics();
}