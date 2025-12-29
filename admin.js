// admin.js — ПОВНА ВЕРСІЯ: 10 атлетів, унікальні ID та різні спідометри

const USERS_COL = 'users';
const LOAD_COL = 'load_season_reports'; 

// 1. Спідометр з ГАРАНТОВАНО унікальним ID градієнта
function createMiniGauge(value, color, uniqueId) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);
    
    // Створюємо унікальний ID для градієнта, щоб кольори не "злипалися"
    const gradId = `grad_acwr_${uniqueId}`;

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
            <div style="font-size: 10px; font-weight: bold; color: ${color}; margin-top: -5px;">${value}</div>
        </div>`;
}

// 2. Wellness іконки
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.1;">➖</span>';
    const val = parseInt(value);
    let color = (type === 'sleep' || type === 'ready') ? (val >= 7 ? '#00ff00' : '#ff4d4d') : (val <= 4 ? '#00ff00' : '#ff4d4d');
    const emojis = { sleep: '💤', stress: '🧠', soreness: '💪', ready: '⚡' };
    return `<div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; background: ${color}15; border: 1px solid ${color}44;"><span style="font-size: 1em;">${emojis[type]}</span></div>`;
}

// 3. Розрахунок ACWR
async function getAthleteLoadMetrics(uid, demoData = null) {
    try {
        let data = demoData;
        if (!data) {
            const snap = await db.collection(LOAD_COL).where("userId", "==", uid).get();
            if (snap.empty) return { acwr: '1.00', color: '#00ff00' };
            data = snap.docs.map(d => d.data());
        }
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = new Date(data[data.length - 1].date);
        const getAvg = (days) => {
            const start = new Date(last); start.setDate(last.getDate() - days);
            const pData = data.filter(d => new Date(d.date) > start);
            return pData.reduce((s, d) => s + (Number(d.duration) * Number(d.rpe || 0)), 0) / (days / 7);
        };
        const acute = getAvg(7), chronic = getAvg(28);
        const acwr = chronic > 0 ? (acute / chronic) : 1.0;
        let color = acwr > 1.5 ? '#ff4d4d' : acwr > 1.3 ? '#FFC72C' : acwr >= 0.8 ? '#00ff00' : '#888';
        return { acwr: acwr.toFixed(2), color };
    } catch (e) { return { acwr: '1.00', color: '#333' }; }
}

// 4. Малювання таблиці
async function renderAdminTable(map) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;
    let html = "";
    for (const [key, a] of Object.entries(map)) {
        const load = await getAthleteLoadMetrics(a.uid, a.demoLoad);
        const st = a.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
        html += `
            <tr style="border-bottom: 1px solid #111;">
                <td style="padding: 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${a.photo}" style="width:38px; height:38px; border-radius:50%; border:1px solid #FFC72C;">
                        <div><div style="font-weight:bold; color:#FFC72C; font-size:0.9em;">${a.name}</div><div style="font-size:0.7em; color:#666;">${a.club}</div></div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.65em; padding: 4px; border-radius: 4px; text-align: center; background: ${st.color}15; color: ${st.color}; border: 1px solid ${st.color}44;">
                        <div style="font-weight: bold; text-transform: uppercase;">${st.label}</div>
                        ${st.pain > 0 ? `<div style="font-size: 0.9em; color: #fff;">${st.bodyPart} (${st.pain})</div>` : ''}
                    </div>
                </td>
                <td style="text-align:center;">${createMiniGauge(load.acwr, load.color, a.uid)}</td>
                <td style="text-align:center;">${getStatusEmoji('sleep', a.wellness.sleep)}</td>
                <td style="text-align:center;">${getStatusEmoji('stress', a.wellness.stress)}</td>
                <td style="text-align:center;">${getStatusEmoji('soreness', a.wellness.soreness)}</td>
                <td style="text-align:center;">${getStatusEmoji('ready', a.wellness.ready)}</td>
                <td style="text-align: right; padding-right: 15px;"><a href="injury.html?userId=${a.uid}" style="background:#FFC72C; color:#000; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:bold;">ДЕТАЛІ</a></td>
            </tr>`;
    }
    tbody.innerHTML = html;
}

// 5. 10 атлетів з унікальними ID та даними
async function loadAdminDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const past = "2025-11-20";

    const demo = {
        "at_01": { uid: "id_artem", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", wellness: { sleep: 9, stress: 1, soreness: 1, ready: 10 }, demoLoad: [{date: past, duration: 60, rpe: 5}, {date: today, duration: 60, rpe: 5}] },
        "at_02": { uid: "id_maxim", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=2", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Коліно' }, wellness: { sleep: 6, stress: 4, soreness: 5, ready: 7 }, demoLoad: [{date: past, duration: 60, rpe: 4}, {date: today, duration: 90, rpe: 8}] },
        "at_03": { uid: "id_dmytro", name: "Дмитро Регбі", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=3", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 9, bodyPart: 'Ахілл' }, wellness: { sleep: 4, stress: 9, soreness: 8, ready: 3 }, demoLoad: [{date: past, duration: 30, rpe: 3}, {date: today, duration: 120, rpe: 10}] },
        "at_04": { uid: "id_oleks", name: "Олександр Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=4", wellness: { sleep: 8, stress: 3, soreness: 2, ready: 9 }, demoLoad: [{date: past, duration: 100, rpe: 9}, {date: today, duration: 30, rpe: 2}] },
        "at_05": { uid: "id_ivan", name: "Іван Бокс", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=5", wellness: { sleep: 7, stress: 5, soreness: 4, ready: 6 }, demoLoad: [{date: past, duration: 60, rpe: 5}, {date: today, duration: 60, rpe: 6}] },
        "at_06": { uid: "id_mykola", name: "Микола Р", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=6", wellness: { sleep: 10, stress: 1, soreness: 1, ready: 10 }, demoLoad: [{date: past, duration: 45, rpe: 4}, {date: today, duration: 65, rpe: 6}] },
        "at_07": { uid: "id_oleg", name: "Олег Швидкість", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=7", injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 2, bodyPart: 'Спина' }, wellness: { sleep: 7, stress: 3, soreness: 6, ready: 7 }, demoLoad: [{date: past, duration: 80, rpe: 6}, {date: today, duration: 100, rpe: 9}] },
        "at_08": { uid: "id_serg", name: "Сергій Атлет", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=8", wellness: { sleep: 8, stress: 2, soreness: 3, ready: 8 }, demoLoad: [{date: past, duration: 50, rpe: 5}, {date: today, duration: 45, rpe: 4}] },
        "at_09": { uid: "id_viktor", name: "Віктор Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=9", wellness: { sleep: 9, stress: 2, soreness: 2, ready: 9 }, demoLoad: [{date: past, duration: 120, rpe: 10}, {date: today, duration: 25, rpe: 2}] },
        "at_10": { uid: "id_andrii", name: "Андрій ММА", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=10", injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 7, bodyPart: 'Плече' }, wellness: { sleep: 5, stress: 7, soreness: 9, ready: 5 }, demoLoad: [{date: past, duration: 40, rpe: 4}, {date: today, duration: 130, rpe: 10}] }
    };

    renderAdminTable(demo);
}

firebase.auth().onAuthStateChanged(u => { if(u) loadAdminDashboard(); else window.location.href="auth.html"; });
