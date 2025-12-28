// admin.js — Головна панель моніторингу ProAtletCare

const USERS_COL = 'users';
const WEIGHT_COL = 'weight_history';

// Кольорові статуси Wellness
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined || value === null) return '<span style="opacity: 0.1;">➖</span>';
    const val = parseInt(value);
    let color = '#00ff00';
    let emoji = (type === 'sleep') ? '💤' : (type === 'stress') ? '🧠' : (type === 'soreness') ? '💪' : '⚡';

    if (type === 'sleep' || type === 'ready') {
        color = (val >= 8) ? '#00ff00' : (val >= 6) ? '#FFC72C' : '#ff4d4d';
    } else {
        color = (val <= 3) ? '#00ff00' : (val <= 6) ? '#FFC72C' : '#ff4d4d';
    }
    return `
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; 
                    width: 36px; height: 36px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.1em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

// Колір BMI
function getBmiColor(bmi) {
    const val = parseFloat(bmi);
    if (!val) return '#888';
    if (val < 18.5) return '#00BFFF';
    if (val < 25) return '#00ff00';
    if (val < 30) return '#FFC72C';
    return '#ff4d4d';
}

// Функція малювання таблиці
function renderAdminTable(athletesMap) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    tbody.innerHTML = Object.values(athletesMap).map(athlete => {
        const stat = athlete.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
        const weight = athlete.weightData?.weight || '-';
        const bmi = athlete.weightData?.bmi || '-';
        const bmiCol = getBmiColor(bmi);
        
        return `
            <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${athlete.photo}" style="width: 38px; height: 38px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                        <div>
                            <div style="font-weight: bold; color: #FFC72C; font-size: 0.9em;">${athlete.name}</div>
                            <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.7em; padding: 4px; border-radius: 4px; text-align: center; min-width: 90px;
                        background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                        <div style="font-weight: bold; text-transform: uppercase;">${stat.label}</div>
                        ${stat.pain > 0 ? `<div style="font-size: 0.85em; color: #fff;">${stat.bodyPart} (${stat.pain})</div>` : ''}
                    </div>
                </td>
                <td style="text-align: center;">
                    <div style="line-height: 1.2;">
                        <div style="color: #FFC72C; font-weight: bold; font-size: 0.9em;">${weight} kg</div>
                        <div style="color: ${bmiCol}; font-size: 0.7em; font-weight: bold;">BMI: ${bmi}</div>
                    </div>
                </td>
                <td style="text-align: center;">${getStatusEmoji('sleep', athlete.wellness?.sleep)}</td>
                <td style="text-align: center;">${getStatusEmoji('stress', athlete.wellness?.stress)}</td>
                <td style="text-align: center;">${getStatusEmoji('soreness', athlete.wellness?.soreness)}</td>
                <td style="text-align: center;">${getStatusEmoji('ready', athlete.wellness?.ready)}</td>
                <td style="text-align: right; padding-right: 10px;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <a href="weekly-individual.html?userId=${athlete.uid}" style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📅</a>
                        <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📊</a>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

async function loadAdminDashboard() {
    const athletesMap = {};
    try {
        const usersSnap = await db.collection(USERS_COL).get();
        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            if (data.role === 'admin') continue;

            // Захищений запит ваги
            const weightSnap = await db.collection(WEIGHT_COL)
                .where('userId', '==', userDoc.id)
                .orderBy('timestamp', 'desc')
                .limit(1).get();
            
            let weightData = { weight: '-', bmi: '-' };
            if (!weightSnap.empty) {
                const w = weightSnap.docs[0].data();
                weightData = { weight: w.weight, bmi: w.bmi };
            }

            athletesMap[userDoc.id] = {
                uid: userDoc.id,
                name: data.name || "Атлет",
                photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                club: data.club || "Клуб",
                injuryStatus: data.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                wellness: data.lastWellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' },
                weightData: weightData
            };
        }
        renderAdminTable(athletesMap);
    } catch (e) { console.error("Admin Load Error:", e); }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
