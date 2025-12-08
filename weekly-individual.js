const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, 
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
        
        // Додаємо заглушки для MD+3/MD+4/MD+5/MD+6, які тепер TRAIN, щоб уникнути помилок в консолі.
        const trainTemplate = 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';
        ['tasks_md_plus_3', 'tasks_md_plus_4', 'tasks_md_plus_5', 'tasks_md_plus_6'].forEach(name => {
             let textarea = document.querySelector(`textarea[name="${name}"]`);
             if (!textarea) {
                const tempDiv = document.createElement('div');
                // Важливо: додаємо display:none; для заглушок
                tempDiv.innerHTML = `<textarea name="${name}" style="display:none;">${trainTemplate}</textarea>`;
                document.body.appendChild(tempDiv.firstChild);
             }
        });
        
        // --- ВИПРАВЛЕННЯ: ПРИХОВУЄМО ВСІ ШАБЛОНИ ВІД КОРИСТУВАЧІВ ---
        document.querySelectorAll('[name^="tasks_md_"]').forEach(el => {
             // Шукаємо батьківський елемент, щоб приховати його (наприклад, div або section)
             let parent = el.closest('div') || el.closest('section') || el.closest('fieldset');
             if (parent) {
                 parent.style.display = 'none';
             } else {
                 el.style.display = 'none';
             }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ 
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        if (status === 'TRAIN' || status.startsWith('MD+3') || status.startsWith('MD+4')) return 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';

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
    // ФУНКЦІЯ: updateCycleColors (ОСНОВНИЙ РОЗРАХУНОК ФАЗ - Версія 4.0)
    // =========================================================
    function updateCycleColors() {
        try {
            let activityTypes = [];
            activitySelects.forEach((select, index) => {
                activityTypes[index] = select.value;
            });
            
            // Ініціалізуємо статуси: MD/REST за вибором, решта TRAIN
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
            const isPlanActive = activityTypes.includes('MATCH');

            // === ОБРОБКА НЕАКТИВНОГО СТАНУ ===
            if (!isPlanActive) {
                // ... (Логіка для неактивного плану) ...
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
            // 1. РОЗРАХУНОК MD+ ФАЗ (Вищий пріоритет: MD+1 та MD+2)
            //    ПОВЕРНУТО ФІКС MD+1/MD+2 (ПН/НД)
            // =========================================================
            for (const matchIdx of matchIndices) {
                for (let j = 1; j <= 2; j++) { // MD+1 та MD+2
                    const currentIdx = (matchIdx + j) % 7;
                    
                    // Якщо день не MD і не REST, встановлюємо MD+
                    if (activityTypes[currentIdx] !== 'REST' && dayStatuses[currentIdx] !== 'MD') {
                         
                        // ГАРАНТУЄМО MD+1 > MD+2, щоб уникнути MD+2, MD+2
                        if (j === 1 || dayStatuses[currentIdx] !== 'MD+1') { 
                            dayStatuses[currentIdx] = mdPlusMap[j - 1]; 
                        }
                    }
                }
            }
            
            // =========================================================
            // 2. РОЗРАХУНОК MD- ФАЗ (Пріоритет: MD- над TRAIN)
            //    ПОВЕРНУТО ПОВНИЙ MD- ЦИКЛ (включаючи Неділю)
            // =========================================================
            
            for (const matchIdx of matchIndices) {
                let currentMDMinus = 0;
                
                // Перевіряємо 7 днів назад від дня перед матчем
                for (let j = 1; j <= 7; j++) {
                    let i = (matchIdx - j + 7) % 7; // Циклічний індекс дня MD-1, MD-2, ...
                    
                    // Якщо зустрічаємо REST або MD, цикл MD- переривається
                    if (activityTypes[i] === 'REST' || dayStatuses[i] === 'MD') {
                        break;
                    }
                    
                    // Тільки MD-1, MD-2, MD-3, MD-4
                    if (currentMDMinus < 4) {
                        // Захист MD+1 та MD+2
                        if (dayStatuses[i] !== 'MD+1' && dayStatuses[i] !== 'MD+2') {
                            // MD- завжди перезаписує TRAIN (включаючи MD+3+)
                            dayStatuses[i] = mdMinusCycle[currentMDMinus];
                        }
                        currentMDMinus++;
                    } else {
                        break;
                    }
                }
            }
            // =========================================================
            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ DOM
            // =========================================================
            dayCells.forEach((cell, index) => {
                let finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                
                // Всі фази MD+3 і вище вважаємо TRAIN для відображення
                if (finalStatusKey.startsWith('MD+') && parseInt(finalStatusKey.substring(3)) > 2) {
                    finalStatusKey = 'TRAIN';
                }

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

    // Важливо: обробник tasks_md_plus_x залишається, щоб редагувати шаблони
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
