// =========================================================
// weekly-individual.js - ФІНАЛЬНА КОНСОЛІДОВАНА ВЕРСІЯ (V5.0)
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
    
    // === ВИЗНАЧЕННЯ ВСІХ КРИТИЧНИХ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    // weeklyPlanForm більше не використовується для націлювання, але залишаємо на всяк випадок
    const weeklyPlanForm = document.getElementById('weekly-plan-form'); 
    // ===========================================

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ (V5.0 - Націлення на Контейнер Дня)
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        // 1. ЗНАХОДИМО ГОЛОВНИЙ КОНТЕЙНЕР ДЛЯ ЦЬОГО ДНЯ (TD)
        const dayContainer = document.querySelector(`td[data-day-index="${dayIndex}"]`);
        
        if (!dayContainer) {
            console.error(`Не знайдено контейнер дня з індексом ${dayIndex}.`);
            return; 
        }

        // 2. ЗНАХОДИМО ВСІ ЕЛЕМЕНТИ ВВЕДЕННЯ ВСЕРЕДИНІ ЦЬОГО КОНТЕЙНЕРА
        const dayInputElements = dayContainer.querySelectorAll('input, select, textarea');
        
        const isDisabledOverall = !isPlanActive;
        let shouldDisableDay = false;

        // Встановлюємо стан, якщо план неактивний АБО обрано REST
        if (isDisabledOverall || activityType === 'REST') {
            shouldDisableDay = true;
        }

        dayInputElements.forEach(element => {
            // Ігноруємо сам селектор активності 
            if (element.classList.contains('activity-type-select')) {
                return; 
            }

            let shouldBeDisabled = shouldDisableDay;
            
            // Додаткове правило: Вимкнути деталі матчу, якщо це не день матчу, 
            else if (activityType !== 'MATCH' && element.closest(`.match-detail-block[data-day-index="${dayIndex}"]`)) {
                 shouldBeDisabled = true;
            }

            // Встановлюємо атрибут та клас
            element.disabled = shouldBeDisabled;
            
            if (shouldBeDisabled) {
                element.classList.add('day-disabled');
            } else {
                element.classList.remove('day-disabled');
            }
        });

        // 3. ДОДАТКОВА ПЕРЕВІРКА ДЛЯ ПОЛІВ MD_PLUS_2 (НЕДІЛЯ)
        // Якщо поля Відновлення НД знаходяться поза таблицею, вимикаємо їх через ім'я
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
    // ФУНКЦІЯ 2: ОНОВЛЕННЯ ДЕТАЛЕЙ МАТЧУ
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
        
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="
