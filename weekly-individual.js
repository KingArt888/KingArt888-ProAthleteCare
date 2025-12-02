// =========================================================
// weekly_plan_logic.js - ФІНАЛЬНА ВЕРСІЯ: НЕАКТИВНИЙ СТАН ЗА ЗАМОВЧУВАННЯМ
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
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const microcycleTable = document.querySelector('.microcycle-table'); 

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = event.target.closest('td').dataset.dayIndex;
            const activityType = event.target.value;
            
            console.log('--- Зміна активності виявлена! ---');
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // =========================================================
    // МОДИФІКОВАНА ФУНКЦІЯ: ВИМКНЕННЯ ПОЛІВ
    // Тепер приймає isPlanActive і вимикає всі поля, якщо план не активний
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        const dayColumns = microcycleTable.querySelectorAll(`td[data-day-index="${dayIndex}"]`);
        
        // Поля вимкнені, якщо:
        // 1. План не активний (немає обраного MD), АБО
        // 2. Для цього дня обрано "Відпочинок"
        const isDisabled = !isPlanActive || activityType === 'REST'; 

        dayColumns.forEach(td => {
            const controllableElements = td.querySelectorAll('input, select, textarea');
            
            controllableElements.forEach(element => {
                // НЕ ВИМИКАЄМО САМ СЕЛЕКТОР АКТИВНОСТІ
                if (element.classList.contains('activity-type-select')) {
                    return; 
                }
                
                element.disabled = isDisabled;
                
                if (isDisabled) {
                    element.classList.add('day-disabled');
                } else {
                    element.classList.remove('day-disabled');
                }
            });
        });
    }

    // =========================================================
    // Функція updateMatchDetails (без змін)
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
    }


    // =========================================================
    // МОДИФІКОВАНА ЛОГІКА: ВИДАЛЕНО MD ЗА ЗАМОВЧУВАННЯМ
    // =========================================================

    function updateCycleColors() {
        let matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        // --- КРИТИЧНА ЗМІНА: ПЛАН АКТИВНИЙ ТІЛЬКИ ПРИ ВИБОРІ MD ---
        const isPlanActive = matchDays.length > 0;
        // ---------------------------------------------------------

        console.log('Дні матчів (Індекси):', matchDays); 
        console.log('План Активний:', isPlanActive);

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
                    
                    // Обмеження MD+ до +2
                    if (offsetForward > 0 && offsetForward <= 2) { 
                        if (offsetForward < minOffset) {
                            minOffset = offsetForward;
                            isPostMatch = true;
                        }
                    } 
                    
                    // MD-X до MD-4
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
                 // Якщо план не активний, ставимо 'REST' (нейтральний колір)
                 statusKey = 'REST'; 
            }

            // ЗАСТОСУВАННЯ СТИЛІВ
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
            console.log(`День ${index}: Статус: ${style.status}, Клас: ${style.colorClass}`); 

            // === КРИТИЧНИЙ ВИКЛИК: Вимикаємо/Вмикаємо поля ===
            const currentActivity = activitySelects[index].value;
            toggleDayInputs(index, currentActivity, isPlanActive); 
        });
    }

    console.log('--- Сторінка завантажена, початковий розрахунок ---');
    updateCycleColors(); 
});
