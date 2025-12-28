// admin.js — Панель моніторингу ProAtletCare з демо-даними
const USERS_COL = 'users';
const WEIGHT_COL = 'weight_history';

// 1. Кольорові статуси Wellness
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

// 2. Колір BMI (Світлофор)
function getBmiColor(bmi) {
    const val = parseFloat(bmi);
    if (!val || isNaN(val)) return '#888';
    if (val < 18.5) return '#00BFFF'; // Синій - недовага
    if (val < 25) return '#00ff00';   // Зелений - норма
    if (val < 30) return '#FFC72C';   // Жовтий - увага
    return '#ff4d4d';                // Червоний - ожиріння
}

// 3. Функція малювання таблиці
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
                        ${stat.pain > 0 ? `<div style="font-size: 0.85em; color: #fff;">${stat.bodyPart || 'Біль'} (${stat.pain})</div>` : ''}
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

// 4. Завантаження даних + 10 Демо-атлетів
async function loadAdminDashboard() {
    // Тимчасові 10 атлетів для редагування панелі
    const demoAthletes = {
        "d1": { uid: "d1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 1, ready: 10 }, weightData: { weight: 88, bmi: 24.1 } },
        "d2": { uid: "d2", name: "Максим Регбі", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=2", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 5, soreness: 6, ready: 7 }, weightData: { weight: 95, bmi: 28.3 } },
        "d3": { uid: "d3", name: "Іван Бокс", club: "Fit/Box", photo: "https://i.pravatar.cc/150?u=3", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 9, bodyPart: 'Плече' }, wellness: { sleep: 4, stress: 8, soreness: 9, ready: 2 }, weightData: { weight: 82, bmi: 23.5 } },
        "d4": { uid: "d4", name: "Дмитро Сила", club: "Donetsk", photo: "https://i.pravatar.cc/150?u=4", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 3, soreness: 2, ready: 9 }, weightData: { weight: 105, bmi: 31.2 } },
        "d5": { uid: "d5", name: "Олександр Швидкість", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=5", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 3, bodyPart: 'Ахілл' }, wellness: { sleep: 7, stress: 4, soreness: 4, ready: 6 }, weightData: { weight: 78, bmi: 21.8 } },
        "d6": { uid: "d6", name: "Сергій Атлет", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=6", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 10, stress: 1, soreness: 0, ready: 10 }, weightData: { weight: 85, bmi: 24.5 } },
        "d7": { uid: "d7", name: "Андрій Крос", club: "Cyprus Run", photo: "https://i.pravatar.cc/150?u=7", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 5, stress: 6, soreness: 7, ready: 4 }, weightData: { weight: 70, bmi: 19.5 } },
        "d8": { uid: "d8", name: "Микола ММА", club: "Fight Club", photo: "https://i.pravatar.cc/150?u=8", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 7, bodyPart: 'Спина' }, wellness: { sleep: 6, stress: 7, soreness: 8, ready: 5 }, weightData: { weight: 90, bmi: 26.8 } },
        "d9": { uid: "d9", name: "Віктор Тренер", club: "FitBox", photo: "https://i.pravatar.cc/150?u=9", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 2, soreness: 3, ready: 8 }, weightData: { weight: 84, bmi: 25.1 } },
        "d10": { uid: "d10", name: "Олег Регбіст", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=10", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 2, bodyPart: 'Гомілка' }, wellness: { sleep: 7, stress: 3, soreness: 5, ready: 7 }, weightData: { weight: 98, bmi: 29.5 } }
    };

    renderAdminTable(demoAthletes); // Спочатку показуємо демо

    try {
        const usersSnap = await db.collection(USERS_COL).get();
        const realAthletes = {};
        
        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            if (data.role === 'admin') continue;

            const weightSnap = await db.collection(WEIGHT_COL)
                .where('userId', '==', userDoc.id)
                .orderBy('timestamp', 'desc')
                .limit(1).get();
            
            let weightData = { weight: '-', bmi: '-' };
            if (!weightSnap.empty) {
                const w = weightSnap.docs[0].data();
                weightData = { weight: w.weight, bmi: w.bmi };
            }

            realAthletes[userDoc.id] = {
                uid: userDoc.id,
                name: data.name || "Атлет",
                photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                club: data.club || "Клуб",
                injuryStatus: data.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                wellness: data.lastWellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' },
                weightData: weightData
            };
        }
        
        // Якщо є реальні атлети, додаємо їх до демо-списку або замінюємо його
        if (Object.keys(realAthletes).length > 0) {
            renderAdminTable({...demoAthletes, ...realAthletes});
        }
    } catch (e) { 
        console.error("Admin Load Error:", e);
    }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
