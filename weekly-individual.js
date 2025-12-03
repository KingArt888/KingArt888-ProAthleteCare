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
    'TRAIN': { status: 'TRAIN', colorClass: 'color-neutral' },
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
    
    // Допоміжна функція для отримання індексу дня з імені поля
    function getDayIndexFromName(name) {
        const indexNumMatch = name.match(/_(\d+)/);
        if (indexNumMatch) {
            return parseInt(indexNumMatch[1], 10);
        }
        return -1;
    }

    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (Використовує localStorage)
    // =========================================================
    function saveData() {
        try {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти зміни';
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
            { name: 'tasks_md_plus_2', defaultText: 
                `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).
2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).
3. **Легкий Стретчинг (статичний):** 15 хв.
4. **Гідратація:** Посилений контроль водного балансу.`
            },
            { name: 'tasks_md_plus_1', defaultText: 
                `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.
2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).
3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).
4. **Харчування:** Підвищене споживання білка та вуглеводів.`
            },
            { name: 'tasks_md_minus_4', defaultText: 
                `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).
2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.
3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).`
            },
            { name: 'tasks_md_minus_3', defaultText: 
                `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).
2. **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.
3. **Координація:** 10 хв (координаційні драбини).`
            },
            { name: 'tasks_md_minus_2', defaultText: 
                `1. **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).
2. **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.
3. **Ролінг:** 10 хв (для підтримки еластичності).`
            },
            { name: 'tasks_md_minus_1', defaultText: 
                `1. **Нейро активація:** 10 хв (сходи, реакція).
2. **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).
3. **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).`
            }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ (Коректна обробка MD-фаз)
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        if (status === 'TRAIN') return 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';

        let fieldName = '';
        // Регулярний вираз для безпечного отримання числа з MD+X або MD-X
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

        // Додаємо заголовок фази перед шаблоном
        const phaseTitle = `**Фаза: ${status}**\n`;
        return phaseTitle + templateElement.value.trim();
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Заборона введення для відпочинку/матчу)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const isDisabledOverall = !isPlanActive;
            const currentDayIndexStr = dayIndex.toString();
            
            // 1. Поле щоденного завдання
            const dailyTaskField = document.querySelector(`[name="daily_task_${currentDayIndexStr}"]`);
            if (dailyTaskField) {
                 const shouldDisable = (activityType === 'REST' && isPlanActive);
                 dailyTaskField.disabled = shouldDisable;
                 if (shouldDisable) {
                     dailyTaskField.classList.add('day-disabled');
                 } else {
                     dailyTaskField.classList.remove('day-disabled');
                 }
            }

            // 2. Поля деталей матчу (Суперник, Місце, Дистанція)
            const fieldPrefixesToDisable = [
                'opponent', 'venue', 'travel_km' 
            ];
            
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${currentDayIndexStr}"]`);
                if (element) {
                     let shouldBeDisabled = (isDisabledOverall || activityType !== 'MATCH');
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
    // ФУНКЦІЯ: updateMatchDetails (Додавання/видалення блоку деталей матчу)
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
            
            // Завантаження збережених значень для select
            const venueSelect = document.getElementById(`venue-${dayIndex}`);
            if (venueSelect && savedValues[`venue_${dayIndex}`]) {
                venueSelect.value = savedValues[`venue_${dayIndex}`];
            }
        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
        
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="MATCH"]').length > 0;
        if (dayIndex !== -1) {
            toggleDayInputs(dayIndex, activityType, isPlanActive);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: loadData (Завантаження даних)
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (!savedData) return;

            const data = JSON.parse(savedData);
            let matchDetailsData = {};

            Object.keys(data).forEach(name => {
                const element = form.querySelector(`[name="${name}"]`);
                if (element) {
                    element.value = data[name];
                    
                    if (name.startsWith('opponent_') || name.startsWith('venue_') || name.startsWith('travel_km_')) {
                        matchDetailsData[name] = data[name];
                    }
                }
            });

            // Створюємо блоки деталей матчу після завантаження активності
            activitySelects.forEach((select, index) => {
                const activityType = select.value;
                updateMatchDetails(index, activityType, matchDetailsData);
            });


        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: updateCycleColors (Виправлений розрахунок MD-фаз)
    // =========================================================
    function updateCycleColors() {
        try {
            let activityTypes = [];
            let matchDays = [];

            activitySelects.forEach((select, index) => {
                activityTypes[index] = select.value;
                if (select.value === 'MATCH') {
                    matchDays.push(index); 
                }
            });
            
            const isPlanActive = matchDays.length > 0;
            let dayStatuses = new Array(7).fill('TRAIN'); 
            
            // 1. MD CALCULATION (Strict 7-day cycle for a single match)
            if (matchDays.length === 1) {
                const mdIndex = matchDays[0];
                // Фіксована послідовність MD-фаз: MD, MD+1, MD+2, MD-4, MD-3, MD-2, MD-1
                const cycleMap = ['MD', 'MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1']; 

                dayCells.forEach((cell, index) => {
                    // Розрахунок циклічного зміщення, починаючи з mdIndex
                    const cycleOffset = (index - mdIndex + 7) % 7; 
                    dayStatuses[index] = cycleMap[cycleOffset];
                });

            } else {
                // For multiple matches or no matches: TRAIN/MD fallback 
                // (оскільки логіка для 2+ матчів дуже специфічна та не була повністю уточнена)
                dayCells.forEach((cell, index) => {
                    if (activityTypes[index] === 'MATCH') {
                        dayStatuses[index] = 'MD';
                    } else {
                        dayStatuses[index] = 'TRAIN';
                    }
                });
            }


            // 2. APPLY REST/TRAIN OVERRIDES (Вихідний день та перезапуск відліку)
            let finalStatuses = [...dayStatuses];
            let restEncountered = false;

            for (let i = 0; i < 7; i++) {
                const currentActivity = activityTypes[i];
                
                if (currentActivity === 'REST') {
                    finalStatuses[i] = 'REST';
                    restEncountered = true;
                    continue; // Переходимо до наступного дня
                }
                
                // Rule: "Відлік починається від наступної гри" після вихідного
                if (restEncountered && currentActivity !== 'MATCH') {
                    // Знаходимо всі матчі, які будуть після поточного дня 'i'
                    const upcomingMDs = matchDays.filter(md => md > i);
                    
                    if (upcomingMDs.length > 0) {
                        const nearestNextMDIndex = Math.min(...upcomingMDs);
                        const daysToNextMD = nearestNextMDIndex - i; 
                        
                        if (daysToNextMD >= 1 && daysToNextMD <= 4) {
                            // Якщо до матчу менше 4 днів, застосовуємо MD-фазу
                            finalStatuses[i] = `MD-${daysToNextMD}`;
                        } else {
                            finalStatuses[i] = 'TRAIN'; 
                        }
                    } else {
                        finalStatuses[i] = 'TRAIN'; // Немає більше матчів після REST
                    }
                }
                
                // Скидаємо прапорець, якщо натрапляємо на Матч
                if (currentActivity === 'MATCH') {
                    restEncountered = false;
                }
            }


            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА АВТОЗАПОВНЕННЯ ПОЛІВ
            dayCells.forEach((cell, index) => {
                const mdStatusElement = cell.querySelector('.md-status');
                
                const statusKey = finalStatuses[index] || 'TRAIN'; 
                const currentActivity = activitySelects[index].value;
                
                const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];
                mdStatusElement.textContent = style.status;
                
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 

                cell.title = `Фаза: ${style.status}`; 

                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                
                if (dailyTaskField) {
                    const templateText = getTemplateText(statusKey);
                    const currentTaskValue = dailyTaskField.value.trim();
                    
                    // Перевіряємо, чи поточний текст є одним із загальних (не редагованих) шаблонів
                    const isGenericTemplate = currentTaskValue === 'Загальнокомандне тренування: Специфічні вправи вводити вручну.' ||
                                              currentTaskValue === 'Матч: Індивідуальна розминка/завершення гри' ||
                                              currentTaskValue === 'Повний відпочинок, відновлення, сон.' ||
                                              currentTaskValue.includes('**Фаза: MD'); // Всі автозгенеровані MD-фази

                    // Логіка оновлення
                    if (statusKey === 'MD' || statusKey === 'REST' || (!isPlanActive && statusKey === 'TRAIN')) {
                         // Для MD, REST або TRAIN без плану - завжди встановлюємо фіксований шаблон
                         dailyTaskField.value = templateText;
                    } 
                    else if (templateText && (currentTaskValue === '' || isGenericTemplate)) {
                         // Для MD+X/MD-X - заповнюємо шаблоном лише якщо поле порожнє АБО містить старий, загальний шаблон.
                         dailyTaskField.value = templateText;
                    }
                    // Якщо поле містить відредагований текст, ми його НЕ чіпаємо.
                }
            });
        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    document.querySelectorAll('#recovery-details-container textarea').forEach(textarea => {
        // Оновлюємо кольори, щоб MD-фази могли автозаповнитись, якщо шаблони були змінені
        textarea.addEventListener('input', updateCycleColors);
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveData();
    });

    // Обробники для полів вводу, щоб вони зберігалися при зміні
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name !== 'travel_km_0' && !input.name.startsWith('tasks_md_')) {
            // Зберігаємо дані при зміні будь-якого поля, крім шаблонів
            input.addEventListener('change', saveData);
            input.addEventListener('input', saveData);
        }
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates();
    loadData();
    updateCycleColors();
});
