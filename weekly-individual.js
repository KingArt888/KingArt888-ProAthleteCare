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

const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

// Допоміжна функція, яка повертає MD-статус дня за його індексом
function getMdStatusByDayIndex(dayIndex) {
    const mdStatusElement = document.querySelector(`#day-status-${dayIndex} .md-status`);
    return mdStatusElement ? mdStatusElement.textContent : 'TRAIN';
}

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // 1. ФУНКЦІЇ ДЛЯ СТРУКТУРОВАНИХ ВПРАВ 
    // =========================================================
    
    function getExerciseHtml(mdStatus, stage, index, exercise = {}) {
        // ID тепер базується на MD-статусі, а не на індексі дня
        const stageSlug = stage.replace(/\s/g, '-');
        const idPrefix = `${mdStatus}_${stageSlug}_${index}`;
        
        return `
            <div class="exercise-item" data-md-status="${mdStatus}" data-stage="${stage}" data-index="${index}">
                <div class="exercise-item-header">
                    <span class="exercise-number">${stage} #${index + 1}</span>
                    <button type="button" class="remove-exercise-button" data-md-status="${mdStatus}" data-stage="${stage}" data-index="${index}">✖</button>
                </div>
                
                <div class="exercise-fields">
                    <label for="name-${idPrefix}">Назва вправи:</label>
                    <input type="text" name="ex_name_${idPrefix}" id="name-${idPrefix}" value="${exercise.name || ''}" placeholder="Наприклад: Присідання зі штангою" required>

                    <label for="video-${idPrefix}">Ключ відео (для Firebase):</label>
                    <input type="text" name="ex_video_${idPrefix}" id="video-${idPrefix}" value="${exercise.videoKey || ''}" placeholder="Наприклад: Squat_BS" >

                    <label for="desc-${idPrefix}">Параметри / Опис:</label>
                    <textarea name="ex_desc_${idPrefix}" id="desc-${idPrefix}" placeholder="Наприклад: 3 підходи по 8 повторень, 70% 1RM">${exercise.description || ''}</textarea>
                </div>
            </div>
        `;
    }

    function addExercise(dayIndex, stage, exercise) {
        const mdStatus = getMdStatusByDayIndex(dayIndex);
        const containerId = `exercise-list-${mdStatus}`; // Контейнер тепер прив'язаний до MD-статусу
        const container = document.getElementById(containerId);
        if (!container) return;

        const existingItems = Array.from(container.querySelectorAll(`.exercise-item[data-stage="${stage}"]`));
        const newIndex = existingItems.length;

        const newItem = document.createElement('div');
        newItem.innerHTML = getExerciseHtml(mdStatus, stage, newIndex, exercise);
        
        // Знаходимо правильну кнопку "Додати" для цієї фази в поточному контейнері дня
        const insertionPoint = document.querySelector(`.add-exercise-button[data-day-index="${dayIndex}"][data-stage="${stage}"]`);

        if (insertionPoint) {
            container.insertBefore(newItem.firstElementChild, insertionPoint);
        } else {
            container.appendChild(newItem.firstElementChild);
        }
        
        attachExerciseListeners(mdStatus);
    }
    
    function attachExerciseListeners(mdStatus) {
        const container = document.getElementById(`exercise-list-${mdStatus}`);
        if (!container) return;
        
        // Перепідключаємо слухачі для збереження даних
        container.querySelectorAll('input, textarea').forEach(input => {
            input.removeEventListener('input', saveData);
            input.addEventListener('input', saveData);
        });

        // Перепідключаємо слухачі для видалення вправ
        container.querySelectorAll('.remove-exercise-button').forEach(button => {
            button.onclick = null; 
            button.onclick = (event) => {
                event.preventDefault();
                const item = event.target.closest('.exercise-item');
                if (item) {
                    item.remove();
                    reindexExercises(mdStatus);
                    saveData();
                }
            };
        });
    }
    
    function reindexExercises(mdStatus) {
        const container = document.getElementById(`exercise-list-${mdStatus}`);
        if (!container) return;
        
        const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
        
        stages.forEach(stage => {
            let stageIndex = 0;
            container.querySelectorAll(`.exercise-item[data-stage="${stage}"]`).forEach((item) => {
                
                item.dataset.index = stageIndex;
                item.querySelector('.exercise-number').textContent = `${stage} #${stageIndex + 1}`;
                
                const stageSlug = stage.replace(/\s/g, '-');
                const idPrefix = `${mdStatus}_${stageSlug}_${stageIndex}`;
                
                item.querySelectorAll('input, textarea').forEach(input => {
                    const nameParts = input.name.split('_');
                    const fieldType = nameParts[1]; 
                    input.name = `ex_${fieldType}_${idPrefix}`;
                    input.id = `${fieldType}-${idPrefix}`;
                });
                
                item.querySelector('.remove-exercise-button').dataset.index = stageIndex;
                stageIndex++;
            });
        });
    }


    // Додаємо обробники для нових кнопок "Додати вправу"
    document.querySelectorAll('.add-exercise-button').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); 
            const dayIndex = event.target.dataset.dayIndex;
            const stage = event.target.dataset.stage;
            
            addExercise(dayIndex, stage, {
                name: '',
                videoKey: '',
                description: ''
            });
            saveData();
        });
    });


    // =========================================================
    // 2. ФУНКЦІЇ МІКРОЦИКЛУ ТА ДІЙ 
    // =========================================================

    function updateCycleColors() {
        try {
            // 1. Збір поточних типів активності (MD, TRAIN, REST)
            let activityTypes = Array.from(activitySelects).map(select => select.value);
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
            const isPlanActive = activityTypes.includes('MATCH');

            // Якщо матчів немає
            if (!isPlanActive) {
                dayCells.forEach((cell, index) => {
                     const finalStatusKey = activityTypes[index] === 'REST' ? 'REST' : 'TRAIN';
                     const mdStatusElement = cell.querySelector('.md-status');
                     const style = COLOR_MAP[finalStatusKey];
                     
                     mdStatusElement.textContent = style.status;
                     Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                     mdStatusElement.classList.add(style.colorClass); 
                     cell.title = `Фаза: ${style.status}`; 
                 });
                 // Після оновлення кольорів оновлюємо контейнери
                 updateExerciseContainers(dayStatuses.map(s => s || 'TRAIN'));
                 return; 
            }

            // 2. Логіка розрахунку MD+
            const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
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
            
            // 3. Логіка розрахунку MD-
            const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
            
            for (const matchIdx of matchIndices) {
                 let currentMDMinus = 0;
                 
                 for (let j = 1; j <= 7; j++) {
                      let i = (matchIdx - j + 7) % 7; 
                      
                      if (activityTypes[i] === 'REST' || dayStatuses[i] === 'MD') {
                           break;
                      }
                      
                      if (currentMDMinus < 4) {
                           if (!dayStatuses[i].startsWith('MD+')) {
                                dayStatuses[i] = mdMinusCycle[currentMDMinus];
                           }
                           currentMDMinus++;
                      } else {
                           break;
                      }
                 }
            }
            
            // 4. Оновлення відображення та контейнерів
            dayCells.forEach((cell, index) => {
                 let finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                 
                 // Обмеження MD-статусу
                 if (finalStatusKey.startsWith('MD+') && parseInt(finalStatusKey.substring(3)) > 2) {
                      finalStatusKey = 'TRAIN';
                 } else if (finalStatusKey.startsWith('MD-') && parseInt(finalStatusKey.substring(3)) > 4) {
                      finalStatusKey = 'TRAIN'; 
                 }

                 const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
                 const mdStatusElement = cell.querySelector('.md-status');

                 if (mdStatusElement) {
                     mdStatusElement.textContent = style.status;
                     Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                     mdStatusElement.classList.add(style.colorClass); 
                     cell.title = `Фаза: ${style.status}`; 
                 }
            });

            updateExerciseContainers(dayStatuses.map(s => s || 'TRAIN'));

        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }

    // НОВА ФУНКЦІЯ: Динамічно змінює ID контейнерів та завантажує відповідні вправи
    function updateExerciseContainers(newMdStatuses) {
        const dayIndices = [0, 1, 2, 3, 4, 5, 6];
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        dayIndices.forEach(dayIndex => {
            const currentDayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
            if (!currentDayBlock) return;
            
            const newMdStatus = newMdStatuses[dayIndex];
            const oldContainer = currentDayBlock.querySelector('.exercise-list-container');
            
            // Якщо контейнер вже існує і має правильний ID, нічого не робимо
            if (oldContainer && oldContainer.id === `exercise-list-${newMdStatus}`) {
                return;
            }
            
            // 1. Створюємо новий контейнер з ID, прив'язаним до MD-статусу
            const newContainer = document.createElement('div');
            newContainer.className = 'exercise-list-container';
            newContainer.id = `exercise-list-${newMdStatus}`; // Динамічний ID

            // 2. Завантажуємо вправи для цього MD-статусу
            const planKey = `structured_plan_${newMdStatus}`;
            const exercisesToLoad = (savedData[planKey] && savedData[planKey].exercises) || [];
            
            // 3. Заповнюємо новий контейнер вправами
            exercisesToLoad.forEach(exercise => {
                const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
                stages.forEach(stage => {
                     if (exercise.stage === stage) {
                          const newItem = document.createElement('div');
                          // Використовуємо 0 як тимчасовий індекс, reindexExercises виправить його
                          newItem.innerHTML = getExerciseHtml(newMdStatus, exercise.stage, 0, exercise);
                          newContainer.appendChild(newItem.firstElementChild);
                     }
                });
            });
            
            // 4. Замінюємо старий контейнер новим
            if (oldContainer) {
                 currentDayBlock.replaceChild(newContainer, oldContainer);
            } else {
                 // Вставляємо перед першою кнопкою "Додати"
                 const firstAddButton = currentDayBlock.querySelector('.add-exercise-button');
                 if (firstAddButton) {
                      currentDayBlock.insertBefore(newContainer, firstAddButton);
                 }
            }
            
            // 5. Переіндексовуємо та прив'язуємо слухачі
            reindexExercises(newMdStatus);
            attachExerciseListeners(newMdStatus);
        });
    }


    // =========================================================
    // 3. ФУНКЦІЇ ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ
    // =========================================================

    function saveData() {
        try {
            const structuredPlanData = {};

            // 1. Збираємо унікальні MD-статуси
            const uniqueMdStatuses = new Set();
            document.querySelectorAll('#md-colors-row .md-status').forEach(el => {
                uniqueMdStatuses.add(el.textContent);
            });
            
            const allMdStatuses = Array.from(uniqueMdStatuses).filter(s => s);
            
            // Збираємо вправи, групуючи їх за MD-статусом
            allMdStatuses.forEach(mdStatus => {
                const dayExercises = [];
                const containerId = `exercise-list-${mdStatus}`;
                const container = document.getElementById(containerId);
                if (!container) return; 

                // Збираємо всі елементи, які мають цей MD-статус у своєму data-атрибуті
                container.querySelectorAll(`.exercise-item[data-md-status="${mdStatus}"]`).forEach(item => {
                    const stage = item.dataset.stage;
                    
                    const nameInput = item.querySelector('[name^="ex_name_"]');
                    const videoInput = item.querySelector('[name^="ex_video_"]');
                    const descInput = item.querySelector('[name^="ex_desc_"]');

                    if (nameInput && nameInput.value.trim() !== '') {
                        dayExercises.push({
                            stage: stage,
                            name: nameInput.value.trim(),
                            videoKey: (videoInput ? videoInput.value.trim() : ''),
                            description: (descInput ? descInput.value.trim() : '')
                        });
                    }
                });
                
                // Зберігаємо план під ключем MD-статусу, тільки якщо є вправи
                if (dayExercises.length > 0) {
                   structuredPlanData[`structured_plan_${mdStatus}`] = {
                       phase: mdStatus,
                       exercises: dayExercises 
                   };
                } else {
                   // Якщо вправ немає, видаляємо старий ключ, щоб не зберігати порожні плани
                   delete localStorage.getItem(STORAGE_KEY, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[`structured_plan_${mdStatus}`]);
                }
            });
            
            // 2. Зберігаємо типи активності окремо (для таблиці)
            const activityData = {};
            document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
                activityData[element.name] = element.value;
            });
            
            // Зберігаємо обидва типи даних
            const combinedData = { ...activityData, ...structuredPlanData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
            
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }

    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let data = {};
            if (savedData) {
                 data = JSON.parse(savedData);
            }

            // 1. Завантажуємо типи активності для таблиці
            document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
                 const name = element.name;
                 if (data[name] !== undefined) {
                     element.value = data[name];
                 }
            });
            
            // 2. Обчислюємо кольори (MD-статуси) та завантажуємо вправи
            updateCycleColors(); 
            // updateExerciseContainers викликається всередині updateCycleColors

        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    activitySelects.forEach((select) => { 
         select.addEventListener('change', () => {
             updateCycleColors(); 
             saveData();
         });
    });

    form.addEventListener('submit', (e) => {
         e.preventDefault();
         saveData(); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    loadData();
});
