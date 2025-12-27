const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined || value === null) return '<span style="opacity: 0.2;">➖</span>';
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
                    width: 38px; height: 38px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.2em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    try {
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').limit(50).get()
        ]);

        const athletesMap = {};

        // 1. Завантажуємо реальних атлетів з бази
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

        // 2. ДОДАЄМО 5 ТИМЧАСОВИХ АТЛЕТІВ (DEMO DATA)
        const demoAthletes = {
            "demo_1": { uid: "demo_1", name: "Артем Кулик", club: "Paphos FC", photo: "https://i.pravatar.cc/150?u=1", 
                        injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 9, stress: 2, soreness: 1, ready: 10 } },
            "demo_2": { uid: "demo_2", name: "Іван Петренко", club: "Shakhtar", photo: "https://i.pravatar.cc/150?u=2", 
                        injuryStatus: { label: 'УВАГА', color: '#FFC72C', pain: 4, bodyPart: 'Пах' }, wellness: { sleep: 6, stress: 5, soreness: 6, ready: 5 } },
            "demo_3": { uid: "demo_3", name: "Максим Білий", club: "Dynamo", photo: "https://i.pravatar.cc/150?u=3", 
                        injuryStatus: { label: 'ТРАВМА', color: '#ff4d4d', pain: 8, bodyPart: 'Ахілл' }, wellness: { sleep: 4, stress: 8, soreness: 9, ready: 2 } },
            "demo_4": { uid: "demo_4", name: "Дмитро Вовк", club: "Fit/Box EMS", photo: "https://i.pravatar.cc/150?u=4", 
                        injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 }, wellness: { sleep: 8, stress: 3, soreness: 2, ready: 8 } },
            "demo_5": { uid: "demo_5", name: "Олег Скала", club: "Rugby Paphos", photo: "https://i.pravatar.cc/150?u=5", 
                        injuryStatus: { label: 'ПОКРАЩЕННЯ', color: '#00ff00', pain: 2, bodyPart: 'Коліно' }, wellness: { sleep: 7, stress: 4, soreness: 5, ready: 7 } }
        };
        Object.assign(athletesMap, demoAthletes);

        // 3. Обробка реальних травм з бази
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId] && data.status !== 'closed') {
                const history = data.painHistory || [];
                const lastPain = history.length > 0 ? parseInt(history[history.length - 1].pain) : 0;
                if (lastPain > 0) {
                    athletesMap[data.userId].injuryStatus = { label: 'УВАГА', color: '#FFC72C', pain: lastPain, bodyPart: data.bodyPart || 'Травма' };
                }
            }
        });

        // 4. Обробка реального Wellness
        wellnessSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId] && athletesMap[data.userId].wellness.sleep === '-') {
                athletesMap[data.userId].wellness = {
                    sleep: data.scores?.sleep, stress: data.scores?.stress, 
                    soreness: data.scores?.soreness, ready: data.scores?.ready
                };
            }
        });

        // 5. РЕНДЕР ТАБЛИЦІ
        tbody.innerHTML = Object.values(athletesMap).map(athlete => {
            const stat = athlete.injuryStatus;
            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 12px 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C; font-size: 0.9em;">${athlete.name}</div>
                                <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.7em; padding: 5px; border-radius: 5px; text-align: center; min-width: 100px;
                            background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                            <div style="font-weight: bold; text-transform: uppercase;">${stat.label}</div>
                            ${stat.pain > 0 ? `<div style="font-size: 0.8em; color: #fff; margin-top:2px;">${stat.bodyPart} (${stat.pain})</div>` : ''}
                        </div>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', athlete.wellness.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', athlete.wellness.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', athlete.wellness.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', athlete.wellness.ready)}</td>
                    <td style="text-align: right; padding-right: 10px;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <a href="weekly-individual.html?userId=${athlete.uid}" title="План" 
                               style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 6px 8px; border-radius: 4px; text-decoration: none; font-size: 0.9em;">📅</a>
                            
                            <a href="injury.html?userId=${athlete.uid}" title="Аналіз" 
                               style="background: #FFC72C; color: #000; padding: 6px 8px; border-radius: 4px; text-decoration: none; font-size: 0.9em;">📊</a>
                            
                            <button onclick="openChat('${athlete.uid}', '${athlete.name}')" 
                                    style="background: #111; color: #FFC72C; border: 1px solid #FFC72C; padding: 6px; border-radius: 4px; cursor: pointer;">✉️</button>
                            
                            <button onclick="editProgram('${athlete.uid}', '${athlete.name}')" 
                                    style="background: #000; color: #FFC72C; border: 1px solid #FFC72C; padding: 6px; border-radius: 4px; cursor: pointer;">🏋️</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

firebase.auth().onAuthStateChanged(user => { if (user) loadGlobalMonitor(); else window.location.href = "auth.html"; });
