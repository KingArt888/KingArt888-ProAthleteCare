// =========================================================
// weekly-individual.js - ФІНАЛЬНА ВЕРСІЯ (V19.0: Виправлено логіку автозаповнення)
// =========================================================

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
    
    if (activitySelects.length === 0 || dayCells.length === 0) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці.");
        return; 
    }
    
    // ФУНКЦІЯ ОТРИМАННЯ ШАБЛОНУ
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
        return templateElement ? templateElement.value.trim() : ''; 
    }

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ
    // (Без змін)
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const isDisabledOverall = !isPlanActive;
            const allFormElements = document.body.querySelectorAll('input, select, textarea');
            const currentDayIndexStr = dayIndex.toString();
            
            const fieldPrefixesToDisable = [
                'daily_task', 'tasks', 'cardio', 'opponent', 'venue', 'travel_km'
            ];

            allFormElements.forEach(element => {
                const elementName = element.name || '';
                
                if (element.classList.contains('activity-type-select')) {
                    return; 
                }

                let shouldBeDisabled = false;
                
                const isFieldRelatedToDay = fieldPrefixesToDisable.some(prefix => 
                    elementName.startsWith(prefix) && (elementName.endsWith(`_${currentDayIndexStr}`))
                );
                
                const isFieldRelevant = isFieldRelatedToDay || (elementName.includes('md_plus_2')); 
                
                
                if (isDisabledOverall) {
                    shouldBeDisabled = true; 
                } 
                else if (isFieldRelevant) {
                    
                    if (activityType === 'REST') {
                        shouldBeDisabled = true; 
                    } 
                    
                    else if (activityType !== 'MATCH' && (elementName.startsWith('opponent_') || elementName.startsWith('venue_') || elementName.startsWith('travel_km_'))) {
                         shouldBeDisabled = true;
                    }
                }
                
                element.disabled = shouldBeDisabled;
                
                if (shouldBeDisabled) {
                    element.classList.add('day-disabled');
                } else {
                    element.classList.remove('day-disabled');
                }
            });
        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ
    // (Без змін)
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

                for (let j = i + 1; j < 7; j++) {
                    
                    if (j === nextMatchIndex) {
                        updatedDays[j] = 'MD'; 
                        break; 
                    }

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
    // ФУНКЦІЯ 3: ОНОВЛЕННЯ ДЕТАЛЕЙ МАТЧУ
    // (Без змін)
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
    // ФУНКЦІЯ 4: РОЗРАХУНОК ЦИКЛУ та АВТОЗАПОВНЕННЯ (ОСНОВНЕ ВИПРАВЛЕННЯ)
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

            // 1. Стандартний розрахунок MD+X/MD-X
            dayCells.forEach((cell, index) => {
                if (matchDays.includes(index)) {
                    dayStatuses[index] = 'MD';
                } else if (isPlanActive) { 
                    
                    let minOffset = 7;
                    let isPostMatch = false; 
                    
                    matchDays.forEach(mdIndex => {
                        const offsetForward = (index - mdIndex + 7) % 7; 
                        const offsetBackward = (mdIndex - index + 7) % 7; 
                        
                        if (offsetForward > 0 && offsetForward <= 2) { 
                            if (offsetForward < minOffset) {
                                minOffset = offsetForward;
                                isPostMatch = true;
                            }
                        } 
                        else if (offsetBackward > 0 && offsetBackward < 7) { 
                            if (offsetBackward <= 4) { 
                                if (offsetBackward < minOffset) {
                                    minOffset = offsetBackward;
                                    isPostMatch = false;
                                }
                            }
                        }
                    });

                    if (minOffset <= 4 && minOffset > 0) { 
                        dayStatuses[index] = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`; 
                    }
                }
            });

            // 2. ПЕРЕРИВАННЯ ЦИКЛУ
            let finalStatuses = dayStatuses;

            if (activityTypes.includes('REST') && isPlanActive) {
                finalStatuses = resetCycleAfterRest(dayStatuses, activityTypes, matchDays);
            }

            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА АВТОЗАПОВНЕННЯ ПОЛІВ
            dayCells.forEach((cell, index) => {
                const mdStatusElement = cell.querySelector('.md-status');
                
                let statusKey = finalStatuses[index] || 'REST'; 
                
                // Якщо селектор - REST, колір має бути REST
                const currentActivity = activitySelects[index].value;
                if (currentActivity === 'REST') {
                    statusKey = 'REST'; 
                }
                
                const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
                mdStatusElement.textContent = style.status;
                
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 

                cell.title = `Фаза: ${style.status}`; 

                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                // === ОСНОВНА ЛОГІКА АВТОЗАПОВНЕННЯ (ВИПРАВЛЕНО) ===
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                
                if (dailyTaskField) {
                     const templateText = getTemplateText(statusKey);
                     
                     // 1. Спочатку перевіряємо, чи є шаблон для MD-статусу
                     if (templateText) {
                         dailyTaskField.value = templateText;
                     } 
                     // 2. Якщо шаблону немає (порожній рядок), і це день "Тренування", 
                     // використовуємо загальний текст.
                     else if (currentActivity === 'TRAIN') {
                         dailyTaskField.value = 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';
                     }
                     // 3. Для всіх інших випадків (REST без шаблону, або день без MD-статусу та без TRAIN)
                     else {
                         dailyTaskField.value = ''; // Залишаємо порожнім
                     }
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

    // === ОБРОБНИКИ ДЛЯ ЗМІНИ ШАБЛОНІВ (Важливо!) ===
    document.querySelectorAll('#recovery-details-container textarea').forEach(textarea => {
        textarea.addEventListener('input', updateCycleColors);
        textarea.addEventListener('change', updateCycleColors); 
    });
    
    // === ПОЧАТКОВИЙ ЗАПУСК ===
    updateCycleColors(); 
});
