// admin.js — Головна панель ProAtletCare (ACWR + Wellness + Weight)
const USERS_COL = 'users';
const WEIGHT_COL = 'weight_history';
const LOAD_COL = 'load_season_reports';

// 1. Створення міні-спідометра (SVG)
function createMiniGauge(value, color) {
    const val = parseFloat(value) || 0;
    const percent = Math.min(Math.max(val / 2, 0), 1);
    const rotation = -90 + (percent * 180);

    return `
        <div style="position: relative; width: 60px; height: 35px; margin: 0 auto;">
            <svg viewBox="0 0 100 50" style="width: 100%; height: 100%;">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#222" stroke-width="10" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="10" 
                      stroke-dasharray="${percent * 126}, 126" />
                <line x1="50" y1="50" x2="50" y2="15" stroke="#fff" stroke-width="3" 
                      style="transform-origin: 50px 50px; transform: rotate(${rotation}deg); transition: 0.8s ease-out;" />
            </svg>
            <div style="font-size: 11px; font-weight: bold; color: ${color}; margin-top: -2px;">${value}</div>
        </div>
    `;
}

// 2. Кольорові статуси Wellness
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
        <div style="display: inline-flex; align-items: center; justify-content: center; 
                    width: 34px; height: 34px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.1em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

// 3. Розрахунок метрик ACWR (твоя логіка)
async function getAthleteLoadMetrics(uid, demoData = null) {
    try {
        let data = demoData;
        if (!data) {
            const snapshot = await db.collection(LOAD_COL).where("userId", "==", uid).get();
            if (snapshot.empty) return { acwr: '1.0', status: 'НОРМА', color: '#666' };
            data = snapshot.docs.map(d => d.data());
        }
        
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(data[data.length - 1].date);
        
        const getLoad = (days) => {
            const startDate = new Date(lastDate);
            startDate.setDate(lastDate.getDate() - days);
            const periodData = data.filter(d => new Date(d.date) > startDate);
            const total = periodData.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe || 0)), 0);
            return total / (days / 7);
        };

        const acute = getLoad(7);
        const chronic = getLoad(28);
        const acwr = (chronic > 0) ? (acute / chronic) : 1.0;

        let status = 'ОПТИМАЛЬНО';
        let color = '#00ff00';
        if (acwr > 1.5) { status = 'РИЗИК'; color = '#ff4d4d'; }
        else if (acwr > 1.3) { status = 'УВАГА'; color = '#FFC72C'; }
        else if (acwr < 0.8) { status = 'НЕДОТРЕН.'; color = '#888'; }

        return { acwr: acwr.toFixed(2), status, color };
    } catch (e) { return { acwr: '1.0', status: '-', color: '#333' }; }
}

// 4. Малювання таблиці
async function renderAdminTable(athletesMap) {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    let rows = "";
    for (const athlete of Object.values(athletesMap)) {
        const load = await getAthleteLoadMetrics(athlete.uid, athlete.demoLoad);
        const stat = athlete.injuryStatus || { label: 'ЗДОРОВИЙ', color: '#00ff00' };
        
        rows += `
            <tr style="border-bottom: 1px solid #1a1a1a;">
                <td style="padding-left: 25px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                        <div>
                            <div style="font-weight: bold; color: #FFC72C; font-size: 0.95em;">${athlete.name}</div>
                            <div style="font-size: 0.7em; color: #666;">${athlete.club}</div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <div style="font-size: 0.65em; padding: 4px 8px; border-radius: 4px; background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44; font-weight: bold; text-transform: uppercase;">
                        ${stat.label}
                    </div>
                </td>
                <td style="text-align: center; width: 110px;">
                    ${createMiniGauge(load.acwr, load.color)}
                    <div style="font-size: 0.6em; color: #555; text-transform: uppercase; margin-top: 2px;">${load.status}</div>
                </td>
                <td class="wellness-col">${getStatusEmoji('sleep', athlete.wellness?.sleep)}</td>
                <td class="wellness-col">${getStatusEmoji('stress', athlete.wellness?.stress)}</td>
                <td class="wellness-col">${getStatusEmoji('soreness', athlete.wellness?.soreness)}</td>
                <td class="wellness-col">${getStatusEmoji('ready', athlete.wellness?.ready)}</td>
                <td style="text-align: right; padding-right: 25px;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <a href="weekly-individual.html?userId=${athlete.uid}" class="btn-action" style="background: transparent; color: #FFC72C; border: 1px solid #FFC72C; padding: 6px 10px;">📅</a>
                        <a href="injury.html?userId=${athlete.uid}" class="btn-action" style="padding: 6px 10px;">📊</a>
                    </div>
                </td>
            </tr>`;
    }
    tbody.innerHTML = rows;
}

// 5. Завантаження даних + Демо
async function loadAdminDashboard() {
    // 10 Демо-атлетів
    const demo = {};
    for(let i=1; i<=10; i++) {
        demo[`d${i}`] = {
            uid: `d${i}`,
            name: ["Артем Кулик", "Максим Регбі", "Дмитро Сила", "Іван Бокс", "Олег Швидкість", "Сергій Атлет", "Андрій Крос", "Микола ММА", "Віктор Тренер", "Олександр Р"][i-1],
            club: i%2==0 ? "ProAtletCare" : "Paphos FC",
            photo: `https://i.pravatar.cc/150?u=${i+20}`,
            injuryStatus: i==3 ? {label:'ТРАВМА', color:'#ff4d4d'} : (i==2 ? {label:'УВАГА', color:'#FFC72C'} : {label:'ЗДОРОВИЙ', color:'#00ff00'}),
            wellness: { sleep: 8, stress: 2, soreness: 3, ready: 9 },
            demoLoad: [
                {date: '2025-12-01', duration: 60, rpe: 7},
                {date: '2025-12-28', duration: 90, rpe: i==2 ? 9 : 6} // Імітація навантаження
            ]
        };
    }

    renderAdminTable(demo);

    try {
        const usersSnap = await db.collection(USERS_COL).get();
        const real = {};
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (data.role === 'admin') continue;
            real[doc.id] = {
                uid: doc.id,
                name: data.name || "Атлет",
                photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                club: data.club || "Клуб",
                wellness: data.lastWellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' }
            };
        }
        if (Object.keys(real).length > 0) renderAdminTable({...demo, ...real});
    } catch (e) { console.warn(e); }
}

firebase.auth().onAuthStateChanged(user => {
    if (user) loadAdminDashboard();
    else window.location.href = "auth.html";
});
