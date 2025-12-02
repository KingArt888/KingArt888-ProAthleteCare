// weekly_plan_logic.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weekly-plan-form');
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const mdColorsRow = document.getElementById('md-colors-row');

    // === 1. ОБРОБНИК ВИБОРУ АКТИВНОСТІ ===

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            // Отримуємо індекс дня (0=ПН, 6=НД)
            const dayIndex = event.target.closest('td').dataset.dayIndex;
            
            // Оновлюємо MD-статуси та кольори при зміні
            updateCycleColors(); 
            
            // Динамічно додаємо/видаляємо поля деталізації матчу
            updateMatchDetails(dayIndex, event.target.value);
        });
    });

    /**
     * Динамічно додає поля Суперник/Виїзд/Км для обраного дня матчу.
     * @param {string} dayIndex - Індекс дня (0-6)
     * @param {string} activityType - MATCH, TRAIN, REST
     */
    function updateMatchDetails(dayIndex, activityType) {
        const dayCell = document.querySelector(`td[data-day-index="${dayIndex}"]`);
        const dayName = mdColorsRow.querySelector(`td[data-date]`).textContent; // Отримуємо назву дня
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        
        if (activityType === 'MATCH' && !existingBlock) {
            // Якщо обрано MATCH і поля ще немає, створюємо його
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>${dayName} (MD)</h4>
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
            // Вставляємо блок після останнього елемента
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
            
        } else if (activityType !== 'MATCH' && existingBlock) {
            // Якщо змінили з MATCH на інше, видаляємо блок
            existingBlock.remove();
        }
    }


    // === 2. ЛОГІКА РОЗРАХУНКУ MD+X та КОЛЬОРІВ ===

    /**
     * Основна функція для визначення MD+X та встановлення кольорів.
     */
    function updateCycleColors() {
        const matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); // Зберігаємо індекси всіх днів матчу
            }
        });

        const dayCells = mdColorsRow.querySelectorAll('.cycle-day');
        
        // Тут буде основна логіка
        // **ПОТРІБНА СКЛАДНА ЛОГІКА ДЛЯ ДВОХ МАТЧІВ, ЯКУ МИ ДОПИШЕМО НАСТУПНОГО РАЗУ**
        
        dayCells.forEach((cell, index) => {
             const mdStatusElement = cell.querySelector('.md-status');
             
             // Тимчасовий код для демонстрації:
             if (matchDays.includes(index)) {
                 mdStatusElement.textContent = 'MD';
                 cell.style.backgroundColor = 'red'; // Червоний
             } else {
                 mdStatusElement.textContent = '...'; // Тут буде MD+X
                 cell.style.backgroundColor = '#4CAF50'; // Зелений (для прикладу)
             }
        });
    }


    // === 3. ФУНКЦІЯ ВІДПРАВКИ (ІНТЕГРАЦІЯ З FIRESTORE) ===
    
    // form.addEventListener('submit', handleWeeklyPlanSubmit); // Буде викликатися при натисканні "Зберегти"
    
    // function handleWeeklyPlanSubmit(event) {
    //     event.preventDefault();
    //     // Тут буде код для збору всіх даних і запису їх у Firestore
    //     // db.collection('weekly_plans').add(...) 
    // }

    // Викликаємо функцію для початкового налаштування при завантаженні
    updateCycleColors(); 
});
