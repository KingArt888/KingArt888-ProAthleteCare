// admin.js — Панель ProAtletCare
const USERS_COL = 'users';
const LOAD_COL = 'load_season_reports';

// 1. Кольоровий анімований спідометр
function createMiniGauge(value, color) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);

    return `
        <div style="position: relative; width: 80px; height: 45px; margin: 0 auto;">
            <svg viewBox="0 0 100 50" style="width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#888" />
                        <stop offset="40%" stop-color="#00ff00" />
                        <stop offset="65%" stop-color="#FFC72C" />
                        <stop offset="90%" stop-color="#ff4d4d" />
                    </linearGradient>
                </defs>
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#222" stroke-width="8" stroke-linecap="round" />
                <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#gaugeGrad)" stroke-width="8" stroke-linecap="round" opacity="0.8" />
                <g style="transform-origin: 50px 45px; transform: rotate(${rotation}deg); transition: transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <line x1="50" y1="45" x2="50" y2="10" stroke="#fff" stroke-width="3" stroke-linecap="round" />
                    <circle cx="50" cy="45" r="4" fill="#fff" />
                </g>
            </svg>
            <div style="font-size: 11px; font-weight: bold; color: ${color}; margin-top: -6px;">${value}</div>
        </div>
    `;
}

// 2. Wellness іконки
function getStatusEmoji(type, value) {
    if (value === '-' || !value) return '<span style="opacity: 0.1;">➖</span>';
    const val = parseInt(value);
    let color = (type === 'sleep' || type === 'ready') ? (val >= 7 ? '#00ff00' : '#ff4d4d') : (val <= 4 ? '#00ff00' : '#ff4d4d');
    const emojis = { sleep: '💤', stress: '🧠', soreness: '💪', ready: '⚡' };
    
    return `
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1em; filter: drop-shadow(0 0 2px ${color});">${emojis[type]}</span>
        </div>`;
}

// 3. Розрахунок ACWR
async function getAthleteLoadMetrics(uid, demoData = null) {
    try {
        let data = demoData;
        if (!data) {
            const snap = await db.collection(LOAD_COL).where("userId", "==", uid).get();
            if (snap.empty) return { acwr: '1.00', status: 'НОРМА', color: '#666' };
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
        let status = acwr > 1.5 ? 'РИЗИК' : acwr > 1.3 ? 'УВАГА' : 'ОК';
        return { acwr: acwr.toFixed(2), status, color };
    } catch (e) { return { acwr: '1.00', status: '-', color: '#333' }; }
}

// 4. Рендер таблиці
async function renderAdminTable(map) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;
    let html = "";
    for (const a of Object.values(map)) {
        const load = await getAthleteLoadMetrics(a.uid, a.demoLoad);
        const st = a.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00' };
        html += `
            <tr>
                <td style="padding-left:25px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${a.photo}" style="width:38px; height:38px; border-radius:50%; border:1px solid #FFC72C;">
                        <div><div style="font-weight:bold; color:#FFC72C; font-size:0.9em;">${a.name}</div><div style="font-size:0.7em; color:#666;">${a.club}</div></div>
                    </div>
                </td>
                <td style="text-align:center;">
                    <div style="font-size:0.6em; padding:3px 6px; border-radius:4px; border:1px solid ${st.color}44; color:${st.color}; font-weight:bold;">${st.label}</div>
                </td>
                <td style="text-align:center;">${createMiniGauge(load.acwr, load.color)}</td>
                <td class="wellness-col">${getStatusEmoji('sleep', a.wellness?.sleep)}</td>
                <td class="wellness-col">${getStatusEmoji('stress', a.wellness?.stress)}</td>
                <td class="wellness-col">${getStatusEmoji('soreness', a.wellness?.soreness)}</td>
                <td class="wellness-col">${getStatusEmoji('ready', a.wellness?.ready)}</td>
                <td style="text-align:right; padding-right:25px;">
                    <a href="weekly-individual.html?userId=${a.uid}" class="btn-action" style="background:transparent; color:#FFC72C; border:1px solid #FFC72C;">📅</a>
                    <a href="injury.html?userId=${a.uid}" class="btn-action">📊</a>
                </td>
            </tr>`;
    }
    tbody.innerHTML = html;
}

// 5. Завантаження
async function loadAdminDashboard() {
    const demo = {};
    const names = ["Артем Кулик", "Максим Регбі", "Дмитро Сила", "Іван Бокс", "Олег Швидкість", "Сергій Атлет", "Андрій Крос", "Микола ММА", "Віктор Тренер", "Олександр Р"];
    for(let i=1; i<=10; i++) {
        demo[`d${i}`] = {
            uid: `d${i}`, name: names[i-1], club: i%2==0 ? "ProAtletCare" : "Paphos FC",
            photo: `https://i.pravatar.cc/150?u=${i+30}`,
            injuryStatus: i==3 ? {label:'ТРАВМА', color:'#ff4d4d'} : {label:'ЗДОРОВИЙ', color:'#00ff00'},
            wellness: { sleep: 8, stress: 2, soreness: 3, ready: 9 },
            demoLoad: [{date:'2025-12-01', duration:60, rpe:6}, {date:'2025-12-28', duration:80, rpe: i==3 ? 10 : 6}]
        };
    }
    renderAdminTable(demo);
}

firebase.auth().onAuthStateChanged(u => { if(u) loadAdminDashboard(); else window.location.href="auth.html"; });
