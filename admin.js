const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// Функція для визначення кольору статусу (Зелений/Червоний)
function getStatusIndicator(type, value) {
    if (value === '-' || value === undefined) return '<span style="color: #444;">○</span>';
    
    const val = parseInt(value);
    let isGood = true;

    // Логіка оцінки: Сон/Готовність (більше = краще), Стрес/Біль (менше = краще)
    if (type === 'sleep' || type === 'ready') isGood = val >= 7;
    if (type === 'stress' || type === 'soreness') isGood = val <= 4;

    return `<span title="Значення: ${val}" style="color: ${isGood ? '#00ff00' : '#ff4d4d'}; font-size: 1.5em; cursor: help;">●</span>`;
}

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Завантаження...</td></tr>';

    try {
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // 1. Створюємо список атлетів
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || "https://ui-avatars.com/api/?name=Athlete&background=FFC72C&color=000",
                    club: data.club || "Без клубу",
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // 2. Рахуємо активні травми
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId] && data.status !== 'closed') {
                athletesMap[data.userId].activeInjuries++;
            }
        });

        // 3. Останній Wellness
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

        // --- ВИПРАВЛЕННЯ REFERENCE ERROR: спочатку створюємо, потім додаємо тест ---
        let athleteList = Object.values(athletesMap);

        // Тестовий атлет для перевірки відображення статусів
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://ui-avatars.com/api/?name=Artem&background=FFC72C&color=000",
            club: "ProAtletCare FC",
            activeInjuries: 1,
            wellness: { sleep: 5, stress: 8, soreness: 2, ready: 4 }
        });

        if (athleteList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Атлетів не знайдено.</td></tr>';
            return;
        }

        // 4. Рендер таблиці
        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${athlete.photo}" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #FFC72C;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C;">${athlete.name}</div>
                                <div style="font-size: 0.75em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 0.8em; padding: 3px 8px; border-radius: 10px; background: ${isInjured ? 'rgba(218,62,82,0.1)' : 'rgba(0,255,0,0.1)'}; color: ${isInjured ? '#DA3E52' : '#00ff00'};">
                            ${isInjured ? 'Травма ('+athlete.activeInjuries+')' : 'Здоровий'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusIndicator('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusIndicator('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusIndicator('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusIndicator('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="color: #FFC72C; text-decoration: none; border: 1px solid #FFC72C; padding: 4px 10px; border-radius: 4px; font-size: 0.8em;">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Критична помилка:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DA3E52; padding: 20px;">Помилка доступу: Перевірте правила Firebase</td></tr>`;
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
