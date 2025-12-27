const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// Функція для відображення ТЕМАТИЧНИХ кольорових статусів
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.2;">➖</span>';
    
    const val = parseInt(value);
    let color = '#00ff00'; // Зелений за замовчуванням
    let emoji = '';

    if (type === 'sleep') emoji = '💤';
    if (type === 'stress') emoji = '🧠';
    if (type === 'soreness') emoji = '💪';
    if (type === 'ready') emoji = '⚡';

    // Трьохрівнева логіка кольорів
    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) color = '#00ff00';      // Добре
        else if (val >= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    } else {
        if (val <= 3) color = '#00ff00';      // Добре
        else if (val <= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    }

    return `
        <div title="Значення: ${val}" style="
            display: inline-flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            padding: 5px; 
            border-radius: 6px; 
            background: ${color}15; 
            border: 1px solid ${color}44;">
            <span style="font-size: 1.3em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
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

        // 1. Створюємо мапу атлетів
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || "https://ui-avatars.com/api/?name=Athlete&background=FFC72C&color=000",
                    club: data.club || "ProAtletCare",
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // 2. Рахуємо ТРАВМИ (тільки якщо біль > 0)
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const history = data.painHistory || data.history || [];
            if (history.length > 0) {
                const lastEntry = history[history.length - 1];
                const lastPainLevel = parseInt(lastEntry.pain) || 0;
                
                // Якщо статус не 'closed' І біль більше 0 — це активна травма
                if (athletesMap[data.userId] && data.status !== 'closed' && lastPainLevel > 0) {
                    athletesMap[data.userId].activeInjuries++;
                }
            }
        });

        // 3. Додаємо ОСТАННІЙ Wellness
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

        // --- ВИПРАВЛЕННЯ REFERENCE ERROR (image_8079e5.png) ---
        let athleteList = Object.values(athletesMap);

        // Додаємо тестового атлета, щоб перевірити кольори
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://ui-avatars.com/api/?name=Artem&background=FFC72C&color=000",
            club: "Тестовий Клуб",
            activeInjuries: 0, // Здоровий (біль 0)
            wellness: { sleep: 4, stress: 7, soreness: 2, ready: 9 }
        });

        // 4. Рендер таблиці
        if (athleteList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Атлетів не знайдено.</td></tr>';
            return;
        }

        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
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
                        <span style="font-size: 0.8em; padding: 4px 10px; border-radius: 12px; font-weight: bold; 
                            background: ${isInjured ? '#ff4d4d22' : '#00ff0022'}; 
                            color: ${isInjured ? '#ff4d4d' : '#00ff00'}; 
                            border: 1px solid ${isInjured ? '#ff4d4d' : '#00ff00'};">
                            ${isInjured ? 'ТРАВМА' : 'ЗДОРОВИЙ'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="
                            background: #FFC72C; color: #000; text-decoration: none; 
                            padding: 6px 15px; border-radius: 4px; font-weight: bold; font-size: 0.8em;">
                            АНАЛІЗ
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Критична помилка:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ff4d4d; padding: 20px;">Помилка: ${error.message}</td></tr>`;
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
