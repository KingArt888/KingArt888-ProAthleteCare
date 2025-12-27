const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// Функція для створення кольорового емодзі
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.3;">➖</span>';
    
    const val = parseInt(value);
    let bgColor = '#00ff00'; // Зелений
    let emoji = '';

    if (type === 'sleep') emoji = '💤';
    if (type === 'stress') emoji = '🧠';
    if (type === 'soreness') emoji = '💪';
    if (type === 'ready') emoji = '⚡';

    // Логіка кольорів: Зелений (добре), Жовтий (середньо), Червоний (погано)
    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) bgColor = '#00ff00';
        else if (val >= 6) bgColor = '#FFC72C';
        else bgColor = '#ff4d4d';
    } else {
        if (val <= 3) bgColor = '#00ff00';
        else if (val <= 6) bgColor = '#FFC72C';
        else bgColor = '#ff4d4d';
    }

    return `
        <div title="Оцінка: ${val}" style="
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            width: 32px; 
            height: 32px; 
            border-radius: 8px; 
            background: ${bgColor}22; 
            border: 1px solid ${bgColor};
            font-size: 1.2em;
            box-shadow: 0 0 8px ${bgColor}44;">
            ${emoji}
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

        // 1. Профілі
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

        // 2. Травми (Тільки якщо біль > 0)
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const history = data.painHistory || data.history || [];
            if (history.length > 0) {
                const lastPain = parseInt(history[history.length - 1].pain) || 0;
                if (athletesMap[data.userId] && data.status !== 'closed' && lastPain > 0) {
                    athletesMap[data.userId].activeInjuries++;
                }
            }
        });

        // 3. Wellness
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

        // 4. Формуємо список (ReferenceError Fix)
        let athleteList = Object.values(athletesMap);

        // Тест-атлет для перевірки
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://ui-avatars.com/api/?name=Artem&background=FFC72C&color=000",
            club: "Admin Test",
            activeInjuries: 1,
            wellness: { sleep: 4, stress: 5, soreness: 2, ready: 9 } 
        });

        if (athleteList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">Атлетів не знайдено.</td></tr>';
            return;
        }

        // 5. Рендер
        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #1a1a1a;">
                    <td style="padding: 15px 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C;">${athlete.name}</div>
                                <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 0.7em; padding: 4px 8px; border-radius: 4px; background: ${isInjured ? '#ff4d4d22' : '#00ff0022'}; color: ${isInjured ? '#ff4d4d' : '#00ff00'}; border: 1px solid ${isInjured ? '#ff4d4d' : '#00ff00'};">
                            ${isInjured ? 'ТРАВМА' : 'ЗДОРОВИЙ'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 6px 12px; border-radius: 4px; font-size: 0.75em; font-weight: bold; text-decoration: none;">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка:", error);
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
