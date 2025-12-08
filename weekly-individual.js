// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

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

// =========================================================
// 1. СТРУКТУРА ШАБЛОНІВ ТА ГЕНЕРАЦІЯ
// =========================================================

const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

function generateRandomExercises(stage, category, count) {
    if (!EXERCISE_LIBRARY || !EXERCISE_LIBRARY[stage] || !EXERCISE_LIBRARY[stage][category]) {
        console.warn(`Категорія ${stage} / ${category} не знайдена в EXERCISE_LIBRARY.`);
        // Запобігаємо збою, повертаючи помилковий об'єкт
        return [{ name: `Помилка: Немає вправ у ${category}`, videoKey: '', description: 'Перевірте exercise_library.js' }];
    }
    
    const availableExercises = EXERCISE_LIBRARY[stage][category];
    if (availableExercises.length === 0) {
        console.warn(`Категорія ${stage} / ${category} порожня в EXERCISE_LIBRARY.`);
        return [];
    }

    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// =========================================================
// 2. ФУНКЦІЇ ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ
// =========================================================

function collectTemplatesFromUI() {
    const templateData = {};
    document.querySelectorAll('.template-count-input').forEach(input => {
        const mdStatus = input.dataset.mdStatus;
        const stage = input.dataset.stage;
        const category = input.dataset.category;
        const value = parseInt(input.value) || 0;
        
        const templateKey = `template_${mdStatus}`;
        if (!templateData[templateKey]) {
             templateData[templateKey] = { phase: mdStatus };
        }
        if (!templateData[templateKey][stage]) {
             templateData[templateKey][stage] = {};
        }
        
        templateData[templateKey][stage][category] = value;
    });
    return templateData;
}

function collectManualChanges() {
    const manualPlanData = {};
    for (let i = 0; i < 7; i++) {
        const dayPlan = [];
        const dayBlock = document.querySelector(`.task-day-container[data-day-index="${i}"]`);
        
        // Перевіряємо, чи є взагалі згенерований список вправ
        if (!dayBlock || dayBlock.querySelectorAll('.exercise-item').length === 0) continue;

        dayBlock.querySelectorAll('.exercise-item').forEach((item) => {
            const nameInput = item.querySelector('[data-field="name"]');
            const descTextarea = item.querySelector('[data-field="description"]');
            
            dayPlan.push({
                name: nameInput ? nameInput.value : 'Невідома вправа',
                description: descTextarea ? descTextarea.value : '',
                stage: item.dataset.stage,
                category: item.dataset.category,
                videoKey: item.dataset.videokey || ''
            });
        });

        if (dayPlan.length > 0) {
            manualPlanData[`day_plan_${i}`] = {
                exercises: dayPlan
            };
        }
    }
    return manualPlanData;
}


function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    const saveButton = document.querySelector('.save-button');
    try {
        let existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const activityData = {};
        let finalPlanData = {};
        
        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
            activityData[element.name] = element.value;
        });
        
        const templateData = templatesFromUI || collectTemplatesFromUI();
        
        // 1. Очищуємо старі дані про план
        Object.keys(existingData).forEach(key => {
            if (key.startsWith('day_plan_')) {
                 delete existingData[key];
            }
        });
        
        // 2. Зберігаємо дані плану
        if (newWeeklyPlan) {
             // Якщо була генерація (зміна шаблону/циклу) - зберігаємо новий план
             finalPlanData = newWeeklyPlan;
        } else {
             // Якщо збереження викликано вручну (кнопкою "Зберегти")
             finalPlanData = collectManualChanges();
             
             // Додаємо актуальні MD-статуси
             for (let i = 0; i < 7; i++) {
                 if (finalPlanData[`day_plan_${i}`]) {
                     // Беремо актуальний MD-статус з UI, який був розрахований раніше
                     const mdStatusEl = document.querySelector(`#md-title-${i} .md-status-label`);
                     const mdStatus = mdStatusEl ? mdStatusEl.textContent.trim() : 'TRAIN';
                     finalPlanData[`day_plan_${i}`].mdStatus = mdStatus;
                 }
             }
        }
        
        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
        
        if (saveButton) {
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План та Шаблони';
            }, 2000);
        }
    } catch (e) {
        console.error("Помилка при збереженні даних:", e);
    }
}

// =========================================================
// 3. УПРАВЛІННЯ ІНТЕРФЕЙСОМ ШАБЛОНІВ ДНЯ
// =========================================================

function renderDayTemplateInput(dayIndex, mdStatus, savedTemplates) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    
    // Завантажуємо вимоги для цього MD-статусу (шаблон)
    const templateKey = `template_${mdStatus}`;
    const template = savedTemplates[templateKey] || {}; 
    
    let html = `<div class="template-exercise-fields" data-md-status-editor="${mdStatus}">`;
    
    // Ініціалізуємо шаблон, якщо він порожній
    if (Object.keys(template).length === 0) {
         for (const stage of Object.keys(templateStages)) {
             template[stage] = {};
         }
    }

    for (const [stage, categories] of Object.entries(templateStages)) {
        if (mdStatus !== 'REST') {
            html += `<h5 class="template-stage-header">${stage.replace('-', ' ')}</h5>`;
        }
        
        categories.forEach(category => {
            const currentCount = template[stage] && template[stage][category] ? template[stage][category] : 0;
            const inputId = `input_${dayIndex}_${stage.replace(/\s/g, '-')}_${category}`;
            
            const rowStyle = mdStatus === 'REST' ? 'style="display: none;"' : '';

            html += `
                <div class="template-row" ${rowStyle}>
                    <label for="${inputId}">${category}:</label>
                    <input type="number" min="0" max="5" value="${currentCount}" 
                           data-md-status="${mdStatus}" 
                           data-stage="${stage}" 
                           data-category="${category}"
                           data-day-index="${dayIndex}"
                           id="${inputId}"
                           name="${inputId}"
                           class="template-count-input"
                           title="Кількість вправ для категорії ${category} (Шаблон ${mdStatus})"
                    >
                    <span>вправ</span>
                </div>
            `;
        });
    }

    html += `</div>`;
    
    // Очищуємо старі блоки перед додаванням нових
    dayBlock.querySelectorAll('.template-exercise-fields, .generated-exercises-list, .rest-message').forEach(el => el.remove());
    
    dayBlock.innerHTML += html;
    
}

function displayGeneratedExercises(dayIndex, mdStatus, exercises) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    
    dayBlock.querySelectorAll('.generated-exercises-list').forEach(el => el.remove());
    
    const newContainer = document.createElement('div');
    newContainer.className = 'generated-exercises-list'; 

    let html = '<h4>Згенерований план (ручне редагування)</h4>';
    let index = 0;
    
    if (exercises.length === 0 && mdStatus !== 'REST') {
        html += '<p style="color:red;">❗ Немає згенерованих вправ. Перевірте вимоги шаблону вище.</p>';
    } else {
        for (const stage of Object.keys(templateStages)) {
             const stageExercises = exercises.filter(ex => ex.stage === stage);
             
             if (stageExercises.length > 0) {
                 html += `<h5 class="template-stage-header">${stage.replace('-', ' ')} (${stageExercises.length})</h5>`;
             }
             
             stageExercises.forEach((exercise) => {
                 html += `
                    <div class="exercise-item" data-day-index="${dayIndex}" data-stage="${stage}" data-index="${index}" data-category="${exercise.category || ''}" data-videokey="${exercise.videoKey || ''}">
                        <div class="exercise-fields">
                             <label>Назва вправи:</label>
                             <input type="text" value="${exercise.name || ''}" data-field="name">
                             <label>Параметри / Опис:</label>
                             <textarea data-field="description">${exercise.description || ''}</textarea>
                             <div class="exercise-actions">
                                 <button type="button" class="replace-btn" data-stage="${stage}" data-category="${exercise.category || ''}">🔄 Замінити</button>
                                 <button type="button" class="remove-btn">❌ Видалити</button>
                             </div>
                        </div>
                    </div>
                 `;
                 index++;
             });
        }
    }
    newContainer.innerHTML = html;
    dayBlock.appendChild(newContainer);
    
    addExerciseControlListeners(dayBlock);
}

function addExerciseControlListeners(dayBlock) {
    // Слухач для кнопки "Видалити"
    dayBlock.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-item');
            if (item && confirm('Видалити цю вправу зі списку?')) {
                item.remove();
                // Тут ми не викликаємо saveData, оскільки це може бути серія змін. 
                // Збереження відбудеться при submit форми.
            }
        });
    });

    // Слухач для кнопки "Замінити"
    dayBlock.querySelectorAll('.replace-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-item');
            const stage = btn.dataset.stage;
            const category = btn.dataset.category;
            
            if (item && stage && category) {
                // 1. Генеруємо нову вправу
                const newExercises = generateRandomExercises(stage, category, 1);
                if (newExercises.length > 0 && newExercises[0].name !== 'Помилка: Немає вправ у undefined') {
                    const newEx = newExercises[0];
                    
                    // 2. Оновлюємо поля в UI
                    item.querySelector('[data-field="name"]').value = newEx.name;
                    item.querySelector('[data-field="description"]').value = newEx.description;
                    item.dataset.videokey = newEx.videoKey || '';
                    item.dataset.category = category;
                    
                    alert(`Вправу успішно замінено на: ${newEx.name}`);
                } else {
                    alert(`Не вдалося знайти іншу вправу для категорії ${category}. Перевірте exercise_library.js.`);
                }
            }
        });
    });
    
    // Немає потреби у слухачі 'input', оскільки ми збираємо дані при saveData
}


function generateWeeklyPlan(mdStatuses, templates) {
    const weeklyPlan = {};
    const dayIndices = [0, 1, 2, 3, 4, 5, 6];
    
    dayIndices.forEach(dayIndex => {
        const mdStatus = mdStatuses[dayIndex];
        const template = templates[`template_${mdStatus}`];
        const generatedExercises = [];
        
        if (template && mdStatus !== 'REST') {
            for (const [stage, categories] of Object.entries(templateStages)) {
                 if (!template[stage]) continue;

                 categories.forEach(category => {
                     const count = template[stage][category] || 0;
                     if (count > 0) {
                          const randomExercises = generateRandomExercises(stage, category, count);
                          randomExercises.forEach(ex => {
                               generatedExercises.push({
                                    ...ex,
                                    stage: stage,
                                    category: category 
                               });
                          });
                     }
                 });
            }
        }
        
        weeklyPlan[`day_plan_${dayIndex}`] = {
            mdStatus: mdStatus,
            exercises: generatedExercises.sort((a, b) => 
                Object.keys(templateStages).indexOf(a.stage) - Object.keys(templateStages).indexOf(b.stage)
            )
        };

        // Відображаємо згенерований план під полями налаштування
        displayGeneratedExercises(dayIndex, mdStatus, weeklyPlan[`day_plan_${dayIndex}`].exercises);
    });
    
    return weeklyPlan;
}

// =========================================================
// 4. ОСНОВНА ЛОГІКА ЦИКЛУ
// =========================================================

function loadWeeklyPlanDisplay(data) {
    const dayIndices = [0, 1, 2, 3, 4, 5, 6];
    dayIndices.forEach(dayIndex => {
        const planKey = `day_plan_${dayIndex}`;
        const plan = data[planKey];
        
        // MD-статус беремо з UI (він вже був розрахований/завантажений)
        const mdStatusEl = document.querySelector(`#md-title-${dayIndex} .md-status-label`);
        const mdStatus = mdStatusEl ? mdStatusEl.textContent.trim() : 'TRAIN';
        
        if (plan && plan.exercises) {
            displayGeneratedExercises(dayIndex, mdStatus, plan.exercises);
        }
    });
}

function updateCycleColors(shouldGenerate = false) {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    try {
        let activityTypes = Array.from(activitySelects).map(select => select.value);
        let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
        const isPlanActive = activityTypes.includes('MATCH');
        const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
        const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
        
        // --- ЛОГІКА РОЗРАХУНКУ MD-СТАТУСІВ (без змін) ---
        if (isPlanActive) {
            let matchIndices = dayStatuses.map((status, index) => status === 'MD' ? index : -1).filter(index => index !== -1);
            for (const matchIdx of matchIndices) {
                 for (let j = 1; j <= 2; j++) { 
                      const currentIdx = (matchIdx + j) % 7;
                      if (activityTypes[currentIdx] !== 'REST' && dayStatuses[currentIdx] !== 'MD') {
                           if (!dayStatuses[currentIdx].startsWith('MD+')) {
                                dayStatuses[currentIdx] = mdPlusMap[j - 1]; 
                           }
                      }
                 }
            }
            for (const matchIdx of matchIndices) {
                 let currentMDMinus = 0;
                 for (let j = 1; j <= 7; j++) {
                      let i = (matchIdx - j + 7) % 7; 
                      
                      if (activityTypes[i] === 'REST' || dayStatuses[i] === 'MD' || dayStatuses[i].startsWith('MD+')) {
                           break;
                      }
                      
                      if (currentMDMinus < 4) {
                           dayStatuses[i] = mdMinusCycle[currentMDMinus];
                           currentMDMinus++;
                      } else {
                           break;
                      }
                 }
            }
        } else {
             dayStatuses = activityTypes.map(type => (type === 'REST' ? 'REST' : 'TRAIN')); 
        }
        
        // 4. Оновлення відображення MD-статусу
        const currentMdStatuses = [];

        dayCells.forEach((cell, index) => {
             let finalStatusKey = dayStatuses[index] || 'TRAIN'; 
             if (finalStatusKey.startsWith('MD+') && parseInt(finalStatusKey.substring(3)) > 2) {
                  finalStatusKey = 'TRAIN';
             } else if (finalStatusKey.startsWith('MD-') && parseInt(finalStatusKey.substring(3)) > 4) {
                  finalStatusKey = 'TRAIN'; 
             }
             
             currentMdStatuses[index] = finalStatusKey;

             const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
             const mdStatusElement = cell.querySelector('.md-status');
             if (mdStatusElement) {
                 mdStatusElement.textContent = style.status;
                 Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                 mdStatusElement.classList.add(style.colorClass); 
             }
             
             const mdTitleElement = document.getElementById(`md-title-${index}`);
             if (mdTitleElement) {
                 mdTitleElement.innerHTML = `<span class="md-status-label">${style.status}</span> <span class="day-name-label">(${dayNamesShort[index]})</span>`;
             }
        });
        
        // 5. Оновлюємо інтерфейс тепер для кожного дня
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const savedTemplates = {};
        Object.keys(savedData).forEach(key => {
            if (key.startsWith('template_')) {
                savedTemplates[key] = savedData[key];
            }
        });
        
        // Рендеримо поля шаблонів
        dayCells.forEach((cell, index) => {
             renderDayTemplateInput(index, currentMdStatuses[index], savedTemplates);
        });


        // 6. Генерація та відображення плану
        if (shouldGenerate) {
            // Генеруємо новий план, якщо цикл або шаблони змінились
            const templatesFromUI = collectTemplatesFromUI();
            const newWeeklyPlan = generateWeeklyPlan(currentMdStatuses, templatesFromUI);
            saveData(newWeeklyPlan, templatesFromUI);
        } else {
            // Інакше відображаємо попередній згенерований (або вручну змінений) план
            loadWeeklyPlanDisplay(savedData);
        }


    } catch (e) {
        console.error("Критична помилка у updateCycleColors:", e);
    }
}


function loadData() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        let data = {};
        if (savedData) {
             data = JSON.parse(savedData);
        }

        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
             const name = element.name;
             if (data[name] !== undefined) {
                 element.value = data[name];
             }
        });
        
        // Спочатку завантажуємо дані, потім оновлюємо кольори (без генерації)
        updateCycleColors(false); 

    } catch (e) {
        console.error("Помилка при завантаженні даних:", e);
    }
}


// === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const form = document.getElementById('weekly-plan-form');
    
    // 1. СЛУХАЧІ ДЛЯ ВИБОРУ АКТИВНОСТІ
    activitySelects.forEach((select) => { 
         select.addEventListener('change', () => {
             // Зміна активності вважається зміною циклу -> викликаємо генерацію (true)
             updateCycleColors(true); 
         });
    });

    // 2. СЛУХАЧ ДЛЯ РУЧНОГО ЗБЕРЕЖЕННЯ
    form.addEventListener('submit', (e) => {
         e.preventDefault();
         // Явне збереження збирає ручні зміни
         saveData(null, null);
    });
    
    // 3. НОВЕ: ДЕЛЕГУВАННЯ СЛУХАЧІВ ДЛЯ ПОЛІВ ШАБЛОНУ (Виправлення нестабільності)
    // При зміні поля вводу кількості вправ (template-count-input)
    form.addEventListener('change', (e) => {
        if (e.target.classList.contains('template-count-input')) {
            // Викликаємо оновлення циклу та генерацію нового плану
            updateCycleColors(true); 
        }
    });

    loadData();
});
