// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

const WEEKLY_STORAGE_KEY = 'weeklyPlanData';

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

// =========================================================
// 1. СТРУКТУРА ШАБЛОНІВ ТА ГЕНЕРАЦІЯ
// =========================================================

const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

function generateRandomExercises(stage, category, count) {
    const categoryData = EXERCISE_LIBRARY[stage] && EXERCISE_LIBRARY[stage][category] ? 
                         EXERCISE_LIBRARY[stage][category] : null;

    if (!categoryData || !categoryData.exercises || categoryData.exercises.length === 0) {
        console.warn(`Категорія ${stage} / ${category} не знайдена або порожня.`);
        return [];
    }
    
    const availableExercises = categoryData.exercises;
    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// =========================================================
// 2. ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ
// =========================================================

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
        const dayPlan = [];
        const dayBlock = document.querySelector(`.task-day-container[data-day-index="${i}"]`);
        if (!dayBlock || dayBlock.querySelectorAll('.exercise-item').length === 0) continue;

        dayBlock.querySelectorAll('.exercise-item').forEach(item => {
            const nameInput = item.querySelector('[data-field="name"]');
            const descTextarea = item.querySelector('[data-field="description"]');
            
            dayPlan.push({
                name: nameInput ? nameInput.value : 'Невідома вправа',
                description: descTextarea ? descTextarea.value : '',
                stage: item.dataset.stage,
                category: item.dataset.category,
                videoKey: item.dataset.videokey || '',
                imageURL: item.dataset.imageurl || ''
            });
        });

        if (dayPlan.length > 0) {
            manualPlanData[`day_plan_${i}`] = { exercises: dayPlan };
        }
    }
    return manualPlanData;
}

function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    const saveButton = document.querySelector('.save-button');
    try {
        let existingData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}');
        const activityData = {};
        let finalPlanData = {};
        
        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(el => {
            activityData[el.name] = el.value;
        });
        
        const templateData = templatesFromUI || collectTemplatesFromUI();
        
        Object.keys(existingData).forEach(key => {
            if (key.startsWith('day_plan_')) delete existingData[key];
        });
        
        finalPlanData = newWeeklyPlan || collectManualChanges();

        for (let i = 0; i < 7; i++) {
            if (finalPlanData[`day_plan_${i}`]) {
                const mdStatusEl = document.querySelector(`#md-title-${i} .md-status-label`);
                finalPlanData[`day_plan_${i}`].mdStatus = mdStatusEl ? mdStatusEl.textContent.trim() : 'TRAIN';
            }
        }

        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(combinedData));

        if (saveButton) {
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => saveButton.textContent = 'Зберегти Тижневий План та Шаблони', 2000);
        }
    } catch (e) {
        console.error("Помилка при збереженні даних:", e);
    }
}

function loadWeeklyPlanDisplay(data) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const planKey = `day_plan_${dayIndex}`;
        const plan = data[planKey];
        const mdStatus = plan && plan.mdStatus ? plan.mdStatus : 'TRAIN';
        if (plan && plan.exercises) displayGeneratedExercises(dayIndex, mdStatus, plan.exercises);
    }
}

// =========================================================
// 3. ОБРОБКА MD-СТАТУСІВ (мікроцикл)
// =========================================================

function updateCycleColors(shouldGenerate = false) {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    try {
        const activityTypes = Array.from(activitySelects).map(sel => sel.value);
        let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : type === 'REST' ? 'REST' : 'TRAIN'));
        const matchIndices = dayStatuses.map((s, i) => s === 'MD' ? i : -1).filter(i => i !== -1);

        const mdPlusMap = ['MD+1', 'MD+2'];
        const mdMinusMap = ['MD-1', 'MD-2', 'MD-3', 'MD-4'];

        matchIndices.forEach(matchIdx => {
            for (let j = 1; j <= mdPlusMap.length; j++) {
                const idx = (matchIdx + j) % 7;
                if (dayStatuses[idx] !== 'REST' && dayStatuses[idx] === 'TRAIN') dayStatuses[idx] = mdPlusMap[j - 1];
            }
            let minusCount = 0;
            for (let j = 1; j <= mdMinusMap.length; j++) {
                const idx = (matchIdx - j + 7) % 7;
                if (dayStatuses[idx] === 'TRAIN') {
                    dayStatuses[idx] = mdMinusMap[minusCount];
                    minusCount++;
                }
            }
        });

        dayCells.forEach((cell, index) => {
            const finalStatus = dayStatuses[index] || 'TRAIN';
            const style = COLOR_MAP[finalStatus] || COLOR_MAP['TRAIN'];
            const mdStatusEl = cell.querySelector('.md-status');
            if (mdStatusEl) {
                mdStatusEl.textContent = style.status;
                Object.values(COLOR_MAP).forEach(map => mdStatusEl.classList.remove(map.colorClass));
                mdStatusEl.classList.add(style.colorClass);
            }
            const mdTitleEl = document.getElementById(`md-title-${index}`);
            if (mdTitleEl) mdTitleEl.innerHTML = `<span class="md-status-label">${style.status}</span> <span class="day-name-label">(${dayNamesShort[index]})</span>`;
        });

        const savedData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}');
        const savedTemplates = {};
        Object.keys(savedData).forEach(key => { if (key.startsWith('template_')) savedTemplates[key] = savedData[key]; });
        dayCells.forEach((cell, index) => renderDayTemplateInput(index, dayStatuses[index], savedTemplates));

        if (shouldGenerate) {
            const templatesFromUI = collectTemplatesFromUI();
            const newWeeklyPlan = generateWeeklyPlan(dayStatuses, templatesFromUI);
            saveData(newWeeklyPlan, templatesFromUI);
        } else {
            loadWeeklyPlanDisplay(savedData);
        }
    } catch (e) {
        console.error("Критична помилка у updateCycleColors:", e);
    }
}

// =========================================================
// 4. ІНІЦІАЛІЗАЦІЯ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-type-select').forEach(sel => sel.addEventListener('change', () => updateCycleColors(true)));
    const form = document.getElementById('weekly-plan-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); saveData(); });
    const addSelectedBtn = document.getElementById('add-selected-btn');
    if (addSelectedBtn) addSelectedBtn.addEventListener('click', handleSelectionComplete);
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) closeExerciseModal(); });
    loadData();
});
