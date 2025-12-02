// =========================================================
// weekly-individual.js - ФІНАЛЬНА ВЕРСІЯ: З ГАРАНТІЄЮ РОБОТИ
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

// ВЕСЬ ВИКОНУВАНИЙ КОД ПОВИНЕН БУТИ ВСЕРЕДИНІ ЦЬОГО БЛОКУ!
document.addEventListener('DOMContentLoaded', () => {
    
    // === ВИЗНАЧЕННЯ ВСІХ КРИТИЧНИХ ЗМІННИХ (РЯДКИ 24-27) ===
    const activitySelects = document.querySelectorAll('.activity-type-select'); // Визначаємо тут
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const weeklyPlanForm = document.getElementById('weekly-plan-form'); 
    // ===========================================

    // =========================================================
    // НАЙБІЛЬШ НАДІЙНА ФУНКЦІЯ: ВИМКНЕННЯ ПОЛІВ
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        const isDisabledOverall = !isPlanActive;
        const allFormElements = weeklyPlanForm.querySelectorAll('input, select, textarea');
        const currentDayIndexStr = dayIndex.toString();

        allFormElements.forEach(element => {
            const elementName = element.name || '';
            
            // Ігноруємо сам селектор активності
            if (element.classList.contains('activity-type-select')) {
                return; 
            }

            let shouldBeDisabled = false;
            
            // 1. Визначаємо, чи поле стосується поточного дня
            const isFieldRelatedToCurrentDay = elementName.includes(`_${currentDayIndexStr}`) || 
                                               (dayIndex === 6 && elementName.includes('md_plus_2')); 
            
            
            // 2. Встановлюємо стан disabled
            
            if (isDisabledOverall) {
                shouldBeDisabled = true;
            } 
            else if (isFieldRelatedToCurrentDay) {
                
                // Правило I: Вимкнути для "Відпочинку" (REST)
                if (activityType === 'REST') {
                    shouldBeDisabled = true; 
                } 
                
                // Правило II: Вимкнути деталі матчу, якщо це не день матчу
                else if (activityType !== 'MATCH' && element.closest(`.match-detail-block[data-day-index="${dayIndex}"]`)) {
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
    // ОБРОБНИКИ ПОДІЙ ТА ЛОГІКА
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
    
    function updateCycleColors() {
        let matchDays = [];
        // ВІДПРАЦЬОВУЄ ТІЛЬКИ ПІСЛЯ ВИЗНАЧЕННЯ activitySelects
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        const isPlanActive = matchDays.length > 0;
        
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            let statusKey = 'REST'; 

            if (matchDays.includes(index)) {
                statusKey = 'MD';
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
                    statusKey = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`;
                }
            } else {
                 statusKey = 'REST'; 
            }

            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 

            const currentActivity = activitySelects[index].value;
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
