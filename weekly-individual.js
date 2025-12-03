const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, // Базовий тренувальний день
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

document.addEventListener('DOMContentLoaded', () => {
    
    // === ІНІЦІАЛІЗАЦІЯ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ 
    // =========================================================
    function saveData() {
        try {
            const data = {};
            
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                data[name] = element.value;
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ 
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).\n2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).\n3. **Легкий Стретчинг (статичний):** 15 хв.\n4. **Гідратація:** Посилений контроль водного балансу.` },
            { name: 'tasks_md_plus_3', defaultText: `1. **Загальне Командне Тренування:** Фокус на техніку/тактику.\n2. **Індивідуальна робота:** Легка аеробна активність (15-20 хв).` },
            { name: 'tasks_md_plus_1', defaultText: `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.\n2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).\n3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).\n4. **Харчування:** Підвищене споживання білка та вуглеводів.` },
            { name: 'tasks_md_minus_4', defaultText: `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).\n2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.\n3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).` },
            { name: 'tasks_md_minus_3', defaultText: `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).\n2. **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.\n3. **Координація:** 10 хв (координаційні драбини).` },
            { name: 'tasks_md_minus_2', defaultText: `1. **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).\n2. **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.\n3. **Ролінг:** 10 хв (для підтримки еластичності).` },
            { name: 'tasks_md_minus_1', defaultText: `1. **Нейро активація:** 10 хв (сходи, реакція).\n2. **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).\n3. **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).` }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ 
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        if (status === 'TRAIN') return 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';

        let fieldName = '';
        const numberMatch = status.match(/(\d+)/); 

        if (!numberMatch) {
            return '';
        }

        const phaseNumber = numberMatch[1]; 

        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${phaseNumber}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${phaseNumber}`;
        } else {
            return '';
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);

        if (!templateElement) {
            console.error(`Помилка: Не знайдено textarea з іменем: ${fieldName}`); 
            return '';
        }

        const phaseTitle = `**Фаза: ${status}**\n`;
        return phaseTitle + templateElement.value.trim();
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Управління активністю полів)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const dailyTaskField = document.querySelector(`[name="daily_task_${dayIndex}"]`);
            
            if (dailyTaskField) {
                 let shouldDisable = true;
                 
                 if (activityType === 'MATCH') {
                     shouldDisable = false;
                 } else if (activityType === 'REST') {
                     shouldDisable = true;
                 } else if (isPlanActive) {
                      shouldDisable = false;
                 }

                 dailyTaskField.disabled = shouldDisable;
                 
                 if (shouldDisable) {
                     dailyTaskField.classList.add('day-disabled');
                     if (!isPlanActive) {
                         dailyTaskField.value = 'Оберіть МАТЧ для активації планування.';
                     }
                 } else {
                     dailyTaskField.classList.remove('day-disabled');
                     if (dailyTaskField.value === 'Оберіть МАТЧ для активації планування.') {
                         dailyTaskField.value = ''; 
                     }
                 }
            }

            const fieldPrefixesToDisable = ['opponent', 'venue', 'travel_km'];
            
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${dayIndex}"]`);
                if (element) {
                     const shouldBeDisabled = (activityType !== 'MATCH');
                     element.disabled = shouldBeDisabled;
                     
                     if (shouldBeDisabled) {
                         element.classList.add('day-disabled');
                     } else {
                         element.classList.remove('day-disabled');
                     }
                }
            });
        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: updateMatchDetails
    // =========================================================
    function updateMatchDetails(dayIndex, activityType, savedValues = {}) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && dynamicMatchFields && !existingBlock && dayIndex !== -1) {
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>День ${dayIndex * 1 + 1}: ${dayName} (Матч)</h4>
                    <label for="opponent-${dayIndex}">Суперник:</label>
                    <input type="text" name="opponent_${dayIndex}" id="opponent-${dayIndex}" value="${savedValues[`opponent_${dayIndex}`] || ''}" required>
                    <label for="venue-${dayIndex}">Місце проведення:</label>
                    <select name="venue_${dayIndex}" id="venue-${dayIndex}">
                        <option value="Home">Вдома</option>
                        <option value="Away">На виїзді</option>
                    </select>
                    <label for="travel-km-${dayIndex}">Відстань поїздки (км):</label>
                    <input type="number" name="travel_km_${dayIndex}" id="travel-km-${dayIndex}" value="${savedValues[`travel_km_${dayIndex}`] || '0'}" min="0">
                </div>
            `;
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
            
            const venueSelect = document.getElementById(`venue-${dayIndex}`);
            if (venueSelect && savedValues[`venue_${dayIndex}`]) {
                venueSelect.value = savedValues[`venue_${dayIndex}`];
            }

            document.querySelectorAll(`.match-detail-block[data-day-index="${dayIndex}"] input, .match-detail-block[data-day-index="${dayIndex}"] select`).forEach(input => {
                input.addEventListener('change', saveData); 
                input.addEventListener('input', saveData);
            });

        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
    }

    // =========================================================
    // ФУНКЦІЯ: loadData
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let data = {};
            if (savedData) {
                data = JSON.parse(savedData);
            }

            let matchDetailsData = {};

            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                 const name = element.name;
                 if (data[name] !== undefined) {
                     element.value = data[name];
                    
                    if (name.startsWith('opponent_') || name.startsWith('venue_') || name.startsWith('travel_km_')) {
                        matchDetailsData[name] = data[name];
                    }
                 }
            });

            activitySelects.forEach((select, index) => {
                const activityType = select.value;
                updateMatchDetails(index, activityType, matchDetailsData);
            });


        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: updateCycleColors (ОСНОВНИЙ РОЗРАХУНОК ФАЗ - Версія 3.3)
    // =========================================================
    function updateCycleColors() {
        try {
            let activityTypes = [];
            activitySelects.forEach((select, index) => {
                activityTypes[index] = select.value;
            });
            
            // Ініціалізуємо статуси відповідно до вибору користувача (MD, REST або TRAIN/MATCH)
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : type)); 
            const isPlanActive = activityTypes.includes('MATCH');

            // === ОБРОБКА НЕАКТИВНОГО СТАНУ ===
            if (!isPlanActive) {
                dayCells.forEach((cell, index) => {
                    const finalStatusKey = activityTypes[index] === 'REST' ? 'REST' : 'TRAIN';
                    const mdStatusElement = cell.querySelector('.md-status');
                    const style = COLOR_MAP[finalStatusKey];
                    mdStatusElement.textContent = style.status;
                    
                    Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                    mdStatusElement.classList.add(style.colorClass); 
                    cell.title = `Фаза: ${style.status}`; 

                    toggleDayInputs(index, activityTypes[index], false);
                    
                    const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                    if (dailyTaskField && (dailyTaskField.value.trim() === '' || dailyTaskField.value.includes('Фаза: MD') || dailyTaskField.value.includes('Загальнокомандне тренування'))) {
                         dailyTaskField.value = getTemplateText(finalStatusKey);
                    }
                });
                return; 
            }
            // ===============================================

            const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
            const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
            
            let matchIndices = dayStatuses.map((status, index) => status === 'MD' ? index : -1).filter(index => index !== -1);


            // =========================================================
            // 1. РОЗРАХУНОК MD+ ФАЗ (Вперед від кожного MD)
            //    Включає фікс для коректного wrap-around (daysAfterMatch)
            // =========================================================
            let lastMatchIndex = -1;
            for (let i = 0; i < 7; i++) {
                
                // Знаходимо індекс наступного матчу (для перевірки MD- зони)
                let nextMatchIndex = matchIndices.find(index => index > i);
                if (nextMatchIndex === undefined) {
                     nextMatchIndex = matchIndices.length > 0 ? matchIndices[0] + 7 : 7;
                }
                
                if (dayStatuses[i] === 'MD') {
                    lastMatchIndex = i;
                } else if (activityTypes[i] === 'REST') { 
                    lastMatchIndex = -1; 
                    dayStatuses[i] = 'REST'; 
                } else if (lastMatchIndex !== -1) {
                    
                    // Обчислення daysAfterMatch з урахуванням обгортання (wrap-around)
                    // (i - lastMatchIndex) може бути від'ємним, тому додаємо 7 та беремо modulo
                    let daysAfterMatch = (i - lastMatchIndex + 7) % 7; 

                    if (daysAfterMatch === 0) continue; 
                    
                    if (daysAfterMatch <= 2) {
                         // MD+1 та MD+2
                        dayStatuses[i] = mdPlusMap[daysAfterMatch - 1]; 
                    } else if (daysAfterMatch <= mdPlusMap.length) {
                        
                        let daysUntilNextMatch = nextMatchIndex - i; 
                        if (daysUntilNextMatch <= 0) { 
                            daysUntilNextMatch += 7;
                        }

                        // Якщо до наступної гри залишилося 4 дні або менше, готуємо слот для MD-
                        if (daysUntilNextMatch <= 4) { 
                             dayStatuses[i] = 'TRAIN';
                        } else {
                             dayStatuses[i] = mdPlusMap[daysAfterMatch - 1]; 
                        }
                    } else {
                        // Кінець циклу MD+
                        dayStatuses[i] = 'TRAIN';
                    }
                } else {
                     // Дні перед першим матчем або після REST початково TRAIN
                     dayStatuses[i] = 'TRAIN';
                }
            }


            // =========================================================
            // 2. РОЗРАХУНОК MD- ФАЗ (Назад від кожного MD)
            //    Включає фікс для коректного скидання при кількох матчах.
            // =========================================================
            if (matchIndices.length > 0) {
                
                let lastMatchIdx = matchIndices[matchIndices.length - 1]; // Індекс останнього MD
                let currentMDMinus = 0;
                
                // Проходимо назад 7 днів, починаючи з дня перед останнім MD
                for (let j = lastMatchIdx - 1; j > lastMatchIdx - 8; j--) {
                    let i = (j % 7 + 7) % 7; // Циклічний індекс
                    
                    // 1. Пріоритет: Користувацький REST завжди перериває цикл
                    if (activityTypes[i] === 'REST') {
                        currentMDMinus = -1; 
                        dayStatuses[i] = 'REST'; 
                        continue;
                    }
                    
                    // 2. Пріоритет: Наступний MD (попередній у зворотному циклі) скидає лічильник MD-
                    // Якщо ми зустрічаємо інший MD (який був у Pass 1), це початок його MD- циклу
                    if (dayStatuses[i] === 'MD' && i !== lastMatchIdx) {
                        currentMDMinus = 0; 
                        continue;
                    }

                    // 3. ПРИЗНАЧЕННЯ MD- ФАЗ
                    if (currentMDMinus >= 0 && currentMDMinus < 4) { // MD- цикл 4 дні
                        
                        // MD+1 та MD+2 захищені (вищий пріоритет)
                        if (dayStatuses[i] !== 'MD+1' && dayStatuses[i] !== 'MD+2') {
                            dayStatuses[i] = mdMinusCycle[currentMDMinus];
                        }
                        currentMDMinus++;
                    }
                }
            }
            
            // =========================================================
            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ DOM
            // =========================================================
            dayCells.forEach((cell, index) => {
                const finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                const currentActivity = activityTypes[index]; 
                
                const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
                const mdStatusElement = cell.querySelector('.md-status');

                mdStatusElement.textContent = style.status;
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 
                cell.title = `Фаза: ${style.status}`; 

                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                if (dailyTaskField) {
                    const templateText = getTemplateText(finalStatusKey);
                    const currentTaskValue = dailyTaskField.value.trim();
                    const isGenericTemplate = currentTaskValue === 'Загальнокомандне тренування: Специфічні вправи вводити вручну.' ||
                                                 currentTaskValue === 'Матч: Індивідуальна розминка/завершення гри' ||
                                                 currentTaskValue === 'Повний відпочинок, відновлення, сон.' ||
                                                 currentTaskValue.includes('**Фаза: MD'); 

                    if (templateText && (currentTaskValue === '' || isGenericTemplate)) {
                         dailyTaskField.value = templateText;
                    }
                }
            });
        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ (без змін) ===
    
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndexElement = event.target.closest('td');
            if (!dayIndexElement || dayIndexElement.dataset.dayIndex === undefined) return;
            
            const dayIndex = parseInt(dayIndexElement.dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
            saveData();
        });
    });

    document.querySelectorAll('[name^="tasks_md_"]').forEach(textarea => { 
        textarea.addEventListener('input', updateCycleColors);
        textarea.addEventListener('change', saveData); 
    });
    
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name.startsWith('activity_')) {
            return;
        }

        input.addEventListener('change', saveData);
        input.addEventListener('input', saveData);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveData(); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates();
    loadData();
    updateCycleColors();
});
