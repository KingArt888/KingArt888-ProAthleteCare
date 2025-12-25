// weekly-individual.js — ProAtletCare (DYNAMIC CYCLE & SMART CHECKBOXES)
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

// --- 1. ГОЛОВНА ЛОГІКА: ЗАВАНТАЖЕННЯ ПЛАНУ ---
function getDayPlan(dayIndex, mdStatus, userId = "default_athlete") {
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');

    if (mdStatus === 'REST') return [];

    // Пріоритет 1: Якщо статус особливий (MD, MD-1 і т.д.), шукаємо глобальний шаблон
    if (mdStatus !== 'TRAIN' && globals[mdStatus]) {
        return globals[mdStatus].exercises;
    }

    // Пріоритет 2: Індивідуальні правки для конкретного дня тижня
    if (overrides[userId] && overrides[userId][dayIndex]) {
        return overrides[userId][dayIndex].exercises;
    }

    // Пріоритет 3: Загальний шаблон для тренувань
    return globals['TRAIN'] ? globals['TRAIN'].exercises : [];
}

// --- 2. ПЕРЕРАХУНОК ЦИКЛУ ТА ВІДОБРАЖЕННЯ ---
function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    // Отримуємо значення всіх селектів (MATCH, TRAIN, REST)
    let activityTypes = Array.from(activitySelects).map(select => select.value);
    
    // Розраховуємо статуси MD
    let statuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');
    if (matchIdx !== -1) {
        for (let i = 1; i <= 4; i++) {
            let prev = (matchIdx - i + 7) % 7;
            if (statuses[prev] === 'TRAIN') statuses[prev] = `MD-${i}`;
        }
        for (let i = 1; i <= 2; i++) {
            let next = (matchIdx + i) % 7;
            if (statuses[next] === 'TRAIN') statuses[next] = `MD+${i}`;
        }
    }

    // Малюємо кожен день
    dayCells.forEach((cell, index) => {
        let statusKey = statuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        // Оновлення заголовку дня
        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.className = `day-md-title ${style.colorClass}`;
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // Рендер вправ для цього дня
        const exercises = getDayPlan(index, statusKey);
        renderDayExercises(index, statusKey, exercises);
    });
}

function renderDayExercises(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        html += `<h5 class="template-stage-header">${stage}</h5>`;
        
        stageExs.forEach((ex, idxInList) => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${ex.name}</span>
                    <button type="button" class="remove-btn" onclick="deleteExercise(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Редагувати</button>`;
    });

    html += `
        <div class="day-footer-actions">
            <button type="button" class="gold-button btn-small" onclick="saveAsGlobal(${dayIndex}, '${mdStatus}')">★ Зберегти шаблон ${mdStatus}</button>
        </div></div>`;

    container.innerHTML = html;
}

// --- 3. МОДАЛКА ТА ГАЛОЧКИ ---
function openExerciseModal(dayIndex, mdStatus, stage) {
    currentExerciseContext = { dayIndex, mdStatus, stage };
    
    // 1. Отримуємо вправи, які вже є в плані
    const currentPlan = getDayPlan(dayIndex, mdStatus);
    selectedExercises = currentPlan.filter(ex => ex.stage === stage);
    
    const modal = document.getElementById('exercise-selection-modal');
    modal.style.display = 'flex';
    
    // 2. Рендеримо список з бібліотеки
    const listContainer = document.getElementById('exercise-list-container');
    listContainer.innerHTML = '';
    const categories = EXERCISE_LIBRARY[stage];

    for (const catName in categories) {
        categories[catName].exercises.forEach(ex => {
            const isChecked = selectedExercises.some(s => s.name === ex.name);
            const div = document.createElement('div');
            div.className = 'exercise-select-item';
            div.innerHTML = `
                <input type="checkbox" id="chk-${ex.name}" ${isChecked ? 'checked' : ''} 
                    onchange="toggleEx('${ex.name}', '${stage}')">
                <label for="chk-${ex.name}" style="cursor:pointer; margin-left:8px;"><strong>${ex.name}</strong></label>
            `;
            listContainer.appendChild(div);
        });
    }
    updateModalButton();
}

function toggleEx(name, stage) {
    const categories = EXERCISE_LIBRARY[stage];
    let foundEx = null;
    for (const cat in categories) {
        const ex = categories[cat].exercises.find(e => e.name === name);
        if (ex) { foundEx = { ...ex, stage }; break; }
    }

    const idx = selectedExercises.findIndex(e => e.name === name);
    if (idx > -1) selectedExercises.splice(idx, 1);
    else if (foundEx) selectedExercises.push(foundEx);

    updateModalButton();
}

function updateModalButton() {
    const btn = document.getElementById('add-selected-btn');
    if (!btn) return;
    btn.style.display = selectedExercises.length > 0 ? 'block' : 'none';
    btn.textContent = `Підтвердити вибране (${selectedExercises.length})`;
}

function handleSelectionComplete() {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    if (!overrides[userId]) overrides[userId] = {};
    
    const allExs = getDayPlan(currentExerciseContext.dayIndex, currentExerciseContext.mdStatus);
    const otherStagesExs = allExs.filter(ex => ex.stage !== currentExerciseContext.stage);
    
    overrides[userId][currentExerciseContext.dayIndex] = { 
        exercises: [...otherStagesExs, ...selectedExercises],
        mdStatus: currentExerciseContext.mdStatus 
    };

    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    document.getElementById('exercise-selection-modal').style.display = 'none';
    updateCycleColors();
}

// --- 4. ЗБЕРЕЖЕННЯ ШАБЛОНІВ ТА ВИДАЛЕННЯ ---
function saveAsGlobal(dayIdx, mdStatus) {
    const currentExs = getDayPlan(dayIdx, mdStatus);
    if (currentExs.length === 0) { alert("Список вправ порожній!"); return; }
    
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    globals[mdStatus] = { exercises: currentExs };
    localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globals));
    alert(`Шаблон для дня ${mdStatus} успішно збережено!`);
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

// --- 5. ЗАПУСК ПРИ ЗАВАНТАЖЕННІ ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Навішуємо зміну MD статусів
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });
    
    // 2. Кнопка підтвердження в модалці
    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) addBtn.onclick = handleSelectionComplete;

    // 3. Закриття модалки
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) {
                modal.style.display = 'none';
            }
        });
    }

    // Початковий рендер
    updateCycleColors();
});
