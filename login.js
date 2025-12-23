// Login Page Scripts

document.addEventListener('DOMContentLoaded', async () => {
    displayDate();
    await updateLeaderboardPreview();
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