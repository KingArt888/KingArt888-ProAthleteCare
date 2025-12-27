// Константи колекцій
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness';

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    
    try {
        // 1. Отримуємо всі дані з Firebase
        const [injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).get()
        ]);

        const athletesMap = {};

        // 2. Групуємо травми по користувачам
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

            // Шукаємо найвищий біль серед усіх травм атлета
            if (data.history && data.history.length > 0) {
                const latestEntry = data.history[data.history.length - 1];
                const painLevel = parseInt(latestEntry.pain) || 0;
                
                if (painLevel > athletesMap[uid].maxPain) {
                    athletesMap[uid].maxPain = painLevel;
                }
                if (painLevel > 0) {
                    athletesMap[uid].activeInjuries++;
                }
            }
        });

        // 3. Додаємо дані Wellness
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

        // 4. Генерація HTML
        const rows = Object.values(athletesMap).map(athlete => {
            const statusClass = athlete.activeInjuries > 0 ? 'status-recovering' : 'status-healthy';
            const statusText = athlete.activeInjuries > 0 ? `Відновлення (${athlete.activeInjuries})` : 'Здоровий';
            
            // Підсвітка критичних значень
            const sleepClass = (athlete.wellness.sleep < 3 && athlete.wellness.sleep !== '-') ? 'critical' : '';
            const stressClass = (athlete.wellness.stress > 4) ? 'critical' : '';

            return `
                <tr>
                    <td><strong style="color: #FFC72C;">ID:</strong> ${athlete.id.substring(0, 8)}...</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="font-weight: bold; color: ${athlete.maxPain > 4 ? '#DA3E52' : '#fff'}">
                        ${athlete.maxPain} / 10
                    </td>
                    <td>
                        <div class="wellness-cell">
                            <div class="wellness-item">
                                <span class="wellness-label">Сон</span>
                                <span class="${sleepClass}">${athlete.wellness.sleep}</span>
                            </div>
                            <div class="wellness-item">
                                <span class="wellness-label">Стрес</span>
                                <span class="${stressClass}">${athlete.wellness.stress}</span>
                            </div>
                            <div class="wellness-item">
                                <span class="wellness-label">Втома</span>
                                <span>${athlete.wellness.fatigue}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <a href="injury.html?userId=${athlete.id}" class="btn-analyze">АНАЛІЗ</a>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows || '<tr><td colspan="5" style="text-align: center;">Атлетів не знайдено</td></tr>';

    } catch (error) {
        console.error("Помилка завантаження адмінки:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #DA3E52;">Помилка доступу до бази: ${error.message}</td></tr>`;
    }
}

// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', loadGlobalMonitor);
