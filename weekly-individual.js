// weekly-individual.js — ProAtletCare (MD-PRIORITY EDITION)
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

// --- 1. ОНОВЛЕНА ЛОГІКА ОТРИМАННЯ ПЛАНУ ---

function getDayPlan(dayIndex, mdStatus, userId = "default_athlete") {
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');

    // ЛОГІКА: 
    // 1. Якщо це REST — завжди повертаємо порожньо.
    if (mdStatus === 'REST') return [];

    // 2. Якщо статус специфічний (MD, MD-1 і т.д.), шукаємо спочатку ГЛОБАЛЬНИЙ шаблон для цього статусу
    // Це дозволяє тренуванню "перестрибувати" разом зі зміною дня гри.
    if (mdStatus !== 'TRAIN' && globals[mdStatus]) {
        return globals[mdStatus].exercises;
    }

    // 3. Якщо це звичайний TRAIN, перевіряємо, чи є індивідуальне збереження для цього конкретного дня тижня
    if (overrides[userId] && overrides[userId][dayIndex]) {
        return overrides[userId][dayIndex].exercises;
    }

    // 4. Якщо нічого не знайдено — повертаємо загальний TRAIN або пустий масив
    return globals['TRAIN'] ? globals['TRAIN'].exercises : [];
}

// --- 2. ВІДОБРАЖЕННЯ ТА ЦИКЛИ ---

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(select => select.value);
    let dayStatuses = calculateMdStatuses(activityTypes);

    dayCells.forEach((cell, index) => {
        let statusKey = dayStatuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        // Оновлюємо заголовок (колір та текст)
        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.className = `day-md-title ${style.colorClass}`;
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // Рендеримо вправи
        const exercises = getDayPlan(index, statusKey);
        renderExercisesWithStages(index, statusKey, exercises);
    });
}

function calculateMdStatuses(activityTypes) {
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
    return statuses;
}

function renderExercisesWithStages(dayIndex, mdStatus, exercises) {
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
            const globalIdx = exercises.indexOf(ex);
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${ex.name}</span>
                    <button type="button" class="remove-btn" onclick="deleteExercise(${dayIndex}, ${globalIdx})">✕</button>
                </div>`;
        });
        
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Редагувати</button>`;
    });

    html += `
        <div class="day-footer-actions" style="margin-top:10px; border-top:1px solid #d4af37; padding-top:10px;">
            <button type="button" class="gold-button btn-small" onclick="saveAsGlobal(${dayIndex}, '${mdStatus}')" style="font-size:10px;">★ Зберегти як шаблон ${mdStatus}</button>
        </div></div>`;

    container.innerHTML = html;
}

// --- 3. МОДАЛЬНЕ ВІКНО (З ПАМ'ЯТТЮ ГАЛОЧОК) ---

function openExerciseModal(dayIndex, mdStatus, stage) {
    currentExerciseContext = { dayIndex, mdStatus, stage };
    const currentDayPlan = getDayPlan(dayIndex, mdStatus);
    selectedExercises = currentDayPlan.filter(ex => ex.stage === stage);
    
    const modal = document.getElementById('exercise-selection-modal');
    modal.style.display = 'flex';
    renderModalList(stage);
    updateModalButton();
}

function renderModalList(stage) {
    const listContainer = document.getElementById('exercise-list-container');
    listContainer.innerHTML = '';
    const categories = EXERCISE_LIBRARY[stage];

    for (const catName in categories) {
        categories[catName].exercises.forEach(ex => {
            const isChecked = selectedExercises.some(s => s.name === ex.name);
            const div = document.createElement('div');
            div.className = 'exercise-select-item';
            div.innerHTML = `
                <input type="checkbox" id="chk-${ex.name}" ${isChecked ? 'checked' : ''} onchange="toggleEx('${ex.name}', '${stage}')">
                <label for="chk-${ex.name}"><strong>${ex.name}</strong></label>
            `;
            listContainer.appendChild(div);
        });
    }
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
    btn.style.display = selectedExercises.length > 0 ? 'block' : 'none';
    btn.textContent = `Підтвердити (${selectedExercises.length})`;
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
    closeExerciseModal();
    updateCycleColors();
}

function closeExerciseModal() {
    document.getElementById('exercise-selection-modal').style.display = 'none';
}

function saveAsGlobal(dayIdx, mdStatus) {
    const currentExs = getDayPlan(dayIdx, mdStatus);
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    globals[mdStatus] = { exercises: currentExs };
    localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globals));
    alert(`Системний шаблон ${mdStatus} оновлено!`);
}

function deleteExercise(dayIdx, exIdx) {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const currentExs = getDayPlan(dayIdx, ""); 
    currentExs.splice(exIdx, 1);
    overrides[userId] = overrides[userId] || {};
    overrides[userId][dayIdx] = { exercises: currentExs };
    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    updateCycleColors();
}

// --- 4. ІНІЦІАЛІЗАЦІЯ ---

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });
    
    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) addBtn.onclick = handleSelectionComplete;

    const modal = document.getElementById('exercise-selection-modal');
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) {
            closeExerciseModal();
        }
    });

    updateCycleColors();
});
