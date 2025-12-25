// daily-individual.js — ProAtletCare (FINAL STABLE VERSION)
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
    'MD': 'Сьогодні ігровий день. Максимальна концентрація. Харчування за 3-4 години до матчу. Успіхів на полі!',
    'MD+1': 'Відновлення (Recovery). МФР, легка мобільність. Завдання — прибрати набряки та відновити м’язи.',
    'MD+2': 'Активне відновлення. Робота над мобільністю та легка втягуюча робота.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока інтенсивність. Фокус на швидкості та реакції.',
    'MD-2': 'Силова робота / Технічна підготовка. Акцент на якість рухів та стабільність.',
    'MD-3': 'День максимального навантаження. Висока інтенсивність, робота над витривалістю та силою.',
    'MD-4': 'Втягуюче тренування. Робота над базовими навичками та підготовка до навантажень.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон 8+ годин та якісне харчування — твої головні тренування на сьогодні.',
    'TRAIN': 'Стандартний тренувальний день. Дотримуйтесь техніки виконання вправ.'
};

const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// 1. Функція для акордеонів (розгортання)
function toggleStage(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.stage-arrow');
    
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        if (arrow) arrow.textContent = "▼";
        headerElement.style.borderLeftColor = "#FFD700";
    } else {
        content.style.display = "none";
        if (arrow) arrow.textContent = "▶";
        headerElement.style.borderLeftColor = "#444";
    }
}

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; // Пн=0...Нд=6
}

function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = '';

    if (exercise.videoKey) {
        mediaHtml = `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        mediaHtml = `<div style="width:100%; height:180px; background:#111; display:flex; align-items:center; justify-content:center; border:1px solid #333; color:#444;">Відео в процесі додавання...</div>`;
    }

    return `
        <div class="daily-exercise-item" style="margin-bottom: 15px; border: 1px solid #333; padding: 15px; background: #0a0a0a;">
            <div class="exercise-content">
                <h4 style="color: #d4af37; margin-bottom: 8px; font-size: 1.1rem;">${exercise.name}</h4>
                <p style="font-size: 0.9rem; color: #ccc; margin-bottom: 10px;">${exercise.description || ''}</p>
            </div>
            <div class="media-container" style="margin-top: 10px;">
                ${mediaHtml}
                <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px; color: #fff; background: #1a1a1a; padding: 10px; border-radius: 4px;">
                    <input type="checkbox" id="${uniqueId}" style="width: 20px; height: 20px;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.5 : 1">
                    <label for="${uniqueId}" style="cursor: pointer;">Позначити як виконано</label>
                </div>
            </div>
        </div>
    `;
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const mdxDisplay = document.getElementById('mdx-range-display');
    const recommendationContainer = document.getElementById('md-recommendations');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const mdStatus = calculateTodayStatus(savedData, todayIndex);
        
        // 1. Оновлюємо візуальні статуси
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            statusDisplay.className = `md-status ${style.colorClass}`;
        }
        if (mdxDisplay) mdxDisplay.textContent = mdStatus;

        // 2. ВИВОДИМО РЕКОМЕНДАЦІЇ (ВИПРАВЛЕНО)
        if (recommendationContainer) {
            const recText = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
            recommendationContainer.innerHTML = `
                <div style="border-left: 4px solid #FFD700; padding: 10px 15px; background: #222;">
                    <h4 style="color: #FFD700; margin: 0 0 5px 0; font-size: 0.9rem; text-transform: uppercase;">Порада тренера:</h4>
                    <p style="margin: 0; color: #eee; line-height: 1.4;">${recText}</p>
                </div>
            `;
        }

        // 3. Завантажуємо вправи
        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 30px; border: 1px solid #444; background: #111; color: #888; text-align: center; border-radius: 8px;">
                    <p>На сьогодні (${mdStatus}) тренування не заплановане.</p>
                </div>`;
            return;
        }

        // 4. Генеруємо акордеони (ЗАКРИТІ ЗА ЗАМОВЧУВАННЯМ)
        let finalHtml = '';
        STAGES.forEach(stage => {
            const stageExercises = plan.exercises.filter(ex => ex.stage === stage);
            
            if (stageExercises.length > 0) {
                finalHtml += `
                    <div class="stage-wrapper" style="margin-bottom: 12px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="
                            background: #1a1a1a; color: #d4af37; padding: 15px; 
                            border-left: 4px solid #444; cursor: pointer; 
                            display: flex; justify-content: space-between; align-items: center;
                            font-weight: bold; text-transform: uppercase; font-size: 0.85rem;">
                            <span>${stage.replace('-', ' ')}</span>
                            <span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display: none; padding: 15px 0 5px 0;">
                            ${stageExercises.map((ex, i) => createExerciseItemHTML(ex, `${stage}-${i}`)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        listContainer.innerHTML = finalHtml;

    } catch (e) {
        console.error("Критична помилка DAILY:", e);
    }
}

function calculateTodayStatus(data, todayIdx) {
    if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
    if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';

    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') matchIndices.push(i);
    }
    
    if (matchIndices.length === 0) return 'TRAIN';
    
    let bestStatus = 'TRAIN';
    let minDiff = Infinity;

    matchIndices.forEach(mIdx => {
        let diff = todayIdx - mIdx;
        // Перевірка циклу (включаючи перехід через тиждень)
        for (let offset of [-7, 0, 7]) {
            let currentDiff = todayIdx - (mIdx + offset);
            if (currentDiff === 1 || currentDiff === 2) {
                if (Math.abs(currentDiff) < Math.abs(minDiff)) { minDiff = currentDiff; bestStatus = `MD+${currentDiff}`; }
            } else if (currentDiff >= -4 && currentDiff <= -1) {
                if (Math.abs(currentDiff) < Math.abs(minDiff)) { minDiff = currentDiff; bestStatus = `MD${currentDiff}`; }
            }
        }
    });
    
    return bestStatus;
}

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
