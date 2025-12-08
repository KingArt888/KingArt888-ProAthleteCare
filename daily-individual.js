document.addEventListener('DOMContentLoaded', () => {
    // Константи для ProAthleteCare
    const STORAGE_KEY = 'weeklyPlanData';
    // Назви днів, починаючи з Понеділка (індекс 0)
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
    
    // Мапа кольорів та описів (використовується для статусу)
    const COLOR_MAP = {
        'MD': { status: 'MD (Матч)', colorClass: 'color-red' },
        'MD+1': { status: 'MD+1 (Легке Відновлення)', colorClass: 'color-dark-green' }, 
        'MD+2': { status: 'MD+2 (Відновлення)', colorClass: 'color-green' }, 
        'MD-1': { status: 'MD-1 (Передматчева Активація)', colorClass: 'color-yellow' }, 
        'MD-2': { status: 'MD-2 (Спеціальна Витривалість)', colorClass: 'color-deep-green' }, 
        'MD-3': { status: 'MD-3 (Швидкість/Кор)', colorClass: 'color-orange' }, 
        'MD-4': { status: 'MD-4 (MAX Сила)', colorClass: 'color-blue' }, 
        'REST': { status: 'Відпочинок', colorClass: 'color-neutral' }, 
        'TRAIN': { status: 'Тренування (Загальна)', colorClass: 'color-dark-grey' }, 
    };

    const container = document.getElementById('daily-plan-view');
    if (!container) return; 

    // --- 1. Визначення сьогоднішнього дня (0 = ПН, 6 = НД) ---
    let todayIndex = new Date().getDay();
    // Коригуємо індекс: НД (0) -> 6, ПН (1) -> 0, ...
    todayIndex = (todayIndex === 0) ? 6 : todayIndex - 1; 

    const savedData = localStorage.getItem(STORAGE_KEY);
    let planData = savedData ? JSON.parse(savedData) : {};

    const dayName = dayNames[todayIndex];
    const taskKey = `daily_task_${todayIndex}`;
    const activityKey = `activity_${todayIndex}`;
    
    let dailyTaskContent = planData[taskKey] || '';
    let activityType = planData[activityKey] || 'TRAIN';
    let isPlanActive = Object.keys(planData).length > 0;

    // --- 2. Обробка відсутності даних ---
    if (!isPlanActive || dailyTaskContent === '' || dailyTaskContent.includes('Оберіть МАТЧ для активації')) {
        container.innerHTML = `
            <div class="daily-card error-card">
                <h3 class="gold-text">⚠️ План на сьогодні не встановлено</h3>
                <p>Не вдалося завантажити індивідуальний протокол на ${dayName}. Будь ласка, перевірте, чи був збережений тижневий план у розділі 
                <a href="weekly-individual.html" class="gold-link">Weekly Individual</a>.</p>
            </div>
        `;
        return;
    }

    // --- 3. Визначення статусу MD для відображення ---
    // Витягуємо статус з вмісту, оскільки це найнадійніше джерело фази
    const statusMatch = dailyTaskContent.match(/\*\*Фаза: (MD[+-]?\d?|MD|REST|TRAIN)\*\*/);
    let statusText = statusMatch ? statusMatch[1] : (activityType === 'MATCH' ? 'MD' : 'TRAIN');
    const statusStyle = COLOR_MAP[statusText] || COLOR_MAP['TRAIN'];
    
    // --- 4. Генерація HTML контенту ---
    
    // Відео для тесту/інструкції
    const videoEmbed = `
        <div class="video-placeholder">
            <h4 class="gold-text">🎥 ВІДЕО-ІНСТРУКЦІЯ НА ДЕНЬ</h4>
            <a href="https://youtube.com/your-test-video-link" target="_blank" class="gold-button">
                ПЕРЕГЛЯНУТИ ВІДЕО: МЕТА ФАЗИ ${statusText}
            </a>
            <p class="small-text">Цільове відео, що пояснює філософію та акценти тренування, розробленого Куликом Артемом.</p>
        </div>
    `;

    // Деталі матчу (якщо це MD)
    let matchDetailsHTML = '';
    if (activityType === 'MATCH') {
        matchDetailsHTML = `
            <div class="match-info-box">
                <h4 class="gold-text">🏆 Деталі матчу:</h4>
                <p><strong>Суперник:</strong> ${planData[`opponent_${todayIndex}`] || 'Не вказано'}</p>
                <p><strong>Місце:</strong> ${planData[`venue_${todayIndex}`] || '—'}</p>
                <p><strong>Поїздка:</strong> ${planData[`travel_km_${todayIndex}`] || '0'} км</p>
            </div>
        `;
    }
    
    const outputHTML = `
        <div class="daily-card">
            <p class="day-of-week"><span class="gold-text">Поточний день:</span> ${dayName}</p>
            <div class="status-indicator">
                <span class="md-status-label ${statusStyle.colorClass}">${statusStyle.status}</span>
            </div>
        </div>

        ${videoEmbed}

        <div class="tasks-card">
            <h3 class="gold-text">📝 Детальний Протокол Дня:</h3>
            ${matchDetailsHTML}
            <pre class="tasks-box">${dailyTaskContent}</pre>
        </div>
    `;

    container.innerHTML = outputHTML;
});
