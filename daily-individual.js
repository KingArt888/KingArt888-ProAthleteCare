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

const dayNamesFull = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день. Максимальна концентрація. Харчування за 3-4 години до матчу.',
    'MD+1': 'Відновлення (Recovery). МФР, легка мобільність. Завдання — прибрати набряки.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока інтенсивність. Фокус на швидкості.',
    'MD-2': 'Силова робота / Технічна підготовка. Акцент на якість рухів.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон 8+ годин та якісне харчування.',
    'TRAIN': 'Стандартне тренування. Дотримуйтесь техніки виконання.'
};

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

// ПОВЕРТАЄМО ФУНКЦІЮ ДЛЯ ВІДЕО ТА ДИЗАЙНУ ВПРАВ
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-${getCurrentDayIndex()}-${index}`;
    let mediaHtml = '';

    if (exercise.videoKey) {
        mediaHtml = `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`;
    } else if (exercise.imageURL) {
        mediaHtml = `<img src="${exercise.imageURL}" alt="${exercise.name}">`;
    } else {
        // Заглушка, якщо відео немає (щоб не пропадали вікна)
        mediaHtml = `<div style="width:300px; height:180px; background:#111; display:flex; align-items:center; justify-content:center; border:1px solid #d4af37; color:#555;">Відео відсутнє</div>`;
    }

    return `
        <div class="daily-exercise-item">
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <div class="exercise-details">
                    <p><strong>Етап:</strong> ${exercise.stage || ''}</p>
                    <p><strong>Категорія:</strong> ${exercise.category || ''}</p>
                    <p>${exercise.desc || 'Опис вправи...'}</p>
                </div>
            </div>
            <div class="media-container">
                ${mediaHtml}
                <div class="completion-section">
                    <label>Виконано:</label>
                    <input type="checkbox" id="${uniqueId}" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.5 : 1">
                </div>
            </div>
        </div>
    `;
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recommendationContainer = document.getElementById('md-recommendations');
    const dateDisplay = document.getElementById('current-date-display');

    const today = new Date();
    if (dateDisplay) dateDisplay.textContent = `(${dayNamesFull[today.getDay()]}, ${today.toLocaleDateString('uk-UA')})`;

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        // 1. Визначаємо статус дня (MD, MD-1 і т.д.)
        let mdStatus = calculateTodayStatus(savedData, todayIndex);
        
        // Перевірка на REST
        if (savedData[`activity_${todayIndex}`] === 'REST') mdStatus = 'REST';

        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        // 2. Виводимо рекомендацію
        if (recommendationContainer) {
            recommendationContainer.innerHTML = `<p><strong>Порада:</strong> ${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p>`;
        }

        // 3. Завантажуємо вправи для цього статусу
        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<div class="note-info">На сьогодні вправ не заплановано в Weekly Plan.</div>';
            return;
        }

        // 4. Генеруємо HTML (з відео)
        let exercisesHtml = '';
        plan.exercises.forEach((ex, idx) => {
            exercisesHtml += createExerciseItemHTML(ex, idx);
        });
        listContainer.innerHTML = exercisesHtml;

    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

function calculateTodayStatus(data, todayIdx) {
    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') matchIndices.push(i);
    }
    
    if (matchIndices.length === 0) return 'TRAIN';
    
    let bestStatus = 'TRAIN';
    let minDiff = Infinity;

    matchIndices.forEach(mIdx => {
        let diff = todayIdx - mIdx;
        if (diff === 0) { bestStatus = 'MD'; minDiff = 0; }
        else if ((diff === 1 || diff === 2) && Math.abs(diff) < Math.abs(minDiff)) {
            minDiff = diff;
            bestStatus = `MD+${diff}`;
        }
        else if (diff >= -4 && diff <= -1 && Math.abs(diff) < Math.abs(minDiff)) {
            minDiff = diff;
            bestStatus = `MD${diff}`;
        }
    });
    
    return bestStatus;
}

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
