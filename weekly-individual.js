// weekly-individual.js (оновлена версія)
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

// 🔹 Глобальна константа для зберігання, щоб уникнути повторного оголошення
window.STORAGE_KEY = window.STORAGE_KEY || 'weeklyPlanData';

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

// =====================
// 1. Утиліти для генерації та збереження
// =====================

function generateRandomExercises(stage, category, count) {
    const categoryData = EXERCISE_LIBRARY?.[stage]?.[category] || null;

    if (!categoryData || !categoryData.exercises?.length) return [];

    const shuffled = [...categoryData.exercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function collectTemplatesFromUI() {
    const templateData = {};
    document.querySelectorAll('.template-category-button').forEach(button => {
        const mdStatus = button.dataset.mdStatus;
        const stage = button.dataset.stage;
        const category = button.dataset.category;
        const value = parseInt(button.dataset.count) || 0;

        const templateKey = `template_${mdStatus}`;
        if (!templateData[templateKey]) templateData[templateKey] = { phase: mdStatus };
        if (!templateData[templateKey][stage]) templateData[templateKey][stage] = {};

        templateData[templateKey][stage][category] = value;
    });
    return templateData;
}

function collectManualChanges() {
    const manualPlanData = {};
    for (let i = 0; i < 7; i++) {
        const dayBlock = document.querySelector(`.task-day-container[data-day-index="${i}"]`);
        if (!dayBlock) continue;

        const dayPlan = [];
        dayBlock.querySelectorAll('.exercise-item').forEach(item => {
            dayPlan.push({
                name: item.querySelector('[data-field="name"]')?.value || 'Невідома вправа',
                description: item.querySelector('[data-field="description"]')?.value || '',
                stage: item.dataset.stage,
                category: item.dataset.category,
                videoKey: item.dataset.videokey || '',
                imageURL: item.dataset.imageurl || ''
            });
        });

        if (dayPlan.length) manualPlanData[`day_plan_${i}`] = { exercises: dayPlan };
    }
    return manualPlanData;
}

function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    try {
        let existingData = JSON.parse(localStorage.getItem(window.STORAGE_KEY) || '{}');
        const activityData = {};

        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(el => {
            activityData[el.name] = el.value;
        });

        const templateData = templatesFromUI || collectTemplatesFromUI();

        Object.keys(existingData).forEach(key => { if (key.startsWith('day_plan_')) delete existingData[key]; });

        const finalPlanData = newWeeklyPlan || collectManualChanges();

        for (let i = 0; i < 7; i++) {
            if (finalPlanData[`day_plan_${i}`]) {
                const mdStatus = document.querySelector(`#md-title-${i} .md-status-label`)?.textContent.trim() || 'TRAIN';
                finalPlanData[`day_plan_${i}`].mdStatus = mdStatus;
            }
        }

        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        localStorage.setItem(window.STORAGE_KEY, JSON.stringify(combinedData));

        const saveButton = document.querySelector('.save-button');
        if (saveButton) {
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => saveButton.textContent = 'Зберегти Тижневий План та Шаблони', 2000);
        }
    } catch (e) {
        console.error("Помилка при збереженні даних:", e);
    }
}

// =====================
// 2. Робота з інтерфейсом дня
// =====================

function renderDayTemplateInput(dayIndex, mdStatus, savedTemplates) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;

    const templateKey = `template_${mdStatus}`;
    const template = savedTemplates[templateKey] || {};

    let html = `<div class="template-exercise-fields" data-md-status-editor="${mdStatus}">`;

    for (const [stage, categories] of Object.entries(templateStages)) {
        if (mdStatus !== 'REST') html += `<h5 class="template-stage-header">${stage.replace('-', ' ')}</h5>`;
        categories.forEach(category => {
            const currentCount = template[stage]?.[category] ?? 0;
            const rowStyle = mdStatus === 'REST' ? 'style="display: none;"' : '';
            html += `
                <div class="template-row template-tag-row" ${rowStyle}>
                    <button type="button" 
                           class="template-category-button ${currentCount > 0 ? 'active-template' : ''}"
                           data-md-status="${mdStatus}" 
                           data-stage="${stage}" 
                           data-category="${category}"
                           data-day-index="${dayIndex}"
                           data-count="${currentCount}"
                           title="Кількість вправ: ${currentCount}. Натисніть для ручного вибору вправ.">
                          ${category} (${currentCount})
                    </button>
                    <div class="count-controls">
                        <button type="button" class="count-control-btn count-minus" data-step="-1" data-category="${category}" data-day-index="${dayIndex}">-</button>
                        <button type="button" class="count-control-btn count-plus" data-step="1" data-category="${category}" data-day-index="${dayIndex}">+</button>
                    </div>
                    <button type="button" class="add-manual-exercise-btn" 
                            data-day-index="${dayIndex}" 
                            data-md-status="${mdStatus}" 
                            data-stage="${stage}"
                            data-category="${category}"
                            title="Додати вправу ${category} вручну">+</button>
                </div>`;
        });
    }

    html += `</div>`;
    dayBlock.querySelectorAll('.template-exercise-fields, .generated-exercises-list, .rest-message').forEach(el => el.remove());
    dayBlock.insertAdjacentHTML('afterbegin', html);
    addTemplateControlListeners();
}

function addTemplateControlListeners() {
    document.querySelectorAll('.count-control-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const dayIndex = e.target.dataset.dayIndex;
            const categoryName = e.target.dataset.category;
            const step = parseInt(e.target.dataset.step);

            const templateButton = document.querySelector(`.template-category-button[data-day-index="${dayIndex}"][data-category="${categoryName}"]`);
            if (!templateButton) return;

            let currentCount = parseInt(templateButton.dataset.count);
            let newCount = Math.max(0, Math.min(5, currentCount + step));

            templateButton.dataset.count = newCount;
            templateButton.innerHTML = `${categoryName} (${newCount})`;
            templateButton.title = `Кількість вправ: ${newCount}. Натисніть для ручного вибору вправ.`;

            templateButton.classList.toggle('active-template', newCount > 0);

            if (document.querySelector('#md-colors-row')) updateCycleColors(true);
        });
    });

    document.querySelectorAll('.add-manual-exercise-btn, .template-category-button').forEach(btn => {
        btn.addEventListener('click', e => {
            if (e.target.classList.contains('count-control-btn')) return;
            const target = e.target.closest('.template-category-button') || e.target.closest('.add-manual-exercise-btn');
            if (!target) return;

            const { dayIndex, mdStatus, stage, category } = target.dataset;
            openExerciseModal(dayIndex, mdStatus, stage, category);
        });
    });
}

// =====================
// 3. Основна ініціалізація
// =====================

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', () => updateCycleColors(true));
    });

    const form = document.getElementById('weekly-plan-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); saveData(); });

    const addSelectedBtn = document.getElementById('add-selected-btn');
    if (addSelectedBtn) addSelectedBtn.addEventListener('click', handleSelectionComplete);

    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) closeExerciseModal();
        });
    }

    if (document.querySelector('#md-colors-row')) loadData();
});
