// =========================================================
// weekly-individual.js - ОСТАТОЧНА ВЕРСІЯ (V10.0: ФІКС ЛОГІКИ ЦИКЛУ ТА ВИМКНЕННЯ ПОЛІВ)
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
};

document.addEventListener('DOMContentLoaded', () => {
    
    // === ВИЗНАЧЕННЯ КРИТИЧНИХ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    // ===========================================

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ (V9.0 - НАЙТОЧНІШЕ НАЦІЛЕННЯ)
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        const isDisabledOverall = !isPlanActive;
        const allFormElements = document.body.querySelectorAll('input, select, textarea');
        const currentDayIndexStr = dayIndex.toString();
        
        // Список префіксів полів, які ми хочемо вимкнути для REST
        const fieldPrefixesToDisable = [
            'load',             
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
            const isFieldRelatedToMDPlus2 = (elementName.includes('md_plus_2')); 
            
            const isFieldRelevant = isFieldRelatedToDay || isFieldRelatedToMDPlus2;
            
            
            // 3. Встановлюємо стан disabled
            
            if (isDisabledOverall) {
                shouldBeDisabled = true; 
            } 
            else if (isFieldRelevant) {
                
                // Правило I: Вимкнути для "Відпочинку" (REST)
                if (activityType === 'REST') {
                    shouldBeDisabled = true; 
                } 
                
                // Правило II: Вимкнути динамічні деталі матчу, якщо це не день матчу
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
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ ТА ВІДЛІК ДО НАСТУПНОГО МАТЧУ (V10.0 - ФІКС)
    // =========================================================

    function resetCycleAfterRest(days, activityTypes, matchDays) {
        const updatedDays = [...days]; // Копія оригінальних статусів

        for (let i = 0; i < 7; i++) {
            // Перевіряємо, чи це день Відпочинку
            if (activityTypes[i] === 'REST') {
                
                let nextMatchIndex = -1;
                
                // 1. Знаходимо індекс наступного матчу СУВОРО ПІСЛЯ REST дня (i)
                for (let k = i + 1; k < 7; k++) {
                    if (matchDays.includes(k)) {
                        nextMatchIndex = k;
                        break;
                    }
                }

                // Якщо матчів після REST немає, то наступні дні не можуть бути MD-X
                if (nextMatchIndex === -1) {
                    continue; 
                }

                // 2. Перераховуємо дні (j) від дня після REST (i+1) до наступного MD
                for (let j = i + 1; j < 7; j++) {
                    
                    // Якщо дійшли до дня матчу, встановлюємо MD і зупиняємо
                    if (j === nextMatchIndex) {
                        updatedDays[j] = 'MD'; 
                        break; 
                    }

                    // Якщо наступний день j сам є REST (або TRAIN), не перераховуємо його статус, 
                    // але це не повинно статися, оскільки ми перераховуємо цикл. 
                    // Тільки якщо активність не MD, ми застосовуємо MD-X.
                    if (activityTypes[j] === 'REST') {
                         updatedDays[j] = 'REST';
                         continue; 
                    }
                    
                    // Відлік MD-X (наприклад, 6 (НД) - 4 (ПТ) = 2. MD-2)
                    const offset = nextMatchIndex - j; 
                    
                    if (offset > 0 && offset <= 4) {
                        updatedDays[j] = `MD-${offset}`; // MD-1, MD-2, MD-3, MD-4
                    } else if (offset > 4) {
                        updatedDays[j] = 'MD-4'; // Максимальний MD-4
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
    // ФУНКЦІЯ 4: РОЗРАХУНОК КОЛЬОРУ ЦИКЛУ (Оновлена для нового виклику)
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

        // 1. Стандартний розрахунок MD+X/MD-X (відбувається, якщо немає REST)
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


        // 2. ПЕРЕРИВАННЯ ЦИКЛУ: Перезапускаємо відлік (виправлено)
        let finalStatuses = dayStatuses;

        if (activityTypes.includes('REST') && isPlanActive) {
            // ПЕРЕДАЄМО activityTypes для перевірки REST
            finalStatuses = resetCycleAfterRest(dayStatuses, activityTypes, matchDays);
        }

        // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА ПОЛІВ
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            
            let statusKey = finalStatuses[index] || 'REST'; 
            
            // Якщо селектор - REST, колір має бути REST, незалежно від розрахунку
            if (activitySelects[index].value === 'REST') {
                statusKey = 'REST'; 
            }
            
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 

            const currentActivity = activitySelects[index].value;
            // Викликаємо функцію вимкнення полів
            toggleDayInputs(index, currentActivity, isPlanActive); 
        });
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            // Оскільки в HTML є data-day-index, ми використовуємо його для отримання індексу
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    updateCycleColors(); 
});
