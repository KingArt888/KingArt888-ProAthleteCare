// =========================================================
// weekly-individual.js - V22.0 (ВИПРАВЛЕНО: Повний Код)
// =========================================================

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
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (Вставляє текст за замовчуванням)
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: 'Ролінг (10 хв), Стречінг (15 хв), Мобілізація суглобів' },
            { name: 'tasks_md_plus_1', defaultText: 'Ролінг (10 хв), Мобілізація, Превентивні вправи, Темпова пробіжка після тренування' },
            { name: 'tasks_md_minus_4', defaultText: 'Силова активація до тренувань, Вправи на розвиток вибухової сили' },
            { name: 'tasks_md_minus_3', defaultText: 'Core до тренувань, та спринти після' },
            { name: 'tasks_md_minus_2', defaultText: 'Масаж на ролах, Превентивні вправи, Зал на верхню частину тіла' },
            { name: 'tasks_md_minus_1', defaultText: 'Нейро активація до тренування, Легка ігрова розминка' }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
                // Діагностика: Перевіряємо, чи спрацювало заповнення
                console.log(`[INIT] Заповнено шаблон: ${template.name}`); 
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ (З блоку recovery-details-container)
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        
        let fieldName = '';
        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${status.charAt(3)}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${status.charAt(3)}`;
        } else {
             return ''; 
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        
        if (!templateElement) {
             console.warn(`[DIAGNOSTICS] Шаблон не знайдено для статусу: ${status}. Очікуване ім'я: ${fieldName}`);
             return '';
        }

        const templateText = templateElement.value.trim();
        
        if (templateText === '') {
             console.warn(`[DIAGNOSTICS] Шаблон знайдено (${fieldName}), але він порожній.`);
        } else {
             console.log(`[DIAGNOSTICS] Шаблон знайдено та використано для ${status}.`);
        }
        
        return templateText; 
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Заборона введення для відпочинку/матчу)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const isDisabledOverall = !isPlanActive;
            const currentDayIndexStr = dayIndex.toString();
            
            const fieldPrefixesToDisable = [
                'daily_task', 'tasks', 'cardio', 'opponent', 'venue', 'travel_km'
            ];

            // Перевіряємо лише елементи, які стосуються цього дня
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${currentDayIndexStr}"]`);
                if (element) {
                     let shouldBeDisabled = false;
                     
                     if (isDisabledOverall) {
                         shouldBeDisabled = true; 
                     } else if (activityType === 'REST') {
                         shouldBeDisabled = true; 
                     } else if (activityType !== 'MATCH' && (prefix.startsWith('opponent') || prefix.startsWith('venue') || prefix.startsWith('travel'))) {
                         shouldBeDisabled = true;
                     }
                     
                     element.disabled = shouldBeDisabled;
                     
                     if (shouldBeDisabled) {
                         element.classList.add('day-disabled');
                     } else {
                         element.classList.remove('day-disabled');
                     }
                }
            });
            
            // Заборона для Match Details, якщо вони є
            const opponentField = document.querySelector(`[name="opponent_${currentDayIndexStr}"]`);
            if (opponentField) opponentField.disabled = activityType !== 'MATCH';

        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: resetCycleAfterRest (Перерахунок MD-фаз після дня відпочинку)
    // =========================================================
    function resetCycleAfterRest(days, activityTypes, matchDays) {
        const updatedDays = [...days]; 

        for (let i = 0; i < 7; i++) {
            if (activityTypes[i] === 'REST') {
                
                let nextMatchIndex = -1;
                for (let k = i + 1; k < 7; k++) {
                    if (matchDays.includes(k)) {
                        nextMatchIndex = k;
                        break;
                    }
                }

                if (nextMatchIndex === -1) {
                    continue; 
                }

                for (let j = i + 1; j < nextMatchIndex; j++) { // Змінено: тільки до наступного матчу
                    
                    if (activityTypes[j] === 'REST') {
                         updatedDays[j] = 'REST';
                         continue; 
                    }
                    
                    const offset = nextMatchIndex - j; 
                    
                    if (offset > 0 && offset <= 4) {
                        updatedDays[j] = `MD-${offset}`;
                    } else if (offset > 4) {
                        updatedDays[j] = 'MD-4';
                    }
                }
            }
        }

        return updatedDays;
    }


    // =========================================================
    // ФУНКЦІЯ: updateMatchDetails (Додавання/видалення блоку деталей матчу)
    // =========================================================
    function updateMatchDetails(dayIndex, activityType) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && dynamicMatchFields && !existingBlock) {
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>День ${dayIndex * 1 + 1}: ${dayName} (Матч)</h4>
                    <label>Суперник:</label>
                    <input type="text" name="opponent_${dayIndex}" required>
                    <label>Місце проведення:</label>
                    <select name="venue_${dayIndex}">
                        <option value="Home">Вдома</option>
                        <option value="Away">На виїзді</option>
                    </select>
                    <label>Відстань поїздки (км):</label>
                    <input type="number" name="travel_km_${dayIndex}" value="0" min="0">
                </div>
            `;
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
        
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="MATCH"]').length > 0;
        toggleDayInputs(dayIndex, activityType, isPlanActive);
    }

    // =========================================================
    // ФУНКЦІЯ: saveData (Збереження в LocalStorage)
    // =========================================================
    function saveData() {
        const formData = {};
        const allFormElements = form.querySelectorAll('input, select, textarea');

        allFormElements.forEach(element => {
            if (element.name) {
                formData[element.name] = element.value;
            }
        });
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
            console.log("Дані успішно збережено в LocalStorage.");
            if (saveButton) {
                saveButton.textContent = 'Збережено!';
                setTimeout(() => {
                    saveButton.textContent = 'Зберегти Тижневий План';
                }, 2000);
            }
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
            if (saveButton) saveButton.textContent = 'Помилка збереження';
        }
    }

    // =========================================================
    // ФУНКЦІЯ: loadData (Завантаження з LocalStorage)
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (!savedData) return;

            const data = JSON.parse(savedData);
            
            // Заповнення основних полів
            Object.keys(data).forEach(name => {
                const element = form.querySelector(`[name="${name}"]`);
                if (element) {
                    if (element.tagName === 'SELECT' && element.classList.contains('activity-type-select')) {
                        element.value = data[name];
                        const dayIndex = parseInt(element.closest('td').dataset.dayIndex);
                        updateMatchDetails(dayIndex, data[name]); 
                    } else {
                        element.value = data[name];
                    }
                }
            });

            // Після заповнення всіх полів оновити цикл 
            updateCycleColors();

        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: updateCycleColors (Головний розрахунок MD-фаз та автозаповнення)
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
            let dayStatuses = new Array(7).fill('REST'); 

            // 1. Стандартний розрахунок MD-фаз (MD+X / MD-X)
            dayCells.forEach((cell, index) => {
                if (matchDays.includes(index)) {
                    dayStatuses[index] = 'MD';
                } else if (isPlanActive) { 
                    
                    let minOffset = 7;
                    let isPostMatch = false; 
                    
                    matchDays.forEach(mdIndex => {
                        const offsetForward = (index - mdIndex + 7) % 7; 
                        const offsetBackward = (mdIndex - index + 7) % 7; 
                        
                        if (offsetForward > 0 && offsetForward <= 3) { // MD+1, MD+2
                            if (offsetForward < minOffset) {
                                minOffset = offsetForward;
                                isPostMatch = true;
                            }
                        } 
                        else if (offsetBackward > 0 && offsetBackward < 7) { 
                            if (offsetBackward <= 4) { // MD-1, MD-2, MD-3, MD-4
                                if (offsetBackward < minOffset) {
                                    minOffset = offsetBackward;
                                    isPostMatch = false;
                                }
                            }
                        }
                    });

                    if (minOffset <= 4 && minOffset > 0) { 
                        dayStatuses[index] = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`; 
                    } else if (minOffset === 7) {
                        dayStatuses[index] = 'TRAIN';
                    }
                }
            });


            // 2. Коригування циклу після дня відпочинку
            let finalStatuses = dayStatuses;

            if (activityTypes.includes('REST') && isPlanActive) {
                finalStatuses = resetCycleAfterRest(dayStatuses, activityTypes, matchDays);
            }

            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА АВТОЗАПОВНЕННЯ ПОЛІВ
            dayCells.forEach((cell, index) => {
                const mdStatusElement = cell.querySelector('.md-status');
                
                let statusKey = finalStatuses[index] || 'REST'; 
                
                const currentActivity = activitySelects[index].value;
                if (currentActivity === 'REST') {
                    statusKey = 'REST'; 
                }
                
                const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];
                mdStatusElement.textContent = style.status;
                
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 

                cell.title = `Фаза: ${style.status}`; 

                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                // === ОСНОВНА ЛОГІКА АВТОЗАПОВНЕННЯ ===
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                
                if (dailyTaskField) {
                     const templateText = getTemplateText(statusKey);
                     
                     if (templateText) {
                         dailyTaskField.value = templateText;
                     } 
                     else if (currentActivity === 'TRAIN') {
                         dailyTaskField.value = 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';
                     }
                     else {
                         dailyTaskField.value = ''; 
                     }
                }
            });
        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    // Обробник для зміни активності (Selects)
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            // Якщо змінюємо MD-фази, оновлюємо цикл
            updateCycleColors(); 
            // Якщо змінюємо на "Матч" або з нього, оновлюємо деталі
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // Обробники для зміни тексту в Шаблонах (щоб оновити daily_task)
    document.querySelectorAll('#recovery-details-container textarea').forEach(textarea => {
        textarea.addEventListener('input', updateCycleColors);
    });
    
    // Обробник для кнопки "Зберегти"
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveData();
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates(); // Заповнює порожні шаблони текстом за замовчуванням
    loadData();           // Завантажує збережений план
    updateCycleColors();  // Запускає фінальний розрахунок
}); // <--- ЦЯ ЗАКРИВАЮЧА ДУЖКА БУЛА ВТРАЧЕНА
