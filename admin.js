// Константи для колекцій (згідно з вашою структурою)
const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports'; // назва з вашого останнього скрипта

// Межі "тривоги" (Thresholds)
const ALERTS = {
    sleep: { min: 6 },
    stress: { max: 7 },
    soreness: { max: 7 },
    ready: { min: 5 }
};

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    try {
        // 1. Отримуємо дані з усіх необхідних колекцій
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // 2. Створюємо список атлетів на основі профілів
        usersSnap.forEach(doc => {
            const data = doc.data();
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

        // 3. Обробляємо травми (максимальний біль та кількість активних)
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

        // 4. Додаємо Wellness (тільки останній звіт для кожного)
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

        // 5. Функція для перевірки на "червону зону"
        const getAlertClass = (field, value) => {
            if (value === '-') return '';
            const val = parseInt(value);
            const rule = ALERTS[field];
            if (!rule) return '';
            if (rule.min && val < rule.min) return 'critical-cell';
            if (rule.max && val > rule.max) return 'critical-cell';
            return '';
        };

        // 6. Формуємо HTML таблиці
        const athleteList = Object.values(athletesMap);
        
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
                    <td class="${getAlertClass('sleep', w.sleep)}">${w.sleep}</td>
                    <td class="${getAlertClass('stress', w.stress)}">${w.stress}</td>
                    <td class="${getAlertClass('soreness', w.soreness)}">${w.soreness}</td>
                    <td class="${getAlertClass('ready', w.ready)}">${w.ready}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" class="btn-analyze">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка завантаження адмінки:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DA3E52;">Помилка: ${error.message}</td></tr>`;
    }
}

// Запуск із перевіркою авторизації
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Тут можна додати перевірку на роль admin, як ми обговорювали раніше
        loadGlobalMonitor();
    } else {
        window.location.href = "auth.html";
    }
});
