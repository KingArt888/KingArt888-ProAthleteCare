// =========================================================
// weekly-individual.js - НОВА ЧИСТА ВЕРСІЯ (V6.0: З ПЕРЕРИВАННЯМ ЦИКЛУ)
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
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ (V6.0 - Націлення на Контейнер Дня)
    // Використовуємо найнадійніший метод - пошук по контейнеру.
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        // 1. ЗНАХОДИМО ГОЛОВНИЙ КОНТЕЙНЕР ДЛЯ ЦЬОГО ДНЯ (TD)
        const dayContainer = document.querySelector(`td[data-day-index="${dayIndex}"]`);
        
        if (!dayContainer) {
             // Це має спрацювати, якщо HTML має data-day-index
             console.error(`Не знайдено контейнер дня з індексом ${dayIndex}.`);
             return; 
        }

        // 2. ЗНАХОДИМО ВСІ ЕЛЕМЕНТИ ВВЕДЕННЯ ВСЕРЕДИНІ ЦЬОО КОНТЕЙНЕРА
        const dayInputElements = dayContainer.querySelectorAll('input, select, textarea');
        
        const isDisabledOverall = !isPlanActive;
        let shouldDisableDay = false;

        if (isDisabledOverall || activityType === 'REST') {
            shouldDisableDay = true;
        }

        dayInputElements.forEach(element => {
            if (element.classList.contains('activity-type-select')) {
                return; // Селектор активності завжди залишається активним
            }

            let shouldBeDisabled = shouldDisableDay;
            
            // Вимкнути деталі матчу, якщо це не день матчу
            if (activityType !== 'MATCH' && element.closest(`.match-detail-block[data-day-index="${dayIndex}"]`)) {
                 shouldBeDisabled = true;
            }

            element.disabled = shouldBeDisabled;
            
            if (shouldBeDisabled) {
                element.classList.add('day-disabled');
            } else {
                element.classList.remove('day-disabled');
            }
        });

        // 3. ДОДАТКОВА ПЕРЕВІРКА ДЛЯ ПОЛІВ MD_PLUS_2 (НЕДІЛЯ) - якщо вони поза таблицею
        if (dayIndex === 6) {
            const mdPlus2Elements = document.body.querySelectorAll('input[name*="md_plus_2"], select[name*="md_plus_2"], textarea[name*="md_plus_2"]');
            
            mdPlus2Elements.forEach(element => {
                element.disabled = shouldDisableDay;
                if (shouldDisableDay) {
                    element.classList.add('day-disabled');
                } else {
                    element.classList.remove('day-disabled');
                }
            });
        }
    }


    // =========================================================
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ ТА ВІДЛІК ДО НАСТУПНОГО МАТЧУ
    // =========================================================

    function resetCycleAfterRest(days, matchDays) {
        let nextMatchIndex = -1;
        
        // Знаходимо індекс наступного матчу
        for (let i = 0; i < 7; i++) {
            if (matchDays.includes(i)) {
                nextMatchIndex = i;
                break; // Перший матч у циклі
            }
        }

        if (nextMatchIndex === -1) return days; // Немає матчу - не змінюємо нічого

        const updatedDays = [...days]; // Копіюємо для змін

        // Починаємо перевірку після кожного дня
        for (let i = 0; i < 7; i++) {
            if (updatedDays[i] === 'REST') {
                
                // Якщо знайдено REST, перераховуємо всі наступні дні до наступного матчу
                // i + 1 - це наступний день після REST
                for (let j = i + 1; j < 7; j++) {
                    
                    // Відлік днів до наступного матчу
                    const offset = (nextMatchIndex - j + 7) % 7; 
                    
                    if (offset > 0 && offset <= 4) {
                        updatedDays[j] = `MD-${offset}`;
                    } else if (offset === 0) {
                        updatedDays[j] = 'MD'; // День матчу
                        break; // Зупиняємо, знайшли MD
                    } else {
                        updatedDays[j] = 'MD-4'; // Максимальний MD-
                    }
                    
                    // Якщо дійшли до кінця циклу і REST був перед MD, зупиняємо
                    if (j === 6 && updatedDays[j] !== 'MD') {
                        break; 
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
    // ФУНКЦІЯ 4: РОЗРАХУНОК КОЛЬОРУ ЦИКЛУ (Оновлена для переривання)
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
        let dayStatuses = new Array(7).fill('REST'); // Початковий статус REST

        // 1. Стандартний розрахунок MD+X/MD-X
        dayCells.forEach((cell, index) => {
            if (matchDays.includes(index)) {
                dayStatuses[index] = 'MD';
            } else if (isPlanActive) { 
                
                let minOffset = 7;
                let isPostMatch = false; 
                
                matchDays.forEach(mdIndex => {
                    const offsetForward = (index - mdIndex + 7) % 7; // MD+X
                    const offsetBackward = (mdIndex - index + 7) % 7; // MD-X
                    
                    // Обробка MD+1, MD+2
                    if (offsetForward > 0 && offsetForward <= 2) { 
                        if (offsetForward < minOffset) {
                            minOffset = offsetForward;
                            isPostMatch = true;
                        }
                    } 
                    // Обробка MD-1, MD-2, MD-3, MD-4
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
            // Якщо плану немає, залишається 'REST'
        });


        // 2. ПЕРЕРИВАННЯ ЦИКЛУ: Якщо обрано REST, перезапускаємо відлік до наступного матчу
        // Ця функція ПОВИННА спрацьовувати ТІЛЬКИ якщо обрано REST
        let finalStatuses = dayStatuses;

        if (activityTypes.includes('REST') && isPlanActive) {
            finalStatuses = resetCycleAfterRest(dayStatuses, matchDays);
        }

        // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА ПОЛІВ
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            
            // Встановлюємо статус з фінального масиву
            const statusKey = finalStatuses[index] || 'REST'; 
            
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
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    updateCycleColors(); 
});
