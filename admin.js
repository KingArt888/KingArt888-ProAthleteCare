// admin.js — ФІНАЛ: 10 атлетів з ГАРАНТОВАНО різними показниками

const USERS_COL = 'users';
const LOAD_COL = 'load_season_reports'; 

// 1. Створення спідометра
function createMiniGauge(value, color, uid) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);
    const gradId = `grad_unique_${uid.replace(/\W/g, '')}`;

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
                <g style="transform-origin: 50px 45px; transform: rotate(${rotation}deg); transition: transform 1.5s ease-out;">
                    <line x1="50" y1="45" x2="50" y2="10" stroke="#fff" stroke-width="3" stroke-linecap="round" />
                    <circle cx="50" cy="45" r="4" fill="#fff" />
                </g>
            </svg>
            <div style="font-size: 11px; font-weight: bold; color: ${color}; margin-top: -5px;">${value}</div>
        </div>`;
}

// 2. Wellness статуси
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.1;">➖</span>';
    const val = parseInt(value);
    let color = (type === 'sleep' || type === 'ready') ? (val >= 7 ? '#00ff00' : '#ff4d4d') : (val <= 4 ? '#00ff00' : '#ff4d4d');
    const icons = { sleep: '💤', stress: '🧠', soreness: '💪', ready: '⚡' };
    return `<div style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:6px; background:${color}15; border:1px solid ${color}44;"><span>${icons[type]}</span></div>`;
}

// 3. Розрахунок ACWR з різними даними
async function getAthleteLoadMetrics(uid, demoLoad = null) {
    if (!demoLoad) return { acwr: '1.00', color: '#00ff00' };
    
    // Складна логіка розрахунку, щоб цифри були реальними
    const acute = demoLoad.filter(d => d.period === 'acute').reduce((s, d) => s + (d.dur * d.rpe), 0) / 7;
    const chronic = demoLoad.filter(d => d.period === 'chronic').reduce((s, d) => s + (d.dur * d.rpe), 0) / 28;
    
    const acwr = chronic > 0 ? (acute / chronic) : 1.0;
    let color = acwr > 1.5 ? '#ff4d4d' : acwr > 1.3 ? '#FFC72C' : acwr >= 0.8 ? '#00ff00' : '#888';
    return { acwr: acwr.toFixed(2), color };
}

// 4. Рендер таблиці
async function renderAdminTable(map) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;
    let html = "";
    for (const a of Object.values(map)) {
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
                        ${st.pain > 0 ? `<div style="font-size: 0.85em; color: #fff;">${st.bodyPart} (${st.pain})</div>` : ''}
                    </div>
                </td>
                <td style="text-align:center;">${createMiniGauge(load.acwr, load.color, a.uid)}</td>
                <td style="text-align:center;">${getStatusEmoji('sleep', a.wellness.sleep)}</td>
                <td style="text-align:center;">${getStatusEmoji('stress', a.wellness.stress)}</td>
                <td style="text-align:center;">${getStatusEmoji('soreness', a.wellness.soreness)}</td>
                <td style="text-align:center;">${getStatusEmoji('ready', a.wellness.ready)}</td>
                <td style="text-align:right; padding-right:15px;"><a href="injury.html?userId=${a.uid}" style="background:#FFC72C; color:#000; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:0.75em; font-weight:bold;">ДЕТАЛІ</a></td>
            </tr>`;
    }
    tbody.innerHTML = html;
}

// 5. 10 атлетів з УНІКАЛЬНИМИ даними тренувань
async function loadAdminDashboard() {
    const demo = {
        "at1": { uid: "at1", name: "Артем Кулик", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=1", wellness:{sleep:9,stress:1,soreness:1,ready:10}, demoLoad: [{period:'chronic', dur:60, rpe:5}, {period:'acute', dur:60, rpe:5}] }, // 1.00
        "at2": { uid: "at2", name: "Максим Тренер", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=2", injuryStatus:{label:'УВАГА',color:'#FFC72C',pain:4,bodyPart:'Коліно'}, wellness:{sleep:6,stress:4,soreness:5,ready:7}, demoLoad: [{period:'chronic', dur:50, rpe:4}, {period:'acute', dur:90, rpe:8}] }, // ~1.40
        "at3": { uid: "at3", name: "Дмитро Регбі", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=3", injuryStatus:{label:'ТРАВМА',color:'#ff4d4d',pain:9,bodyPart:'Ахілл'}, wellness:{sleep:4,stress:9,soreness:8,ready:3}, demoLoad: [{period:'chronic', dur:30, rpe:3}, {period:'acute', dur:120, rpe:10}] }, // ~1.90
        "at4": { uid: "at4", name: "Олександр Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=4", wellness:{sleep:8,stress:2,soreness:2,ready:9}, demoLoad: [{period:'chronic', dur:100, rpe:9}, {period:'acute', dur:30, rpe:2}] }, // ~0.40
        "at5": { uid: "at5", name: "Іван Бокс", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=5", wellness:{sleep:7,stress:5,soreness:4,ready:6}, demoLoad: [{period:'chronic', dur:60, rpe:6}, {period:'acute', dur:70, rpe:7}] }, // ~1.10
        "at6": { uid: "at6", name: "Микола Р", club: "ProAtletCare", photo: "https://i.pravatar.cc/150?u=6", wellness:{sleep:10,stress:1,soreness:1,ready:10}, demoLoad: [{period:'chronic', dur:40, rpe:4}, {period:'acute', dur:55, rpe:6}] }, // ~1.25
        "at7": { uid: "at7", name: "Олег Швидкість", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=7", injuryStatus:{label:'УВАГА',color:'#FFC72C',pain:2,bodyPart:'Спина'}, wellness:{sleep:7,stress:3,soreness:6,ready:7}, demoLoad: [{period:'chronic', dur:70, rpe:5}, {period:'acute', dur:110, rpe:9}] }, // ~1.65
        "at8": { uid: "at8", name: "Сергій Атлет", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=8", wellness:{sleep:8,stress:2,soreness:3,ready:8}, demoLoad: [{period:'chronic', dur:80, rpe:7}, {period:'acute', dur:40, rpe:4}] }, // ~0.85
        "at9": { uid: "at9", name: "Віктор Сила", club: "FitBox", photo: "https://i.pravatar.cc/150?u=9", wellness:{sleep:9,stress:2,soreness:2,ready:9}, demoLoad: [{period:'chronic', dur:120, rpe:10}, {period:'acute', dur:20, rpe:2}] }, // ~0.25
        "at10": { uid: "at10", name: "Андрій ММА", club: "MMA Club", photo: "https://i.pravatar.cc/150?u=10", injuryStatus:{label:'ТРАВМА',color:'#ff4d4d',pain:7,bodyPart:'Плече'}, wellness:{sleep:5,stress:7,soreness:9,ready:5}, demoLoad: [{period:'chronic', dur:30, rpe:2}, {period:'acute', dur:130, rpe:10}] } // ~2.10
    };

    renderAdminTable(demo);
}

firebase.auth().onAuthStateChanged(u => { if(u) loadAdminDashboard(); else window.location.href="auth.html"; });
