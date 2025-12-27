const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// Функція для створення кольорового значка
function getStatusIcon(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.2;">➖</span>';
    
    const val = parseInt(value);
    let color = '#00ff00'; // Зелений (Добре)
    let icon = '';

    // Призначаємо іконку залежно від типу
    if (type === 'sleep') icon = '💤';
    if (type === 'stress') icon = '🧠';
    if (type === 'soreness') icon = '💪';
    if (type === 'ready') icon = '⚡';

    // Логіка кольорів: Зелений / Жовтий / Червоний
    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) color = '#00ff00';      // Супер
        else if (val >= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    } else {
        // Для Стресу та Болю навпаки: чим менше, тим краще
        if (val <= 3) color = '#00ff00';      // Супер
        else if (val <= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    }

    return `
        <div title="Значення: ${val}" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="font-size: 1.2em;">${icon}</span>
            <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; box-shadow: 0 0 5px ${color};"></div>
        </div>
    `;
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
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "ProAtletCare",
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        injuriesSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId] && data.status !== 'closed') {
                athletesMap[data.userId].activeInjuries++;
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

        // ТЕСТОВИЙ АТЛЕТ (для перевірки всіх кольорів)
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://ui-avatars.com/api/?name=Artem&background=FFC72C&color=000",
            club: "Admin Test",
            activeInjuries: 1,
            wellness: { sleep: 4, stress: 5, soreness: 2, ready: 9 } 
            // Сон: Червоний, Стрес: Жовтий, Біль: Зелений, Готовність: Зелений
        });

        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 15px 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C; font-size: 0.9em;">${athlete.name}</div>
                                <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 0.75em; padding: 4px 8px; border-radius: 12px; background: ${isInjured ? 'rgba(255,77,77,0.1)' : 'rgba(0,255,0,0.1)'}; color: ${isInjured ? '#ff4d4d' : '#00ff00'}; border: 1px solid ${isInjured ? '#ff4d4d' : '#00ff00'};">
                            ${isInjured ? 'ТРАВМА' : 'OK'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusIcon('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusIcon('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusIcon('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusIcon('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="color: #000; background: #FFC72C; text-decoration: none; font-size: 0.75em; font-weight: bold; padding: 6px 12px; border-radius: 4px; text-transform: uppercase;">Аналіз</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ff4d4d; padding: 20px;">Помилка завантаження: ${error.message}</td></tr>`;
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
