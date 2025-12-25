// daily-individual.js — ProAtletCare
const STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

// Твої професійні рекомендації
const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день. Максимальна концентрація. Харчування за 3-4 години до матчу.',
    'MD+1': 'Відновлення (Recovery). МФР, легка мобільність. Завдання — прибрати набряки та відновити м’язи.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока інтенсивність. Фокус на швидкості та реакції.',
    'MD-2': 'Силова робота / Технічна підготовка. Акцент на якість рухів та стабільність.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон 8+ годин, якісне харчування — твої головні тренування на сьогодні.',
    'TRAIN': 'Стандартний тренувальний день. Дотримуйтесь техніки виконання вправ.'
};

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; // Перетворюємо Пн=0, Нд=6
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recommendationContainer = document.getElementById('md-recommendations');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        // Визначаємо статус сьогоднішнього дня (беремо з селектів Weekly Individual)
        let mdStatus = 'TRAIN';
        const activityKey = `activity_${todayIndex}`;
        
        // Логіка визначення статусу як у календарі
        if (savedData[activityKey] === 'REST') {
            mdStatus = 'REST';
        } else if (savedData[activityKey] === 'MATCH') {
            mdStatus = 'MD';
        } else {
            // Тут можна додати автоматичний розрахунок MD-1, MD-2 як у weekly.js
            // Для спрощення зараз беремо статус, який зберігся в системі
            mdStatus = calculateTodayStatus(savedData, todayIndex);
        }

        // Оновлюємо колір та текст статусу
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        statusDisplay.textContent = mdStatus;
        statusDisplay.className = `md-status ${style.colorClass}`;

        // Відображаємо рекомендацію
        recommendationContainer.innerHTML = `<p><strong>Порада тренера:</strong> ${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p>`;

        // Завантажуємо вправи, закріплені за цим статусом (ті, що ти додавав у модалці)
        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<div class="note-info">На сьогодні вправ не заплановано. Відпочивайте або зверніться до тижневого плану.</div>';
            return;
        }

        // Генеруємо список вправ
        let html = '';
        plan.exercises.forEach((ex, idx) => {
            html += `
                <div class="daily-exercise-item">
                    <div class="exercise-content">
                        <h4>${ex.name}</h4>
                        <p style="color: #d4af37; font-weight: bold;">${ex.stage} | ${ex.category || ''}</p>
                        <p>${ex.desc || 'Опис вправи в бібліотеці...'}</p>
                    </div>
                    <div class="completion-section">
                        <input type="checkbox" id="ex-${idx}" onchange="this.parentElement.parentElement.style.opacity = this.checked ? '0.5' : '1'">
                        <label for="ex-${idx}">Виконано</label>
                    </div>
                </div>`;
        });
        listContainer.innerHTML = html;

    } catch (e) {
        console.error("Помилка:", e);
    }
}

// Допоміжна функція для визначення статусу дня
function calculateTodayStatus(data, todayIdx) {
    // Шукаємо найближчий матч у даних
    let matchIdx = -1;
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') {
            matchIdx = i;
            break;
        }
    }
    
    if (matchIdx === -1) return 'TRAIN';
    
    const diff = todayIdx - matchIdx;
    if (diff === 0) return 'MD';
    if (diff > 0 && diff <= 2) return `MD+${diff}`;
    if (diff < 0 && diff >= -4) return `MD${diff}`;
    
    return 'TRAIN';
}

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
