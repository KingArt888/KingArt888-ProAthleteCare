// 1. Константи та межі (Thresholds) для логіки кольорів
const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// Функція для визначення статусу (Колір + Значок)
function getStatusIndicator(type, value) {
    if (value === '-') return '<span style="color: #444;">➖</span>';
    
    const val = parseInt(value);
    let isGood = true;

    // Логіка оцінки: для Сну та Готовності — чим більше, тим краще. 
    // Для Стресу та Болю — чим менше, тим краще.
    if (type === 'sleep') isGood = val >= 7;
    if (type === 'ready') isGood = val >= 7;
    if (type === 'stress') isGood = val <= 4;
    if (type === 'soreness') isGood = val <= 4;

    if (isGood) {
        return `<span title="${val}" style="color: #00ff00; font-size: 1.2em;">●</span>`; // Зелений (Все добре)
    } else {
        return `<span title="${val}" style="color: #ff4d4d; font-size: 1.2em;">●</span>`; // Червоний (Увага)
    }
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
                    photo: data.photoURL || "default-avatar.png",
                    club: data.club || "Без клубу",
                    age: data.age || "?",
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && data.status !== 'closed') {
                athletesMap[uid].activeInjuries++;
            }
        });

        wellnessSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && athletesMap[uid].wellness.sleep === '-') {
                athletesMap[uid].wellness = {
                    sleep: data.scores?.sleep || '-',
                    stress: data.scores?.stress || '-',
                    soreness: data.scores?.soreness || '-',
                    ready: data.scores?.ready || '-'
                };
            }
        });

        let athleteList = Object.values(athletesMap);
        
        // Тестові дані для перевірки обох станів (добрий/поганий)
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://via.placeholder.com/40",
            club: "ProAtletCare Team",
            age: "30",
            activeInjuries: 1,
            wellness: { sleep: 5, stress: 8, soreness: 7, ready: 4 } // Погані показники (будуть червоні)
        });

        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
            const w = athlete.wellness;

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C;">${athlete.name}</div>
                                <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.85em; background: ${isInjured ? 'rgba(255,199,44,0.1)' : 'rgba(0,255,0,0.1)'}; color: ${isInjured ? '#FFC72C' : '#00ff00'};">
                            ${isInjured ? 'Травма ('+athlete.activeInjuries+')' : 'Здоровий 💪'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusIndicator('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusIndicator('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusIndicator('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusIndicator('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="color: #FFC72C; text-decoration: none; font-size: 0.8em; font-weight: bold; border: 1px solid #FFC72C; padding: 4px 8px; border-radius: 4px;">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DA3E52; padding: 20px;">Помилка: ${error.message}</td></tr>`;
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
