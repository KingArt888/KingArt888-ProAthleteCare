// =========================================================
// weekly-individual.js - ФІНАЛЬНА ВЕРСІЯ (V13.0: ВИДАЛЕНО LOAD AU)
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
    
    // Нова функція для отримання тексту шаблону
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Сфокусуватися на розминці та відновленні після гри.';
        if (status === 'REST') return 'Вихідний: Повний відпочинок або легке відновлення за шаблоном MD+2.';
        
        // Перетворюємо MD+X/MD-X в ім'я поля шаблону
        let fieldName = '';
        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${status.charAt(3)}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${status.charAt(3)}`;
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        return templateElement ? templateElement.value : '';
    }

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ (V13.0 - ВИДАЛЕНО 'load')
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        const isDisabledOverall = !isPlanActive;
        const allFormElements = document.body.querySelectorAll('input, select, textarea');
        const currentDayIndexStr = dayIndex.toString();
        
        const fieldPrefixesToDisable = [
            // ВИДАЛЕНО 'load',
            'daily_task',       
            'tasks',            
            'cardio',           
            'opponent',         
            'venue',            
            'travel_km'         
        ];

        allFormElements.forEach(element => {
            const elementName = element.name || '';
            
            if (element.classList.contains('activity-type-select')) {
                return; 
            }

            let shouldBeDisabled = false;
            
            // 1. Встановлюємо, чи поле належить поточному Дню/Індексу
            const isFieldRelatedToDay = fieldPrefixesToDisable.some(prefix => 
                elementName.startsWith(prefix) && (elementName.endsWith(`_${currentDayIndexStr}`))
            );
            
            // 2. Окремо для полів MD+2 (для Неділі)
            // Примітка: ця перевірка для полів шаблону, а не для щоденних полів, але ми її залишаємо, якщо вона потрібна.
            const isFieldRelatedToMDPlus2 = (elementName.includes('md_plus_2')); 
            
            const isFieldRelevant = isFieldRelatedToDay || isFieldRelatedToMDPlus2;
            
            
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
    }

    // =========================================================
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ ТА ВІДЛІК ДО НАСТУПНОГО МАТЧУ (V10.0)
    // =========================================================
    // (Без змін)

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
    // ФУНКЦІЯ 3: ОНОВЛЕННЯ ДЕТАЛЕЙ МАТЧУ (Без змін)
    // =========================================================

    function updateMatchDetails(dayIndex, activityType) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && !existingBlock) {
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
    // ФУНКЦІЯ 4: РОЗРАХУНОК КОЛЬОРУ ЦИКЛУ та АВТОЗАПОВНЕННЯ (V13.0)
    // =========================================================
    
    function updateCycleColors() {
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
            if (activitySelects[index].value === 'REST') {
                statusKey = 'REST'; 
            }
            
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 

            const currentActivity = activitySelects[index].value;
            toggleDayInputs(index, currentActivity, isPlanActive); 
            
            // АВТОЗАПОВНЕННЯ daily_task
            const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
            if (dailyTaskField && currentActivity !== 'MATCH') {
                 // Заповнюємо, якщо це не "Матч"
                 const templateText = getTemplateText(statusKey);
                 dailyTaskField.value = templateText;
            } else if (dailyTaskField && currentActivity === 'MATCH') {
                 dailyTaskField.value = 'Матч: Індивідуальна розминка/завершення гри';
            }
            
        });
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

    // === ОБРОБНИКИ ДЛЯ ЗМІНИ ШАБЛОНІВ ===
    document.querySelectorAll('#recovery-details-container textarea').forEach(textarea => {
        textarea.addEventListener('input', updateCycleColors);
    });
    
    // === ПОЧАТКОВИЙ ЗАПУСК ===
    updateCycleColors(); 
});
