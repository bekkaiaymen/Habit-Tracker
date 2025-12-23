// Data Management System for Habit Competition

let cachedData = null;
let isLoading = false;

// Initialize default data structure
async function initializeData() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        // Try to load from Google Sheets first
        const sheetsData = await GoogleSheetsDB.load();
        
        if (sheetsData) {
            cachedData = sheetsData;
            // Also save to localStorage as backup
            localStorage.setItem('habitCompetitionData', JSON.stringify(sheetsData));
            isLoading = false;
            return;
        }
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
    }
    
    // Fallback to localStorage or create default
    const localData = localStorage.getItem('habitCompetitionData');
    if (localData) {
        cachedData = JSON.parse(localData);
        isLoading = false;
        return;
    }
    
    // Create default data
    const defaultData = {
            admin: {
                password: 'admin123'
            },
            globalHabits: [
                {
                    id: 'water',
                    icon: '💧',
                    name: 'شرب الماء',
                    description: '8 أكواب يومياً',
                    points: 10
                },
                {
                    id: 'prayer',
                    icon: '🕌',
                    name: 'الصلاة',
                    description: '5 أوقات في اليوم',
                    points: 15
                },
                {
                    id: 'reading',
                    icon: '📖',
                    name: 'القراءة',
                    description: '15 دقيقة على الأقل',
                    points: 10
                }
            ],
            participants: {},
            activities: [],
            dailyLogs: {} // New: detailed daily logs for each participant
    };
    cachedData = defaultData;
    await saveData(defaultData);
    
    isLoading = false;
}

// Get all data
async function getData() {
    if (!cachedData) {
        await initializeData();
    }
    return cachedData;
}

// Save data
async function saveData(data) {
    cachedData = data;
    
    // Save to both Google Sheets and localStorage
    try {
        await GoogleSheetsDB.save(data);
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
    
    // Always save to localStorage as backup
    localStorage.setItem('habitCompetitionData', JSON.stringify(data));
}

// Get participant data
async function getParticipant(name) {
    const data = await getData();
    return data.participants[name];
}

// Save participant data
async function saveParticipant(name, participantData) {
    const data = await getData();
    data.participants[name] = participantData;
    await saveData(data);
}

// Create new participant
async function createParticipant(name) {
    const data = await getData();
    
    if (data.participants[name]) {
        return false; // Participant already exists
    }
    
    const newParticipant = {
        name: name,
        points: 0,
        streak: 0,
        totalCompleted: 0,
        habits: JSON.parse(JSON.stringify(data.globalHabits)), // Clone global habits
        dailyProgress: {},
        rewards: [],
        history: {},
        joinedDate: new Date().toISOString()
    };
    
    data.participants[name] = newParticipant;
    await addActivity(`انضم المتسابق ${name} إلى المسابقة`, name);
    await saveData(data);
    return true;
}

// Get all participants
async function getAllParticipants() {
    const data = await getData();
    return Object.values(data.participants);
}

// Get leaderboard
async function getLeaderboard() {
    const participants = await getAllParticipants();
    return participants.sort((a, b) => b.points - a.points);
}

// Add activity log
async function addActivity(message, participantName = '') {
    const data = await getData();
    const activity = {
        message: message,
        participant: participantName,
        timestamp: new Date().toISOString()
    };
    
    data.activities.unshift(activity);
    
    // Keep only last 100 activities
    if (data.activities.length > 100) {
        data.activities = data.activities.slice(0, 100);
    }
    
    await saveData(data);
    
    // Also log to Google Sheets
    try {
        await GoogleSheetsDB.logActivity(activity);
    } catch (error) {
        console.error('Error logging to Google Sheets:', error);
    }
}

// Get activities
async function getActivities() {
    const data = await getData();
    return data.activities || [];
}

// Add global habit
async function addGlobalHabit(habit) {
    const data = await getData();
    data.globalHabits.push(habit);
    await saveData(data);
    await addActivity(`تمت إضافة عادة عامة جديدة: ${habit.name}`);
}

// Remove global habit
async function removeGlobalHabit(habitId) {
    const data = await getData();
    data.globalHabits = data.globalHabits.filter(h => h.id !== habitId);
    await saveData(data);
}

// Get global habits
async function getGlobalHabits() {
    const data = await getData();
    return data.globalHabits;
}

// Give reward to participant
async function giveRewardToParticipant(participantName, rewardTitle, points) {
    const participant = await getParticipant(participantName);
    if (!participant) return false;
    
    participant.rewards.push({
        title: rewardTitle,
        points: points,
        date: new Date().toISOString()
    });
    
    participant.points += points;
    
    await saveParticipant(participantName, participant);
    await addActivity(`حصل ${participantName} على مكافأة: ${rewardTitle} (+${points} نقطة)`, participantName);
    await logDailyActivity(participantName, 'مكافأة', rewardTitle, points);
    return true;
}

// Update habit status for participant
async function updateHabitStatus(participantName, habitId, isCompleted, date = new Date().toDateString()) {
    const participant = await getParticipant(participantName);
    if (!participant) return false;
    
    if (!participant.dailyProgress[date]) {
        participant.dailyProgress[date] = {};
    }
    
    const wasCompleted = participant.dailyProgress[date][habitId] || false;
    participant.dailyProgress[date][habitId] = isCompleted;
    
    // Find habit points
    const habit = participant.habits.find(h => h.id === habitId);
    const habitPoints = habit ? habit.points : 10;
    
    if (isCompleted && !wasCompleted) {
        participant.points += habitPoints;
        participant.totalCompleted++;
        await addActivity(`أكمل ${participantName} عادة: ${habit ? habit.name : habitId}`, participantName);
        await logDailyActivity(participantName, habit ? habit.name : habitId, 'أكمل', habitPoints);
    } else if (!isCompleted && wasCompleted) {
        participant.points -= habitPoints;
        participant.totalCompleted--;
        await logDailyActivity(participantName, habit ? habit.name : habitId, 'ألغى', -habitPoints);
    }
    
    await saveParticipant(participantName, participant);
    return true;
}

// Log daily activity for detailed history
async function logDailyActivity(participantName, habitName, action, points) {
    const data = await getData();
    
    if (!data.dailyLogs) {
        data.dailyLogs = {};
    }
    
    const today = new Date().toDateString();
    
    if (!data.dailyLogs[today]) {
        data.dailyLogs[today] = [];
    }
    
    data.dailyLogs[today].push({
        participant: participantName,
        habit: habitName,
        action: action,
        points: points,
        time: new Date().toLocaleTimeString('ar-SA')
    });
    
    await saveData(data);
}

// Get daily logs for a specific date
async function getDailyLogs(date) {
    const data = await getData();
    return data.dailyLogs?.[date] || [];
}

// Get participant daily history
async function getParticipantDailyHistory(participantName, days = 30) {
    const data = await getData();
    const history = [];
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const dayLogs = data.dailyLogs?.[dateStr] || [];
        const participantLogs = dayLogs.filter(log => log.participant === participantName);
        
        if (participantLogs.length > 0) {
            history.push({
                date: dateStr,
                logs: participantLogs
            });
        }
    }
    
    return history;
}

// Calculate streak for participant
async function calculateStreak(participantName) {
    const participant = await getParticipant(participantName);
    if (!participant) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const progress = participant.dailyProgress[dateStr];
        if (!progress) break;
        
        const totalHabits = participant.habits.length;
        const completedHabits = Object.values(progress).filter(v => v === true).length;
        
        if (completedHabits === totalHabits && totalHabits > 0) {
            streak++;
        } else {
            break;
        }
    }
    
    participant.streak = streak;
    await saveParticipant(participantName, participant);
    return streak;
}

// Get today's progress for participant
async function getTodayProgress(participantName) {
    const participant = await getParticipant(participantName);
    if (!participant) return { completed: 0, total: 0, percentage: 0 };
    
    const today = new Date().toDateString();
    const progress = participant.dailyProgress[today] || {};
    
    const total = participant.habits.length;
    const completed = Object.values(progress).filter(v => v === true).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
}

// Add custom habit for participant
async function addParticipantHabit(participantName, habit) {
    const participant = await getParticipant(participantName);
    if (!participant) return false;
    
    participant.habits.push(habit);
    await saveParticipant(participantName, participant);
    await addActivity(`أضاف ${participantName} عادة جديدة: ${habit.name}`, participantName);
    return true;
}

// Remove participant habit
async function removeParticipantHabit(participantName, habitId) {
    const participant = await getParticipant(participantName);
    if (!participant) return false;
    
    participant.habits = participant.habits.filter(h => h.id !== habitId);
    await saveParticipant(participantName, participant);
    return true;
}

// Get statistics
async function getStatistics() {
    const participants = await getAllParticipants();
    const totalParticipants = participants.length;
    
    let totalHabitsToday = 0;
    let totalRewards = 0;
    
    const today = new Date().toDateString();
    
    participants.forEach(p => {
        const progress = p.dailyProgress[today] || {};
        totalHabitsToday += Object.values(progress).filter(v => v === true).length;
        totalRewards += p.rewards.length;
    });
    
    return {
        totalParticipants,
        totalHabitsToday,
        totalRewards
    };
}

// Initialize data on load
initializeData();