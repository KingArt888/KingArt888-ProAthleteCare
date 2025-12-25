// weekly-individual.js
// Платформа ProAtletCare: Глобальне планування та індивідуальні оверрайди

const STORAGE_KEY = 'pro_atlet_care_data';
const GLOBAL_TEMPLATE_KEY = 'global_templates';
const INDIVIDUAL_OVERRIDE_KEY = 'individual_overrides';

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
// 1. СИСТЕМА УПРАВЛІННЯ ДАНИМИ (GLOBAL VS INDIVIDUAL)
// =========================================================

// Отримання вправ для конкретного дня
function getPlanForDay(dayIndex, mdStatus, userId = "default_user") {
    const allOverrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const userOverrides = allOverrides[userId] || {};
    
    // 1. Шукаємо індивідуальну правку для цього дня (Пріоритет №1)
    if (userOverrides[dayIndex]) {
        console.log(`[ProAtletCare] Завантажено індивідуальну правку для дня ${dayIndex}`);
        return userOverrides[dayIndex].exercises;
    }

    // 2. Якщо правки немає, беремо глобальний шаблон за MD-статусом
    const globalTemplates = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    if (globalTemplates[mdStatus]) {
        return globalTemplates[mdStatus].exercises;
    }

    return []; // Порожньо, якщо нічого не налаштовано
}

// Збереження даних
function saveProData(dayIndex, exercises, mdStatus, isGlobal = false, userId = "default_user") {
    if (isGlobal) {
        // Зберігаємо як стандарт для всіх атлетів з цим статусом
        const globalTemplates = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
        globalTemplates[mdStatus] = { exercises: exercises, updatedAt: new Date() };
        localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globalTemplates));
        alert(`Глобальний шаблон для ${mdStatus} оновлено для всіх клієнтів!`);
    } else {
        // Зберігаємо як персональну правку для конкретного клієнта
        const allOverrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
        if (!allOverrides[userId]) allOverrides[userId] = {};
        allOverrides[userId][dayIndex] = { exercises: exercises, mdStatus: mdStatus };
        localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(allOverrides));
    }
}

// =========================================================
// 2. ЛОГІКА ВІДОБРАЖЕННЯ ТА ГЕНЕРАЦІЇ
// =========================================================

function updateCycleColors(shouldGenerate = false) {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(select => select.value);
    let dayStatuses = calculateMdStatuses(activityTypes);
    
    const currentMdStatuses = [];

    dayCells.forEach((cell, index) => {
        let statusKey = dayStatuses[index];
        currentMdStatuses[index] = statusKey;

        // Візуал статусів
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];
        const mdLabel = cell.querySelector('.md-status');
        if (mdLabel) {
            mdLabel.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m => mdLabel.classList.remove(m.colorClass));
            mdLabel.classList.add(style.colorClass);
        }

        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;

        // Відображаємо вправи (або з шаблону, або з оверрайду)
        const dayExercises = getPlanForDay(index, statusKey);
        displayExercisesInUI(index, statusKey, dayExercises);
    });
}

function calculateMdStatuses(activityTypes) {
    let statuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN')));
    const hasMatch = activityTypes.includes('MATCH');

    if (hasMatch) {
        let matchIdx = activityTypes.indexOf('MATCH');
        // Логіка MD- (назад від матчу)
        for (let i = 1; i <= 4; i++) {
            let prev = (matchIdx - i + 7) % 7;
            if (statuses[prev] === 'TRAIN') statuses[prev] = `MD-${i}`;
        }
        // Логіка MD+ (вперед після матчу)
        for (let i = 1; i <= 2; i++) {
            let next = (matchIdx + i) % 7;
            if (statuses[next] === 'TRAIN') statuses[next] = `MD+${i}`;
        }
    }
    return statuses;
}

function displayExercisesInUI(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    container.innerHTML = ''; // Очистка
    
    if (mdStatus === 'REST') {
        container.innerHTML = '<p class="rest-message">☕ Відпочинок та відновлення</p>';
        return;
    }

    const listDiv = document.createElement('div');
    listDiv.className = 'generated-exercises-list';
    
    let html = `<h4>План на день (${mdStatus})</h4>`;
    
    if (exercises.length === 0) {
        html += `<button type="button" class="gold-button btn-small" onclick="applyTemplateToDay(${dayIndex}, '${mdStatus}')">Застосувати шаблон ${mdStatus}</button>`;
    } else {
        exercises.forEach((ex, idx) => {
            html += `
                <div class="exercise-item" data-id="${idx}">
                    <div class="exercise-fields">
                        <input type="text" value="${ex.name}" class="ex-name-input">
                        <textarea class="ex-desc-input">${ex.description}</textarea>
                        <div class="exercise-actions">
                             <button type="button" onclick="removeExercise(${dayIndex}, ${idx})">❌</button>
                        </div>
                    </div>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}')">+ Додати вправу</button>`;
    }
    
    listDiv.innerHTML = html;
    container.appendChild(listDiv);
}

// =========================================================
// 3. ФУНКЦІЇ УПРАВЛІННЯ (ТЕ, ЩО РОБИТЬ ТРЕНЕР)
// =========================================================

// Коли ти хочеш змінити шаблон для всіх клієнтів (Global)
function setAsGlobalTemplate(mdStatus, dayIndex) {
    const exercises = collectExercisesFromUI(dayIndex);
    saveProData(dayIndex, exercises, mdStatus, true);
}

function collectExercisesFromUI(dayIndex) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    const items = container.querySelectorAll('.exercise-item');
    const exercises = [];
    items.forEach(item => {
        exercises.push({
            name: item.querySelector('.ex-name-input').value,
            description: item.querySelector('.ex-desc-input').value
        });
    });
    return exercises;
}

// =========================================================
// 4. ІНІЦІАЛІЗАЦІЯ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Слухаємо зміну активності (Матч/Тренування)
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', () => updateCycleColors(true));
    });

    // Головна кнопка збереження (зберігає поточні зміни як індивідуальні)
    document.getElementById('weekly-plan-form').addEventListener('submit', (e) => {
        e.preventDefault();
        for (let i = 0; i < 7; i++) {
            const exercises = collectExercisesFromUI(i);
            const status = document.querySelector(`#md-title-${i} .md-status-label`).textContent;
            saveProData(i, exercises, status, false);
        }
        alert("Всі індивідуальні зміни збережено!");
    });

    updateCycleColors();
});
