const INJURY_COLLECTION = 'injuries';
const WELLNESS_COLLECTION = 'wellness'; // Передбачаємо наявність такої колекції

async function loadGlobalMonitor() {
    const tbody = document.getElementById('monitor-tbody');
    if (!tbody) return;

    try {
        // 1. Отримуємо всі травми всіх користувачів
        const injuriesSnapshot = await db.collection(INJURY_COLLECTION).get();
        const wellnessSnapshot = await db.collection(WELLNESS_COLLECTION).get();

        const usersData = {};

        // Обробка травм
        injuriesSnapshot.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            
            if (!usersData[uid]) {
                usersData[uid] = { uid, maxPain: 0, activeInjuries: 0, lastUpdate: '-', wellness: null };
            }

            if (data.history && data.history.length > 0) {
                const lastEntry = data.history[data.history.length - 1];
                if (parseInt(lastEntry.pain) > usersData[uid].maxPain) {
                    usersData[uid].maxPain = parseInt(lastEntry.pain);
                }
                if (parseInt(lastEntry.pain) > 0) {
                    usersData[uid].activeInjuries++;
                }
                usersData[uid].lastUpdate = lastEntry.date;
            }
        });

        // Обробка Wellness (якщо є дані)
        wellnessSnapshot.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (usersData[uid]) {
                usersData[uid].wellness = data; // Беремо останній запис wellness
            }
        });

        // 2. Рендеринг таблиці
        tbody.innerHTML = Object.values(usersData).map(user => {
            const statusClass = user.activeInjuries > 0 ? 'recovering' : 'healthy';
            const statusText = user.activeInjuries > 0 ? `Відновлення (${user.activeInjuries})` : 'Здоровий';
            
            // Wellness індикатори (S/S/F - Sleep/Stress/Fatigue)
            let wellnessHtml = '<span style="color:#555;">Немає даних</span>';
            if (user.wellness) {
                const sColor = user.wellness.sleep < 3 ? 'wellness-low' : 'wellness-good';
                const stColor = user.wellness.stress > 3 ? 'wellness-low' : 'wellness-good';
                wellnessHtml = `
                    <span class="${sColor}" title="Сон">${user.wellness.sleep}</span> / 
                    <span class="${stColor}" title="Стрес">${user.wellness.stress}</span> / 
                    <span>${user.wellness.fatigue || 0}</span>
                `;
            }

            return `
                <tr>
                    <td><strong style="color:gold;">ID: ${user.uid.substring(0, 6)}...</strong></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="color: ${user.maxPain > 4 ? '#DA3E52' : '#fff'}; font-weight:bold;">
                        ${user.maxPain} / 10
                    </td>
                    <td>${wellnessHtml}</td>
                    <td style="font-size: 0.85em; color: #888;">${user.lastUpdate}</td>
                    <td>
                        <button class="btn-detail" onclick="window.location.href='injury.html?userId=${user.uid}'">АНАЛІЗ</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error("Помилка завантаження адмінки:", e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Помилка доступу до даних</td></tr>`;
    }
}

// Запуск при завантаженні
document.addEventListener('DOMContentLoaded', loadGlobalMonitor);
