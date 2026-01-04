// admin.js — PRO ATLET CARE: COMMAND CENTER (FINAL OPTIMIZED)
const USERS_COL = 'users';
const INJURY_COL = 'injuries';
const WEIGHT_COL = 'weight_reports';
const PLANS_COL = 'weekly_plans';

/** 1. ТАЙМЕР ОНЛАЙНА **/
function getTimeSince(ts) {
    if (!ts) return '<span style="color:#444">off</span>';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return '<b style="color:#00ff00; text-shadow: 0 0 5px #00ff00;">● Online</b>';
    if (mins < 60) return `${mins}м`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}ч`;
    return Math.floor(diff / 86400000) + 'д';
}

/** 2. КОМПАКТНИЙ WELLNESS **/
function getInteractiveWellness(uid, data) {
    const metrics = [
        { key: 'sleep', icon: '💤', val: data?.sleep, page: 'wellness-stats.html' },
        { key: 'stress', icon: '🧠', val: data?.stress, page: 'wellness-stats.html' },
        { key: 'soreness', icon: '💪', val: data?.soreness, page: 'injury.html' },
        { key: 'ready', icon: '⚡', val: data?.ready, page: 'daily-individual.html' }
    ];

    return `
        <div style="display: flex; gap: 4px; justify-content: center;">
            ${metrics.map(m => {
                let isGood = (m.key === 'sleep' || m.key === 'ready') ? (m.val >= 7) : (m.val <= 4);
                let color = m.val ? (isGood ? '#00ff00' : (m.val >= 8 || m.val <= 3 ? '#ff4d4d' : '#FFC72C')) : '#222';
                return `
                    <a href="${m.page}?userId=${uid}&focus=${m.key}" 
                       title="Аналіз ${m.key}"
                       style="text-decoration:none; display:flex; flex-direction:column; align-items:center; width:34px; height:42px; background:${color}15; border:1px solid ${color}40; border-radius:6px; justify-content:center; transition:0.2s;">
                        <span style="font-size:14px;">${m.icon}</span>
                        <b style="font-size:11px; color:${color}">${m.val || '-'}</b>
                    </a>
                `;
            }).join('')}
        </div>`;
}

/** 3. КОРЕКТУВАННЯ ПЛАНУ **/
async function openAdjustment(uid, name, currentStatus) {
    const statuses = ['MD', 'MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'REST', 'RECOVERY', 'TRAIN'];
    const newStatus = prompt(`Змінити план для ${name}?\nПоточний: ${currentStatus}\nДоступно: ${statuses.join(', ')}`);
    
    if (newStatus && statuses.includes(newStatus.toUpperCase())) {
        const coachNote = prompt("Вказівка атлету:");
        try {
            await db.collection(USERS_COL).doc(uid).update({
                'overrideStatus': newStatus.toUpperCase(),
                'coachNote': coachNote || "",
                'lastAdjustment': Date.now()
            });
            alert(`План змінено!`);
            loadAdminDashboard();
        } catch (e) { alert("Помилка: " + e.message); }
    }
}

/** 4. РЕНДЕР РЯДКА АТЛЕТА **/
async function renderAthleteRow(a, isReal = false) {
    const st = a.injuryStatus || { label: 'HEALTHY', color: '#00ff00', pain: 0 };
    const acwr = parseFloat(a.acwr || 1.00).toFixed(2);
    const acwrColor = (acwr < 0.8 || acwr > 1.3) ? '#ff4d4d' : (acwr >= 1.2 ? '#FFC72C' : '#00ff00');
    const currentStatus = a.overrideStatus || a.currentPlanStatus || 'TRAIN';

    return `
        <tr>
            <td class="sticky-col">
                <div class="athlete-info">
                    <img src="${a.photo}" class="athlete-img" style="border: 2px solid ${isReal && (Date.now()-a.lastSeen < 300000) ? '#00ff00' : '#444'}">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:13px;">${a.name}</div>
                        <div style="font-size:9px; color:#FFC72C;">${currentStatus}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="text-align:center;">
                    <div style="font-weight:bold; color:#fff; font-size:13px;">${a.weight?.val || '-'}kg</div>
                    <div style="font-size:9px; color:${a.weight?.diff < 0 ? '#00ff00' : '#ff4d4d'}">
                        ${a.weight?.diff ? (a.weight.diff > 0 ? '↑' : '↓') + Math.abs(a.weight.diff) : ''}
                    </div>
                </div>
            </td>
            <td><b style="color:${acwrColor}">${acwr}</b></td>
            <td>${getInteractiveWellness(a.uid, a.wellness)}</td>
            <td>
                <div style="padding:4px; border-radius:4px; background:${st.color}15; border:1px solid ${st.color}44; text-align:center;">
                    <b style="font-size:9px; color:${st.color}">${st.label}</b>
                </div>
            </td>
            <td style="text-align:center; font-size:10px;">${isReal ? getTimeSince(a.lastSeen) : '—'}</td>
            <td style="text-align:right;">
                <button onclick="openAdjustment('${a.uid}', '${a.name}', '${currentStatus}')" 
                        style="background:#000; border:1px solid #FFC72C; color:#FFC72C; padding:5px 8px; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold;">
                    PLAN
                </button>
                <a href="weekly-individual.html?userId=${a.uid}" style="padding:5px 8px; font-size:10px; background:#FFC72C; color:#000; text-decoration:none; border-radius:4px; font-weight:bold; margin-left:5px;">STATS</a>
            </td>
        </tr>`;
}

/** 5. ЗАВАНТАЖЕННЯ ДАНИХ **/
async function loadAdminDashboard() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:50px; color:#FFC72C;">LOADING...</td></tr>';

    try {
        const snap = await db.collection(USERS_COL).get();
        let users = [];

        for (const doc of snap.docs) {
            const u = doc.data();
            
            // Спрощене отримання ваги (без зайвих orderBy для уникнення помилок індексів)
            let weightInfo = null;
            try {
                const wSnap = await db.collection(WEIGHT_COL).where("userId", "==", doc.id).limit(5).get();
                if (!wSnap.empty) {
                    const logs = wSnap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp);
                    const cur = logs[0].value;
                    const prev = logs[1] ? logs[1].value : cur;
                    weightInfo = { val: cur, diff: (cur - prev).toFixed(1) };
                }
            } catch(e) { console.warn("Weight error:", e); }

            users.push({
                uid: doc.id,
                name: u.name || u.displayName || u.email || "Unknown",
                photo: u.photoURL || "assets/images/AK_logo.png",
                lastSeen: u.lastSeen || 0,
                wellness: u.lastWellness || {},
                acwr: u.currentACWR || "1.00",
                overrideStatus: u.overrideStatus,
                weight: weightInfo,
                injuryStatus: u.injuryStatus
            });
        }

        users.sort((a, b) => b.lastSeen - a.lastSeen);

        let html = "";
        for (const u of users) html += await renderAthleteRow(u, true);
        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding:20px;">No athletes found.</td></tr>';

    } catch (e) { 
        console.error("Dashboard error:", e); 
        tbody.innerHTML = `<td colspan="7" style="color:red; text-align:center;">Error: ${e.message}</td>`; 
    }
}

// Авторизація
firebase.auth().onAuthStateChanged(user => { 
    if(user) {
        console.log("Admin logged in:", user.uid);
        loadAdminDashboard(); 
    } else {
        window.location.href = "login.html";
    }
});