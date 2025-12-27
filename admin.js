// 1. Константи колекцій
const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    // Показуємо статус завантаження
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Завантаження даних атлетів...</td></tr>';

    try {
        // 2. Отримуємо дані з Firebase
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // 3. Формуємо мапу атлетів
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

        // 4. Додаємо дані травм
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && data.status !== 'closed') {
                athletesMap[uid].activeInjuries++;
            }
        });

        // 5. Додаємо дані Wellness
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

        // 6. Створюємо список та додаємо ТЕСТОВОГО атлета (щоб уникнути порожньої таблиці)
        let athleteList = Object.values(athletesMap);
        
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://via.placeholder.com/40",
            club: "ProAtletCare Team",
            age: "30",
            activeInjuries: 1,
            wellness: { sleep: 8, stress: 2, soreness: 3, ready: 9 }
        });

        // 7. Рендер таблиці
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
                                <div style="font-size: 0.7em; color: #888;">${athlete.club} • ${athlete.age} р.</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.85em; background: ${isInjured ? 'rgba(255,199,44,0.1)' : 'rgba(0,255,0,0.1)'}; color: ${isInjured ? '#FFC72C' : '#00ff00'};">
                            ${isInjured ? 'Травма ('+athlete.activeInjuries+')' : 'Здоровий 💪'}
                        </span>
                    </td>
                    <td style="text-align: center;">${w.sleep}</td>
                    <td style="text-align: center;">${w.stress}</td>
                    <td style="text-align: center;">${w.soreness}</td>
                    <td style="text-align: center;">${w.ready}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" class="btn-analyze" style="color: #FFC72C; text-decoration: none; font-weight: bold; border: 1px solid #FFC72C; padding: 5px 10px; border-radius: 4px;">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка завантаження адмінки:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DA3E52; padding: 20px;">Помилка: ${error.message}</td></tr>`;
    }
}

// Запуск при завантаженні
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadGlobalMonitor();
    } else {
        window.location.href = "auth.html";
    }
});
