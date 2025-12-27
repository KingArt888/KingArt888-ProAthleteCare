// Константи для колекцій
const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    try {
        // 1. Отримуємо дані з усіх необхідних колекцій одночасно
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // 2. Створюємо список атлетів на основі профілів (колекція users)
        usersSnap.forEach(doc => {
            const data = doc.data();
            // Фільтруємо, щоб не показувати адміна в таблиці моніторингу
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || "default-avatar.png",
                    club: data.club || "Без клубу",
                    age: data.age || "?",
                    maxPain: 0,
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // 3. Обробляємо травми
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            
            if (athletesMap[uid]) {
                const history = data.painHistory || data.history || [];
                if (history.length > 0) {
                    const latestEntry = history[history.length - 1];
                    const painVal = parseInt(latestEntry.pain) || 0;
                    
                    if (painVal > athletesMap[uid].maxPain) {
                        athletesMap[uid].maxPain = painVal;
                    }
                    if (data.status !== 'closed') {
                        athletesMap[uid].activeInjuries++;
                    }
                }
            }
        });

        // 4. Додаємо Wellness (беремо лише останній звіт для кожного юзера)
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

        // 5. Формуємо фінальний масив для відображення (ВИПРАВЛЕНО ПОРЯДОК)
        let athleteList = Object.values(athletesMap);

        // Додаємо тестового атлета, щоб ви побачили результат, поки база порожня
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://via.placeholder.com/40",
            club: "ProAtletCare FC",
            age: "30",
            activeInjuries: 1,
            wellness: { sleep: 5, stress: 8, soreness: 4, ready: 4 }
        });

        // 6. Рендер таблиці
        if (athleteList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Атлетів не знайдено.</td></tr>';
            return;
        }

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
                        <span class="status-badge ${isInjured ? 'status-recovering' : 'status-healthy'}">
                            ${isInjured ? 'Травма ('+athlete.activeInjuries+')' : 'Здоровий 💪'}
                        </span>
                    </td>
                    <td>${w.sleep}</td>
                    <td>${w.stress}</td>
                    <td>${w.soreness}</td>
                    <td>${w.ready}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" class="btn-analyze">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        // Ловимо помилки доступу або мережі
        console.error("Помилка завантаження адмінки:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DA3E52; padding: 20px;">Помилка: ${error.message}</td></tr>`;
    }
}

// Запуск при завантаженні сторінки
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        console.log("Адмін авторизований:", user.uid);
        loadGlobalMonitor();
    } else {
        window.location.href = "auth.html";
    }
});
