// daily-individual.js

const DAILY_STORAGE_KEY = 'weeklyPlanData'; // ЗМІНЕНО назву змінної
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

// ===================== COLORS =====================


const dayNamesFull = [
    'Неділя','Понеділок','Вівторок','Середа',
    'Четвер','Пʼятниця','Субота'
];

// ===================== RECOMMENDATIONS =====================
const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день...',
    'MD+1': 'Високе навантаження!',
    'MD+2': 'Середнє навантаження.',
    'MD-1': 'День перед матчем.',
    'MD-2': 'Глибоке відновлення.',
    'MD-3': 'Активний відпочинок.',
    'MD-4': 'Базове тренування.',
    'REST': 'Повний відпочинок.',
    'TRAIN': 'Стандартний тренувальний день.'
};

// ===================== HELPERS =====================
function getCurrentDayIndex() {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
}

function normalizeStage(stage) {
    if (!stage) return 'UNSORTED';
    return stage
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^pre-training$/, 'Pre-training')
        .replace(/^main-training$/, 'Main-training')
        .replace(/^post-training$/, 'Post-training');
}

// ===================== COLLAPSIBLE LOGIC (🔥 ВАЖЛИВО) =====================
function initializeCollapsibles() {
    const headers = document.querySelectorAll('.stage-header.collapsible');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (!content) return;

            const icon = header.querySelector('.toggle-icon');
            const isOpen = content.classList.contains('active');

            content.classList.toggle('active');
            header.classList.toggle('active');

            if (icon) {
                icon.textContent = isOpen ? '►' : '▼';
            }
        });
    });
}

// ===================== EXERCISE ITEM =====================
function createExerciseItemHTML(exercise, index) {
    const todayIndex = getCurrentDayIndex();
    const id = `ex-${todayIndex}-${index}`;
    const checked = localStorage.getItem(id) === 'true' ? 'checked' : '';

    let media = '';
    if (exercise.imageURL) {
        media += `<img src="${exercise.imageURL}" alt="${exercise.name}">`;
    }
    if (exercise.videoKey) {
        media += `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" allowfullscreen></iframe>`;
    }

    return `
        <div class="daily-exercise-item" data-exercise-id="${id}">
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <p>${exercise.description || ''}</p>
            </div>
            <div class="media-container">
                ${media}
                <label>
                    <input type="checkbox" ${checked}
                        onchange="localStorage.setItem('${id}', this.checked)">
                    Виконано
                </label>
            </div>
        </div>
    `;
}

// ===================== MAIN LOAD =====================
function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const planKey = `day_plan_${todayIndex}`;

    const list = document.getElementById('daily-exercise-list');
    if (!list) return;

    // ЗМІНЕНО: Використовує DAILY_STORAGE_KEY
    const savedData = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) || '{}');
    const todayPlan = savedData[planKey];

    if (!todayPlan || !todayPlan.exercises?.length) {
        list.innerHTML = `<p>На сьогодні немає вправ.</p>`;
        return;
    }

    // === GROUP BY STAGE ===
    const grouped = {};
    todayPlan.exercises.forEach((ex, i) => {
        const stage = normalizeStage(ex.stage);
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push({ ...ex, originalIndex: i });
    });

    const order = ['Pre-training','Main-training','Post-training','Recovery','UNSORTED'];
    const stages = Object.keys(grouped).sort((a,b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });

    let html = '';
    let idx = 1;

    stages.forEach(stage => {
        html += `
            <div class="training-section">
                <h3 class="stage-header collapsible">
                    ${idx++}. ${stage.replace('-', ' ').toUpperCase()}
                    <span class="toggle-icon">►</span>
                </h3>
                <div class="section-content">
                    ${grouped[stage].map(e =>
                        createExerciseItemHTML(e, e.originalIndex)
                    ).join('')}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    initializeCollapsibles();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayDailyPlan();
});
