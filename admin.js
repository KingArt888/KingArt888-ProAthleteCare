const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

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
    return `<div style="display: inline-flex; flex-direction: column; align-items: center; padding: 5px; border-radius: 6px; background: ${color}15; border: 1px solid ${color}44;"><span style="font-size: 1.3em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span></div>`;
}

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

        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || "https://ui-avatars.com/api/?name=Athlete&background=FFC72C&color=000",
                    club: data.club || "ProAtletCare",
                    injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // ЛОГІКА ДИНАМІКИ БОЛЮ
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && data.status !== 'closed') {
                const history = data.painHistory || data.history || [];
                if (history.length > 0) {
                    const lastPain = parseInt(history[history.length - 1].pain) || 0;
                    
                    if (lastPain === 0) {
                        athletesMap[uid].injuryStatus = { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
                    } else {
                        // Якщо є попередній запис, порівнюємо
                        let trend = 'СТАБІЛЬНО';
                        let trendColor = '#FFC72C'; // Жовтий

                        if (history.length > 1) {
                            const prevPain = parseInt(history[history.length - 2].pain) || 0;
                            if (lastPain < prevPain) {
                                trend = 'ПОКРАЩЕННЯ 📈';
                                trendColor = '#00ff00'; // Зелений
                            } else if (lastPain > prevPain) {
                                trend = 'ПОГІРШЕННЯ 📉';
                                trendColor = '#ff4d4d'; // Червоний
                            }
                        } else {
                            trend = 'НОВА ТРАВМА';
                            trendColor = '#ff4d4d';
                        }
                        
                        athletesMap[uid].injuryStatus = { 
                            label: trend, 
                            color: trendColor, 
                            pain: lastPain 
                        };
                    }
                }
            }
        });

        wellnessSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && athletesMap[uid].wellness.sleep === '-') {
                athletesMap[uid].wellness = {
                    sleep: data.scores?.sleep,
                    stress: data.scores?.stress,
                    soreness: data.scores?.soreness,
                    ready: data.scores?.ready
                };
            }
        });

        let athleteList = Object.values(athletesMap);

        tbody.innerHTML = athleteList.map(athlete => {
            const stat = athlete.injuryStatus;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C;">${athlete.name}</div>
                                <div style="font-size: 0.75em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.7em; padding: 4px 8px; border-radius: 4px; text-align: center;
                            background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                            <div style="font-weight: bold;">${stat.label}</div>
                            ${stat.pain > 0 ? `<div style="font-size: 0.9em;">Біль: ${stat.pain}</div>` : ''}
                        </div>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 0.75em; text-decoration: none;">ДЕТАЛІ</a>
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
