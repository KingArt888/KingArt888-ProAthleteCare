// weekly-individual.js — ProAtletCare
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

// 1. Отримати план саме для конкретного MD-статусу
function getPlanByStatus(dayIndex, mdStatus) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayKey = `day_plan_${dayIndex}`;
    
    // Якщо для цього дня вже є збережені вправи з ТАКИМ САМИМ статусом — повертаємо їх
    if (data[dayKey] && data[dayKey].mdStatus === mdStatus && data[dayKey].exercises.length > 0) {
        return data[dayKey].exercises;
    }

    // Якщо статус змінився (наприклад, був TRAIN, став MD-1), беремо вправи з ШАБЛОНУ статусу
    const templateKey = `template_${mdStatus}`;
    if (data[templateKey] && data[templateKey].exercises) {
        return data[templateKey].exercises;
    }

    return []; // Порожньо, якщо ще нічого не налаштовано
}

// 2. Розрахунок мікроциклу (MD-статуси навколо матчу)
function calculateMicrocycle(activityTypes) {
    let statuses = activityTypes.map(t => (t === 'MATCH' ? 'MD' : (t === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');

    if (matchIdx !== -1) {
        // MD-1...MD-4 (Дні до гри)
        for (let i = 1; i <= 4; i++) {
            let p = (matchIdx - i + 7) % 7;
            if (statuses[p] === 'TRAIN') statuses[p] = `MD-${i}`;
        }
        // MD+1...MD+2 (Дні після гри)
        for (let i = 1; i <= 2; i++) {
            let n = (matchIdx + i) % 7;
            if (statuses[n] === 'TRAIN') statuses[n] = `MD+${i}`;
        }
    }
    return statuses;
}

// 3. Оновлення візуалу та вправ
function updateCycleColors(isAutoSave = false) {
    const selects = document.querySelectorAll('.activity-type-select');
    const activityTypes = Array.from(selects).map(s => s.value);
    const dayStatuses = calculateMicrocycle(activityTypes);

    dayStatuses.forEach((statusKey, index) => {
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];
        
        // Оновлення кольору заголовка
        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.className = `day-md-title ${style.colorClass}`;
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // Рендер вправ для цього дня та статусу
        const exercises = getPlanByStatus(index, statusKey);
        renderExercisesForDay(index, statusKey, exercises);
    });

    if (isAutoSave) saveCurrentState();
}

function renderExercisesForDay(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box">ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="exercises-wrapper">';
    if (exercises.length === 0) {
        html += `<p class="empty-msg">Для ${mdStatus} ще немає вправ.</p>`;
    } else {
        exercises.forEach(ex => {
            html += `<div class="exercise-item"><span>${ex.name}</span></div>`;
        });
    }
    
    html += `
        <button type="button" class="add-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}')">+ Додати</button>
        <button type="button" class="save-template-btn" onclick="saveAsTemplate(${dayIndex}, '${mdStatus}')">★ Зберегти шаблон ${mdStatus}</button>
    </div>`;
    
    container.innerHTML = html;
}

// 4. Збереження шаблону статусу
function saveAsTemplate(dayIndex, mdStatus) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayKey = `day_plan_${dayIndex}`;
    
    if (data[dayKey] && data[dayKey].exercises.length > 0) {
        data[`template_${mdStatus}`] = { exercises: data[dayKey].exercises };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        alert(`Шаблон для ${mdStatus} успішно оновлено!`);
    }
}

function saveCurrentState() {
    // Логіка збору даних з селектів та планів і запис у localStorage
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // ... (збір activity_X)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 5. Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', () => updateCycleColors(true));
    });
    updateCycleColors();
});
