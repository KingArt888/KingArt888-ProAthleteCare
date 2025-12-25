// weekly-individual.js — ProAtletCare (FULL FINAL VERSION)
const STORAGE_KEY = 'weeklyPlanData';
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

// =========================================================
// 1. ОСНОВНЕ ЗБЕРЕЖЕННЯ (ФУНКЦІЯ ПЕРЕД ВИКЛИКОМ)
// =========================================================

function saveData(manualData = null) {
    try {
        let existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const activityData = {};
        
        // Збір станів селектів
        document.querySelectorAll('.activity-type-select').forEach(sel => {
            activityData[sel.name] = sel.value;
        });

        // Якщо передано нові вправи, оновлюємо їх
        const finalData = { ...existingData, ...activityData, ...(manualData || {}) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
        
        const btn = document.querySelector('.save-button');
        if (btn) {
            btn.textContent = 'Збережено! (✔)';
            setTimeout(() => btn.textContent = 'Зберегти План', 2000);
        }
    } catch (e) { console.error("Save error:", e); }
}

// =========================================================
// 2. ДИНАМІЧНИЙ МІКРОЦИКЛ (ШКАЛА)
// =========================================================

function updateCycleColors(shouldGenerate = false) {
    const selects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(selects).map(s => s.value);
    let dayStatuses = activityTypes.map(v => (v === 'MATCH' ? 'MD' : (v === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');

    // Розрахунок MD-статусів навколо матчу
    if (matchIdx !== -1) {
        for (let j = 1; j <= 4; j++) {
            let i = (matchIdx - j + 7) % 7;
            if (activityTypes[i] !== 'REST' && activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD-${j}`;
            else break;
        }
        for (let j = 1; j <= 2; j++) {
            let i = (matchIdx + j) % 7;
            if (activityTypes[i] !== 'REST' && activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD+${j}`;
            else break;
        }
    }

    // Оновлення візуалу
    dayStatuses.forEach((status, idx) => {
        const style = COLOR_MAP[status] || COLOR_MAP['TRAIN'];
        // Верхня шкала
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        // Заголовок блоку
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${style.status}</span> (${dayNamesShort[idx]})`;
        }
        
        // Рендер вправ під конкретний статус
        renderDayExercises(idx, status);
    });

    saveData();
}

// =========================================================
// 3. РОБОТА З ВПРАВАМИ
// =========================================================

function renderDayExercises(dayIndex, mdStatus) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayPlan = data[`day_plan_${dayIndex}`] || { exercises: [] };

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = dayPlan.exercises.filter(ex => ex.stage === stage);
        html += `<h5 class="template-stage-header">${stage}</h5>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item">
                    <span>${ex.name}</span>
                    <button type="button" class="remove-btn" onclick="removeExercise(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// МОДАЛКА: ВІДКРИТТЯ
function openExerciseModal(dayIndex, mdStatus, stage) {
    window.currentAddContext = { dayIndex, mdStatus, stage };
    const modal = document.getElementById('exercise-selection-modal');
    const list = document.getElementById('exercise-list-container');
    
    if (!modal || !list) return;
    list.innerHTML = '';

    const stageData = EXERCISE_LIBRARY[stage];
    if (stageData) {
        for (const cat in stageData) {
            list.innerHTML += `<div class="modal-cat-title">${cat}</div>`;
            stageData[cat].exercises.forEach(ex => {
                list.innerHTML += `
                    <div class="exercise-select-item">
                        <span>${ex.name}</span>
                        <button class="gold-button btn-small" onclick="confirmAdd('${ex.name}', '${stage}', '${cat}')">Вибрати</button>
                    </div>`;
            });
        }
    }
    modal.style.display = 'flex';
}

// МОДАЛКА: ПІДТВЕРДЖЕННЯ
function confirmAdd(name, stage, category) {
    const { dayIndex } = window.currentAddContext;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `day_plan_${dayIndex}`;
        if (!data[key]) data[key] = { exercises: [] };
        
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        document.getElementById('exercise-selection-modal').style.display = 'none';
        updateCycleColors();
    }
}

function removeExercise(dayIndex, name) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `day_plan_${dayIndex}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
    }
}

// =========================================================
// 4. ІНІЦІАЛІЗАЦІЯ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Завантаження станів селектів
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        if (data[sel.name]) sel.value = data[sel.name];
        sel.addEventListener('change', () => updateCycleColors());
    });

    updateCycleColors();
});
