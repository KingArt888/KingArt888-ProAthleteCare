// admin.js — Повна версія: Статус травми + 10 Тестових атлетів + Спідометри

const USERS_COL = 'users';
const LOAD_COL = 'load_season_reports'; 

// 1. Спідометр з градієнтом
function createMiniGauge(value, color) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);
    return `
        <div style="position: relative; width: 70px; height: 40px; margin: 0 auto;">
            <svg viewBox="0 0 100 50" style="width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#888" />
                        <stop offset="40%" stop-color="#00ff00" />
                        <stop offset="65%" stop-color="#FFC72C" />
                        <stop offset="90%" stop-color="#ff4d4d" />
                    </linearGradient>
                </defs>
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#222" stroke-width="8" stroke-linecap="round" />
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#gGrad)" stroke-width="8" stroke-linecap="round" opacity="0.8" />
                <g style="transform-origin: 50px 45px; transform: rotate(${rotation}deg); transition: transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <line x1="50" y1="45" x2="50" y2="10" stroke="#fff" stroke-width="3" stroke-linecap="round" />
                    <circle cx="50" cy="45" r="4" fill="#fff" />
                </g>
            </svg>
            <div style="font-size: 10px; font-weight: bold; color: ${color}; margin-top: -5px;">${value}</div>
        </div>`;
}

// 2. Розрахунок ACWR (Ризик травми)
async function getAthleteLoadMetrics(uid, demoLoad = null) {
    try {
        let data = demoLoad;
        if (!data) {
            const snapshot = await db.collection(LOAD_COL).where("userId", "==", uid).get();
            if (snapshot.empty) return { acwr: '1.00', color: '#666' };
            data = snapshot.docs.map(d => d.data());
        }
        
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = new Date(data[data.length - 1].date);
        
        const getLoad = (days) => {
            const start = new Date(last); start.setDate(last.getDate() - days);
            const pData = data.filter(d => new Date(d.date) > start);
            return pData.reduce((s, d) => s + (Number(d.duration) * Number(d.rpe || 0)), 0) / (days / 7);
        };

        const acute = getLoad(7), chronic = getLoad(28);
        const acwr = chronic > 0 ? (acute / chronic) : 1.0;
        let color = acwr > 1.5 ? '#ff4d4d' : acwr > 1.3 ? '#FFC72C' : acwr >= 0.8 ? '#00ff00' : '#888';
        return { acwr: acwr.toFixed(2), color };
    } catch (e) { return { acwr: '1.00', color: '#333' }; }
}

// 3. Малювання таблиці
async function renderAdminTable(athletesMap) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    let rows = "";
    for (const athlete of Object.values(athletesMap)) {
        const load = await getAthleteLoadMetrics(athlete.uid, athlete.demoLoad);
        const stat = athlete.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
        
        rows += `
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
                <td style="text-align: center;">${createMiniGauge(load.acwr, load.color)}</td>
                <td style="text-align: center;">${getStatusEmoji('sleep', athlete.wellness.sleep)}</td>
                <td style="text-align: center;">${getStatusEmoji('stress', athlete.wellness.stress)}</td>
                <td style="text-align: center;">${getStatusEmoji('soreness', athlete.wellness.soreness)}</td>
                <td style="text-align: center;">${getStatusEmoji('ready', athlete.wellness.ready)}</td>
                <td style="text-align: right; padding-right: 10px;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <a href="weekly-individual.html?userId=${athlete.uid}" style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📅</a>
                        <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 5px 10px; border-radius: 4px; text-decoration: none;">📊</a>
                    </div>
                </td>
            </tr>`;
    }
    tbody.innerHTML = rows;
}

// 4. Завантаження даних + 10 Тестових атлетів
async function loadAdminDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = "2025-11-01";

    const athletesMap = {
        "d1": { uid: "d1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 1, ready: 10 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 60, rpe: 5}] },
        "d2": { uid: "d2", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=3", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 4, soreness: 5, ready: 7 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 90, rpe: 9}] },
        "d3": { uid: "d3", name: "Дмитро Регбі", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=8", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 9, bodyPart: 'Ахілл' }, wellness: { sleep: 4, stress: 9, soreness: 8, ready: 3 }, demoLoad: [{date: pastDate, duration: 30, rpe: 3}, {date: today, duration: 120, rpe: 10}] },
        "d4": { uid: "d4", name: "Олександр Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=4", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 3, soreness: 2, ready: 9 }, demoLoad: [{date: pastDate, duration: 60, rpe: 6}, {date: today, duration: 60, rpe: 6}] },
        "d5": { uid: "d5", name: "Іван Боєць", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=12", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 2, bodyPart: 'Плече' }, wellness: { sleep: 7, stress: 5, soreness: 4, ready: 6 }, demoLoad: [{date: pastDate, duration: 90, rpe: 8}, {date: today, duration: 40, rpe: 4}] },
        "d6": { uid: "d6", name: "Микола Швидкий", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=6", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 1, soreness: 1, ready: 10 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 65, rpe: 5}] },
        "d7": { uid: "d7", name: "Олег Крос", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=7", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 2, ready: 8 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 30, rpe: 3}] },
        "d8": { uid: "d8", name: "Сергій Атлет", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=15", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 3, bodyPart: 'Спина' }, wellness: { sleep: 6, stress: 6, soreness: 6, ready: 5 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 100, rpe: 8}] },
        "d9": { uid: "d9", name: "Віктор Бокс", club: "FitBox", photo: "https://i.pravatar.cc/150?u=19", injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 3, soreness: 3, ready: 9 }, demoLoad: [{date: pastDate, duration: 60, rpe: 5}, {date: today, duration: 60, rpe: 5}] },
        "d10": { uid: "d10", name: "Андрій ММА", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=20", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 7, bodyPart: 'Гомілка' }, wellness: { sleep: 5, stress: 7, soreness: 9, ready: 4 }, demoLoad: [{date: pastDate, duration: 40, rpe: 4}, {date: today, duration: 110, rpe: 9}] }
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
