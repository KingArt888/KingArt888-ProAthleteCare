// =========================================================
// weekly_plan_logic.js - ЛОГІКА КАЛЕНДАРЯ МІКРОЦИКЛУ
// =========================================================

// МАПА КОЛЬОРІВ ТА СТАТУСІВ MD+X / MD-X
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

    // === 1. ОБРОБНИКИ ПОДІЙ ===

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = event.target.closest('td').dataset.dayIndex;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, event.target.value); 
        });
    });

    // === 2. ФУНКЦІЯ ДЛЯ ДЕТАЛЕЙ МАТЧУ ===
    
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


    // === 3. ОСНОВНА ЛОГІКА РОЗРАХУНКУ MD+X/MD-X та КОЛЬОРІВ ===

    function updateCycleColors() {
        const matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });

        // 3.1. Ітеруємо по кожному дню
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            let statusKey = 'REST'; 

            if (matchDays.includes(index)) {
                statusKey = 'MD';
            } else if (matchDays.length > 0) {
                let minDistance = 7; 
                let isPostMatch = false; 

                matchDays.forEach(mdIndex => {
                    let distance = (index - mdIndex + 7) % 7; 

                    if (distance > 0) { 
                        if (distance <= 3) { 
                            if (distance < minDistance) {
                                minDistance = distance;
                                isPostMatch = true;
                            }
                        } else if (distance >= 4) { 
                            let daysToMatch = 7 - distance; 
                            if (daysToMatch < minDistance) {
                                minDistance = daysToMatch;
                                isPostMatch = false;
                            }
                        }
                    }
                });

                if (minDistance <= 4) { 
                    statusKey = isPostMatch ? `MD+${minDistance}` : `MD-${minDistance}`;
                }
            }

            // 3.2. ЗАСТОСУВАННЯ СТИЛІВ (КРИТИЧНА ДІЛЯНКА)
            const style = COLOR_MAP[statusKey];
            mdStatusElement.textContent = style.status;
            
            // Видаляємо всі класи кольорів, що існують, з SPAN
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            
            // Додаємо новий клас до SPAN
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
        });
    }

    // Початковий запуск логіки при завантаженні
    updateCycleColors(); 
});
