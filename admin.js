// admin.js — Головна панель моніторингу ProAtletCare з вагою та BMI

const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';
const WEIGHT_COL = 'weight_history'; // Додаємо константу для ваги

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

// Функція кольору BMI для таблиці
function getBmiColor(bmi) {
    const val = parseFloat(bmi);
    if (!val) return '#888';
    if (val < 18.5) return '#00BFFF';
    if (val < 25) return '#00ff00';
    if (val < 30) return '#FFC72C';
    return '#ff4d4d';
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
        const bmiCol = getBmiColor(athlete.weightData.bmi);
        
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
                
                <td style="text-align: center;">
                    <div style="line-height: 1.2;">
                        <div style="color: #FFC72C; font-weight: bold; font-size: 0.9em;">${athlete.weightData.weight || '-'} kg</div>
                        <div style="color: ${bmiCol}; font-size: 0.7em; font-weight: bold;">BMI: ${athlete.weightData.bmi || '-'}</div>
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
        "demo_1": { uid: "demo_1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 1, ready: 10 }, weightData: { weight: 85, bmi: 24.2 } },
        "demo_2": { uid: "demo_2", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=3", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 4, soreness: 5, ready: 7 }, weightData: { weight: 92, bmi: 27.5 } }
    };

    try {
        const usersSnap = await db.collection(USERS_COL).get();
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (data.role !== 'admin') {
                // Отримуємо останню вагу для кожного атлета
                const weightSnap = await db.collection(WEIGHT_COL)
                    .where('userId', '==', doc.id)
                    .orderBy('timestamp', 'desc')
                    .limit(1).get();
                
                let lastWeight = { weight: '-', bmi: '-' };
                if (!weightSnap.empty) {
                    const wData = weightSnap.docs[0].data();
                    lastWeight = { weight: wData.weight, bmi: wData.bmi };
                }

                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "Клуб",
                    injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' },
                    weightData: lastWeight
                };
            }
        }
        renderAdminTable(athletesMap);
    } catch (e) { 
        console.warn(e); 
        renderAdminTable(athletesMap); // Показуємо хоча б демо, якщо база не відповіла
    }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
