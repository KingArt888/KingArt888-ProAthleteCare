// admin.js — Головна панель моніторингу ProAtletCare

const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// 1. Кольорові статуси Wellness
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined || value === null) return '<span style="opacity: 0.1;">➖</span>';
    const val = parseInt(value);
    let color = '#00ff00';
    let emoji = '';
    if (type === 'sleep') emoji = '💤';
    if (type === 'stress') emoji = '🧠';
    if (type === 'soreness') emoji = '💪';
    if (type === 'ready') emoji = '⚡';

    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) color = '#00ff00';
        else if (val >= 6) color = '#FFC72C';
        else color = '#ff4d4d';
    } else {
        if (val <= 3) color = '#00ff00';
        else if (val <= 6) color = '#FFC72C';
        else color = '#ff4d4d';
    }
    return `
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; 
                    width: 36px; height: 36px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.1em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

// 2. Функція Чат
window.openChat = function(uid, name) {
    const msg = prompt(`Повідомлення для ${name}:`);
    if (msg) {
        db.collection('messages').add({
            to: uid,
            text: msg,
            sender: 'admin',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert("Відправлено!"));
    }
};

// 3. Функція малювання таблиці
function renderAdminTable(athletesMap) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    tbody.innerHTML = Object.values(athletesMap).map(athlete => {
        const stat = athlete.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
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
                        ${stat.pain > 0 ? `<div style="font-size: 0.85em; color: #fff;">${stat.bodyPart || 'Біль'} (${stat.pain})</div>` : ''}
                    </div>
                </td>
                <td style="text-align: center;">${getStatusEmoji('sleep', athlete.wellness.sleep)}</td>
                <td style="text-align: center;">${getStatusEmoji('stress', athlete.wellness.stress)}</td>
                <td style="text-align: center;">${getStatusEmoji('soreness', athlete.wellness.soreness)}</td>
                <td style="text-align: center;">${getStatusEmoji('ready', athlete.wellness.ready)}</td>
                <td style="text-align: right; padding-right: 10px;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <a href="weekly-individual.html?userId=${athlete.uid}" title="План на тиждень" 
                           style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📅</a>
                        
                        <a href="injury.html?userId=${athlete.uid}" title="Аналіз травм" 
                           style="background: #FFC72C; color: #000; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📊</a>
                        
                        <button onclick="openChat('${athlete.uid}', '${athlete.name}')" title="Написати повідомлення"
                                style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 5px; border-radius: 4px; cursor: pointer;">✉️</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// 4. Завантаження даних
async function loadAdminDashboard() {
    const athletesMap = {
        "demo_1": { uid: "demo_1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 1, ready: 10 } },
        "demo_2": { uid: "demo_2", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=3", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 4, soreness: 5, ready: 7 } },
        "demo_3": { uid: "demo_3", name: "Дмитро Регбі", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=8", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 9, bodyPart: 'Ахілл' }, wellness: { sleep: 4, stress: 9, soreness: 8, ready: 3 } },
        "demo_4": { uid: "demo_4", name: "Олександр Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=4", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 3, soreness: 2, ready: 9 } },
        "demo_5": { uid: "demo_5", name: "Іван Боєць", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=12", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 2, bodyPart: 'Плече' }, wellness: { sleep: 7, stress: 5, soreness: 4, ready: 6 } }
    };

    renderAdminTable(athletesMap);

    try {
        const usersSnap = await db.collection(USERS_COL).get();
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "Клуб",
                    injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });
        renderAdminTable(athletesMap);
    } catch (e) { console.warn(e); }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
