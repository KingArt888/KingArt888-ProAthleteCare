const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// 1. Кольорові індикатори Wellness
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.2;">➖</span>';
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
                    width: 42px; height: 42px; border-radius: 10px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.4em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

// 2. Функції взаємодії (Чат та Програма)
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

window.editProgram = function(uid, name) {
    const adj = prompt(`Коригування програми для ${name}:`, "Зменшити навантаження на...");
    if (adj) {
        db.collection('training_plans').doc(uid).set({
            adjustments: adj,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => alert("Програму оновлено!"));
    }
};

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    try {
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // Завантаження користувачів
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "ProAtletCare",
                    injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0, bodyPart: '' },
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // Аналіз травм та динаміки (БЕЗ ЕМОДЗІ в тексті)
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && data.status !== 'closed') {
                const history = data.painHistory || data.history || [];
                if (history.length > 0) {
                    const lastPain = parseInt(history[history.length - 1].pain) || 0;
                    if (lastPain === 0) {
                        athletesMap[uid].injuryStatus = { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0, bodyPart: '' };
                    } else {
                        let trend = 'СТАБІЛЬНО';
                        let trendColor = '#FFC72C';
                        if (history.length > 1) {
                            const prevPain = parseInt(history[history.length - 2].pain) || 0;
                            if (lastPain < prevPain) { trend = 'ПОКРАЩЕННЯ'; trendColor = '#00ff00'; }
                            else if (lastPain > prevPain) { trend = 'ПОГІРШЕННЯ'; trendColor = '#ff4d4d'; }
                        } else { trend = 'НОВА ТРАВМА'; trendColor = '#ff4d4d'; }
                        
                        athletesMap[uid].injuryStatus = { 
                            label: trend, color: trendColor, pain: lastPain,
                            bodyPart: data.bodyPart || data.type || 'Травма' 
                        };
                    }
                }
            }
        });

        // Wellness дані
        wellnessSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && athletesMap[uid].wellness.sleep === '-') {
                athletesMap[uid].wellness = {
                    sleep: data.scores?.sleep, stress: data.scores?.stress, soreness: data.scores?.soreness, ready: data.scores?.ready
                };
            }
        });

        let athleteList = Object.values(athletesMap);

        // Тимчасові атлети для перевірки (видаліть, коли база заповниться)
        const demoAthletes = [
            {
                uid: "d1", name: "Олександр", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=11",
                injuryStatus: { label: 'ПОКРАЩЕННЯ', color: '#00ff00', pain: 2, bodyPart: 'Праве коліно' },
                wellness: { sleep: 9, stress: 2, soreness: 3, ready: 8 }
            },
            {
                uid: "d2", name: "Дмитро", club: "FC Shakhtar", photo: "https://i.pravatar.cc/150?u=12",
                injuryStatus: { label: 'ПОГІРШЕННЯ', color: '#ff4d4d', pain: 8, bodyPart: 'Ахіл' },
                wellness: { sleep: 4, stress: 9, soreness: 8, ready: 2 }
            }
        ];
        athleteList = [...athleteList, ...demoAthletes];

        // Рендер таблиці
        tbody.innerHTML = athleteList.map(athlete => {
            const stat = athlete.injuryStatus;
            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 15px 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 42px; height: 42px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C; font-size: 0.95em;">${athlete.name}</div>
                                <div style="font-size: 0.75em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.75em; padding: 6px; border-radius: 6px; text-align: center; min-width: 120px;
                            background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                            <div style="font-weight: bold; text-transform: uppercase;">${stat.label}</div>
                            ${stat.pain > 0 ? `<div style="color: #fff; margin-top: 3px; font-weight: bold;">${stat.bodyPart}</div>` : ''}
                            ${stat.pain > 0 ? `<div style="opacity: 0.7; font-size: 0.9em;">Біль: ${stat.pain}</div>` : ''}
                        </div>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', athlete.wellness.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', athlete.wellness.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', athlete.wellness.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', athlete.wellness.ready)}</td>
                    <td style="text-align: right; padding-right: 15px;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <a href="injury.html?userId=${athlete.uid}" title="Аналіз" style="background: #FFC72C; color: #000; padding: 7px; border-radius: 4px; text-decoration: none; font-size: 0.9em;">📊</a>
                            <button onclick="openChat('${athlete.uid}', '${athlete.name}')" style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 7px; border-radius: 4px; cursor: pointer;">✉️</button>
                            <button onclick="editProgram('${athlete.uid}', '${athlete.name}')" style="background: #000; color: #FFC72C; border: 1px solid #FFC72C; padding: 7px; border-radius: 4px; cursor: pointer;">🏋️</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

firebase.auth().onAuthStateChanged(user => { if (user) loadGlobalMonitor(); else window.location.href = "auth.html"; });
