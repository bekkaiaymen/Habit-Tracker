// Participant Page Scripts

let currentUser = '';
let selectedIconValue = '💪';

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await initializePage();
});

function checkAuth() {
    const userType = sessionStorage.getItem('userType');
    const userName = sessionStorage.getItem('userName');
    
    if (userType !== 'participant' || !userName) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = userName;
}

async function initializePage() {
    displayDate();
    await loadUserInfo();
    await loadHabits();
    await updateProgress();
    await updateStatistics();
    await loadRewards();
    displayHistory();
    await loadDetailedHistory();
    await updateLeaderboard();
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById('dateDisplay').textContent = today.toLocaleDateString('ar-SA', options);
}

async function loadUserInfo() {
    const participant = await getParticipant(currentUser);
    if (!participant) return;
    
    document.getElementById('userName').textContent = participant.name;
    document.getElementById('userPoints').textContent = participant.points;
}

async function loadHabits() {
    const participant = await getParticipant(currentUser);
    if (!participant) return;
    
    const today = new Date().toDateString();
    const progress = participant.dailyProgress[today] || {};
    
    const habitsList = document.getElementById('habitsList');
    let html = '';
    
    participant.habits.forEach(habit => {
        const isCompleted = progress[habit.id] || false;
        html += `
            <div class="habit-item ${isCompleted ? 'completed' : ''}" data-habit="${habit.id}">
                <div class="habit-content">
                    <div class="habit-icon">${habit.icon}</div>
                    <div class="habit-info">
                        <span class="habit-name">${habit.name}</span>
                        <span class="habit-desc">${habit.description} (+${habit.points} نقطة)</span>
                    </div>
                </div>
                <button class="status-btn" onclick="toggleHabit('${habit.id}')">
                    <span class="icon">${isCompleted ? '✔' : '✖'}</span>
                </button>
            </div>
        `;
    });
    
    habitsList.innerHTML = html;
}

async function toggleHabit(habitId) {
    const habitElement = document.querySelector(`.habit-item[data-habit="${habitId}"]`);
    const btnIcon = habitElement.querySelector('.icon');
    const isCompleted = habitElement.classList.contains('completed');
    
    // Toggle
    habitElement.classList.toggle('completed');
    const newStatus = !isCompleted;
    
    btnIcon.textContent = newStatus ? '✔' : '✖';
    
    // Update data
    await updateHabitStatus(currentUser, habitId, newStatus);
    
    if (newStatus) {
        playCompletionAnimation(habitElement);
    }
    
    await updateProgress();
    await updateStatistics();
    await loadUserInfo();
    await loadDetailedHistory();
}

function playCompletionAnimation(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
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

async function updateProgress() {
    const progress = await getTodayProgress(currentUser);
    
    document.getElementById('progressText').textContent = progress.percentage + '%';
    document.getElementById('progressFill').style.width = progress.percentage + '%';
}

async function updateStatistics() {
    const participant = await await getParticipant(currentUser);
    if (!participant) return;
    
    const streak = await calculateStreak(currentUser);
    document.getElementById('streak').textContent = streak;
    document.getElementById('totalCompleted').textContent = participant.totalCompleted;
    
    // Calculate rank
    const leaderboard = await getLeaderboard();
    const rank = leaderboard.findIndex(p => p.name === currentUser) + 1;
    document.getElementById('rank').textContent = rank > 0 ? rank : '-';
}

async function loadRewards() {
    const participant = await getParticipant(currentUser);
    if (!participant) return;
    
    const rewardsList = document.getElementById('rewardsList');
    
    if (participant.rewards.length === 0) {
        rewardsList.innerHTML = '<p class="empty-state">لا توجد مكافآت بعد</p>';
        return;
    }
    
    let html = '';
    participant.rewards.forEach(reward => {
        const date = new Date(reward.date);
        html += `
            <div class="reward-item">
                <div class="reward-icon">🎁</div>
                <div class="reward-info">
                    <div class="reward-title">${reward.title}</div>
                    <div class="reward-meta">+${reward.points} نقطة • ${date.toLocaleDateString('ar-SA')}</div>
                </div>
            </div>
        `;
    });
    
    rewardsList.innerHTML = html;
}

async function displayHistory() {
    const participant = await getParticipant(currentUser);
    if (!participant) return;
    
    const historyGrid = document.getElementById('historyGrid');
    historyGrid.innerHTML = '';
    
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
        
        const progress = participant.dailyProgress[dateStr] || {};
        const total = participant.habits.length;
        const completed = Object.values(progress).filter(v => v === true).length;
        
        dayScore.textContent = `${completed}/${total}`;
        
        if (completed === total && total > 0) {
            dayElement.classList.add('perfect');
        } else if (completed > 0) {
            dayElement.classList.add('partial');
        } else {
            dayElement.classList.add('none');
        }
        
        dayElement.appendChild(dayLabel);
        dayElement.appendChild(dayScore);
        historyGrid.appendChild(dayElement);
    }
}

async function updateLeaderboard() {
    const leaderboard = await getLeaderboard();
    const listElement = document.getElementById('leaderboardList');
    
    let html = '';
    leaderboard.forEach((participant, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        const isCurrentUser = participant.name === currentUser;
        
        html += `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                <span class="rank">${medal} ${index + 1}</span>
                <span class="name">${participant.name}</span>
                <span class="points">${participant.points} نقطة</span>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}

async function completeAllHabits() {
    const participant = await getParticipant(currentUser);
    const today = new Date().toDateString();
    
    for (const habit of participant.habits) {
        const progress = participant.dailyProgress[today] || {};
        if (!progress[habit.id]) {
            await updateHabitStatus(currentUser, habit.id, true);
        }
    }
    
    await loadHabits();
    await updateProgress();
    await updateStatistics();
    await loadUserInfo();
    await loadDetailedHistory();
}

async function resetDay() {
    if(confirm('هل أنت متأكد من بدء يوم جديد؟ سيتم تصفير العادات.')) {
        const participant = await getParticipant(currentUser);
        const today = new Date().toDateString();
        
        for (const habit of participant.habits) {
            await updateHabitStatus(currentUser, habit.id, false);
        }
        
        await loadHabits();
        await updateProgress();
        await updateStatistics();
        await loadDetailedHistory();
    }
}

function showAddHabitModal() {
    document.getElementById('addHabitModal').style.display = 'flex';
}

function hideAddHabitModal() {
    document.getElementById('addHabitModal').style.display = 'none';
    document.getElementById('habitName').value = '';
    document.getElementById('habitDesc').value = '';
    document.getElementById('habitPoints').value = '10';
}

function selectIcon(icon) {
    selectedIconValue = icon;
    document.getElementById('selectedIcon').value = icon;
}

async function addNewHabit() {
    const name = document.getElementById('habitName').value.trim();
    const desc = document.getElementById('habitDesc').value.trim();
    const points = parseInt(document.getElementById('habitPoints').value) || 10;
    
    if (!name) {
        alert('الرجاء إدخال اسم العادة!');
        return;
    }
    
    const newHabit = {
        id: 'habit_' + Date.now(),
        icon: selectedIconValue,
        name: name,
        description: desc || 'عادة يومية',
        points: points
    };
    
    await addParticipantHabit(currentUser, newHabit);
    
    hideAddHabitModal();
    await loadHabits();
    await updateProgress();
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// Load detailed history
async function loadDetailedHistory() {
    const days = parseInt(document.getElementById('historyDaysFilter').value) || 30;
    const history = await getParticipantDailyHistory(currentUser, days);
    const listElement = document.getElementById('detailedHistoryList');
    
    if (history.length === 0) {
        listElement.innerHTML = '<p class="empty-state">لا توجد سجلات بعد</p>';
        return;
    }
    
    let html = '';
    history.forEach(day => {
        const date = new Date(day.date);
        const dateStr = date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let totalPoints = 0;
        let logsHtml = '';
        
        day.logs.forEach(log => {
            totalPoints += log.points || 0;
            const icon = log.action === 'أكمل' ? '✅' : log.action === 'ألغى' ? '❌' : '🎁';
            const pointsClass = log.points > 0 ? 'positive' : log.points < 0 ? 'negative' : '';
            
            logsHtml += `
                <div class="history-log-item">
                    <span class="log-icon">${icon}</span>
                    <span class="log-habit">${log.habit}</span>
                    <span class="log-action">${log.action}</span>
                    <span class="log-points ${pointsClass}">${log.points > 0 ? '+' : ''}${log.points} نقطة</span>
                    <span class="log-time">${log.time}</span>
                </div>
            `;
        });
        
        const totalClass = totalPoints > 0 ? 'positive' : totalPoints < 0 ? 'negative' : '';
        
        html += `
            <div class="history-day-card">
                <div class="history-day-header">
                    <span class="history-date">📅 ${dateStr}</span>
                    <span class="history-total ${totalClass}">الإجمالي: ${totalPoints > 0 ? '+' : ''}${totalPoints} نقطة</span>
                </div>
                <div class="history-day-logs">
                    ${logsHtml}
                </div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}