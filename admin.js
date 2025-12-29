// admin.js — ФІНАЛЬНА ВЕРСІЯ: 10 атлетів, унікальні спідометри та Wellness

const USERS_COL = 'users';
const LOAD_COL = 'load_season_reports'; 

// 1. Створення спідометра з унікальним градієнтом для кожного атлета
function createMiniGauge(value, color, uid) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);
    const gradId = `gauge_grad_${uid.replace(/\W/g, '')}`; // Унікальний ID градієнта

    return `
        <div style="position: relative; width: 75px; height: 42px; margin: 0 auto;">
            <svg viewBox="0 0 100 50" style="width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#888" />
                        <stop offset="40%" stop-color="#00ff00" />
                        <stop offset="65%" stop-color="#FFC72C" />
                        <stop offset="90%" stop-color="#ff4d4d" />
                    </linearGradient>
                </defs>
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#222" stroke-width="8" stroke-linecap="round" />
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#${gradId})" stroke-width="8" stroke-linecap="round" opacity="0.8" />
                <g style="transform-origin: 50px 45px; transform: rotate(${rotation}deg); transition: transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <line x1="50" y1="45" x2="50" y2="10" stroke="#fff" stroke-width="3" stroke-linecap="round" />
                    <circle cx="50" cy="45" r="4" fill="#fff" />
                </g>
            </svg>
            <div style="font-size: 10px; font-weight: bold; color: ${color}; margin-top: -5px; letter-spacing: 0.5px;">${value}</div>
        </div>`;
}

// 2. Іконки Wellness
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
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.1em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

// 3. Розрахунок ACWR
async function getAthleteLoadMetrics(uid, demoLoad = null) {
    try {
        let data = demoLoad;
        if (!data) {
            const snapshot = await db.collection(LOAD_COL).where("userId", "==", uid).get();
            if (snapshot.empty) return { acwr: '1.00', color: '#00ff00' };
            data = snapshot.docs.map(d => d.data());
        }
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = new Date(data[data.length - 1].date);
        const getLoad = (days) => {
            const start = new Date(last); start.setDate(last.getDate() - days);
            const pData = data.filter(d => d && d.date && new Date(d.date) > start);
            return pData.reduce((s, d) => s + (Number(d.duration || 0) * Number(d.rpe || 0)), 0) / (days / 7);
        };
        const acute = getLoad(7), chronic = getLoad(28);
        const acwr = chronic > 0 ? (acute / chronic) : 1.0;
        let color = acwr > 1.5 ? '#ff4d4d' : acwr > 1.3 ? '#FFC72C' : acwr >= 0.8 ? '#00ff00' : '#888';
        return { acwr: acwr.toFixed(2), color };
    } catch (e) { return { acwr: '1.00', color: '#333' }; }
}

// 4. Малювання таблиці
async function renderAdminTable(athletesMap) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;
    let rows = "";
    for (const [id, athlete] of Object.entries(athletesMap)) {
        const load = await getAthleteLoadMetrics(athlete.uid, athlete.demoLoad);
        const stat = athlete.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
        const wellness = athlete.wellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' };
        
        rows += `
            <tr style="border-bottom: 1px solid #1a1a1a;">
                <td style="padding: 12px 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                        <div>
                            <div style="font-weight: bold; color: #FFC72C; font-size: 0.9em;">${athlete.name}</div>
                            <div style="font-size: 0.7em; color: #666;">${athlete.club}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.65em; padding: 4px; border-radius: 4px; text-align: center; min-width: 90px;
                        background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                        <div style="font-weight: bold; text-transform: uppercase;">${stat.label}</div>
                        ${stat.pain > 0 ? `<div style="font-size: 0.9em; color: #fff;">${stat.bodyPart} (${stat.pain})</div>` : ''}
                    </div>
                </td>
                <td style="text-align: center;">${createMiniGauge(load.acwr, load.color, athlete.uid)}</td>
                <td style="text-align: center;">${getStatusEmoji('sleep', wellness.sleep)}</td>
                <td style="text-align: center;">${getStatusEmoji('stress', wellness.stress)}</td>
                <td style="text-align: center;">${getStatusEmoji('soreness', wellness.soreness)}</td>
                <td style="text-align: center;">${getStatusEmoji('ready', wellness.ready)}</td>
                <td style="text-align: right; padding-right: 15px;">
                    <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.8em;">АНАЛІЗ</a>
                </td>
            </tr>`;
    }
    tbody.innerHTML = rows;
}

// 5. Запуск з 10 різними атлетами
async function loadAdminDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const past = "2025-12-01";

    const demo = {
        "a1": { uid: "a1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=a1", wellness: { sleep: 9, stress: 1, soreness: 1, ready: 10 }, demoLoad: [{date: past, duration: 60, rpe: 5}, {date: today, duration: 60, rpe: 5}] }, // 1.0 (Зелений)
        "a2": { uid: "a2", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=a2", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 5, soreness: 5, ready: 6 }, demoLoad: [{date: past, duration: 60, rpe: 4}, {date: today, duration: 90, rpe: 8}] }, // 1.4 (Жовтий)
        "a3": { uid: "a3", name: "Дмитро Регбі", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=a3", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 8, bodyPart: 'Ахілл' }, wellness: { sleep: 4, stress: 8, soreness: 7, ready: 4 }, demoLoad: [{date: past, duration: 20, rpe: 2}, {date: today, duration: 120, rpe: 10}] }, // 1.8 (Червоний)
        "a4": { uid: "a4", name: "Олександр Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=a4", wellness: { sleep: 8, stress: 2, soreness: 2, ready: 9 }, demoLoad: [{date: past, duration: 90, rpe: 8}, {date: today, duration: 30, rpe: 2}] }, // 0.6 (Сірий - недотренованість)
        "a5": { uid: "a5", name: "Іван Боєць", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=a5", wellness: { sleep: 7, stress: 4, soreness: 4, ready: 7 }, demoLoad: [{date: past, duration: 60, rpe: 5}, {date: today, duration: 75, rpe: 6}] }, // 1.1 (Зелений)
        "a6": { uid: "a6", name: "Микола Швидкий", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=a6", wellness: { sleep: 10, stress: 1, soreness: 1, ready: 10 }, demoLoad: [{date: past, duration: 60, rpe: 4}, {date: today, duration: 60, rpe: 5}] }, // 1.2 (Зелений)
        "a7": { uid: "a7", name: "Олег Крос", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=a7", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 2, bodyPart: 'Спина' }, wellness: { sleep: 7, stress: 3, soreness: 6, ready: 7 }, demoLoad: [{date: past, duration: 70, rpe: 6}, {date: today, duration: 100, rpe: 9}] }, // 1.5 (Червона межа)
        "a8": { uid: "a8", name: "Сергій Атлет", club: "Rugby UA", photo: "https://i.pravatar.cc/150?u=a8", wellness: { sleep: 8, stress: 2, soreness: 3, ready: 8 }, demoLoad: [{date: past, duration: 40, rpe: 4}, {date: today, duration: 40, rpe: 4}] }, // 1.0 (Зелений)
        "a9": { uid: "a9", name: "Віктор Бокс", club: "FitBox", photo: "https://i.pravatar.cc/150?u=a9", wellness: { sleep: 9, stress: 2, soreness: 2, ready: 9 }, demoLoad: [{date: past, duration: 100, rpe: 9}, {date: today, duration: 50, rpe: 4}] }, // 0.7 (Сірий)
        "a10": { uid: "a10", name: "Андрій ММА", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=a10", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 6, bodyPart: 'Плече' }, wellness: { sleep: 5, stress: 6, soreness: 9, ready: 5 }, demoLoad: [{date: past, duration: 45, rpe: 4}, {date: today, duration: 115, rpe: 9}] } // 1.7 (Червоний)
    };

    renderAdminTable(demo);

    // Підвантаження реальних юзерів з бази
    try {
        const usersSnap = await db.collection(USERS_COL).get();
        const real = {};
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                real[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "Клуб",
                    wellness: data.lastWellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });
        if (Object.keys(real).length > 0) renderAdminTable({...demo, ...real});
    } catch (e) { console.warn("Firestore error:", e); }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
