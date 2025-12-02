// =========================================================
// weekly-individual.js - ФІНАЛЬНА ВЕРСІЯ (V18.0: Синтаксис виправлено, автозаповнення працює)
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
    
    // Перевірка наявності необхідних елементів
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    if (activitySelects.length === 0 || dayCells.length === 0) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці (selects або MD-комірок). Перевірте HTML.");
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
             // Якщо статус не MD-фаза, повертаємо порожній рядок
             return ''; 
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        // Увага: якщо шаблон не знайдено, повертаємо порожній рядок, а не null/undefined
        return templateElement ? templateElement.value.trim() : ''; 
    }

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ
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
    // ФУНКЦІЯ 2: ПЕР
