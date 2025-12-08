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


// --- ФУНКЦІЇ ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ (ВИПРАВЛЕННЯ: ПЕРЕМІЩЕНО ВГОРУ ДЛЯ УНИКНЕННЯ REFERENCEERROR) ---

function collectTemplatesFromUI() {
    const templateData = {};
    document.querySelectorAll('.template-category-button').forEach(button => {
        const mdStatus = button.dataset.mdStatus;
        const stage = button.dataset.stage;
        const category = button.dataset.category;
        const value = parseInt(button.dataset.count) || 0;
        
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
        
        if (!dayBlock || dayBlock.querySelectorAll('.exercise-item').length === 0) continue;

        dayBlock.querySelectorAll('.exercise-item').forEach((item) => {
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
        
        // Видаляємо старі плани, щоб уникнути дублювання
        Object.keys(existingData).forEach(key => {
            if (key.startsWith('day_plan_')) {
                 delete existingData[key];
            }
        });
        
        if (newWeeklyPlan) {
             finalPlanData = newWeeklyPlan;
        } else {
             // Зберігаємо ручні зміни, якщо не було перегенерації
             finalPlanData = collectManualChanges();
             
             for (let i = 0; i < 7; i++) {
                 if (finalPlanData[`day_plan_${i}`]) {
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

function loadWeeklyPlanDisplay(data) {
    const dayIndices = [0, 1, 2, 3, 4, 5, 6];
    dayIndices.forEach(dayIndex => {
        const planKey = `day_plan_${dayIndex}`;
        const plan = data[planKey];
        
        const mdStatusEl = document.querySelector(`#md-title-${dayIndex} .md-status-label`);
        const mdStatus = mdStatusEl ? mdStatusEl.textContent.trim() : 'TRAIN';
        
        if (plan && plan.exercises) {
            displayGeneratedExercises(dayIndex, mdStatus, plan.exercises);
        }
    });
}

// =========================================================
// 2. УПРАВЛІННЯ ІНТЕРФЕЙСОМ ШАБЛОНІВ ДНЯ
// =========================================================

function renderDayTemplateInput(dayIndex, mdStatus, savedTemplates) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    
    const templateKey = `template_${mdStatus}`;
    const template = savedTemplates[templateKey] || {}; 
    
    let html = `<div class="template-exercise-fields" data-md-status-editor="${mdStatus}">`;
    
    // Ініціалізація шаблону, якщо він відсутній у збережених даних
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
            const currentCount = (template[stage] && template[stage][category] !== undefined) ? template[stage][category] : 0;
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
                            title="Додати вправу ${category} вручну">
                         +
                    </button>
                </div>
            `;
        });
    }

    html += `</div>`;
    
    dayBlock.querySelectorAll('.template-exercise-fields, .generated-exercises-list, .rest-message').forEach(el => el.remove());
    
    // Виправлення: вставляємо нові елементи в контейнер, щоб уникнути помилки insertBefore/appendChild
    dayBlock.insertAdjacentHTML('afterbegin', html);
    
    addTemplateControlListeners();
}

function addTemplateControlListeners() {
    document.querySelectorAll('.count-control-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dayIndex = e.target.dataset.dayIndex;
            const categoryName = e.target.dataset.category;
            const step = parseInt(e.target.dataset.step);
            
            const templateButton = document.querySelector(`.template-category-button[data-day-index="${dayIndex}"][data-category="${categoryName}"]`);
            
            if (templateButton) {
                let currentCount = parseInt(templateButton.dataset.count);
                let newCount = Math.max(0, Math.min(5, currentCount + step)); 
                
                templateButton.dataset.count = newCount;
                templateButton.innerHTML = `${categoryName} (${newCount})`;
                templateButton.title = `Кількість вправ: ${newCount}. Натисніть для ручного вибору вправ.`;
                
                if (newCount > 0) {
                    templateButton.classList.add('active-template');
                } else {
                    templateButton.classList.remove('active-template');
                }
                
                updateCycleColors(true); 
            }
        });
    });
    
    document.querySelectorAll('.add-manual-exercise-btn, .template-category-button').forEach(btn => {
         btn.addEventListener('click', (e) => {
            // Перевірка, чи не був клік на кнопках +/-
            if (e.target.classList.contains('count-control-btn')) return;
            
            const target = e.target.closest('.template-category-button') || e.target.closest('.add-manual-exercise-btn');
            if (!target) return;
            
            const { dayIndex, mdStatus, stage, category } = target.dataset;
            openExerciseModal(dayIndex, mdStatus, stage, category);
         });
    });
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
        html += '<p style="color:red;">❗ Немає згенерованих вправ. Встановіть кількість вище.</p>';
    } else {
        for (const stage of Object.keys(templateStages)) {
             const stageExercises = exercises.filter(ex => ex.stage === stage);
             
             if (stageExercises.length > 0) {
                 html += `<h5 class="template-stage-header">${stage.replace('-', ' ')} (${stageExercises.length})</h5>`;
             }
             
             stageExercises.forEach((exercise) => {
                 html += `
                    <div class="exercise-item" 
                         data-day-index="${dayIndex}" 
                         data-stage="${stage}" 
                         data-index="${index}" 
                         data-category="${exercise.category || ''}" 
                         data-videokey="${exercise.videoKey || ''}"
                         data-imageurl="${exercise.imageURL || ''}">
                        <div class="exercise-fields">
                             <label>Назва вправи:</label>
                             <input type="text" value="${exercise.name || ''}" data-field="name" onchange="saveData(null, null)">
                             <label>Параметри / Опис:</label>
                             <textarea data-field="description" onchange="saveData(null, null)">${exercise.description || ''}</textarea>
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
    dayBlock.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-item');
            if (item && confirm('Видалити цю вправу зі списку?')) {
                item.remove();
                saveData(null, null); 
            }
        });
    });

    dayBlock.querySelectorAll('.replace-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-item');
            const stage = btn.dataset.stage;
            const category = btn.dataset.category;
            
            if (item && stage && category) {
                const newExercises = generateRandomExercises(stage, category, 1);
                if (newExercises.length > 0) {
                    const newEx = newExercises[0];
                    item.querySelector('[data-field="name"]').value = newEx.name;
                    item.querySelector('[data-field="description"]').value = newEx.description;
                    item.dataset.videokey = newEx.videoKey || '';
                    item.dataset.imageurl = newEx.imageURL || ''; 
                    item.dataset.category = category;
                    
                    alert(`Вправу успішно замінено на: ${newEx.name}`);
                    saveData(null, null); 
                } else {
                    alert(`Не вдалося знайти іншу вправу для категорії ${category}. Перевірте exercise_library.js.`);
                }
            }
        });
    });
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
        
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const manualPlanKey = `day_plan_${dayIndex}`;
        let finalExercises = generatedExercises;
        
        if (savedData[manualPlanKey] && savedData[manualPlanKey].exercises.length > 0) {
            finalExercises = savedData[manualPlanKey].exercises;
        }


        weeklyPlan[manualPlanKey] = {
            mdStatus: mdStatus,
            exercises: finalExercises.sort((a, b) => 
                Object.keys(templateStages).indexOf(a.stage) - Object.keys(templateStages).indexOf(b.stage)
            )
        };

        displayGeneratedExercises(dayIndex, mdStatus, weeklyPlan[manualPlanKey].exercises);
    });
    
    return weeklyPlan;
}

// =========================================================
// 3. ОСНОВНА ЛОГІКА ЦИКЛУ
// =========================================================

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
        
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const savedTemplates = {};
        Object.keys(savedData).forEach(key => {
            if (key.startsWith('template_')) {
                savedTemplates[key] = savedData[key];
            }
        });
        
        dayCells.forEach((cell, index) => {
             renderDayTemplateInput(index, currentMdStatuses[index], savedTemplates);
        });


        if (shouldGenerate) {
            const templatesFromUI = collectTemplatesFromUI();
            const newWeeklyPlan = generateWeeklyPlan(currentMdStatuses, templatesFromUI);
            saveData(newWeeklyPlan, templatesFromUI);
        } else {
            loadWeeklyPlanDisplay(savedData);
        }

    } catch (e) {
        console.error("Критична помилка у updateCycleColors:", e);
    }
}

function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        let data = savedData ? JSON.parse(savedData) : {};

        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
             const name = element.name;
             if (data[name] !== undefined) {
                 element.value = data[name];
             }
        });
        
        updateCycleColors(false); 

    } catch (e) {
        console.error("Помилка при завантаженні даних:", e);
    }
}

// =========================================================
// 4. УПРАВЛІННЯ ВИБОРОМ ВПРАВ (МОДАЛЬНЕ ВІКНО)
// =========================================================

let currentExerciseContext = null; 
let selectedExercises = []; 

function createExerciseHTML(exercise, stage, category) {
    const mediaHint = exercise.videoKey ? 'Відео доступне' : 'Медіа відсутнє';

    return `
        <div class="exercise-select-item" 
             data-name="${exercise.name}" 
             data-description="${exercise.description}" 
             data-videokey="${exercise.videoKey || ''}"
             data-imageurl="${exercise.imageURL || ''}"
             data-stage="${stage}"
             data-category="${category}">
            
            <input type="checkbox" class="exercise-checkbox" id="ex-${Math.random().toString(36).substring(7)}" 
                   data-name="${exercise.name}">
            
            <label for="ex-${Math.random().toString(36).substring(7)}">
                <strong>${exercise.name}</strong> 
                <span class="media-hint">(${mediaHint})</span>
                <p>${exercise.description.substring(0, Math.min(exercise.description.length, 70))}...</p>
            </label>
            
        </div>
    `;
}

function renderExerciseList(exercises) {
    const listContainer = document.getElementById('exercise-list-container');
    const addButton = document.getElementById('add-selected-btn'); 
    if (!listContainer || !addButton) return;
    
    selectedExercises = []; 
    listContainer.innerHTML = ''; 

    if (exercises.length === 0) {
        listContainer.innerHTML = '<p>Не знайдено вправ за цими критеріями. Спробуйте іншу якість.</p>';
        addButton.style.display = 'none';
        return;
    }

    exercises.forEach(ex => {
        listContainer.innerHTML += createExerciseHTML(ex, ex.stage, ex.category);
    });
    
    listContainer.querySelectorAll('.exercise-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const item = e.target.closest('.exercise-select-item');
            const data = item.dataset;

            const exerciseObj = {
                name: data.name,
                description: data.description,
                videoKey: data.videokey,
                imageURL: data.imageurl, 
                stage: data.stage,
                category: data.category
            };

            const index = selectedExercises.findIndex(ex => ex.name === data.name && ex.stage === data.stage && ex.category === data.category);

            if (e.target.checked) {
                if (index === -1) {
                    selectedExercises.push(exerciseObj);
                }
            } else {
                if (index !== -1) {
                    selectedExercises.splice(index, 1);
                }
            }
            
            addButton.textContent = `Додати вибрані (${selectedExercises.length})`;
            addButton.style.display = selectedExercises.length > 0 ? 'block' : 'none';
            
            item.classList.toggle('selected-item', e.target.checked);
        });
    });
    
    addButton.style.display = 'none';
}

function handleSelectionComplete() {
    if (!currentExerciseContext || selectedExercises.length === 0) return;
    
    selectedExercises.forEach(exercise => {
         insertExerciseManually(
            currentExerciseContext.dayIndex,
            currentExerciseContext.mdStatus,
            exercise.stage, 
            exercise.category, 
            exercise
         );
    });
    
    selectedExercises = [];
    closeExerciseModal();
}

function filterExercises(quality) {
    const allExercises = [];

    for (const [s, categories] of Object.entries(EXERCISE_LIBRARY)) {
        for (const [c, data] of Object.entries(categories)) {
            if (data.qualities && data.qualities.includes(quality)) {
                 data.exercises.forEach(ex => {
                     allExercises.push({ ...ex, stage: s, category: c });
                 });
            }
        }
    }
    
    renderExerciseList(allExercises);
}

function insertExerciseManually(dayIndex, mdStatus, stage, category, exercise) {
     const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
     if (!dayBlock) return;
     
     const newExHtml = `
         <div class="exercise-item manual-added" 
              data-day-index="${dayIndex}" 
              data-stage="${stage}" 
              data-category="${category}" 
              data-videokey="${exercise.videoKey || ''}"
              data-imageurl="${exercise.imageURL || ''}">
             <div class="exercise-fields">
                  <label>Назва вправи:</label>
                  <input type="text" value="${exercise.name || ''}" data-field="name" onchange="saveData(null, null)">
                  <label>Параметри / Опис:</label>
                  <textarea data-field="description" onchange="saveData(null, null)">${exercise.description || ''}</textarea>
                  <div class="exercise-actions">
                      <button type="button" class="replace-btn" data-stage="${stage}" data-category="${category}">🔄 Замінити</button>
                      <button type="button" class="remove-btn">❌ Видалити</button>
                  </div>
             </div>
         </div>
     `;

     let targetStageContainer = dayBlock.querySelector(`.generated-exercises-list`);
     
     if (!targetStageContainer) {
          const listContainer = document.createElement('div');
          listContainer.className = 'generated-exercises-list';
          listContainer.innerHTML = '<h4>Згенерований план (ручне редагування)</h4>';
          dayBlock.appendChild(listContainer);
          targetStageContainer = listContainer;
     }
     
     targetStageContainer.insertAdjacentHTML('beforeend', newExHtml);
     
     addExerciseControlListeners(dayBlock); 
     saveData(null, null);
}

function openExerciseModal(dayIndex, mdStatus, stage, category) {
    const modal = document.getElementById('exercise-selection-modal');
    if (!modal) return;
    
    currentExerciseContext = { dayIndex: parseInt(dayIndex), mdStatus, stage, category };
    
    const qualityFilters = document.getElementById('quality-filters');

    // Припускаємо, що QUALITIES визначено у exercise_library.js
    if (typeof QUALITIES !== 'undefined' && QUALITIES.length > 0) {
        qualityFilters.innerHTML = QUALITIES.map(q => 
            `<button type="button" class="quality-filter-btn" data-quality="${q}">${q}</button>`
        ).join('');
    
        qualityFilters.querySelectorAll('.quality-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                 qualityFilters.querySelectorAll('.quality-filter-btn').forEach(b => b.classList.remove('active'));
                 e.target.classList.add('active');
                 filterExercises(e.target.dataset.quality);
            });
        });
    } else {
        qualityFilters.innerHTML = '<p>Фільтри якості недоступні. Перевірте exercise_library.js.</p>';
    }


    const initialCategoryData = EXERCISE_LIBRARY[stage] && EXERCISE_LIBRARY[stage][category] ? 
                             EXERCISE_LIBRARY[stage][category] : { exercises: [] };
    
    const initialExercises = initialCategoryData.exercises.map(ex => ({ ...ex, stage, category }));

    document.getElementById('modal-title-context').textContent = `Вибір вправи: ${stage} / ${category} (День ${dayNamesShort[dayIndex]})`;
    
    renderExerciseList(initialExercises);
    
    const addSelectedBtn = document.getElementById('add-selected-btn');
    if (addSelectedBtn) {
        addSelectedBtn.style.display = 'none'; 
        addSelectedBtn.textContent = 'Додати вибрані (0)';
    }

    modal.style.display = 'flex';
}

function closeExerciseModal() {
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.style.display = 'none';
        currentExerciseContext = null;
        selectedExercises = [];
    }
}


// =========================================================
// 5. ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const form = document.getElementById('weekly-plan-form');
    
    activitySelects.forEach((select) => { 
         select.addEventListener('change', () => {
             updateCycleColors(true); 
         });
    });

    form.addEventListener('submit', (e) => {
         e.preventDefault();
         saveData(null, null);
    });
    
    const addSelectedBtn = document.getElementById('add-selected-btn');
    if (addSelectedBtn) {
        addSelectedBtn.addEventListener('click', handleSelectionComplete);
    }
    
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) {
                closeExerciseModal();
            }
        });
    }

    loadData();
});
