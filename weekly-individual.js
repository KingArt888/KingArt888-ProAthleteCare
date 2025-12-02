// =========================================================
// weekly_plan_logic.js - ЛОГІКА КАЛЕНДАРЯ МІКРОЦИКЛУ
// =========================================================

// МАПА КОЛЬОРІВ ТА СТАТУСІВ MD+X / MD-X
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, // Виходить за межі циклу 7 днів
    
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
            
            updateCycleColors(); // Оновлення циклу
            updateMatchDetails(dayIndex, event.target.value); // Динамічне поле для деталей матчу
        });
    });

    // === 2. ФУНКЦІЯ ДЛЯ ДЕТАЛЕЙ МАТЧУ ===
    
    function updateMatchDetails(dayIndex, activityType) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        
        // Визначення назви дня для заголовка
        const dayName = dayCells[dayIndex].querySelector('.md-status').textContent.split(' ')[0]; 

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
            // Додаємо новий блок деталей
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
            
        } else if (activityType !== 'MATCH' && existingBlock) {
            // Видаляємо, якщо день більше не є матчем
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
                // Це день матчу
                statusKey = 'MD';
            } else if (matchDays.length > 0) {
                // Знаходимо найближчий Match Day
                let minDistance = 7; 
                let isPostMatch = false; 

                matchDays.forEach(mdIndex => {
                    // Відстань в циклі: (Поточний день - День матчу + 7) % 7
                    let distance = (index - mdIndex + 7) % 7; 

                    if (distance > 0) { 
                        if (distance <= 3) { // MD+1, MD+2, MD+3
                            if (distance < minDistance) {
                                minDistance = distance;
                                isPostMatch = true;
                            }
                        } else if (distance >= 4) { // MD-3, MD-2, MD-1
                            let daysToMatch = 7 - distance; 
                            if (daysToMatch < minDistance) {
                                minDistance = daysToMatch;
                                isPostMatch = false;
                            }
                        }
                    }
                });

                // Призначаємо статус MD+X/MD-X
                if (minDistance <= 4) { // Обмежуємо цикл MD-4 до MD+3
                    statusKey = isPostMatch ? `MD+${minDistance}` : `MD-${minDistance}`;
                }
            }
// ЗМІНА ПОТРІБНА ТУТ (у weekly_plan_logic.js):

// 3.2. Застосування стилів
const style = COLOR_MAP[statusKey];
mdStatusElement.textContent = style.status;

// Спочатку видаляємо всі попередні класи кольорів та додаємо новий
Object.values(COLOR_MAP).forEach(map => cell.classList.remove(map.colorClass)); // cell - це TD
cell.classList.add(style.colorClass); // <-- КЛАС ДОДАЄТЬСЯ ДО TD

// ----------------------------------------------------
// *** ВИПРАВЛЕННЯ #2: МЕНЯЄМО ЕЛЕМЕНТ, ЯКИЙ ФАРБУЄМО ***
// ----------------------------------------------------

// Фарбувати логічніше саме внутрішній елемент (span.md-status), 
// щоб він був чітко видимим.
// Змінюємо JS, щоб клас додавався до mdStatusElement (SPAN):

// ... всередині updateCycleColors()...

// 3.2. Застосування стилів
const style = COLOR_MAP[statusKey];
mdStatusElement.textContent = style.status;

// Видаляємо всі класи з mdStatusElement (SPAN)
Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 

// Додаємо новий клас до mdStatusElement (SPAN)
mdStatusElement.classList.add(style.colorClass); // <-- ТЕПЕР КЛАС ДОДАЄТЬСЯ ДО SPAN!

// ...
