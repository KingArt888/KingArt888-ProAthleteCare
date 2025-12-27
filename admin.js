// Назви колекцій у Firebase
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness';

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    
    try {
        // 1. Отримуємо всі дані з Firebase одночасно
        const [injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).get()
        ]);

        const athletesMap = {};

        // 2. Обробляємо травми
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            
            if (!athletesMap[uid]) {
                athletesMap[uid] = {
                    id: uid,
                    maxPain: 0,
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', fatigue: '-' }
                };
            }

            // Логіка як у вашому injury.js: перевіряємо останній запис у painHistory
            if (data.painHistory && data.painHistory.length > 0) {
                const latestEntry = data.painHistory[data.painHistory.length - 1];
                const painVal = parseInt(latestEntry.pain) || 0;
                
                if (painVal > athletesMap[uid].maxPain) {
                    athletesMap[uid].maxPain = painVal;
                }
                // Якщо статус не 'closed', вважаємо травму активною
                if (data.status !== 'closed') {
                    athletesMap[uid].activeInjuries++;
                }
            }
        });

        // 3. Додаємо дані Wellness (Сон, Стрес, Втома)
        wellnessSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId]) {
                athletesMap[data.userId].wellness = {
                    sleep: data.sleep || '-',
                    stress: data.stress || '-',
                    fatigue: data.fatigue || '-'
                };
            }
        });

        // 4. Формуємо таблицю
        const athleteList = Object.values(athletesMap);
        
        if (athleteList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">База даних порожня.</td></tr>';
            return;
        }

        tbody.innerHTML = athleteList.map(athlete => {
            const isHealthy = athlete.activeInjuries === 0;
            return `
                <tr>
                    <td><strong style="color: #FFC72C;">Атлет:</strong> ${athlete.id.substring(0, 6)}...</td>
                    <td>
                        <span class="status-badge ${isHealthy ? 'status-healthy' : 'status-recovering'}">
                            ${isHealthy ? 'Здоровий 💪' : 'Відновлення 🩹'}
                        </span>
                    </td>
                    <td style="font-weight: bold; color: ${athlete.maxPain > 4 ? '#DA3E52' : '#fff'}">
                        ${athlete.maxPain} / 10
                    </td>
                    <td class="wellness-info">
                        Сон: <span class="wellness-val">${athlete.wellness.sleep}</span> | 
                        Стрес: <span class="wellness-val">${athlete.wellness.stress}</span> | 
                        Втома: <span class="wellness-val">${athlete.wellness.fatigue}</span>
                    </td>
                    <td>
                        <a href="injury.html?userId=${athlete.id}" class="btn-analyze">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка завантаження адмінки:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #DA3E52;">Помилка Firebase: Перевірте консоль браузера.</td></tr>`;
    }
}

// Запуск при завантаженні
document.addEventListener('DOMContentLoaded', loadGlobalMonitor);
