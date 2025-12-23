// Admin Page Scripts

let selectedGlobalIconValue = '💧';

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await initializePage();
});

function checkAuth() {
    const userType = sessionStorage.getItem('userType');
    
    if (userType !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
}

async function initializePage() {
    displayDate();
    await loadOverviewStats();
    await loadLeaderboard();
    await loadParticipants();
    await loadGlobalHabits();
    await loadActivityLog();
    await loadCompetitionHistory();
    populateParticipantSelect();
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById('dateDisplay').textContent = today.toLocaleDateString('ar-SA', options);
}

async function loadOverviewStats() {
    const stats = await getStatistics();
    
    document.getElementById('totalParticipants').textContent = stats.totalParticipants;
    document.getElementById('totalHabitsToday').textContent = stats.totalHabitsToday;
    document.getElementById('totalRewards').textContent = stats.totalRewards;
}

async function loadLeaderboard() {
    const leaderboard = await getLeaderboard();
    const listElement = document.getElementById('leaderboardFull');
    
    if (leaderboard.length === 0) {
        listElement.innerHTML = '<p class="empty-state">لا يوجد متسابقون بعد</p>';
        return;
    }
    
    let html = '';
    leaderboard.forEach((participant, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        const progress = getTodayProgress(participant.name);
        
        html += `
            <div class="leaderboard-full-item" onclick="showParticipantDetails('${participant.name}')">
                <div class="rank-medal">${medal}</div>
                <div class="rank-number">${index + 1}</div>
                <div class="participant-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-meta">
                        <span>🔥 ${participant.streak} يوم</span>
                        <span>✅ ${progress.completed}/${progress.total}</span>
                    </div>
                </div>
                <div class="participant-points">${participant.points} نقطة</div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}

async function loadParticipants() {
    const participants = await getAllParticipants();
    const gridElement = document.getElementById('participantsGrid');
    
    if (participants.length === 0) {
        gridElement.innerHTML = '<p class="empty-state">لا يوجد متسابقون</p>';
        return;
    }
    
    let html = '';
    participants.forEach(participant => {
        const progress = getTodayProgress(participant.name);
        const joinDate = new Date(participant.joinedDate).toLocaleDateString('ar-SA');
        
        html += `
            <div class="participant-card" onclick="showParticipantDetails('${participant.name}')">
                <div class="participant-card-header">
                    <div class="participant-avatar">👤</div>
                    <div class="participant-card-info">
                        <div class="participant-card-name">${participant.name}</div>
                        <div class="participant-card-date">انضم في ${joinDate}</div>
                    </div>
                </div>
                <div class="participant-card-stats">
                    <div class="card-stat">
                        <span class="card-stat-label">النقاط:</span>
                        <span class="card-stat-value">${participant.points}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">السلسلة:</span>
                        <span class="card-stat-value">${participant.streak}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">اليوم:</span>
                        <span class="card-stat-value">${progress.completed}/${progress.total}</span>
                    </div>
                </div>
                <div class="participant-card-progress">
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${progress.percentage}%"></div>
                    </div>
                    <span class="mini-progress-text">${progress.percentage}%</span>
                </div>
            </div>
        `;
    });
    
    gridElement.innerHTML = html;
}

function showAddParticipantModal() {
    document.getElementById('addParticipantModal').style.display = 'flex';
    document.getElementById('newParticipantName').focus();
}

function hideAddParticipantModal() {
    document.getElementById('addParticipantModal').style.display = 'none';
    document.getElementById('newParticipantName').value = '';
}

async function addParticipant() {
    const name = document.getElementById('newParticipantName').value.trim();
    
    if (!name) {
        alert('الرجاء إدخال اسم المتسابق!');
        return;
    }
    
    if (await getParticipant(name)) {
        alert('المتسابق موجود بالفعل!');
        return;
    }
    
    await createParticipant(name);
    hideAddParticipantModal();
    await initializePage();
}

async function populateParticipantSelect() {
    const participants = await getAllParticipants();
    const select = document.getElementById('rewardParticipant');
    
    let html = '<option value="">اختر المتسابق</option>';
    participants.forEach(p => {
        html += `<option value="${p.name}">${p.name}</option>`;
    });
    
    select.innerHTML = html;
}

async function giveReward() {
    const participantName = document.getElementById('rewardParticipant').value;
    const title = document.getElementById('rewardTitle').value.trim();
    const points = parseInt(document.getElementById('rewardPoints').value) || 0;
    
    if (!participantName) {
        alert('الرجاء اختيار المتسابق!');
        return;
    }
    
    if (!title) {
        alert('الرجاء إدخال عنوان المكافأة!');
        return;
    }
    
    if (points <= 0) {
        alert('الرجاء إدخال عدد نقاط صحيح!');
        return;
    }
    
    await giveRewardToParticipant(participantName, title, points);
    
    document.getElementById('rewardParticipant').value = '';
    document.getElementById('rewardTitle').value = '';
    document.getElementById('rewardPoints').value = '';
    
    await initializePage();
    alert(`تم منح المكافأة لـ ${participantName}!`);
}

async function loadGlobalHabits() {
    const habits = await getGlobalHabits();
    const listElement = document.getElementById('globalHabitsList');
    
    let html = '';
    habits.forEach(habit => {
        html += `
            <div class="global-habit-item">
                <div class="habit-content">
                    <div class="habit-icon">${habit.icon}</div>
                    <div class="habit-info">
                        <span class="habit-name">${habit.name}</span>
                        <span class="habit-desc">${habit.description} (+${habit.points} نقطة)</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteGlobalHabit('${habit.id}')">🗑️</button>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}

function showAddGlobalHabitModal() {
    document.getElementById('addGlobalHabitModal').style.display = 'flex';
}

function hideAddGlobalHabitModal() {
    document.getElementById('addGlobalHabitModal').style.display = 'none';
    document.getElementById('globalHabitName').value = '';
    document.getElementById('globalHabitDesc').value = '';
    document.getElementById('globalHabitPoints').value = '10';
}

function selectGlobalIcon(icon) {
    selectedGlobalIconValue = icon;
    document.getElementById('selectedGlobalIcon').value = icon;
}

async function addGlobalHabit() {
    const name = document.getElementById('globalHabitName').value.trim();
    const desc = document.getElementById('globalHabitDesc').value.trim();
    const points = parseInt(document.getElementById('globalHabitPoints').value) || 10;
    
    if (!name) {
        alert('الرجاء إدخال اسم العادة!');
        return;
    }
    
    const newHabit = {
        id: 'global_' + Date.now(),
        icon: selectedGlobalIconValue,
        name: name,
        description: desc || 'عادة يومية',
        points: points
    };
    
    const data = await getData();
    data.globalHabits.push(newHabit);
    await saveData(data);
    await addActivity(`تمت إضافة عادة عامة جديدة: ${name}`);
    
    hideAddGlobalHabitModal();
    await loadGlobalHabits();
}

async function deleteGlobalHabit(habitId) {
    if (confirm('هل أنت متأكد من حذف هذه العادة؟')) {
        await removeGlobalHabit(habitId);
        await loadGlobalHabits();
    }
}

async function loadActivityLog() {
    const activities = await getActivities();
    const logElement = document.getElementById('activityLog');
    
    if (activities.length === 0) {
        logElement.innerHTML = '<p class="empty-state">لا توجد أنشطة بعد</p>';
        return;
    }
    
    let html = '';
    activities.slice(0, 20).forEach(activity => {
        const date = new Date(activity.timestamp);
        const timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('ar-SA');
        
        html += `
            <div class="activity-item">
                <div class="activity-icon">📝</div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${dateStr} - ${timeStr}</div>
                </div>
            </div>
        `;
    });
    
    logElement.innerHTML = html;
}

async function showParticipantDetails(participantName) {
    const participant = await getParticipant(participantName);
    if (!participant) return;
    
    document.getElementById('participantDetailsName').textContent = participant.name;
    document.getElementById('detailPoints').textContent = participant.points;
    document.getElementById('detailStreak').textContent = participant.streak;
    document.getElementById('detailCompleted').textContent = participant.totalCompleted;
    
    // Load habits
    const today = new Date().toDateString();
    const progress = participant.dailyProgress[today] || {};
    
    let habitsHtml = '';
    participant.habits.forEach(habit => {
        const isCompleted = progress[habit.id] || false;
        habitsHtml += `
            <div class="detail-habit ${isCompleted ? 'completed' : ''}">
                <span>${habit.icon} ${habit.name}</span>
                <span>${isCompleted ? '✔' : '✖'}</span>
            </div>
        `;
    });
    document.getElementById('detailHabitsList').innerHTML = habitsHtml || '<p>لا توجد عادات</p>';
    
    // Load rewards
    let rewardsHtml = '';
    participant.rewards.forEach(reward => {
        const date = new Date(reward.date).toLocaleDateString('ar-SA');
        rewardsHtml += `
            <div class="detail-reward">
                <span>🎁 ${reward.title}</span>
                <span>+${reward.points} نقطة (${date})</span>
            </div>
        `;
    });
    document.getElementById('detailRewardsList').innerHTML = rewardsHtml || '<p>لا توجد مكافآت</p>';
    
    document.getElementById('participantDetailsModal').style.display = 'flex';
}

function hideParticipantDetailsModal() {
    document.getElementById('participantDetailsModal').style.display = 'none';
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// Load competition detailed history
async function loadCompetitionHistory() {
    const days = parseInt(document.getElementById('competitionHistoryDays').value) || 30;
    const data = await getData();
    const listElement = document.getElementById('competitionHistoryList');
    
    // Collect all daily logs
    const historyByDate = {};
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const dayLogs = data.dailyLogs?.[dateStr] || [];
        
        if (dayLogs.length > 0) {
            historyByDate[dateStr] = dayLogs;
        }
    }
    
    if (Object.keys(historyByDate).length === 0) {
        listElement.innerHTML = '<p class="empty-state">لا توجد سجلات تفصيلية بعد</p>';
        return;
    }
    
    let html = '';
    
    // Sort dates descending
    const sortedDates = Object.keys(historyByDate).sort((a, b) => new Date(b) - new Date(a));
    
    sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('ar-SA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const logs = historyByDate[dateStr];
        
        // Group by participant
        const participantLogs = {};
        let totalPoints = 0;
        
        logs.forEach(log => {
            if (!participantLogs[log.participant]) {
                participantLogs[log.participant] = [];
            }
            participantLogs[log.participant].push(log);
            totalPoints += log.points || 0;
        });
        
        let participantsHtml = '';
        
        Object.keys(participantLogs).forEach(participantName => {
            const pLogs = participantLogs[participantName];
            let pPoints = 0;
            let pLogsHtml = '';
            
            pLogs.forEach(log => {
                pPoints += log.points || 0;
                const icon = log.action === 'أكمل' ? '✅' : log.action === 'ألغى' ? '❌' : '🎁';
                const pointsClass = log.points > 0 ? 'positive' : log.points < 0 ? 'negative' : '';
                
                pLogsHtml += `
                    <div class="comp-log-item">
                        <span class="log-icon">${icon}</span>
                        <span class="log-habit">${log.habit}</span>
                        <span class="log-action">${log.action}</span>
                        <span class="log-points ${pointsClass}">${log.points > 0 ? '+' : ''}${log.points}</span>
                        <span class="log-time">${log.time}</span>
                    </div>
                `;
            });
            
            const pPointsClass = pPoints > 0 ? 'positive' : pPoints < 0 ? 'negative' : '';
            
            participantsHtml += `
                <div class="comp-participant-section">
                    <div class="comp-participant-header">
                        <span class="comp-participant-name">👤 ${participantName}</span>
                        <span class="comp-participant-points ${pPointsClass}">${pPoints > 0 ? '+' : ''}${pPoints} نقطة</span>
                    </div>
                    <div class="comp-participant-logs">
                        ${pLogsHtml}
                    </div>
                </div>
            `;
        });
        
        const totalClass = totalPoints > 0 ? 'positive' : totalPoints < 0 ? 'negative' : '';
        
        html += `
            <div class="comp-history-day-card">
                <div class="comp-day-header">
                    <span class="comp-date">📅 ${formattedDate}</span>
                    <span class="comp-summary">
                        ${Object.keys(participantLogs).length} متسابق • 
                        ${logs.length} نشاط • 
                        <span class="${totalClass}">${totalPoints > 0 ? '+' : ''}${totalPoints} نقطة</span>
                    </span>
                </div>
                <div class="comp-day-content">
                    ${participantsHtml}
                </div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}