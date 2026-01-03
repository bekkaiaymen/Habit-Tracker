// Login Page Scripts

document.addEventListener('DOMContentLoaded', async () => {
    displayDate();
    await updateLeaderboardPreview();
    await updateQuickStats();
    await populateParticipantSelect();
    checkDirectLoginUrl();
});

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    const dateElement = document.getElementById('dateDisplay');
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('ar-SA', options);
    }
}

function showAdminLogin() {
    hideLoginForms();
    document.getElementById('adminLoginForm').style.display = 'block';
    document.getElementById('adminPassword').focus();
}

function showParticipantLogin() {
    hideLoginForms();
    document.getElementById('participantLoginForm').style.display = 'block';
    document.getElementById('participantName').focus();
    populateParticipantSelect();
}

async function populateParticipantSelect() {
    const participants = await getAllParticipants();
    const select = document.getElementById('participantSelect');
    if (!select) return;
    
    let html = '<option value="">-- اختر من القائمة --</option>';
    participants.forEach(p => {
        html += `<option value="${p.name}">${p.name}</option>`;
    });
    select.innerHTML = html;
}

function selectParticipantFromList() {
    const select = document.getElementById('participantSelect');
    const nameInput = document.getElementById('participantName');
    if (select.value) {
        nameInput.value = select.value;
    }
}

function hideLoginForms() {
    document.getElementById('adminLoginForm').style.display = 'none';
    document.getElementById('participantLoginForm').style.display = 'none';
}

async function loginAdmin() {
    const password = document.getElementById('adminPassword').value.trim();
    const data = await getData();
    
    if (password === data.admin.password) {
        sessionStorage.setItem('userType', 'admin');
        window.location.href = 'admin.html';
    } else {
        alert('كلمة المرور غير صحيحة!');
        document.getElementById('adminPassword').value = '';
    }
}

async function loginParticipant() {
    const name = document.getElementById('participantName').value.trim();
    
    if (!name) {
        alert('الرجاء إدخال اسمك!');
        return;
    }
    
    let participant = await getParticipant(name);
    
    if (!participant) {
        // Create new participant
        if (confirm(`مرحباً ${name}! هل تريد الانضمام إلى المسابقة؟`)) {
            await createParticipant(name);
        } else {
            return;
        }
    }
    
    sessionStorage.setItem('userType', 'participant');
    sessionStorage.setItem('userName', name);
    window.location.href = 'participant.html';
}

async function updateLeaderboardPreview() {
    const leaderboard = await getLeaderboard();
    const listElement = document.getElementById('leaderboardList');
    
    if (leaderboard.length === 0) {
        listElement.innerHTML = '<p class="empty-state">لا يوجد متسابقون بعد</p>';
        return;
    }
    
    let html = '';
    leaderboard.slice(0, 5).forEach((participant, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        html += `
            <div class="preview-item">
                <span class="rank">${medal} ${index + 1}</span>
                <span class="name">${participant.name}</span>
                <span class="points">${participant.points} نقطة</span>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}

async function updateQuickStats() {
    const data = await getData();
    const participants = data.participants;
    const today = new Date().toDateString();
    
    let activeToday = 0;
    let totalHabits = 0;
    
    participants.forEach(p => {
        totalHabits += p.habits.length;
        const progress = p.dailyProgress[today];
        if (progress && Object.keys(progress).length > 0) {
            activeToday++;
        }
    });
    
    const totalParticipantsEl = document.getElementById('totalParticipantsCount');
    const totalHabitsEl = document.getElementById('totalHabitsCount');
    const activeTodayEl = document.getElementById('activeToday');
    
    if (totalParticipantsEl) totalParticipantsEl.textContent = participants.length;
    if (totalHabitsEl) totalHabitsEl.textContent = totalHabits;
    if (activeTodayEl) activeTodayEl.textContent = activeToday;
}

// Direct login URL handling
function checkDirectLoginUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const participantName = urlParams.get('user');
    
    if (participantName) {
        // Auto-login with provided name
        setTimeout(() => {
            document.getElementById('participantName').value = decodeURIComponent(participantName);
            loginParticipant();
        }, 500);
    }
}

function showDirectLinks() {
    document.getElementById('directLinksModal').style.display = 'flex';
    generateDirectLinks();
}

function hideDirectLinksModal() {
    document.getElementById('directLinksModal').style.display = 'none';
}

async function generateDirectLinks() {
    const participants = await getAllParticipants();
    const listElement = document.getElementById('directLinksList');
    const baseUrl = window.location.origin + window.location.pathname;
    
    if (participants.length === 0) {
        listElement.innerHTML = '<p class="empty-state">لا يوجد متسابقون بعد</p>';
        return;
    }
    
    let html = '';
    participants.forEach(p => {
        const directUrl = `${baseUrl}?user=${encodeURIComponent(p.name)}`;
        html += `
            <div class="link-item">
                <div class="link-header">
                    <span class="participant-name">👤 ${p.name}</span>
                    <span class="link-status">🔗 رابط مباشر</span>
                </div>
                <div class="link-url-container">
                    <input type="text" class="link-url" value="${directUrl}" readonly 
                           onclick="copyToClipboard(this, '${p.name}')">
                    <button class="copy-btn" onclick="copyToClipboard(document.querySelector('.link-url[value*=\\'${encodeURIComponent(p.name)}\\']'), '${p.name}')">
                        📋 نسخ
                    </button>
                </div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
}

function copyToClipboard(element, participantName) {
    element.select();
    element.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(element.value).then(() => {
        showCopyNotification(participantName);
    }).catch(() => {
        // Fallback for older browsers
        document.execCommand('copy');
        showCopyNotification(participantName);
    });
}

function showCopyNotification(participantName) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.innerHTML = `✅ تم نسخ رابط ${participantName}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Handle Enter key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const adminForm = document.getElementById('adminLoginForm');
        const participantForm = document.getElementById('participantLoginForm');
        
        if (adminForm.style.display === 'block') {
            loginAdmin();
        } else if (participantForm.style.display === 'block') {
            loginParticipant();
        }
    }
});