// weekly-individual.js - ProAtletCare Edition
// Поєднує Глобальні шаблони, Індивідуальні оверрайди та Бібліотеку вправ

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

// Змінні для модалки
let currentDayIndex = null;
let currentMdStatus = null;
let selectedExercises = [];

// =========================================================
// 1. РОБОТА З ДАНИМИ (STORE)
// =========================================================

function getDayPlan(dayIndex, mdStatus, userId = "default_athlete") {
    // 1. Шукаємо індивідуальну правку
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    if (overrides[userId] && overrides[userId][dayIndex]) {
        return overrides[userId][dayIndex].exercises;
    }

    // 2. Якщо нема, беремо глобальний шаблон
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    if (globals[mdStatus]) {
        return globals[mdStatus].exercises;
    }

    return [];
}

// =========================================================
// 2. ВІДОБРАЖЕННЯ ІНТЕРФЕЙСУ
// =========================================================

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(select => select.value);
    let dayStatuses = calculateMdStatuses(activityTypes);

    dayCells.forEach((cell, index) => {
        let statusKey = dayStatuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        // Оновлення заголовків та міток
        const mdLabel = cell.querySelector('.md-status');
        if (mdLabel) {
            mdLabel.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m => mdLabel.classList.remove(m.colorClass));
            mdLabel.classList.add(style.colorClass);
        }

        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // Рендер вправ
        const exercises = getDayPlan(index, statusKey);
        renderExercises(index, statusKey, exercises);
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

function renderExercises(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<p class="rest-message">☕ Відпочинок</p>';
        return;
    }

    let html = `<div class="exercise-list">`;
    exercises.forEach((ex, idx) => {
        html += `
            <div class="exercise-item" data-idx="${idx}">
                <strong>${ex.name}</strong>
                <p>${ex.description}</p>
                <button type="button" class="remove-btn" onclick="removeExercise(${dayIndex}, ${idx})">✕</button>
            </div>`;
    });
    html += `</div>`;

    // Кнопки управління
    html += `
        <div class="day-actions">
            <button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}')">+ Додати вправу</button>
            <button type="button" class="global-save-btn" onclick="saveAsGlobal(${dayIndex}, '${mdStatus}')">★ Зробити шаблоном для ${mdStatus}</button>
        </div>`;

    container.innerHTML = html;
}

// =========================================================
// 3. МОДАЛЬНЕ ВІКНО ТА БІБЛІОТЕКА (EXERCISE_LIBRARY)
// =========================================================

function openExerciseModal(dayIndex, mdStatus) {
    currentDayIndex = dayIndex;
    currentMdStatus = mdStatus;
    selectedExercises = [];
    
    const modal = document.getElementById('exercise-selection-modal');
    const filterContainer = document.getElementById('quality-filters');
    const listContainer = document.getElementById('exercise-list-container');

    // Очистка та заповнення фільтрів
    filterContainer.innerHTML = QUALITIES.map(q => 
        `<button type="button" class="filter-chip" onclick="filterModal('${q}')">${q}</button>`
    ).join('');

    renderModalList();
    modal.style.display = 'flex';
}

function renderModalList(filter = null) {
    const listContainer = document.getElementById('exercise-list-container');
    listContainer.innerHTML = '';

    // Проходимо по категоріях бібліотеки (Pre, Main, Post)
    for (const stage in EXERCISE_LIBRARY) {
        for (const subCat in EXERCISE_LIBRARY[stage]) {
            const data = EXERCISE_LIBRARY[stage][subCat];
            
            data.exercises.forEach(ex => {
                if (!filter || data.qualities.includes(filter)) {
                    const div = document.createElement('div');
                    div.className = 'modal-ex-item';
                    div.innerHTML = `<strong>${ex.name}</strong><br><small>${subCat}</small>`;
                    div.onclick = () => toggleSelectExercise(ex, div);
                    listContainer.appendChild(div);
                }
            });
        }
    }
}

function toggleSelectExercise(ex, element) {
    element.classList.toggle('selected');
    const index = selectedExercises.findIndex(s => s.name === ex.name);
    if (index > -1) selectedExercises.splice(index, 1);
    else selectedExercises.push(ex);

    const btn = document.getElementById('add-selected-btn');
    btn.style.display = selectedExercises.length > 0 ? 'block' : 'none';
    btn.textContent = `Додати вибрані (${selectedExercises.length})`;
}

function handleSelectionComplete() {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    
    if (!overrides[userId]) overrides[userId] = {};
    if (!overrides[userId][currentDayIndex]) {
        // Якщо ще немає оверрайду, беремо базу з шаблону
        const currentPlan = getDayPlan(currentDayIndex, currentMdStatus);
        overrides[userId][currentDayIndex] = { exercises: [...currentPlan], mdStatus: currentMdStatus };
    }

    overrides[userId][currentDayIndex].exercises.push(...selectedExercises);
    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    
    closeExerciseModal();
    updateCycleColors();
}

// =========================================================
// 4. ЗБЕРЕЖЕННЯ (ГЛОБАЛЬНЕ ТА ІНДИВІДУАЛЬНЕ)
// =========================================================

function saveAsGlobal(dayIndex, mdStatus) {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    
    // Беремо поточний стан вправ з оверрайду або шаблону
    const exercisesToSave = (overrides[userId] && overrides[userId][dayIndex]) 
        ? overrides[userId][dayIndex].exercises 
        : getDayPlan(dayIndex, mdStatus);

    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    globals[mdStatus] = { exercises: exercisesToSave };
    localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globals));
    
    alert(`Стиль ProAtletCare: Шаблон для дня ${mdStatus} оновлено для всіх!`);
}

function removeExercise(dayIndex, exIdx) {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    
    if (!overrides[userId] || !overrides[userId][dayIndex]) {
        // Створюємо оверрайд на основі шаблону перед видаленням
        const base = getDayPlan(dayIndex, currentMdStatus);
        overrides[userId] = overrides[userId] || {};
        overrides[userId][dayIndex] = { exercises: [...base] };
    }

    overrides[userId][dayIndex].exercises.splice(exIdx, 1);
    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    updateCycleColors();
}

function closeExerciseModal() {
    document.getElementById('exercise-selection-modal').style.display = 'none';
}

// =========================================================
// 5. ІНІЦІАЛІЗАЦІЯ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });

    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) addBtn.onclick = handleSelectionComplete;

    window.filterModal = (q) => renderModalList(q);

    updateCycleColors();
});
