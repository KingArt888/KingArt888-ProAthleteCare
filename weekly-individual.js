// weekly-individual.js — ProAtletCare (FIXED DYNAMIC CYCLE & STORAGE)
const GLOBAL_TEMPLATE_KEY = 'pro_global_templates';
const INDIVIDUAL_OVERRIDE_KEY = 'pro_individual_overrides';

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

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

let currentExerciseContext = null; 
let selectedExercises = []; 

// --- 1. ЛОГІКА ОДЕРЖАННЯ ПЛАНУ ---
function getDayPlan(dayIndex, mdStatus) {
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const userId = "default_athlete";

    if (mdStatus === 'REST') return [];

    // Пріоритет 1: Індивідуальні вправи для конкретного дня (Пн, Вт...)
    if (overrides[userId] && overrides[userId][dayIndex]) {
        return overrides[userId][dayIndex].exercises;
    }

    // Пріоритет 2: Глобальний шаблон для поточного MD статусу
    if (mdStatus !== 'TRAIN' && globals[mdStatus]) {
        return globals[mdStatus].exercises;
    }

    // Пріоритет 3: Базове тренування (TRAIN)
    return globals['TRAIN'] ? globals['TRAIN'].exercises : [];
}

// --- 2. ОНОВЛЕННЯ ЦИКЛУ ТА ВІЗУАЛУ ---
function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    if (!activitySelects.length) return;

    // Зчитуємо значення селектів: "Тренування", "Матч", "Відпочинок"
    // Важливо: переконайся, що в HTML у <option> для Матчу стоїть value="MATCH"
    const activityValues = Array.from(activitySelects).map(s => s.value);
    
    // Розрахунок статусів
    let statuses = activityValues.map(v => (v === 'MATCH' ? 'MD' : (v === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityValues.indexOf('MATCH');

    if (matchIdx !== -1) {
        // Розрахунок днів ДО матчу (MD-1...4)
        for (let i = 1; i <= 4; i++) {
            let prev = (matchIdx - i + 7) % 7;
            if (statuses[prev] === 'TRAIN') statuses[prev] = `MD-${i}`;
        }
        // Розрахунок днів ПІСЛЯ матчу (MD+1...2)
        for (let i = 1; i <= 2; i++) {
            let next = (matchIdx + i) % 7;
            if (statuses[next] === 'TRAIN') statuses[next] = `MD+${i}`;
        }
    }

    // Оновлюємо інтерфейс для кожного дня
    activitySelects.forEach((select, index) => {
        const statusKey = statuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        // 1. Оновлюємо плашку статусу в таблиці (як на скриншоті)
        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.className = `day-md-title ${style.colorClass}`;
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // 2. Рендеримо картки вправ (як на скриншоті)
        const exercises = getDayPlan(index, statusKey);
        renderExercisesDisplay(index, statusKey, exercises);
    });
}

function renderExercisesDisplay(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        html += `<h5 class="template-stage-header">${stage.replace('-', ' ')}</h5>`;
        
        stageExs.forEach((ex) => {
            html += `
                <div class="exercise-item">
                    <span>${ex.name}</span>
                    <button type="button" class="remove-btn" onclick="deleteExercise(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати</button>`;
    });

    html += `
        <div class="day-footer-actions">
            <button type="button" class="gold-button btn-small" onclick="saveAsGlobalTemplate(${dayIndex}, '${mdStatus}')">★ Зберегти як шаблон ${mdStatus}</button>
        </div></div>`;

    container.innerHTML = html;
}

// --- 3. МОДАЛКА ТА РОЗУМНІ ГАЛОЧКИ ---
function openExerciseModal(dayIndex, mdStatus, stage) {
    currentExerciseContext = { dayIndex, mdStatus, stage };
    const currentPlan = getDayPlan(dayIndex, mdStatus);
    
    // Вправи, які вже є в цьому блоці (для галочок)
    selectedExercises = [...currentPlan.filter(ex => ex.stage === stage)];
    
    const modal = document.getElementById('exercise-selection-modal');
    modal.style.display = 'flex';
    
    const listContainer = document.getElementById('exercise-list-container');
    listContainer.innerHTML = '';
    
    const categories = EXERCISE_LIBRARY[stage];
    for (const cat in categories) {
        categories[cat].exercises.forEach(ex => {
            const isChecked = selectedExercises.some(s => s.name === ex.name);
            const div = document.createElement('div');
            div.className = 'exercise-select-item';
            div.innerHTML = `
                <input type="checkbox" id="ex-${ex.name}" ${isChecked ? 'checked' : ''} onchange="toggleExerciseSelection('${ex.name}', '${stage}')">
                <label for="ex-${ex.name}"><strong>${ex.name}</strong></label>
            `;
            listContainer.appendChild(div);
        });
    }
    updateModalButton();
}

function toggleExerciseSelection(name, stage) {
    const idx = selectedExercises.findIndex(e => e.name === name);
    if (idx > -1) {
        selectedExercises.splice(idx, 1);
    } else {
        // Знаходимо об'єкт вправи в бібліотеці
        let found = null;
        for (const cat in EXERCISE_LIBRARY[stage]) {
            const ex = EXERCISE_LIBRARY[stage][cat].exercises.find(e => e.name === name);
            if (ex) { found = { ...ex, stage }; break; }
        }
        if (found) selectedExercises.push(found);
    }
    updateModalButton();
}

function updateModalButton() {
    const btn = document.getElementById('add-selected-btn');
    btn.textContent = `Підтвердити вибране (${selectedExercises.length})`;
    btn.style.display = 'block';
}

function handleSelectionComplete() {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    if (!overrides[userId]) overrides[userId] = {};
    
    const currentDayPlan = getDayPlan(currentExerciseContext.dayIndex, currentExerciseContext.mdStatus);
    const otherStages = currentDayPlan.filter(ex => ex.stage !== currentExerciseContext.stage);
    
    overrides[userId][currentExerciseContext.dayIndex] = { 
        exercises: [...otherStages, ...selectedExercises]
    };

    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    document.getElementById('exercise-selection-modal').style.display = 'none';
    updateCycleColors();
}

// --- 4. ЗБЕРЕЖЕННЯ ШАБЛОНІВ ТА ВИДАЛЕННЯ ---
function saveAsGlobalTemplate(dayIdx, mdStatus) {
    const currentExs = getDayPlan(dayIdx, mdStatus);
    if (currentExs.length === 0) return alert("Немає вправ для збереження!");
    
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    globals[mdStatus] = { exercises: currentExs };
    localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globals));
    alert(`Шаблон для ${mdStatus} збережено. Тепер він автоматично з'являтиметься в дні з цим статусом!`);
}

function deleteExercise(dayIdx, exName) {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const currentExs = getDayPlan(dayIdx, ""); 
    
    const filtered = currentExs.filter(ex => ex.name !== exName);
    overrides[userId] = overrides[userId] || {};
    overrides[userId][dayIdx] = { exercises: filtered };
    
    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    updateCycleColors();
}

// --- 5. ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', () => {
    // Слухаємо зміни в селекторах "Матч/Тренування"
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });
    
    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) addBtn.onclick = handleSelectionComplete;

    // Первинний рендер
    updateCycleColors();
});
